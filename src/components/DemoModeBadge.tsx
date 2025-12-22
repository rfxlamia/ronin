/**
 * Demo Mode Badge Component
 * Story 4.25-2: AWS Lambda Demo Mode Proxy
 * Story 4.25-3: Provider Settings UI & Multi-Key Storage
 *
 * Shows "Demo Mode" indicator when demo provider is active
 * Click navigates to provider settings
 */

import { Info } from 'lucide-react';
import { useAiStore, selectDefaultProvider, selectDemoQuota } from '@/stores/aiStore';

interface DemoModeBadgeProps {
    className?: string;
    onClick?: () => void;
}

export function DemoModeBadge({ className = '', onClick }: DemoModeBadgeProps) {
    const defaultProvider = useAiStore(selectDefaultProvider);
    const demoQuota = useAiStore(selectDemoQuota);

    if (defaultProvider !== 'demo') {
        return null;
    }

    const tooltipText = demoQuota
        ? `${demoQuota.remainingHourly} requests/hour remaining. Add your API key for unlimited use.`
        : '10 requests/hour. Add your API key for unlimited use.';

    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer ${className}`}
            title={tooltipText}
        >
            Demo Mode
            <Info className="w-3 h-3" />
        </button>
    );
}
