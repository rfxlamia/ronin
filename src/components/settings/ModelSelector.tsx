/**
 * Model Selector Component
 * Searchable model picker for OpenRouter model selection
 */

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OpenRouterModelSummary } from '@/types/ai';

interface ModelSelectorProps {
  value: string | null;
  models: OpenRouterModelSummary[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (modelId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ModelSelector({
  value,
  models,
  query,
  onQueryChange,
  onSelect,
  isLoading,
  disabled,
}: ModelSelectorProps) {
  const selected = models.find((m) => m.id === value);

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search OpenRouter model (e.g. glm, qwen, gemini)"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        disabled={disabled || isLoading}
      />

      <Select value={value || undefined} onValueChange={onSelect} disabled={disabled || isLoading}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? 'Loading models...' : 'Select model'}>
            {selected ? `${selected.name} (${selected.id})` : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex flex-col">
                <span>{model.name}</span>
                <span className="text-xs text-muted-foreground">{model.id}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
