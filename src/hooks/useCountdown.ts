import { useState, useEffect, useCallback } from 'react';

export interface CountdownState {
  secondsRemaining: number;
  isActive: boolean;
  // Convenience properties for display (Story 4.25-3)
  timeRemaining: number;
  minutes: number;
  seconds: number;
  progress: number;
}

/**
 * Hook for countdown timer functionality.
 * Used for rate limit countdown display.
 */
export function useCountdown(initialSeconds: number = 0): CountdownState & { start: (seconds: number) => void; reset: () => void } {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(initialSeconds > 0);
  const [initialValue, setInitialValue] = useState(initialSeconds);

  const start = useCallback((seconds: number) => {
    setSecondsRemaining(seconds);
    setInitialValue(seconds);
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

  // Computed values for display (Story 4.25-3)
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const progress = initialValue > 0 ? ((initialValue - secondsRemaining) / initialValue) * 100 : 0;

  return {
    secondsRemaining,
    isActive,
    start,
    reset,
    // Convenience aliases
    timeRemaining: secondsRemaining,
    minutes,
    seconds,
    progress,
  };
}
