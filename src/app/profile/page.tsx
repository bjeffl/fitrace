"use client";

import { useEffect, useState } from "react";
import type { Member } from "@/lib/types";

export default function ProfilePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/members")
      .then((r) => r.json())
      .then((d) => setMembers(d.members || []));
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setMessage(null);
  }

  async function handleUpload() {
    if (!file || !selectedMember) return;

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("memberId", selectedMember.id);

    try {
      const res = await fetch("/api/avatar", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");

      const { avatar_url } = await res.json();

      // Update local state
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id ? { ...m, avatar_url } : m
        )
      );
      setSelectedMember((prev) => (prev ? { ...prev, avatar_url } : null));
      setFile(null);
      setPreview(null);
      setMessage({ type: "success", text: "Avatar updated!" });
    } catch {
      setMessage({ type: "error", text: "Upload failed. Try again." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/" className="text-zinc-400 hover:text-zinc-600">
            &larr;
          </a>
          <h1 className="text-lg font-bold text-zinc-900">Set Your Avatar</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Pick your name */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Who are you?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedMember(m);
                  setMessage(null);
                }}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  selectedMember?.id === m.id
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden shrink-0">
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt={m.display_name || m.whatsapp_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span
                      className={`text-sm font-bold ${
                        selectedMember?.id === m.id
                          ? "text-zinc-400"
                          : "text-zinc-500"
                      }`}
                    >
                      {(m.display_name || m.whatsapp_name)
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium truncate">
                  {m.display_name || m.whatsapp_name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Avatar upload */}
        {selectedMember && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Upload your photo
              </label>
              <div className="border-2 border-dashed border-zinc-300 rounded-lg p-6 text-center hover:border-zinc-400 transition-colors">
                {preview || selectedMember.avatar_url ? (
                  <div className="space-y-3">
                    <div className="w-24 h-24 rounded-full mx-auto overflow-hidden bg-zinc-200">
                      <img
                        src={preview || selectedMember.avatar_url!}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <label className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 underline">
                      Change photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="w-24 h-24 rounded-full mx-auto bg-zinc-200 flex items-center justify-center mb-3">
                      <span className="text-2xl font-bold text-zinc-400">
                        {(
                          selectedMember.display_name ||
                          selectedMember.whatsapp_name
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500">Tap to upload a photo</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      This will be your racer's head
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {file && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-3 bg-zinc-900 text-white font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? "Uploading..." : "Save Avatar"}
              </button>
            )}

            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
