/**
 * Demo Upgrade Prompt Component
 * Story 4.25-2: AWS Lambda Demo Mode Proxy
 * Story 4.25-3: Provider Settings UI & Multi-Key Storage
 *
 * Subtle prompt after successful demo request
 * Dismissable for 24 hours
 */

import { Key, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAiStore, selectUpgradePromptDismissed } from '@/stores/aiStore';

interface DemoUpgradePromptProps {
    onAddApiKey?: () => void;
    onDismiss?: () => void;
}

export function DemoUpgradePrompt({ onAddApiKey, onDismiss }: DemoUpgradePromptProps) {
    const isDismissed = useAiStore(selectUpgradePromptDismissed);
    const dismissPrompt = useAiStore((s) => s.dismissUpgradePrompt);

    // Check localStorage for previous dismissal
    const dismissedUntil = localStorage.getItem('demo-upgrade-dismissed-until');
    if (dismissedUntil && parseInt(dismissedUntil, 10) > Date.now()) {
        return null;
    }

    if (isDismissed) {
        return null;
    }

    const handleDismiss = () => {
        dismissPrompt();
        onDismiss?.();
    };

    return (
        <div className="relative p-4 bg-ronin-bg-tertiary rounded-lg border border-ronin-border mt-4">
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 text-ronin-text-secondary hover:text-ronin-text-primary transition-colors"
                aria-label="Dismiss"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3">
                <span className="text-xl">💡</span>
                <div className="flex-1">
                    <p className="text-sm font-medium text-ronin-text-primary">
                        Enjoying Ronin?
                    </p>
                    <p className="text-xs text-ronin-text-secondary mt-1">
                        Add your own API key for unlimited context recovery.
                    </p>
                    <div className="flex gap-2 mt-3">
                        <Button
                            size="sm"
                            onClick={onAddApiKey}
                            className="bg-ronin-brass hover:bg-ronin-brass/80"
                        >
                            <Key className="w-3 h-3 mr-1" />
                            Add API Key
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleDismiss}
                            className="text-ronin-text-secondary"
                        >
                            Not now
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleDismiss}
                            className="text-ronin-text-secondary text-xs"
                        >
                            Don't ask
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
