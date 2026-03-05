// pages/image-editor.jsx  (or app/image-editor/page.jsx for App Router)
import React, { useState, useContext } from "react";
import Head from "next/head";
import "../app/globals.css";
import "../css/imageEditor.css";
import MenuEditor from "@/components/MenuEditor";
import FooterEditor from "@/components/FooterEditor";
import ImageDisplay from "@/components/ImageDisplay";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { ImageProvider, ImageContext } from "@/context/ImageContext";
import ImageUploader from "@/components/ImageUploader";
import { ZoomProvider } from "@/context/ZoomContext";
import { HiOutlineSparkles } from "react-icons/hi2";
import { FiMenu } from "react-icons/fi";

const MODE_LABELS = {
  crop: "Cắt ảnh",
  resize: "Thay đổi kích thước",
  removebg: "Xóa & đổi nền",
  adjust: "Điều chỉnh màu",
  filter: "Bộ lọc màu",
  retouch: "Làm đẹp da",
  paint: "Vẽ trực tiếp",
  "text-to-image": "Tạo ảnh AI",
};

// ─── Inner component (needs access to ImageContext for error banner) ──────────
function EditorContent() {
  const [mode, setMode] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { error, clearError } = useContext(ImageContext);

  const modeLabel = MODE_LABELS[mode] || "Chọn công cụ để bắt đầu";

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    if (nextMode) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className={`image-editor-shell ${mobileMenuOpen ? "ie-menu-open" : ""}`}>
      {/* Global error banner */}
      {error && (
        <div className="ie-error-banner" role="alert">
          <span className="ie-error-text">⚠ {error}</span>
          <button onClick={clearError} className="ie-error-close" aria-label="Đóng thông báo lỗi">Đóng</button>
        </div>
      )}

      {/* Main area */}
      <div className="ie-layout">
        <aside className="ie-sidebar-wrap">
          <MenuEditor onMode={handleModeChange} />
        </aside>

        <button
          type="button"
          className="ie-mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden={!mobileMenuOpen}
          tabIndex={mobileMenuOpen ? 0 : -1}
        />

        <main className="ie-canvas-wrap">
          <div className="ie-stage-header">
            <button
              type="button"
              className="ie-mobile-menu-btn"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Mở bảng công cụ"
            >
              <FiMenu />
              Công cụ
            </button>

            <div className="ie-stage-title">
              <h1>Image Studio</h1>
              <p>Thiết kế nhanh, chỉnh ảnh đẹp, xuất bản ngay.</p>
            </div>

            <div className={`ie-mode-chip ${mode ? "active" : ""}`}>
              <HiOutlineSparkles />
              {modeLabel}
            </div>
          </div>

          <div className="ie-canvas-body">
            <ImageDisplay mode={mode} />
          </div>
        </main>
      </div>

      {/* Footer */}
      <div className="ie-footer">
        <ImageUploader />
        <FooterEditor />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ImageEditorPage() {
  return (
    <>
      <Head>
        <title>MultiTools | Chỉnh sửa hình ảnh</title>
        <meta name="description" content="Công cụ chỉnh sửa hình ảnh trực tuyến" />
      </Head>
      <ZoomProvider>
        <ImageProvider>
          <EditorContent />
        </ImageProvider>
      </ZoomProvider>
    </>
  );
}
