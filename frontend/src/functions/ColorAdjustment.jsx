// functions/ColorAdjustment.jsx
import React, { useContext, useState } from "react";
import { FaMagic, FaMoon, FaSun, FaTimes } from "react-icons/fa";
import "../css/menuEditor.css";
import { ImageContext } from "@/context/ImageContext";

// ── Slider row helper ─────────────────────────────────────────────────────────
const SliderRow = ({ label, value, min, max, onChange }) => (
  <div className="slider-group ie-slider-group">
    <div className="ie-slider-head">
      <label>{label}</label>
      <label className="ie-slider-value">
        {Number(value).toFixed(0)}
      </label>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="slider__balance"
    />
  </div>
);

const ColorAdjustment = ({ onClose }) => {
  const {
    currentImage,
    adjustmentData,
    updateAdjustmentData,
    resetAdjustmentData,
    handleAdjustment,
  } = useContext(ImageContext);
  const [applying, setApplying] = useState(false);

  const set = (key) => (val) => updateAdjustmentData(key, val);

  // ── Presets ─────────────────────────────────────────────────────────────────
  const autoAdjust = () => {
    updateAdjustmentData("brightness", 115);
    updateAdjustmentData("contrast",   108);
    updateAdjustmentData("saturation", 112);
    updateAdjustmentData("grey_scale", 0);
  };

  const toggleGrayscale = () =>
    updateAdjustmentData("grey_scale", adjustmentData.grey_scale >= 50 ? 0 : 100);

  const popImage = () => {
    updateAdjustmentData("brightness", 115);
    updateAdjustmentData("contrast",   125);
    updateAdjustmentData("saturation", 130);
    updateAdjustmentData("grey_scale", 0);
  };

  const handleCancel = () => {
    resetAdjustmentData();
    onClose?.();
  };

  const handleApply = async () => {
    if (!currentImage || applying) return;
    setApplying(true);
    try {
      await handleAdjustment();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="tool-drawer">
      <div className="tool-name">
        <div />
        Điều chỉnh màu
        <button type="button" onClick={handleCancel} className="icon-cancel" id="icon-cancel">
          <FaTimes />
        </button>
      </div>
      <div className="splitter" />

      {!currentImage && (
        <p className="ie-empty-message">Chưa có ảnh để điều chỉnh màu.</p>
      )}

      <div className="box__option ie-quick-actions">
        <button type="button" className="btn" onClick={autoAdjust} disabled={!currentImage || applying}>
          <FaMagic /> Tự động
        </button>
        <button type="button" className="btn" onClick={toggleGrayscale} disabled={!currentImage || applying}>
          <FaMoon /> Trắng Đen
        </button>
        <button type="button" className="btn" onClick={popImage} disabled={!currentImage || applying}>
          <FaSun /> Bật nổi
        </button>
      </div>

      <div className="box--basic slider-section">
        <h4 className="box__header">Màu sắc</h4>

        <SliderRow
          label="Độ sáng"
          value={adjustmentData.brightness}
          min={0} max={200}
          onChange={set("brightness")}
        />
        <SliderRow
          label="Độ tương phản"
          value={adjustmentData.contrast}      
          min={0} max={200}
          onChange={set("contrast")}          
        />
        <SliderRow
          label="Độ bão hòa màu"
          value={adjustmentData.saturation}    
          min={0} max={200}
          onChange={set("saturation")}        
        />
        <SliderRow
          label="Sắc độ (Hue)"
          value={adjustmentData.hue}
          min={-180} max={180}
          onChange={set("hue")}
        />
        <SliderRow
          label="Thang xám"
          value={adjustmentData.grey_scale}
          min={0} max={100}
          onChange={set("grey_scale")}
        />
        <SliderRow
          label="Cổ điển (Sepia)"
          value={adjustmentData.sepia}
          min={0} max={100}
          onChange={set("sepia")}
        />
        <SliderRow
          label="Đảo ngược màu"
          value={adjustmentData.invert}
          min={0} max={100}
          onChange={set("invert")}
        />
        <SliderRow
          label="Làm mờ (Blur)"
          value={adjustmentData.blur}
          min={0} max={20}
          onChange={set("blur")}
        />
      </div>

      <div className="bottom-content">
        <div className="action-btn">
          <button type="button" id="crop-action-cancel" onClick={handleCancel} disabled={applying}>
            Hủy
          </button>
          <button type="button" id="crop-action-apply" onClick={handleApply} disabled={!currentImage || applying}>
            {applying ? "Đang áp dụng…" : "Áp dụng"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorAdjustment;
