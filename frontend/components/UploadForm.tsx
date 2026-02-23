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
      {/* Event selector */}
      <div>
        <label className="block text-[#94A3B8] text-xs font-semibold uppercase tracking-widest mb-2">
          Select Event
        </label>
        <select
          value={selectedEventCode}
          onChange={(e) => setSelectedEventCode(e.target.value)}
          className="w-full bg-[#00162A] border border-[#1E293B] text-[#F8FAFC] rounded-sm px-4 py-3 focus:outline-none focus:border-[#0073C1] transition-all duration-300 ease-in-out"
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
        className={`border-2 border-dashed rounded-md p-12 text-center cursor-pointer transition-all duration-300 ease-in-out ${
          dragging
            ? "border-[#0073C1] bg-[#0073C1]/5"
            : file
            ? "border-[#10B981]/50 bg-[#10B981]/5"
            : "border-[#1E293B] bg-[#00162A] hover:border-[#0073C1]/50"
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
            <p className="text-[#10B981] font-medium">{file.name}</p>
            <p className="text-[#94A3B8] text-sm mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <p className="text-[#94A3B8]/50 text-xs mt-2">
              Click or drag to replace
            </p>
          </div>
        ) : (
          <div>
            <div className="text-[#0073C1] text-3xl mb-3 font-light">+</div>
            <p className="text-[#94A3B8]">
              Drag & drop your PDF here, or click to browse
            </p>
            <p className="text-[#94A3B8]/50 text-sm mt-2">
              Max {MAX_FILE_SIZE_MB}MB · 25 pages · PDF only
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-[#EF4444] text-sm bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-sm px-4 py-3">
          {error}
        </p>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!file || !selectedEventCode || uploading}
        className="w-full py-4 rounded-sm bg-[#0073C1] text-white font-semibold text-base hover:bg-[#005fa3] transition-all duration-300 ease-in-out disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {uploading ? "Uploading..." : "Run Audit →"}
      </button>
    </div>
  );
}
