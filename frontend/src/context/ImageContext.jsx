// context/ImageContext.jsx
import React, { createContext, useEffect, useRef, useState } from "react";
import axios from "axios";

export const ImageContext = createContext();

const API_BASE_ENV = (process.env.NEXT_PUBLIC_API_URL || "").trim();

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
      candidates.push(`http://${host}:3100`);
      candidates.push(`https://${host}:3100`);
    }
  }

  candidates.push("http://127.0.0.1:3100");
  candidates.push("http://localhost:3100");

  return [...new Set(candidates.map(normalizeBaseUrl).filter(Boolean))];
};

const DEFAULT_CROP_BOX_DATA = Object.freeze({
  width: 100,
  height: 100,
  rotate: 0,
  flipHorizontal: false,
  flipVertical: false,
  aspectRatio: "3:4",
});

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

const DOWNLOAD_FORMATS = new Set(["png", "jpeg", "jpg", "webp"]);
const DEFAULT_API_TIMEOUT_MS = 120000;
const BACKGROUND_API_TIMEOUT_MS = 10 * 60 * 1000;
const BACKGROUND_MAX_DIMENSION = 2048;

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const isBlobUrl = (url) => typeof url === "string" && url.startsWith("blob:");

const isAxiosNetworkError = (err) =>
  !err?.response &&
  (err?.code === "ERR_NETWORK" ||
    err?.message === "Network Error" ||
    err?.message?.includes("Network Error"));

const isAxiosTimeoutError = (err) =>
  err?.code === "ECONNABORTED" ||
  err?.message?.toLowerCase?.().includes("timeout");

const getErrorMessage = (err, fallback = "Đã xảy ra lỗi") => {
  if (isAxiosTimeoutError(err)) {
    return "Yêu cầu xử lý nền quá lâu và đã hết thời gian chờ. Hãy thử lại với ảnh nhỏ hơn hoặc chờ thêm.";
  }
  if (isAxiosNetworkError(err)) {
    return "Không kết nối được tới backend (port 5000). Hãy kiểm tra backend đang chạy và NEXT_PUBLIC_API_URL.";
  }
  return err?.response?.data?.error || err?.message || fallback;
};

const ensureDataImageUrl = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image")) return trimmed;
  if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
    return `data:image/png;base64,${trimmed.replace(/\s+/g, "")}`;
  }
  return null;
};

const normalizeImageApiResponse = (data) => {
  const outputImage = ensureDataImageUrl(
    data?.output_image ?? data?.outputImage ?? data?.image ?? null
  );
  if (!outputImage) {
    throw new Error("Dữ liệu trả về không hợp lệ");
  }
  return {
    outputImage,
    meta: data?.meta ?? null,
    message: data?.message ?? "",
    action: data?.action ?? null,
  };
};

async function postImageApi(path, payload, options = {}) {
  const timeoutMs = Number.isFinite(options?.timeoutMs)
    ? options.timeoutMs
    : DEFAULT_API_TIMEOUT_MS;
  const bases = getCandidateApiBases();
  let lastNetworkError = null;

  for (const base of bases) {
    try {
      const response = await axios.post(`${base}${path}`, payload, {
        timeout: timeoutMs,
      });
      return response.data;
    } catch (err) {
      if (isAxiosNetworkError(err)) {
        lastNetworkError = err;
        continue;
      }
      throw err;
    }
  }

  if (lastNetworkError) {
    const attempted = bases.join(", ");
    throw new Error(
      `Không thể kết nối backend. Đã thử: ${attempted}. Kiểm tra Flask đang chạy cổng 5000.`
    );
  }

  throw new Error("Không thể gửi yêu cầu tới backend");
}

async function urlToBase64(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Không thể đọc ảnh nguồn (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function getPreparedBackgroundSource(url) {
  const img = await loadImageElement(url);
  const w = Math.max(1, Math.round(img.naturalWidth || img.width || 0));
  const h = Math.max(1, Math.round(img.naturalHeight || img.height || 0));
  const maxSide = Math.max(w, h);

  if (!maxSide || maxSide <= BACKGROUND_MAX_DIMENSION) {
    return urlToBase64(url);
  }

  const scale = BACKGROUND_MAX_DIMENSION / maxSide;
  const targetW = Math.max(1, Math.round(w * scale));
  const targetH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return urlToBase64(url);
  }
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return canvas.toDataURL("image/png");
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không thể tải ảnh hiện tại"));
    img.src = src;
  });
}

export const ImageProvider = ({ children }) => {
  const cropperRef = useRef(null);
  const imageRef = useRef(null);
  const objectUrlsRef = useRef(new Set());

  const [modeE, setModeE] = useState("");
  const [imageParameters, setImageParameters] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [error, setError] = useState(null);

  // Image history
  const [history, setHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const currentIndexRef = useRef(-1);

  // Crop
  const [cropBoxData, setCropBoxData] = useState({ ...DEFAULT_CROP_BOX_DATA });

  // Adjustments
  const [adjustmentData, setAdjustmentData] = useState({ ...DEFAULT_ADJUSTMENT_DATA });

  // Paint history
  const [elements, setElements] = useState([]);
  const [paintIndex, setPaintIndex] = useState(0);
  const [paintHist, setPaintHist] = useState([[]]);
  const paintIndexRef = useRef(0);
  const paintHistRef = useRef([[]]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    paintHistRef.current = paintHist;
  }, [paintHist]);

  useEffect(() => {
    paintIndexRef.current = paintIndex;
  }, [paintIndex]);

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  const trackObjectUrl = (url) => {
    if (isBlobUrl(url)) {
      objectUrlsRef.current.add(url);
    }
  };

  const revokeObjectUrl = (url) => {
    if (!isBlobUrl(url)) return;
    if (!objectUrlsRef.current.has(url)) return;
    URL.revokeObjectURL(url);
    objectUrlsRef.current.delete(url);
  };

  const revokeObjectUrls = (urls = []) => {
    urls.forEach(revokeObjectUrl);
  };

  const updateCropBoxData = (name, value) =>
    setCropBoxData((prev) => {
      if (name === "width" || name === "height" || name === "rotate") {
        return { ...prev, [name]: toNumber(value, prev[name]) };
      }
      return { ...prev, [name]: value };
    });

  const resetCropBoxData = () => setCropBoxData({ ...DEFAULT_CROP_BOX_DATA });

  const updateAdjustmentData = (name, value) =>
    setAdjustmentData((prev) => ({ ...prev, [name]: toNumber(value, prev[name]) }));

  const resetAdjustmentData = () => setAdjustmentData({ ...DEFAULT_ADJUSTMENT_DATA });

  const resetPaintState = () => {
    const initial = [[]];
    setElements([]);
    setPaintHist(initial);
    setPaintIndex(0);
    paintHistRef.current = initial;
    paintIndexRef.current = 0;
  };

  const setPaintElements = (action, overwrite = false) => {
    setPaintHist((prevHist) => {
      const safeIndex = Math.max(0, Math.min(paintIndexRef.current, prevHist.length - 1));
      const baseState = prevHist[safeIndex] || [];
      const rawState = typeof action === "function" ? action(baseState) : action;
      const nextState = Array.isArray(rawState) ? rawState : [];

      if (overwrite) {
        const copy = [...prevHist];
        copy[safeIndex] = nextState;
        paintHistRef.current = copy;
        setElements(nextState);
        return copy;
      }

      const nextHist = [...prevHist.slice(0, safeIndex + 1), nextState];
      const nextIndex = nextHist.length - 1;

      paintHistRef.current = nextHist;
      paintIndexRef.current = nextIndex;
      setPaintIndex(nextIndex);
      setElements(nextState);

      return nextHist;
    });
  };

  const undoE = () => {
    const idx = paintIndexRef.current;
    if (idx <= 0) return;
    const nextIndex = idx - 1;
    paintIndexRef.current = nextIndex;
    setPaintIndex(nextIndex);
    setElements(paintHistRef.current[nextIndex] || []);
  };

  const redoE = () => {
    const idx = paintIndexRef.current;
    if (idx >= paintHistRef.current.length - 1) return;
    const nextIndex = idx + 1;
    paintIndexRef.current = nextIndex;
    setPaintIndex(nextIndex);
    setElements(paintHistRef.current[nextIndex] || []);
  };

  const currentImage =
    currentIndex >= 0 && currentIndex < history.length ? history[currentIndex] : null;

  const canUndo = modeE === "paint" ? paintIndex > 0 : currentIndex > 0;
  const canRedo =
    modeE === "paint" ? paintIndex < paintHist.length - 1 : currentIndex < history.length - 1;

  const pushImage = (url) => {
    if (!url) return;
    trackObjectUrl(url);

    setHistory((prev) => {
      const baseIndex = Math.max(-1, Math.min(currentIndexRef.current, prev.length - 1));
      const dropped = prev.slice(baseIndex + 1).filter((item) => item !== url);
      revokeObjectUrls(dropped);

      const next = [...prev.slice(0, baseIndex + 1), url];
      const nextIndex = next.length - 1;
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      return next;
    });
  };

  const setInitialImage = (url) => {
    if (!url) return;
    trackObjectUrl(url);

    setHistory((prev) => {
      const oldItems = prev.filter((item) => item !== url);
      revokeObjectUrls(oldItems);
      return [url];
    });

    currentIndexRef.current = 0;
    setCurrentIndex(0);
    resetAdjustmentData();
    resetCropBoxData();
    resetPaintState();
    setError(null);
  };

  const resetEditor = () => {
    setHistory((prev) => {
      revokeObjectUrls(prev);
      return [];
    });
    currentIndexRef.current = -1;
    setCurrentIndex(-1);
    resetAdjustmentData();
    resetCropBoxData();
    resetPaintState();
    setError(null);
  };

  const applyEdit = pushImage;

  const undo = () => {
    if (modeE === "paint") {
      undoE();
      return;
    }
    if (currentIndex > 0) {
      setCurrentIndex((i) => Math.max(0, i - 1));
    }
  };

  const redo = () => {
    if (modeE === "paint") {
      redoE();
      return;
    }
    if (currentIndex < history.length - 1) {
      setCurrentIndex((i) => Math.min(history.length - 1, i + 1));
    }
  };

  const handleAspectRatioChange = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    const value = cropBoxData.aspectRatio;
    let ratio = NaN;

    if (value === "x:y") {
      const imageData = cropper.getImageData?.();
      const w = toNumber(imageData?.naturalWidth || imageData?.width, 0);
      const h = toNumber(imageData?.naturalHeight || imageData?.height, 0);
      ratio = w > 0 && h > 0 ? w / h : NaN;
    } else if (value === "NaN" || value === "0:0" || value === "" || value == null) {
      ratio = NaN;
    } else if (typeof value === "string" && value.includes(":")) {
      const [w, h] = value.split(":").map((part) => toNumber(part, 0));
      ratio = w > 0 && h > 0 ? w / h : NaN;
    } else {
      const numeric = toNumber(value, NaN);
      ratio = Number.isFinite(numeric) && numeric > 0 ? numeric : NaN;
    }

    cropper.setAspectRatio(ratio);
  };

  const handleCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas();
    if (canvas) pushImage(canvas.toDataURL("image/png"));
  };

  const handleCropEnd = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    const { width, height } = cropper.getCropBoxData();
    setCropBoxData((prev) => ({ ...prev, width, height }));
  };

  const handleAdjustment = async () => {
    if (!currentImage) return;
    try {
      setError(null);
      const img = await loadImageElement(currentImage);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Trình duyệt không hỗ trợ canvas context");

      ctx.filter = `
        brightness(${adjustmentData.brightness}%)
        contrast(${adjustmentData.contrast}%)
        saturate(${adjustmentData.saturation}%)
        hue-rotate(${adjustmentData.hue}deg)
        grayscale(${adjustmentData.grey_scale}%)
        sepia(${adjustmentData.sepia}%)
        invert(${adjustmentData.invert}%)
        blur(${adjustmentData.blur}px)
      `.trim();
      ctx.drawImage(img, 0, 0);
      pushImage(canvas.toDataURL("image/png"));
      resetAdjustmentData();
    } catch (err) {
      const msg = getErrorMessage(err, "Không thể áp dụng điều chỉnh");
      setError(`Điều chỉnh màu thất bại: ${msg}`);
      console.error("handleAdjustment:", err);
    }
  };

  const handleRemoveBackground = async () => {
    if (!currentImage) {
      throw new Error("Chưa có ảnh để xử lý");
    }
    try {
      setError(null);
      const sourceImage = await getPreparedBackgroundSource(currentImage);
      const data = await postImageApi(
        "/remove-background",
        { image: sourceImage },
        { timeoutMs: BACKGROUND_API_TIMEOUT_MS }
      );
      const normalized = normalizeImageApiResponse(data);
      pushImage(normalized.outputImage);
      return normalized;
    } catch (err) {
      const msg = getErrorMessage(err, "Không thể xóa nền");
      setError(`Xóa nền thất bại: ${msg}`);
      console.error("handleRemoveBackground:", err);
      throw new Error(msg);
    }
  };

  const handleChangeBackground = async (backgroundType, backgroundValue) => {
    if (!currentImage) {
      throw new Error("Chưa có ảnh để xử lý");
    }

    const normalizedType = String(backgroundType || "").trim().toLowerCase();
    if (!["transparent", "color", "image"].includes(normalizedType)) {
      const msg = "Loại nền không hợp lệ";
      setError(msg);
      throw new Error(msg);
    }

    try {
      setError(null);
      const sourceImage = await getPreparedBackgroundSource(currentImage);
      const data = await postImageApi(
        "/change-background",
        {
          image: sourceImage,
          backgroundType: normalizedType,
          backgroundValue:
            normalizedType === "transparent" && !backgroundValue
              ? "transparent"
              : backgroundValue,
        },
        { timeoutMs: BACKGROUND_API_TIMEOUT_MS }
      );
      const normalized = normalizeImageApiResponse(data);
      pushImage(normalized.outputImage);
      return normalized;
    } catch (err) {
      const msg = getErrorMessage(err, "Không thể đổi nền");
      setError(`Đổi nền thất bại: ${msg}`);
      console.error("handleChangeBackground:", err);
      throw new Error(msg);
    }
  };

  const handleRetouchSkin = async (retouchDegree = 1.45, whiteningDegree = 1.45) => {
    if (!currentImage) {
      throw new Error("Chưa có ảnh để xử lý");
    }
    const apiKey = process.env.NEXT_PUBLIC_AILAB_API_KEY;
    if (!apiKey) {
      const msg = "NEXT_PUBLIC_AILAB_API_KEY chưa được thiết lập";
      setError(msg);
      throw new Error(msg);
    }

    try {
      setError(null);
      const res = await fetch(currentImage);
      if (!res.ok) {
        throw new Error(`Không thể đọc ảnh nguồn (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const form = new FormData();
      form.append("image", blob, "image.jpg");
      form.append("retouch_degree", String(toNumber(retouchDegree, 1.45)));
      form.append("whitening_degree", String(toNumber(whiteningDegree, 1.45)));

      const apiRes = await fetch("https://www.ailabapi.com/api/portrait/effects/smart-skin", {
        method: "POST",
        headers: { "ailabapi-api-key": apiKey },
        body: form,
      });

      if (!apiRes.ok) {
        throw new Error(`AILab API error ${apiRes.status}`);
      }

      const result = await apiRes.json();
      const outputUrl = result?.data?.image_url;
      if (!outputUrl) {
        throw new Error("AILab trả về dữ liệu không hợp lệ");
      }

      pushImage(outputUrl);
      return outputUrl;
    } catch (err) {
      const msg = getErrorMessage(err, "Không thể làm đẹp da");
      setError(`Làm đẹp thất bại: ${msg}`);
      console.error("handleRetouchSkin:", err);
      throw new Error(msg);
    }
  };

  const handleTextToImage = async (text) => {
    const prompt = typeof text === "string" ? text.trim() : "";
    if (!prompt) {
      const msg = "Vui lòng nhập mô tả ảnh";
      setError(msg);
      throw new Error(msg);
    }

    try {
      setError(null);
      const data = await postImageApi("/text-to-image", { text: prompt });
      const b64 = typeof data?.image === "string" ? data.image.trim() : "";
      if (!b64) throw new Error("Không nhận được dữ liệu ảnh");

      const byteArr = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const blob = new Blob([byteArr], { type: "image/png" });
      const objectUrl = URL.createObjectURL(blob);
      pushImage(objectUrl);
      return objectUrl;
    } catch (err) {
      const msg = getErrorMessage(err, "Không thể tạo ảnh");
      setError(`Text-to-image thất bại: ${msg}`);
      console.error("handleTextToImage:", err);
      throw new Error(msg);
    }
  };

  const mergeDrawingWithImage = (url) => {
    if (url) pushImage(url);
  };

  const handleResize = async (newWidth, newHeight) => {
    if (!currentImage) return false;

    const targetW = Math.max(1, Math.round(toNumber(newWidth, 0)));
    const targetH = Math.max(1, Math.round(toNumber(newHeight, 0)));
    if (!targetW || !targetH) {
      setError("Kích thước không hợp lệ");
      return false;
    }

    try {
      setError(null);
      const img = await loadImageElement(currentImage);
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Trình duyệt không hỗ trợ canvas context");
      ctx.drawImage(img, 0, 0, targetW, targetH);
      pushImage(canvas.toDataURL("image/png"));
      return true;
    } catch (err) {
      const msg = getErrorMessage(err, "Không thể thay đổi kích thước");
      setError(`Resize thất bại: ${msg}`);
      console.error("handleResize:", err);
      return false;
    }
  };

  const handleDownload = async ({ imageName = "edited-image", imageFormat = "png" }) => {
    if (!currentImage) return false;
    try {
      setError(null);
      const img = await loadImageElement(currentImage);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Trình duyệt không hỗ trợ canvas context");
      ctx.drawImage(img, 0, 0);

      const normalizedFormat = String(imageFormat || "png").toLowerCase();
      const format = DOWNLOAD_FORMATS.has(normalizedFormat) ? normalizedFormat : "png";
      const mimeFormat = format === "jpg" ? "jpeg" : format;
      const safeName = String(imageName || "edited-image").trim() || "edited-image";

      const link = document.createElement("a");
      link.download = `${safeName}.${format}`;
      link.href = canvas.toDataURL(`image/${mimeFormat}`);
      link.click();
      return true;
    } catch (err) {
      const msg = getErrorMessage(err, "Không thể tải ảnh");
      setError(`Tải ảnh thất bại: ${msg}`);
      console.error("handleDownload:", err);
      return false;
    }
  };

  const getImageParameters = () => imageParameters;

  return (
    <ImageContext.Provider
      value={{
        // image state
        currentImage,
        setInitialImage,
        applyEdit,
        resetEditor,
        // history
        undo,
        redo,
        canUndo,
        canRedo,
        // crop
        cropBoxData,
        updateCropBoxData,
        resetCropBoxData,
        cropperRef,
        handleCrop,
        handleCropEnd,
        handleAspectRatioChange,
        // adjustments
        adjustmentData,
        updateAdjustmentData,
        resetAdjustmentData,
        handleAdjustment,
        // image ops
        handleRemoveBackground,
        handleChangeBackground,
        handleRetouchSkin,
        handleTextToImage,
        handleResize,
        handleDownload,
        // paint
        elements,
        setElements: setPaintElements,
        undoE,
        redoE,
        mergeDrawingWithImage,
        // utils
        imageRef,
        setImageParameters,
        getImageParameters,
        setDimensions,
        dimensions,
        setModeE,
        modeE,
        // error
        error,
        clearError: () => setError(null),
      }}
    >
      {children}
    </ImageContext.Provider>
  );
};
