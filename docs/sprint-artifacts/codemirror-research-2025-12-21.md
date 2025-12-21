# CodeMirror 6 Integration Research - Epic 4 Preparation

**Date:** 2025-12-21  
**Researcher:** Charlie (Senior Dev)  
**Purpose:** Evaluate CodeMirror 6 for DEVLOG editor in Epic 4

---

## Summary

CodeMirror 6 is the recommended solution for Epic 4's DEVLOG editor. It provides professional markdown editing with keyboard shortcuts, syntax highlighting, and extensibility.

---

## Key Findings

### Installation
```bash
npm install @codemirror/state @codemirror/view @codemirror/commands
npm install @codemirror/lang-markdown
npm install @codemirror/theme-one-dark  # Optional: dark theme support
```

### Basic Setup (React)
```tsx
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';

const state = EditorState.create({
  doc: initialContent,
  extensions: [
    markdown(),
    keymap.of(defaultKeymap),
    EditorView.lineWrapping,
  ]
});

const view = new EditorView({
  state,
  parent: editorRef.current
});
```

### Markdown Shortcuts (Built-in)
CodeMirror 6 with `@codemirror/commands` provides:
- **Ctrl+B**: Not built-in, needs custom keymap
- **Ctrl+I**: Not built-in, needs custom keymap
- **Tab**: Indent
- **Shift+Tab**: Dedent
- **Ctrl+Z**: Undo
- **Ctrl+Shift+Z**: Redo

### Custom Markdown Shortcuts
We need to add custom keymaps for bold/italic:

```tsx
import { keymap } from '@codemirror/view';

const markdownKeymap = keymap.of([
  {
    key: 'Ctrl-b',
    run: (view) => {
      const { from, to } = view.state.selection.main;
      const selectedText = view.state.sliceDoc(from, to);
      view.dispatch({
        changes: { from, to, insert: `**${selectedText}**` },
        selection: { anchor: from + 2, head: to + 2 }
      });
      return true;
    }
  },
  {
    key: 'Ctrl-i',
    run: (view) => {
      const { from, to } = view.state.selection.main;
      const selectedText = view.state.sliceDoc(from, to);
      view.dispatch({
        changes: { from, to, insert: `*${selectedText}*` },
        selection: { anchor: from + 1, head: to + 1 }
      });
      return true;
    }
  }
]);
```

### Auto-Save Integration
```tsx
import { EditorView } from '@codemirror/view';

const autoSaveExtension = EditorView.updateListener.of((update) => {
  if (update.docChanged) {
    // Debounce and trigger save
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveContent(update.state.doc.toString());
    }, 30000); // 30 seconds
  }
});
```

### Styling with JetBrains Mono
```css
.cm-editor {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  height: 100%;
}

.cm-scroller {
  overflow: auto;
}
```

---

## Recommendations for Epic 4

### Story 4.1 Implementation
1. Install CodeMirror 6 packages
2. Create `DevlogEditor.tsx` component wrapping CodeMirror
3. Add custom markdown keymap for Ctrl+B and Ctrl+I
4. Configure auto-save extension (30s interval)
5. Apply JetBrains Mono font styling

### Alternative Considered
- **@uiw/react-md-editor**: Simpler but less customizable, includes preview pane (not needed for append-only mode)
- **Verdict**: CodeMirror 6 preferred for professional editing experience and full control

### Estimated Integration Effort
- **Setup**: 2-3 hours
- **Custom keymaps**: 1-2 hours
- **Auto-save logic**: 1 hour
- **Styling**: 1 hour
- **Total**: ~6 hours (0.75 day)

---

## References
- [CodeMirror 6 Documentation](https://codemirror.net/docs/)
- [Markdown Language Package](https://codemirror.net/docs/ref/#lang-markdown)
- [Custom Keymaps Guide](https://codemirror.net/examples/config/)

---

**Status:** ✅ Research Complete  
**Blocker for Epic 4:** No - clear implementation path identified
