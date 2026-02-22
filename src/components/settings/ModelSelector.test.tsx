import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModelSelector } from './ModelSelector';

describe('ModelSelector', () => {
  it('searches and selects model', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    const onSelect = vi.fn();

    render(
      <ModelSelector
        value="z-ai/glm-4.5-air:free"
        models={[
          { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air' },
          { id: 'openai/gpt-oss-20b:free', name: 'GPT OSS 20B' },
        ]}
        query=""
        onQueryChange={onSearch}
        onSelect={onSelect}
        isLoading={false}
      />
    );

    await user.type(screen.getByPlaceholderText(/search openrouter model/i), 'gpt');
    expect(onSearch).toHaveBeenCalled();
  });
});
