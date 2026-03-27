"use client";

import type { ProgressEntry, Member } from "@/lib/types";

interface FeedEntry extends ProgressEntry {
  member: Member;
}

interface ProgressFeedProps {
  entries: FeedEntry[];
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

export default function ProgressFeed({ entries }: ProgressFeedProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-zinc-400 text-center py-8">
        No activity yet. Upload a screenshot to get started!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const name =
          entry.member.display_name || entry.member.whatsapp_name;
        return (
          <div
            key={entry.id}
            className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-zinc-100"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden shrink-0">
              {entry.member.avatar_url ? (
                <img
                  src={entry.member.avatar_url}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-zinc-500">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800 truncate">
                {name}
              </p>
              <p className="text-xs text-zinc-400">
                {entry.status === "extracted" && entry.extracted_value
                  ? `${entry.extracted_value.toFixed(2)} km`
                  : entry.status === "pending"
                    ? "Processing..."
                    : entry.status === "failed"
                      ? "Extraction failed"
                      : `${entry.extracted_value?.toFixed(2)} km`}
              </p>
            </div>

            {/* Time */}
            <span className="text-xs text-zinc-300 shrink-0">
              {timeAgo(entry.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
