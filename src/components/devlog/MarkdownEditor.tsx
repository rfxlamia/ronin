import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { cn } from '@/lib/utils';

interface CursorPosition {
  line: number;
  column: number;
}

interface MarkdownEditorProps {
  content: string; // Renamed from value to match store naming convention usually, but kept as value in previous. Let's stick to 'value' or 'content'. Story said 'content' in plan. Previous file had 'value'. I will use 'value' to match previous file but map it if needed. Actually plan said 'content'. Usage in other files might depend on 'value'. Checking usage... I'll support 'value' aliased as content or just change usage.
  // Wait, I am replacing the file. I should probably use 'value' if that's what was there, OR update callsites. 
  // Previous file used 'value'. 
  // Plan said "Component Updates - MarkdownEditor.tsx".
  // I will use `value` to avoid breaking changes in other places if possible, generally better.
  value: string;
  onChange: (value: string) => void;
  onCursorChange?: (position: CursorPosition) => void;
  onSave?: () => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
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
  onSave,
  placeholder,
  className = '',
  readOnly = false,
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onCursorChangeRef = useRef(onCursorChange);
  const onSaveRef = useRef(onSave);

  // Keep refs up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onCursorChangeRef.current = onCursorChange;
  }, [onCursorChange]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Create editor on mount or when readOnly changes (to reconfigure)
  useEffect(() => {
    if (!editorRef.current) return;

    // cleanup previous view if exists
    if (viewRef.current) {
      viewRef.current.destroy();
    }

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

    const extensions = [
      markdown(),
      // Only enable history and editing keys if NOT readOnly
      ...(readOnly ? [] : [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdownKeymap
      ]),
      // If NOT readOnly, add save shortcut
      ...(readOnly ? [] : [
        keymap.of([
          {
            key: "Mod-s",
            run: () => {
              onSaveRef.current?.();
              return true;
            },
          },
        ]),
      ]),
      EditorView.lineWrapping,
      EditorState.readOnly.of(readOnly),
      EditorView.editable.of(!readOnly),
      updateListener,
      EditorView.theme({
        '&': {
          height: '100%',
          backgroundColor: 'transparent',
          fontFamily: "'Work Sans', sans-serif",
          fontSize: '1rem',
        },
        '.cm-scroller': {
          overflow: 'auto',
        },
        '.cm-content': {
          minHeight: '200px',
          padding: '1rem',
          maxWidth: '800px',
          margin: '0 auto',
          fontFamily: "'Work Sans', sans-serif",
          caretColor: '#CC785C', // Ronin brass color for cursor
        },
        '&.cm-focused': {
          outline: 'none',
        },
        '.cm-line': {
          padding: '0 8px',
          lineHeight: '1.6',
          color: 'var(--ronin-text)',
        },
        '.cm-cursor, .cm-dropCursor': {
          borderLeftColor: '#CC785C',
          borderLeftWidth: '2px',
        },
        '.cm-activeLine': {
          backgroundColor: 'transparent',
        },
        '.cm-gutters': {
          display: 'none',
        },
        // Customize markdown styling
        '.cm-header': {
          fontFamily: "'Libre Baskerville', serif",
          color: "var(--ronin-primary)",
        }
      }),
      placeholder ? cmPlaceholder(placeholder) : [],
    ];

    const state = EditorState.create({
      doc: value,
      extensions,
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
  }, [readOnly]); // Re-create when readOnly changes

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
    <div className={cn("flex flex-col h-full relative min-h-[200px]", className)}>
      {readOnly && (
        <div className="w-full bg-[#828179]/20 text-[#141413] dark:text-[#F0EFEA] p-2 text-sm flex items-center gap-2 border-b border-[#CC785C]/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="font-['Work_Sans'] font-medium text-sm">READ ONLY VERSION</span>
        </div>
      )}
      <div
        ref={editorRef}
        className="flex-1 overflow-hidden bg-transparent"
      />
    </div>
  );
}
