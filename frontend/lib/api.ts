import { ClusterEvents, HistoryItem, JobStatus, UploadResponse } from "@/types/grading";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Use a generous timeout for event loading in case of cold starts.
function fetchWithTimeout(input: string, options?: RequestInit, timeoutMs = 90000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(id)
  );
}

export async function getEvents(): Promise<ClusterEvents[]> {
  const res = await fetchWithTimeout(`${API_URL}/api/events`);
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

// Upload goes directly to the FastAPI backend to avoid Vercel's ~4.5MB body limit.
// We first fetch a short-lived auth token from the Next.js proxy so the backend
// can identify the user from the httpOnly NextAuth session cookie.
export async function uploadPdf(
  file: File,
  eventCode: string
): Promise<UploadResponse> {
  const tokenRes = await fetch("/api/proxy/auth-token");
  const { authorization } = await tokenRes.json();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("event_code", eventCode);

  const headers: Record<string, string> = {};
  if (authorization) headers["Authorization"] = authorization;

  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(error.detail || "Upload failed");
  }

  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API_URL}/api/status/${jobId}`);
  if (!res.ok) throw new Error("Failed to fetch job status");
  return res.json();
}

// History and admin calls also go through Next.js proxies for the same reason.
export async function getHistory(eventCode: string): Promise<HistoryItem[]> {
  const res = await fetch(`/api/proxy/history?event_code=${encodeURIComponent(eventCode)}`);
  if (res.status === 401) return [];
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export async function getAdminStats() {
  const res = await fetch("/api/proxy/admin/stats");
  if (!res.ok) throw new Error("Failed to fetch admin stats");
  return res.json();
}

export async function getAdminUsers() {
  const res = await fetch("/api/proxy/admin/users");
  if (!res.ok) throw new Error("Failed to fetch admin users");
  return res.json();
}

export async function getAdminAnalytics() {
  const res = await fetch("/api/proxy/admin/analytics");
  if (!res.ok) throw new Error("Failed to fetch admin analytics");
  return res.json();
}

export async function getAdminUserSubmissions(userId: string) {
  const res = await fetch(`/api/proxy/admin/users/${userId}/submissions`);
  if (!res.ok) throw new Error("Failed to fetch user submissions");
  return res.json();
}

export async function getAccountSubmissions(): Promise<HistoryItem[]> {
  const res = await fetch("/api/proxy/account/submissions");
  if (!res.ok) throw new Error("Failed to fetch submissions");
  return res.json();
}

export async function deleteAccount(): Promise<void> {
  const res = await fetch("/api/proxy/account", { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete account");
}
