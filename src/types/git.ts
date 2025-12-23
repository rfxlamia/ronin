// Git status information for display in UI
export interface GitDisplayStatus {
    branch: string;
    uncommittedFiles: number;
    unpushedCommits: number;
    lastCommitTimestamp: number; // Unix timestamp in seconds
    hasRemote: boolean;
}
