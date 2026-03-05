// components/ImageDisplay.jsx
import React, { useRef, useContext, useEffect } from "react";
import { Cropper } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { ImageContext } from "@/context/ImageContext";
import { ZoomableContent } from "@/context/ZoomContext";
import { FaRegImages } from "react-icons/fa";

const CHECKERBOARD = {
  backgroundSize: "20px 20px",
  backgroundImage: `
    linear-gradient(45deg, #3a3a3a 25%, transparent 25%),
    linear-gradient(-45deg, #3a3a3a 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #3a3a3a 75%),
    linear-gradient(-45deg, transparent 75%, #3a3a3a 75%)
  `,
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
};

const ImageDisplay = ({ mode }) => {
  const {
    cropBoxData,
    cropperRef,
    currentImage,
    handleCropEnd,
    adjustmentData,
    setImageParameters,
    setDimensions,
    imageRef,
  } = useContext(ImageContext);

  const containerRef = useRef(null);

  // Update container dimensions on mount and resize
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [setDimensions]);

  // Update image position/size whenever image or mode changes
  useEffect(() => {
    if (!imageRef.current) return;

    const updateParams = () => {
      if (!imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      setImageParameters({
        width:  rect.width,
        height: rect.height,
        left:   rect.left + window.scrollX,
        top:    rect.top  + window.scrollY,
      });
    };

    if (imageRef.current.complete) {
      updateParams();
    } else {
      imageRef.current.onload = updateParams;
    }

    const mo = new MutationObserver(updateParams);
    mo.observe(imageRef.current, { attributes: true, attributeFilter: ["style", "width", "height"] });

    window.addEventListener("resize", updateParams);
    return () => {
      mo.disconnect();
      window.removeEventListener("resize", updateParams);
    };
  }, [currentImage, mode, imageRef, setImageParameters]);

  // Sync cropperjs with cropBoxData
  useEffect(() => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    cropper.setCropBoxData({ width: cropBoxData.width, height: cropBoxData.height });
    cropper.rotateTo(cropBoxData.rotate);
    cropper.scaleX(cropBoxData.flipHorizontal ? -1 : 1);
    cropper.scaleY(cropBoxData.flipVertical  ? -1 : 1);
  }, [cropBoxData, cropperRef]);

  const filterStyle = `
    brightness(${adjustmentData.brightness}%)
    saturate(${adjustmentData.saturation}%)
    contrast(${adjustmentData.contrast}%)
    hue-rotate(${adjustmentData.hue}deg)
    grayscale(${adjustmentData.grey_scale}%)
    sepia(${adjustmentData.sepia}%)
    invert(${adjustmentData.invert}%)
    blur(${adjustmentData.blur}px)
  `.trim();

  return (
    <div ref={containerRef} className="ie-canvas-stage">
      <div className="ie-checkerboard" style={CHECKERBOARD} />
      <div className="ie-canvas-glow" />

      {!currentImage && (
        <div className="ie-empty-state">
          <div className="ie-empty-icon">
            <FaRegImages />
          </div>
          <h3>Sẵn sàng cho bản chỉnh sửa mới</h3>
          <p>Thêm ảnh ở thanh dưới để bắt đầu cắt, lọc màu và thiết kế nhanh.</p>
        </div>
      )}

      {currentImage && mode === "crop" && (
        <div className="ie-crop-stage">
          <Cropper
            src={currentImage}
            style={{ maxHeight: "100%", maxWidth: "100%" }}
            className="ie-cropper"
            initialAspectRatio={NaN}
            guides={true}
            ref={cropperRef}
            background={false}
            cropend={handleCropEnd}
            viewMode={1}
            responsive={true}
            checkOrientation={false}
          />
        </div>
      )}

      {currentImage && mode === "paint" && (
        <div className="ie-image-viewport">
          <img
            ref={imageRef}
            src={currentImage}
            alt="Editing canvas"
            className="ie-main-image"
            style={{ filter: filterStyle }}
            draggable={false}
          />
        </div>
      )}

      {currentImage && mode !== "crop" && mode !== "paint" && (
        <div className="ie-image-viewport">
          <ZoomableContent>
            <img
              ref={imageRef}
              src={currentImage}
              alt="Editing canvas"
              className="ie-main-image"
              style={{ filter: filterStyle }}
              draggable={false}
            />
          </ZoomableContent>
        </div>
      )}
    </div>
  );
};

export default ImageDisplay;
