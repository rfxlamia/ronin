import { StreamingText } from './ui/streaming-text';
import { cn } from '@/lib/utils';

interface ContextPanelProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children?: React.ReactNode;
    className?: string;
}

/**
 * ContextPanel component - foundation for Epic 3 AI consulting
 * Will be extended with git history, project context, and AI responses
 */
export function ContextPanel({
    isOpen,
    onClose,
    title = 'Context',
    children,
    className
}: ContextPanelProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className={cn(
                    'ml-auto w-full max-w-2xl bg-card border-l shadow-xl',
                    'flex flex-col h-full relative',
                    'animate-in slide-in-from-right duration-300',
                    className
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-xl font-serif font-bold">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-sm transition-colors"
                        aria-label="Close panel"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

// Export both components
export { StreamingText };
