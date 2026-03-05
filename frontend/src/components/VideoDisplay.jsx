// VideoDisplay.jsx

import React, { useContext, useEffect, useRef, useState } from "react";
import { VideoContext } from "@/context/VideoContext";
import styles from "../css/VideoDisplay.module.css";
import InputFile from "./InputFile";
import VideoProgressBar from "./VideoProgressBar";

const THUMB_MIN = 8;
const THUMB_MAX = 24;

const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

const VideoDisplay = () => {
  const {
    currentVideo,
    videoRef,
    adjustmentData,
    setVideoParameters,
    subtitlesFile,
    setInitialVideo,
    isProcessing,
    progress,
    error,
    clearError,
  } = useContext(VideoContext);

  const [videoUrl, setVideoUrl] = useState(null);
  const [subtitlesUrl, setSubtitlesUrl] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);

  const videoDisplayRef = useRef(null);
  const hiddenVideoRef = useRef(null);

  useEffect(() => {
    if (!currentVideo) {
      setVideoUrl(null);
      setThumbnails([]);
      return;
    }

    if (currentVideo instanceof File) {
      const url = URL.createObjectURL(currentVideo);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    if (typeof currentVideo === "string") {
      setVideoUrl(currentVideo);
      return;
    }

    setVideoUrl(null);
    setThumbnails([]);
  }, [currentVideo]);

  useEffect(() => {
    if (!subtitlesFile) {
      setSubtitlesUrl(null);
      return;
    }

    if (subtitlesFile instanceof File) {
      const url = URL.createObjectURL(subtitlesFile);
      setSubtitlesUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    if (typeof subtitlesFile === "string") {
      setSubtitlesUrl(subtitlesFile);
      return;
    }

    setSubtitlesUrl(null);
  }, [subtitlesFile]);

  useEffect(() => {
    const visibleVideo = videoRef.current;
    if (!visibleVideo) return;

    const updateVideoParameters = () => {
      if (!videoRef.current) return;
      const rect = videoRef.current.getBoundingClientRect();
      setVideoParameters({
        width: rect.width,
        height: rect.height,
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
      });
    };

    const handleVideoLoad = () => updateVideoParameters();

    visibleVideo.addEventListener("loadedmetadata", handleVideoLoad);
    window.addEventListener("resize", updateVideoParameters);

    if (visibleVideo.readyState >= 1) {
      updateVideoParameters();
    }

    return () => {
      visibleVideo.removeEventListener("loadedmetadata", handleVideoLoad);
      window.removeEventListener("resize", updateVideoParameters);
    };
  }, [videoRef, setVideoParameters, currentVideo]);

  useEffect(() => {
    const hidden = hiddenVideoRef.current;
    if (!hidden || !videoUrl) {
      setThumbnails([]);
      return;
    }

    let cancelled = false;

    const waitForSeek = (videoEl, time) =>
      new Promise((resolve) => {
        if (Math.abs((videoEl.currentTime || 0) - time) < 0.01) {
          setTimeout(resolve, 20);
          return;
        }

        const onSeeked = () => {
          clearTimeout(timeoutId);
          videoEl.removeEventListener("seeked", onSeeked);
          resolve();
        };
        videoEl.addEventListener("seeked", onSeeked);

        const timeoutId = setTimeout(() => {
          videoEl.removeEventListener("seeked", onSeeked);
          resolve();
        }, 500);

        videoEl.currentTime = time;
      });

    const buildThumbnails = async () => {
      const duration = hidden.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        setThumbnails([]);
        return;
      }

      const targetCount = clamp(Math.round(duration / 7), THUMB_MIN, THUMB_MAX);
      const times = Array.from({ length: targetCount }, (_, idx) =>
        targetCount === 1
          ? 0
          : Math.min(duration - 0.05, (duration * idx) / (targetCount - 1))
      );

      const canvas = document.createElement("canvas");
      const w = 200;
      const h = 112;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setThumbnails([]);
        return;
      }

      const next = [];
      for (const t of times) {
        if (cancelled) return;
        await waitForSeek(hidden, t);
        if (cancelled) return;
        try {
          ctx.drawImage(hidden, 0, 0, w, h);
          next.push({ time: t, src: canvas.toDataURL("image/jpeg", 0.75) });
        } catch {
          // skip bad frame
        }
      }

      if (!cancelled) {
        setThumbnails(next);
      }
    };

    const handleLoadedData = () => {
      buildThumbnails();
    };

    hidden.addEventListener("loadeddata", handleLoadedData);
    hidden.load();

    return () => {
      cancelled = true;
      hidden.removeEventListener("loadeddata", handleLoadedData);
    };
  }, [videoUrl]);

  return (
    <div ref={videoDisplayRef} className={styles.videoContainer}>
      {videoUrl ? (
        <div className={styles.videoWrapper}>
          <div className={styles.stageHeader}>
            <span className={styles.stageBadge}>Video Editor</span>
            {error ? (
              <button className={styles.clearErrorBtn} type="button" onClick={clearError}>
                Xóa thông báo lỗi
              </button>
            ) : null}
          </div>

          <div className={styles.playerArea}>
            <video
              ref={videoRef}
              src={videoUrl}
              controls={false}
              className={styles.videoElement}
              preload="metadata"
              style={{
                filter: `
                  brightness(${adjustmentData.brightness}%)
                  saturate(${adjustmentData.saturation}%)
                  contrast(${adjustmentData.contrast}%)
                  hue-rotate(${adjustmentData.hue}deg)
                  grayscale(${adjustmentData.grey_scale}%)
                  sepia(${adjustmentData.sepia}%)
                  invert(${adjustmentData.invert}%)
                  blur(${adjustmentData.blur}px)
                `,
              }}
            >
              {subtitlesUrl && (
                <track kind="subtitles" src={subtitlesUrl} srcLang="vi" label="Vietnamese" default />
              )}
              Trình duyệt của bạn không hỗ trợ video.
            </video>

            <video
              ref={hiddenVideoRef}
              src={videoUrl}
              style={{ display: "none" }}
              preload="metadata"
              muted
              playsInline
              crossOrigin="anonymous"
            />

            {isProcessing ? (
              <div className={styles.processingOverlay}>
                <div className={styles.processingCard}>
                  <div className={styles.processingTitle}>Đang xử lý video...</div>
                  <div className={styles.processingBarTrack}>
                    <div className={styles.processingBarFill} style={{ width: `${Math.max(8, progress || 0)}%` }} />
                  </div>
                  <div className={styles.processingPercent}>{Math.round(progress || 0)}%</div>
                </div>
              </div>
            ) : null}
          </div>

          {error ? <div className={styles.errorBanner}>⚠ {error}</div> : null}

          <VideoProgressBar thumbnails={thumbnails} />
        </div>
      ) : (
        <div className={styles.emptyStateWrap}>
          <div className={styles.emptyStateCard}>
            <h3>Bắt đầu chỉnh sửa video</h3>
            <p>Tải video lên để dùng bộ lọc, cắt video, và ghép phụ đề.</p>
            <InputFile setFile={setInitialVideo} type="Video" />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoDisplay;
