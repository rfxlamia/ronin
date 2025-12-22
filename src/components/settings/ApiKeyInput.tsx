/**
 * API Key Input Component
 * Story 4.25-3: Provider Settings UI & Multi-Key Storage
 *
 * Password input for API keys with masked/reveal states
 * Never shows full key from backend - only masked format
 */

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Save, X, ExternalLink } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';

interface ApiKeyInputProps {
  providerId: string;
  maskedKey: string | null; // From backend (masked format like "sk-or-v1...••••")
  onSave: (key: string) => Promise<void>;
  disabled?: boolean;
}

const PROVIDER_KEY_URLS: Record<string, string> = {
  openrouter: 'https://openrouter.ai/keys',
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  groq: 'https://console.groq.com/keys',
};

const PROVIDER_KEY_PREFIXES: Record<string, string> = {
  openrouter: 'sk-or-',
  openai: 'sk-',
  anthropic: 'sk-ant-',
  groq: 'gsk_',
};

export function ApiKeyInput({
  providerId,
  maskedKey,
  onSave,
  disabled,
}: ApiKeyInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset editing state when provider changes
  useEffect(() => {
    setIsEditing(false);
    setInputValue('');
    setError(null);
  }, [providerId]);

  const handleSave = async () => {
    if (!inputValue.trim()) {
      setError('Please enter an API key');
      return;
    }

    // Basic validation for key format
    const prefix = PROVIDER_KEY_PREFIXES[providerId];
    if (prefix && !inputValue.startsWith(prefix)) {
      setError(`API key should start with "${prefix}"`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(inputValue);
      setIsEditing(false);
      setInputValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue('');
    setError(null);
  };

  const handleOpenSignup = async () => {
    const url = PROVIDER_KEY_URLS[providerId];
    if (url) {
      await openUrl(url);
    }
  };

  // Show saved state (masked key)
  if (maskedKey && !isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              type="text"
              value={maskedKey}
              readOnly
              className="font-mono text-sm bg-muted"
              disabled={disabled}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            disabled={disabled}
          >
            Change
          </Button>
        </div>
        <p className="text-xs text-green-600 dark:text-green-400">
          ✓ API key configured
        </p>
      </div>
    );
  }

  // Show edit/new key state
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            type={showInput ? 'text' : 'password'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Enter your ${providerId} API key`}
            className="font-mono text-sm pr-10"
            disabled={disabled || isSaving}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowInput(!showInput)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            disabled={disabled || isSaving}
          >
            {showInput ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <Button
          onClick={handleSave}
          disabled={disabled || isSaving || !inputValue.trim()}
        >
          {isSaving ? (
            'Saving...'
          ) : (
            <>
              <Save className="h-4 w-4 mr-1" />
              Save
            </>
          )}
        </Button>
        {isEditing && (
          <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!maskedKey && PROVIDER_KEY_URLS[providerId] && (
        <button
          onClick={handleOpenSignup}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Get an API key
          <ExternalLink className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
