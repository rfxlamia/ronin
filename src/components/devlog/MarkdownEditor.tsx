import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';

interface CursorPosition {
  line: number;
  column: number;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onCursorChange?: (position: CursorPosition) => void;
  placeholder?: string;
  className?: string;
}

// Custom keymap for markdown shortcuts
const markdownKeymap = keymap.of([
  {
    key: 'Ctrl-b',
    run: (view) => {
      const { from, to } = view.state.selection.main;
      const selectedText = view.state.sliceDoc(from, to);
      view.dispatch({
        changes: { from, to, insert: `**${selectedText}**` },
        selection: { anchor: from + 2, head: to + 2 },
      });
      return true;
    },
  },
  {
    key: 'Ctrl-i',
    run: (view) => {
      const { from, to } = view.state.selection.main;
      const selectedText = view.state.sliceDoc(from, to);
      view.dispatch({
        changes: { from, to, insert: `*${selectedText}*` },
        selection: { anchor: from + 1, head: to + 1 },
      });
      return true;
    },
  },
]);

export function MarkdownEditor({
  value,
  onChange,
  onCursorChange,
  placeholder,
  className = '',
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onCursorChangeRef = useRef(onCursorChange);

  // Keep refs up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onCursorChangeRef.current = onCursorChange;
  }, [onCursorChange]);

  // Create editor on mount
  useEffect(() => {
    if (!editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
      // Track cursor position changes (if callback provided)
      if ((update.selectionSet || update.docChanged) && onCursorChangeRef.current) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        onCursorChangeRef.current({
          line: line.number,
          column: pos - line.from + 1,
        });
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        markdown(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdownKeymap,
        EditorView.lineWrapping,
        updateListener,
        EditorView.theme({
          '&': {
            height: '100%',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '14px',
          },
          '.cm-scroller': {
            overflow: 'auto',
          },
          '.cm-content': {
            minHeight: '200px',
            padding: '8px 0',
            caretColor: '#CC785C', // Ronin brass color for cursor
          },
          '&.cm-focused': {
            outline: 'none',
          },
          '.cm-line': {
            padding: '0 8px',
          },
          '.cm-cursor, .cm-dropCursor': {
            borderLeftColor: '#CC785C', // Visible cursor in dark mode
            borderLeftWidth: '2px',
          },
        }),
        placeholder ? cmPlaceholder(placeholder) : [],
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // Only run once on mount

  // Update editor content when value changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    if (currentContent !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className={`min-h-[200px] overflow-hidden rounded-md border bg-background ${className}`}
    />
  );
}
