/**
 * Demo Mode Stats Component
 * Story 4.25-3: Provider Settings UI & Multi-Key Storage
 *
 * Displays demo mode quota information
 */

import { useEffect, useState } from 'react';
import { Clock, Zap, Calendar } from 'lucide-react';
import type { DemoQuota } from '@/types/ai';

// Demo mode quota limits (must match Lambda proxy configuration)
const DEMO_HOURLY_LIMIT = 10;
const DEMO_DAILY_LIMIT = 50;

interface DemoModeStatsProps {
  quota: DemoQuota | null;
}

export function DemoModeStats({ quota }: DemoModeStatsProps) {
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  useEffect(() => {
    if (!quota?.resetTime) {
      setTimeUntilReset('');
      return;
    }

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = quota.resetTime! - now;

      if (diff <= 0) {
        setTimeUntilReset('Resetting...');
        return;
      }

      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setTimeUntilReset(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [quota?.resetTime]);

  // Default values when no quota data is available
  const remainingHourly = quota?.remainingHourly ?? DEMO_HOURLY_LIMIT;
  const remainingDaily = quota?.remainingDaily ?? DEMO_DAILY_LIMIT;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-amber-500" />
        <span className="font-medium text-amber-700 dark:text-amber-400">
          Demo Mode Active
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-muted-foreground">Hourly</p>
            <p className="font-work-sans font-medium">
              {remainingHourly}/{DEMO_HOURLY_LIMIT} remaining
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-muted-foreground">Daily</p>
            <p className="font-work-sans font-medium">
              {remainingDaily}/{DEMO_DAILY_LIMIT} remaining
            </p>
          </div>
        </div>
      </div>

      {timeUntilReset && (
        <div className="mt-3 pt-3 border-t border-amber-500/20">
          <p className="text-xs text-muted-foreground">
            Reset in: <span className="font-mono">{timeUntilReset}</span>
          </p>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Add your own API key for unlimited context recovery.
      </p>
    </div>
  );
}
