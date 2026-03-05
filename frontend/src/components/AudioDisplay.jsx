// components/AudioDisplay.jsx
import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import InputFile from './InputFile';
import { AudioContext } from '@/context/AudioContext';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import styles from "../css/Audio.module.css";
import AudioSpeedControl from './AudioSpeedControl';
import AudioVolumeControl from './AudioVolumeControl';

export default function AudioDisplay({ mode }) {
  const {
    currentAudio,
    setInitialAudio,
    audioUrl,
    setAudioUrl,
    waveformRef,
    wavesurferRef,
    setIsReady,
    setDuration,
    setCurrentTime,
    fileName,
  } = useContext(AudioContext);

  const hoverRef = useRef(null);
  const timeRef = useRef(null);
  const durationRef = useRef(null);
  const [isPlay, setIsPlay] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  /* ── Derive object URL from File ── */
  useEffect(() => {
    if (currentAudio) {
      if (currentAudio instanceof File) {
        const url = URL.createObjectURL(currentAudio);
        setAudioUrl(url);
        return () => URL.revokeObjectURL(url);
      } else if (typeof currentAudio === 'string') {
        setAudioUrl(currentAudio);
      }
    } else {
      setAudioUrl(null);
    }
  }, [currentAudio]);

  /* ── Build WaveSurfer ── */
  useEffect(() => {
    if (typeof window === 'undefined' || !audioUrl) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 1.35);
    gradient.addColorStop(0, '#4b4b4b');
    gradient.addColorStop((canvas.height * 0.7) / canvas.height, '#656666');
    gradient.addColorStop((canvas.height * 0.7 + 1) / canvas.height, '#ffffff');
    gradient.addColorStop((canvas.height * 0.7 + 2) / canvas.height, '#ffffff');
    gradient.addColorStop((canvas.height * 0.7 + 3) / canvas.height, '#B1B1B1');
    gradient.addColorStop(1, '#B1B1B1');

    const progressGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 1.35);
    progressGradient.addColorStop(0, '#f59e0b');
    progressGradient.addColorStop((canvas.height * 0.7) / canvas.height, '#ea580c');
    progressGradient.addColorStop((canvas.height * 0.7 + 1) / canvas.height, '#ffffff');
    progressGradient.addColorStop((canvas.height * 0.7 + 2) / canvas.height, '#ffffff');
    progressGradient.addColorStop((canvas.height * 0.7 + 3) / canvas.height, '#F6B094');
    progressGradient.addColorStop(1, '#F6B094');

    if (waveformRef.current && !wavesurferRef.current) {
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: gradient,
        progressColor: progressGradient,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 90,
        url: audioUrl,
        plugins: [
          RegionsPlugin.create({ dragSelection: { slop: 5 } }),
        ],
      });

      // hover scrubber
      if (hoverRef.current) {
        waveformRef.current.addEventListener('pointermove', (e) => {
          if (hoverRef.current) hoverRef.current.style.width = `${e.offsetX}px`;
        });
        waveformRef.current.addEventListener('pointerleave', () => {
          if (hoverRef.current) hoverRef.current.style.width = '0px';
        });
      }

      const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = `0${Math.round(s) % 60}`.slice(-2);
        return `${m}:${sec}`;
      };

      wavesurferRef.current.on('ready', () => {
        const dur = wavesurferRef.current.getDuration();
        if (durationRef.current) durationRef.current.textContent = formatTime(dur);
        setIsReady(true);
        setDuration(dur);
      });

      wavesurferRef.current.on('audioprocess', (t) => {
        if (timeRef.current) timeRef.current.textContent = formatTime(t);
        setCurrentTime(t);
      });

      wavesurferRef.current.on('finish', () => {
        setIsPlay(false);
      });
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
      setIsPlay(false);
      setIsReady(false);
    };
  }, [audioUrl, waveformRef, wavesurferRef]);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e) => {
      if (!wavesurferRef.current) return;
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        wavesurferRef.current.playPause();
        setIsPlay((p) => !p);
      }
      if (e.code === 'ArrowLeft')  wavesurferRef.current.skip(-5);
      if (e.code === 'ArrowRight') wavesurferRef.current.skip(5);
      if (e.code === 'KeyM') {
        const muted = wavesurferRef.current.getMuted?.();
        wavesurferRef.current.setMuted?.(!muted);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [wavesurferRef]);

  /* ── Drag-and-drop ── */
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('audio/')) setInitialAudio(file);
  }, [setInitialAudio]);

  const shortFileDisplay = fileName
    ? (fileName.length > 38 ? fileName.slice(0, 35) + '…' : fileName)
    : '';

  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        padding: '20px',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#161618',
        fontFamily: "'Syne', sans-serif",
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {audioUrl ? (
        <>
          {/* ── File info bar ── */}
          <div className={styles.infoBar}>
            <span className={styles.ledDot} />
            {shortFileDisplay && (
              <span className={styles.fileNameBadge}>{shortFileDisplay}</span>
            )}
          </div>

          {/* ── Waveform ── */}
          <div className={styles.waveform} ref={waveformRef}>
            <div className={styles.time} ref={timeRef}>0:00</div>
            <div className={styles.duration} ref={durationRef}>0:00</div>
            <div className={styles.hover} ref={hoverRef} />
          </div>

          {/* ── Transport controls ── */}
          <div className={styles.buttonGroup}>
            {/* -15s */}
            <div
              className={styles.loader}
              title="Rewind 15s (←)"
              onClick={() => wavesurferRef.current?.skip(-15)}
            >
              −15s
            </div>

            {/* -5s */}
            <div
              className={styles.loader}
              title="Rewind 5s"
              onClick={() => wavesurferRef.current?.skip(-5)}
            >
              −5s
            </div>

            {/* Play/Pause */}
            <div
              className={`${styles.loader} ${styles.loaderPlay}`}
              title="Play / Pause (Space)"
              onClick={() => {
                wavesurferRef.current?.playPause();
                setIsPlay((p) => !p);
              }}
            >
              {isPlay ? (
                <div className={styles.loading}>
                  <div className={styles.load} />
                  <div className={styles.load} />
                  <div className={styles.load} />
                  <div className={styles.load} />
                </div>
              ) : (
                <div className={styles.play} />
              )}
            </div>

            {/* +5s */}
            <div
              className={styles.loader}
              title="Forward 5s"
              onClick={() => wavesurferRef.current?.skip(5)}
            >
              +5s
            </div>

            {/* +15s */}
            <div
              className={styles.loader}
              title="Forward 15s (→)"
              onClick={() => wavesurferRef.current?.skip(15)}
            >
              +15s
            </div>
          </div>

          <div className={styles.divider} />

          {/* ── Speed + Volume ── */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <div className={styles.controlLabel} style={{ marginBottom: 6 }}>Tốc độ</div>
              <AudioSpeedControl />
            </div>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <div className={styles.controlLabel} style={{ marginBottom: 6 }}>Âm lượng</div>
              <AudioVolumeControl />
            </div>
          </div>

          {/* ── Keyboard hints ── */}
          <div className={styles.shortcutsPanel}>
            {[
              ['Space', 'Play/Pause'],
              ['←/→', '±5s'],
              ['M', 'Mute'],
            ].map(([key, label]) => (
              <div key={key} className={styles.shortcutItem}>
                <span className={styles.kbd}>{key}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ── Drop / Upload zone ── */
        <div
          className={`${styles.dropZone} ${isDragOver ? styles.dragOver : ''}`}
          onClick={() => document.getElementById('audio')?.click()}
        >
          <div className={styles.dropIcon}>🎵</div>
          <div className={styles.dropTitle}>Thả file âm thanh vào đây</div>
          <div className={styles.dropSub}>hoặc nhấn để chọn file · MP3, WAV, FLAC, OGG…</div>
        </div>
      )}
    </div>
  );
}