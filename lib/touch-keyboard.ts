import type { FocusEvent, PointerEvent, TouchEvent } from "react";

type TextFieldElement = HTMLInputElement | HTMLTextAreaElement;

const BRIDGE_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_BIOMETRIC_BRIDGE_URL || "http://127.0.0.1:8080"
    : "http://127.0.0.1:8080";

const BRIDGE_COOLDOWN_MS = 800;
let lastBridgeInvoke = 0;

function isWindows(): boolean {
  if (typeof window === "undefined") return false;
  return /Windows NT/i.test(navigator.userAgent);
}

function invokeBridgeTouchKeyboard() {
  if (!isWindows()) return;

  const now = Date.now();
  if (now - lastBridgeInvoke < BRIDGE_COOLDOWN_MS) return;
  lastBridgeInvoke = now;

  fetch(`${BRIDGE_URL}/touch-keyboard/show`, { method: "POST" }).catch(() => {
    /* bridge offline — fallbacks abaixo continuam */
  });
}

function showVirtualKeyboard(el: TextFieldElement, invokeBridge = true, fromTouch = false) {
  // Nunca usar readOnly no input: no Windows isso impede digitação física
  // e em alguns totems deixa o campo “morto”.
  el.focus({ preventScroll: true });

  if ("virtualKeyboard" in navigator) {
    const vk = navigator.virtualKeyboard as { show?: () => void; overlaysContent?: boolean };
    if (typeof vk.show === "function") {
      vk.overlaysContent = true;
      vk.show();
    }
  }

  // Bridge / teclado touch só quando a interação veio de touch (totem).
  if (isWindows() && fromTouch && invokeBridge) {
    invokeBridgeTouchKeyboard();
  }
}

function bindDomElement(el: TextFieldElement) {
  const onPointerDown = (event: Event) => {
    const pe = event as globalThis.PointerEvent;
    if (pe.pointerType === "mouse" && pe.buttons !== 1) return;
    const fromTouch = pe.pointerType === "touch" || pe.pointerType === "pen";
    showVirtualKeyboard(el, true, fromTouch);
  };

  const onFocus = () => {
    showVirtualKeyboard(el, false, false);
  };

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("focus", onFocus);

  return () => {
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("focus", onFocus);
  };
}

export function bindTouchKeyboardElement(el: TextFieldElement) {
  return bindDomElement(el);
}

export function touchKeyboardProps() {
  return {
    inputMode: "text" as const,
    onFocus: (e: FocusEvent<TextFieldElement>) => {
      showVirtualKeyboard(e.currentTarget, false, false);
    },
    onPointerDown: (e: PointerEvent<TextFieldElement>) => {
      if (e.pointerType === "mouse" && e.buttons !== 1) return;
      const fromTouch = e.pointerType === "touch" || e.pointerType === "pen";
      showVirtualKeyboard(e.currentTarget, true, fromTouch);
    },
    onTouchStart: (e: TouchEvent<TextFieldElement>) => {
      showVirtualKeyboard(e.currentTarget, true, true);
    },
  };
}

export function touchKeyboardNumericProps() {
  return {
    inputMode: "numeric" as const,
    onFocus: (e: FocusEvent<TextFieldElement>) => {
      showVirtualKeyboard(e.currentTarget, false, false);
    },
    onPointerDown: (e: PointerEvent<TextFieldElement>) => {
      if (e.pointerType === "mouse" && e.buttons !== 1) return;
      const fromTouch = e.pointerType === "touch" || e.pointerType === "pen";
      showVirtualKeyboard(e.currentTarget, true, fromTouch);
    },
    onTouchStart: (e: TouchEvent<TextFieldElement>) => {
      showVirtualKeyboard(e.currentTarget, true, true);
    },
  };
}
