"use client";

import {
  useEditor,
  EditorContent,
  useEditorState,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import UnderlineExtension from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import SubscriptExtension from "@tiptap/extension-subscript";
import SuperscriptExtension from "@tiptap/extension-superscript";
import { DOMParser } from "@tiptap/pm/model";
import { AISuggestion } from "@/lib/tiptap-ai-suggestion";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Underline,
  Link,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Plus,
  ChevronDown,
  Superscript,
  Subscript,
  FileDown,
  Sparkles,
} from "lucide-react";
import { updateNote } from "@/server/notes";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

interface RichTextEditorProps {
  content?: JSONContent[];
  noteId?: string;
  noteTitle?: string;
  onEditorReady?: (insertFn: (text: string) => void, replaceFn: (text: string) => void, getHTMLFn: () => string, replaceSelectionFn: (text: string) => void) => void;
  onTextSelection?: (text: string, position: { top: number; left: number; placement?: 'top' | 'bottom' }) => void;
}

const RichTextEditor = ({ content, noteId, noteTitle, onEditorReady, onTextSelection }: RichTextEditorProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pdfFileName, setPdfFileName] = useState(noteTitle || 'note');
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [suggestionHistory, setSuggestionHistory] = useState<Map<string, { originalText: string, from: number, to: number }>>(new Map());
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Document,
      Paragraph,
      Text,
      AISuggestion,
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      SubscriptExtension,
      SuperscriptExtension,
    ],
    immediatelyRender: false,
    autofocus: true,
    editable: true,
    injectCSS: false,
    onUpdate: ({ editor }) => {
      if (noteId) {
        const content = editor.getJSON();
        updateNote(noteId, { content });
      }
      // Check if there are AI suggestions
      const hasSuggestion = editor.state.doc.textContent.length > 0 && 
        editor.isActive('aiSuggestion');
      setHasSuggestions(hasSuggestion);
    },
    content,
  });

  // Handle text selection on mouseup (when user finishes selecting)
  useEffect(() => {
    if (!editor || !onTextSelection || !editorRef.current) return;

    const handleMouseUp = () => {
      // Small delay to ensure selection is finalized
      setTimeout(() => {
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, '\n');
        
        if (selectedText.trim().length > 0) {
          // Store selection range to restore it later
          const selection = { from, to };
          
          // Get selection coordinates
          const { view } = editor;
          const start = view.coordsAtPos(from);
          const end = view.coordsAtPos(to);
          
          // Check if close to bottom
          const viewportHeight = window.innerHeight;
          const spaceBelow = viewportHeight - end.bottom;
          const showAbove = spaceBelow < 400; // Heuristic for expanded popup height
          
          // Position popup
          const position = {
            top: showAbove ? start.top - 8 : end.bottom + 8,
            left: start.left,
            placement: showAbove ? 'top' : 'bottom' as 'top' | 'bottom'
          };
          
          onTextSelection(selectedText, position);
          
          // Restore selection after popup opens to keep text highlighted
          setTimeout(() => {
            editor.commands.setTextSelection(selection);
          }, 100);
        }
      }, 50);
    };

    const editorElement = editorRef.current;
    editorElement.addEventListener('mouseup', handleMouseUp);

    return () => {
      editorElement.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editor, onTextSelection]);

  // Provide insert and replace functions to parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      const cleanAIResponse = (response: string) => {
        try {
          // Remove markdown code block markers first
          let clean = response.replace(/```html/g, '').replace(/```/g, '');
          
          // Use a temporary div for permissive HTML parsing
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = clean;
          
          // 1. Remove manual bullets/numbers inside list items
          const listItems = tempDiv.querySelectorAll('li');
          listItems.forEach((li) => {
            // Check for empty list items
            const textContent = li.textContent || '';
            const hasImages = li.querySelector('img') !== null;
            
            // If completely empty (no text, no images), remove it
            if (!textContent.trim() && !hasImages) {
              li.remove();
              return;
            }
            
            // Clean manual bullets at start of text nodes
            li.childNodes.forEach(node => {
              if (node.nodeType === Node.TEXT_NODE && node.textContent) {
                // Regex to match bullets/numbers at start
                node.textContent = node.textContent.replace(/^\s*(?:[-•*]|\d+\.)\s*/, '');
              } else if (node.nodeName === 'P') { // Handle <p> inside <li>
                 // Clean inside paragraph
                 node.textContent = (node.textContent || '').replace(/^\s*(?:[-•*]|\d+\.)\s*/, '');
                 
                 // If p is identical to empty or just whitespace after cleaning
                 if (!node.textContent?.trim() && !node.childNodes.length) {
                    node.remove(); // Remove empty paragraph inside li
                 }
              }
            });

            // Re-check emptiness after cleaning children
            if (!li.textContent?.trim() && !li.querySelector('img') && !li.children.length) {
              li.remove();
            }
          });

          // 2. Wrap root-level orphan <li> elements in <ul>
          // This fixes the issue where inserting <li> without <ul> into an existing list
          // causes Tiptap to merge them into paragraphs within a single list item
          const newDiv = document.createElement('div');
          let currentUl: HTMLUListElement | null = null;

          Array.from(tempDiv.childNodes).forEach((node) => {
            if (node.nodeName === 'LI') {
              if (!currentUl) {
                currentUl = document.createElement('ul');
                newDiv.appendChild(currentUl);
              }
              currentUl.appendChild(node.cloneNode(true));
            } else {
              currentUl = null; // Break the list sequence
              // Keep non-empty text or other elements
              if (node.nodeType !== Node.TEXT_NODE || node.textContent?.trim()) {
                newDiv.appendChild(node.cloneNode(true));
              }
            }
          });

          return newDiv.innerHTML;
        } catch (e) {
          console.error("Error cleaning AI response:", e);
          // Fallback to regex if parsing fails
          return response.replace(/```html/g, '').replace(/```/g, '');
        }
      };

      const insertContent = (html: string) => {
        const cleanedHtml = cleanAIResponse(html);
        console.log("📝 Editor insertContent called with:", cleanedHtml);
        
        // Get current position before inserting
        const currentPos = editor.state.selection.to;
        
        // Create a temporary div to measure the content length
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanedHtml;
        const textLength = tempDiv.textContent?.length || 0;
        
        editor.commands.focus('end');
        editor.commands.insertContent(cleanedHtml);
        
        // Calculate the new position after insertion
        const newPos = editor.state.selection.to;
        
        // Mark only the inserted content as AI suggestion
        if (newPos > currentPos) {
          editor.chain()
            .setTextSelection({ from: currentPos, to: newPos })
            .setAISuggestion()
            .setTextSelection(newPos)
            .run();
        }
        
        setHasSuggestions(true);
      };
      
      const replaceContent = (html: string) => {
        const cleanedHtml = cleanAIResponse(html);
        console.log("📝 Editor replaceContent called with:", cleanedHtml);
        
        // Save the entire original content before replacing
        const originalContent = editor.getHTML();
        const suggestionId = `suggestion-${Date.now()}`;
        
        setSuggestionHistory(prev => {
          const newMap = new Map(prev);
          newMap.set(suggestionId, { 
            originalText: originalContent, 
            from: 0, 
            to: editor.state.doc.content.size 
          });
          return newMap;
        });
        
        // Replace all content
        editor.commands.setContent(cleanedHtml);
        
        // Mark ALL content as AI suggestion since we replaced everything
        editor.chain()
          .selectAll()
          .setMark('aiSuggestion', { suggestionId })
          .focus('end')
          .run();
        
        setHasSuggestions(true);
      };
      
      const getHTML = () => {
        const html = editor.getHTML();
        console.log("📝 Editor getHTML called, returning:", html);
        return html;
      };
      
      const replaceSelection = (text: string) => {
        const cleanedText = cleanAIResponse(text);
        console.log("📝 Editor replaceSelection called with:", cleanedText);
        const { from, to } = editor.state.selection;
        
        // Generate unique suggestion ID
        const suggestionId = `suggestion-${Date.now()}`;
        
        // Save original text before replacing history...
        const originalText = editor.state.doc.textBetween(from, to, ' ');
        setSuggestionHistory(prev => {
          const newMap = new Map(prev);
          newMap.set(suggestionId, { originalText, from, to });
          return newMap;
        });

        // Smart List Insertion Logic
        // Check if we are inserting a list structure while already inside a list item
        const inList = editor.isActive('listItem');
        let contentToInsert = cleanedText;
        
        if (inList) {
          // Parse the content to see if it's a wrapper <ul>/<ol>
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = cleanedText;
          const listElement = tempDiv.querySelector('ul, ol');
          
          if (listElement) {
               console.log("📝 Detected insertion of List inside List. Stripping wrapper <ul> and cleaning whitespace...");
               // Extract only the LI elements and join them directly with NO separator.
               // This is critical because any whitespace (newlines/spaces) between <li> tags
               // in the inserted string will be interpreted by Tiptap as text nodes,
               // creating "ghost" empty list items containing that whitespace.
               const lis = listElement.querySelectorAll('li');
               contentToInsert = Array.from(lis).map(li => li.outerHTML).join('');
          }
        }
        
        // Execute replacement
        editor.chain()
          .focus()
          .deleteRange({ from, to })
          .insertContent(contentToInsert)
          .run();
        
        // Mark the newly inserted content
        const insertedLength = tempDivContentLength(cleanedText) || cleanedText.length;
        // Use current selection end as the insertion point reference
        const newPos = editor.state.selection.to;
        
        editor.chain()
          .setTextSelection({ from: Math.max(0, newPos - insertedLength), to: newPos })
          .setMark('aiSuggestion', { suggestionId })
          .focus()
          .run();
        
        setHasSuggestions(true);
      };
      
      // Helper to estimate text length of HTML string for selection
      const tempDivContentLength = (html: string) => {
          try {
             const div = document.createElement('div');
             div.innerHTML = html;
             return div.textContent?.length || 0;
          } catch (e) { return 0; }
      }
      
      onEditorReady(insertContent, replaceContent, getHTML, replaceSelection);
    }
  }, [editor, onEditorReady]);

  // Function to replace selected text (kept for internal use if needed)
  const replaceSelectedText = (newText: string) => {
    if (!editor) return;
    
    const { from, to } = editor.state.selection;
    editor.chain()
      .focus()
      .deleteRange({ from, to })
      .insertContent(newText)
      .run();
  };

  const handleExportPDF = async (fileName: string) => {
    const editorElement = document.querySelector('.ProseMirror') as HTMLElement;
    if (!editorElement) return;

    try {
      const clone = editorElement.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = editorElement.offsetWidth + 'px';
      clone.style.backgroundColor = '#ffffff';
      
      const style = document.createElement('style');
      style.innerHTML = `
        .pdf-export-clone * {
          color: #171717 !important;
        }
        .pdf-export-clone h1 {
          font-size: 1.875rem !important;
          font-weight: bold !important;
          margin-bottom: 1rem !important;
          color: #171717 !important;
        }
        .pdf-export-clone h2 {
          font-size: 1.5rem !important;
          font-weight: bold !important;
          margin-bottom: 0.75rem !important;
          color: #171717 !important;
        }
        .pdf-export-clone h3 {
          font-size: 1.25rem !important;
          font-weight: bold !important;
          margin-bottom: 0.5rem !important;
          color: #171717 !important;
        }
        .pdf-export-clone p {
          margin-bottom: 1rem !important;
          color: #171717 !important;
        }
        .pdf-export-clone strong {
          font-weight: bold !important;
          color: #171717 !important;
        }
        .pdf-export-clone em {
          font-style: italic !important;
          color: #171717 !important;
        }
        .pdf-export-clone s {
          text-decoration: line-through !important;
          color: #171717 !important;
        }
        .pdf-export-clone code {
          background-color: #f5f5f5 !important;
          color: #171717 !important;
          padding: 0.125rem 0.25rem !important;
          border-radius: 0.25rem !important;
          font-family: monospace !important;
        }
        .pdf-export-clone pre {
          background-color: #f5f5f5 !important;
          color: #171717 !important;
          padding: 1rem !important;
          border-radius: 0.25rem !important;
          overflow-x: auto !important;
        }
        .pdf-export-clone pre code {
          background-color: transparent !important;
          padding: 0 !important;
        }
        .pdf-export-clone ul, .pdf-export-clone ol {
          margin-left: 1.5rem !important;
          margin-bottom: 1rem !important;
          color: #171717 !important;
        }
        .pdf-export-clone li {
          margin-bottom: 0.25rem !important;
          color: #171717 !important;
        }
        .pdf-export-clone blockquote {
          border-left: 4px solid #e5e5e5 !important;
          padding-left: 1rem !important;
          font-style: italic !important;
          color: #525252 !important;
          margin-bottom: 1rem !important;
        }
      `;
      
      clone.classList.add('pdf-export-clone');
      document.head.appendChild(style);
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      document.body.removeChild(clone);
      document.head.removeChild(style);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const margin = 15;
      const pdfWidth = 210;
      const pdfHeight = 297;
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = pdfHeight - (margin * 2);
      
      const imgWidthMm = contentWidth;
      const imgHeightMm = (canvas.height * contentWidth) / canvas.width;
      
      let currentY = 0;
      let pageNumber = 0;

      while (currentY < imgHeightMm) {
        if (pageNumber > 0) {
          pdf.addPage();
        }

        const remainingHeight = imgHeightMm - currentY;
        const pageContentHeight = Math.min(contentHeight, remainingHeight);

        const sourceY = (currentY / imgHeightMm) * canvas.height;
        const sourceHeight = (pageContentHeight / imgHeightMm) * canvas.height;
        
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.ceil(sourceHeight);
        
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            canvas,
            0, sourceY,
            canvas.width, sourceHeight,
            0, 0,
            canvas.width, sourceHeight
          );
          
          const pageData = pageCanvas.toDataURL('image/png');
          pdf.addImage(pageData, 'PNG', margin, margin, imgWidthMm, pageContentHeight);
        }
        
        currentY += contentHeight;
        pageNumber++;
      }

      pdf.save(`${fileName}.pdf`);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) return {};
      return {
        isBold: ctx.editor?.isActive("bold"),
        canBold: ctx.editor?.can().chain().focus().toggleBold().run(),
        isItalic: ctx.editor?.isActive("italic"),
        canItalic: ctx.editor?.can().chain().focus().toggleItalic().run(),
        isStrike: ctx.editor?.isActive("strike"),
        canStrike: ctx.editor?.can().chain().focus().toggleStrike().run(),
        isCode: ctx.editor?.isActive("code"),
        canCode: ctx.editor?.can().chain().focus().toggleCode().run(),
        isParagraph: ctx.editor?.isActive("paragraph"),
        isHeading1: ctx.editor?.isActive("heading", { level: 1 }),
        isHeading2: ctx.editor?.isActive("heading", { level: 2 }),
        isHeading3: ctx.editor?.isActive("heading", { level: 3 }),
        isBulletList: ctx.editor?.isActive("bulletList"),
        isOrderedList: ctx.editor?.isActive("orderedList"),
        isCodeBlock: ctx.editor?.isActive("codeBlock"),
        isBlockquote: ctx.editor?.isActive("blockquote"),
        isUnderline: ctx.editor?.isActive("underline"),
        canUnderline: ctx.editor?.can().chain().focus().toggleUnderline().run(),
        isLink: ctx.editor?.isActive("link"),
        canLink: ctx.editor?.can().chain().focus().setLink({ href: '' }).run(),
        isSuperscript: ctx.editor?.isActive("superscript"),
        canSuperscript: ctx.editor?.can().chain().focus().toggleSuperscript().run(),
        isSubscript: ctx.editor?.isActive("subscript"),
        canSubscript: ctx.editor?.can().chain().focus().toggleSubscript().run(),
        isAlignLeft: ctx.editor?.isActive({ textAlign: 'left' }),
        isAlignCenter: ctx.editor?.isActive({ textAlign: 'center' }),
        isAlignRight: ctx.editor?.isActive({ textAlign: 'right' }),
        isAlignJustify: ctx.editor?.isActive({ textAlign: 'justify' }),
        canUndo: ctx.editor?.can().chain().focus().undo().run(),
        canRedo: ctx.editor?.can().chain().focus().redo().run(),
      };
    },
  });

  const getActiveHeading = () => {
    if (editorState?.isHeading1) return "H1";
    if (editorState?.isHeading2) return "H2";
    if (editorState?.isHeading3) return "H3";
    return "H1";
  };

  const handleAcceptSuggestions = () => {
    if (!editor) return;
    editor.chain().selectAll().acceptAISuggestion().run();
    setHasSuggestions(false);
    setSuggestionHistory(new Map());
    toast.success("AI suggestions accepted");
  };

  const handleRejectSuggestions = () => {
    if (!editor) return;
    
    // Check if we have a full document replacement to restore
    const fullDocReplacement = Array.from(suggestionHistory.values()).find(
      h => h.from === 0 && h.to === editor.state.doc.content.size
    );
    
    // Safety check for full doc replacement - only if the suggestion actually covers the whole doc now
    // This prevents accidental full reverts if constraints aren't met
    if (fullDocReplacement && fullDocReplacement.originalText) {
         editor.commands.setContent(fullDocReplacement.originalText);
         setHasSuggestions(false);
         setSuggestionHistory(new Map());
         toast.success("AI suggestions rejected - original content restored");
         return;
    }
    
    // Group replacements by ID, keep additions individual
    const replacementRanges = new Map<string, { from: number; to: number }>();
    const individualDeletions: Array<{ from: number; to: number }> = [];
    
    const { doc } = editor.state;
    doc.descendants((node, pos) => {
      node.marks.forEach(mark => {
        if (mark.type.name === 'aiSuggestion') {
          const suggestionId = mark.attrs.suggestionId;
          const end = pos + node.nodeSize;
          
          const history = suggestionId ? suggestionHistory.get(suggestionId) : undefined;
          
          if (history && history.originalText !== undefined) {
             // This is a replacement - we MUST merge the range to restore one single block
             const current = replacementRanges.get(suggestionId);
             if (current) {
               replacementRanges.set(suggestionId, {
                 from: Math.min(current.from, pos),
                 to: Math.max(current.to, end)
               });
             } else {
               replacementRanges.set(suggestionId, { from: pos, to: end });
             }
          } else {
             // This is an addition (or unknown) - delete ONLY the marked content
             // Do NOT merge ranges to avoid deleting user content in between
             individualDeletions.push({ from: pos, to: end });
          }
        }
      });
    });

    let tr = editor.state.tr;
    
    // 1. Queue Replacements (Restore original text)
    const ops: Array<{ from: number; to: number; text?: string; type: 'restore' | 'delete' }> = [];
    
    replacementRanges.forEach((range, id) => {
        const history = suggestionHistory.get(id);
        if (history && history.originalText !== undefined) {
            ops.push({
                from: range.from,
                to: range.to,
                text: history.originalText,
                type: 'restore'
            });
        }
    });

    // 2. Queue Additions (Delete)
    individualDeletions.forEach(del => {
        ops.push({
            from: del.from,
            to: del.to,
            type: 'delete'
        });
    });

    // Sort reverse to apply safely
    ops.sort((a, b) => b.from - a.from).forEach(op => {
        if (op.type === 'restore' && op.text !== undefined) {
             // Parse HTML string to ProseMirror Slice to render correctly instead of plain text
             const element = document.createElement('div');
             element.innerHTML = op.text;
             const slice = DOMParser.fromSchema(editor.state.schema).parseSlice(element);
             tr.replace(op.from, op.to, slice);
        } else {
            tr.delete(op.from, op.to);
        }
    });
    
    editor.view.dispatch(tr);
    setHasSuggestions(false);
    setSuggestionHistory(new Map());
    toast.success("AI suggestions rejected");
  };

  const handleOpenDialog = () => {
    setPdfFileName(noteTitle || 'note');
    setIsDialogOpen(true);
  };

  return (
    <div className="w-full max-w-7xl bg-card text-card-foreground rounded-lg overflow-hidden border">

      <div className="flex items-center gap-1 p-2 bg-muted/50 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editorState?.canUndo}
          className="size-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editorState?.canRedo}
          className="size-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <Redo className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-accent gap-1"
            >
              {getActiveHeading()}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border">
            <DropdownMenuItem
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className="text-popover-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className="text-popover-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 3 }).run()
              }
              className="text-popover-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Heading 3
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor?.chain().focus().setParagraph().run()}
              className="text-popover-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Paragraph
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`size-8 p-0 hover:bg-accent ${
            editorState?.isBulletList
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={`size-8 p-0 hover:bg-accent ${
            editorState?.isOrderedList
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={!editorState?.canBold}
          className={`size-8 p-0 hover:bg-accent ${
            editorState?.isBold
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={!editorState?.canItalic}
          className={`size-8 p-0 hover:bg-accent ${
            editorState?.isItalic
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          disabled={!editorState?.canStrike}
          className={`size-8 p-0 hover:bg-accent ${
            editorState?.isStrike
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().toggleCode().run()}
          disabled={!editorState?.canCode}
          className={`size-8 p-0 hover:bg-accent ${
            editorState?.isCode
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          disabled={!editorState?.canUnderline}
          className={`size-8 p-0 hover:bg-accent ${
            editorState?.isUnderline
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Underline className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={setLink}
          className={`size-8 p-0 hover:bg-accent ${
            editorState?.isLink
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Link className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().toggleSuperscript().run()}
          disabled={!editorState?.canSuperscript}
          className={`size-8 p-0 hover:bg-accent ${
            editorState?.isSuperscript
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Superscript className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().toggleSubscript().run()}
          disabled={!editorState?.canSubscript}
          className={`size-8 p-0 hover:bg-accent ${
            editorState?.isSubscript
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Subscript className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
          className={`size-8 p-0 hover:bg-accent ${
            editorState?.isAlignLeft
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
          className={`size-8 p-0 hover:bg-accent ${
            editorState?.isAlignCenter
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
          className={`size-8 p-0 hover:bg-accent ${
            editorState?.isAlignRight
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
          className={`size-8 p-0 hover:bg-accent ${
            editorState?.isAlignJustify
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlignJustify className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenDialog}
          className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-accent gap-1"
        >
          <FileDown className="h-4 w-4" />
          Export PDF
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-accent gap-1"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <div ref={editorRef} className="min-h-96 p-6 bg-card">
        <EditorContent
          editor={editor}
          className="prose prose-neutral dark:prose-invert max-w-none focus:outline-none [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:min-h-96 [&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_p]:mb-4 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:rounded [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:marker:text-foreground"
        />
      </div>

      {hasSuggestions && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 bg-background/80 backdrop-blur-sm border rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-foreground">
              AI suggestions pending
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRejectSuggestions}
              variant="outline"
              size="sm"
              className="h-7 text-xs border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-900/20 rounded-full"
            >
              ✗ Reject
            </Button>
            <Button
              onClick={handleAcceptSuggestions}
              variant="default"
              size="sm"
              className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white rounded-full"
            >
              ✓ Accept
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export as PDF</DialogTitle>
            <DialogDescription>
              Enter the name for your PDF file.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={pdfFileName}
              onChange={(e) => setPdfFileName(e.target.value)}
              placeholder="Enter file name"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pdfFileName.trim()) {
                  handleExportPDF(pdfFileName);
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleExportPDF(pdfFileName)}
              disabled={!pdfFileName.trim()}
            >
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RichTextEditor;