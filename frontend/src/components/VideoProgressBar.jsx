// VideoProgressBar.jsx

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { VideoContext } from "@/context/VideoContext";
import styles from "../css/VideoProgressBar.module.css";

const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const MIN_TRIM_GAP = 1;

const VideoProgressBar = ({ thumbnails = [] }) => {
  const { videoRef, trimVideo, isProcessing } = useContext(VideoContext);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverThumbnail, setHoverThumbnail] = useState(null);

  const progressBarRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      const d = Number.isFinite(video.duration) ? video.duration : 0;
      setDuration(d);
      setCurrentTime(video.currentTime || 0);
      setTrimStart(0);
      setTrimEnd(d);
    };

    const onTimeUpdate = () => {
      const t = video.currentTime || 0;
      if (!isDragging) {
        if (trimEnd > trimStart && t > trimEnd) {
          video.currentTime = trimEnd;
          video.pause();
          setIsPlaying(false);
          setCurrentTime(trimEnd);
          return;
        }
        if (t < trimStart) {
          video.currentTime = trimStart;
          setCurrentTime(trimStart);
          return;
        }
        setCurrentTime(t);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);

    if (video.readyState >= 1) {
      onLoadedMetadata();
    }

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, [videoRef, isDragging, trimStart, trimEnd]);

  const progressPercent = useMemo(() => {
    if (!duration || !Number.isFinite(duration)) return 0;
    return clamp((currentTime / duration) * 100, 0, 100);
  }, [currentTime, duration]);

  const trimStartPercent = useMemo(() => {
    if (!duration || !Number.isFinite(duration)) return 0;
    return clamp((trimStart / duration) * 100, 0, 100);
  }, [trimStart, duration]);

  const trimEndPercent = useMemo(() => {
    if (!duration || !Number.isFinite(duration)) return 100;
    return clamp((trimEnd / duration) * 100, 0, 100);
  }, [trimEnd, duration]);

  const seekByClientX = (clientX, shouldClampToTrim = true) => {
    const video = videoRef.current;
    const bar = progressBarRef.current;
    if (!video || !bar || !duration) return;

    const rect = bar.getBoundingClientRect();
    const raw = clamp((clientX - rect.left) / rect.width, 0, 1);
    let targetTime = raw * duration;

    if (shouldClampToTrim && trimEnd > trimStart) {
      targetTime = clamp(targetTime, trimStart, trimEnd);
    }

    video.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleProgressBarClick = (event) => {
    if (isProcessing) return;
    seekByClientX(event.clientX, false);
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video || isProcessing) return;

    if (video.paused || video.ended) {
      if (video.currentTime < trimStart || video.currentTime > trimEnd) {
        video.currentTime = trimStart;
        setCurrentTime(trimStart);
      }
      video.play();
    } else {
      video.pause();
    }
  };

  const handleRewind15 = () => {
    const video = videoRef.current;
    if (!video || isProcessing) return;
    const t = clamp(video.currentTime - 15, 0, duration || 0);
    video.currentTime = t;
    setCurrentTime(t);
  };

  const handleForward15 = () => {
    const video = videoRef.current;
    if (!video || isProcessing) return;
    const t = clamp(video.currentTime + 15, 0, duration || 0);
    video.currentTime = t;
    setCurrentTime(t);
  };

  const setupDrag = (onMove) => {
    setIsDragging(true);

    const onMouseMove = (e) => onMove(e.clientX);
    const onTouchMove = (e) => onMove(e.touches[0].clientX);

    const onEnd = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchend", onEnd);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchend", onEnd);
  };

  const handlePlayheadDragStart = (event) => {
    if (isProcessing) return;
    event.preventDefault();
    setupDrag((clientX) => seekByClientX(clientX, false));
  };

  const handleTrimStartDragStart = (event) => {
    if (isProcessing) return;
    event.preventDefault();

    setupDrag((clientX) => {
      const bar = progressBarRef.current;
      if (!bar || !duration) return;
      const rect = bar.getBoundingClientRect();
      const raw = clamp((clientX - rect.left) / rect.width, 0, 1);
      const next = raw * duration;
      const capped = clamp(next, 0, Math.max(0, trimEnd - MIN_TRIM_GAP));
      setTrimStart(capped);

      if (currentTime < capped && videoRef.current) {
        videoRef.current.currentTime = capped;
        setCurrentTime(capped);
      }
    });
  };

  const handleTrimEndDragStart = (event) => {
    if (isProcessing) return;
    event.preventDefault();

    setupDrag((clientX) => {
      const bar = progressBarRef.current;
      if (!bar || !duration) return;
      const rect = bar.getBoundingClientRect();
      const raw = clamp((clientX - rect.left) / rect.width, 0, 1);
      const next = raw * duration;
      const capped = clamp(next, Math.min(duration, trimStart + MIN_TRIM_GAP), duration);
      setTrimEnd(capped);

      if (currentTime > capped && videoRef.current) {
        videoRef.current.currentTime = capped;
        setCurrentTime(capped);
      }
    });
  };

  const handleMouseMove = (event) => {
    if (!duration || !progressBarRef.current || thumbnails.length === 0 || isDragging) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const t = ratio * duration;
    setHoverTime(t);

    const idx = clamp(Math.round(ratio * (thumbnails.length - 1)), 0, thumbnails.length - 1);
    setHoverThumbnail(thumbnails[idx]?.src || null);
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setHoverTime(null);
      setHoverThumbnail(null);
    }
  };

  const handleTrimApply = async () => {
    if (isProcessing) return;
    if (!duration || trimEnd - trimStart < MIN_TRIM_GAP) return;

    try {
      await trimVideo(trimStart, trimEnd);
      setHoverTime(null);
      setHoverThumbnail(null);
    } catch {
      // error shown by context
    }
  };

  if (!duration) {
    return null;
  }

  return (
    <div className={styles.controlsContainer}>
      <div className={styles.buttonGroup}>
        <button className={styles.rewindButton} onClick={handleRewind15} aria-label="Rewind 15 seconds" type="button">
          <i className="fas fa-undo-alt" /> -15s
        </button>

        <button className={styles.playPauseButton} onClick={handlePlayPause} aria-label={isPlaying ? "Pause" : "Play"} type="button">
          {isPlaying ? <i className="fas fa-pause" /> : <i className="fas fa-play" />}
        </button>

        <button className={styles.forwardButton} onClick={handleForward15} aria-label="Forward 15 seconds" type="button">
          +15s <i className="fas fa-redo-alt" />
        </button>

        <button
          className={styles.trimButton}
          onClick={handleTrimApply}
          aria-label="Trim Video"
          disabled={isProcessing || trimEnd - trimStart < MIN_TRIM_GAP}
          type="button"
        >
          Trim {formatTime(trimStart)} - {formatTime(trimEnd)}
        </button>
      </div>

      <div className={styles.progressAndTrimContainer}>
        <div
          className={styles.progressBarContainer}
          onClick={handleProgressBarClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          ref={progressBarRef}
        >
          {thumbnails.length > 0 && (
            <div className={styles.thumbnailsBackground}>
              {thumbnails.map((thumbnail, index) => {
                const leftPct = duration ? (thumbnail.time / duration) * 100 : 0;
                return (
                  <Image
                    key={index}
                    src={thumbnail.src}
                    alt={`Thumbnail ${index}`}
                    className={styles.thumbnailImage}
                    width={80}
                    height={58}
                    unoptimized
                    style={{ left: `${leftPct}%` }}
                  />
                );
              })}
            </div>
          )}

          <div
            className={styles.trimRegion}
            style={{
              left: `${trimStartPercent}%`,
              width: `${Math.max(0, trimEndPercent - trimStartPercent)}%`,
            }}
          />

          <div className={`${styles.progressIndicator} ${isDragging ? styles.dragging : ""}`} style={{ width: `${progressPercent}%` }} />

          <div
            className={styles.thumb}
            style={{ left: `${progressPercent}%` }}
            onMouseDown={handlePlayheadDragStart}
            onTouchStart={handlePlayheadDragStart}
          />

          <div
            className={styles.trimHandle}
            style={{ left: `${trimStartPercent}%` }}
            onMouseDown={handleTrimStartDragStart}
            onTouchStart={handleTrimStartDragStart}
          />

          <div
            className={styles.trimHandle}
            style={{ left: `${trimEndPercent}%` }}
            onMouseDown={handleTrimEndDragStart}
            onTouchStart={handleTrimEndDragStart}
          />

          {hoverThumbnail && hoverTime != null && (
            <div className={`${styles.thumbnailPreview} ${styles.visible}`} style={{ left: `${(hoverTime / duration) * 100}%` }}>
              <Image src={hoverThumbnail} alt="Thumbnail preview" width={176} height={98} unoptimized />
              <div className={styles.previewTime}>{formatTime(hoverTime)}</div>
            </div>
          )}
        </div>

        <div className={styles.timeDisplay}>
          <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
          <span>Trim: {formatTime(trimStart)} → {formatTime(trimEnd)}</span>
        </div>
      </div>
    </div>
  );
};

export default VideoProgressBar;
