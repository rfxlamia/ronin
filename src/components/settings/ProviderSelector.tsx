/**
 * Provider Selector Component
 * Story 4.25-3: Provider Settings UI & Multi-Key Storage
 *
 * Dropdown to select active AI provider
 * Active: OpenRouter, Demo Mode
 * Coming Soon: OpenAI, Anthropic, Groq
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Zap, Clock } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
}

const PROVIDERS: Provider[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access 100+ models with one API key',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: 'demo',
    name: 'Demo Mode',
    description: '10 requests/hour, no API key needed',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5 models',
    icon: <Sparkles className="h-4 w-4" />,
    comingSoon: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models',
    icon: <Sparkles className="h-4 w-4" />,
    comingSoon: true,
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Fast inference',
    icon: <Sparkles className="h-4 w-4" />,
    comingSoon: true,
  },
];

interface ProviderSelectorProps {
  value: string | null;
  onChange: (providerId: string) => void;
  disabled?: boolean;
}

export function ProviderSelector({
  value,
  onChange,
  disabled,
}: ProviderSelectorProps) {
  const selectedProvider = PROVIDERS.find((p) => p.id === value);

  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a provider">
          {selectedProvider && (
            <span className="flex items-center gap-2">
              {selectedProvider.icon}
              <span>{selectedProvider.name}</span>
              {selectedProvider.id === 'demo' && (
                <Badge variant="secondary" className="text-xs ml-1">
                  Limited
                </Badge>
              )}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PROVIDERS.map((provider) => (
          <SelectItem
            key={provider.id}
            value={provider.id}
            disabled={provider.comingSoon}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {provider.icon}
              <div className="flex flex-col">
                <span className="flex items-center gap-2">
                  {provider.name}
                  {provider.comingSoon && (
                    <Badge
                      variant="outline"
                      className="text-xs flex items-center gap-1"
                    >
                      <Clock className="h-3 w-3" />
                      Coming Soon
                    </Badge>
                  )}
                  {provider.id === 'demo' && !provider.comingSoon && (
                    <Badge variant="secondary" className="text-xs">
                      Limited
                    </Badge>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {provider.description}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
