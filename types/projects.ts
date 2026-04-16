
export interface Project {
  id: string;
  workspace_id?: string;
  name: string;
  client_id: string;
  lead_id?: string;
  company_id?: string;
  status: 'active' | 'completed' | 'on_hold';
  start_date: string;
  end_date?: string;
  value: number;
  description?: string;
  type?: 'recorrente' | 'projeto';
  payment_method?: string;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  default_price: number;
  workspace_id?: string;
  created_at: string;
}
