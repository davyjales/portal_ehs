"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";

type PinchZoomImageProps = {
  src: string;
  alt: string;
  className?: string;
  onTap?: () => void;
  onUserInteract?: () => void;
};

export function PinchZoomImage({ src, alt, className = "", onTap, onUserInteract }: PinchZoomImageProps) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{
    initialDistance: number;
    initialScale: number;
    lastTouch: { x: number; y: number } | null;
    isPinching: boolean;
  }>({ initialDistance: 0, initialScale: 1, lastTouch: null, isPinching: false });

  const getDistance = (t0: React.Touch, t1: React.Touch) => {
    const dx = t0.clientX - t1.clientX;
    const dy = t0.clientY - t1.clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        onUserInteract?.();
        pinchRef.current.isPinching = true;
        pinchRef.current.initialDistance = getDistance(e.touches[0]!, e.touches[1]!);
        pinchRef.current.initialScale = scale;
      } else if (e.touches.length === 1 && scale > 1) {
        pinchRef.current.lastTouch = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY };
      }
    },
    [scale, onUserInteract]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current.isPinching) {
        e.preventDefault();
        const dist = getDistance(e.touches[0]!, e.touches[1]!);
        const newScale = Math.min(
          4,
          Math.max(1, pinchRef.current.initialScale * (dist / pinchRef.current.initialDistance))
        );
        setScale(newScale);
        if (newScale <= 1) setTranslate({ x: 0, y: 0 });
      } else if (e.touches.length === 1 && scale > 1 && pinchRef.current.lastTouch) {
        const dx = e.touches[0]!.clientX - pinchRef.current.lastTouch.x;
        const dy = e.touches[0]!.clientY - pinchRef.current.lastTouch.y;
        pinchRef.current.lastTouch = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY };
        setTranslate((t) => ({ x: t.x + dx, y: t.y + dy }));
      }
    },
    [scale]
  );

  const handleTouchEnd = useCallback(() => {
    pinchRef.current.isPinching = false;
    pinchRef.current.lastTouch = null;
    if (scale <= 1.05) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    }
  }, [scale]);

  const handleDoubleClick = useCallback(() => {
    onUserInteract?.();
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  }, [scale, onUserInteract]);

  return (
    <div
      className={`relative w-full overflow-hidden touch-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
      onClick={() => {
        if (scale <= 1 && onTap) onTap();
      }}
      style={{ cursor: scale > 1 ? "grab" : onTap ? "zoom-in" : "default" }}
    >
      <div
        className="relative w-full transition-transform duration-75"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={800}
          height={800}
          className="w-full h-auto max-h-[70vh] object-contain mx-auto"
          sizes="(max-width: 640px) 100vw, 384px"
          draggable={false}
        />
      </div>
    </div>
  );
}

export function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-label="Imagem ampliada"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white text-xl hover:bg-white/30 z-10"
        aria-label="Fechar"
      >
        ×
      </button>
      <div className="max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
        <PinchZoomImage src={src} alt={alt} />
      </div>
    </div>
  );
}
