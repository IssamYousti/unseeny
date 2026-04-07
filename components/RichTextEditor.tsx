"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
} from "lucide-react";

interface Props {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}

export default function RichTextEditor({ name, defaultValue = "", placeholder }: Props) {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [isEmpty, setIsEmpty] = useState(!defaultValue);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
    ],
    content: defaultValue || "",
    immediatelyRender: false,
    onUpdate({ editor }) {
      if (hiddenRef.current) {
        hiddenRef.current.value = editor.getHTML();
      }
      setIsEmpty(editor.isEmpty);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[160px] px-3 py-2 focus:outline-none",
      },
    },
  });

  // Sync initial value to hidden input
  useEffect(() => {
    if (hiddenRef.current) {
      hiddenRef.current.value = defaultValue;
    }
  }, [defaultValue]);

  if (!editor) return null;

  const currentBlockType = () => {
    if (editor.isActive("heading", { level: 1 })) return "h1";
    if (editor.isActive("heading", { level: 2 })) return "h2";
    if (editor.isActive("heading", { level: 3 })) return "h3";
    return "paragraph";
  };

  const applyBlockType = (type: string) => {
    switch (type) {
      case "h1": editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case "h2": editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case "h3": editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      default: editor.chain().focus().setParagraph().run();
    }
  };

  const ToolbarButton = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30">
        {/* Text style dropdown */}
        <select
          value={currentBlockType()}
          onChange={(e) => applyBlockType(e.target.value)}
          className="text-xs rounded-md border border-border bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value="paragraph">Normal text</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Inline formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <div className="relative">
        {isEmpty && placeholder && (
          <p className="absolute top-2 left-3 text-sm text-muted-foreground pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} ref={hiddenRef} defaultValue={defaultValue} />
    </div>
  );
}
