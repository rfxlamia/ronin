import { useEffect, useState } from 'react';

interface RoninLoaderProps {
    onComplete?: () => void;
    variant?: 'fullscreen' | 'inline';
}

export function RoninLoader({ onComplete, variant = 'fullscreen' }: RoninLoaderProps) {
    const [fontsLoaded, setFontsLoaded] = useState(false);
    const [minTimeElapsed, setMinTimeElapsed] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        // Check reduced motion preference
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        
        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } 
        // Fallback for older browsers (though unlikely needed for Tauri)
        else if (mediaQuery.addListener) {
            mediaQuery.addListener(handleChange);
            return () => mediaQuery.removeListener(handleChange);
        }
    }, []);

    useEffect(() => {
        // Only run the ritual logic if onComplete is provided
        if (!onComplete) return;

        // Ensure 1-second minimum ritual duration
        const minTimer = setTimeout(() => setMinTimeElapsed(true), 1000);

        // Check if all fonts are loaded
        const checkFonts = async () => {
            try {
                await document.fonts.ready;
            } catch { /* Font loading failed, proceed anyway */ }
            setFontsLoaded(true);
        };

        checkFonts();

        return () => clearTimeout(minTimer);
    }, [onComplete]);

    useEffect(() => {
        // Complete ritual only when both fonts loaded AND minimum time elapsed
        if (onComplete && fontsLoaded && minTimeElapsed) {
            onComplete();
        }
    }, [fontsLoaded, minTimeElapsed, onComplete]);

    const isInline = variant === 'inline';
    
    // Base classes
    const containerClasses = isInline 
        ? "inline-block" 
        : "fixed inset-0 z-50 flex items-center justify-center bg-background";
        
    const contentClasses = isInline
        ? "flex items-center gap-2"
        : "flex flex-col items-center gap-6";
        
    const imageSize = isInline ? "w-6 h-6" : "w-48 h-48";
    
    // Animation logic
    const animationClass = prefersReducedMotion ? "opacity-70" : "animate-ronin-pulse";

    return (
        <div className={containerClasses}>
            <div className={contentClasses}>
                <img
                    src="/assets/loading/ronin-loader-pulse.svg"
                    alt="Ronin meditation"
                    className={`${imageSize} object-contain ${animationClass}`}
                />
                {!isInline && (
                    <p className="text-xl font-serif text-foreground">
                        Analyzing your activity...
                    </p>
                )}
                {isInline && (
                     <span className="sr-only">Analyzing your activity...</span>
                )}
            </div>
        </div>
    );
}