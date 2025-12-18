import { ModeToggle } from './mode-toggle';
import { WindowControls } from './WindowControls';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ReactNode } from 'react';

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const handleDragStart = async (e: React.MouseEvent) => {
        // Only start drag if clicking on the title bar area (not on buttons)
        if ((e.target as HTMLElement).closest('button')) return;

        try {
            const appWindow = getCurrentWindow();
            await appWindow.startDragging();
        } catch (error) {
            console.error('Failed to start dragging:', error);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Custom Title Bar */}
            <header
                onMouseDown={handleDragStart}
                className="flex items-center justify-between px-6 py-4 border-b border-border bg-card cursor-move"
            >
                {/* Logo area */}
                <h1 className="text-2xl font-serif font-bold text-foreground select-none">
                    Ronin
                </h1>
                {/* Non-draggable controls area */}
                <div className="flex items-center gap-4 cursor-default">
                    <ModeToggle />
                    <WindowControls />
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
