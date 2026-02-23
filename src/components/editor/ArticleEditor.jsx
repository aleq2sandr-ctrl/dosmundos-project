import React, { useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import UnderlineExtension from '@tiptap/extension-underline';
import EditorToolbar from '@/components/editor/EditorToolbar';

const ArticleEditor = ({ content, onChange, placeholder, readOnly = false }) => {
  const debounceTimer = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        history: { depth: 100 },
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-purple-700 underline hover:text-purple-900',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      ImageExtension.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Начните писать статью...',
      }),
      UnderlineExtension,
    ],
    content: content || '',
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] p-4 ' +
          'prose-headings:font-serif prose-headings:text-slate-900 prose-headings:font-bold ' +
          'prose-p:text-slate-800 prose-p:leading-relaxed prose-p:font-serif ' +
          'prose-a:text-purple-700 prose-a:no-underline hover:prose-a:text-purple-900 ' +
          'prose-strong:text-slate-900 prose-strong:font-semibold ' +
          'prose-blockquote:border-l-purple-500 prose-blockquote:bg-purple-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg ' +
          'prose-ul:text-slate-800 prose-ol:text-slate-800 ' +
          'prose-img:rounded-lg prose-img:shadow-md',
      },
    },
    onUpdate: ({ editor }) => {
      // Debounce onChange to prevent excessive calls
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        if (onChange) {
          onChange(editor.getHTML());
        }
      }, 300);
    },
  });

  // Sync content from outside
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getHTML();
      // Only update if content is significantly different (avoid loops)
      if (content && currentContent !== content && !editor.isFocused) {
        editor.commands.setContent(content, false);
      }
    }
  }, [content, editor]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return (
    <div className="border border-slate-200 rounded-lg bg-white shadow-sm">
      {!readOnly && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
};

export default ArticleEditor;
