"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

type DetectorResult = { rawValue: string };
type BarcodeDetectorLike = { detect: (source: ImageBitmapSource) => Promise<DetectorResult[]> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

export function QrScanner({ onScan }: { onScan: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const start = async () => {
      const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (!Detector) { setError("Camera QR scanning is not supported in this browser. Use the manual field."); setActive(false); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new Detector({ formats: ["qr_code"] });
        const scan = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            if (results[0]?.rawValue) { onScan(results[0].rawValue); setActive(false); return; }
          } catch { /* keep scanning */ }
          frame = requestAnimationFrame(scan);
        };
        frame = requestAnimationFrame(scan);
      } catch { setError("Camera permission was denied or unavailable."); setActive(false); }
    };
    void start();
    return () => { stopped = true; cancelAnimationFrame(frame); stream?.getTracks().forEach((track) => track.stop()); };
  }, [active, onScan]);

  return <div className="qr-scanner"><button type="button" className="button button--outline" onClick={() => { setError(""); setActive(!active); }}><Icon name="camera" size={17}/>{active ? "Stop camera" : "Scan with camera"}</button>{active && <video ref={videoRef} muted playsInline/>}{error && <small className="error-text">{error}</small>}</div>;
}
