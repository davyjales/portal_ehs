"use client";

import { useEffect } from "react";

const DEFAULT_BRIDGE_URL = "http://127.0.0.1:8080";
const PING_INTERVAL_MS = 2 * 60 * 1000;

function bridgeUrl(): string {
  if (typeof window === "undefined") return DEFAULT_BRIDGE_URL;
  return process.env.NEXT_PUBLIC_FUTRONIC_BRIDGE_URL ?? DEFAULT_BRIDGE_URL;
}

/**
 * Solicita pulso no Futronic Bridge local, que simula atividade no Windows
 * para evitar bloqueio de sessão (Win+L automático por inatividade).
 *
 * Requer o bridge rodando no PC do totem (start-bridge.bat).
 * O navegador sozinho não consegue impedir o bloqueio do Windows.
 */
export function useSessionKeepAlive(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let cancelled = false;

    async function pingBridge() {
      if (cancelled || document.hidden) return;

      try {
        await fetch(`${bridgeUrl()}/keepalive/pulse`, { method: "POST" });
      } catch {
        /* bridge não está rodando — keepalive nativo indisponível */
      }
    }

    void pingBridge();
    const timer = setInterval(() => void pingBridge(), PING_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled]);
}
