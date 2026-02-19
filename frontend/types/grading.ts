export interface EventInfo {
  code: string;
  name: string;
  description: string;
}

export interface ClusterEvents {
  cluster_name: string;
  display_label: string;
  events: EventInfo[];
}

export interface SectionScore {
  name: string;
  max_points: number;
  awarded_points: number;
  feedback: string;
}

export interface PenaltyCheck {
  description: string;
  penalty_points: number;
  status: "flagged" | "clear" | "manual_check";
  note: string;
}

export interface GradingResult {
  event_name: string;
  total_possible: number;
  total_awarded: number;
  sections: SectionScore[];
  overall_feedback: string;
  penalties?: PenaltyCheck[];
}

export interface JobStatus {
  job_id: string;
  status: "pending" | "processing" | "complete" | "failed";
  result: GradingResult | null;
  error: string | null;
}

export interface UploadResponse {
  job_id: string;
}
