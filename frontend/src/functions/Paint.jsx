// functions/Paint.jsx
import React, {
  useRef, useEffect, useState, useContext, useLayoutEffect, useCallback,
} from "react";
import { createPortal } from "react-dom";
import { ImageContext } from "@/context/ImageContext";
import {
  FaEraser, FaMousePointer, FaPaintBrush, FaTimes,
} from "react-icons/fa";
import { IoShapesOutline } from "react-icons/io5";
import {
  RiCircleLine, RiRectangleLine, RiTriangleLine,
} from "react-icons/ri";
import { GiStraightPipe } from "react-icons/gi";
import rough from "roughjs/bundled/rough.esm";
import getStroke from "perfect-freehand";

// ─── RoughJS generator ───────────────────────────────────────────────────────
const generator = rough.generator();
const BRUSH_MIN = 1;
const BRUSH_MAX = 64;
const COLOR_PRESETS = [
  "#ffffff", "#111827", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

// ─── Element creation ────────────────────────────────────────────────────────
function createElement(id, x1, y1, x2, y2, type, shape, options) {
  if (type === "shape") {
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const w    = Math.abs(x2 - x1);
    const h    = Math.abs(y2 - y1);
    let roughEl;

    switch (shape) {
      case "rectangle":
        roughEl = generator.rectangle(minX, minY, w, h, options); break;
      case "circle": {
        const r = Math.min(w, h) / 2;
        roughEl = generator.circle(minX + r, minY + r, r * 2, options); break;
      }
      case "triangle":
        roughEl = generator.polygon([[x1, y2], [(x1 + x2) / 2, y1], [x2, y2]], options); break;
      case "line":
        roughEl = generator.line(x1, y1, x2, y2, options); break;
      default: break;
    }
    return {
      id,
      x1,
      y1,
      x2,
      y2,
      type,
      shape,
      roughElement: roughEl,
      stroke: options.stroke,
      strokeWidth: options.strokeWidth,
      opacity: options.opacity ?? 1,
    };
  }
  if (type === "pen") {
    return {
      id,
      type,
      points: [{ x: x1, y: y1 }],
      stroke: options.stroke,
      strokeWidth: options.strokeWidth,
      opacity: options.opacity ?? 1,
    };
  }
  return null;
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toRgba = (hex, alpha = 1) => {
  if (!hex || typeof hex !== "string") return `rgba(255,255,255,${alpha})`;
  const raw = hex.replace("#", "");
  const normalized = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = parseInt(normalized, 16);
  if (Number.isNaN(n)) return `rgba(255,255,255,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ─── Geometry helpers ────────────────────────────────────────────────────────
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const onLine = (x1, y1, x2, y2, x, y, maxD = 1) => {
  const d = dist({ x: x1, y: y1 }, { x: x2, y: y2 }) - (dist({ x: x1, y: y1 }, { x, y }) + dist({ x: x2, y: y2 }, { x, y }));
  return Math.abs(d) < maxD ? "inside" : null;
};

const nearPoint = (x, y, px, py, name) =>
  Math.abs(x - px) < 5 && Math.abs(y - py) < 5 ? name : null;

const positionWithinElement = (x, y, el) => {
  const { type, shape, x1, x2, y1, y2 } = el;
  if (type === "shape") {
    switch (shape) {
      case "line":
        return nearPoint(x, y, x1, y1, "start") || nearPoint(x, y, x2, y2, "end") || onLine(x1, y1, x2, y2, x, y);
      case "rectangle":
        return (
          nearPoint(x, y, x1, y1, "tl") || nearPoint(x, y, x2, y1, "tr") ||
          nearPoint(x, y, x1, y2, "bl") || nearPoint(x, y, x2, y2, "br") ||
          (x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null)
        );
      case "circle": {
        const c = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
        return dist(c, { x, y }) < dist(c, { x: x1, y: y1 }) ? "inside" : null;
      }
      case "triangle": {
        const top = { x: (x1 + x2) / 2, y: y1 }, left = { x: x1, y: y2 }, right = { x: x2, y: y2 };
        return (onLine(top.x, top.y, left.x, left.y, x, y, 5) ||
                onLine(top.x, top.y, right.x, right.y, x, y, 5) ||
                onLine(left.x, left.y, right.x, right.y, x, y, 5)) ? "inside" : null;
      }
      default: return null;
    }
  }
  if (type === "pen") {
    return el.points.some((p, i) => {
      const next = el.points[i + 1];
      return next ? onLine(p.x, p.y, next.x, next.y, x, y, 5) : false;
    }) ? "inside" : null;
  }
};

const getElementAtPosition = (x, y, elements) =>
  elements.map((e) => ({ ...e, position: positionWithinElement(x, y, e) }))
          .find((e) => e.position !== null);

const adjustCoords = (el) => {
  const { x1, y1, x2, y2, shape } = el;
  const [minX, minY, maxX, maxY] = [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)];
  if (shape === "line") return x1 < x2 || (x1 === x2 && y1 < y2) ? { x1, y1, x2, y2 } : { x1: x2, y1: y2, x2: x1, y2: y1 };
  return { x1: minX, y1: minY, x2: maxX, y2: maxY };
};

const cursorForPosition = (pos) =>
  ({ tl: "nwse-resize", br: "nwse-resize", start: "nwse-resize", end: "nwse-resize", tr: "nesw-resize", bl: "nesw-resize" }[pos] ?? "move");

const resizedCoords = (cx, cy, pos, { x1, y1, x2, y2 }) => ({
  tl: { x1: cx, y1: cy, x2, y2 }, start: { x1: cx, y1: cy, x2, y2 },
  tr: { x1, y1: cy, x2: cx, y2 },
  bl: { x1: cx, y1, x2, y2: cy },
  br: { x1, y1, x2: cx, y2: cy }, end: { x1, y1, x2: cx, y2: cy },
}[pos] ?? null);

const getSvgPath = (stroke) => {
  if (!stroke.length) return "";
  const d = stroke.reduce((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length];
    acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    return acc;
  }, ["M", ...stroke[0], "Q"]);
  return [...d, "Z"].join(" ");
};

const drawElement = (rc, ctx, el) => {
  if (el.type === "shape" && el.roughElement) {
    ctx.save();
    ctx.globalAlpha = el.opacity ?? 1;
    rc.draw(el.roughElement);
    ctx.restore();
  } else if (el.type === "pen" && el.points?.length) {
    const path = getSvgPath(getStroke(el.points, { size: el.strokeWidth || 4 }));
    ctx.fillStyle = toRgba(el.stroke || "#000000", el.opacity ?? 1);
    ctx.fill(new Path2D(path));
  }
};

// ─── Component ───────────────────────────────────────────────────────────────
const Paint = ({ onClose }) => {
  const {
    currentImage, mergeDrawingWithImage, imageRef,
    elements, setElements, undoE, redoE,
  } = useContext(ImageContext);

  const canvasRef = useRef(null);
  const [canvasHost, setCanvasHost] = useState(null);
  const [action, setAction]               = useState("none");
  const [tool,   setTool]                 = useState("pen");
  const [shape,  setShape]                = useState("rectangle");
  const [color,  setColor]                = useState("#ffffff");
  const [lineWidth, setLineWidth]         = useState(4);
  const [opacity, setOpacity]             = useState(100);
  const [selectedElement, setSelectedEl] = useState(null);

  const TOOLS  = [
    { id: "pen",       label: "Bút vẽ", icon: <FaPaintBrush />, shortcut: "B" },
    { id: "shape",     label: "Hình",   icon: <IoShapesOutline />, shortcut: "H" },
    { id: "eraser",    label: "Tẩy",    icon: <FaEraser />, shortcut: "E" },
    { id: "selection", label: "Chọn",   icon: <FaMousePointer />, shortcut: "V" },
  ];
  const SHAPES = [
    { id: "rectangle", label: "Chữ nhật", icon: <RiRectangleLine />, shortcut: "1" },
    { id: "circle",    label: "Tròn", icon: <RiCircleLine />, shortcut: "2" },
    { id: "triangle",  label: "Tam giác", icon: <RiTriangleLine />, shortcut: "3" },
    { id: "line",      label: "Đường thẳng", icon: <GiStraightPipe />, shortcut: "4" },
  ];
  const brushPresets = [2, 4, 8, 14, 24, 36];

  useEffect(() => {
    const resolveHost = () => {
      const host = document.querySelector(".image-editor-shell .ie-image-viewport");
      setCanvasHost(host);
    };
    resolveHost();
    const observer = new MutationObserver(resolveHost);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", resolveHost);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resolveHost);
    };
  }, [currentImage]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!currentImage) return;

      const target = e.target;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isEditable) return;

      const isCmd = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();

      if (isCmd && k === "z") {
        e.preventDefault();
        if (e.shiftKey) redoE();
        else undoE();
        return;
      }
      if (isCmd && k === "y") {
        e.preventDefault();
        redoE();
        return;
      }

      if (k === "escape") {
        e.preventDefault();
        setAction("none");
        setSelectedEl(null);
        return;
      }

      if (k === "[") {
        e.preventDefault();
        setLineWidth((v) => clamp(v - 1, BRUSH_MIN, BRUSH_MAX));
        return;
      }
      if (k === "]") {
        e.preventDefault();
        setLineWidth((v) => clamp(v + 1, BRUSH_MIN, BRUSH_MAX));
        return;
      }

      if (k === "b") setTool("pen");
      else if (k === "h") setTool("shape");
      else if (k === "e") setTool("eraser");
      else if (k === "v") setTool("selection");
      else if (k === "1") setShape("rectangle");
      else if (k === "2") setShape("circle");
      else if (k === "3") setShape("triangle");
      else if (k === "4") setShape("line");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentImage, undoE, redoE]);

  const updateCanvasGeometry = useCallback(() => {
    const canvas = canvasRef.current;
    const imgEl = imageRef?.current;
    const hostEl = canvas?.parentElement;
    if (!canvas || !imgEl || !hostEl || !currentImage) return false;

    const imgRect = imgEl.getBoundingClientRect();
    const hostRect = hostEl.getBoundingClientRect();
    const width = Math.max(1, Math.round(imgRect.width));
    const height = Math.max(1, Math.round(imgRect.height));
    const left = imgRect.left - hostRect.left;
    const top = imgRect.top - hostRect.top;

    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    canvas.style.left = `${left}px`;
    canvas.style.top = `${top}px`;
    return true;
  }, [currentImage, imageRef]);

  // ── Draw loop ───────────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!updateCanvasGeometry()) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.style.cursor = tool === "eraser" ? "crosshair" : "default";

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rc = rough.canvas(canvas);
    elements.forEach((el) => drawElement(rc, ctx, el));

    // Selection box
    if (selectedElement?.type === "shape") {
      const { x1, y1, x2, y2 } = adjustCoords(selectedElement);
      const pad = 5;
      ctx.save();
      ctx.strokeStyle = "#00aaff";
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(x1 - pad, y1 - pad, (x2 - x1) + pad * 2, (y2 - y1) + pad * 2);
      ctx.restore();
    }
  }, [elements, currentImage, selectedElement, tool, imageRef, updateCanvasGeometry]);

  useEffect(() => {
    if (!currentImage) return undefined;
    let rafId = 0;
    const loop = () => {
      updateCanvasGeometry();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [currentImage, canvasHost, imageRef, updateCanvasGeometry]);

  // ── Update element ──────────────────────────────────────────────────────────
  const updateElement = (id, x1, y1, x2, y2, type, shapeType) => {
    setElements((prev) => {
      const copy = [...prev];
      const existing = copy[id];
      if (!existing) return copy;

      if (type === "shape") {
        const resolvedShape = shapeType || existing.shape || "rectangle";
        copy[id] = createElement(id, x1, y1, x2, y2, type, resolvedShape, {
          stroke: existing.stroke || color,
          strokeWidth: existing.strokeWidth || lineWidth,
          opacity: existing.opacity ?? opacity / 100,
        });
      } else if (type === "pen") {
        copy[id] = { ...existing, points: [...existing.points, { x: x2, y: y2 }] };
      }
      return copy;
    }, true);
  };

  // ── Mouse handlers ──────────────────────────────────────────────────────────
  const getCanvasCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    if (!currentImage) return;
    if (typeof e.pointerId === "number" && e.currentTarget?.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const { x: cx, y: cy } = getCanvasCoords(e);

    if (tool === "selection") {
      const el = getElementAtPosition(cx, cy, elements);
      if (el) {
        if (el.type === "pen") {
          setSelectedEl({ ...el, xOffsets: el.points.map((p) => cx - p.x), yOffsets: el.points.map((p) => cy - p.y) });
        } else if (el.position === "inside") {
          setSelectedEl({ ...el, offsetX: cx - el.x1, offsetY: cy - el.y1, width: el.x2 - el.x1, height: el.y2 - el.y1 });
        } else {
          setSelectedEl({ ...el, position: el.position, offsetX: cx - el.x1, offsetY: cy - el.y1 });
          setAction("resizing");
          return;
        }
        setAction("moving");
      }
      return;
    }

    if (tool === "eraser") {
      const el = getElementAtPosition(cx, cy, elements);
      if (el) {
        const copy = elements.filter((e) => e.id !== el.id).map((e, i) => ({ ...e, id: i }));
        setElements(copy);
      }
      return;
    }

    if (tool === "shape" || tool === "pen") {
      const id = elements.length;
      const newEl = createElement(id, cx, cy, cx, cy, tool, shape, {
        stroke: color,
        strokeWidth: lineWidth,
        opacity: opacity / 100,
      });
      if (!newEl) return;
      setElements((prev) => [...prev, newEl]);
      setSelectedEl(newEl);
      setAction("drawing");
    }
  };

  const handleMouseMove = (e) => {
    const { x: cx, y: cy } = getCanvasCoords(e);
    if (tool === "selection") {
      const el = getElementAtPosition(cx, cy, elements);
      canvasRef.current.style.cursor = el ? cursorForPosition(el.position) : "default";
    }
    if (action === "drawing") {
      const idx = elements.length - 1;
      if (idx < 0 || !elements[idx]) return;
      updateElement(idx, elements[idx].x1, elements[idx].y1, cx, cy, tool, elements[idx].shape || shape);
    } else if (action === "moving" && selectedElement) {
      if (selectedElement.type === "pen") {
        const pts = selectedElement.points.map((_, i) => ({
          x: cx - selectedElement.xOffsets[i], y: cy - selectedElement.yOffsets[i],
        }));
        const copy = [...elements];
        copy[selectedElement.id].points = pts;
        setElements(copy, true);
      } else {
        const { id, type, offsetX, offsetY, width, height, shape: selectedShape } = selectedElement;
        updateElement(id, cx - offsetX, cy - offsetY, cx - offsetX + width, cy - offsetY + height, type, selectedShape);
      }
    } else if (action === "resizing" && selectedElement) {
      const { id, type, position, shape: selectedShape, ...coords } = selectedElement;
      const r = resizedCoords(cx, cy, position, coords);
      if (r) updateElement(id, r.x1, r.y1, r.x2, r.y2, type, selectedShape);
    }
  };

  const handleMouseUp = (e) => {
    if (typeof e?.pointerId === "number" && e.currentTarget?.releasePointerCapture) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // no-op
      }
    }
    if (selectedElement && (action === "drawing" || action === "resizing") && selectedElement.type === "shape") {
      const idx = selectedElement.id;
      if (!elements[idx]) {
        setAction("none");
        setSelectedEl(null);
        return;
      }
      const { x1, y1, x2, y2 } = adjustCoords(elements[idx]);
      updateElement(idx, x1, y1, x2, y2, selectedElement.type, selectedElement.shape);
    }
    // Do NOT reset tool here – user should keep drawing with same tool
    setAction("none");
    setSelectedEl(null);
  };

  const handleMerge = () => {
    if (!currentImage || !canvasRef.current) return;
    const merge = document.createElement("canvas");
    const ctx = merge.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;
      merge.width = naturalW;
      merge.height = naturalH;
      ctx.drawImage(img, 0, 0, naturalW, naturalH);
      ctx.drawImage(
        canvasRef.current,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height,
        0,
        0,
        naturalW,
        naturalH
      );
      mergeDrawingWithImage(merge.toDataURL("image/png"));
      setElements([]);
      onClose?.();
    };
    img.src = currentImage;
  };

  const handleClear = () => setElements([]);

  const handleCancel = () => {
    setElements([]);
    onClose?.();
  };

  const currentToolLabel = TOOLS.find((t) => t.id === tool)?.label || "Bút vẽ";

  return (
    <>
      {/* Overlay canvas rendered inside image viewport */}
      {canvasHost &&
        createPortal(
          <canvas
            ref={canvasRef}
            className="ie-paint-layer"
            onPointerDown={handleMouseDown}
            onPointerMove={handleMouseMove}
            onPointerUp={handleMouseUp}
            onPointerLeave={handleMouseUp}
          />,
          canvasHost
        )}

      {/* Sidebar panel */}
      <section className="tool-drawer ie-paint-panel">
        <div className="tool-name">
          <div className="ie-paint-title-block">
            <span>Vẽ</span>
            <small>Layer vector thời gian thực</small>
          </div>
          <button type="button" onClick={handleCancel} className="icon-cancel"><FaTimes /></button>
        </div>
        <div className="splitter" />
        <div className="ie-paint-status">
          <span>{currentToolLabel}</span>
          <span>{elements.length} nét</span>
        </div>

        {!currentImage && (
          <p className="ie-empty-message">Chưa có ảnh để vẽ.</p>
        )}

        <div className="tool-content">
          <div className="group">
            <span>Công cụ</span>
            <div className="ie-paint-tools">
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`ie-paint-tool-btn ${tool === t.id ? "active" : ""}`}
                  onClick={() => setTool(t.id)}
                  title={`${t.label} (${t.shortcut})`}
                  disabled={!currentImage}
                >
                  <span className="ie-paint-tool-icon">{t.icon}</span>
                  <span>{t.label}</span>
                  <kbd>{t.shortcut}</kbd>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="tool-content">
          <div className="group">
            <span>Màu nét</span>
            <div className="ie-paint-color-row">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="ie-paint-color-input"
                disabled={!currentImage}
              />
              <div className="ie-color-code">{color.toUpperCase()}</div>
            </div>

            <div className="ie-paint-swatch-grid">
              {COLOR_PRESETS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={`ie-paint-swatch ${color.toLowerCase() === hex.toLowerCase() ? "active" : ""}`}
                  style={{ background: hex }}
                  onClick={() => setColor(hex)}
                  title={hex}
                  disabled={!currentImage}
                />
              ))}
            </div>

            <div className="ie-paint-control-row">
              <div className="ie-paint-slider-head">
                <label>Độ dày</label>
                <strong>{lineWidth}px</strong>
              </div>
              <input
                type="range"
                min={BRUSH_MIN}
                max={BRUSH_MAX}
                value={lineWidth}
                onChange={(e) => setLineWidth(clamp(Number(e.target.value), BRUSH_MIN, BRUSH_MAX))}
                disabled={!currentImage}
              />
            </div>

            <div className="ie-paint-presets">
              {brushPresets.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`btn ${lineWidth === size ? "btn--active" : ""}`}
                  onClick={() => setLineWidth(size)}
                  disabled={!currentImage}
                >
                  {size}px
                </button>
              ))}
            </div>

            <div className="ie-paint-control-row">
              <div className="ie-paint-slider-head">
                <label>Độ mờ</label>
                <strong>{opacity}%</strong>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={opacity}
                onChange={(e) => setOpacity(clamp(Number(e.target.value), 10, 100))}
                disabled={!currentImage}
              />
            </div>

            <div className="ie-paint-preview">
              <span
                style={{
                  width: `${Math.max(4, Math.min(lineWidth * 1.8, 80))}px`,
                  height: `${Math.max(4, Math.min(lineWidth * 1.8, 80))}px`,
                  background: toRgba(color, opacity / 100),
                }}
              />
            </div>
          </div>
        </div>

        {tool === "shape" && (
          <div className="tool-content">
            <div className="group">
              <span>Khối hình</span>
              <div className="ie-paint-shape-grid">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`ie-paint-shape-btn ${shape === s.id ? "active" : ""}`}
                    onClick={() => setShape(s.id)}
                    title={`${s.label} (${s.shortcut})`}
                    disabled={!currentImage}
                  >
                    {s.icon}
                    <span>{s.label}</span>
                    <kbd>{s.shortcut}</kbd>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="tool-content">
          <div className="group">
            <span>Thao tác nhanh</span>
            <div className="ie-paint-action-row">
              <button type="button" className="btn" onClick={undoE} disabled={!currentImage}>↩ Hoàn tác</button>
              <button type="button" className="btn" onClick={redoE} disabled={!currentImage}>↪ Làm lại</button>
              <button type="button" className="btn" onClick={handleClear} title="Xóa toàn bộ" disabled={!currentImage}>🗑 Xóa</button>
            </div>
            <p className="ie-paint-shortcuts">
              Phím tắt: <kbd>B</kbd> Bút, <kbd>H</kbd> Hình, <kbd>E</kbd> Tẩy, <kbd>V</kbd> Chọn,
              <kbd> [ </kbd>/<kbd> ] </kbd> đổi nét, <kbd>Ctrl/Cmd + Z</kbd> hoàn tác.
            </p>
          </div>
        </div>

        <div className="bottom-content">
          <div className="action-btn">
            <button type="button" id="crop-action-cancel" onClick={handleCancel}>Hủy</button>
            <button type="button" id="crop-action-apply" onClick={handleMerge} disabled={!currentImage}>Áp dụng</button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Paint;
