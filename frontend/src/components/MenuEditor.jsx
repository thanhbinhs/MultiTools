// components/MenuEditor.jsx
import React, { useContext, useState } from "react";
import {
  FaHome, FaCrop, FaPaintBrush,
} from "react-icons/fa";
import { RiColorFilterLine } from "react-icons/ri";
import { HiAdjustmentsHorizontal } from "react-icons/hi2";
import { MdFaceRetouchingNatural, MdPhotoSizeSelectLarge, MdOutlineGeneratingTokens } from "react-icons/md";
import { TbBackground } from "react-icons/tb";
import "../css/menuEditor.css";

import Crop            from "@/functions/Crop";
import RemoveBackground from "@/functions/RemoveBackground";
import ColorAdjustment from "@/functions/ColorAdjustment";
import Paint           from "@/functions/Paint";
import ColorFilter     from "@/functions/ColorFilter";
import Retouch         from "@/functions/Retouch";
import TextToImage     from "@/functions/TextToImage";
import Resize          from "@/functions/Resize";
import { ImageContext } from "@/context/ImageContext";

const MENU_ITEMS = [
  { id: "crop",         label: "Cắt ảnh",       icon: <FaCrop /> },
  { id: "resize",       label: "Thay đổi kích thước", icon: <MdPhotoSizeSelectLarge /> },
  { id: "removebg",     label: "Xóa nền",        icon: <TbBackground /> },
  { id: "adjust",       label: "Điều chỉnh màu", icon: <HiAdjustmentsHorizontal /> },
  { id: "filter",       label: "Bộ lọc",         icon: <RiColorFilterLine /> },
  { id: "retouch",      label: "Làm đẹp da",     icon: <MdFaceRetouchingNatural /> },
  { id: "paint",        label: "Vẽ",             icon: <FaPaintBrush /> },
  { id: "text-to-image",label: "Tạo ảnh AI",     icon: <MdOutlineGeneratingTokens /> },
];

export default function MenuEditor({ onMode }) {
  const [selected, setSelected] = useState(null);
  const { setModeE } = useContext(ImageContext);

  const handleSelect = (id) => {
    const next = selected === id ? null : id;
    setSelected(next);
    onMode?.(next ?? "");
    setModeE(next ?? "");
  };

  const handleClose = () => {
    setSelected(null);
    onMode?.("");
    setModeE("");
  };

  const closeProps = { onClose: handleClose };

  return (
    <section id="menu-bar">
      <div className="menu-left">
        <div className="toggle-home">
          <button
            type="button"
            className="toggle-home-box"
            onClick={() => (window.location.href = "/")}
            aria-label="Về trang chủ"
          >
            <FaHome className="home-icon" />
            <span className="home-span">Trang chủ</span>
          </button>
        </div>
        <div className="splitter" />

        <ul className="tool-menu">
          {MENU_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={["menu-item-box", selected === item.id ? "active" : ""].join(" ")}
                onClick={() => handleSelect(item.id)}
                title={item.label}
                aria-label={item.label}
              >
                <span className="menu-item-icon">{item.icon}</span>
                <span className="menu-item-span">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="menu-side-note">
          <span>Image Tools</span>
          <small>{MENU_ITEMS.length} công cụ</small>
        </div>
      </div>

      {selected && (
        <div className="menu-right">
          {selected === "crop"          && <Crop            {...closeProps} />}
          {selected === "resize"        && <Resize          {...closeProps} />}
          {selected === "removebg"      && <RemoveBackground {...closeProps} />}
          {selected === "adjust"        && <ColorAdjustment  {...closeProps} />}
          {selected === "filter"        && <ColorFilter       {...closeProps} />}
          {selected === "retouch"       && <Retouch           {...closeProps} />}
          {selected === "paint"         && <Paint             {...closeProps} />}
          {selected === "text-to-image" && <TextToImage       {...closeProps} />}
        </div>
      )}
    </section>
  );
}
