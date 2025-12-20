import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface StreamingTextProps {
    text: string;
    isStreaming: boolean;
    speed?: number;
    className?: string;
    onComplete?: () => void;
}

/**
 * StreamingText component - displays text with typing animation
 * Used for AI response streaming in Epic 3
 */
export function StreamingText({
    text,
    isStreaming,
    speed = 20, // milliseconds per character
    className,
    onComplete
}: StreamingTextProps) {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Reset when text changes
    useEffect(() => {
        setDisplayedText('');
        setCurrentIndex(0);
    }, [text]);

    // Streaming animation
    useEffect(() => {
        if (!isStreaming || currentIndex >= text.length) {
            if (currentIndex >= text.length && onComplete) {
                onComplete();
            }
            return;
        }

        timeoutRef.current = setTimeout(() => {
            setDisplayedText(text.slice(0, currentIndex + 1));
            setCurrentIndex(prev => prev + 1);
        }, speed);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [isStreaming, currentIndex, text, speed, onComplete]);

    // Instant display when not streaming
    useEffect(() => {
        if (!isStreaming && text) {
            setDisplayedText(text);
            setCurrentIndex(text.length);
        }
    }, [isStreaming, text]);

    return (
        <div className={cn('whitespace-pre-wrap', className)}>
            {displayedText}
            {isStreaming && currentIndex < text.length && (
                <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-pulse" />
            )}
        </div>
    );
}
