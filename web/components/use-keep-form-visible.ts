"use client";

import { useEffect, useRef } from "react";

export function useKeepFormVisible(active: boolean) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!active) return;

    const frame = window.requestAnimationFrame(() => {
      const form = formRef.current;
      if (!form) return;

      const bounds = form.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
        form.scrollIntoView({ behavior: "auto", block: "start" });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [active]);

  return formRef;
}
