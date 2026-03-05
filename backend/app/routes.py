# app/routes.py

import json
import logging
import os
import tempfile
import threading
import time
import uuid
from datetime import datetime, timezone
from io import BytesIO

import ffmpeg
import requests
import shutil
from flask import (Blueprint, after_this_request, current_app, jsonify,
                   request, send_file)
from werkzeug.utils import secure_filename

from .utils import (apply_video_adjustments, change_background,
                    convert_image, download_and_convert_playlist_to_mp3,
                    download_soundcloud, download_youtube_mp4,
                    generate_image_from_text, generate_subtitles,
                    generate_subtitles_premium, merge_video_with_subtitles,
                    process_crop, remove_background, remove_object,
                    resize_image, trim_video)

# ─── Setup Logging ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ─── Blueprint ─────────────────────────────────────────────────────────────────
bp = Blueprint('main', __name__)

# ─── Constants ─────────────────────────────────────────────────────────────────
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}
ALLOWED_SUBTITLE_EXTENSIONS = {'vtt', 'srt'}
ALLOWED_IMAGE_OUTPUT_FORMATS = {'PNG', 'JPEG', 'JPG', 'WEBP', 'BMP'}
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_FOLDER = os.path.join(BASE_DIR, 'assets', 'temp_trimmed_videos')
os.makedirs(OUTPUT_FOLDER, exist_ok=True)


# ─── Helpers ───────────────────────────────────────────────────────────────────
def allowed_file(filename: str, allowed_extensions: set) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions


def delete_file_after_delay(file_path: str, delay: int) -> None:
    """Delete the specified file after a delay (seconds)."""
    time.sleep(delay)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            logger.info(f"File {file_path} deleted after {delay}s.")
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {e}")


def json_error(message: str, status: int = 400, **extra):
    payload = {'error': message}
    if extra:
        payload.update(extra)
    return jsonify(payload), status


# ─── Image Routes ──────────────────────────────────────────────────────────────
@bp.route('/resize', methods=['POST'])
def resize_route():
    """Resize an uploaded image to 300×300 (default)."""
    if 'image' not in request.files:
        return json_error('Missing image file', 400)
    file = request.files['image']
    try:
        width = int(request.form.get('width', 300))
        height = int(request.form.get('height', 300))
        if width <= 0 or height <= 0:
            return json_error('width and height must be greater than 0', 400)

        img_io = resize_image(file, width, height)
        return send_file(img_io, mimetype='image/jpeg')
    except ValueError as e:
        return json_error(f'Invalid resize parameters: {e}', 400)
    except Exception as e:
        logger.exception(f"Error resizing image: {e}")
        return json_error(str(e), 500)


@bp.route('/crop', methods=['POST'])
def crop_image_route():
    """Crop an image given top/left/width/height and a base64 image string."""
    data = request.get_json(silent=True) or {}
    if not data:
        return json_error('Invalid JSON body', 400)
    try:
        top    = int(data['top'])
        left   = int(data['left'])
        width  = int(data['width'])
        height = int(data['height'])
        image_data = data['image']
        if width <= 0 or height <= 0:
            return json_error('width and height must be greater than 0', 400)
    except (KeyError, ValueError) as e:
        return json_error(f'Missing or invalid field: {e}', 400)

    try:
        cropped_image_str = process_crop(image_data, left, top, width, height)
        return jsonify({'cropped_image': 'data:image/png;base64,' + cropped_image_str})
    except ValueError as e:
        return json_error(str(e), 400)
    except Exception as e:
        logger.exception(f"Error cropping image: {e}")
        return json_error('Failed to crop image', 500)


@bp.route('/remove-object', methods=['POST'])
def remove_object_route():
    """Remove an object from an image using inpainting."""
    if 'image' not in request.files:
        return json_error('Missing image file', 400)
    try:
        file   = request.files['image']
        x1     = int(request.form['x1'])
        y1     = int(request.form['y1'])
        x2     = int(request.form['x2'])
        y2     = int(request.form['y2'])
        method = request.form.get('method', 'telea')
        result_io = remove_object(file, x1, y1, x2, y2, method)
        return send_file(result_io, mimetype='image/jpeg')
    except (KeyError, ValueError) as e:
        return json_error(f'Missing or invalid field: {e}', 400)
    except Exception as e:
        logger.exception(f"Error removing object: {e}")
        return json_error(str(e), 500)


@bp.route('/remove-background', methods=['POST'])
def remove_background_route():
    """Remove the background from a base64-encoded image."""
    data = request.get_json(silent=True) or {}
    image_data = data.get('image')
    if not image_data:
        return json_error('Missing image field in request body', 400)
    try:
        output = remove_background(image_data, include_meta=True)
        if isinstance(output, tuple):
            output_image_str, meta = output
        else:
            output_image_str, meta = output, None

        if output_image_str:
            payload = {
                'success': True,
                'action': 'remove-background',
                'message': 'Background removed successfully',
                'output_image': 'data:image/png;base64,' + output_image_str,
            }
            if meta:
                payload['meta'] = meta
            return jsonify(payload)
        return json_error('Failed to process background removal.', 500)
    except RuntimeError as e:
        logger.exception(f"Background removal dependency error: {e}")
        return json_error(str(e), 503)
    except ValueError as e:
        logger.exception(f"Invalid input for remove-background: {e}")
        return json_error(str(e), 400)
    except Exception as e:
        logger.exception(f"Error removing background: {e}")
        return json_error(str(e), 500)


@bp.route('/change-background', methods=['POST'])
def change_background_route():
    """Change the background of an image to a solid color or another image."""
    data = request.get_json(silent=True) or {}
    if not data:
        return json_error('Invalid JSON body', 400)

    image_data       = data.get('image')
    background_type  = str(data.get('backgroundType', '')).strip().lower()
    background_value = data.get('backgroundValue')

    if not image_data:
        return json_error('Missing required field: image', 400)
    if background_type not in {'transparent', 'color', 'image'}:
        return json_error('backgroundType must be one of: transparent, color, image', 400)
    if background_type in {'color', 'image'} and not background_value:
        return json_error('Missing required field: backgroundValue', 400)
    if background_type == 'transparent' and not background_value:
        background_value = 'transparent'

    try:
        output = change_background(
            image_data,
            background_type,
            background_value,
            include_meta=True,
        )
        if isinstance(output, tuple):
            output_image_str, meta = output
        else:
            output_image_str, meta = output, None

        if output_image_str:
            payload = {
                'success': True,
                'action': 'change-background',
                'applied_background': background_type,
                'message': 'Background updated successfully',
                'output_image': 'data:image/png;base64,' + output_image_str,
            }
            if meta:
                payload['meta'] = meta
            return jsonify(payload)
        return json_error('Failed to change background.', 500)
    except RuntimeError as e:
        logger.exception(f"Change background dependency error: {e}")
        return json_error(str(e), 503)
    except ValueError as e:
        logger.exception(f"Invalid input for change-background: {e}")
        return json_error(str(e), 400)
    except Exception as e:
        logger.exception(f"Error changing background: {e}")
        return json_error(str(e), 500)


@bp.route('/convert-image', methods=['POST'])
def convert_image_route():
    """Convert an uploaded image to a specified format (png, jpeg, webp, bmp…)."""
    if 'image' not in request.files:
        return json_error('Missing image file', 400)

    output_format = request.form.get('format', 'PNG').upper()
    if output_format not in ALLOWED_IMAGE_OUTPUT_FORMATS:
        return json_error(
            f'Unsupported format: {output_format}. Allowed: {sorted(ALLOWED_IMAGE_OUTPUT_FORMATS)}',
            400,
        )
    file = request.files['image']

    with tempfile.TemporaryDirectory() as tmp:
        input_path  = os.path.join(tmp, secure_filename(file.filename))
        output_path = os.path.join(tmp, f"converted.{output_format.lower()}")
        file.save(input_path)

        result = convert_image(input_path, output_path, output_format)
        if result:
            return send_file(output_path, as_attachment=True,
                             download_name=f"converted.{output_format.lower()}")
        return json_error('Image conversion failed', 500)


@bp.route('/text-to-image', methods=['POST'])
def text_to_image_route():
    """Generate an image from a text prompt using the NVIDIA API."""
    data = request.get_json(silent=True) or {}
    if not data:
        return json_error('Invalid JSON body', 400)

    text_prompt = data.get('text', '').strip()
    if not text_prompt:
        return json_error('text field is required and must not be empty', 400)

    try:
        base64_image = generate_image_from_text(text_prompt)
        return jsonify({'image': base64_image})
    except RuntimeError as e:
        logger.exception(f'text-to-image runtime error: {e}')
        message = str(e)
        if 'NVIDIA_API_KEY is not set' in message:
            return json_error(message, 503)
        return json_error(message, 502)
    except ValueError as e:
        logger.exception(f'text-to-image value error: {e}')
        return json_error(str(e), 400)
    except Exception as e:
        logger.exception(f'text-to-image unexpected error: {e}')
        return json_error('Failed to generate image', 500)


# ─── Download Routes ───────────────────────────────────────────────────────────
@bp.route('/download', methods=['POST'])
def download_playlist():
    """Download a YouTube playlist and return a ZIP of MP3 files."""
    data = request.get_json(silent=True) or {}
    url = data.get('url') if data else None
    if not url:
        return json_error('Missing playlist URL', 400)

    output_folder = os.path.join(current_app.root_path, 'assets', 'audios')
    os.makedirs(output_folder, exist_ok=True)
    temp_folder = tempfile.mkdtemp(dir=output_folder)

    try:
        download_and_convert_playlist_to_mp3(url, temp_folder)
        zip_file_path = shutil.make_archive(temp_folder, 'zip', temp_folder)
        zip_file_name = os.path.basename(zip_file_path)
        shutil.rmtree(temp_folder, ignore_errors=True)
        threading.Thread(target=delete_file_after_delay,
                         args=(zip_file_path, 3600), daemon=True).start()
        return jsonify({'download_link': zip_file_name})
    except Exception as e:
        logger.exception(f"Error downloading playlist: {e}")
        shutil.rmtree(temp_folder, ignore_errors=True)
        return jsonify({'error': 'Failed to process playlist'}), 500


@bp.route('/download/<filename>')
def download_file(filename):
    """Serve a previously created audio ZIP file."""
    file_path = os.path.join(current_app.root_path, 'assets', 'audios',
                             secure_filename(filename))
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    return jsonify({'error': 'File not found'}), 404


@bp.route('/download-youtube-mp4', methods=['POST'])   # fixed typo: 'dowload' → 'download'
def download_youtube_mp4_route():
    """Download a YouTube video as MP4 and return a ZIP archive."""
    data = request.get_json(silent=True) or {}
    url = data.get('url') if data else None
    if not url:
        return json_error('Missing video URL', 400)

    output_folder = os.path.join(current_app.root_path, 'assets', 'videos')
    os.makedirs(output_folder, exist_ok=True)
    temp_folder = tempfile.mkdtemp(dir=output_folder)

    try:
        download_youtube_mp4(url, temp_folder)
        zip_file_path = shutil.make_archive(temp_folder, 'zip', temp_folder)
        zip_file_name = os.path.basename(zip_file_path)
        shutil.rmtree(temp_folder, ignore_errors=True)
        threading.Thread(target=delete_file_after_delay,
                         args=(zip_file_path, 3600), daemon=True).start()
        return jsonify({'download_link': zip_file_name})
    except Exception as e:
        logger.exception(f"Error downloading YouTube video: {e}")
        shutil.rmtree(temp_folder, ignore_errors=True)
        return jsonify({'error': 'Failed to process video download'}), 500


@bp.route('/download-youtube-mp4/<filename>')
def download_youtube_mp4_file(filename):
    """Serve a previously created YouTube MP4 ZIP file."""
    file_path = os.path.join(current_app.root_path, 'assets', 'videos',
                             secure_filename(filename))
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    return jsonify({'error': 'File not found'}), 404


@bp.route('/download-soundcloud', methods=['POST'])
def download_soundcloud_mp3_route():
    """Download SoundCloud track(s) as MP3 and return a ZIP archive."""
    data = request.get_json(silent=True) or {}
    url = data.get('url') if data else None
    if not url:
        return json_error('Missing media URL', 400)

    output_folder = os.path.join(current_app.root_path, 'assets', 'soundcloud')
    os.makedirs(output_folder, exist_ok=True)

    try:
        temp_folder   = download_soundcloud(url, output_folder)
        zip_file_path = shutil.make_archive(temp_folder, 'zip', temp_folder)
        zip_file_name = os.path.basename(zip_file_path)
        shutil.rmtree(temp_folder, ignore_errors=True)
        threading.Thread(target=delete_file_after_delay,
                         args=(zip_file_path, 3600), daemon=True).start()
        return jsonify({'download_link': zip_file_name})
    except Exception as e:
        logger.exception(f"Error downloading SoundCloud media: {e}")
        return jsonify({'error': 'Failed to process the download request'}), 500


@bp.route('/download-soundcloud/<filename>')
def serve_soundcloud_zip(filename):
    """Serve a previously created SoundCloud ZIP file."""
    file_path = os.path.join(current_app.root_path, 'assets', 'soundcloud',
                             secure_filename(filename))
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    return jsonify({'error': 'File not found'}), 404


# ─── Subtitle Routes ───────────────────────────────────────────────────────────
def _receive_video(temp_dir: str):
    """
    Helper: save an uploaded video (file or URL) to temp_dir.
    Returns the local path or raises ValueError.
    """
    if 'video' in request.files:
        video_file = request.files['video']
        if not video_file.filename:
            raise ValueError('No video file selected')
        if not allowed_file(video_file.filename, ALLOWED_VIDEO_EXTENSIONS):
            raise ValueError(
                f'Unsupported video type. Allowed: {sorted(ALLOWED_VIDEO_EXTENSIONS)}'
            )
        video_path = os.path.join(temp_dir, secure_filename(video_file.filename))
        video_file.save(video_path)
        return video_path

    if 'video_url' in request.form:
        video_url = request.form['video_url']
        if not video_url.startswith(('http://', 'https://')):
            raise ValueError('video_url must start with http:// or https://')

        try:
            resp = requests.get(video_url, stream=True, timeout=60)
        except requests.RequestException as exc:
            raise ValueError(f'Cannot download video from URL: {exc}') from exc
        if resp.status_code != 200:
            raise ValueError('Cannot download video from URL')

        max_bytes = int(os.environ.get('REMOTE_VIDEO_MAX_BYTES', str(500 * 1024 * 1024)))
        total = 0
        video_path = os.path.join(temp_dir, 'video.mp4')
        try:
            with open(video_path, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    if not chunk:
                        continue
                    total += len(chunk)
                    if total > max_bytes:
                        raise ValueError(
                            f'Remote video exceeds size limit ({max_bytes} bytes).'
                        )
                    f.write(chunk)
        finally:
            resp.close()
        return video_path

    raise ValueError('Missing video file or video_url')


@bp.route('/generate-subtitles', methods=['POST'])
def generate_subtitles_route():
    """Generate VTT subtitles for an uploaded video (Google Speech Recognition)."""
    temp_dir = tempfile.mkdtemp()
    try:
        video_path = _receive_video(temp_dir)
        subtitles_path = generate_subtitles(video_path, temp_dir)

        if subtitles_path:
            @after_this_request
            def _cleanup(response):
                shutil.rmtree(temp_dir, ignore_errors=True)
                return response

            return send_file(subtitles_path, as_attachment=True,
                             download_name='subtitles.vtt', mimetype='text/vtt')
        return json_error('Failed to generate subtitles', 500)

    except ValueError as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        return json_error(str(e), 400)
    except RuntimeError as e:
        logger.exception(f"Subtitle runtime error: {e}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        return json_error(str(e), 503)
    except Exception as e:
        logger.exception(f"Subtitle generation error: {e}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        return json_error('Internal server error', 500)


@bp.route('/generate-subtitles-premium', methods=['POST'])
def generate_subtitles_premium_route():
    """Generate VTT subtitles using the Vosk offline engine (premium)."""
    temp_dir = tempfile.mkdtemp()
    try:
        video_path = _receive_video(temp_dir)
        subtitles_path = generate_subtitles_premium(video_path, temp_dir)

        if subtitles_path:
            @after_this_request
            def _cleanup(response):
                shutil.rmtree(temp_dir, ignore_errors=True)
                return response

            return send_file(subtitles_path, as_attachment=True,
                             download_name='subtitles.vtt', mimetype='text/vtt')
        return json_error('Failed to generate subtitles', 500)

    except ValueError as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        return json_error(str(e), 400)
    except RuntimeError as e:
        logger.exception(f"Premium subtitle runtime error: {e}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        return json_error(str(e), 503)
    except Exception as e:
        logger.exception(f"Premium subtitle generation error: {e}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        return json_error('Internal server error', 500)


# ─── Video Routes ──────────────────────────────────────────────────────────────
@bp.route('/merge-video', methods=['POST'])
def merge_video():
    """Burn subtitles into a video file using FFmpeg."""
    if 'video' not in request.files or 'subtitles' not in request.files:
        return json_error('Missing video or subtitles file', 400)

    video     = request.files['video']
    subtitles = request.files['subtitles']

    if not video.filename or not subtitles.filename:
        return json_error('Empty filename for video or subtitles', 400)

    if not allowed_file(video.filename, ALLOWED_VIDEO_EXTENSIONS):
        return json_error(
            f'Unsupported video type. Allowed: {sorted(ALLOWED_VIDEO_EXTENSIONS)}',
            400,
        )

    if not allowed_file(subtitles.filename, ALLOWED_SUBTITLE_EXTENSIONS):
        return json_error(
            f'Unsupported subtitle type. Allowed: {sorted(ALLOWED_SUBTITLE_EXTENSIONS)}',
            400,
        )

    video_filename     = secure_filename(video.filename)
    subtitles_filename = secure_filename(subtitles.filename)
    output_filename    = f"output_{video_filename}"

    with tempfile.TemporaryDirectory() as tmp:
        video_path     = os.path.join(tmp, video_filename)
        subtitles_path = os.path.join(tmp, subtitles_filename)
        output_path    = os.path.join(tmp, output_filename)

        video.save(video_path)
        subtitles.save(subtitles_path)

        success, message = merge_video_with_subtitles(video_path, subtitles_path, output_path)

        if not success:
            logger.error(f"Merge failed: {message}")
            return json_error('Merge failed', 500, details=message)

        if not os.path.exists(output_path):
            return json_error('Merged video file not found after processing', 500)

        # Read into memory so temp dir can be deleted
        with open(output_path, 'rb') as f:
            video_data = f.read()

    return send_file(
        BytesIO(video_data),
        mimetype='video/mp4',
        as_attachment=True,
        download_name=output_filename
    )


@bp.route('/apply-adjustment', methods=['POST'])
def apply_adjustment_route():
    """Apply brightness/contrast/saturation/hue/blur etc. to a video."""
    if 'video' not in request.files or 'adjustmentData' not in request.form:
        return json_error('Missing video file or adjustmentData', 400)

    video_file          = request.files['video']
    adjustment_data_str = request.form['adjustmentData']

    if not video_file.filename:
        return json_error('No selected video file', 400)
    if not allowed_file(video_file.filename, ALLOWED_VIDEO_EXTENSIONS):
        return json_error(
            f'Unsupported video type. Allowed: {sorted(ALLOWED_VIDEO_EXTENSIONS)}',
            400,
        )

    try:
        adjustment_data = json.loads(adjustment_data_str)
    except json.JSONDecodeError as e:
        return json_error(f'Invalid JSON for adjustmentData: {e}', 400)

    if not isinstance(adjustment_data, dict):
        return json_error('adjustmentData must be a JSON object', 400)

    adjusted_folder = os.path.join(BASE_DIR, 'assets', 'adjusted_videos')
    os.makedirs(adjusted_folder, exist_ok=True)

    file_id        = str(uuid.uuid4())
    _, ext         = os.path.splitext(secure_filename(video_file.filename))
    input_path     = os.path.join(adjusted_folder, f"{file_id}_input{ext}")
    output_path    = os.path.join(adjusted_folder, f"{file_id}_adjusted.mp4")

    try:
        video_file.save(input_path)
        apply_video_adjustments(input_path, adjustment_data, output_path)

        @after_this_request
        def _cleanup(response):
            for p in (input_path, output_path):
                try:
                    if os.path.exists(p):
                        os.remove(p)
                except Exception as ex:
                    logger.error(f"Cleanup error {p}: {ex}")
            return response

        return send_file(output_path, mimetype='video/mp4', as_attachment=True,
                         download_name=f"adjusted_{video_file.filename}")

    except Exception as e:
        logger.exception(f"Error applying adjustments: {e}")
        for p in (input_path, output_path):
            if os.path.exists(p):
                os.remove(p)
        return json_error('Failed to apply adjustments', 500, details=str(e))


@bp.route('/trim-video', methods=['POST'])
@bp.route('/trim-video/', methods=['POST'])
def trim_video_route():
    """Trim a video between start_time and end_time (seconds)."""
    if 'video' not in request.files:
        return json_error('No video part in the request', 400)

    video_file = request.files['video']
    if not video_file.filename:
        return json_error('No selected file', 400)
    if not allowed_file(video_file.filename, ALLOWED_VIDEO_EXTENSIONS):
        return json_error(
            f'Unsupported video type. Allowed: {sorted(ALLOWED_VIDEO_EXTENSIONS)}',
            400,
        )

    try:
        trim_start = float(request.form.get('trim_start', 0))
        trim_end   = float(request.form.get('trim_end', 0))
    except ValueError:
        return json_error('trim_start and trim_end must be numbers', 400)

    if trim_start < 0 or trim_end <= trim_start:
        return json_error('trim_end must be greater than trim_start (≥ 0)', 400)

    file_id        = str(uuid.uuid4())
    ext            = os.path.splitext(secure_filename(video_file.filename))[1]
    input_filename = f"{file_id}_input{ext}"
    output_filename = f"{file_id}_trimmed.mp4"
    input_path     = os.path.join(OUTPUT_FOLDER, input_filename)
    output_path    = os.path.join(OUTPUT_FOLDER, output_filename)

    try:
        video_file.save(input_path)
        trim_video(input_path, output_path, trim_start, trim_end)
    except ffmpeg.Error as e:
        stderr = e.stderr.decode() if e.stderr else str(e)
        logger.error(f"FFmpeg trim error: {stderr}")
        if os.path.exists(input_path):
            os.remove(input_path)
        return json_error('FFmpeg trim error', 500, details=stderr)
    except Exception as e:
        logger.exception(f"Unexpected trim error: {e}")
        if os.path.exists(input_path):
            os.remove(input_path)
        return json_error('Error trimming video', 500)
    finally:
        if os.path.exists(input_path):
            try: os.remove(input_path)
            except Exception: pass

    @after_this_request
    def _cleanup(response):
        try:
            if os.path.exists(output_path):
                os.remove(output_path)
        except Exception as e:
            logger.error(f"Failed to delete trimmed video: {e}")
        return response

    return send_file(output_path, mimetype='video/mp4', as_attachment=True,
                     download_name=f"trimmed_{video_file.filename}")


# ─── Health Check ──────────────────────────────────────────────────────────────
@bp.route('/health', methods=['GET'])
def health_check():
    """Simple health-check endpoint."""
    return jsonify({
        'status': 'ok',
        'timestamp_utc': datetime.now(timezone.utc).isoformat(),
        'service': 'multitools-backend',
    }), 200
