"use client";

import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconInfoCircle,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import NavLink from "./link";

export default function SideNav() {
  const [onMount, setOnMount] = useState(false);
  const [isOpen, setOpen] = useState(true);

  useEffect(() => {
    setOnMount(true);
  }, []);

  if (onMount) {
    const isMobile = window.innerWidth < 640;
    const initial = isMobile ? { y: "100vh" } : { x: "-100vw" };

    const toggleSideNav = () => {
      setOpen((prev) => !prev);
    };

    return (
      <>
        <AnimatePresence>
          {!isOpen && (
            <div className="w-full flex justify-center">
              <motion.span
                className="absolute top-10 gap-2 mx-auto flex backdrop-filter backdrop-blur-md py-2 px-4 rounded-lg ring-4 ring-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <IconInfoCircle />
                have a look around!
              </motion.span>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="h-1/2 sm:h-full w-full sm:w-1/2 top-1/2 sm:top-0 flex flex-col bg-blue-950 bg-opacity-40 absolute left-0 backdrop-filter backdrop-blur-md select-none z-20"
              initial={initial}
              exit={initial}
              animate={{ x: 0, y: 0 }}
              transition={{
                duration: 0.8,
                initialDelay: 1,
                ease: [0, 0.71, 0.2, 1.01],
              }}
            >
              <button
                className="self-center sm:self-end p-4"
                onClick={toggleSideNav}
              >
                {isMobile ? <IconArrowDown /> : <IconArrowLeft />}
              </button>
              <div className="sm:max-w-80 px-8 flex flex-col gap-10 self-end">
                <div className="flex flex-col gap-6">
                  <h1 className="text-4xl font-extrabold">Welcome! 👋🏻</h1>
                  <p>
                    I&apos;m Kyle, a senior web dev with 7+ years experience in
                    Software Development.
                  </p>
                </div>

                <nav className="flex flex-col gap-4 sm:gap-0">
                  <NavLink url="/about" text="about" />
                  <NavLink url="/portfolio" text="portfolio" />
                </nav>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isOpen && (
            <div className="w-full flex justify-center">
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-0 sm:bottom-auto sm:top-0 sm:left-0 p-4 z-10"
                onClick={toggleSideNav}
              >
                {isMobile ? <IconArrowUp /> : <IconArrowRight />}
              </motion.button>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }
}
