"use client";

import QRCode from "qrcode";
import { useEffect, useRef } from "react";

export function QrCodeCanvas({ value, size = 260 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current || !value) return;
    void QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 2, errorCorrectionLevel: "M" });
  }, [value, size]);
  return <canvas ref={canvasRef} width={size} height={size} aria-label="QR code"/>;
}
