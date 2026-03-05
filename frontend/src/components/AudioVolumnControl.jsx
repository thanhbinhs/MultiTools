// components/AudioVolumeControl.jsx
import React, { useContext, useState } from 'react';
import { AudioContext } from '@/context/AudioContext';
import styles from "../css/Audio.module.css";

export default function AudioVolumeControl() {
  const { wavesurferRef } = useContext(AudioContext);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const handleVolume = (e) => {
    const val = parseFloat(e.target.value);
    setVolumeState(val);
    setIsMuted(false);
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(val);
      wavesurferRef.current.setMuted?.(false);
    }
  };

  const handleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (wavesurferRef.current) {
      wavesurferRef.current.setMuted?.(next);
    }
  };

  const icon = isMuted || volume === 0 ? '🔇' : volume < 0.4 ? '🔈' : volume < 0.75 ? '🔉' : '🔊';

  return (
    <div className={styles.volumeContainer}>
      <span
        className={styles.volumeIcon}
        onClick={handleMute}
        title="Mute (M)"
        style={{ fontSize: 16, cursor: 'pointer', userSelect: 'none' }}
      >
        {icon}
      </span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.02"
        value={isMuted ? 0 : volume}
        onChange={handleVolume}
        className={styles.volumeSlider}
        title={`${Math.round((isMuted ? 0 : volume) * 100)}%`}
      />
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: 'rgba(156,163,175,0.6)',
        minWidth: 32,
        textAlign: 'right',
      }}>
        {Math.round((isMuted ? 0 : volume) * 100)}%
      </span>
    </div>
  );
}