import { useState } from 'react';
import { ContextPanel } from '@/components/ContextPanel';
import { Button } from '@/components/ui/button';
import { ContextPanelState, AttributionData } from '@/types/context';

export function TestContextPanel() {
    const [state, setState] = useState<ContextPanelState>('idle');
    const [text, setText] = useState('');
    const [error, setError] = useState('');

    const mockAttribution: AttributionData = {
        commits: 15,
        searches: 3,
        sources: ['git', 'behavior']
    };

    const handleStream = () => {
        setState('streaming');
        setText('');
        const chunks = ["This is ", "a test ", "stream ", "of AI ", "context."];
        let i = 0;
        const interval = setInterval(() => {
            if (i < chunks.length) {
                setText(prev => prev + chunks[i]);
                i++;
            } else {
                clearInterval(interval);
                setState('complete');
            }
        }, 200);
    };

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-2xl font-serif">ContextPanel Harness</h1>
            
            <div className="flex gap-4">
                <Button onClick={() => { setState('idle'); setText(''); }}>Idle</Button>
                <Button onClick={handleStream}>Trigger Stream</Button>
                <Button onClick={() => { setState('complete'); setText('Full context loaded.'); }}>Complete</Button>
                <Button onClick={() => { setState('error'); setError('Simulated error.'); }}>Error</Button>
            </div>

            <div className="border border-border rounded-lg p-4 max-w-md bg-muted/20">
                <h3 className="mb-4 font-mono text-sm text-muted-foreground">Component Container</h3>
                <ContextPanel 
                    state={state} 
                    text={text}
                    attribution={state === 'complete' ? mockAttribution : undefined}
                    error={error}
                    onRetry={handleStream}
                />
            </div>
        </div>
    );
}
