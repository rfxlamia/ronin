import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LightModalProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
}

/**
 * Lightweight modal without Radix overhead
 * Faster initialization, simpler DOM
 */
export function LightModal({ open, onClose, children, className }: LightModalProps) {
    // Close on Escape
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (open) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [open, handleKeyDown]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Content */}
            <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className={cn(
                        "relative bg-card border rounded-lg shadow-lg p-6 pointer-events-auto",
                        "w-full max-w-md max-h-[85vh] overflow-auto",
                        className
                    )}
                    role="dialog"
                    aria-modal="true"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    {children}
                </div>
            </div>
        </div>
    );
}
