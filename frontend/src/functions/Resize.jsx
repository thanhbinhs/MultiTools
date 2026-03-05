// functions/Resize.jsx
import React, { useContext, useState, useEffect } from "react";
import { FaTimes, FaLock, FaLockOpen } from "react-icons/fa";
import { ImageContext } from "@/context/ImageContext";
import "../css/menuEditor.css";

const PRESETS = [
  { label: "Facebook post",     w: 1200, h: 900 },
  { label: "Instagram (1:1)",   w: 1080, h: 1080 },
  { label: "Story (9:16)",      w: 1080, h: 1920 },
  { label: "Twitter card",      w: 1200, h: 628 },
  { label: "YouTube thumbnail", w: 1280, h: 720 },
  { label: "Full HD",           w: 1920, h: 1080 },
  { label: "A4 (300 dpi)",      w: 2480, h: 3508 },
];

export default function Resize({ onClose }) {
  const { currentImage, handleResize } = useContext(ImageContext);

  const [width,      setWidth]      = useState(0);
  const [height,     setHeight]     = useState(0);
  const [origW,      setOrigW]      = useState(0);
  const [origH,      setOrigH]      = useState(0);
  const [locked,     setLocked]     = useState(true);   // aspect-ratio lock
  const [unit,       setUnit]       = useState("px");   // px | %
  const [loading,    setLoading]    = useState(false);

  // Read original image dimensions
  useEffect(() => {
    if (!currentImage) return;
    const img = new Image();
    img.onload = () => {
      setOrigW(img.width);
      setOrigH(img.height);
      setWidth(img.width);
      setHeight(img.height);
    };
    img.src = currentImage;
  }, [currentImage]);

  const ratio = origW && origH ? origW / origH : 1;

  const handleWidthChange = (val) => {
    const n = Math.max(1, Number(val));
    setWidth(n);
    if (locked) setHeight(unit === "%" ? n : Math.round(n / ratio));
  };

  const handleHeightChange = (val) => {
    const n = Math.max(1, Number(val));
    setHeight(n);
    if (locked) setWidth(unit === "%" ? n : Math.round(n * ratio));
  };

  const applyPreset = ({ w, h }) => {
    setLocked(false);
    setUnit("px");
    setWidth(w);
    setHeight(h);
  };

  const handleApply = async () => {
    if (!handleResize) return;
    setLoading(true);
    try {
      const finalW = unit === "%" ? Math.round((origW * width)  / 100) : width;
      const finalH = unit === "%" ? Math.round((origH * height) / 100) : height;
      const ok = await handleResize(finalW, finalH);
      if (ok !== false) onClose?.();
    } finally {
      setLoading(false);
    }
  };

  const displayW = unit === "%" ? (origW ? Math.round((width  / origW) * 100) : 100) : width;
  const displayH = unit === "%" ? (origH ? Math.round((height / origH) * 100) : 100) : height;

  return (
    <div className="tool-drawer">
      <div className="tool-name">
        <div />
        Thay đổi kích thước
        <button type="button" onClick={() => onClose?.()} className="icon-cancel">
          <FaTimes />
        </button>
      </div>
      <div className="splitter" />

      {!currentImage ? (
        <p className="ie-empty-message">Chưa có ảnh để thay đổi kích thước.</p>
      ) : (
        <>
          <div className="ie-panel-meta">
            Kích thước gốc: {origW} × {origH} px
          </div>

          <div className="ie-btn-row">
            {["px", "%"].map((u) => (
              <button
                key={u}
                type="button"
                className={`btn ${unit === u ? "btn--active" : ""}`}
                onClick={() => setUnit(u)}
                style={{ flex: 1 }}
              >
                {u}
              </button>
            ))}
          </div>

          <div className="ie-section">
            <div className="ie-size-grid">
              <div className="ie-field">
                <label>Chiều rộng ({unit})</label>
                <input
                  type="number"
                  value={displayW}
                  min={1}
                  onChange={(e) => handleWidthChange(
                    unit === "%" ? Math.round((origW * Number(e.target.value)) / 100) : e.target.value
                  )}
                />
              </div>

              <button
                type="button"
                onClick={() => setLocked((l) => !l)}
                title={locked ? "Khoá tỉ lệ" : "Bỏ khoá tỉ lệ"}
                className={`ie-lock-btn ${locked ? "locked" : ""}`}
              >
                {locked ? <FaLock /> : <FaLockOpen />}
              </button>

              <div className="ie-field">
                <label>Chiều cao ({unit})</label>
                <input
                  type="number"
                  value={displayH}
                  min={1}
                  onChange={(e) => handleHeightChange(
                    unit === "%" ? Math.round((origH * Number(e.target.value)) / 100) : e.target.value
                  )}
                />
              </div>
            </div>

            {unit === "%" && (
              <div className="ie-output-size">
                → {Math.round((origW * displayW) / 100)} × {Math.round((origH * displayH) / 100)} px
              </div>
            )}
          </div>

          <div className="ie-section">
            <div className="ie-panel-meta">Kích thước nhanh</div>
            <div className="ie-preset-grid">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="btn ie-preset-btn"
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                  <span>{p.w}×{p.h}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="bottom-content">
        <div className="action-btn">
          <button type="button" id="crop-action-cancel" onClick={() => onClose?.()}>Hủy</button>
          <button
            type="button"
            id="crop-action-apply"
            onClick={handleApply}
            disabled={loading || !currentImage || origW <= 0 || origH <= 0}
          >
            {loading ? "Đang xử lý…" : "Áp dụng"}
          </button>
        </div>
      </div>
    </div>
  );
}
