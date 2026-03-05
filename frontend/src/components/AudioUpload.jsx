// components/AudioUpload.jsx
import React, { useContext } from "react";
import { AudioContext } from "@/context/AudioContext";

const AudioUpload = () => {
  const { setInitialAudio } = useContext(AudioContext);

  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file) setInitialAudio(file);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", paddingLeft: "16px" }}>
      <label
        htmlFor="audio"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "rgba(245,158,11,0.85)",
          padding: "8px 16px",
          cursor: "pointer",
          fontSize: "13px",
          fontFamily: "'Syne', sans-serif",
          fontWeight: 600,
          letterSpacing: "0.3px",
          borderRadius: "8px",
          border: "1px solid rgba(245,158,11,0.25)",
          background: "rgba(245,158,11,0.07)",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(245,158,11,0.14)";
          e.currentTarget.style.borderColor = "rgba(245,158,11,0.5)";
          e.currentTarget.style.color = "#f59e0b";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(245,158,11,0.07)";
          e.currentTarget.style.borderColor = "rgba(245,158,11,0.25)";
          e.currentTarget.style.color = "rgba(245,158,11,0.85)";
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        Thêm Audio
      </label>
      <input
        type="file"
        id="audio"
        accept="audio/*"
        onChange={handleAudioUpload}
        style={{ display: "none" }}
      />
    </div>
  );
};

export default AudioUpload;