"use client";

import { useEffect } from "react";
import { bindTouchKeyboardElement } from "@/lib/touch-keyboard";

function isTextField(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
    return false;
  }

  if (el instanceof HTMLInputElement) {
    const type = el.type.toLowerCase();
    if (type === "radio" || type === "checkbox" || type === "hidden" || type === "submit" || type === "button") {
      return false;
    }
  }

  return !el.disabled && !el.readOnly;
}

export function TouchKeyboardActivator() {
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    function bindField(el: HTMLInputElement | HTMLTextAreaElement) {
      if (el.dataset.touchKeyboardBound === "1") return;
      el.dataset.touchKeyboardBound = "1";
      cleanups.push(bindTouchKeyboardElement(el));
    }

    function scanFields(root: ParentNode) {
      root.querySelectorAll("input, textarea").forEach((node) => {
        if (isTextField(node)) {
          bindField(node);
        }
      });
    }

    function onFocusIn(event: FocusEvent) {
      if (isTextField(event.target)) {
        bindField(event.target);
      }
    }

    scanFields(document);
    document.addEventListener("focusin", onFocusIn);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
            if (isTextField(node)) bindField(node);
            return;
          }

          if (node instanceof HTMLElement) {
            scanFields(node);
          }
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return null;
}
