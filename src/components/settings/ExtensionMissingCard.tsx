import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import { useState } from 'react';

interface ExtensionMissingCardProps {
    onSkip?: () => void;
}

/**
 * Card displayed when GNOME Shell Extension is not found on Wayland.
 * Shows installation instructions and allows the user to skip setup.
 * 
 * Story 6.2: Window Title Tracking (Wayland GNOME) - AC #2
 */
export function ExtensionMissingCard({ onSkip }: ExtensionMissingCardProps) {
    const [isSkipped, setIsSkipped] = useState(false);

    if (isSkipped) {
        return null;
    }

    const handleSkip = () => {
        setIsSkipped(true);
        onSkip?.();
    };

    const handleOpenExtensions = () => {
        // Open GNOME Extensions website in default browser
        window.open('https://extensions.gnome.org/', '_blank');
    };

    return (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertTitle className="font-serif text-lg">
                GNOME Shell Extension Required
            </AlertTitle>
            <AlertDescription className="mt-3 space-y-4">
                <p className="text-sm text-muted-foreground">
                    Window title tracking on Wayland requires the <strong>Ronin Observer Extension</strong>
                    {' '}to be installed in GNOME Shell. Without it, Silent Observer features will be limited.
                </p>

                <div className="bg-muted/50 rounded-md p-4 space-y-2">
                    <h4 className="font-semibold text-sm">Installation Steps:</h4>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                        <li>Open GNOME Extensions website</li>
                        <li>Search for "Ronin Observer" extension</li>
                        <li>Click "Install" and enable the extension</li>
                        <li>Restart the Observer daemon in Ronin</li>
                    </ol>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleOpenExtensions}
                        className="font-sans"
                    >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open GNOME Extensions
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSkip}
                        className="font-sans text-muted-foreground"
                    >
                        <X className="h-4 w-4 mr-2" />
                        Skip for Now
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground italic">
                    Note: The extension is currently in development. X11 users can track windows without it.
                </p>
            </AlertDescription>
        </Alert>
    );
}
