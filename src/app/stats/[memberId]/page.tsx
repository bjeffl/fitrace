"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import type { Member, ProgressEntry } from "@/lib/types";

interface Stats {
  personalBest: number | null;
  totalDistance: number;
  totalRuns: number;
  averageDistance: number | null;
  longestStreak: number;
  currentStreak: number;
  lastRunAt: string | null;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function StatsPage() {
  const params = useParams();
  const memberId = params.memberId as string;

  const [member, setMember] = useState<Member | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`/api/stats?memberId=${memberId}`);
        if (!res.ok) return;
        const data = await res.json();
        setMember(data.member);
        setStats(data.stats);
        setEntries(data.entries);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [memberId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (!member || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-500 text-sm">Member not found</p>
      </div>
    );
  }

  const name = member.display_name || member.whatsapp_name;

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/" className="text-zinc-400 hover:text-zinc-600">
            &larr;
          </a>
          <h1 className="text-lg font-bold text-zinc-900">{name}</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-20 h-20 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden shrink-0">
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-zinc-400">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">{name}</h2>
            <p className="text-sm text-zinc-400">
              {stats.lastRunAt
                ? `Last run ${timeAgo(stats.lastRunAt)}`
                : "No runs yet"}
            </p>
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          <StatCard
            label="Personal Best"
            value={stats.personalBest ? `${stats.personalBest.toFixed(2)} km` : "-"}
            highlight
          />
          <StatCard
            label="Total Distance"
            value={stats.totalDistance > 0 ? `${stats.totalDistance.toFixed(2)} km` : "-"}
          />
          <StatCard
            label="Total Runs"
            value={stats.totalRuns > 0 ? String(stats.totalRuns) : "-"}
          />
          <StatCard
            label="Avg Distance"
            value={stats.averageDistance ? `${stats.averageDistance.toFixed(2)} km` : "-"}
          />
          <StatCard
            label="Current Streak"
            value={stats.currentStreak > 0 ? `${stats.currentStreak} day${stats.currentStreak > 1 ? "s" : ""}` : "-"}
          />
          <StatCard
            label="Longest Streak"
            value={stats.longestStreak > 0 ? `${stats.longestStreak} day${stats.longestStreak > 1 ? "s" : ""}` : "-"}
          />
        </motion.div>

        {/* Run history */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-semibold text-zinc-600 mb-3">
            Run History
          </h3>
          {entries.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">
              No runs recorded yet
            </p>
          ) : (
            <div className="space-y-2">
              {[...entries].reverse().map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-zinc-100"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-800">
                      {entry.extracted_value
                        ? `${entry.extracted_value.toFixed(2)} km`
                        : "Processing..."}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {new Date(entry.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  {entry.extracted_value && stats.personalBest &&
                    entry.extracted_value >= stats.personalBest && (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                      PB
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        highlight
          ? "bg-zinc-900 border-zinc-800 text-white"
          : "bg-white border-zinc-100 text-zinc-900"
      }`}
    >
      <p
        className={`text-xs mb-1 ${
          highlight ? "text-zinc-400" : "text-zinc-400"
        }`}
      >
        {label}
      </p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
