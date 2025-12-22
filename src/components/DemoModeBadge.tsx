/**
 * Demo Mode Badge Component
 * Story 4.25-2: AWS Lambda Demo Mode Proxy
 *
 * Shows "Demo Mode" indicator when demo provider is active
 */

import { Info } from 'lucide-react';
import { useAiStore, selectDefaultProvider, selectDemoQuota } from '@/stores/aiStore';

interface DemoModeBadgeProps {
    className?: string;
}

export function DemoModeBadge({ className = '' }: DemoModeBadgeProps) {
    const defaultProvider = useAiStore(selectDefaultProvider);
    const demoQuota = useAiStore(selectDemoQuota);

    if (defaultProvider !== 'demo') {
        return null;
    }

    const tooltipText = demoQuota
        ? `${demoQuota.remainingHourly} requests/hour remaining. Add your API key for unlimited use.`
        : '10 requests/hour. Add your API key for unlimited use.';

    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-300 ${className}`}
            title={tooltipText}
        >
            Demo Mode
            <Info className="w-3 h-3" />
        </span>
    );
}
