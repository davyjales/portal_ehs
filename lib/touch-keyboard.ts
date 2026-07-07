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

function windowsInputTrick(el: TextFieldElement) {
  const wasReadOnly = el.readOnly;
  el.readOnly = true;
  el.focus({ preventScroll: true });

  window.setTimeout(() => {
    el.readOnly = wasReadOnly;
    el.focus({ preventScroll: true });
  }, 80);
}

function showVirtualKeyboard(el: TextFieldElement, invokeBridge = true) {
  el.focus({ preventScroll: true });

  if ("virtualKeyboard" in navigator) {
    const vk = navigator.virtualKeyboard as { show?: () => void; overlaysContent?: boolean };
    if (typeof vk.show === "function") {
      vk.overlaysContent = true;
      vk.show();
    }
  }

  if (isWindows()) {
    windowsInputTrick(el);
    if (invokeBridge) {
      invokeBridgeTouchKeyboard();
    }
  }
}

function bindDomElement(el: TextFieldElement) {
  const onPointerDown = (event: Event) => {
    if (event.pointerType === "mouse" && event.buttons !== 1) return;
    showVirtualKeyboard(el, true);
  };

  const onFocus = () => {
    showVirtualKeyboard(el, false);
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
      showVirtualKeyboard(e.currentTarget, false);
    },
    onPointerDown: (e: PointerEvent<TextFieldElement>) => {
      if (e.pointerType === "mouse" && e.buttons !== 1) return;
      showVirtualKeyboard(e.currentTarget, true);
    },
    onTouchStart: (e: TouchEvent<TextFieldElement>) => {
      showVirtualKeyboard(e.currentTarget, true);
    },
  };
}

export function touchKeyboardNumericProps() {
  return {
    inputMode: "numeric" as const,
    onFocus: (e: FocusEvent<TextFieldElement>) => {
      showVirtualKeyboard(e.currentTarget, false);
    },
    onPointerDown: (e: PointerEvent<TextFieldElement>) => {
      if (e.pointerType === "mouse" && e.buttons !== 1) return;
      showVirtualKeyboard(e.currentTarget, true);
    },
    onTouchStart: (e: TouchEvent<TextFieldElement>) => {
      showVirtualKeyboard(e.currentTarget, true);
    },
  };
}
