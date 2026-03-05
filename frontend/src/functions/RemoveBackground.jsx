// functions/RemoveBackground.jsx
import React, { useContext, useEffect, useState, useRef } from "react";
import Image from "next/image";
import { ImageContext } from "@/context/ImageContext";
import "../css/menuEditor.css";
import { FaRobot, FaTimes, FaSpinner, FaUpload } from "react-icons/fa";
import { MdColorLens, MdImage } from "react-icons/md";

// ─── Preset colors ────────────────────────────────────────────────────────────
const PRESET_COLORS = [
  "#ffffff", "#000000", "#f5f5f5", "#1a1a2e",
  "#e8f4f8", "#fef9e7", "#fdf2f8", "#e8f8f5",
  "#2c3e50", "#e74c3c", "#3498db", "#2ecc71",
];

export default function RemoveBackground({ onClose }) {
  const { handleRemoveBackground, handleChangeBackground, currentImage } =
    useContext(ImageContext);

  // ── Loading states (separate so buttons don't block each other) ────────────
  const [loadingRemove, setLoadingRemove] = useState(false);
  const [loadingApply,  setLoadingApply]  = useState(false);

  // ── Feedback ───────────────────────────────────────────────────────────────
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(null);

  // ── Background options ─────────────────────────────────────────────────────
  const [bgType,     setBgType]     = useState("color");   // 'color' | 'image' | 'transparent'
  const [bgColor,    setBgColor]    = useState("#ffffff");
  const [bgImageB64, setBgImageB64] = useState(null);      // base64 data-URL
  const [bgImageName,setBgImageName]= useState("");

  const fileInputRef = useRef(null);
  const skipResetOnNextImageChangeRef = useRef(false);

  // ── Step indicator: has the user removed the background yet? ──────────────
  const [bgRemoved, setBgRemoved] = useState(false);

  const resetPanelState = () => {
    setBgRemoved(false);
    setBgType("color");
    setBgColor("#ffffff");
    setError(null);
    setSuccess(null);
    setBgImageB64(null);
    setBgImageName("");
  };

  const metaText = (meta) => {
    if (!meta || !meta.width || !meta.height) return "";
    return `${meta.width}×${meta.height}px`;
  };

  useEffect(() => {
    if (!currentImage) {
      resetPanelState();
      return;
    }
    if (skipResetOnNextImageChangeRef.current) {
      skipResetOnNextImageChangeRef.current = false;
      return;
    }
    // External image switch: reset panel state for a clean new session.
    resetPanelState();
  }, [currentImage]);

  // ── Remove background ──────────────────────────────────────────────────────
  const handleClickRemove = async () => {
    if (!currentImage) { setError("Chưa có ảnh để xử lý"); return; }
    setLoadingRemove(true);
    setError(null);
    setSuccess(null);
    try {
      skipResetOnNextImageChangeRef.current = true;
      const result = await handleRemoveBackground();
      setBgRemoved(true);
      const sizeInfo = metaText(result?.meta);
      setSuccess(
        sizeInfo
          ? `Xóa nền thành công (${sizeInfo}). Bạn có thể đặt nền mới bên dưới.`
          : "Xóa nền thành công! Bạn có thể đặt nền mới bên dưới."
      );
    } catch (err) {
      skipResetOnNextImageChangeRef.current = false;
      setError("Xóa nền thất bại: " + (err.message || "Lỗi không xác định"));
    } finally {
      setLoadingRemove(false);
    }
  };

  // ── Apply new background ───────────────────────────────────────────────────
  const handleApplyBackground = async () => {
    if (!currentImage) { setError("Chưa có ảnh để xử lý"); return; }

    let type, value;

    if (bgType === "transparent") {
      type = "transparent";
      value = "transparent";
    } else if (bgType === "color") {
      type  = "color";
      value = bgColor;
    } else {
      if (!bgImageB64) { setError("Vui lòng chọn ảnh nền"); return; }
      type  = "image";
      value = bgImageB64;
    }

    setLoadingApply(true);
    setError(null);
    setSuccess(null);
    try {
      skipResetOnNextImageChangeRef.current = true;
      const result = await handleChangeBackground(type, value);
      setBgRemoved(true);
      const sizeInfo = metaText(result?.meta);
      const prefix =
        type === "transparent"
          ? "Đã áp dụng nền trong suốt."
          : "Đổi nền thành công!";
      setSuccess(sizeInfo ? `${prefix} Kích thước: ${sizeInfo}.` : prefix);
    } catch (err) {
      skipResetOnNextImageChangeRef.current = false;
      setError("Đổi nền thất bại: " + (err.message || "Lỗi không xác định"));
    } finally {
      setLoadingApply(false);
    }
  };

  // ── File → base64 ──────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload  = () => {
      setBgImageB64(reader.result);
      setBgImageName(file.name);
    };
    reader.onerror = () => setError("Không thể đọc tệp ảnh");
    reader.readAsDataURL(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  const handleCancel = () => {
    setError(null);
    setSuccess(null);
    onClose?.();
  };

  const anyLoading = loadingRemove || loadingApply;

  return (
    <section className="tool-drawer">
      {/* Header */}
      <div className="tool-name">
        <div />
        Xóa &amp; Đổi nền
        <button type="button" onClick={handleCancel} className="icon-cancel">
          <FaTimes />
        </button>
      </div>
      <div className="splitter" />

      {/* No image warning */}
      {!currentImage && (
        <div className="ie-empty-message">
          Chưa có ảnh — vui lòng thêm ảnh trước.
        </div>
      )}

      {/* Feedback messages */}
      {error && (
        <div className="ie-feedback ie-feedback--error">
          ⚠ {error}
        </div>
      )}
      {success && (
        <div className="ie-feedback ie-feedback--success">
          ✓ {success}
        </div>
      )}

      {/* ── Step 1: Remove background ─────────────────────────────────────── */}
      <div className="ie-section ie-section-tight">
        <div className="ie-step-title">
          Bước 1 — Xóa nền {bgRemoved ? "✓" : ""}
        </div>
        <div
          className="box--basic"
          onClick={!anyLoading ? handleClickRemove : undefined}
          style={{ cursor: anyLoading ? "not-allowed" : "pointer", opacity: anyLoading ? 0.6 : 1 }}
        >
          {loadingRemove
            ? <><FaSpinner className="removebg-icon spinner" /> Đang xử lý…</>
            : <><FaRobot className="removebg-icon" /> Xóa nền tự động (AI)</>
          }
        </div>
      </div>

      <div className="ie-divider" />

      {/* ── Step 2: Set new background ────────────────────────────────────── */}
      <div className="ie-section ie-section-tight">
        <div className="ie-step-title">
          Bước 2 — Chọn nền mới (tuỳ chọn)
        </div>
        {!bgRemoved && (
          <div className="ie-inline-note">
            Gợi ý: xóa nền ở bước 1 trước để kết quả đổi nền đẹp hơn.
          </div>
        )}

        {/* Tab selector */}
        <div className="ie-tab-row">
          <button
            type="button"
            className={`ie-tab-btn ${bgType === "transparent" ? "active" : ""}`}
            onClick={() => setBgType("transparent")}
          >
            ◻ Trong suốt
          </button>
          <button
            type="button"
            className={`ie-tab-btn ${bgType === "color" ? "active" : ""}`}
            onClick={() => setBgType("color")}
          >
            <MdColorLens /> Màu sắc
          </button>
          <button
            type="button"
            className={`ie-tab-btn ${bgType === "image" ? "active" : ""}`}
            onClick={() => setBgType("image")}
          >
            <MdImage /> Ảnh nền
          </button>
        </div>

        {/* Transparent info */}
        {bgType === "transparent" && (
          <div className="ie-inline-note">
            Ảnh sẽ có nền trong suốt (PNG). Nhấn <strong style={{ color: "#ccc" }}>Áp dụng</strong> để lưu.
          </div>
        )}

        {/* Color picker */}
        {bgType === "color" && (
          <div>
            {/* Preset swatches */}
            <div className="ie-swatch-grid">
              {PRESET_COLORS.map((c) => (
                <div
                  key={c}
                  onClick={() => setBgColor(c)}
                  title={c}
                  style={{
                    width:        26,
                    height:       26,
                    borderRadius: 4,
                    background:   c,
                    cursor:       "pointer",
                    border:       bgColor === c ? "2px solid #4a9eff" : "2px solid #555",
                    transition:   "border 0.1s",
                    flexShrink:   0,
                  }}
                />
              ))}
            </div>

            {/* Custom color */}
            <div className="ie-color-row">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                style={{ width: 36, height: 36, border: "none", background: "none", cursor: "pointer", padding: 0 }}
              />
              <div style={{
                flex: 1, height: 36, borderRadius: 6,
                background: bgColor,
                border: "1px solid #555",
              }} />
              <span className="ie-color-code">{bgColor}</span>
            </div>
          </div>
        )}

        {/* Image picker */}
        {bgType === "image" && (
          <div>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border:       "1px dashed #555",
                borderRadius: 6,
                padding:      "12px",
                cursor:       "pointer",
                textAlign:    "center",
                color:        "#888",
                fontSize:     13,
                transition:   "border-color 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "#4a9eff"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "#555"}
            >
              {bgImageB64 ? (
                <div>
                  <Image
                    src={bgImageB64}
                    alt="Ảnh nền"
                    width={260}
                    height={100}
                    unoptimized
                    style={{ maxHeight: 100, maxWidth: "100%", borderRadius: 4, objectFit: "cover", width: "100%", height: "auto" }}
                  />
                  <div style={{ marginTop: 4, fontSize: 11 }}>{bgImageName}</div>
                </div>
              ) : (
                <>
                  <FaUpload style={{ fontSize: 20, marginBottom: 6, display: "block", margin: "0 auto 6px" }} />
                  Nhấn để chọn ảnh nền
                  <div style={{ fontSize: 11, marginTop: 2 }}>PNG, JPG, WEBP…</div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            {bgImageB64 && (
              <button
                type="button"
                onClick={() => { setBgImageB64(null); setBgImageName(""); }}
                style={{
                  marginTop: 6, background: "none", border: "1px solid #555",
                  borderRadius: 4, color: "#aaa", cursor: "pointer",
                  fontSize: 11, padding: "3px 8px", width: "100%",
                }}
              >
                × Xóa ảnh đã chọn
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div className="bottom-content">
        <div className="action-btn">
          <button type="button" id="crop-action-cancel" onClick={handleCancel}>
            Hủy
          </button>
          <button
            type="button"
            id="crop-action-apply"
            onClick={handleApplyBackground}
            disabled={anyLoading || !currentImage}
            style={loadingApply ? { display: "flex", alignItems: "center", gap: 6 } : {}}
          >
            {loadingApply
              ? <><FaSpinner className="spinner" /> Đang xử lý…</>
              : "Áp dụng nền"
            }
          </button>
        </div>
      </div>
    </section>
  );
}
