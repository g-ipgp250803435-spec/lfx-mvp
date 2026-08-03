"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { apiPost, isDemoMode } from "@/lib/api";
import { MediaImage } from "@/components/CmsImage";
import { useApp } from "@/components/Providers";

export type MediaPurpose = "logo" | "favicon" | "asset_image" | "announcement_pdf" | "donation_qr" | "officer_photo" | "announcement_image";

interface MediaUploaderProps {
  purpose: MediaPurpose;
  idToken: string;
  onUploadSuccess: (url: string) => void;
  onRemove?: () => void;
  currentUrl?: string;
  label?: string;
}

const CONFIG: Record<MediaPurpose, { accept: string; maxSize: number; mimeTypes: string[] }> = {
  logo: {
    accept: ".svg,.png,.jpg,.jpeg,.webp",
    maxSize: 2.5 * 1024 * 1024,
    mimeTypes: ["image/svg+xml", "image/png", "image/jpeg", "image/webp"]
  },
  favicon: {
    accept: ".ico,.png,.svg",
    maxSize: 2.5 * 1024 * 1024,
    mimeTypes: ["image/x-icon", "image/vnd.microsoft.icon", "image/png", "image/svg+xml"]
  },
  asset_image: {
    accept: ".png,.jpg,.jpeg,.webp",
    maxSize: 2.5 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "image/webp"]
  },
  donation_qr: {
    accept: ".png,.jpg,.jpeg,.webp",
    maxSize: 2.5 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "image/webp"]
  },
  officer_photo: {
    accept: ".svg,.png,.jpg,.jpeg,.webp",
    maxSize: 2.5 * 1024 * 1024,
    mimeTypes: ["image/svg+xml", "image/png", "image/jpeg", "image/webp"]
  },
  announcement_pdf: {
    accept: ".pdf",
    maxSize: 2.5 * 1024 * 1024,
    mimeTypes: ["application/pdf"]
  },
  announcement_image: {
    accept: ".png,.jpg,.jpeg",
    maxSize: 10 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg"]
  }
};

export function MediaUploader({
  purpose,
  idToken,
  onUploadSuccess,
  onRemove,
  currentUrl = "",
  label
}: MediaUploaderProps) {
  const { language } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);
    setFileName(file.name);

    const cfg = CONFIG[purpose];

    // Validate size
    if (file.size > cfg.maxSize) {
      const maxMb = (cfg.maxSize / (1024 * 1024)).toFixed(1);
      setError(
        language === "bm"
          ? `Fail terlalu besar. Had maksimum ialah ${maxMb} MB.`
          : `File is too large. Maximum limit is ${maxMb} MB.`
      );
      return;
    }

    // Validate type / MIME
    // Fallback comparison for file extension if mimeType is empty
    const fileType = file.type.toLowerCase();
    const fileExt = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

    if (purpose === "announcement_image") {
      const validMimes = ["image/png", "image/jpeg"];
      const validExts = [".png", ".jpg", ".jpeg"];
      if (!validMimes.includes(fileType) || !validExts.includes(fileExt)) {
        setError(
          language === "bm"
            ? "Format fail tidak disokong. Sila muat naik fail PNG, JPG atau JPEG."
            : "Format fail tidak disokong. Sila muat naik fail PNG, JPG atau JPEG."
        );
        return;
      }
    } else {
      const isMimeMatch = cfg.mimeTypes.includes(fileType);
      const isExtMatch = cfg.accept.split(",").includes(fileExt);

      if (!isMimeMatch && !isExtMatch) {
        setError(
          language === "bm"
            ? "Jenis fail tidak disokong."
            : "Unsupported file type."
        );
        return;
      }
    }

    setBusy(true);
    try {
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (isDemoMode) {
        // In Demo Mode, simulate successful upload and return base64
        setSuccess(true);
        onUploadSuccess(base64Data);
      } else {
        const payload = {
          idToken,
          file: {
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            data: base64Data
          },
          prefix: `LFX_${purpose.toUpperCase()}`,
          purpose
        };

        const result = await apiPost<{ url: string }>("file/upload", payload);
        if (result.ok && result.data?.url) {
          setSuccess(true);
          onUploadSuccess(result.data.url);
        } else {
          throw new Error(result.error || "Upload failed");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during upload.");
    } finally {
      setBusy(false);
    }
  };

  const isImage = currentUrl && (
    currentUrl.startsWith("data:image/") ||
    currentUrl.toLowerCase().match(/\.(png|jpeg|jpg|gif|webp|svg|ico)/) ||
    currentUrl.includes("drive.google.com/uc") ||
    purpose !== "announcement_pdf"
  );

  return (
    <div className="media-uploader-box" style={{ border: "1px solid var(--line)", padding: "16px", borderRadius: "8px", background: "var(--soft-bg)", display: "flex", flexDirection: "column", gap: "12px" }}>
      {label && <span style={{ fontWeight: "bold", fontSize: "0.9rem" }}>{label}</span>}

      {currentUrl && (
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          {isImage ? (
            <div style={{ width: "80px", height: "80px", position: "relative", border: "1px solid var(--line)", borderRadius: "4px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-muted)" }}>
              <MediaImage src={currentUrl} alt="Preview" variant={purpose === "logo" || purpose === "favicon" ? "logo" : purpose === "officer_photo" ? "officer-avatar" : "thumbnail"} />
            </div>
          ) : (
            <div style={{ width: "80px", height: "80px", border: "1px solid var(--line)", borderRadius: "4px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fee2e2" }}>
              <Icon name="megaphone" size={32} />
              <span style={{ fontSize: "0.7rem", fontWeight: "bold" }}>PDF</span>
            </div>
          )}

          <div style={{ flex: 1, minWidth: "150px" }}>
            <span style={{ display: "block", fontSize: "0.78rem", color: "var(--muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              {currentUrl}
            </span>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              {onRemove && (
                <button
                  type="button"
                  className="button button--small button--outline"
                  onClick={onRemove}
                  style={{ color: "red", borderColor: "rgba(255,0,0,0.3)" }}
                >
                  {language === "bm" ? "Buang" : "Remove"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label className="button button--outline" style={{ display: "inline-flex", alignSelf: "flex-start", cursor: "pointer", gap: "8px" }}>
          <Icon name="upload" size={16} />
          {busy ? (language === "bm" ? "Memuat naik..." : "Uploading...") : (language === "bm" ? "Pilih Fail" : "Choose File")}
          <input
            type="file"
            accept={CONFIG[purpose].accept}
            onChange={handleUpload}
            disabled={busy}
            style={{ display: "none" }}
          />
        </label>

        {fileName && <small style={{ color: "var(--muted)" }}>{fileName}</small>}
        {success && <span style={{ color: "green", fontSize: "0.85rem" }}>✓ {language === "bm" ? "Berjaya dimuat naik!" : "Upload successful!"}</span>}
        {error && <span style={{ color: "red", fontSize: "0.85rem" }}>⚠ {error}</span>}
      </div>
    </div>
  );
}
