import { useState, useEffect, useCallback } from 'react';

export interface CountdownState {
  secondsRemaining: number;
  isActive: boolean;
}

/**
 * Hook for countdown timer functionality.
 * Used for rate limit countdown display.
 */
export function useCountdown(initialSeconds: number = 0): CountdownState & { start: (seconds: number) => void; reset: () => void } {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(initialSeconds > 0);

  const start = useCallback((seconds: number) => {
    setSecondsRemaining(seconds);
    setIsActive(seconds > 0);
  }, []);

  const reset = useCallback(() => {
    setSecondsRemaining(0);
    setIsActive(false);
  }, []);

  useEffect(() => {
    if (!isActive || secondsRemaining <= 0) {
      if (isActive && secondsRemaining <= 0) {
        setIsActive(false);
      }
      return;
    }

    const intervalId = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isActive, secondsRemaining]);

  return { secondsRemaining, isActive, start, reset };
}
