import React, { useContext, useState } from "react";
import { VideoContext } from "@/context/VideoContext";
import { FaCut, FaClock, FaTimes, FaSpinner } from "react-icons/fa";
import "../css/menuEditor.css";

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const formatTime = (seconds) => {
  const s = Math.max(0, Math.floor(toNumber(seconds, 0)));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh > 0) {
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

export default function TrimVideo({ onClose }) {
  const { currentVideo, trimVideo, videoRef, isProcessing, error, clearError } =
    useContext(VideoContext);

  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(10);
  const [success, setSuccess] = useState(null);

  const rawDuration = videoRef.current?.duration;
  const duration = Number.isFinite(rawDuration) ? rawDuration : 0;

  const clampRange = (s, e) => {
    const max = duration > 0 ? duration : Number.MAX_SAFE_INTEGER;
    const startN = Math.max(0, Math.min(toNumber(s, 0), max));
    const endN = Math.max(0, Math.min(toNumber(e, 0), max));
    return [startN, endN];
  };

  const setFromCurrentTime = (target) => {
    const current = toNumber(videoRef.current?.currentTime, 0);
    if (target === "start") {
      setStart(current);
      if (end <= current) {
        setEnd(Math.min(current + 1, duration || current + 1));
      }
      return;
    }

    setEnd(current);
    if (current <= start) {
      setStart(Math.max(0, current - 1));
    }
  };

  const handleApply = async () => {
    try {
      clearError?.();
      setSuccess(null);
      const [s, e] = clampRange(start, end);
      if (e - s < 1) {
        throw new Error("Khoảng cắt phải lớn hơn hoặc bằng 1 giây");
      }
      await trimVideo(s, e);
      setSuccess(`Đã cắt video từ ${formatTime(s)} đến ${formatTime(e)}.`);
    } catch (err) {
      if (!error) {
        // fallback local info if context did not set
        setSuccess(null);
      }
      console.error("trim apply error", err);
    }
  };

  const handleCancel = () => {
    clearError?.();
    setSuccess(null);
    onClose?.();
  };

  return (
    <div className="tool-drawer">
      <div className="tool-name">
        <div />
        Cắt video
        <button type="button" onClick={handleCancel} className="icon-cancel">
          <FaTimes />
        </button>
      </div>
      <div className="splitter" />

      {!currentVideo && (
        <div className="ie-empty-message" style={{ margin: "10px 12px" }}>
          Chưa có video để cắt.
        </div>
      )}

      {error && (
        <div className="ie-feedback ie-feedback--error" style={{ margin: "8px 12px" }}>
          ⚠ {error}
        </div>
      )}
      {success && (
        <div className="ie-feedback ie-feedback--success" style={{ margin: "8px 12px" }}>
          ✓ {success}
        </div>
      )}

      <div className="ie-section ie-section-tight" style={{ padding: "12px" }}>
        <div className="ie-step-title">Khoảng thời gian cần cắt</div>
        {duration > 0 && (
          <div className="ie-inline-note" style={{ marginBottom: 8 }}>
            Tổng thời lượng: {formatTime(duration)}
          </div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
            <label style={{ color: "#ddd", fontSize: 13 }}>Bắt đầu (giây)</label>
            <button className="btn" type="button" onClick={() => setFromCurrentTime("start")}>
              <FaClock /> Lấy thời điểm hiện tại
            </button>
            <input
              type="number"
              min={0}
              step={0.1}
              value={start}
              onChange={(e) => setStart(toNumber(e.target.value, 0))}
              style={{ gridColumn: "1 / span 2" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
            <label style={{ color: "#ddd", fontSize: 13 }}>Kết thúc (giây)</label>
            <button className="btn" type="button" onClick={() => setFromCurrentTime("end")}>
              <FaClock /> Lấy thời điểm hiện tại
            </button>
            <input
              type="number"
              min={0}
              step={0.1}
              value={end}
              onChange={(e) => setEnd(toNumber(e.target.value, 0))}
              style={{ gridColumn: "1 / span 2" }}
            />
          </div>
        </div>

        <div className="ie-inline-note" style={{ marginTop: 10 }}>
          Khoảng cắt hiện tại: {formatTime(start)} → {formatTime(end)}
        </div>
      </div>

      <div className="bottom-content">
        <div className="action-btn">
          <button type="button" id="crop-action-cancel" onClick={handleCancel}>
            Hủy
          </button>
          <button
            type="button"
            id="crop-action-apply"
            onClick={handleApply}
            disabled={isProcessing || !currentVideo}
            style={isProcessing ? { display: "flex", alignItems: "center", gap: 6 } : {}}
          >
            {isProcessing ? (
              <>
                <FaSpinner className="spinner" /> Đang cắt...
              </>
            ) : (
              <>
                <FaCut /> Cắt video
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
