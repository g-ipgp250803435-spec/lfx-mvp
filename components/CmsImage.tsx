"use client";

export function CmsImage({ src, alt, className, width, height, loading = "lazy" }: { src?: string; alt: string; className?: string; width?: number; height?: number; loading?: "eager" | "lazy" }) {
  return <img src={src || "/asset-placeholder.svg"} alt={alt} className={className} width={width} height={height} loading={loading}/>;
}
