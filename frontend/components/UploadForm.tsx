"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getEvents, uploadPdf } from "@/lib/api";
import { ClusterEvents, EventInfo } from "@/types/grading";

const MAX_FILE_SIZE_MB = 15;

export default function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clusters, setClusters] = useState<ClusterEvents[]>([]);
  const [selectedCluster, setSelectedCluster] = useState("");
  const [selectedEventCode, setSelectedEventCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getEvents()
      .then((data) => {
        setClusters(data);
        if (data.length > 0) {
          setSelectedCluster(data[0].cluster_name);
        }
      })
      .catch(() => setError("Failed to load events. Is the backend running?"));
  }, []);

  const currentEvents: EventInfo[] =
    clusters.find((c) => c.cluster_name === selectedCluster)?.events ?? [];

  const currentClusterLabel =
    clusters.find((c) => c.cluster_name === selectedCluster)?.display_label ?? "Select a category";

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

  const handleClusterChange = (clusterName: string) => {
    setSelectedCluster(clusterName);
    setSelectedEventCode(""); // reset specific event when cluster changes
  };

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
      {/* Cluster selector */}
      <div>
        <label className="block text-purple-300/80 text-sm mb-2">
          Event Category
        </label>
        <select
          value={selectedCluster}
          onChange={(e) => handleClusterChange(e.target.value)}
          className="w-full bg-[#120020] border border-purple-500/30 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
        >
          {clusters.length === 0 && (
            <option value="">Loading events...</option>
          )}
          {clusters.map((c) => (
            <option key={c.cluster_name} value={c.cluster_name}>
              {c.display_label}
            </option>
          ))}
        </select>
      </div>

      {/* Specific event selector */}
      {selectedCluster && (
        <div>
          <label className="block text-purple-300/80 text-sm mb-2">
            Specific Event
          </label>
          <select
            value={selectedEventCode}
            onChange={(e) => setSelectedEventCode(e.target.value)}
            className="w-full bg-[#120020] border border-purple-500/30 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option value="">Select a specific event...</option>
            {currentEvents.map((evt) => (
              <option key={evt.code} value={evt.code}>
                {evt.name} ({evt.code})
              </option>
            ))}
          </select>
        </div>
      )}

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
