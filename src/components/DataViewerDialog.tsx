import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ObserverEvent {
    id: number;
    timestamp: number;
    event_type: string;
    window_title: string | null;
    process_name: string | null;
    file_path: string | null;
    project_name: string | null;
}

interface DataViewerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DataViewerDialog({ open, onOpenChange }: DataViewerDialogProps) {
    const [events, setEvents] = useState<ObserverEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const parentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) {
            loadEvents();
        }
    }, [open]);

    const loadEvents = async () => {
        setLoading(true);
        try {
            const result = await invoke<ObserverEvent[]>('get_observer_data', { limit: 100 });
            setEvents(result);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString();
    };

    // Story 6.5: Virtualize list for 100+ rows (AC #5)
    const rowVirtualizer = useVirtualizer({
        count: events.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 48, // Estimated row height in pixels
        overscan: 5,
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="font-display">Collected Observer Data</DialogTitle>
                    <DialogDescription>
                        Showing up to 100 most recent events
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">
                        Loading events...
                    </div>
                ) : events.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        No events collected yet
                    </div>
                ) : (
                    <div className="overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-[150px_80px_1fr_120px] gap-2 px-4 py-2 bg-muted/50 font-medium text-sm border-b">
                            <div>Timestamp</div>
                            <div>Type</div>
                            <div>Details</div>
                            <div>Project</div>
                        </div>

                        {/* Virtualized Table Body */}
                        <div
                            ref={parentRef}
                            className="max-h-[50vh] overflow-auto"
                        >
                            <div
                                style={{
                                    height: `${rowVirtualizer.getTotalSize()}px`,
                                    width: '100%',
                                    position: 'relative',
                                }}
                            >
                                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                    const event = events[virtualRow.index];
                                    return (
                                        <div
                                            key={event.id}
                                            className="grid grid-cols-[150px_80px_1fr_120px] gap-2 px-4 py-2 border-b border-border/50 items-center"
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: `${virtualRow.size}px`,
                                                transform: `translateY(${virtualRow.start}px)`,
                                            }}
                                        >
                                            <div className="text-xs text-muted-foreground">
                                                {formatTimestamp(event.timestamp)}
                                            </div>
                                            <div className="text-sm">
                                                {event.event_type === 'window_focus' ? '🪟 Focus' : '📄 File'}
                                            </div>
                                            <div className="text-sm font-mono truncate">
                                                {event.window_title || event.file_path || '-'}
                                                {event.process_name && (
                                                    <span className="text-muted-foreground ml-2">
                                                        ({event.process_name})
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-muted-foreground truncate">
                                                {event.project_name || '-'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
