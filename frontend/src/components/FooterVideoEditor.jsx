// FooterVideoEditor.jsx

import React, { useContext, useState } from "react";
import "../css/edit.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { VideoContext } from "@/context/VideoContext";
import DownloadVideo from "./DownloadVideo"; // Adjust the path if necessary

function FooterVideoEditor() {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    isProcessing,
    progress,
    error,
    clearError,
  } = useContext(VideoContext);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  return (
    <div className="toolbar">
      <div className="ajust-size-section">
      </div>
      <div className="undo-redo-section">
        <button className="toolbar-button" onClick={undo} disabled={!canUndo || isProcessing}>
          <span className="zoom-text">HOÀN TÁC</span>
          <i className="fas fa-undo icon-custom"></i>
        </button>
        <button className="toolbar-button" onClick={redo} disabled={!canRedo || isProcessing}>
          <i className="fas fa-redo icon-custom"></i>
          <span className="zoom-text">HOÀN LẠI</span>
        </button>
      </div>
      <button
        className="toolbar-button save-button"
        disabled={isProcessing}
        onClick={() => setShowDownloadModal(true)}
      >
        <i className="fa-solid fa-download"></i>
        <span>Lưu</span>
      </button>

      <div style={{ minWidth: 220, color: "#c7d4ea", fontSize: 12, marginLeft: 10 }}>
        {isProcessing ? (
          <span>Đang xử lý video... {Math.round(progress || 0)}%</span>
        ) : error ? (
          <span>
            ⚠ {error}{" "}
            <button
              type="button"
              onClick={clearError}
              style={{
                background: "none",
                border: "none",
                color: "#7fc6ff",
                cursor: "pointer",
                textDecoration: "underline",
                padding: 0,
              }}
            >
              Ẩn
            </button>
          </span>
        ) : (
          <span>Sẵn sàng chỉnh sửa video</span>
        )}
      </div>

      {showDownloadModal && (
        <DownloadVideo closeModal={() => setShowDownloadModal(false)} />
      )}
    </div>
  );
}

export default FooterVideoEditor;
