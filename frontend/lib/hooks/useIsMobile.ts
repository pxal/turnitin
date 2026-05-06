"use client";

import { useEffect, useState } from "react";

export function useIsMobile(breakpoint = 960) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function syncViewport() {
      setIsMobile(window.innerWidth < breakpoint);
    }

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, [breakpoint]);

  return isMobile;
}
