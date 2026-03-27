"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CountdownProps {
  startDate: string;
  raceName: string;
  onComplete: () => void;
}

function getTimeLeft(target: Date) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

export default function Countdown({ startDate, raceName, onComplete }: CountdownProps) {
  const target = new Date(startDate);
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(target));
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const left = getTimeLeft(target);
      if (!left) {
        clearInterval(interval);
        setFading(true);
        setTimeout(onComplete, 1000);
        return;
      }
      setTimeLeft(left);
    }, 1000);

    return () => clearInterval(interval);
  }, [startDate, onComplete, target]);

  // Allow clicking through to skip countdown
  function handleSkip() {
    setFading(true);
    setTimeout(onComplete, 600);
  }

  if (!timeLeft) return null;

  return (
    <AnimatePresence>
      {!fading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white px-4 cursor-pointer"
          onClick={handleSkip}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center"
          >
            <p className="text-sm uppercase tracking-widest text-zinc-500 mb-6">
              {raceName}
            </p>

            {/* Big number */}
            <div className="mb-4">
              <span className="text-[120px] sm:text-[160px] font-bold leading-none tracking-tight">
                {timeLeft.days}
              </span>
            </div>
            <p className="text-2xl font-light text-zinc-300 mb-12">
              {timeLeft.days === 1 ? "day" : "days"} left
            </p>

            {/* Smaller time units */}
            <div className="flex gap-8 justify-center text-zinc-500">
              <div className="text-center">
                <span className="text-2xl font-semibold text-zinc-300">
                  {String(timeLeft.hours).padStart(2, "0")}
                </span>
                <p className="text-xs mt-1">hours</p>
              </div>
              <div className="text-center">
                <span className="text-2xl font-semibold text-zinc-300">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </span>
                <p className="text-xs mt-1">min</p>
              </div>
              <div className="text-center">
                <span className="text-2xl font-semibold text-zinc-300">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
                <p className="text-xs mt-1">sec</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 mt-16">
              Tap anywhere to continue
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
