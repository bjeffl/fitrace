"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Countdown from "./Countdown";
import Onboarding from "./Onboarding";
import RaceTrack from "./RaceTrack";
import ProgressFeed from "./ProgressFeed";
import type { Race, RacerData, Member } from "@/lib/types";

type FlowStep = "loading" | "countdown" | "onboarding" | "race";

export default function RaceView() {
  const [step, setStep] = useState<FlowStep>("loading");
  const [race, setRace] = useState<Race | null>(null);
  const [racers, setRacers] = useState<RacerData[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchRaceData = useCallback(async (raceId: string) => {
    const standingsRes = await fetch(`/api/race/standings?raceId=${raceId}`);
    if (!standingsRes.ok) return;
    const { race: raceData, racers: racerData } = await standingsRes.json();
    setRace(raceData);
    setRacers(racerData);
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const raceRes = await fetch("/api/race/active");
        if (!raceRes.ok) {
          setError("No active race found.");
          setStep("race");
          return;
        }
        const { race: activeRace } = await raceRes.json();
        setRace(activeRace);

        const membersRes = await fetch("/api/members");
        const { members: memberList } = await membersRes.json();
        setMembers(memberList || []);

        const savedId = localStorage.getItem("fitrace_member_id");
        const seenCountdown = localStorage.getItem("fitrace_seen_countdown");

        const raceStarted =
          !activeRace.starts_at ||
          new Date(activeRace.starts_at) <= new Date();

        if (savedId) {
          // Already onboarded - go straight to race
          await fetchRaceData(activeRace.id);
          setStep("race");
        } else if (!raceStarted && !seenCountdown) {
          // First visit + race hasn't started - show countdown once
          setStep("countdown");
        } else {
          // Need to onboard
          setStep("onboarding");
        }
      } catch {
        setError("Something went wrong loading the race.");
        setStep("race");
      }
    }

    init();
  }, [fetchRaceData]);

  // Countdown -> mark as seen, go to onboarding
  function handleCountdownComplete() {
    localStorage.setItem("fitrace_seen_countdown", "true");
    setStep("onboarding");
  }

  // Onboarding complete -> go to race
  async function handleOnboardingComplete(_member: Member) {
    if (race) await fetchRaceData(race.id);
    setStep("race");
  }

  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-600 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {step === "countdown" && race?.starts_at && (
        <motion.div
          key="countdown"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Countdown
            startDate={race.starts_at}
            raceName={race.name}
            onComplete={handleCountdownComplete}
          />
        </motion.div>
      )}

      {step === "onboarding" && (
        <motion.div
          key="onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Onboarding
            members={members}
            onComplete={handleOnboardingComplete}
          />
        </motion.div>
      )}

      {step === "race" && (
        <motion.div
          key="race"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {error ? (
            <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 gap-4">
              <p className="text-zinc-500 text-sm">{error}</p>
              <a
                href="/admin"
                className="px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-800"
              >
                Go to Admin
              </a>
            </div>
          ) : race ? (
            <RaceContent
              race={race}
              racers={racers}
              fetchRaceData={fetchRaceData}
            />
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RaceContent({
  race,
  racers,
  fetchRaceData,
}: {
  race: Race;
  racers: RacerData[];
  fetchRaceData: (id: string) => Promise<void>;
}) {
  useEffect(() => {
    const interval = setInterval(() => fetchRaceData(race.id), 30000);
    return () => clearInterval(interval);
  }, [race.id, fetchRaceData]);

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">FitRace</h1>
            <p className="text-xs text-zinc-400">Race to your PB</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/profile"
              className="px-4 py-2 border border-zinc-300 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 transition-colors"
            >
              Profile
            </a>
            <a
              href="/upload"
              className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Upload
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-zinc-800">{race.name}</h2>
          <p className="text-sm text-zinc-400">
            Goal: {race.goal_target} {race.goal_unit} personal best
          </p>
        </div>

        <RaceTrack race={race} racers={racers} />

        {/* Racer cards - tap to see stats */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-600 mb-3">
            Standings
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[...racers]
              .sort((a, b) => b.progress_pct - a.progress_pct)
              .map((racer, i) => {
                const name = racer.member.display_name || racer.member.whatsapp_name;
                return (
                  <a
                    key={racer.member_id}
                    href={`/stats/${racer.member_id}`}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-zinc-100 hover:border-zinc-300 transition-colors"
                  >
                    <span className="text-xs font-bold text-zinc-300 w-5">
                      {i + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden shrink-0">
                      {racer.member.avatar_url ? (
                        <img
                          src={racer.member.avatar_url}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-zinc-400">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 truncate">
                        {name}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {racer.personal_best
                          ? `${racer.personal_best.toFixed(2)} km PB`
                          : "No runs yet"}
                      </p>
                    </div>
                  </a>
                );
              })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-zinc-600 mb-3">
            Recent Activity
          </h3>
          <ProgressFeed entries={[]} />
        </div>
      </div>
    </main>
  );
}
