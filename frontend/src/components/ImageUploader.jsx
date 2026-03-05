// components/ImageUploader.jsx
import React, { useContext, useRef, useState } from "react";
import { ImageContext } from "@/context/ImageContext";

const ACCEPT = "image/*";

export default function ImageUploader() {
  const { setInitialImage } = useContext(ImageContext);
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const loadFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setInitialImage(url);
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    // Reset input so the same file can be re-uploaded
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true);  };
  const handleDragLeave = ()    => setDragging(false);

  return (
    <div
      className={`ie-uploader ${dragging ? "is-dragging" : ""}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <label
        htmlFor="image-upload"
        className="ie-upload-trigger"
      >
        <i className="fa-regular fa-image" />
        <span>{dragging ? "Thả ảnh vào đây" : "Thêm ảnh"}</span>
        <small>Kéo thả hoặc chọn từ máy</small>
      </label>
      <input
        ref={inputRef}
        type="file"
        id="image-upload"
        accept={ACCEPT}
        onChange={handleChange}
        style={{ display: "none" }}
      />
    </div>
  );
}
