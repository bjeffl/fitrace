"use client";

import { motion } from "framer-motion";
import type { ActivityStatus } from "@/lib/types";

interface RacerTrailProps {
  progressPct: number;
  status: ActivityStatus;
  totalPosts: number;
  trackWidth: number;
  y: number;
}

const trailColors: Record<ActivityStatus, string> = {
  sleeping: "transparent",
  active: "#22c55e",
  warm: "#eab308",
  cold: "#f97316",
  inactive: "#ef4444",
  finished: "#fbbf24",
};

const glowColors: Record<ActivityStatus, string> = {
  sleeping: "transparent",
  active: "#22c55e",
  warm: "#eab308",
  cold: "#f97316",
  inactive: "#ef4444",
  finished: "#fbbf24",
};

export default function RacerTrail({
  progressPct,
  status,
  totalPosts,
  trackWidth,
  y,
}: RacerTrailProps) {
  if (status === "sleeping" || progressPct === 0) return null;

  const trailWidth = (progressPct / 100) * trackWidth;
  const color = trailColors[status];
  const glowColor = glowColors[status];

  // Glow intensity based on posting frequency (1-10 posts maps to 0.1-0.6 opacity)
  const glowOpacity = Math.min(0.1 + totalPosts * 0.05, 0.6);
  // Trail thickness based on frequency
  const trailHeight = Math.min(4 + totalPosts * 0.5, 10);

  const filterId = `glow-${status}-${y}`;

  return (
    <g>
      <defs>
        <filter id={filterId} x="-20%" y="-100%" width="140%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feFlood floodColor={glowColor} floodOpacity={glowOpacity} />
          <feComposite in2="blur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Glow layer */}
      <motion.rect
        x={0}
        initial={{ width: 0 }}
        animate={{ width: trailWidth }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
        y={y - trailHeight / 2}
        height={trailHeight}
        rx={trailHeight / 2}
        fill={color}
        filter={`url(#${filterId})`}
        opacity={0.7}
      />

      {/* Core trail */}
      <motion.rect
        x={0}
        initial={{ width: 0 }}
        animate={{ width: trailWidth }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
        y={y - 2}
        height={4}
        rx={2}
        fill={color}
        opacity={0.9}
      />
    </g>
  );
}
