"use client";

import { useEffect, useRef } from "react";

export function useKeepFormVisible(refreshKey: string) {
  const previousRefreshKey = useRef(refreshKey);
  const waitingForRefresh = useRef(false);

  useEffect(() => {
    if (previousRefreshKey.current === refreshKey) return;
    previousRefreshKey.current = refreshKey;
    if (!waitingForRefresh.current) return;
    waitingForRefresh.current = false;

    // Clear any old history anchor before restoring the form's page position.
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
  }, [refreshKey]);

  return () => {
    waitingForRefresh.current = true;
  };
}
