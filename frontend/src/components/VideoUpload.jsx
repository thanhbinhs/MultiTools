// VideoUpload.jsx

import React, { useContext } from "react";
import { VideoContext } from "@/context/VideoContext";
import { LuFileVideo } from "react-icons/lu";

const VideoUpload = () => {
  const { setInitialVideo } = useContext(VideoContext);

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type?.startsWith("video/")) {
        e.target.value = "";
        return;
      }
      setInitialVideo(file);
    }
    e.target.value = "";
  };

  return (
    <div style={{ margin: "auto" }}>
      <label
        htmlFor="video"
        style={{
          color: "#dbe8ff",
          padding: "10px 14px",
          cursor: "pointer",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "7px",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "10px",
          background: "rgba(255,255,255,0.06)",
        }}
      >
       <LuFileVideo />
        Thêm video
      </label>
      <input
        type="file"
        id="video"
        accept="video/*"
        onChange={handleVideoUpload}
        style={{ display: "none" }}
      />
    </div>
  );
};

export default VideoUpload;
