import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { AttributionData, ParsedError } from '@/types/context';

export type ContextState = 'idle' | 'streaming' | 'complete' | 'error';

// Re-export types for backward compatibility
export type Attribution = AttributionData;
export type { ParsedError } from '@/types/context';

export interface AiContextData {
  contextState: ContextState;
  contextText: string;
  attribution: Attribution | null;
  error: string | null;
  parsedError: ParsedError | null;
  isCached: boolean;
}

/**
 * Parse error message to determine error kind and extract metadata.
 * Error format from backend:
 * - OFFLINE:{message}
 * - RATELIMIT:{seconds}:{message}
 * - APIERROR:{code}:{message}
 */
export function parseError(message: string): ParsedError {
  if (message.startsWith('OFFLINE:')) {
    return {
      kind: 'offline',
      message: message.slice(8) || 'No network connection',
    };
  }

  if (message.startsWith('RATELIMIT:')) {
    const parts = message.split(':');
    const seconds = parseInt(parts[1], 10);
    const msg = parts.slice(2).join(':') || 'AI resting';
    return {
      kind: 'ratelimit',
      message: msg,
      retryAfter: isNaN(seconds) ? 30 : seconds,
    };
  }

  if (message.startsWith('APIERROR:')) {
    const parts = message.split(':');
    const msg = parts.slice(2).join(':') || 'Server error';
    return {
      kind: 'api',
      message: msg,
    };
  }

  return {
    kind: 'unknown',
    message: message || 'Something went wrong',
  };
}

export function useAiContext(projectId: number | null) {
  const [state, setState] = useState<AiContextData>({
    contextState: 'idle',
    contextText: '',
    attribution: null,
    error: null,
    parsedError: null,
    isCached: false,
  });

  const generateContext = useCallback(async () => {
    if (!projectId) {
      setState((prev) => ({
        ...prev,
        contextState: 'error',
        error: 'No project selected',
      }));
      return;
    }

    // Reset state
    setState({
      contextState: 'streaming',
      contextText: '',
      attribution: null,
      error: null,
      parsedError: null,
      isCached: false,
    });

    try {
      await invoke('generate_context', { projectId });
    } catch (error) {
      console.error('Failed to invoke generate_context:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const parsed = parseError(errorMessage);
      setState((prev) => ({
        ...prev,
        contextState: 'error',
        error: errorMessage,
        parsedError: parsed,
      }));
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    // Trigger generation when projectId becomes available
    generateContext();

    const unlistenPromises = Promise.all([
      listen('ai-chunk', (event: { payload: { text: string } }) => {
        setState((prev) => {
          // CRITICAL: Ignore chunks that arrive after complete or error
          // This prevents race condition where late chunks cause blinking
          if (prev.contextState !== 'streaming') {
            return prev;
          }
          return {
            ...prev,
            contextState: 'streaming',
            contextText: prev.contextText + event.payload.text,
          };
        });
      }),

      listen(
        'ai-complete',
        (event: {
          payload: {
            text: string;
            attribution: {
              commits: number;
              files: number;
              sources: string[];
              devlog_lines?: number;
              ai_sessions?: number;
            };
            cached?: boolean;
          };
        }) => {
          // Transform snake_case from backend to camelCase for frontend
          const attr = event.payload.attribution;
          const transformedAttribution: Attribution = {
            commits: attr.commits,
            files: attr.files,
            sources: attr.sources,
            devlogLines: attr.devlog_lines,
            aiSessions: attr.ai_sessions,
          };

          setState((prev) => ({
            ...prev,
            contextState: 'complete',
            // Keep the accumulated streamed text; only use payload text for cached responses
            // or if no text was accumulated (edge case)
            contextText: prev.contextText || event.payload.text || '',
            attribution: transformedAttribution,
            isCached: event.payload.cached || false,
            error: null,
          }));
        }
      ),

      listen('ai-error', (event: { payload: { message: string } }) => {
        setState((prev) => {
          // CRITICAL: Ignore errors that arrive after complete
          // This prevents race condition where late errors cause blinking
          if (prev.contextState === 'complete') {
            return prev;
          }
          const parsed = parseError(event.payload.message);
          return {
            ...prev,
            contextState: 'error',
            error: event.payload.message,
            parsedError: parsed,
          };
        });
      }),
    ]);

    return () => {
      unlistenPromises.then((listeners) => {
        listeners.forEach((unlisten) => unlisten());
      });
    };
  }, [projectId, generateContext]);

  return {
    ...state,
    generateContext,
    retry: generateContext,
  } as const;
}
