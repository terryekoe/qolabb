'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { supabase } from '@/lib/supabase';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  Save,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface GroupWorkspaceEditorProps {
  projectId: string;
  initialContent?: any;
  isReadOnly?: boolean;
}

export function GroupWorkspaceEditor({
  projectId,
  initialContent,
  isReadOnly = false,
}: GroupWorkspaceEditorProps) {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing your group project here...',
      }),
      Typography,
    ],
    content: initialContent || {},
    editable: !isReadOnly,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-4',
      },
    },
    onUpdate: () => {
      setHasUnsavedChanges(true);
    },
    immediatelyRender: false,
  });

  // Auto-save effect
  useEffect(() => {
    if (!editor || !hasUnsavedChanges || isReadOnly) return;

    const saveTimer = setTimeout(async () => {
      await saveContent();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(saveTimer);
  }, [editor?.getJSON(), hasUnsavedChanges, isReadOnly]);

  // Real-time sync effect
  useEffect(() => {
    if (!projectId || !editor) return;

    const channel = supabase
      .channel(`project_content:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`,
        },
        (payload) => {
          // If we receive an update and we don't have unsaved changes, update the editor
          // This creates a basic "last write wins" sync but prevents overwriting if you are typing
          const newContent = payload.new.content;
          if (newContent && !hasUnsavedChanges && !saving) {
            const currentContent = editor.getJSON();
            // Simple deep comparison could be better, but for now just update if different
            if (JSON.stringify(currentContent) !== JSON.stringify(newContent)) {
              editor.commands.setContent(newContent);
              setLastSaved(new Date(payload.new.last_edited_at));
            }
          } else if (payload.new.content && hasUnsavedChanges) {
            // Optional: Notify user that someone else edited content
            // toast('External changes detected. Save to see them.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, editor, hasUnsavedChanges, saving]);

  const saveContent = async () => {
    if (!editor) return;

    setSaving(true);
    try {
      const content = editor.getJSON();

      const { error } = await supabase
        .from('projects')
        .update({
          content,
          last_edited_at: new Date().toISOString(),
          // last_edited_by would be set by RLS or trigger ideally,
          // but we can also set it here if we have the user context.
          // For now, relying on the update timestamp.
        })
        .eq('id', projectId);

      if (error) throw error;

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving content:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ onClick, isActive, disabled, children, title }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-full">
      {/* Toolbar */}
      {!isReadOnly && (
        <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center space-x-1 overflow-x-auto">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold"
            >
              <Bold size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic"
            >
              <Italic size={18} />
            </ToolbarButton>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <Heading1 size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Heading2 size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <Heading3 size={18} />
            </ToolbarButton>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <List size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Ordered List"
            >
              <ListOrdered size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Quote"
            >
              <Quote size={18} />
            </ToolbarButton>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().chain().focus().undo().run()}
              title="Undo"
            >
              <Undo size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().chain().focus().redo().run()}
              title="Redo"
            >
              <Redo size={18} />
            </ToolbarButton>
          </div>

          {/* Save Status */}
          <div className="flex items-center space-x-2 px-2 text-xs text-gray-500 dark:text-gray-400">
            {saving ? (
              <span className="flex items-center text-blue-600 dark:text-blue-400">
                <Loader2 size={14} className="animate-spin mr-1" />
                Saving...
              </span>
            ) : hasUnsavedChanges ? (
              <span className="text-orange-600 dark:text-orange-400">Unsaved changes</span>
            ) : lastSaved ? (
              <span className="flex items-center text-green-600 dark:text-green-400">
                <CheckCircle2 size={14} className="mr-1" />
                Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : (
              <span>Ready to write</span>
            )}
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div
        className="flex-1 overflow-y-auto bg-white dark:bg-gray-800 cursor-text"
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
