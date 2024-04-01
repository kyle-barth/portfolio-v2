"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import NavLink from "./link";

export default function SideNav() {
  const [onMount, setOnMount] = useState(false);

  useEffect(() => {
    setOnMount(true);
  }, []);

  if (onMount) {
    const isMobile = window.innerWidth < 640;

    const initial = isMobile
      ? { translateY: window.innerHeight }
      : { translateX: -window.innerWidth };

    return (
      <motion.div
        className="h-1/2 sm:h-full w-full sm:w-1/2 top-1/2 sm:top-0 flex justify-end bg-blue-950 bg-opacity-40 absolute left-0 backdrop-filter backdrop-blur-md select-none"
        initial={initial}
        animate={{ translateX: 0, translateY: 0 }}
        transition={{
          duration: 0.8,
          delay: 1,
          ease: [0, 0.71, 0.2, 1.01],
        }}
      >
        <div className="sm:max-w-80 p-8 flex flex-col gap-10">
          <div className="flex flex-col gap-6">
            <h1 className="text-4xl font-extrabold">Welcome! 👋🏻</h1>
            <p>
              I&apos;m Kyle, a senior web dev with 7+ years experience in Software
              Development.
            </p>
          </div>

          <nav className="flex flex-col gap-4 sm:gap-0">
            <NavLink url="/about" text="about" />
            <NavLink url="/portfolio" text="portfolio" />
          </nav>
        </div>
      </motion.div>
    );
  }
}
