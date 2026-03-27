"use client";

import Racer from "./Racer";
import type { RacerData, Race } from "@/lib/types";

interface RaceTrackProps {
  race: Race;
  racers: RacerData[];
}

const LANE_HEIGHT = 110;
const START_X = 20;
const FINISH_LINE_PADDING = 60;

export default function RaceTrack({ race, racers }: RaceTrackProps) {
  const trackWidth = 600;
  const svgWidth = START_X + trackWidth + FINISH_LINE_PADDING + 20;
  const svgHeight = Math.max(racers.length * LANE_HEIGHT, 200);

  // Sort racers: finished first, then by progress descending
  const sortedRacers = [...racers].sort((a, b) => {
    if (a.activity_status === "finished" && b.activity_status !== "finished")
      return -1;
    if (b.activity_status === "finished" && a.activity_status !== "finished")
      return 1;
    return b.progress_pct - a.progress_pct;
  });

  const finishX = START_X + trackWidth;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full min-w-[700px]"
        style={{ maxHeight: "80vh" }}
      >
        {/* Background */}
        <rect width={svgWidth} height={svgHeight} fill="#fafafa" rx={12} />

        {/* Track area background */}
        <rect
          x={START_X}
          y={0}
          width={trackWidth}
          height={svgHeight}
          fill="#f8fafc"
          opacity={0.5}
        />

        {/* Distance markers */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const x = START_X + (pct / 100) * trackWidth;
          const distance = (pct / 100) * race.goal_target;
          const is5k = Math.abs(distance - 5) < 0.01;
          return (
            <g key={pct}>
              <line
                x1={x}
                y1={0}
                x2={x}
                y2={svgHeight}
                stroke={is5k ? "#a78bfa" : "#e2e8f0"}
                strokeWidth={pct === 100 ? 2 : is5k ? 1.5 : 1}
                strokeDasharray={pct === 100 ? "none" : is5k ? "6 3" : "2 4"}
              />
              <text
                x={x}
                y={svgHeight - 6}
                textAnchor="middle"
                fontSize="9"
                fill={is5k ? "#7c3aed" : "#94a3b8"}
                fontWeight={is5k ? "600" : "400"}
              >
                {is5k ? "5K" : `${distance.toFixed(1)} ${race.goal_unit}`}
              </text>
            </g>
          );
        })}

        {/* 5K halfway marker (if not already on a grid line) */}
        {(() => {
          const fiveKPct = (5 / race.goal_target) * 100;
          const alreadyMarked = [0, 25, 50, 75, 100].some(
            (p) => Math.abs((p / 100) * race.goal_target - 5) < 0.01
          );
          if (alreadyMarked || fiveKPct <= 0 || fiveKPct >= 100) return null;
          const x = START_X + (fiveKPct / 100) * trackWidth;
          return (
            <g>
              <line
                x1={x}
                y1={0}
                x2={x}
                y2={svgHeight}
                stroke="#a78bfa"
                strokeWidth={1.5}
                strokeDasharray="6 3"
              />
              <text
                x={x}
                y={16}
                textAnchor="middle"
                fontSize="10"
                fill="#7c3aed"
                fontWeight="600"
              >
                5K
              </text>
              <text
                x={x}
                y={svgHeight - 6}
                textAnchor="middle"
                fontSize="9"
                fill="#7c3aed"
                fontWeight="600"
              >
                5.0 {race.goal_unit}
              </text>
            </g>
          );
        })()}

        {/* Finish line */}
        <g>
          {/* Checkered flag pattern */}
          {Array.from({ length: Math.floor(svgHeight / 10) }).map((_, i) => (
            <rect
              key={i}
              x={finishX + (i % 2 === 0 ? 0 : 5)}
              y={i * 10}
              width={5}
              height={10}
              fill={i % 2 === 0 ? "#1e293b" : "#e2e8f0"}
              opacity={0.6}
            />
          ))}
          {Array.from({ length: Math.floor(svgHeight / 10) }).map((_, i) => (
            <rect
              key={`b-${i}`}
              x={finishX + (i % 2 === 0 ? 5 : 0)}
              y={i * 10}
              width={5}
              height={10}
              fill={i % 2 === 0 ? "#1e293b" : "#e2e8f0"}
              opacity={0.6}
            />
          ))}
        </g>

        {/* Goal label */}
        <text
          x={finishX + 5}
          y={-8}
          textAnchor="middle"
          fontSize="11"
          fill="#475569"
          fontWeight="600"
        >
          {race.goal_target} {race.goal_unit}
        </text>

        {/* Racers */}
        {sortedRacers.map((racer, index) => (
          <Racer
            key={racer.member_id}
            racer={racer}
            laneIndex={index}
            trackWidth={trackWidth}
            laneHeight={LANE_HEIGHT}
            startX={START_X}
          />
        ))}
      </svg>
    </div>
  );
}
