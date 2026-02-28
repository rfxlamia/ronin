import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { GitDisplayStatus } from '@/types/git';

const FOCUS_DEBOUNCE_MS = 300;

/** Hook to fetch Git status for a project path */
export function useGitStatus(projectPath: string | null) {
    const [status, setStatus] = useState<GitDisplayStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(() => {
        if (!projectPath) {
            setStatus(null);
            return;
        }

        setLoading(true);
        setError(null);

        invoke<GitDisplayStatus>('get_git_status', { path: projectPath })
            .then((result) => {
                setStatus(result);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to fetch git status:', err);
                setError(err.toString());
                setLoading(false);
            });
    }, [projectPath]);

    // Fetch on mount and projectPath change
    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Refetch on window focus/visibility change — debounced to prevent double-fire
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!projectPath) return;

        const debouncedFetch = () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(fetchStatus, FOCUS_DEBOUNCE_MS);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') debouncedFetch();
        };

        const handleFocus = () => {
            debouncedFetch();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [projectPath, fetchStatus]);

    return { status, loading, error, refresh: fetchStatus };
}
