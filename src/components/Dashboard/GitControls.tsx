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

    // Calculate what states make push available
    const hasUnpushedCommits = status && status.unpushedCommits > 0;
    const hasUncommittedFiles = status && status.uncommittedFiles > 0;
    const hasConflicts = status?.hasConflicts ?? false;
    const canPush = hasUnpushedCommits && status?.hasRemote && !status?.isEmpty && !status?.isDetached;

    // Keyboard shortcut for push: Cmd/Ctrl+Shift+P
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Use same canPush logic as button
            if (
                mode === 'idle' &&
                (e.metaKey || e.ctrlKey) &&
                e.shiftKey &&
                e.key === 'P' &&
                canPush &&
                !isPushing
            ) {
                e.preventDefault();
                handlePush();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [mode, canPush, isPushing, handlePush]);

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
            if (message.trim() && !status?.hasConflicts) {  // Don't submit if conflicts exist
                handleCommit();
            }
        }

        // Escape: cancel
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    // Generate tooltip for push button based on state
    const getPushTooltip = () => {
        if (!status) return '';
        if (status.isDetached) return 'Cannot push in detached HEAD state';
        if (status.isEmpty) return 'No commits to push yet';
        if (!status.hasRemote) return 'No remote configured';
        if (!hasUnpushedCommits) return 'No unpushed commits';
        return 'Push to remote (⌘⇧P)';
    };

    if (mode === 'idle') {
        return (
            <div className="pt-2 space-y-2">
                {/* Commit button - only visible when there are uncommitted files, disabled if conflicts */}
                {hasUncommittedFiles && (
                    <Button
                        onClick={() => setMode('editing')}
                        variant="outline"
                        size="sm"
                        className="w-full font-serif"
                        disabled={hasConflicts}
                        title={hasConflicts ? 'Resolve conflicts first' : 'Commit changes'}
                    >
                        <GitCommitHorizontal className="h-4 w-4 mr-2" />
                        {hasConflicts ? 'Resolve Conflicts' : 'Commit Changes'}
                    </Button>
                )}

                {/* Push button - only visible when appropriate */}
                {canPush && (
                    <Button
                        onClick={handlePush}
                        disabled={isPushing}
                        variant="outline"
                        size="sm"
                        className="w-full font-serif"
                        title={getPushTooltip()}
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

    // Commit editor mode
    const placeholderText = hasConflicts
        ? 'Resolve conflicts in terminal before committing'
        : 'Commit message (Enter to submit, Shift+Enter for new line, Esc to cancel)';

    return (
        <div className="pt-2 space-y-2">
            <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholderText}
                className="min-h-[60px] font-sans text-sm resize-none"
                disabled={mode === 'submitting' || hasConflicts}
            />
            <div className="flex gap-2">
                <Button
                    onClick={handleCommit}
                    disabled={!message.trim() || mode === 'submitting' || hasConflicts}
                    size="sm"
                    className="flex-1 font-serif"
                    title={hasConflicts ? 'Cannot commit with conflicts' : ''}
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
