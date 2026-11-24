"use client";

import { useEffect, useRef } from "react";

export function useKeepFormVisible(active: boolean) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!active) return;

    // A hash antiga (por exemplo, #historico) faz o navegador voltar à lista
    // quando o conteúdo da página é atualizado.
    if (window.location.hash) {
      const url = new URL(window.location.href);
      url.hash = "";
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
    }

    const scrollToTop = () => window.scrollTo({ behavior: "auto", left: 0, top: 0 });
    scrollToTop();
    const frame = window.requestAnimationFrame(scrollToTop);
    const timeout = window.setTimeout(scrollToTop, 150);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [active]);

  return formRef;
}
