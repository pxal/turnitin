"use client";

import dynamic from "next/dynamic";

const Hero = dynamic(() => import("./hero"), {
  ssr: false
});

export default function HeroShell() {
  return <Hero />;
}
