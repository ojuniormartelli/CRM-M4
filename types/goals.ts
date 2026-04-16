
export interface Goal {
  id: string;
  workspace_id: string;
  month: string; // ISO date string (first day of month)
  revenue_goal: number;
  leads_goal: number;
  created_at: string;
  updated_at: string;
}
