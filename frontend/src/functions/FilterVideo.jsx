// functions/FilterVideo.jsx
import React, { useContext } from "react";
import { FaMagic, FaMoon, FaSun, FaTimes } from "react-icons/fa";
import { FaSpinner } from "react-icons/fa6";
import "../css/menuEditor.css";
import { VideoContext } from "@/context/VideoContext";

const SliderRow = ({ label, value, min, max, onChange }) => (
  <div className="slider-group">
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
      <label>{label}</label>
      <label style={{ fontVariantNumeric: "tabular-nums", minWidth: 36, textAlign: "right" }}>
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

const FilterVideo = ({ onClose }) => {
  const {
    adjustmentData,
    updateAdjustmentData,
    resetAdjustmentData,
    handleAdjustment,
    isProcessing,
  } = useContext(VideoContext);

  const set = (key) => (val) => updateAdjustmentData(key, val);

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

  return (
    <div className="tool-drawer">
      <div className="tool-name">
        <div />
        Điều chỉnh màu video
        <button onClick={handleCancel} className="icon-cancel" id="icon-cancel">
          <FaTimes />
        </button>
      </div>
      <div className="splitter" />

      <div className="box__option">
        <button className="btn" onClick={autoAdjust}>
          <FaMagic /> Tự động
        </button>
        <button className="btn" onClick={toggleGrayscale}>
          <FaMoon /> Trắng Đen
        </button>
        <button className="btn" onClick={popImage}>
          <FaSun /> Bật nổi
        </button>
      </div>

      <div className="box--basic slider-section">
        <h4 className="box__header">Màu sắc</h4>

        <SliderRow label="Độ sáng"        value={adjustmentData.brightness} min={0}    max={200} onChange={set("brightness")} />
        <SliderRow label="Độ tương phản"  value={adjustmentData.contrast}   min={0}    max={200} onChange={set("contrast")} />   {/* fixed swap */}
        <SliderRow label="Độ bão hòa màu" value={adjustmentData.saturation} min={0}    max={200} onChange={set("saturation")} /> {/* fixed swap */}
        <SliderRow label="Sắc độ (Hue)"   value={adjustmentData.hue}        min={-180} max={180} onChange={set("hue")} />
        <SliderRow label="Thang xám"      value={adjustmentData.grey_scale} min={0}    max={100} onChange={set("grey_scale")} />
        <SliderRow label="Cổ điển (Sepia)" value={adjustmentData.sepia}     min={0}    max={100} onChange={set("sepia")} />
        <SliderRow label="Đảo ngược màu"  value={adjustmentData.invert}     min={0}    max={100} onChange={set("invert")} />
        <SliderRow label="Làm mờ (Blur)"  value={adjustmentData.blur}       min={0}    max={20}  onChange={set("blur")} />
      </div>

      <div className="bottom-content">
        <div className="action-btn">
          <button id="filter-action-cancel" onClick={handleCancel}>
            Hủy
          </button>
          <button
            id="filter-action-apply"
            onClick={handleAdjustment}
            disabled={isProcessing}
            style={isProcessing ? { display: "flex", justifyContent: "center", alignItems: "center", gap: 6 } : {}}
          >
            {isProcessing ? <><FaSpinner className="spinner" /> Đang xử lý…</> : "Áp dụng"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterVideo;