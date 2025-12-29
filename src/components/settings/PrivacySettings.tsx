import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { X, Plus, Eye, Trash2 } from 'lucide-react';
import { useObserverSettings } from '@/hooks/useObserverSettings';
import { DataViewerDialog } from '@/components/DataViewerDialog';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function PrivacySettings() {
    const {
        settings,
        loading,
        daemonRunning,
        toggleObserver,
        addExcludedApp,
        removeExcludedApp,
        addExcludedUrl,
        removeExcludedUrl,
    } = useObserverSettings();

    const [appInput, setAppInput] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [showDataViewer, setShowDataViewer] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [toggling, setToggling] = useState(false);

    const handleToggle = async () => {
        setToggling(true);
        try {
            await toggleObserver();
        } finally {
            setToggling(false);
        }
    };

    const handleAddApp = async () => {
        if (!appInput.trim()) return;
        await addExcludedApp(appInput.trim());
        setAppInput('');
    };

    const handleAddUrl = async () => {
        if (!urlInput.trim()) return;
        await addExcludedUrl(urlInput.trim());
        setUrlInput('');
    };

    const handleDeleteAllData = async () => {
        setDeleting(true);
        try {
            const count = await invoke<number>('delete_all_observer_data');
            toast.success(`Deleted ${count} events`);
            setShowDeleteDialog(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete data');
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return <div className="p-6 text-muted-foreground">Loading settings...</div>;
    }

    if (!settings) {
        return <div className="p-6 text-destructive">Failed to load settings</div>;
    }

    return (
        <div className="space-y-8">
            {/* Observer Toggle */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="observer-enabled" className="text-base font-display">
                            Enable Silent Observer
                        </Label>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${daemonRunning
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-muted text-muted-foreground'
                            }`}>
                            {daemonRunning ? '🟢 Running' : '⚫ Stopped'}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Track window focus and file changes to provide context
                    </p>
                </div>
                <Switch
                    id="observer-enabled"
                    checked={settings.enabled}
                    onCheckedChange={handleToggle}
                    disabled={toggling}
                />
            </div>

            <div className="border-t pt-6" />

            {/* Excluded Applications */}
            <div className="space-y-4">
                <div>
                    <h3 className="text-base font-display mb-1">Excluded Applications</h3>
                    <p className="text-sm text-muted-foreground">
                        Applications that will not be tracked
                    </p>
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="e.g., Brave, signal-desktop"
                        value={appInput}
                        onChange={(e) => setAppInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddApp()}
                    />
                    <Button onClick={handleAddApp} size="icon" variant="outline">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                {settings.excluded_apps.length > 0 ? (
                    <div className="space-y-2">
                        {settings.excluded_apps.map((app) => (
                            <div
                                key={app}
                                className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md"
                            >
                                <span className="text-sm font-mono">{app}</span>
                                <Button
                                    onClick={() => removeExcludedApp(app)}
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic">
                        No excluded applications
                    </p>
                )}
            </div>

            <div className="border-t pt-6" />

            {/* Excluded URL Patterns */}
            <div className="space-y-4">
                <div>
                    <h3 className="text-base font-display mb-1">Excluded URL Patterns</h3>
                    <p className="text-sm text-muted-foreground">
                        Regex patterns for URLs/domains to exclude (e.g., .*bank.*, .*private.*)
                    </p>
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="e.g., .*bank.*, .*private.*"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                    />
                    <Button onClick={handleAddUrl} size="icon" variant="outline">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                {settings.excluded_url_patterns.length > 0 ? (
                    <div className="space-y-2">
                        {settings.excluded_url_patterns.map((pattern) => (
                            <div
                                key={pattern}
                                className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md"
                            >
                                <span className="text-sm font-mono">{pattern}</span>
                                <Button
                                    onClick={() => removeExcludedUrl(pattern)}
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic">
                        No excluded URL patterns
                    </p>
                )}
            </div>

            <div className="border-t pt-6" />

            {/* Action Buttons */}
            <div className="flex gap-3">
                <Button onClick={() => setShowDataViewer(true)} variant="outline">
                    <Eye className="mr-2 h-4 w-4" />
                    View Collected Data
                </Button>
                <Button
                    onClick={() => setShowDeleteDialog(true)}
                    variant="destructive"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All Data
                </Button>
            </div>

            {/* Data Viewer Dialog */}
            <DataViewerDialog open={showDataViewer} onOpenChange={setShowDataViewer} />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete All Observer Data?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete all behavioral tracking data. Context recovery will rely only on Git
                            and DEVLOG until Observer collects new data. Continue?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteAllData}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? 'Deleting...' : 'Delete All'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
