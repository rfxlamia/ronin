// Git status information for display in UI
export interface GitDisplayStatus {
    branch: string;
    uncommittedFiles: number;
    unpushedCommits: number;
    lastCommitTimestamp: number; // Unix timestamp in seconds
    hasRemote: boolean;
    // Edge case detection flags (Story 5.4)
    isDetached: boolean;
    hasConflicts: boolean;
    isEmpty: boolean;
}
