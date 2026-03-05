// functions/TextToImage.jsx
import React, { useContext, useState, useRef } from "react";
import { FaSpinner, FaTimes } from "react-icons/fa";
import { MdOutlineGeneratingTokens } from "react-icons/md";
import { ImageContext } from "@/context/ImageContext";
import "../css/menuEditor.css";

const MAX_CHARS = 500;

export default function TextToImage({ onClose }) {
  const { handleTextToImage } = useContext(ImageContext);
  const [text,    setText]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(false);
  const textareaRef = useRef(null);

  const generate = async () => {
    if (!text.trim()) { setError("Vui lòng nhập mô tả ảnh"); return; }
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await handleTextToImage(text.trim());
      setSuccess(true);
      setText("");
    } catch (err) {
      setError(err?.message || "Tạo ảnh thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) generate();
  };

  return (
    <section className="tool-drawer">
      <div className="tool-name">
        <div />
        Tạo ảnh AI
        <button type="button" onClick={() => onClose?.()} className="icon-cancel" aria-label="Đóng công cụ">
          <FaTimes />
        </button>
      </div>
      <div className="splitter" />

      <div className="ie-section">
        <div className="ie-panel-meta">
          Mô tả hình ảnh bạn muốn tạo (tiếng Anh cho kết quả tốt nhất):
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS) setText(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="e.g. a sunset over a mountain range, cinematic lighting…"
          rows={5}
          className="ie-textarea"
        />

        <div className="ie-textarea-meta">
          <span>Ctrl+Enter để tạo</span>
          <span className={text.length > MAX_CHARS * 0.9 ? "warning" : ""}>
            {text.length}/{MAX_CHARS}
          </span>
        </div>

        {error && (
          <div className="ie-feedback ie-feedback--error">
            {error}
          </div>
        )}
        {success && (
          <div className="ie-feedback ie-feedback--success">
            Tạo ảnh thành công! Ảnh đã được thêm vào canvas.
          </div>
        )}
      </div>

      <div
        className="box--basic"
        onClick={loading ? undefined : generate}
        style={{ cursor: loading ? "not-allowed" : "pointer", margin: "0 12px", opacity: loading ? 0.7 : 1 }}
        role="button"
        aria-disabled={loading}
      >
        {loading
          ? <><FaSpinner className="removebg-icon spinner" /> Đang tạo ảnh…</>
          : <><MdOutlineGeneratingTokens className="removebg-icon" /> Tạo hình ảnh</>
        }
      </div>

      <div className="ie-powered-by">
        Powered by Stable Diffusion XL via NVIDIA API
      </div>
    </section>
  );
}
