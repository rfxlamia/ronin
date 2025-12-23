import { useState, useRef, useEffect, useCallback } from 'react';
import { GitCommitHorizontal, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import type { Project } from '@/types/project';
import type { GitDisplayStatus } from '@/types/git';

interface GitControlsProps {
    project: Project;
    onSuccess: () => void;
    status: GitDisplayStatus | null;
}

type Mode = 'idle' | 'editing' | 'submitting';

export function GitControls({ project, onSuccess, status }: GitControlsProps) {
    const [mode, setMode] = useState<Mode>('idle');
    const [message, setMessage] = useState('');
    const [isPushing, setIsPushing] = useState(false);
    const [showRemoteAheadDialog, setShowRemoteAheadDialog] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Autofocus textarea when entering edit mode
    useEffect(() => {
        if (mode === 'editing' && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [mode]);

    // Stable handlePush callback for keyboard shortcut
    const handlePush = useCallback(async () => {
        setIsPushing(true);

        try {
            await invoke<void>('safe_push', {
                projectPath: project.path,
            });

            // Success!
            toast.success('✓ Pushed to remote');
            onSuccess(); // Trigger git status refresh
        } catch (error) {
            const errorMessage = String(error);

            // Handle specific error codes
            if (errorMessage === 'ERR_REMOTE_AHEAD') {
                setShowRemoteAheadDialog(true);
            } else if (errorMessage === 'ERR_NO_UPSTREAM') {
                toast.error('No upstream configured. Please push via terminal first.');
            } else if (errorMessage === 'ERR_FETCH_FAILED') {
                toast.error('Could not reach remote. Check your network connection.');
            } else if (errorMessage === 'ERR_PUSH_FAILED') {
                toast.error('Push failed. Open terminal to resolve.');
            } else {
                // Generic failure
                console.error('Push failed:', errorMessage);
                toast.error('Push failed. Open terminal to resolve.', {
                    duration: 6000,
                });
            }
        } finally {
            setIsPushing(false);
        }
    }, [project.path, onSuccess]);

    // Keyboard shortcut for push: Cmd/Ctrl+Shift+P
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only trigger if not in editing mode and there are unpushed commits
            if (
                mode === 'idle' &&
                (e.metaKey || e.ctrlKey) &&
                e.shiftKey &&
                e.key === 'P' &&
                status &&
                status.unpushedCommits > 0
            ) {
                e.preventDefault();
                handlePush();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [mode, status?.unpushedCommits, handlePush]);

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

    const hasUnpushedCommits = status && status.unpushedCommits > 0;

    if (mode === 'idle') {
        return (
            <div className="pt-2 space-y-2">
                <Button
                    onClick={() => setMode('editing')}
                    variant="outline"
                    size="sm"
                    className="w-full font-serif"
                >
                    <GitCommitHorizontal className="h-4 w-4 mr-2" />
                    Commit Changes
                </Button>

                {/* Push button - only visible when there are unpushed commits */}
                {hasUnpushedCommits && (
                    <Button
                        onClick={handlePush}
                        disabled={isPushing}
                        variant="outline"
                        size="sm"
                        className="w-full font-serif"
                    >
                        {isPushing ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Pushing...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4 mr-2" />
                                Push to Remote
                            </>
                        )}
                    </Button>
                )}

                {/* Remote Ahead Warning Dialog */}
                <AlertDialog open={showRemoteAheadDialog} onOpenChange={setShowRemoteAheadDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remote Changes Detected</AlertDialogTitle>
                            <AlertDialogDescription>
                                The remote branch has changes you don't have yet. Please pull via terminal before pushing.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction onClick={() => setShowRemoteAheadDialog(false)}>
                                OK
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
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
