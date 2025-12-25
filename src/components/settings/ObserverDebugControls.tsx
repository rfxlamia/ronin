import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function ObserverDebugControls() {
    const [observerRunning, setObserverRunning] = useState(false);
    const [observerLoading, setObserverLoading] = useState(false);

    const handleToggleObserver = async () => {
        setObserverLoading(true);
        try {
            if (observerRunning) {
                await invoke('stop_observer');
                console.log('[DEBUG] Observer stopped');
                setObserverRunning(false);
            } else {
                await invoke('start_observer');
                console.log('[DEBUG] Observer started');
                setObserverRunning(true);
            }
        } catch (error) {
            console.error('[DEBUG] Observer error:', error);
            alert(`Observer error: ${error}`);
        } finally {
            setObserverLoading(false);
        }
    };

    // Check observer status on mount
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const status = await invoke<boolean>('get_observer_status');
                setObserverRunning(status);
            } catch (error) {
                console.error('[DEBUG] Failed to check observer status:', error);
            }
        };
        checkStatus();
    }, []);

    return (
        <div className="flex items-center gap-4">
            <Badge variant={observerRunning ? "default" : "outline"} className="font-mono">
                {observerRunning ? '🟢 Running' : '⚫ Stopped'}
            </Badge>
            <Button
                onClick={handleToggleObserver}
                disabled={observerLoading}
                variant={observerRunning ? "destructive" : "default"}
                size="sm"
                className="font-sans"
            >
                {observerLoading ? 'Loading...' : (observerRunning ? 'Stop Daemon' : 'Start Daemon')}
            </Button>
            <p className="text-xs text-muted-foreground">
                X11 window tracking for context recovery
            </p>
        </div>
    );
}
