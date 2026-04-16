
export interface WorkspaceNav {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  workspace_id?: string;
  created_at: string;
}

export interface Folder {
  id: string;
  workspace_nav_id: string;
  name: string;
  workspace_id?: string;
  created_at: string;
}

export interface List {
  id: string;
  folder_id?: string;
  workspace_nav_id?: string;
  name: string;
  view_type: 'kanban' | 'list' | 'calendar' | 'table';
  workspace_id?: string;
  created_at: string;
}
