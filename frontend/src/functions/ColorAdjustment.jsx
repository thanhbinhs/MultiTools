import React, { useState, useContext } from "react";
import { FaMagic, FaMoon, FaSun, FaTimes } from "react-icons/fa";
import "../css/menuEditor.css"; // Import file CSS để tạo style
import { ImageContext } from "@/context/ImageContext";

const ColorAdjustment = () => {
  const {
    adjustmentData,
    updateAdjustmentData,
    resetAdjustmentData,
    handleAdjustment,
  } = useContext(ImageContext);

  const setBrightness = (value) => updateAdjustmentData("brightness", value);
  const setSaturation = (value) => updateAdjustmentData("saturation", value);
  const setContrast = (value) => updateAdjustmentData("contrast", value);
  const setHue = (value) => updateAdjustmentData("hue", value);
  const setGreyScale = (value) => updateAdjustmentData("grey_scale", value);

  const autoAdjust = () => {
    // Ví dụ các giá trị tự động có thể là những giá trị đã được thử nghiệm
    const autoBrightness = 120; // Tăng độ sáng lên một mức
    const autoContrast = 110; // Tăng độ tương phản nhẹ
    const autoSaturation = 115; // Tăng độ bão hòa màu nhẹ
    const grayscale = 0; // Không chuyển sang màu xám

    // Cập nhật các giá trị điều chỉnh vào adjustmentData
    updateAdjustmentData("brightness", autoBrightness);
    updateAdjustmentData("contrast", autoContrast);
    updateAdjustmentData("saturation", autoSaturation);
    updateAdjustmentData("grey_scale", grayscale);
  };

  const toggleGrayscale = () => {
    const newGrayscale = adjustmentData.grey_scale >= 50 ? 0 : 100;

    // Cập nhật giá trị grayscale trong adjustmentData
    updateAdjustmentData("grey_scale", newGrayscale);
  };

  const popImage = () => {
    // Tăng cường các giá trị để làm nổi bật hình ảnh
    const popBrightness = 150; // Tăng độ sáng lên
    const popContrast = 120; // Tăng độ tương phản lên
    const popSaturation = 125; // Tăng độ bão hòa màu
    const grey_scale = 0; // Không chuyển sang màu xám

    // Cập nhật các giá trị đã tăng cường
    updateAdjustmentData("brightness", popBrightness);
    updateAdjustmentData("contrast", popContrast);
    updateAdjustmentData("saturation", popSaturation);
    updateAdjustmentData("grey_scale", grey_scale);
  };

  return (
    <div className="tool-drawer">
      <div className="tool-name">
        <div></div>
        Điều chỉnh màu
        <button onClick={{}} className="icon-cancel" id="icon-cancel">
          <FaTimes />
        </button>
      </div>
      <div className="splitter"></div>
      <div className="box--basic">
        <button className="btn" onClick={() => autoAdjust()}>
          <FaMagic /> Tự động
        </button>
        <button className="btn" onClick={() => toggleGrayscale()}>
          <FaMoon /> Trắng Đen
        </button>
        <button className="btn" onClick={() => popImage()}>
          <FaSun /> Bật ra
        </button>
      </div>

      <div className="box--basic slider-section">
        <h4 className="box__header">Màu</h4>

        <div className="slider-group">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label>Độ sáng</label>
            <label>{adjustmentData.brightness}</label>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            value={adjustmentData.brightness}
            onChange={(e) => setBrightness(e.target.value)}
            className="slider__balance"
          />
        </div>

        <div className="slider-group">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label>Độ tương phản</label>
            <label>{adjustmentData.saturation}</label>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            value={adjustmentData.saturation}
            onChange={(e) => setSaturation(e.target.value)}
          />
        </div>

        <div className="slider-group">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label>Độ bão hòa màu</label>
            <label>{adjustmentData.contrast}</label>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            value={adjustmentData.contrast}
            onChange={(e) => setContrast(e.target.value)}
          />
        </div>

        <div className="slider-group">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label>Sắc độ</label>
            <label>{adjustmentData.hue}</label>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={adjustmentData.hue}
            onChange={(e) => setHue(e.target.value)}
          />
        </div>

        <div className="slider-group">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label>Thang màu xám</label>
            <label>{adjustmentData.grey_scale}</label>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={adjustmentData.grey_scale}
            onChange={(e) => setGreyScale(e.target.value)}
          />
        </div>
      </div>

      <div className="bottom-content">
        <div className="action-btn">
          <button id="crop-action-cancel" onClick={resetAdjustmentData}>
            Hủy
          </button>
          <button id="crop-action-apply" onClick={handleAdjustment}>
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorAdjustment;