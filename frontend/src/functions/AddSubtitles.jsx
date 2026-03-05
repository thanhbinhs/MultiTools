// functions/AddSubtitles.jsx
import React, { useContext, useState } from "react";
import { VideoContext } from "@/context/VideoContext";
import { FaSpinner, FaTimes, FaUpload } from "react-icons/fa";
import { MdOutlineGeneratingTokens } from "react-icons/md";
import "../css/app.css";

const AddSubtitles = ({ onClose }) => {
  const {
    currentVideo,
    setSubtitlesFile,
    generateSubtitles,
    handleApplySubtitles,
    isProcessing,
    error: contextError,
    clearError,
  } = useContext(VideoContext);

  const [subtitleFile, setSubtitleFile] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [activeAction, setActiveAction] = useState(null); // v1 | v2 | apply

  const setErrorState = (message) => {
    clearError?.();
    setLocalError(message || null);
    setSuccessMsg(null);
  };

  const handleGenerate = async (premium) => {
    if (!currentVideo) {
      setErrorState("Vui lòng tải video trước khi tạo phụ đề");
      return;
    }

    try {
      clearError?.();
      setLocalError(null);
      setSuccessMsg(null);
      setActiveAction(premium ? "v2" : "v1");
      const generated = await generateSubtitles({ premium });
      setSuccessMsg(
        premium
          ? `Tạo phụ đề Premium thành công: ${generated.name}`
          : `Tạo phụ đề tự động thành công: ${generated.name}`
      );
    } catch {
      // contextError has the details
    } finally {
      setActiveAction(null);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".vtt") && !fileName.endsWith(".srt")) {
      setErrorState("Chỉ hỗ trợ tệp phụ đề .vtt hoặc .srt");
      event.target.value = "";
      return;
    }

    clearError?.();
    setLocalError(null);
    setSuccessMsg(null);
    setSubtitleFile(file);
    event.target.value = "";
  };

  const handleUseManual = () => {
    if (!subtitleFile) {
      setErrorState("Vui lòng chọn tệp phụ đề trước");
      return;
    }
    clearError?.();
    setLocalError(null);
    setSubtitlesFile(subtitleFile);
    setSuccessMsg(`Đã chọn phụ đề thủ công: ${subtitleFile.name}`);
  };

  const handleApply = async () => {
    try {
      clearError?.();
      setLocalError(null);
      setSuccessMsg(null);
      setActiveAction("apply");
      await handleApplySubtitles();
      setSuccessMsg("Ghép phụ đề vào video thành công");
    } catch {
      // contextError has the details
    } finally {
      setActiveAction(null);
    }
  };

  const handleCancel = () => {
    clearError?.();
    setLocalError(null);
    setSuccessMsg(null);
    setSubtitleFile(null);
    onClose?.();
  };

  return (
    <div className="tool-drawer">
      <div className="tool-name">
        <div />
        Thêm phụ đề
        <button type="button" onClick={handleCancel} className="icon-cancel">
          <FaTimes />
        </button>
      </div>
      <div className="splitter" />

      {!currentVideo && (
        <div className="ie-empty-message" style={{ margin: "10px 12px" }}>
          Chưa có video. Hãy tải video trước khi tạo hoặc ghép phụ đề.
        </div>
      )}

      {(localError || contextError) && (
        <div className="ie-feedback ie-feedback--error" style={{ margin: "8px 12px" }}>
          ⚠ {localError || contextError}
        </div>
      )}
      {successMsg && (
        <div className="ie-feedback ie-feedback--success" style={{ margin: "8px 12px" }}>
          ✓ {successMsg}
        </div>
      )}

      <div
        className="box--basic"
        onClick={() => !isProcessing && handleGenerate(false)}
        style={{ cursor: isProcessing ? "not-allowed" : "pointer", opacity: isProcessing && activeAction !== "v1" ? 0.6 : 1 }}
      >
        {isProcessing && activeAction === "v1" ? (
          <>
            <FaSpinner className="removebg-icon spinner" /> Đang tạo phụ đề tự động...
          </>
        ) : (
          <>
            <MdOutlineGeneratingTokens className="removebg-icon" /> Tạo phụ đề tự động
          </>
        )}
      </div>

      <div
        className="box--basic"
        onClick={() => !isProcessing && handleGenerate(true)}
        style={{ cursor: isProcessing ? "not-allowed" : "pointer", opacity: isProcessing && activeAction !== "v2" ? 0.6 : 1 }}
      >
        {isProcessing && activeAction === "v2" ? (
          <>
            <FaSpinner className="removebg-icon spinner" /> Đang tạo phụ đề Premium...
          </>
        ) : (
          <>
            <MdOutlineGeneratingTokens className="removebg-icon" /> Tạo phụ đề Premium
          </>
        )}
      </div>

      <div style={{ padding: "8px 12px" }}>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 6 }}>
          Hoặc dùng tệp phụ đề thủ công (.vtt / .srt)
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <label
            style={{
              flex: 1,
              background: "#333",
              border: "1px solid #555",
              borderRadius: 6,
              padding: "8px 10px",
              cursor: "pointer",
              fontSize: 13,
              color: "#ccc",
              textAlign: "center",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <FaUpload /> {subtitleFile ? subtitleFile.name : "Chọn tệp phụ đề"}
            <input type="file" accept=".vtt,.srt" onChange={handleFileUpload} style={{ display: "none" }} />
          </label>
          <button className="btn" type="button" onClick={handleUseManual} disabled={!subtitleFile || isProcessing}>
            Dùng
          </button>
        </div>
      </div>

      <div className="bottom-content">
        <div className="action-btn">
          <button id="crop-action-cancel" type="button" onClick={handleCancel}>
            Hủy
          </button>
          <button
            id="crop-action-apply"
            type="button"
            onClick={handleApply}
            disabled={isProcessing || !currentVideo}
            style={isProcessing && activeAction === "apply" ? { display: "flex", alignItems: "center", gap: 6 } : {}}
          >
            {isProcessing && activeAction === "apply" ? (
              <>
                <FaSpinner className="spinner" /> Đang ghép...
              </>
            ) : (
              "Áp dụng vào video"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSubtitles;
