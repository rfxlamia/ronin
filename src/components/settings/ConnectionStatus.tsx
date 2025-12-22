/**
 * Connection Status Component
 * Story 4.25-3: Provider Settings UI & Multi-Key Storage
 *
 * Shows connection status badge/indicator for a provider
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Plug } from 'lucide-react';

export type ConnectionState = 'idle' | 'testing' | 'connected' | 'error';

interface ConnectionStatusProps {
  status: ConnectionState;
  error?: string | null;
  onTest: () => void;
  disabled?: boolean;
  isConfigured: boolean;
}

export function ConnectionStatus({
  status,
  error,
  onTest,
  disabled,
  isConfigured,
}: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={onTest}
        disabled={disabled || status === 'testing' || !isConfigured}
      >
        {status === 'testing' ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Testing...
          </>
        ) : (
          <>
            <Plug className="h-4 w-4 mr-1" />
            Test Connection
          </>
        )}
      </Button>

      {status === 'connected' && (
        <Badge
          variant="default"
          className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      )}

      {status === 'error' && (
        <div className="flex flex-col">
          <Badge
            variant="destructive"
            className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
          {error && (
            <span className="text-xs text-red-500 mt-1">{error}</span>
          )}
        </div>
      )}

      {status === 'idle' && !isConfigured && (
        <Badge variant="secondary" className="text-muted-foreground">
          Not Configured
        </Badge>
      )}
    </div>
  );
}
