import { X, Minus, Square } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function WindowControls() {
    const handleMinimize = async () => {
        try {
            await getCurrentWindow().minimize();
        } catch { /* Tauri API unavailable in browser */ }
    };

    const handleMaximize = async () => {
        try {
            await getCurrentWindow().toggleMaximize();
        } catch { /* Tauri API unavailable in browser */ }
    };

    const handleClose = async () => {
        try {
            await getCurrentWindow().close();
        } catch { /* Tauri API unavailable in browser */ }
    };

    return (
        <div className="flex items-center gap-1">
            <button
                onClick={handleMinimize}
                className="p-2 hover:bg-muted rounded transition-colors"
                aria-label="Minimize window"
            >
                <Minus className="w-4 h-4" />
            </button>
            <button
                onClick={handleMaximize}
                className="p-2 hover:bg-muted rounded transition-colors"
                aria-label="Maximize window"
            >
                <Square className="w-4 h-4" />
            </button>
            <button
                onClick={handleClose}
                className="p-2 hover:bg-destructive hover:text-destructive-foreground rounded transition-colors"
                aria-label="Close window"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
