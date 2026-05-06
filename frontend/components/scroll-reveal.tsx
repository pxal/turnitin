"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const selectors = ".reveal:not(.reveal-visible)";

    const revealIfInViewport = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const verticalOffset = Math.min(80, viewportHeight * 0.12);

      const isVisible =
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        rect.top <= viewportHeight - verticalOffset &&
        rect.left <= viewportWidth;

      if (isVisible) {
        element.classList.add("reveal-visible");
      }
    };

    const observeElements = (observer?: IntersectionObserver) => {
      const elements = document.querySelectorAll(selectors);
      elements.forEach((element) => {
        revealIfInViewport(element);

        if (observer && !element.classList.contains("reveal-visible")) {
          observer.observe(element);
        }
      });
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(".reveal").forEach((element) => {
        element.classList.add("reveal-visible");
      });
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      document.querySelectorAll(".reveal").forEach((element) => {
        element.classList.add("reveal-visible");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -10% 0px"
      }
    );

    observeElements(observer);

    const mutationObserver = new MutationObserver(() => {
      observeElements(observer);
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    const handleViewportChange = () => {
      observeElements(observer);
    };

    window.addEventListener("load", handleViewportChange);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("load", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
    };
  }, [pathname]);

  return null;
}
