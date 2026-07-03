"use client";

import { useEffect } from "react";

/**
 * Evita que a tela APAGUE (dim/standby) durante o informativo.
 * Não impede bloqueio de sessão Win+L — isso é tratado pelo Futronic Bridge
 * via lib/session-keepalive.ts (código nativo Windows no PC do totem).
 */
export function useScreenWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    let wakeLock: WakeLockSentinel | null = null;
    let fallbackVideo: HTMLVideoElement | null = null;
    let cancelled = false;

    async function acquireWakeLock() {
      if (cancelled || document.visibilityState !== "visible") return;

      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
          wakeLock.addEventListener("release", () => {
            wakeLock = null;
          });
          return;
        }
      } catch {
        /* fallback abaixo */
      }

      if (!fallbackVideo) {
        fallbackVideo = document.createElement("video");
        fallbackVideo.setAttribute("playsinline", "");
        fallbackVideo.muted = true;
        fallbackVideo.loop = true;
        fallbackVideo.src =
          "data:video/mp4;base64,AAAAHGZ0eXBpc29tAAAAGm1vb2YAAABsbXZoZAAAAABzaW1wAAAAJGRpbmYAAAAcZGF0YQAAAAEAAAAATGF2ZjU4LjI5LjEwMA==";
        fallbackVideo.style.cssText =
          "position:fixed;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;";
        document.body.appendChild(fallbackVideo);
        void fallbackVideo.play().catch(() => {});
      }
    }

    function releaseWakeLock() {
      void wakeLock?.release();
      wakeLock = null;
      fallbackVideo?.remove();
      fallbackVideo = null;
    }

    void acquireWakeLock();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void acquireWakeLock();
      } else {
        releaseWakeLock();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      releaseWakeLock();
    };
  }, [enabled]);
}
