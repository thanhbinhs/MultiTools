// components/MenuAudioEditor.jsx
import React, { useState, useContext } from 'react';
import { FaHome } from 'react-icons/fa';
import { HiAdjustmentsHorizontal, HiEnvelope } from 'react-icons/hi2';
import { SiAudioboom } from 'react-icons/si';
import { AudioContext } from '@/context/AudioContext';
import RegionsAudio from '@/functions/RegionsAudio';

const menuItems = [
  { id: 'filters',  name: 'Bộ lọc',                icon: <HiAdjustmentsHorizontal />, desc: 'EQ & hiệu ứng' },
  { id: 'envelop',  name: 'Kiểm soát âm thanh',    icon: <HiEnvelope />,               desc: 'Envelope & fade' },
  { id: 'region',   name: 'Vùng âm thanh',          icon: <SiAudioboom />,              desc: 'Cắt & loop' },
];

const styles = {
  sidebar: {
    display: 'flex',
    height: '100%',
    backgroundColor: '#111113',
    fontFamily: "'Syne', sans-serif",
  },
  navRail: {
    width: '220px',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    padding: '0',
    flexShrink: 0,
  },
  logoArea: {
    padding: '18px 16px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  logoText: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: '15px',
    color: '#f59e0b',
    letterSpacing: '-0.3px',
    lineHeight: 1,
    marginBottom: '2px',
  },
  logoSub: {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    color: 'rgba(156,163,175,0.45)',
  },
  homeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '11px 16px',
    margin: '10px 10px 4px',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'rgba(156,163,175,0.65)',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all 0.2s',
    border: '1px solid transparent',
  },
  sectionLabel: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    color: 'rgba(156,163,175,0.35)',
    padding: '16px 16px 6px',
  },
  menuItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '10px 14px',
    margin: '2px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid transparent',
  },
  menuItemTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconWrap: {
    width: '28px',
    height: '28px',
    borderRadius: '7px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0,
    transition: 'all 0.2s',
  },
  itemName: {
    fontSize: '13px',
    fontWeight: 600,
    lineHeight: 1.2,
  },
  itemDesc: {
    fontSize: '10px',
    paddingLeft: '38px',
    color: 'rgba(156,163,175,0.45)',
    fontWeight: 400,
  },
  panel: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255,255,255,0.1) transparent',
  },
};

export default function MenuAudioEditor({ onMode }) {
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const { setMode } = useContext(AudioContext);

  const handleMenuClick = (id) => {
    const next = selectedMenu === id ? null : id;
    setSelectedMenu(next);
    onMode(next || '');
    setMode(next || '');
  };

  const getItemStyle = (id) => {
    const isActive = selectedMenu === id;
    const isHovered = hoveredItem === id;
    return {
      ...styles.menuItem,
      background: isActive
        ? 'rgba(245,158,11,0.1)'
        : isHovered
        ? 'rgba(255,255,255,0.04)'
        : 'transparent',
      borderColor: isActive
        ? 'rgba(245,158,11,0.3)'
        : isHovered
        ? 'rgba(255,255,255,0.08)'
        : 'transparent',
    };
  };

  const getIconStyle = (id) => {
    const isActive = selectedMenu === id;
    return {
      ...styles.iconWrap,
      background: isActive
        ? 'rgba(245,158,11,0.18)'
        : 'rgba(255,255,255,0.06)',
      color: isActive ? '#f59e0b' : 'rgba(156,163,175,0.7)',
    };
  };

  const getNameStyle = (id) => ({
    ...styles.itemName,
    color: selectedMenu === id ? '#f59e0b' : 'rgba(220,220,220,0.85)',
  });

  return (
    <section style={styles.sidebar}>
      <div style={styles.navRail}>
        {/* Logo */}
        <div style={styles.logoArea}>
          <div style={styles.logoText}>AudioStudio</div>
          <div style={styles.logoSub}>Editor Pro</div>
        </div>

        {/* Home */}
        <div
          style={{
            ...styles.homeBtn,
            background: hoveredItem === 'home' ? 'rgba(255,255,255,0.04)' : 'transparent',
            borderColor: hoveredItem === 'home' ? 'rgba(255,255,255,0.08)' : 'transparent',
          }}
          onClick={() => { window.location.href = '/'; }}
          onMouseEnter={() => setHoveredItem('home')}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <FaHome style={{ fontSize: 14, color: 'rgba(156,163,175,0.6)' }} />
          <span>Trang chủ</span>
        </div>

        {/* Tools */}
        <div style={styles.sectionLabel}>Công cụ</div>

        {menuItems.map((item) => (
          <div
            key={item.id}
            style={getItemStyle(item.id)}
            onClick={() => handleMenuClick(item.id)}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div style={styles.menuItemTop}>
              <span style={getIconStyle(item.id)}>{item.icon}</span>
              <span style={getNameStyle(item.id)}>{item.name}</span>
              {selectedMenu === item.id && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                  <path d="M5 8L7 6L5 4" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <div style={styles.itemDesc}>{item.desc}</div>
          </div>
        ))}

        {/* Version badge */}
        <div style={{
          marginTop: 'auto',
          padding: '16px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{
            fontSize: '10px',
            color: 'rgba(156,163,175,0.3)',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.5px',
          }}>
            v2.0.0 · MultiTools
          </div>
        </div>
      </div>

      {/* Right panel (tool content) */}
      {selectedMenu && (
        <div style={styles.panel}>
          {selectedMenu === 'region' && <RegionsAudio />}
          {/* Add other panels as needed */}
        </div>
      )}
    </section>
  );
}