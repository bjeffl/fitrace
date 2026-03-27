"use client";

import { useEffect, useState } from "react";
import type { Member, Race } from "@/lib/types";

export default function UploadPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [race, setRace] = useState<Race | null>(null);
  const [selectedMember, setSelectedMember] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/members")
      .then((r) => r.json())
      .then((d) => setMembers(d.members || []));
    fetch("/api/race/active")
      .then((r) => r.json())
      .then((d) => setRace(d.race || null));
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !selectedMember || !race) return;

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("memberId", selectedMember);
    formData.append("raceId", race.id);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      setResult({
        success: true,
        message: "Screenshot uploaded! Extracting distance...",
      });
      setFile(null);
      setPreview(null);
    } catch {
      setResult({ success: false, message: "Upload failed. Try again." });
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
          <h1 className="text-lg font-bold text-zinc-900">Upload Screenshot</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Member select */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Who are you?
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              required
            >
              <option value="">Select your name</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name || m.whatsapp_name}
                </option>
              ))}
            </select>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Fitness screenshot
            </label>
            <div className="border-2 border-dashed border-zinc-300 rounded-lg p-6 text-center hover:border-zinc-400 transition-colors">
              {preview ? (
                <div className="space-y-3">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-600"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <p className="text-sm text-zinc-500 mb-1">
                    Tap to select a screenshot
                  </p>
                  <p className="text-xs text-zinc-400">
                    Strava, Apple Fitness, or similar
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

          {/* Submit */}
          <button
            type="submit"
            disabled={!file || !selectedMember || uploading}
            className="w-full py-3 bg-zinc-900 text-white font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>

          {/* Result */}
          {result && (
            <div
              className={`p-3 rounded-lg text-sm ${
                result.success
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {result.message}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
