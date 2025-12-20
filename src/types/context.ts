export type ContextPanelState = 'idle' | 'streaming' | 'complete' | 'error';

export interface AttributionData {
  commits: number;
  files: number;
  devlogLines?: number;
  searches?: number;
  sources: string[]; // Currently: 'git'. Future: 'devlog', 'behavior'
}

export interface ContextPanelProps {
  state: ContextPanelState;
  text: string; // The streamed content
  attribution?: AttributionData;
  error?: string;
  onRetry?: () => void;
  className?: string;
}
