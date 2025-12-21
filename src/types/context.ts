export type ContextPanelState = 'idle' | 'streaming' | 'complete' | 'error';
export type ErrorKind = 'offline' | 'ratelimit' | 'api' | 'unknown';

export interface AttributionData {
  commits: number;
  files: number;
  devlogLines?: number;
  searches?: number;
  sources: string[]; // 'git', 'devlog'
}

export interface ParsedError {
  kind: ErrorKind;
  message: string;
  retryAfter?: number;
}

export interface ContextPanelProps {
  state: ContextPanelState;
  text: string; // The streamed content
  attribution?: AttributionData;
  error?: string;
  parsedError?: ParsedError;
  onRetry?: () => void;
  cachedText?: string;
  cachedAttribution?: AttributionData;
  className?: string;
}
