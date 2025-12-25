import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RoninOathModal } from '@/components/RoninOathModal';
import { ModeToggle } from '@/components/mode-toggle';
import { AiProviderSettings } from '@/components/settings/AiProviderSettings';
import { ObserverDebugControls } from '@/components/settings/ObserverDebugControls';
import { ExtensionMissingCard } from '@/components/settings/ExtensionMissingCard';

// Detect if running in Wayland environment
function isWaylandEnvironment(): boolean {
    // In a real Tauri app, we would query this from the backend
    // For now, check if we're in a browser-like environment (which would indicate Wayland)
    // This is a placeholder - proper detection happens in the Rust daemon
    const userAgent = navigator.userAgent.toLowerCase();
    // Check for common Wayland indicators in environment
    // Note: Proper detection should come from backend via IPC
    return userAgent.includes('wayland') || userAgent.includes('gnome');
}

export function Settings() {
    const [showOath, setShowOath] = useState(false);
    const [showExtensionCard, setShowExtensionCard] = useState(false);
    const [extensionSkipped, setExtensionSkipped] = useState(false);

    // Check if we should show the extension missing card
    useEffect(() => {
        // For now, show based on environment detection
        // In production, this would be triggered by receiving 'extension_missing' event
        const wayland = isWaylandEnvironment();
        const skipped = localStorage.getItem('ronin_extension_skipped') === 'true';
        setExtensionSkipped(skipped);
        setShowExtensionCard(wayland && !skipped);
    }, []);

    const handleExtensionSkip = () => {
        localStorage.setItem('ronin_extension_skipped', 'true');
        setExtensionSkipped(true);
        setShowExtensionCard(false);
    };

    return (
        <div className="p-8">
            <h2 className="text-3xl font-serif font-bold mb-6">Settings</h2>

            {/* Extension Missing Card (Wayland GNOME - Story 6.2 AC #2) */}
            {showExtensionCard && (
                <section className="mb-8">
                    <ExtensionMissingCard onSkip={handleExtensionSkip} />
                </section>
            )}

            {/* AI Provider Configuration Section */}
            <section className="mb-8">
                <h3 className="text-xl font-serif font-bold mb-3">AI Provider</h3>
                <p className="text-muted-foreground mb-4">
                    Configure your AI provider for context recovery features.
                </p>
                <AiProviderSettings />
            </section>

            {/* Appearance Section */}
            <section className="mb-8">
                <h3 className="text-xl font-serif font-bold mb-3">Appearance</h3>
                <p className="text-muted-foreground mb-4">
                    Choose your preferred color theme for Ronin.
                </p>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-sans">Theme:</span>
                    <ModeToggle />
                </div>
            </section>

            {/* Silent Observer Section */}
            <section className="mb-8">
                <h3 className="text-xl font-serif font-bold mb-3">Silent Observer</h3>
                <p className="text-muted-foreground mb-4">
                    Controls for the window tracking daemon (X11 and Wayland/GNOME).
                </p>
                <ObserverDebugControls />
                {extensionSkipped && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                        ⚠️ GNOME Extension setup was skipped. Window tracking may be limited on Wayland.
                        <button
                            onClick={() => {
                                localStorage.removeItem('ronin_extension_skipped');
                                setExtensionSkipped(false);
                                setShowExtensionCard(true);
                            }}
                            className="ml-2 underline hover:no-underline"
                        >
                            Show setup guide
                        </button>
                    </p>
                )}
            </section>

            {/* Philosophy Section */}
            <section className="mb-8">
                <h3 className="text-xl font-serif font-bold mb-3">Philosophy</h3>
                <p className="text-muted-foreground mb-4">
                    View the Ronin Oath that you saw when you started your journey.
                </p>
                <Button
                    variant="outline"
                    onClick={() => setShowOath(true)}
                    className="font-serif"
                >
                    View Ronin Oath
                </Button>
            </section>

            {/* Future settings sections will go here */}
            <p className="text-sm text-muted-foreground border-t pt-4">
                More settings will be available here in future releases.
            </p>

            {/* Ronin Oath Modal */}
            <RoninOathModal open={showOath} onClose={() => setShowOath(false)} />
        </div>
    );
}

