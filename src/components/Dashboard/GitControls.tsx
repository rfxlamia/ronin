import { useState, useRef, useEffect } from 'react';
import { GitCommitHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import type { Project } from '@/types/project';

interface GitControlsProps {
    project: Project;
    onSuccess: () => void;
}

type Mode = 'idle' | 'editing' | 'submitting';

export function GitControls({ project, onSuccess }: GitControlsProps) {
    const [mode, setMode] = useState<Mode>('idle');
    const [message, setMessage] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Autofocus textarea when entering edit mode
    useEffect(() => {
        if (mode === 'editing' && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [mode]);

    const handleCommit = async () => {
        const trimmedMessage = message.trim();
        if (!trimmedMessage) {
            return; // Button should be disabled, but extra safety
        }

        setMode('submitting');

        try {
            await invoke<void>('commit_changes', {
                projectPath: project.path,
                message: trimmedMessage,
            });

            // Success!
            toast.success('✓ Changes committed');
            setMessage('');
            setMode('idle');
            onSuccess(); // Trigger git status refresh
        } catch (error) {
            // Error - show toast with stderr
            const errorMessage = String(error);
            // Truncate long error messages for toast (log full to console)
            const displayMessage = errorMessage.length > 200
                ? errorMessage.substring(0, 200) + '...'
                : errorMessage;

            console.error('Commit failed:', errorMessage);
            toast.error(`Commit failed: ${displayMessage}`, {
                duration: 6000, // Longer duration for error messages
            });

            // Stay in editing mode so user can fix and retry
            setMode('editing');
        }
    };

    const handleCancel = () => {
        setMessage('');
        setMode('idle');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter without Shift (includes Cmd/Ctrl+Enter): submit
        // Shift+Enter is NOT prevented, allowing new lines
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (message.trim()) {
                handleCommit();
            }
        }

        // Escape: cancel
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    if (mode === 'idle') {
        return (
            <div className="pt-2">
                <Button
                    onClick={() => setMode('editing')}
                    variant="outline"
                    size="sm"
                    className="w-full font-serif"
                >
                    <GitCommitHorizontal className="h-4 w-4 mr-2" />
                    Commit Changes
                </Button>
            </div>
        );
    }

    return (
        <div className="pt-2 space-y-2">
            <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Commit message (Enter to submit, Shift+Enter for new line, Esc to cancel)"
                className="min-h-[60px] font-sans text-sm resize-none"
                disabled={mode === 'submitting'}
            />
            <div className="flex gap-2">
                <Button
                    onClick={handleCommit}
                    disabled={!message.trim() || mode === 'submitting'}
                    size="sm"
                    className="flex-1 font-serif"
                >
                    {mode === 'submitting' ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Committing...
                        </>
                    ) : (
                        'Commit'
                    )}
                </Button>
                <Button
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                    disabled={mode === 'submitting'}
                    className="font-serif"
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
}
