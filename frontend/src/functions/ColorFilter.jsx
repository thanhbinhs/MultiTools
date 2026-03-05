// functions/ColorFilter.jsx
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FaRandom, FaSearch, FaTimes } from "react-icons/fa";
import { ImageContext } from "@/context/ImageContext";

const FILTERS = [
  {
    id: "vivid",
    name: "Sống động",
    category: "Nổi bật",
    note: "Đẩy màu và tương phản",
    adjustments: { brightness: 110, contrast: 110, saturation: 130, hue: 0, grey_scale: 0, sepia: 0, invert: 0, blur: 0 },
  },
  {
    id: "warm",
    name: "Ấm áp",
    category: "Tông màu",
    note: "Da người dễ chịu hơn",
    adjustments: { brightness: 110, contrast: 110, saturation: 125, hue: 15, grey_scale: 0, sepia: 10, invert: 0, blur: 0 },
  },
  {
    id: "cool",
    name: "Mát mẻ",
    category: "Tông màu",
    note: "Thiên về xanh dịu",
    adjustments: { brightness: 108, contrast: 108, saturation: 125, hue: -15, grey_scale: 0, sepia: 0, invert: 0, blur: 0 },
  },
  {
    id: "drama",
    name: "Kịch tính",
    category: "Nổi bật",
    note: "Cứng và đậm",
    adjustments: { brightness: 88, contrast: 135, saturation: 75, hue: 0, grey_scale: 0, sepia: 0, invert: 0, blur: 0 },
  },
  {
    id: "drama-warm",
    name: "Kịch tính ấm",
    category: "Nổi bật",
    note: "Kịch tính + ấm",
    adjustments: { brightness: 88, contrast: 135, saturation: 75, hue: 15, grey_scale: 0, sepia: 5, invert: 0, blur: 0 },
  },
  {
    id: "drama-cool",
    name: "Kịch tính mát",
    category: "Nổi bật",
    note: "Kịch tính + lạnh",
    adjustments: { brightness: 88, contrast: 135, saturation: 75, hue: -15, grey_scale: 0, sepia: 0, invert: 0, blur: 0 },
  },
  {
    id: "mono",
    name: "Đơn sắc",
    category: "Đen trắng",
    note: "Màu xám trung tính",
    adjustments: { brightness: 100, contrast: 100, saturation: 0, hue: 0, grey_scale: 100, sepia: 0, invert: 0, blur: 0 },
  },
  {
    id: "silver",
    name: "Bạc đá",
    category: "Đen trắng",
    note: "Mono có chiều sâu",
    adjustments: { brightness: 100, contrast: 112, saturation: 0, hue: 0, grey_scale: 100, sepia: 20, invert: 0, blur: 0 },
  },
  {
    id: "noir",
    name: "Noir",
    category: "Đen trắng",
    note: "Tương phản mạnh",
    adjustments: { brightness: 80, contrast: 120, saturation: 0, hue: 0, grey_scale: 100, sepia: 0, invert: 0, blur: 0 },
  },
  {
    id: "vintage",
    name: "Cổ điển",
    category: "Cinematic",
    note: "Sepia nhẹ, hoài niệm",
    adjustments: { brightness: 95, contrast: 100, saturation: 80, hue: 0, grey_scale: 0, sepia: 50, invert: 0, blur: 0 },
  },
  {
    id: "cold",
    name: "Lạnh",
    category: "Tông màu",
    note: "Bầu không khí lạnh",
    adjustments: { brightness: 100, contrast: 105, saturation: 90, hue: -20, grey_scale: 0, sepia: 0, invert: 0, blur: 0 },
  },
  {
    id: "dreamy",
    name: "Mơ màng",
    category: "Cinematic",
    note: "Mềm và dịu",
    adjustments: { brightness: 115, contrast: 90, saturation: 105, hue: 0, grey_scale: 0, sepia: 15, invert: 0, blur: 1 },
  },
];

const DEFAULT_ADJ = { brightness: 100, contrast: 100, saturation: 100, hue: 0, grey_scale: 0, sepia: 0, invert: 0, blur: 0 };
const CATEGORIES = ["Tất cả", "Nổi bật", "Tông màu", "Đen trắng", "Cinematic"];

// ─── Filter preview thumbnail ────────────────────────────────────────────────
const FilterItem = ({ filter, source, isSelected, onSelect, disabled }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const THUMB = 80;
      const h = Math.max(48, Math.round((img.height / img.width) * THUMB));
      canvas.width  = THUMB;
      canvas.height = h;
      const { brightness, contrast, saturation, hue, grey_scale, sepia, invert, blur } = filter.adjustments;
      ctx.clearRect(0, 0, THUMB, h);
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg) grayscale(${grey_scale}%) sepia(${sepia}%) invert(${invert}%) blur(${blur}px)`;
      ctx.drawImage(img, 0, 0, THUMB, h);
    };
    img.src = source;
    return () => { cancelled = true; };
  }, [source, filter]);

  return (
    <button
      type="button"
      className={`filter-item ie-filter-item ${isSelected ? "selected" : ""}`}
      onClick={onSelect}
      disabled={disabled}
    >
      <canvas ref={canvasRef} className="filter-preview" />
      <span className="filter-name">
        {filter.name}
      </span>
      <small>{filter.note}</small>
    </button>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────
const ColorFilter = ({ onClose }) => {
  const {
    currentImage,
    adjustmentData,
    updateAdjustmentData,
    handleAdjustment,
  } = useContext(ImageContext);

  const [selectedFilterId, setSelectedFilterId] = useState(null);
  const [filterIntensity, setIntensity] = useState(100);
  const [category, setCategory] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const [compareOriginal, setCompareOriginal] = useState(false);
  const [applying, setApplying] = useState(false);

  const baseAdjustmentsRef = useRef({ ...DEFAULT_ADJ });

  useEffect(() => {
    baseAdjustmentsRef.current = { ...adjustmentData };
    setSelectedFilterId(null);
    setIntensity(100);
    setCategory("Tất cả");
    setQuery("");
    setCompareOriginal(false);
  }, [currentImage]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedFilter = useMemo(
    () => FILTERS.find((f) => f.id === selectedFilterId) || null,
    [selectedFilterId]
  );

  const applyAdjustmentMap = useCallback((nextMap) => {
    Object.keys(DEFAULT_ADJ).forEach((key) => {
      updateAdjustmentData(key, nextMap[key]);
    });
  }, [updateAdjustmentData]);

  const composeAdjustments = useCallback((base, filter, intensity) => {
    if (!filter) return { ...base };
    const ratio = Math.max(0, Math.min(150, Number(intensity) || 0)) / 100;
    const out = {};
    Object.keys(DEFAULT_ADJ).forEach((key) => {
      const delta = filter.adjustments[key] - DEFAULT_ADJ[key];
      out[key] = base[key] + delta * ratio;
    });
    return out;
  }, []);

  useEffect(() => {
    if (compareOriginal) {
      applyAdjustmentMap(baseAdjustmentsRef.current);
      return;
    }

    const next = composeAdjustments(baseAdjustmentsRef.current, selectedFilter, filterIntensity);
    applyAdjustmentMap(next);
  }, [selectedFilter, filterIntensity, compareOriginal, composeAdjustments, applyAdjustmentMap]);

  const visibleFilters = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return FILTERS.filter((filter) => {
      const matchCategory = category === "Tất cả" || filter.category === category;
      if (!matchCategory) return false;
      if (!normalizedQuery) return true;
      return `${filter.name} ${filter.note} ${filter.category}`.toLowerCase().includes(normalizedQuery);
    });
  }, [category, query]);

  const handleCancel = () => {
    applyAdjustmentMap(baseAdjustmentsRef.current);
    onClose?.();
  };

  const handleResetFilter = () => {
    setSelectedFilterId(null);
    setIntensity(100);
    applyAdjustmentMap(baseAdjustmentsRef.current);
  };

  const pickRandom = () => {
    if (!currentImage || !visibleFilters.length || applying) return;
    const next = visibleFilters[Math.floor(Math.random() * visibleFilters.length)];
    setSelectedFilterId(next.id);
    setIntensity(100);
  };

  const handleApply = async () => {
    if (!currentImage || applying || !selectedFilter) return;
    setApplying(true);
    try {
      await handleAdjustment();
      baseAdjustmentsRef.current = { ...DEFAULT_ADJ };
      setSelectedFilterId(null);
      setIntensity(100);
      setCompareOriginal(false);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="tool-drawer ie-filter-panel">
      <div className="tool-name">
        <div className="ie-paint-title-block">
          <span>Bộ lọc màu</span>
          <small>Preset cinematic cho ảnh hiện tại</small>
        </div>
        <button type="button" onClick={handleCancel} className="icon-cancel">
          <FaTimes />
        </button>
      </div>
      <div className="splitter" />

      <div className="ie-filter-toolbar">
        <div className="ie-filter-search">
          <FaSearch />
          <input
            type="text"
            placeholder="Tìm bộ lọc..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!currentImage || applying}
          />
        </div>
        <button type="button" className="btn" onClick={pickRandom} disabled={!currentImage || applying || !visibleFilters.length}>
          <FaRandom /> Ngẫu nhiên
        </button>
      </div>

      <div className="ie-tab-row ie-filter-tabs">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            className={`ie-tab-btn ${category === item ? "active" : ""}`}
            onClick={() => setCategory(item)}
            disabled={!currentImage || applying}
          >
            {item}
          </button>
        ))}
      </div>

      {!currentImage && (
        <p className="ie-empty-message">Chưa có ảnh để áp dụng bộ lọc.</p>
      )}

      <div className="filter-grid">
        {visibleFilters.map((filter) => (
          <FilterItem
            key={filter.id}
            filter={filter}
            source={currentImage}
            isSelected={selectedFilter?.id === filter.id}
            disabled={!currentImage || applying}
            onSelect={() => {
              if (!currentImage || applying) return;
              setSelectedFilterId((prev) => prev === filter.id ? null : filter.id);
              setIntensity(100);
            }}
          />
        ))}
        {!visibleFilters.length && (
          <div className="ie-empty-message">Không tìm thấy bộ lọc phù hợp.</div>
        )}
      </div>

      {currentImage && (
        <div className="ie-intensity">
          <div className="ie-intensity-head">
            <span>
              Cường độ: {filterIntensity}%
              {selectedFilter ? ` • ${selectedFilter.name}` : ""}
            </span>
            <button type="button" className="btn" onClick={handleResetFilter} disabled={applying}>
              Bỏ chọn
            </button>
          </div>
          <input
            type="range"
            min="0" max="150"
            value={filterIntensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            disabled={!selectedFilter || applying}
          />
          <button
            type="button"
            className={`btn ${compareOriginal ? "btn--active" : ""}`}
            onMouseDown={() => setCompareOriginal(true)}
            onMouseUp={() => setCompareOriginal(false)}
            onMouseLeave={() => setCompareOriginal(false)}
            onTouchStart={() => setCompareOriginal(true)}
            onTouchEnd={() => setCompareOriginal(false)}
            disabled={applying}
          >
            Nhấn giữ để xem ảnh gốc
          </button>
        </div>
      )}

      <div className="bottom-content">
        <div className="action-btn">
          <button type="button" id="filter-action-cancel" onClick={handleCancel} disabled={applying}>Hủy</button>
          <button
            type="button"
            id="filter-action-apply"
            onClick={handleApply}
            disabled={!currentImage || applying || !selectedFilter}
          >
            {applying ? "Đang áp dụng…" : "Áp dụng"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorFilter;
