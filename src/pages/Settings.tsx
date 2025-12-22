import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RoninOathModal } from '@/components/RoninOathModal';
import { ModeToggle } from '@/components/mode-toggle';
import { AiProviderSettings } from '@/components/settings/AiProviderSettings';

export function Settings() {
    const [showOath, setShowOath] = useState(false);

    return (
        <div className="p-8">
            <h2 className="text-3xl font-serif font-bold mb-6">Settings</h2>

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
