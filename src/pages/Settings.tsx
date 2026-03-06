import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RoninOathModal } from '@/components/RoninOathModal';
import { ModeToggle } from '@/components/mode-toggle';
import { AiProviderSettings } from '@/components/settings/AiProviderSettings';
import { ExtensionMissingCard } from '@/components/settings/ExtensionMissingCard';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { usePlatformStore } from '@/stores/platformStore';

// Detect if running in Wayland environment (Linux only)
// Uses backend-driven platform detection for reliability
function isWaylandEnvironment(): boolean {
    // Only relevant on Linux -- navigator.userAgent heuristic for Wayland
    // TODO: Replace with proper backend query (e.g., check XDG_SESSION_TYPE env var via Tauri command)
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('wayland') || userAgent.includes('gnome');
}

export function Settings() {
    const [showOath, setShowOath] = useState(false);
    const [showExtensionCard, setShowExtensionCard] = useState(false);
    const [extensionSkipped, setExtensionSkipped] = useState(false);
    const isLinux = usePlatformStore((s) => s.isLinux)();

    // Check if we should show the extension missing card (Linux only)
    useEffect(() => {
        if (!isLinux) {
            setShowExtensionCard(false);
            return;
        }
        // Only check Wayland detection on Linux
        const wayland = isWaylandEnvironment();
        const skipped = localStorage.getItem('ronin_extension_skipped') === 'true';
        setExtensionSkipped(skipped);
        setShowExtensionCard(wayland && !skipped);
    }, [isLinux]);

    const handleExtensionSkip = () => {
        localStorage.setItem('ronin_extension_skipped', 'true');
        setExtensionSkipped(true);
        setShowExtensionCard(false);
    };

    return (
        <div className="p-8">
            <h2 className="text-3xl font-serif font-bold mb-6">Settings</h2>

            {/* Extension Missing Card (Wayland GNOME - Story 6.2 AC #2, Linux only) */}
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

            {/* Silent Observer Section -- Full controls on Linux, informational on other platforms */}
            <section className="mb-8">
                <h3 className="text-xl font-serif font-bold mb-3">Silent Observer</h3>
                {isLinux ? (
                    <>
                        <p className="text-muted-foreground mb-4">
                            Control what the window tracking daemon observes and view collected data.
                        </p>
                        <PrivacySettings />
                        {extensionSkipped && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-4">
                                GNOME Extension setup was skipped. Window tracking may be limited on Wayland.
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
                    </>
                ) : (
                    <p className="text-muted-foreground">
                        Window tracking is available on Linux only. Support for macOS and Windows is coming in a future release.
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

