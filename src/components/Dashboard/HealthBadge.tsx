import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type HealthStatus = 'Active' | 'Dormant' | 'Stuck' | 'Attention';

interface HealthBadgeProps {
    status: HealthStatus;
    className?: string;
}

const healthConfig: Record<HealthStatus, { emoji: string; colorClass: string }> = {
    Active: {
        emoji: '🔥',
        colorClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
    Dormant: {
        emoji: '😴',
        colorClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    },
    Stuck: {
        emoji: '⚠️',
        colorClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    },
    Attention: {
        emoji: '📌',
        colorClass: 'bg-[#CC785C]/10 text-[#CC785C] dark:bg-[#CC785C]/20',
    },
};

export function HealthBadge({ status, className }: HealthBadgeProps) {
    const config = healthConfig[status];

    return (
        <Badge
            aria-label={`Project status: ${status}`}
            className={cn(
                'font-sans gap-1',
                config.colorClass,
                className
            )}
        >
            <span aria-hidden="true">{config.emoji}</span>
            <span>{status}</span>
        </Badge>
    );
}
