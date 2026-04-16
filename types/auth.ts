
export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  USER = 'user'
}

export interface JobRole {
  id: string;
  workspace_id?: string;
  name: string;
  level: number;
  permissions: Record<string, any>;
  created_at: string;
}

export interface User {
  id: string;
  auth_user_id?: string;
  name: string;
  username?: string;
  email: string;
  password?: string;
  avatar_url?: string;
  role: UserRole;
  job_role_id?: string;
  workspace_id?: string;
  status: 'active' | 'inactive';
  must_change_password?: boolean;
  created_at: string;
  updated_at: string;
  job_role?: JobRole;
}
