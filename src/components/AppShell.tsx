import { ModeToggle } from './mode-toggle';
import { WindowControls } from './WindowControls';
import { Link } from 'react-router-dom';
import { ReactNode } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Custom Title Bar */}
            <header
                data-tauri-drag-region
                className="flex items-center justify-between px-6 py-4 border-b border-border bg-card"
            >
                {/* Logo area */}
                <h1 className="text-2xl font-serif font-bold text-foreground select-none pointer-events-none">
                    Ronin
                </h1>
                {/* Non-draggable controls area */}
                <nav className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild title="Settings">
                        <Link to="/settings">
                            <Settings className="h-[1.2rem] w-[1.2rem]" />
                            <span className="sr-only">Settings</span>
                        </Link>
                    </Button>
                    <ModeToggle />
                    <WindowControls />
                </nav>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto animate-fade-in">
                {children}
            </main>
        </div>
    );
}
