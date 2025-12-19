export interface Project {
  id: number;
  path: string;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
  isArchived?: boolean;
  deletedAt?: string;
  fileCount?: number;
  lastActivityAt?: string;
  gitBranch?: string;
  uncommittedCount?: number;
  healthStatus?: string;
  isStuck?: boolean;
}