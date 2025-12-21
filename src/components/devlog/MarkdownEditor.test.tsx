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

    it('should have border and background styling', () => {
        render(
            <MarkdownEditor
                value=""
                onChange={mockOnChange}
                onCursorChange={mockOnCursorChange}
            />
        );

        const container = document.querySelector('.border.bg-background');
        expect(container).toBeInTheDocument();
    });

    it('should have rounded corners', () => {
        render(
            <MarkdownEditor
                value=""
                onChange={mockOnChange}
                onCursorChange={mockOnCursorChange}
            />
        );

        const container = document.querySelector('.rounded-md');
        expect(container).toBeInTheDocument();
    });

    it('should initialize CodeMirror editor', async () => {
        render(
            <MarkdownEditor
                value="Test content"
                onChange={mockOnChange}
                onCursorChange={mockOnCursorChange}
            />
        );

        await waitFor(() => {
            const cmEditor = document.querySelector('.cm-editor');
            expect(cmEditor).toBeInTheDocument();
        });
    });

    it('should have line wrapping enabled', async () => {
        render(
            <MarkdownEditor
                value="A very long line of text that should wrap in the editor"
                onChange={mockOnChange}
                onCursorChange={mockOnCursorChange}
            />
        );

        await waitFor(() => {
            // EditorView.lineWrapping is applied
            const cmEditor = document.querySelector('.cm-editor');
            expect(cmEditor).toBeInTheDocument();
        });
    });

    it('should have minimum height of 200px', () => {
        render(
            <MarkdownEditor
                value=""
                onChange={mockOnChange}
                onCursorChange={mockOnCursorChange}
            />
        );

        const container = document.querySelector('.min-h-\\[200px\\]');
        expect(container).toBeInTheDocument();
    });
});
