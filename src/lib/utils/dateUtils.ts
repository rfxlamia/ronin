/**
 * Calculate the number of days between a given date and now
 * @param dateString - ISO 8601 date string
 * @returns Number of days (rounded down)
 */
export function calculateDaysSince(dateString: string): number {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        console.warn(`[calculateDaysSince] Invalid date string: "${dateString}"`);
        return 0;
    }
    const diffTime = Math.abs(Date.now() - date.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
