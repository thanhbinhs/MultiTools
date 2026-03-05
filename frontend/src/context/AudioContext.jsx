// context/AudioContext.jsx
import React, { createContext, useState, useRef, useCallback } from 'react';

export const AudioContext = createContext();

export const AudioProvider = ({ children }) => {
  const [currentAudio, setCurrentAudio] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [mode, setMode] = useState('');
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [fileName, setFileName] = useState('');

  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);

  const setInitialAudio = useCallback((file) => {
    setCurrentAudio(file);
    setIsReady(false);
    setCurrentTime(0);
    if (file instanceof File) {
      setFileName(file.name);
    }
  }, []);

  const setVolume = useCallback((val) => {
    setVolumeState(val);
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(val);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (wavesurferRef.current) {
        wavesurferRef.current.setMuted(next);
      }
      return next;
    });
  }, []);

  return (
    <AudioContext.Provider
      value={{
        currentAudio,
        setInitialAudio,
        audioUrl,
        setAudioUrl,
        waveformRef,
        wavesurferRef,
        mode,
        setMode,
        volume,
        setVolume,
        isMuted,
        toggleMute,
        isReady,
        setIsReady,
        duration,
        setDuration,
        currentTime,
        setCurrentTime,
        fileName,
        setFileName,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};