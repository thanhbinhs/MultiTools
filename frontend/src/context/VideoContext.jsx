// context/VideoContext.jsx

import React, { createContext, useEffect, useRef, useState } from "react";

export const VideoContext = createContext();

const API_BASE_ENV = (process.env.NEXT_PUBLIC_API_URL || "").trim();

const DEFAULT_ADJUSTMENT_DATA = Object.freeze({
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  grey_scale: 0,
  sepia: 0,
  invert: 0,
  blur: 0,
});

const ALLOWED_DOWNLOAD_FORMATS = new Set(["mp4"]);

const normalizeBaseUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
};

const getCandidateApiBases = () => {
  const candidates = [];
  const envBase = normalizeBaseUrl(API_BASE_ENV);
  if (envBase) candidates.push(envBase);

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host) {
      const sameScheme = window.location.protocol === "https:" ? "https" : "http";
      candidates.push(`${sameScheme}://${host}:5000`);
      candidates.push(`http://${host}:5000`);
      candidates.push(`https://${host}:5000`);
    }
  }

  candidates.push("http://127.0.0.1:5000");
  candidates.push("http://localhost:5000");

  return [...new Set(candidates.map(normalizeBaseUrl).filter(Boolean))];
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isNetworkError = (err) =>
  !err?.response &&
  (err?.name === "TypeError" ||
    err?.message === "Failed to fetch" ||
    err?.message === "Network Error" ||
    String(err?.message || "").includes("Network Error"));

const isTimeoutError = (err) =>
  err?.code === "ECONNABORTED" ||
  String(err?.message || "").toLowerCase().includes("timeout");

const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const responseToError = async (response, fallback) => {
  const data = await parseJsonSafe(response);
  return data?.error || data?.message || fallback;
};

const getVideoErrorMessage = (err, fallback = "Đã xảy ra lỗi") => {
  if (isTimeoutError(err)) {
    return "Yêu cầu xử lý video quá lâu và đã hết thời gian chờ.";
  }
  if (isNetworkError(err)) {
    return "Không kết nối được tới backend video (port 5000).";
  }
  return err?.message || fallback;
};

const guessFileName = (url, fallback = "video.mp4") => {
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split("/").filter(Boolean).pop();
    return last || fallback;
  } catch {
    return fallback;
  }
};

const sanitizeFileName = (value, fallback = "edited-video") => {
  const cleaned = String(value || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .replace(/\s+/g, "-");
  return cleaned || fallback;
};

export const VideoProvider = ({ children }) => {
  const videoRef = useRef(null);

  const [history, setHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [videoParameters, setVideoParameters] = useState(null);
  const [mode, setMode] = useState("");
  const [adjustmentData, setAdjustmentData] = useState({ ...DEFAULT_ADJUSTMENT_DATA });
  const [subtitlesFile, setSubtitlesFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const currentIndexRef = useRef(-1);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const currentVideo =
    currentIndex >= 0 && currentIndex < history.length ? history[currentIndex] : null;

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex >= 0 && currentIndex < history.length - 1;

  const updateAdjustmentData = (name, value) => {
    setAdjustmentData((prev) => ({
      ...prev,
      [name]: toNumber(value, prev[name]),
    }));
  };

  const resetAdjustmentData = () => {
    setAdjustmentData({ ...DEFAULT_ADJUSTMENT_DATA });
  };

  const clearError = () => setError(null);

  const applyEdit = (newVideo) => {
    if (!newVideo) return;

    setHistory((prev) => {
      const safeIndex = Math.max(-1, Math.min(currentIndexRef.current, prev.length - 1));
      const next = [...prev.slice(0, safeIndex + 1), newVideo];
      const nextIndex = next.length - 1;
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      return next;
    });
  };

  const undo = () => {
    if (!canUndo) return;
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const redo = () => {
    if (!canRedo) return;
    setCurrentIndex((i) => Math.min(history.length - 1, i + 1));
  };

  const setInitialVideo = (videoInput) => {
    if (!videoInput) return;
    setHistory([videoInput]);
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    setSubtitlesFile(null);
    resetAdjustmentData();
    clearError();
    setProgress(0);
  };

  const resetEditor = () => {
    setHistory([]);
    currentIndexRef.current = -1;
    setCurrentIndex(-1);
    setSubtitlesFile(null);
    resetAdjustmentData();
    clearError();
    setProgress(0);
    setMode("");
  };

  const toVideoFile = async (videoInput) => {
    if (!videoInput) {
      throw new Error("Chưa có video để xử lý");
    }

    if (videoInput instanceof File) return videoInput;

    if (typeof videoInput !== "string") {
      throw new Error("Định dạng video không hợp lệ");
    }

    const response = await fetch(videoInput);
    if (!response.ok) {
      throw new Error(`Không thể đọc video nguồn (HTTP ${response.status})`);
    }

    const blob = await response.blob();
    const ext = blob.type.includes("webm") ? "webm" : "mp4";
    const fileName = guessFileName(videoInput, `video.${ext}`);
    return new File([blob], fileName, { type: blob.type || `video/${ext}` });
  };

  const postFormData = async (path, formData, { timeoutMs = 10 * 60 * 1000 } = {}) => {
    const timeoutIdByController = new Map();

    const cleanupController = (controller) => {
      const timeoutId = timeoutIdByController.get(controller);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutIdByController.delete(controller);
      }
    };

    const bases = getCandidateApiBases();
    let lastNetworkErr = null;

    for (const base of bases) {
      const controller = new AbortController();

      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      timeoutIdByController.set(controller, timeoutId);

      try {
        const response = await fetch(`${base}${path}`, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        cleanupController(controller);

        if (!response.ok) {
          const msg = await responseToError(response, "Yêu cầu xử lý video thất bại");
          throw new Error(msg);
        }

        return response;
      } catch (err) {
        cleanupController(controller);

        if (err?.name === "AbortError") {
          throw new Error("timeout of video request exceeded");
        }

        if (isNetworkError(err)) {
          lastNetworkErr = err;
          continue;
        }

        throw err;
      }
    }

    if (lastNetworkErr) {
      throw new Error(
        `Không thể kết nối backend video. Đã thử: ${bases.join(", ")}. Kiểm tra server Flask.`
      );
    }

    throw new Error("Không thể gửi yêu cầu tới backend video");
  };

  const handleAdjustment = async () => {
    if (!currentVideo) {
      const msg = "Chưa có video để chỉnh sửa";
      setError(msg);
      throw new Error(msg);
    }

    try {
      setIsProcessing(true);
      setProgress(10);
      setError(null);

      const sourceFile = await toVideoFile(currentVideo);
      const formData = new FormData();
      formData.append("video", sourceFile);
      formData.append("adjustmentData", JSON.stringify(adjustmentData));

      const response = await postFormData("/apply-adjustment", formData);
      const blob = await response.blob();
      const adjusted = new File([blob], `adjusted_${sourceFile.name || "video.mp4"}`, {
        type: blob.type || "video/mp4",
      });

      applyEdit(adjusted);
      resetAdjustmentData();
      setProgress(100);
      return adjusted;
    } catch (err) {
      const msg = getVideoErrorMessage(err, "Không thể áp dụng bộ lọc video");
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 600);
    }
  };

  const handleApplySubtitles = async () => {
    if (!currentVideo || !subtitlesFile) {
      const msg = "Vui lòng tải lên video và phụ đề trước khi áp dụng";
      setError(msg);
      throw new Error(msg);
    }

    try {
      setIsProcessing(true);
      setProgress(10);
      setError(null);

      const sourceFile = await toVideoFile(currentVideo);
      const formData = new FormData();
      formData.append("video", sourceFile);
      formData.append("subtitles", subtitlesFile);

      const response = await postFormData("/merge-video", formData, {
        timeoutMs: 12 * 60 * 1000,
      });

      const blob = await response.blob();
      const merged = new File([blob], `subtitled_${sourceFile.name || "video.mp4"}`, {
        type: blob.type || "video/mp4",
      });

      applyEdit(merged);
      setProgress(100);
      return merged;
    } catch (err) {
      const msg = getVideoErrorMessage(err, "Không thể ghép phụ đề vào video");
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 600);
    }
  };

  const generateSubtitles = async ({ premium = false } = {}) => {
    if (!currentVideo) {
      const msg = "Vui lòng tải lên video trước khi tạo phụ đề";
      setError(msg);
      throw new Error(msg);
    }

    try {
      setIsProcessing(true);
      setProgress(10);
      setError(null);

      const sourceFile = await toVideoFile(currentVideo);
      const formData = new FormData();
      formData.append("video", sourceFile);

      const endpoint = premium ? "/generate-subtitles-premium" : "/generate-subtitles";
      const response = await postFormData(endpoint, formData, {
        timeoutMs: premium ? 15 * 60 * 1000 : 10 * 60 * 1000,
      });

      const blob = await response.blob();
      const generated = new File([blob], "subtitles.vtt", {
        type: "text/vtt",
      });

      setSubtitlesFile(generated);
      setProgress(100);
      return generated;
    } catch (err) {
      const msg = getVideoErrorMessage(err, "Không thể tạo phụ đề tự động");
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 600);
    }
  };

  const trimVideo = async (start, end) => {
    if (!currentVideo) {
      const msg = "Chưa có video để cắt";
      setError(msg);
      throw new Error(msg);
    }

    const trimStart = Math.max(0, toNumber(start, 0));
    const trimEnd = Math.max(0, toNumber(end, 0));

    if (trimEnd - trimStart < 1) {
      const msg = "Khoảng trim phải ít nhất 1 giây";
      setError(msg);
      throw new Error(msg);
    }

    try {
      setIsProcessing(true);
      setProgress(10);
      setError(null);

      const sourceFile = await toVideoFile(currentVideo);
      const formData = new FormData();
      formData.append("video", sourceFile);
      formData.append("trim_start", String(trimStart));
      formData.append("trim_end", String(trimEnd));

      const response = await postFormData("/trim-video", formData, {
        timeoutMs: 12 * 60 * 1000,
      });

      const blob = await response.blob();
      const trimmed = new File([blob], `trimmed_${sourceFile.name || "video.mp4"}`, {
        type: blob.type || "video/mp4",
      });

      applyEdit(trimmed);
      setProgress(100);
      return trimmed;
    } catch (err) {
      const msg = getVideoErrorMessage(err, "Không thể cắt video");
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 600);
    }
  };

  const handleDownload = ({ videoName = "edited-video", videoFormat = "mp4" } = {}) => {
    if (!currentVideo) {
      setError("Chưa có video để tải xuống");
      return false;
    }

    const format = ALLOWED_DOWNLOAD_FORMATS.has(String(videoFormat).toLowerCase())
      ? String(videoFormat).toLowerCase()
      : "mp4";

    const name = sanitizeFileName(videoName, "edited-video");

    let objectUrl = null;
    try {
      const source =
        currentVideo instanceof File ? URL.createObjectURL(currentVideo) : String(currentVideo);
      objectUrl = currentVideo instanceof File ? source : null;

      const link = document.createElement("a");
      link.download = `${name}.${format}`;
      link.href = source;
      link.click();
      return true;
    } catch (err) {
      const msg = getVideoErrorMessage(err, "Không thể tải video");
      setError(msg);
      return false;
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  };

  return (
    <VideoContext.Provider
      value={{
        // state
        videoRef,
        currentVideo,
        mode,
        setMode,
        videoParameters,
        setVideoParameters,
        adjustmentData,
        subtitlesFile,
        isProcessing,
        progress,
        error,
        // actions
        setInitialVideo,
        resetEditor,
        applyEdit,
        undo,
        redo,
        canUndo,
        canRedo,
        updateAdjustmentData,
        resetAdjustmentData,
        handleAdjustment,
        setSubtitlesFile,
        generateSubtitles,
        handleApplySubtitles,
        trimVideo,
        handleDownload,
        clearError,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
};
