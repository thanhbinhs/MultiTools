import React, { useContext, useState } from "react";
import "../css/edit.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { ImageContext } from "@/context/ImageContext";
import { useZoom } from "@/context/ZoomContext";
import Download from "./Download"; // Adjust the path if necessary

function FooterEditor() {
  const { undo, redo, canUndo, canRedo, modeE } = useContext(ImageContext);
  const zoom = useZoom();
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const scale = zoom?.scale ?? 1;
  const zoomDisabled = modeE === "paint";
  const zoomIn = () => zoom?.apiRef?.current?.zoomIn?.();
  const zoomOut = () => zoom?.apiRef?.current?.zoomOut?.();
  const resetZoom = () => zoom?.apiRef?.current?.resetTransform?.();

  const zoomLabel = `${Math.round(scale * 100)}%`;

  return (
    <div className="toolbar ie-toolbar">
      <div className="ajust-size-section ie-toolbar-group">
        <button className="icon-button ie-icon-btn" onClick={zoomOut} type="button" aria-label="Thu nhỏ" disabled={zoomDisabled}>
          <i className="fa fa-search-minus"></i>
        </button>
        <button className="toolbar-button ie-zoom-pill" onClick={resetZoom} type="button" title="Đặt lại zoom" disabled={zoomDisabled}>
          <span className="zoom-text">{zoomLabel}</span>
        </button>
        <button className="icon-button ie-icon-btn" onClick={zoomIn} type="button" aria-label="Phóng to" disabled={zoomDisabled}>
          <i className="fa fa-search-plus"></i>
        </button>
      </div>
      <div className="undo-redo-section ie-toolbar-group">
        <button className="toolbar-button ie-ghost-btn" onClick={undo} disabled={!canUndo} type="button">
          <span className="zoom-text">HOÀN TÁC</span>
          <i className="fas fa-undo icon-custom"></i>
        </button>
        <button className="toolbar-button ie-ghost-btn" onClick={redo} disabled={!canRedo} type="button">
          <i className="fas fa-redo icon-custom"></i>
          <span className="zoom-text">HOÀN LẠI</span>
        </button>
      </div>
      <button
        className="toolbar-button save-button ie-save-btn"
        onClick={() => setShowDownloadModal(true)}
        type="button"
      >
        <i className="fa-solid fa-download"></i>
        <span>Lưu</span>
      </button>
      {showDownloadModal && (
        <Download closeModal={() => setShowDownloadModal(false)} />
      )}
    </div>
  );
}

export default FooterEditor;
