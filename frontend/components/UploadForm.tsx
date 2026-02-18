"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getEvents, uploadPdf } from "@/lib/api";
import { ClusterEvents } from "@/types/grading";

const MAX_FILE_SIZE_MB = 15;

export default function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clusters, setClusters] = useState<ClusterEvents[]>([]);
  const [selectedEventCode, setSelectedEventCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getEvents()
      .then((data) => {
        setClusters(data);
      })
      .catch(() => setError("Failed to load events. Is the backend running?"));
  }, []);

  const validateFile = (f: File): string | null => {
    if (!f.name.toLowerCase().endsWith(".pdf")) return "Only PDF files are accepted";
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024)
      return `File exceeds ${MAX_FILE_SIZE_MB}MB limit`;
    return null;
  };

  const handleFile = (f: File) => {
    setError("");
    const err = validateFile(f);
    if (err) {
      setError(err);
      return;
    }
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleSubmit = async () => {
    if (!file || !selectedEventCode) return;
    setUploading(true);
    setError("");
    try {
      const { job_id } = await uploadPdf(file, selectedEventCode);
      router.push(`/results/${job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Event selector with optgroup categories */}
      <div>
        <label className="block text-purple-300/80 text-sm mb-2">
          Select Event
        </label>
        <select
          value={selectedEventCode}
          onChange={(e) => setSelectedEventCode(e.target.value)}
          className="w-full bg-[#120020] border border-purple-500/30 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
        >
          <option value="">
            {clusters.length === 0 ? "Loading events..." : "Select an event..."}
          </option>
          {clusters.map((cluster) => (
            <optgroup key={cluster.cluster_name} label={cluster.display_label}>
              {cluster.events.map((evt) => (
                <option key={evt.code} value={evt.code}>
                  {evt.name} ({evt.code})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
          dragging
            ? "border-purple-400 bg-purple-500/10"
            : file
            ? "border-green-500/50 bg-green-500/5"
            : "border-purple-500/30 bg-[#0a0015] hover:border-purple-500/50 hover:bg-purple-500/5"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFile(e.target.files[0]);
          }}
        />

        {file ? (
          <div>
            <p className="text-green-400 font-medium">{file.name}</p>
            <p className="text-purple-300/50 text-sm mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <p className="text-purple-400/50 text-xs mt-2">
              Click or drag to replace
            </p>
          </div>
        ) : (
          <div>
            <div className="text-purple-400 text-4xl mb-3">+</div>
            <p className="text-purple-200/70">
              Drag & drop your PDF here, or click to browse
            </p>
            <p className="text-purple-400/40 text-sm mt-2">
              Max {MAX_FILE_SIZE_MB}MB, 25 pages
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!file || !selectedEventCode || uploading}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold text-lg hover:from-purple-500 hover:to-fuchsia-500 transition-all duration-200 shadow-lg shadow-purple-600/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {uploading ? "Uploading..." : "Grade Report"}
      </button>
    </div>
  );
}
