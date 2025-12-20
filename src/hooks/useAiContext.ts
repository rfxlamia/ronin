import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { AttributionData } from '@/types/context';

export type ContextState = 'idle' | 'streaming' | 'complete' | 'error';

// Re-export for backward compatibility
export type Attribution = AttributionData;

export interface AiContextData {
  contextState: ContextState;
  contextText: string;
  attribution: Attribution | null;
  error: string | null;
  isCached: boolean;
}

export function useAiContext(projectId: number | null) {
  const [state, setState] = useState<AiContextData>({
    contextState: 'idle',
    contextText: '',
    attribution: null,
    error: null,
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
      isCached: false,
    });

    try {
      await invoke('generate_context', { projectId });
    } catch (error) {
      console.error('Failed to invoke generate_context:', error);
      setState((prev) => ({
        ...prev,
        contextState: 'error',
        error: String(error),
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
            attribution: Attribution;
            cached?: boolean;
          };
        }) => {
          setState((prev) => ({
            ...prev,
            contextState: 'complete',
            // Keep the accumulated streamed text; only use payload text for cached responses
            // or if no text was accumulated (edge case)
            contextText: prev.contextText || event.payload.text || '',
            attribution: event.payload.attribution,
            isCached: event.payload.cached || false,
            error: null,
          }));
        }
      ),

      listen('ai-error', (event: { payload: { message: string } }) => {
        setState((prev) => ({
          ...prev,
          contextState: 'error',
          error: event.payload.message,
        }));
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
  };
}
