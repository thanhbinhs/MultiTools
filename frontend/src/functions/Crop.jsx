// functions/Crop.jsx
import React, { useContext, useEffect } from "react";
import { AiOutlineRotateLeft, AiOutlineRotateRight } from "react-icons/ai";
import { PiFlipHorizontalBold, PiFlipVerticalBold } from "react-icons/pi";
import { FaTimes } from "react-icons/fa";
import { ImageContext } from "@/context/ImageContext";
import "../css/menuEditor.css";

export default function Crop({ onClose }) {
  const {
    currentImage,
    cropBoxData,
    updateCropBoxData,
    resetCropBoxData,
    handleCrop,
    handleAspectRatioChange,
  } = useContext(ImageContext);

  const handleRotateLeft  = () => updateCropBoxData("rotate", cropBoxData.rotate - 90);
  const handleRotateRight = () => updateCropBoxData("rotate", cropBoxData.rotate + 90);
  const handleFlipH       = () => updateCropBoxData("flipHorizontal", !cropBoxData.flipHorizontal);
  const handleFlipV       = () => updateCropBoxData("flipVertical",   !cropBoxData.flipVertical);

  const handleAngleInput = (e) => {
    const v = Number(e.target.value);
    if (v >= -180 && v <= 180) updateCropBoxData("rotate", v);
  };

  const handleAspectRatio = (value) => updateCropBoxData("aspectRatio", value);

  const handleApply = () => {
    if (!currentImage) return;
    handleCrop();
    onClose?.();
  };

  const handleCancel = () => {
    resetCropBoxData();
    onClose?.();
  };

  useEffect(() => {
    if (cropBoxData.aspectRatio !== undefined) handleAspectRatioChange();
  }, [cropBoxData.aspectRatio, handleAspectRatioChange]);

  return (
    <section id="crop" className="tool-drawer">
      <div className="tool-name">
        <div />
        Cắt ảnh
        <button type="button" onClick={handleCancel} className="icon-cancel">
          <FaTimes />
        </button>
      </div>
      <div className="splitter" />

      {!currentImage && (
        <p className="ie-empty-message">Chưa có ảnh để cắt.</p>
      )}

      <div className="tool-content">
        <div className="tool-detail">

          <div className="group group1">
            <div className="split">
              <label>Chiều rộng</label>
              <input
                type="number"
                value={cropBoxData.width.toFixed(0)}
                onChange={(e) => updateCropBoxData("width", Number(e.target.value))}
              />
            </div>
            <div className="split">
              <label>Chiều cao</label>
              <input
                type="number"
                value={cropBoxData.height.toFixed(0)}
                onChange={(e) => updateCropBoxData("height", Number(e.target.value))}
              />
            </div>

            <div className="toggle-select-frame">
              <label className="select-label">Tỉ lệ mẫu</label>
              <div className="select">
                <select
                  id="select-frame-menu"
                  value={cropBoxData.aspectRatio ?? "0:0"}
                  onChange={(e) => handleAspectRatio(e.target.value)}
                >
                  <option value="0:0">Không (tự do)</option>
                  <optgroup label="Tỉ lệ cố định">
                    <option value="x:y">Gốc</option>
                    <option value="1:1">1:1 (Vuông)</option>
                    <option value="4:3">4:3</option>
                    <option value="3:4">3:4</option>
                    <option value="16:9">16:9 (Màn hình rộng)</option>
                    <option value="9:16">9:16 (Story)</option>
                    <option value="14:9">14:9</option>
                    <option value="16:10">16:10</option>
                    <option value="2:1">2:1</option>
                    <option value="3:1">3:1 (Toàn cảnh)</option>
                    <option value="21:9">21:9 (Điện ảnh)</option>
                    <option value="3:2">3:2 (35mm)</option>
                    <option value="5:4">5:4</option>
                  </optgroup>
                  <optgroup label="Mạng xã hội">
                    <option value="180:180">Avatar Facebook / Instagram</option>
                    <option value="851:315">Ảnh bìa Facebook</option>
                    <option value="1200:900">Bài đăng Facebook</option>
                    <option value="1080:1080">Ảnh vuông Instagram</option>
                    <option value="1080:1920">Story Instagram</option>
                    <option value="150:150">Avatar Twitter</option>
                    <option value="1500:500">Tiêu đề Twitter</option>
                    <option value="800:800">Avatar YouTube</option>
                    <option value="2560:1440">Kênh nghệ thuật YouTube</option>
                    <option value="1280:720">Thumbnail YouTube</option>
                  </optgroup>
                  <optgroup label="Kích thước ấn phẩm">
                    <option value="2480:3508">Giấy A4</option>
                    <option value="1748:2480">Giấy A5</option>
                    <option value="1920:1080">Full HD 1080p</option>
                    <option value="3840:2160">4K UHD</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          <div className="group group2">
            <label className="crop-rotate-label">Xoay và lật</label>
            <div className="rotation-slider-container">
              <input
                type="number"
                min="-180"
                max="180"
                value={cropBoxData.rotate}
                onChange={handleAngleInput}
                className="rotation-input"
              />
              <div className="rotation-slider-box">
                <span>−180</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={cropBoxData.rotate}
                  onChange={handleAngleInput}
                  className="rotation-slider"
                />
                <span>180</span>
              </div>
            </div>

            <ul className="crop-rotate-flip">
              {[
                { id: "rotate-left",     label: "Xoay trái",  icon: <AiOutlineRotateLeft />,  fn: handleRotateLeft  },
                { id: "rotate-right",    label: "Xoay phải",  icon: <AiOutlineRotateRight />, fn: handleRotateRight },
                { id: "flip-horizontal", label: "Lật ngang",  icon: <PiFlipHorizontalBold />, fn: handleFlipH       },
                { id: "flip-vertical",   label: "Lật dọc",    icon: <PiFlipVerticalBold />,   fn: handleFlipV       },
              ].map(({ id, label, icon, fn }) => (
                <li key={id} className="rotate-flip">
                  <label>{label}</label>
                  <button type="button" className="rotate-flip-icon" onClick={fn}>
                    {icon}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="bottom-content">
            <div className="action-btn">
              <button type="button" id="crop-action-cancel" onClick={handleCancel}>Hủy</button>
              <button type="button" id="crop-action-apply" onClick={handleApply} disabled={!currentImage}>
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
