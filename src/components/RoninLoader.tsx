import { useEffect, useState } from 'react';

interface RoninLoaderProps {
    onComplete: () => void;
}

export function RoninLoader({ onComplete }: RoninLoaderProps) {
    const [fontsLoaded, setFontsLoaded] = useState(false);
    const [minTimeElapsed, setMinTimeElapsed] = useState(false);

    useEffect(() => {
        // Ensure 1-second minimum ritual duration
        const minTimer = setTimeout(() => setMinTimeElapsed(true), 1000);

        // Check if all fonts are loaded
        const checkFonts = async () => {
            try {
                await document.fonts.ready;
                setFontsLoaded(true);
            } catch (error) {
                console.error('Font loading error:', error);
                // Proceed anyway after minimum time
                setFontsLoaded(true);
            }
        };

        checkFonts();

        return () => clearTimeout(minTimer);
    }, []);

    useEffect(() => {
        // Complete ritual only when both fonts loaded AND minimum time elapsed
        if (fontsLoaded && minTimeElapsed) {
            onComplete();
        }
    }, [fontsLoaded, minTimeElapsed, onComplete]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-6">
                <img
                    src="/assets/loading/ronin-loader-pulse.svg"
                    alt="Ronin meditation"
                    className="w-48 h-48 object-contain"
                    style={{
                        animation: 'ronin-pulse 2s ease-in-out infinite',
                    }}
                />
                <p className="text-xl font-serif text-foreground">
                    Analyzing your activity...
                </p>
            </div>
        </div>
    );
}
