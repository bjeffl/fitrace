"use client";

import { motion } from "framer-motion";
import RacerAvatar from "./RacerAvatar";
import RacerTrail from "./RacerTrail";
import type { RacerData } from "@/lib/types";

interface RacerProps {
  racer: RacerData;
  laneIndex: number;
  trackWidth: number;
  laneHeight: number;
  startX: number;
}

// Animated running body using CSS keyframe-style SVG animation
function RunnerBody({ status }: { status: string }) {
  const bodyColor =
    status === "sleeping"
      ? "#94a3b8"
      : status === "inactive"
        ? "#f87171"
        : status === "cold"
          ? "#fb923c"
          : status === "warm"
            ? "#facc15"
            : status === "finished"
              ? "#fbbf24"
              : "#34d399";

  const isSleeping = status === "sleeping";
  const isFinished = status === "finished";

  // Animation speed based on activity
  const legSpeed = status === "active" ? 0.3 : status === "warm" ? 0.5 : 0.8;

  if (isSleeping) {
    // Lounging/lying down pose - body extends from where neck would be
    return (
      <g>
        {/* Neck connecting head to body */}
        <line x1="10" y1="-2" x2="14" y2="4" stroke={bodyColor} strokeWidth="3" strokeLinecap="round" />
        {/* Torso - lying flat, slightly reclined */}
        <line x1="14" y1="4" x2="36" y2="6" stroke={bodyColor} strokeWidth="3" strokeLinecap="round" />
        {/* Arm draped over belly */}
        <line x1="22" y1="4" x2="24" y2="10" stroke={bodyColor} strokeWidth="2" strokeLinecap="round" />
        {/* Other arm behind head */}
        <line x1="14" y1="4" x2="6" y2="0" stroke={bodyColor} strokeWidth="2" strokeLinecap="round" />
        {/* Legs stretched out */}
        <line x1="36" y1="6" x2="46" y2="10" stroke={bodyColor} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="36" y1="6" x2="46" y2="4" stroke={bodyColor} strokeWidth="2.5" strokeLinecap="round" />

        {/* Animated ZZZ floating up from head area */}
        <motion.text
          x="-2" y="-8"
          fontSize="8" fontWeight="bold" fill="#94a3b8"
          animate={{ opacity: [0, 1, 0], y: [-8, -16, -24] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          z
        </motion.text>
        <motion.text
          x="4" y="-14"
          fontSize="11" fontWeight="bold" fill="#94a3b8"
          animate={{ opacity: [0, 1, 0], y: [-14, -24, -32] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          Z
        </motion.text>
        <motion.text
          x="10" y="-20"
          fontSize="14" fontWeight="bold" fill="#94a3b8"
          animate={{ opacity: [0, 1, 0], y: [-20, -32, -42] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1.0 }}
        >
          Z
        </motion.text>
      </g>
    );
  }

  if (isFinished) {
    // Victory pose - arms up
    return (
      <g>
        <line x1="10" y1="0" x2="10" y2="16" stroke={bodyColor} strokeWidth="3" strokeLinecap="round" />
        {/* Arms raised in V */}
        <line x1="10" y1="4" x2="2" y2="-4" stroke={bodyColor} strokeWidth="2" strokeLinecap="round" />
        <line x1="10" y1="4" x2="18" y2="-4" stroke={bodyColor} strokeWidth="2" strokeLinecap="round" />
        {/* Standing legs */}
        <line x1="10" y1="16" x2="6" y2="26" stroke={bodyColor} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="10" y1="16" x2="14" y2="26" stroke={bodyColor} strokeWidth="2.5" strokeLinecap="round" />
      </g>
    );
  }

  // Running animation - alternate leg positions
  return (
    <g>
      {/* Body - slight forward lean */}
      <line x1="10" y1="0" x2="9" y2="16" stroke={bodyColor} strokeWidth="3" strokeLinecap="round" />

      {/* Front arm */}
      <motion.line
        x1="9" y1="5"
        animate={{ x2: [16, 2, 16], y2: [2, 10, 2] }}
        transition={{ duration: legSpeed, repeat: Infinity, ease: "easeInOut" }}
        stroke={bodyColor} strokeWidth="2" strokeLinecap="round"
      />
      {/* Back arm */}
      <motion.line
        x1="9" y1="5"
        animate={{ x2: [2, 16, 2], y2: [10, 2, 10] }}
        transition={{ duration: legSpeed, repeat: Infinity, ease: "easeInOut" }}
        stroke={bodyColor} strokeWidth="2" strokeLinecap="round"
      />

      {/* Front leg */}
      <motion.line
        x1="9" y1="16"
        animate={{ x2: [16, 2, 16], y2: [24, 26, 24] }}
        transition={{ duration: legSpeed, repeat: Infinity, ease: "easeInOut" }}
        stroke={bodyColor} strokeWidth="2.5" strokeLinecap="round"
      />
      {/* Back leg */}
      <motion.line
        x1="9" y1="16"
        animate={{ x2: [2, 16, 2], y2: [26, 24, 26] }}
        transition={{ duration: legSpeed, repeat: Infinity, ease: "easeInOut" }}
        stroke={bodyColor} strokeWidth="2.5" strokeLinecap="round"
      />
    </g>
  );
}

export default function Racer({
  racer,
  laneIndex,
  trackWidth,
  laneHeight,
  startX,
}: RacerProps) {
  const laneY = laneIndex * laneHeight;
  const centerY = laneY + laneHeight / 2;
  const avatarSize = 36;

  // Position along track based on progress
  const racerX = startX + (racer.progress_pct / 100) * trackWidth;

  const displayName =
    racer.member.display_name || racer.member.whatsapp_name;
  const isSleeping = racer.activity_status === "sleeping";

  // Ground line Y position - feet touch here
  const groundY = centerY + 14;
  // Body starts at ground minus body height
  const bodyY = groundY - 26;
  // Head sits directly on top of body
  const headY = bodyY - avatarSize + 4;

  function handleClick() {
    window.location.href = `/stats/${racer.member_id}`;
  }

  return (
    <g onClick={handleClick} style={{ cursor: "pointer" }}>
      {/* Clickable hit area for the whole lane */}
      <rect
        x={0}
        y={laneY}
        width={startX + trackWidth + 60}
        height={laneHeight}
        fill="transparent"
      />

      {/* Trail */}
      <RacerTrail
        progressPct={racer.progress_pct}
        status={racer.activity_status}
        totalPosts={racer.total_posts}
        trackWidth={trackWidth}
        y={groundY - 13}
      />

      {/* Lane divider */}
      {laneIndex > 0 && (
        <line
          x1={0}
          y1={laneY}
          x2={startX + trackWidth + 60}
          y2={laneY}
          stroke="#e2e8f0"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      )}

      {/* Racer group */}
      <motion.g
        initial={{ x: startX }}
        animate={{ x: racerX }}
        transition={{
          type: "spring",
          stiffness: 60,
          damping: 18,
          mass: 1.2,
        }}
      >
        {isSleeping ? (
          <>
            {/* Sleeping: head resting at end of body, tilted like lounging */}
            <g transform={`translate(${-avatarSize / 2 - 4}, ${groundY - avatarSize + 2}) rotate(-20, ${avatarSize / 2}, ${avatarSize / 2})`}>
              <RacerAvatar
                avatarUrl={racer.member.avatar_url}
                displayName={displayName}
                status={racer.activity_status}
                size={avatarSize}
              />
            </g>
            {/* Body lying down, connected to head */}
            <g transform={`translate(0, ${groundY - 16})`}>
              <RunnerBody status={racer.activity_status} />
            </g>
          </>
        ) : (
          <>
            {/* Normal: head on top of body */}
            <g transform={`translate(${-avatarSize / 2 + 10}, ${headY})`}>
              <RacerAvatar
                avatarUrl={racer.member.avatar_url}
                displayName={displayName}
                status={racer.activity_status}
                size={avatarSize}
              />
            </g>
            <g transform={`translate(0, ${bodyY})`}>
              <RunnerBody status={racer.activity_status} />
            </g>
          </>
        )}

        {/* Name label */}
        <text
          x={10}
          y={groundY + 14}
          textAnchor="middle"
          fontSize="11"
          fill="#64748b"
          fontWeight="500"
        >
          {displayName}
        </text>

        {/* PB label */}
        {racer.personal_best && (
          <text
            x={10}
            y={groundY + 26}
            textAnchor="middle"
            fontSize="10"
            fill="#94a3b8"
          >
            {racer.personal_best.toFixed(2)} km
          </text>
        )}
      </motion.g>
    </g>
  );
}
