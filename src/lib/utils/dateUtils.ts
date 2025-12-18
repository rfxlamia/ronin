/**
 * Calculate the number of days between a given date and now
 * @param dateString - ISO 8601 date string
 * @returns Number of days (rounded down)
 */
export function calculateDaysSince(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Format days since into human-readable text
 * @param days - Number of days
 * @returns Formatted string like "2 days ago", "Today", "Yesterday"
 */
export function formatDaysSince(days: number): string {
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
}
