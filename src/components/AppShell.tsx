import { WindowControls } from './WindowControls';
import { Link, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { Settings, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const location = useLocation();
    const isOnSettings = location.pathname === '/settings';

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Custom Title Bar - Fixed Position */}
            <header
                data-tauri-drag-region
                className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-border bg-card"
            >
                {/* Logo area */}
                <h1 className="text-2xl font-serif font-bold text-foreground select-none pointer-events-none">
                    Ronin
                </h1>
                {/* Non-draggable controls area */}
                <nav className="flex items-center gap-2">
                    {isOnSettings ? (
                        <Button variant="ghost" size="icon" asChild title="Dashboard">
                            <Link to="/">
                                <Home className="h-[1.2rem] w-[1.2rem]" />
                                <span className="sr-only">Dashboard</span>
                            </Link>
                        </Button>
                    ) : (
                        <Button variant="ghost" size="icon" asChild title="Settings">
                            <Link to="/settings">
                                <Settings className="h-[1.2rem] w-[1.2rem]" />
                                <span className="sr-only">Settings</span>
                            </Link>
                        </Button>
                    )}
                    <WindowControls />
                </nav>
            </header>

            {/* Main Content Area - Padding for fixed header */}
            <main className="flex-1 overflow-auto animate-fade-in pt-[73px]">
                {children}
            </main>
        </div>
    );
}
