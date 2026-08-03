"use client";

import React, { useState } from "react";
import { Icon } from "@/components/Icon";

export type MediaImageVariant = "logo" | "poster" | "officer-avatar" | "thumbnail" | "full-view";

// URL extraction of Google Drive File ID
export function getGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  // Match ?id=FILE_ID or &id=FILE_ID
  const matchId = url.match(/[?&]id=([^&]+)/);
  if (matchId) return matchId[1];

  // Match /file/d/FILE_ID/view or /file/d/FILE_ID
  const matchFileD = url.match(/\/file\/d\/([^/]+)/);
  if (matchFileD) return matchFileD[1];

  return null;
}

// Convert Google Drive view URLs to direct stream content URLs to prevent HTML virus warnings
export function optimizeImageUrl(url?: string): string {
  if (!url) return "";
  const driveId = getGoogleDriveFileId(url);
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }
  return url;
}

interface MediaImageProps {
  src?: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  variant?: MediaImageVariant;
  style?: React.CSSProperties;
}

export function MediaImage({
  src,
  alt,
  className,
  width,
  height,
  loading = "lazy",
  variant = "thumbnail",
  style
}: MediaImageProps) {
  const [prevSrc, setPrevSrc] = useState<string | undefined>(src);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(src ? "loading" : "error");

  // Standard React pattern to adjust state when props change (avoiding useEffect cascading renders)
  if (src !== prevSrc) {
    setPrevSrc(src);
    setStatus(src ? "loading" : "error");
  }

  const handleLoad = () => {
    setStatus("loaded");
  };

  const handleError = () => {
    setStatus("error");
  };

  const optimized = optimizeImageUrl(src);

  // Variant styles and classes
  let objectFit: React.CSSProperties["objectFit"] = "cover";
  if (variant === "logo" || variant === "poster" || variant === "full-view") {
    objectFit = "contain";
  }

  const baseImageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit,
    transition: "opacity 0.2s ease-in-out",
    opacity: status === "loaded" ? 1 : 0,
    ...style
  };

  // Theme-aware containers
  const containerStyle: React.CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: width ? `${width}px` : "100%",
    height: height ? `${height}px` : "100%",
    overflow: "hidden"
  };

  if (variant === "logo") {
    // Add subtle contrast background for transparent logos
    containerStyle.background = "var(--surface-muted)";
    containerStyle.border = "1px solid var(--border)";
    containerStyle.borderRadius = "8px";
    containerStyle.padding = "4px";
  } else if (variant === "poster") {
    containerStyle.background = "var(--background-elevated)";
    containerStyle.borderRadius = "8px";
  } else if (variant === "officer-avatar") {
    containerStyle.borderRadius = "50%";
    containerStyle.background = "var(--brand-soft)";
  }

  return (
    <div className={`media-image-container ${className || ""}`} style={containerStyle}>
      {/* Loading state: shimmer/placeholder */}
      {status === "loading" && (
        <div
          className="media-shimmer"
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, var(--surface) 25%, var(--surface-hover) 50%, var(--surface) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite linear"
          }}
        />
      )}

      {/* Shimmer animation keyframe stylesheet */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Error state: accessible icon fallback */}
      {status === "error" && (
        <div
          className="media-error"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: "var(--background-elevated)",
            color: "var(--text-muted)",
            padding: "8px",
            textAlign: "center"
          }}
        >
          <Icon name={variant === "logo" ? "shield" : variant === "officer-avatar" ? "user" : "file"} size={24} />
          <span style={{ fontSize: "0.68rem", fontWeight: "bold" }}>
            {variant === "logo" ? "No Logo" : variant === "officer-avatar" ? "No Avatar" : "No Image"}
          </span>
        </div>
      )}

      {/* Actual image element */}
      {optimized && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={optimized}
          alt={alt || "Media Image"}
          style={baseImageStyle}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}

// Retrofitted CmsImage using MediaImage internally
export function CmsImage({
  src,
  alt,
  className,
  width,
  height,
  loading = "lazy",
  variant = "thumbnail"
}: {
  src?: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: "eager" | "lazy";
  variant?: MediaImageVariant;
}) {
  return (
    <MediaImage
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={loading}
      variant={variant}
    />
  );
}
