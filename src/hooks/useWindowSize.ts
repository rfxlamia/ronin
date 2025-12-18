import { useState, useEffect } from 'react';

interface WindowSize {
    width: number;
    height: number;
}

/**
 * Custom hook to track window dimensions with debouncing
 * @param debounceMs - Debounce delay in milliseconds (default: 150ms)
 * @returns Current window width and height
 */
export function useWindowSize(debounceMs: number = 150): WindowSize {
    const [windowSize, setWindowSize] = useState<WindowSize>({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const handleResize = () => {
            // Clear existing timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            // Set new timeout for debouncing
            timeoutId = setTimeout(() => {
                setWindowSize({
                    width: window.innerWidth,
                    height: window.innerHeight,
                });
            }, debounceMs);
        };

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Cleanup function
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            window.removeEventListener('resize', handleResize);
        };
    }, [debounceMs]);

    return windowSize;
}
