// components/AudioSpeedControl.jsx
import React, { useContext, useEffect, useState } from 'react';
import { AudioContext } from '@/context/AudioContext';
import styles from "../css/Audio.module.css";

const PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export default function AudioSpeedControl() {
  const { wavesurferRef } = useContext(AudioContext);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate, wavesurferRef]);

  return (
    <div>
      <div className={styles.audioControlContainer}>
        <label htmlFor="playbackRate" className={styles.playbackLabel}>
          {playbackRate.toFixed(2)}×
        </label>
        <input
          id="playbackRate"
          type="range"
          min="0.5"
          max="2.0"
          step="0.05"
          value={playbackRate}
          onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
          className={styles.playbackSlider}
        />
      </div>

      {/* Preset buttons */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
        {PRESETS.map((r) => (
          <button
            key={r}
            onClick={() => setPlaybackRate(r)}
            style={{
              padding: '3px 9px',
              borderRadius: '5px',
              border: `1px solid ${playbackRate === r ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.1)'}`,
              background: playbackRate === r
                ? 'rgba(245,158,11,0.15)'
                : 'rgba(255,255,255,0.04)',
              color: playbackRate === r ? '#f59e0b' : 'rgba(156,163,175,0.8)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              letterSpacing: '0.3px',
            }}
          >
            {r}×
          </button>
        ))}
      </div>
    </div>
  );
}