// ============================================================
// functions/Retouch.jsx
// ============================================================
import React, { useContext, useState } from "react";
import { FaTimes, FaSpinner } from "react-icons/fa";
import { MdFaceRetouchingNatural } from "react-icons/md";
import { ImageContext } from "@/context/ImageContext";
import "../css/menuEditor.css";

export function Retouch({ onClose }) {
  const { handleRetouchSkin, currentImage } = useContext(ImageContext);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error, setError] = useState(null);

  const handleClick = async () => {
    if (!currentImage || loading) return;
    setLoading(true);
    setDone(false);
    setError(null);
    try {
      await handleRetouchSkin();
      setDone(true);
    } catch (err) {
      setError(err?.message || "Không thể làm đẹp da");
      console.error("Retouch error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="tool-drawer">
      <div className="tool-name">
        <div />
        Làm đẹp da
        <button type="button" onClick={() => onClose?.()} className="icon-cancel">
          <FaTimes />
        </button>
      </div>
      <div className="splitter" />

      {!currentImage && (
        <p className="ie-empty-message">Chưa có ảnh để xử lý.</p>
      )}

      {done && (
        <div className="ie-feedback ie-feedback--success">
          Làm đẹp thành công!
        </div>
      )}
      {error && (
        <div className="ie-feedback ie-feedback--error">
          {error}
        </div>
      )}

      {currentImage && (
        <button
          type="button"
          className="box--basic"
          onClick={loading ? undefined : handleClick}
          style={{ cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
          disabled={loading}
        >
          {loading
            ? <><FaSpinner className="removebg-icon spinner" /> Đang xử lý…</>
            : <><MdFaceRetouchingNatural className="removebg-icon" /> Làm đẹp da cơ bản</>
          }
        </button>
      )}
    </section>
  );
}

export default Retouch;
