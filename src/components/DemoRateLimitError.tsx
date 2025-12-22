/**
 * Demo Rate Limit Error Component
 * Story 4.25-2: AWS Lambda Demo Mode Proxy
 *
 * Shows empathetic message when demo mode rate limit is reached
 */

import { Clock, Key } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface DemoRateLimitErrorProps {
    retryAfter: number; // seconds
    onAddApiKey?: () => void;
}

export function DemoRateLimitError({ retryAfter, onAddApiKey }: DemoRateLimitErrorProps) {
    const [timeRemaining, setTimeRemaining] = useState(retryAfter);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeRemaining((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const progress = Math.max(0, 100 - (timeRemaining / retryAfter) * 100);

    return (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="text-2xl">🧘</span>
            </div>

            <h3 className="text-lg font-semibold text-ronin-text-primary font-libre">
                Demo mode is resting
            </h3>

            <p className="text-sm text-ronin-text-secondary">
                Try again in {minutes > 0 ? `${minutes}m ` : ''}{seconds}s
            </p>

            {/* Progress bar */}
            <div className="w-full max-w-xs h-2 bg-ronin-bg-tertiary rounded-full overflow-hidden">
                <div
                    className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="mt-4 p-4 bg-ronin-bg-tertiary rounded-lg border border-ronin-border">
                <p className="text-sm text-ronin-text-secondary mb-3">
                    Add your own API key for unlimited context recovery
                </p>
                <div className="flex gap-2 justify-center">
                    <Button
                        onClick={onAddApiKey}
                        className="bg-ronin-brass hover:bg-ronin-brass/80"
                    >
                        <Key className="w-4 h-4 mr-2" />
                        Add API Key
                    </Button>
                    <Button variant="ghost" className="text-ronin-text-secondary">
                        Maybe Later
                    </Button>
                </div>
            </div>

            <p className="text-xs text-ronin-text-secondary flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Demo mode: 10 requests/hour
            </p>
        </div>
    );
}
