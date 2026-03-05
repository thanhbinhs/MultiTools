# app/utils.py

import base64
import json
import logging
import math
import os
import shutil
import subprocess
import sys
import tempfile
import wave
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO

import cv2
import ffmpeg
import numpy as np
import requests
from PIL import Image
from pydub import AudioSegment

_rembg_remove = None

# ─── Logging ───────────────────────────────────────────────────────────────────
_stream_handler = logging.StreamHandler(sys.stdout)
_stream_handler.setLevel(logging.DEBUG)
_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
_stream_handler.setFormatter(_formatter)

_file_handler = logging.FileHandler('app.log', encoding='utf-8')
_file_handler.setLevel(logging.DEBUG)
_file_handler.setFormatter(_formatter)

logging.basicConfig(level=logging.DEBUG, handlers=[_stream_handler, _file_handler])
logger = logging.getLogger(__name__)

FFMPEG_PROCESS_TIMEOUT_S = int(os.environ.get('FFMPEG_PROCESS_TIMEOUT_S', '900'))
REMOTE_IMAGE_MAX_BYTES = int(os.environ.get('REMOTE_IMAGE_MAX_BYTES', str(20 * 1024 * 1024)))
NVIDIA_T2I_TIMEOUT_S = int(os.environ.get('NVIDIA_T2I_TIMEOUT_S', '90'))


def _get_rembg_remove():
    """Lazily import rembg to avoid crashing app startup when optional deps are missing."""
    global _rembg_remove
    if _rembg_remove is not None:
        return _rembg_remove

    try:
        from rembg import remove as rembg_remove  # local import by design
    except ModuleNotFoundError as exc:
        missing_name = getattr(exc, 'name', '')
        if missing_name == 'onnxruntime':
            raise RuntimeError(
                "Missing dependency: 'onnxruntime'. Install it in backend env: "
                "pip install onnxruntime"
            ) from exc
        raise RuntimeError(
            "Missing dependency for background removal. Install: "
            "pip install rembg onnxruntime"
        ) from exc

    _rembg_remove = rembg_remove
    return _rembg_remove


# ─── Image Utilities ────────────────────────────────────────────────────────────
def resize_image(file, width: int = 300, height: int = 300) -> BytesIO:
    """Resize an uploaded image file to (width × height)."""
    img = Image.open(file.stream)
    img = img.resize((width, height), Image.LANCZOS)
    img_io = BytesIO()
    img.save(img_io, 'JPEG', quality=90)
    img_io.seek(0)
    return img_io


def crop_image(file, left: int, top: int, right: int, bottom: int) -> BytesIO:
    """Crop an uploaded image file."""
    img = Image.open(file.stream)
    img = img.crop((left, top, right, bottom))
    img_io = BytesIO()
    img.save(img_io, 'JPEG', quality=90)
    img_io.seek(0)
    return img_io


def process_crop(image_data: str, left: int, top: int, width: int, height: int) -> str:
    """Crop a base64 image and return the result as a base64 string."""
    if width <= 0 or height <= 0:
        raise ValueError('width and height must be > 0')

    decoded_image = _decode_base64_payload(image_data)
    image = Image.open(BytesIO(decoded_image))
    cropped = image.crop((left, top, left + width, top + height))
    buffered = BytesIO()
    cropped.save(buffered, format='PNG')
    return base64.b64encode(buffered.getvalue()).decode()


def remove_object(file, x1: int, y1: int, x2: int, y2: int, method: str = 'telea') -> BytesIO:
    """
    Remove a rectangular region from an image using OpenCV inpainting.

    Parameters
    ----------
    method : 'telea' (default) or 'ns'
    """
    if method not in ('telea', 'ns'):
        raise ValueError("method must be 'telea' or 'ns'")

    file_bytes = file.read()
    np_img = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

    mask = np.zeros(img.shape[:2], dtype=np.uint8)
    cv2.rectangle(mask, (x1, y1), (x2, y2), 255, -1)

    inpaint_flag = cv2.INPAINT_TELEA if method == 'telea' else cv2.INPAINT_NS
    result = cv2.inpaint(img, mask, inpaintRadius=3, flags=inpaint_flag)

    _, img_encoded = cv2.imencode('.jpg', result)
    return BytesIO(img_encoded.tobytes())


def _decode_base64_payload(value: str) -> bytes:
    """Decode a data-url or raw base64 string into bytes."""
    if not isinstance(value, str) or not value.strip():
        raise ValueError('Expected non-empty base64 string')

    payload = value.strip()
    if payload.startswith('data:'):
        if ',' not in payload:
            raise ValueError('Invalid data URL format')
        payload = payload.split(',', 1)[1]
    elif ',' in payload:
        # tolerate legacy "xxx,base64" strings from old clients
        payload = payload.split(',', 1)[1]

    payload = ''.join(payload.split())
    if not payload:
        raise ValueError('Empty base64 payload')

    padding = (-len(payload)) % 4
    if padding:
        payload += '=' * padding

    try:
        return base64.b64decode(payload, validate=True)
    except Exception as exc:
        raise ValueError('Invalid base64 payload') from exc


def _decode_image_input(image_data: str) -> np.ndarray:
    """Decode a data-url or raw base64 image into an OpenCV array."""
    decoded = _decode_base64_payload(image_data)
    nparr = np.frombuffer(decoded, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError('Could not decode image from provided base64 data')
    return image


def _download_binary_limited(url: str, max_bytes: int = REMOTE_IMAGE_MAX_BYTES) -> bytes:
    """Download remote bytes with a strict size limit to avoid memory abuse."""
    if not isinstance(url, str) or not url.strip():
        raise ValueError('background image url must be a non-empty string')

    response = requests.get(url, stream=True, timeout=30)
    response.raise_for_status()

    try:
        chunks: list[bytes] = []
        total = 0
        for chunk in response.iter_content(chunk_size=64 * 1024):
            if not chunk:
                continue
            total += len(chunk)
            if total > max_bytes:
                raise ValueError(
                    f'Background image is too large (> {max_bytes} bytes). '
                    'Use a smaller background image.'
                )
            chunks.append(chunk)

        return b''.join(chunks)
    finally:
        response.close()


def _ensure_rgba(image: np.ndarray, remove_fn) -> np.ndarray:
    """Guarantee RGBA image for compositing."""
    if image.ndim == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGRA)
    elif image.ndim == 3 and image.shape[2] == 3:
        image = remove_fn(image)
    elif image.ndim == 3 and image.shape[2] == 4:
        return image
    else:
        raise ValueError('Unsupported image shape')

    if isinstance(image, bytes):
        nparr = np.frombuffer(image, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)

    if image is None or image.ndim != 3:
        raise ValueError('Could not produce valid RGBA image')
    if image.shape[2] == 3:
        alpha = np.full((image.shape[0], image.shape[1], 1), 255, dtype=np.uint8)
        image = np.concatenate([image, alpha], axis=2)
    if image.shape[2] != 4:
        raise ValueError('Could not create alpha channel for image')
    return image


def _encode_png_base64(image: np.ndarray) -> str:
    ok, buffer = cv2.imencode('.png', image)
    if not ok:
        raise ValueError('Could not encode output image as PNG')
    return base64.b64encode(buffer).decode()


def _meta_for_image(image: np.ndarray) -> dict:
    channels = 1 if image.ndim == 2 else int(image.shape[2])
    return {
        'width': int(image.shape[1]),
        'height': int(image.shape[0]),
        'channels': channels,
        'has_alpha': channels == 4,
    }


def _downscale_if_needed(image: np.ndarray) -> np.ndarray:
    """
    Reduce very large images before heavy background operations.
    Controlled by BG_MAX_SIDE env (default: 2300, <=0 disables).
    """
    try:
        max_side = int(os.environ.get('BG_MAX_SIDE', '2300'))
    except Exception:
        max_side = 2300

    if max_side <= 0:
        return image

    h, w = image.shape[:2]
    cur_max = max(h, w)
    if cur_max <= max_side:
        return image

    scale = max_side / float(cur_max)
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)


def remove_background(image_data: str, include_meta: bool = False):
    """Remove background from a base64 image; returns base64 PNG or (base64, meta)."""
    try:
        remove_fn = _get_rembg_remove()
        input_image = _decode_image_input(image_data)
        input_image = _downscale_if_needed(input_image)

        output_image = remove_fn(input_image)
        if isinstance(output_image, bytes):
            nparr = np.frombuffer(output_image, np.uint8)
            output_image = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
        if output_image is None:
            raise ValueError('Background removal returned empty output')

        output_image = _ensure_rgba(output_image, remove_fn)
        encoded = _encode_png_base64(output_image)
        if include_meta:
            return encoded, _meta_for_image(output_image)
        return encoded
    except RuntimeError:
        raise
    except Exception as e:
        logger.error(f"remove_background error: {e}")
        raise ValueError(f'Could not remove background: {e}') from e


def change_background(image_data: str, background_type: str, background_value: str, include_meta: bool = False):
    """
    Change the background of an image.

    Parameters
    ----------
    background_type  : 'color' | 'image' | 'transparent'
    background_value : hex color string (e.g. '#ff0000') or base64/URL for an image
    """
    try:
        remove_fn = _get_rembg_remove()
        input_image = _decode_image_input(image_data)
        input_image = _downscale_if_needed(input_image)
        input_image = _ensure_rgba(input_image, remove_fn)

        bgr = input_image[:, :, :3]
        alpha = (input_image[:, :, 3] / 255.0).astype(np.float32)
        h, w = bgr.shape[:2]

        # Build new background layer
        if background_type == 'transparent':
            encoded = _encode_png_base64(input_image)
            if include_meta:
                return encoded, _meta_for_image(input_image)
            return encoded

        if background_type == 'color':
            hex_color = background_value.lstrip('#')
            if len(hex_color) != 6:
                raise ValueError('Invalid hex color')
            r, g, b = (int(hex_color[i:i + 2], 16) for i in (0, 2, 4))
            background = np.full((h, w, 3), (b, g, r), dtype=np.uint8)  # BGR order

        elif background_type == 'image':
            if background_value.startswith('data:image'):
                bg_decoded = _decode_base64_payload(background_value)
            else:
                bg_decoded = _download_binary_limited(background_value)

            bg_nparr = np.frombuffer(bg_decoded, np.uint8)
            background = cv2.imdecode(bg_nparr, cv2.IMREAD_COLOR)
            if background is None:
                raise ValueError('Could not decode background image')
            background = cv2.resize(background, (w, h))
        else:
            raise ValueError(f'Unknown background_type: {background_type}')

        # Alpha compositing
        alpha3 = np.dstack([alpha] * 3).astype(np.float32)
        fg = (alpha3 * bgr.astype(np.float32)).astype(np.uint8)
        bg = ((1.0 - alpha3) * background.astype(np.float32)).astype(np.uint8)
        out = cv2.add(fg, bg)

        encoded = _encode_png_base64(out)
        if include_meta:
            return encoded, _meta_for_image(out)
        return encoded

    except RuntimeError:
        raise
    except Exception as e:
        logger.error(f"change_background error: {e}")
        raise ValueError(f'Could not change background: {e}') from e


def convert_image(input_path: str, output_path: str, output_format: str) -> str | None:
    """
    Convert an image to the requested format.

    Parameters
    ----------
    output_format : PIL format string, e.g. 'PNG', 'JPEG', 'WEBP', 'BMP'
    """
    try:
        with Image.open(input_path) as img:
            # JPEG does not support transparency
            if output_format.upper() in ('JPEG', 'JPG'):
                img = img.convert('RGB')
            img.save(output_path, format=output_format)
        return output_path
    except Exception as e:
        logger.error(f"convert_image error: {e}")
        return None


# ─── Text → Image ───────────────────────────────────────────────────────────────
def _extract_image_base64_from_response(data: dict) -> str | None:
    """Extract base64 image from known NVIDIA response shapes."""
    if not isinstance(data, dict):
        return None

    artifacts = data.get('artifacts')
    if isinstance(artifacts, list) and artifacts:
        item = artifacts[0] if isinstance(artifacts[0], dict) else {}
        b64 = item.get('base64') or item.get('b64_json')
        if isinstance(b64, str) and b64.strip():
            return b64.strip()

    items = data.get('data')
    if isinstance(items, list) and items:
        item = items[0] if isinstance(items[0], dict) else {}
        b64 = item.get('base64') or item.get('b64_json') or item.get('image')
        if isinstance(b64, str) and b64.strip():
            return b64.strip()

    direct = data.get('image') or data.get('base64') or data.get('b64_json')
    if isinstance(direct, str) and direct.strip():
        return direct.strip()

    return None


def _build_nvidia_payload_variants(text: str) -> list[dict]:
    """Try common payload styles because model endpoints differ by schema."""
    return [
        {
            'prompt': text,
            'negative_prompt': '',
            'cfg_scale': 5,
            'steps': 25,
            'seed': 0,
        },
        {
            'text_prompts': [{'text': text, 'weight': 1}, {'text': '', 'weight': -1}],
            'cfg_scale': 5,
            'sampler': 'K_DPM_2_ANCESTRAL',
            'seed': 0,
            'steps': 25,
        },
    ]


def generate_image_from_text(text: str) -> str:
    """
    Call NVIDIA text-to-image API and return base64 image.
    Set the NVIDIA_API_KEY environment variable before running.
    """
    api_key = os.environ.get('NVIDIA_API_KEY', '')
    if not api_key:
        raise RuntimeError('NVIDIA_API_KEY is not set')

    primary_model = os.environ.get('NVIDIA_T2I_MODEL', 'stabilityai/stable-diffusion-xl').strip()
    fallback_model = os.environ.get(
        'NVIDIA_T2I_FALLBACK_MODEL',
        'stabilityai/stable-diffusion-3-medium',
    ).strip()
    models = [m.lstrip('/') for m in [primary_model, fallback_model] if m.strip()]
    models = list(dict.fromkeys(models))

    headers = {
        'Authorization': f'Bearer {api_key}',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    }

    payload_variants = _build_nvidia_payload_variants(text)
    errors: list[str] = []

    for model in models:
        url = f'https://ai.api.nvidia.com/v1/genai/{model}'
        for payload in payload_variants:
            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=NVIDIA_T2I_TIMEOUT_S)
            except requests.RequestException as exc:
                errors.append(f'{model}: network error: {exc}')
                break

            body = {}
            try:
                body = resp.json()
            except Exception:
                body = {}

            if resp.ok:
                b64 = _extract_image_base64_from_response(body)
                if b64:
                    return b64
                errors.append(f'{model}: response ok but missing image data')
                continue

            detail = (
                body.get('detail')
                or body.get('error')
                or body.get('message')
                or resp.text[:300]
                or f'HTTP {resp.status_code}'
            )
            errors.append(f'{model} ({resp.status_code}): {detail}')

            if resp.status_code in (401, 403):
                raise RuntimeError(f'NVIDIA auth failed ({resp.status_code}). Check NVIDIA_API_KEY.')
            if resp.status_code not in (400, 404, 422):
                break

    summary = ' | '.join(errors[-4:]) if errors else 'unknown error'
    raise RuntimeError(f'Text-to-image request failed: {summary}')


# ─── Download Utilities ─────────────────────────────────────────────────────────
def _delete_file(filepath: str) -> None:
    """Best-effort file deletion."""
    try:
        os.remove(filepath)
    except Exception as e:
        logger.error(f"Error deleting {filepath}: {e}")


def download_youtube_mp4(url: str, output_folder: str) -> None:
    """Download a YouTube video/playlist as MP4 into output_folder."""
    import yt_dlp

    failed: list[str] = []

    def _hook(d):
        if d['status'] == 'finished':
            logger.info('Download finished.')
        elif d['status'] == 'error':
            failed.append(d.get('filename', 'unknown'))

    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
        'outtmpl': os.path.join(output_folder, '%(title)s.%(ext)s'),
        'progress_hooks': [_hook],
        'merge_output_format': 'mp4',
        'ignoreerrors': True,
        'quiet': True,
        'no_warnings': False,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    if failed:
        logger.warning(f"Failed downloads: {failed}")


def download_soundcloud(media_url: str, output_folder: str) -> str:
    """
    Download SoundCloud track(s) as MP3.
    Returns the path to the temp folder containing downloaded files.
    """
    import yt_dlp

    temp_folder = tempfile.mkdtemp(dir=output_folder)
    failed: list[str] = []

    def _hook(d):
        if d['status'] == 'error':
            failed.append(d.get('filename', 'unknown'))

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(temp_folder, '%(title)s.%(ext)s'),
        'progress_hooks': [_hook],
        'postprocessors': [{'key': 'FFmpegExtractAudio',
                            'preferredcodec': 'mp3', 'preferredquality': '192'}],
        'ignoreerrors': True,
        'quiet': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([media_url])

    if failed:
        logger.warning(f"Failed SoundCloud tracks: {failed}")

    return temp_folder


def download_and_convert_playlist_to_mp3(playlist_url: str, output_folder: str) -> None:
    """Download a YouTube playlist and convert each track to MP3."""
    import yt_dlp

    temp_folder = tempfile.mkdtemp(dir=output_folder)
    failed: list[str] = []

    def _hook(d):
        if d['status'] == 'error':
            failed.append(d.get('filename', 'unknown'))

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(temp_folder, '%(title)s.%(ext)s'),
        'progress_hooks': [_hook],
        'postprocessors': [{'key': 'FFmpegExtractAudio',
                            'preferredcodec': 'mp3', 'preferredquality': '192'}],
        'ignoreerrors': True,
        'quiet': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([playlist_url])

        files_to_delete = []
        for fname in os.listdir(temp_folder):
            src = os.path.join(temp_folder, fname)
            if fname.lower().endswith('.mp3'):
                shutil.move(src, os.path.join(output_folder, fname))
            else:
                files_to_delete.append(src)

        if files_to_delete:
            with ThreadPoolExecutor() as ex:
                ex.map(_delete_file, files_to_delete)

    finally:
        shutil.rmtree(temp_folder, ignore_errors=True)
        if failed:
            logger.warning(f"Failed videos: {failed}")


# ─── Subtitle Utilities ─────────────────────────────────────────────────────────
def _format_time(seconds: float) -> str:
    """Convert seconds to WebVTT timestamp format: HH:MM:SS.mmm"""
    hours   = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs    = int(seconds % 60)
    millis  = int(round((seconds - int(seconds)) * 1000))
    return f'{hours:02}:{minutes:02}:{secs:02}.{millis:03}'


def _get_video_file_clip_class():
    """Import VideoFileClip for both moviepy v1 and v2."""
    try:
        from moviepy.editor import VideoFileClip  # moviepy v1
        return VideoFileClip
    except ModuleNotFoundError:
        try:
            from moviepy import VideoFileClip  # moviepy v2
            return VideoFileClip
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "Missing dependency 'moviepy'. Install in backend env: pip install moviepy"
            ) from exc


def _video_subclip(video, start: float, end: float):
    """Compatibility wrapper: moviepy v1 uses subclip, v2 uses subclipped."""
    if hasattr(video, 'subclip'):
        return video.subclip(start, end)
    if hasattr(video, 'subclipped'):
        return video.subclipped(start, end)
    raise RuntimeError('Unsupported moviepy version: no subclip/subclipped method')


def _safe_close_media(obj, label: str) -> None:
    """Best-effort close for moviepy objects; some versions raise on close."""
    if obj is None:
        return
    try:
        close_fn = getattr(obj, 'close', None)
        if callable(close_fn):
            close_fn()
    except Exception as exc:
        logger.warning(f'Ignoring close error for {label}: {exc}')


def _probe_video_duration_seconds(video_file_path: str) -> float:
    """Get video duration in seconds via ffprobe."""
    try:
        meta = ffmpeg.probe(video_file_path)
        duration = float(meta.get('format', {}).get('duration', 0.0))
        if duration > 0:
            return duration
    except Exception as exc:
        logger.warning(f'ffprobe duration failed: {exc}')
    return 0.0


def _extract_audio_segment_wav(
    video_file_path: str,
    output_wav_path: str,
    start_s: float,
    duration_s: float,
) -> None:
    """Extract a mono 16kHz WAV segment from video using ffmpeg."""
    (
        ffmpeg.input(video_file_path, ss=max(0.0, start_s), t=max(0.05, duration_s))
        .output(
            output_wav_path,
            ac=1,
            ar=16000,
            acodec='pcm_s16le',
            format='wav',
            loglevel='error',
        )
        .overwrite_output()
        .run(capture_stdout=True, capture_stderr=True)
    )


def generate_subtitles(video_file_path: str, temp_dir: str) -> str | None:
    """
    Generate a WebVTT subtitle file using Google Speech Recognition.
    Falls back to '[inaudible]' when speech is not recognised.
    """
    try:
        try:
            import speech_recognition as sr
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "Missing dependency 'SpeechRecognition'. Install in backend env: pip install SpeechRecognition"
            ) from exc

        duration = _probe_video_duration_seconds(video_file_path)
        if duration <= 0:
            raise RuntimeError('Could not determine video duration or video has no readable stream.')

        recognizer = sr.Recognizer()

        segment_s  = 5
        n_segments = math.ceil(duration / segment_s)
        cues       = ['WEBVTT\n']

        for i in range(n_segments):
            start = i * segment_s
            end   = min((i + 1) * segment_s, duration)

            chunk_path = os.path.join(temp_dir, f'chunk_{i}.wav')
            try:
                _extract_audio_segment_wav(video_file_path, chunk_path, start, end - start)
            except ffmpeg.Error as e:
                stderr = e.stderr.decode() if getattr(e, 'stderr', None) else str(e)
                logger.error(f'Audio extraction error at segment {i}: {stderr}')
                text = '[audio extraction error]'
                cues.append(f'{_format_time(start)} --> {_format_time(end)}\n{text}\n')
                continue

            with sr.AudioFile(chunk_path) as source:
                audio_data = recognizer.record(source)
                try:
                    text = recognizer.recognize_google(audio_data, language='en-US')
                except sr.UnknownValueError:
                    text = '[inaudible]'
                except sr.RequestError as e:
                    logger.error(f"Google SR request error: {e}")
                    text = '[recognition error]'

            cues.append(f'{_format_time(start)} --> {_format_time(end)}\n{text}\n')
            if os.path.exists(chunk_path):
                os.remove(chunk_path)

        vtt_path = os.path.join(temp_dir, 'subtitles.vtt')
        with open(vtt_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(cues))

        return vtt_path
    except RuntimeError:
        raise
    except Exception as e:
        logger.error(f"generate_subtitles error: {e}")
        return None


def _transcribe_vosk(audio_file_path: str, recognizers: dict) -> tuple[str, str]:
    """
    Transcribe audio with multiple Vosk models and return the best result.

    Returns
    -------
    (transcribed_text, detected_language_code)
    """
    # Normalise to 16 kHz mono 16-bit PCM
    audio = AudioSegment.from_file(audio_file_path)
    audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
    audio.export(audio_file_path, format='wav')

    best_text  = ''
    best_conf  = -1.0
    best_lang  = 'unknown'

    with wave.open(audio_file_path, 'rb') as wf:
        for lang_code, recognizer in recognizers.items():
            wf.rewind()
            results = []

            while True:
                data = wf.readframes(4000)
                if not data:
                    break
                if recognizer.AcceptWaveform(data):
                    results.append(json.loads(recognizer.Result()))

            results.append(json.loads(recognizer.FinalResult()))
            text = ' '.join(r.get('text', '') for r in results).strip()

            words = [w for r in results for w in r.get('result', [])]
            confs = [w.get('conf', 0.0) for w in words]
            avg_conf = sum(confs) / len(confs) if confs else 0.0

            logger.debug(f"Vosk [{lang_code}] conf={avg_conf:.3f} text='{text}'")

            if avg_conf > best_conf:
                best_conf = avg_conf
                best_text = text
                best_lang = lang_code

    return best_text, best_lang


def generate_subtitles_premium(video_file_path: str, temp_dir: str) -> str | None:
    """
    Generate subtitles using Vosk (offline).
    Model directory is read from the VOSK_MODELS_DIR env var (default: ./models).
    """
    video = None
    try:
        VideoFileClip = _get_video_file_clip_class()
        try:
            from vosk import KaldiRecognizer, Model
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "Missing dependency 'vosk'. Install in backend env: pip install vosk"
            ) from exc

        video = VideoFileClip(video_file_path)
        if video.audio is None:
            raise RuntimeError('Video has no audio track, cannot generate subtitles.')
        audio_path = os.path.join(temp_dir, 'audio.wav')
        video.audio.write_audiofile(audio_path, codec='pcm_s16le', logger=None)

        audio_seg = AudioSegment.from_wav(audio_path)
        dur_ms    = len(audio_seg)
        chunk_ms  = 5000

        # Load Vosk models from a configurable path.
        # Supports:
        # 1) a parent folder containing multiple models
        # 2) a direct path to a single model folder
        models_root_raw = os.environ.get(
            'VOSK_MODELS_DIR',
            os.path.join(os.path.dirname(__file__), '..', 'models'),
        )
        backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        if os.path.isabs(models_root_raw):
            models_root = models_root_raw
        else:
            models_root = os.path.abspath(os.path.join(backend_root, models_root_raw))

        model_paths: dict[str, str] = {}

        if os.path.isdir(models_root):
            # Case 1: env points directly to one model folder.
            try:
                Model(models_root)
                model_paths[os.path.basename(models_root.rstrip('/')) or 'default'] = models_root
                logger.info(f'Using single Vosk model directory: {models_root}')
            except Exception:
                # Case 2: env points to a folder containing multiple model dirs.
                for entry in os.listdir(models_root):
                    full = os.path.join(models_root, entry)
                    if os.path.isdir(full):
                        model_paths[entry] = full

        if not model_paths:
            logger.error(f'No usable Vosk models found in {models_root}')
            return None

        recognizers: dict[str, KaldiRecognizer] = {}
        for lang, path in model_paths.items():
            try:
                rec = KaldiRecognizer(Model(path), 16000)
                rec.SetWords(True)
                recognizers[lang] = rec
                logger.info(f'Loaded Vosk model: {lang}')
            except Exception as e:
                logger.error(f"Failed to load Vosk model {lang}: {e}")

        if not recognizers:
            return None

        cues  = ['WEBVTT\n']
        index = 1

        for start_ms in range(0, dur_ms, chunk_ms):
            end_ms = min(start_ms + chunk_ms, dur_ms)
            chunk  = audio_seg[start_ms:end_ms]
            chunk_path = os.path.join(temp_dir, f'chunk_{index}.wav')
            chunk.export(chunk_path, format='wav')

            try:
                text, _detected_lang = _transcribe_vosk(chunk_path, recognizers)
            except Exception as e:
                logger.error(f"Vosk transcription error at chunk {index}: {e}")
                text = '[error]'

            if os.path.exists(chunk_path):
                os.remove(chunk_path)

            subtitle_text = str(text or '').strip() or '[inaudible]'
            start_s = start_ms / 1000.0
            end_s   = end_ms   / 1000.0
            cues.append(
                f'{_format_time(start_s)} --> {_format_time(end_s)}\n'
                f'{subtitle_text}\n'
            )
            index += 1

        vtt_path = os.path.join(temp_dir, 'subtitles.vtt')
        with open(vtt_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(cues))

        if os.path.exists(audio_path):
            os.remove(audio_path)
        return vtt_path

    except Exception as e:
        logger.error(f"generate_subtitles_premium error: {e}")
        return None
    finally:
        _safe_close_media(video, 'video')


# ─── Video Processing ───────────────────────────────────────────────────────────
def merge_video_with_subtitles(video_path: str, subtitles_path: str, output_path: str) -> tuple[bool, str]:
    """
    Burn subtitles into a video using FFmpeg.
    Uses the full subtitles_path so it works on all OSes.
    """
    # FFmpeg needs forward slashes and escaped colons on Windows
    safe_sub = subtitles_path.replace('\\', '/').replace(':', '\\:')

    command = [
        'ffmpeg', '-y',
        '-i', video_path,
        '-vf', f"subtitles='{safe_sub}'",
        '-c:a', 'copy',
        output_path,
    ]
    logger.debug(f"merge_video_with_subtitles command: {' '.join(command)}")

    try:
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=FFMPEG_PROCESS_TIMEOUT_S,
        )
    except subprocess.TimeoutExpired:
        msg = f'FFmpeg merge timed out after {FFMPEG_PROCESS_TIMEOUT_S}s'
        logger.error(msg)
        return False, msg
    if result.returncode != 0:
        logger.error(f"FFmpeg stderr: {result.stderr}")
        return False, result.stderr
    return True, 'Merge completed successfully'


def apply_video_adjustments(input_path: str, adjustment_data: dict, output_path: str) -> None:
    """
    Apply visual adjustments to a video via FFmpeg.

    adjustment_data keys (all optional, defaults shown):
        brightness  : int, 0-200 (100 = neutral)
        contrast    : int, 0-200 (100 = neutral)
        saturation  : int, 0-200 (100 = neutral)
        hue         : float, degrees offset (0 = neutral)
        grey_scale  : int, 0 or 1
        sepia       : int, 0 or 1
        invert      : int, 0 or 1
        blur        : float ≥ 0  (0 = no blur)
    """
    def _f(key, default=0.0):
        try: return float(adjustment_data.get(key, default))
        except (ValueError, TypeError): return default

    def _i(key, default=0):
        try: return int(float(adjustment_data.get(key, default)))
        except (ValueError, TypeError): return default

    filters: list[str] = []

    # ── eq filter (brightness / contrast / saturation combined) ──────────────
    # FFmpeg requires all eq parameters in one filter call.
    brightness_pct = max(0.0, min(200.0, _f('brightness', 100)))
    contrast_pct = max(0.0, min(200.0, _f('contrast', 100)))
    saturation_pct = max(0.0, min(200.0, _f('saturation', 100)))

    brightness = (brightness_pct - 100.0) / 100.0
    contrast = contrast_pct / 100.0
    saturation = saturation_pct / 100.0
    filters.append(f'eq=brightness={brightness:.4f}:contrast={contrast:.4f}:saturation={saturation:.4f}')

    # ── hue rotation ─────────────────────────────────────────────────────────
    hue = max(-180.0, min(180.0, _f('hue', 0)))
    if hue != 0:
        filters.append(f'hue=h={hue:.2f}')

    # ── greyscale ─────────────────────────────────────────────────────────────
    if _i('grey_scale') > 0:
        filters.append('format=gray,format=yuv420p')

    # ── sepia ─────────────────────────────────────────────────────────────────
    if _i('sepia') > 0:
        filters.append(
            'colorchannelmixer='
            'rr=0.393:rg=0.769:rb=0.189:'
            'gr=0.349:gg=0.686:gb=0.168:'
            'br=0.272:bg=0.534:bb=0.131'
        )

    # ── invert ────────────────────────────────────────────────────────────────
    if _i('invert') > 0:
        filters.append('negate')

    # ── blur ──────────────────────────────────────────────────────────────────
    blur = max(0.0, min(30.0, _f('blur', 0)))
    if blur > 0:
        filters.append(f'boxblur={blur:.1f}:{blur:.1f}')

    filter_str = ','.join(filters)
    logger.debug(f"apply_video_adjustments vf: {filter_str}")

    command = ['ffmpeg', '-y', '-i', input_path, '-vf', filter_str, '-c:a', 'copy', output_path]
    try:
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=FFMPEG_PROCESS_TIMEOUT_S,
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(
            f'FFmpeg adjustment timed out after {FFMPEG_PROCESS_TIMEOUT_S}s'
        ) from exc

    if result.returncode != 0:
        raise subprocess.CalledProcessError(result.returncode, command,
                                            output=result.stdout, stderr=result.stderr)
    logger.info(f"Video adjustments applied → {output_path}")


def trim_video(input_path: str, output_path: str, start_time: float, end_time: float) -> None:
    """
    Trim a video between start_time and end_time (seconds) using FFmpeg.
    Uses stream-copy for fast, lossless trimming.
    """
    try:
        (
            ffmpeg
            .input(input_path, ss=start_time, to=end_time)
            .output(output_path, codec='copy')
            .overwrite_output()
            .run(quiet=True)
        )
        logger.info(f"Trimmed video saved to {output_path}")
    except ffmpeg.Error as e:
        logger.error(f"FFmpeg trim error: {e.stderr.decode() if e.stderr else e}")
        raise
