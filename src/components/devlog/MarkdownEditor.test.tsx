import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MarkdownEditor } from './MarkdownEditor';

describe('MarkdownEditor', () => {
    const mockOnChange = vi.fn();
    const mockOnCursorChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render editor container', () => {
        render(
            <MarkdownEditor
                value=""
                onChange={mockOnChange}
                onCursorChange={mockOnCursorChange}
            />
        );

        // The editor renders a container div with specific classes
        const container = document.querySelector('.min-h-\\[200px\\]');
        expect(container).toBeInTheDocument();
    });

    it('should apply custom className', () => {
        render(
            <MarkdownEditor
                value=""
                onChange={mockOnChange}
                onCursorChange={mockOnCursorChange}
                className="custom-class"
            />
        );

        const container = document.querySelector('.custom-class');
        expect(container).toBeInTheDocument();
    });

    it('should render with initial value', async () => {
        const initialContent = '# Hello World';
        render(
            <MarkdownEditor
                value={initialContent}
                onChange={mockOnChange}
                onCursorChange={mockOnCursorChange}
            />
        );

        // Wait for CodeMirror to initialize
        await waitFor(() => {
            const editor = document.querySelector('.cm-editor');
            expect(editor).toBeInTheDocument();
        });

        // Check that the content is rendered
        await waitFor(() => {
            const content = document.querySelector('.cm-content');
            expect(content?.textContent).toContain('Hello World');
        });
    });

    it('should show read-only banner when readOnly is true', () => {
        render(
            <MarkdownEditor
                value="Test"
                onChange={mockOnChange}
                readOnly={true}
            />
        );

        expect(document.querySelector('.cm-editor')).toBeInTheDocument();
        expect(document.body.textContent).toContain('READ ONLY VERSION');
    });

    it('should NOT show read-only banner when readOnly is false', () => {
        render(
            <MarkdownEditor
                value="Test"
                onChange={mockOnChange}
                readOnly={false}
            />
        );

        expect(document.body.textContent).not.toContain('READ ONLY VERSION');
    });

    // Removed specific border/bg tests as component relies on parent styling or custom className now
    // or we can test that className is applied correctly

    it('should apply custom className', () => {
        render(
            <MarkdownEditor
                value=""
                onChange={mockOnChange}
                className="custom-class"
            />
        );
        // Container
        const container = document.querySelector('.custom-class');
        expect(container).toBeInTheDocument();
    });
});

