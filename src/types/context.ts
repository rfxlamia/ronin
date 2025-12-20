export type ContextPanelState = 'idle' | 'streaming' | 'complete' | 'error';

export interface AttributionData {
  commits?: number;
  devlogLines?: number;
  searches?: number;
  sources: ('git' | 'devlog' | 'behavior')[];
}

export interface ContextPanelProps {
  state: ContextPanelState;
  text: string; // The streamed content
  attribution?: AttributionData;
  error?: string;
  onRetry?: () => void;
  className?: string;
}
