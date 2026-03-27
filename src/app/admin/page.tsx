"use client";

import { useEffect, useState } from "react";
import type { Race, Member } from "@/lib/types";

export default function AdminPage() {
  const [race, setRace] = useState<Race | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [raceName, setRaceName] = useState("");
  const [goalTarget, setGoalTarget] = useState("10");
  const [goalUnit, setGoalUnit] = useState("km");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/race/active")
      .then((r) => r.json())
      .then((d) => setRace(d.race || null))
      .catch(() => {});
    fetch("/api/members")
      .then((r) => r.json())
      .then((d) => setMembers(d.members || []));
  }, []);

  async function createRace(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/race", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: raceName,
          goal_target: parseFloat(goalTarget),
          goal_unit: goalUnit,
        }),
      });
      if (res.ok) {
        const { race: newRace } = await res.json();
        setRace(newRace);
        setRaceName("");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/" className="text-zinc-400 hover:text-zinc-600">
            &larr;
          </a>
          <h1 className="text-lg font-bold text-zinc-900">Admin</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
        {/* Current Race */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-600 mb-3">
            Current Race
          </h2>
          {race ? (
            <div className="bg-white p-4 rounded-lg border border-zinc-200">
              <p className="font-medium text-zinc-800">{race.name}</p>
              <p className="text-sm text-zinc-400">
                Goal: {race.goal_target} {race.goal_unit}
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No active race</p>
          )}
        </section>

        {/* Create Race */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-600 mb-3">
            Create New Race
          </h2>
          <form onSubmit={createRace} className="space-y-4">
            <input
              type="text"
              value={raceName}
              onChange={(e) => setRaceName(e.target.value)}
              placeholder="Race name (e.g., 10K PB Challenge)"
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              required
            />
            <div className="flex gap-3">
              <input
                type="number"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                placeholder="Target"
                step="0.1"
                className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                required
              />
              <select
                value={goalUnit}
                onChange={(e) => setGoalUnit(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value="km">km</option>
                <option value="mi">mi</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-40"
            >
              {creating ? "Creating..." : "Create Race"}
            </button>
          </form>
        </section>

        {/* Members */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-600 mb-3">
            Members ({members.length})
          </h2>
          {members.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No members yet. Run the WhatsApp scraper to populate.
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 bg-white p-3 rounded-lg border border-zinc-200"
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden">
                    {m.avatar_url ? (
                      <img
                        src={m.avatar_url}
                        alt={m.whatsapp_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-zinc-500">
                        {(m.display_name || m.whatsapp_name)
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-800">
                      {m.display_name || m.whatsapp_name}
                    </p>
                    <p className="text-xs text-zinc-400">{m.whatsapp_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
