"use client";

import { motion } from "framer-motion";
import type { ActivityStatus } from "@/lib/types";

interface RacerAvatarProps {
  avatarUrl: string | null;
  displayName: string;
  status: ActivityStatus;
  size?: number;
}

const statusOverlays: Record<ActivityStatus, React.ReactNode> = {
  sleeping: null,
  active: null,
  warm: null,
  cold: null,
  inactive: null,
  finished: (
    <text x="50%" y="20%" textAnchor="middle" fontSize="16">
      👑
    </text>
  ),
};

const statusGrayscale: Record<ActivityStatus, string> = {
  sleeping: "grayscale(100%) opacity(0.5)",
  active: "none",
  warm: "none",
  cold: "saturate(0.5)",
  inactive: "saturate(0.3) brightness(0.8)",
  finished: "none",
};

export default function RacerAvatar({
  avatarUrl,
  displayName,
  status,
  size = 48,
}: RacerAvatarProps) {
  const r = size / 2;
  const clipId = `avatar-clip-${displayName.replace(/\s/g, "-")}`;

  return (
    <motion.g
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={r} cy={r} r={r - 2} />
        </clipPath>
      </defs>

      {/* Avatar circle */}
      <circle
        cx={r}
        cy={r}
        r={r - 1}
        fill="#e2e8f0"
        stroke={status === "finished" ? "#fbbf24" : "#cbd5e1"}
        strokeWidth={status === "finished" ? 3 : 2}
      />

      {avatarUrl ? (
        <image
          href={avatarUrl}
          x={2}
          y={2}
          width={size - 4}
          height={size - 4}
          clipPath={`url(#${clipId})`}
          style={{ filter: statusGrayscale[status] }}
        />
      ) : (
        <text
          x={r}
          y={r + 5}
          textAnchor="middle"
          fontSize={size * 0.4}
          fill="#64748b"
          fontWeight="bold"
        >
          {displayName.charAt(0).toUpperCase()}
        </text>
      )}

      {/* Status overlay */}
      {statusOverlays[status]}
    </motion.g>
  );
}
