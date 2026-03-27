"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Member } from "@/lib/types";

interface OnboardingProps {
  members: Member[];
  onComplete: (member: Member) => void;
}

export default function Onboarding({ members, onComplete }: OnboardingProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<"pick" | "avatar">("pick");

  function handleSelect(member: Member) {
    setSelectedMember(member);
    setStep("avatar");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleUpload() {
    if (!file || !selectedMember) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("memberId", selectedMember.id);

    try {
      const res = await fetch("/api/avatar", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");

      const { avatar_url } = await res.json();
      const updated = { ...selectedMember, avatar_url };

      localStorage.setItem("fitrace_member_id", selectedMember.id);
      onComplete(updated);
    } catch {
      // Allow them to continue without avatar
      localStorage.setItem("fitrace_member_id", selectedMember.id);
      onComplete(selectedMember);
    } finally {
      setUploading(false);
    }
  }

  function handleSkipAvatar() {
    if (!selectedMember) return;
    localStorage.setItem("fitrace_member_id", selectedMember.id);
    onComplete(selectedMember);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-4 py-12"
    >
      <AnimatePresence mode="wait">
        {step === "pick" && (
          <motion.div
            key="pick"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <h1 className="text-2xl font-bold text-zinc-900 text-center mb-2">
              Who are you?
            </h1>
            <p className="text-sm text-zinc-400 text-center mb-8">
              Pick your name to join the race
            </p>

            <div className="grid grid-cols-2 gap-3">
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelect(m)}
                  className="flex items-center gap-3 p-4 rounded-xl border border-zinc-200 bg-white text-left hover:border-zinc-400 hover:shadow-sm transition-all active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden shrink-0">
                    {m.avatar_url ? (
                      <img
                        src={m.avatar_url}
                        alt={m.display_name || m.whatsapp_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-zinc-400">
                        {(m.display_name || m.whatsapp_name).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-zinc-800">
                    {m.display_name || m.whatsapp_name}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === "avatar" && selectedMember && (
          <motion.div
            key="avatar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm text-center"
          >
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">
              Hey {selectedMember.display_name || selectedMember.whatsapp_name}!
            </h1>
            <p className="text-sm text-zinc-400 mb-8">
              Upload a photo for your racer
            </p>

            <div className="mb-6">
              <label className="cursor-pointer">
                <div className="w-32 h-32 rounded-full mx-auto bg-zinc-100 border-2 border-dashed border-zinc-300 flex items-center justify-center overflow-hidden hover:border-zinc-400 transition-colors">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div>
                      <span className="text-3xl font-bold text-zinc-300">
                        {(selectedMember.display_name || selectedMember.whatsapp_name)
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                      <p className="text-[10px] text-zinc-400 mt-1">Tap to upload</p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {file ? (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-3 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 disabled:opacity-40 transition-colors mb-3"
              >
                {uploading ? "Saving..." : "Save & Join Race"}
              </button>
            ) : (
              <div className="h-[48px] mb-3" />
            )}

            <button
              onClick={handleSkipAvatar}
              className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Skip for now
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
