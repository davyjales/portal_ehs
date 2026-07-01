import type { FocusEvent, TouchEvent } from "react";

type TextFieldElement = HTMLInputElement | HTMLTextAreaElement;

function isWindowsTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isWindows = /Windows NT/i.test(ua);
  const hasTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  return isWindows && hasTouch;
}

function showVirtualKeyboard(el: TextFieldElement) {
  el.focus();

  if ("virtualKeyboard" in navigator) {
    const vk = navigator.virtualKeyboard as { show?: () => void; overlaysContent?: boolean };
    if (typeof vk.show === "function") {
      vk.overlaysContent = true;
      vk.show();
      return;
    }
  }

  if (isWindowsTouchDevice()) {
    el.readOnly = true;
    requestAnimationFrame(() => {
      el.readOnly = false;
      el.focus();
    });
  }
}

export function touchKeyboardProps() {
  return {
    inputMode: "text" as const,
    onFocus: (e: FocusEvent<TextFieldElement>) => {
      showVirtualKeyboard(e.currentTarget);
    },
    onTouchStart: (e: TouchEvent<TextFieldElement>) => {
      showVirtualKeyboard(e.currentTarget);
    },
  };
}

export function touchKeyboardNumericProps() {
  return {
    inputMode: "numeric" as const,
    onFocus: (e: FocusEvent<TextFieldElement>) => {
      showVirtualKeyboard(e.currentTarget);
    },
    onTouchStart: (e: TouchEvent<TextFieldElement>) => {
      showVirtualKeyboard(e.currentTarget);
    },
  };
}
