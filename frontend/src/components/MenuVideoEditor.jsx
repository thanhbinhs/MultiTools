import React, { useContext, useState } from 'react';
import {
  FaHome,
} from 'react-icons/fa';
import {
  HiAdjustmentsHorizontal,
} from 'react-icons/hi2';
import {
  MdContentCut,
  MdSubtitles,
} from 'react-icons/md';
import '../css/menuEditor.css';
import { VideoContext } from '@/context/VideoContext';
import AddSubtitles from '@/functions/AddSubtitles';
import TrimVideo from '@/functions/TrimVideo';
import FilterVideo from '@/functions/FilterVideo';

const menuItems = [
  { id: 'filters', name: 'Bộ lọc', icon: <HiAdjustmentsHorizontal /> },
  { id: 'trim', name: 'Cắt video', icon: <MdContentCut /> },
  { id: 'subtitles', name: 'Thêm phụ đề', icon: <MdSubtitles /> },
];

export default function MenuVideoEditor({ onMode }) {
  const [selectedMenu, setSelectedMenu] = useState('filters');
  const [hoveredItem, setHoveredItem] = useState(null);
  const { setMode } = useContext(VideoContext);

  const handleMenuClick = (menuId) => {
    setSelectedMenu(menuId);
    onMode?.(menuId);
    setMode(menuId);
  };

  return (
    <section id="menu-bar">
      <div className="menu-left">
        <div className="toggle-home" id="toggle-home">
          <div
            id="toggle-home-box"
            className="toggle-home-box"
            onMouseEnter={() => setHoveredItem('home')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => {
              window.location.href = '/';
            }}
          >
            <FaHome id="home-icon" className="home-icon" />
            <span id="home-span" className="home-span">
              Trang chủ
            </span>
          </div>
        </div>

        <div className="splitter"></div>
        <ul id="tool-menu" className="tool-menu">
          {menuItems.map((item) => (
            <li
              key={item.id}
              data={item.id}
              id={`menu-item-${item.id}`}
              className={`menu-item-box ${
                hoveredItem === item.id ? 'hovered' : ''
              } ${selectedMenu === item.id ? 'active' : ''}`}
              onClick={() => handleMenuClick(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="menu-item-icon">{item.icon}</div>
              <span className="menu-item-span">{item.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="menu-right">
        {selectedMenu === "filters" && <FilterVideo />}
        {selectedMenu === "trim" && <TrimVideo />}
        {selectedMenu === "subtitles" && <AddSubtitles />}
      </div>
    </section>
  );
}
