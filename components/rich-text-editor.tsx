"use client";

import {
  useEditor,
  EditorContent,
  useEditorState,
  type JSONContent,
  ReactRenderer,
  mergeAttributes,
  ReactNodeViewRenderer,
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
import Mention from "@tiptap/extension-mention";
import Collaboration from '@tiptap/extension-collaboration'
import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { DOMParser } from "@tiptap/pm/model";
import { AISuggestion } from "@/lib/tiptap-ai-suggestion";
import { CommentMark } from "@/lib/tiptap-comment-mark";
import { SlashCommand, slashCommandSuggestion } from "./slash-command";
import { TaskMentionList } from "./task-mention-list";
import { TaskMentionComponent } from "./task-mention-component";
import { searchTasks } from "@/server/search";
import tippy from "tippy.js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useMemo } from "react";
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
import { saveNoteContent } from "@/server/notes";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import Image from "@tiptap/extension-image";
import { Loader2, Image as ImageIcon } from "lucide-react";

import { ResizableImageComponent } from "./resizable-image-component";

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      isUploading: {
        default: false,
      },
    }
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent)
  },
})

const TaskMention = Mention.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      notebookId: {
        default: null,
        parseHTML: element => element.getAttribute('data-notebook-id'),
        renderHTML: attributes => {
          if (!attributes.notebookId) {
            return {}
          }
          return {
            'data-notebook-id': attributes.notebookId,
          }
        },
      },
    }
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(TaskMentionComponent)
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        href: `/dashboard/notebook/${node.attrs.notebookId}/tasks?taskId=${node.attrs.id}`,
        target: '_blank',
        rel: 'noopener noreferrer',
        class: 'cursor-pointer hover:underline decoration-1 underline-offset-2'
      }),
      `@${node.attrs.label ?? node.attrs.id}`,
    ]
  },
})

interface RichTextEditorProps {
  content?: JSONContent[];
  noteId?: string;
  notebookId?: string;
  noteTitle?: string;
  className?: string;
  comments?: Array<{ id: string; selectionText?: string | null }>;
  showComments?: boolean;
  onEditorReady?: (
    insertFn: (text: string) => void, 
    replaceFn: (text: string) => void, 
    getHTMLFn: () => string, 
    replaceSelectionFn: (text: string) => void, 
    manualReplaceFn: (text: string) => void,
    toggleStyleFn: (style: string) => void,
    setCommentMarkFn: (commentId: string, from: number, to: number) => void,
    removeCommentMarkFn: (commentId: string) => void
  ) => void;
  onTextSelection?: (text: string, position: { top: number; left: number; placement?: 'top' | 'bottom' }, activeStyles?: Record<string, boolean>, noteId?: string, selectionRange?: { from: number; to: number }) => void;
  onCommentClick?: (commentId: string) => void;
  readOnly?: boolean;
}

const RichTextEditor = ({ content, noteId, notebookId, noteTitle, className, comments = [], showComments = false, onEditorReady, onTextSelection, onCommentClick, readOnly = false }: RichTextEditorProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pdfFileName, setPdfFileName] = useState(noteTitle || 'note');
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [suggestionHistory, setSuggestionHistory] = useState<Map<string, { originalText: string, from: number, to: number }>>(new Map());
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stable user color for collaboration (solo en cliente para evitar hydration mismatch)
  const [userColor, setUserColor] = useState('#808080');
  const [userName, setUserName] = useState('User');
  
  useEffect(() => {
    // Generar color y nombre solo en el cliente
    setUserColor('#' + Math.floor(Math.random()*16777215).toString(16));
    setUserName('User-' + Math.random().toString(36).substring(2, 6).toUpperCase());
  }, []);

  // Collaboration setup
  const ydoc = useMemo(() => new Y.Doc(), []);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);

  useEffect(() => {
    if (!noteId || !userName || !userColor) return;

    console.log('🔵 Creating provider for noteId:', noteId, 'user:', userName, 'color:', userColor);

    const newProvider = new HocuspocusProvider({
       url: 'ws://localhost:1234',
       name: noteId,
       document: ydoc,
    });
    
    // Event listeners para debugging
    newProvider.on('status', (event: any) => {
      console.log('📡 Provider status:', event.status);
    });
    
    newProvider.on('connect', () => {
      console.log('✅ Provider connected!');
    });
    
    newProvider.on('disconnect', () => {
      console.log('❌ Provider disconnected');
    });
    
    newProvider.on('synced', () => {
      console.log('🔄 Provider synced');
    });
    
    // Configurar awareness con información del usuario para los cursores
    if (newProvider.awareness) {
      newProvider.awareness.setLocalStateField('user', {
        name: userName,
        color: userColor,
      });
      
      console.log('👤 Awareness set:', { name: userName, color: userColor });
      
      // Log de estados del awareness
      newProvider.awareness.on('change', () => {
        const states = Array.from(newProvider.awareness!.getStates().entries());
        console.log('👥 Awareness changed! Total users:', states.length);
        states.forEach(([clientId, state]) => {
          console.log(`  - Client ${clientId}:`, state.user);
        });
      });
    }
    
    setProvider(newProvider);
    providerRef.current = newProvider;

    return () => {
      console.log('🔴 Destroying provider');
      newProvider.destroy();
      providerRef.current = null;
    }
  }, [noteId, ydoc, userName, userColor]);

  const extensions = useMemo(() => {
    const baseExtensions = [
      StarterKit.configure({
        // @ts-ignore
        history: false,
        link: false,
        underline: false,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      AISuggestion,
      CommentMark,
      SlashCommand.configure({
        suggestion: slashCommandSuggestion,
      }),
      TaskMention.configure({
        HTMLAttributes: {
          class: 'inline-flex items-center rounded-md border px-1 py-0.5 text-xs font-medium text-foreground bg-secondary',
        },
        suggestion: {
          items: async ({ query }) => {
            const { results } = await searchTasks(query, notebookId);
            return results || [];
          },
          render: () => {
            let component: any;
            let popup: any;

            return {
              onStart: (props: any) => {
                component = new ReactRenderer(TaskMentionList, {
                  props,
                  editor: props.editor,
                })

                if (!props.clientRect) {
                  return
                }

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect as any,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                })
              },
              onUpdate(props: any) {
                component.updateProps(props)

                if (!props.clientRect) {
                  return
                }

                popup[0].setProps({
                  getReferenceClientRect: props.clientRect,
                })
              },
              onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                  popup[0].hide()

                  return true
                }

                return component.ref?.onKeyDown(props)
              },
              onExit() {
                popup[0].destroy()
                component.destroy()
              },
            }
          },
        },
      }),
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
      ResizableImage.configure({
        allowBase64: true,
      }),
    ];

    // Extensión personalizada para cursores de colaboración
    const CursorExtension = Extension.create({
      name: 'collaborationCursor',
      
      addProseMirrorPlugins() {
        // Usar providerRef para acceder al provider actual
        return [
          new Plugin({
            key: new PluginKey('collaborationCursor'),
            
            state: {
              init() {
                console.log('🎬 Inicializando estado del plugin de cursores');
                return DecorationSet.empty;
              },
              
              apply(tr, decorationSet, oldState, newState) {
                console.log('⚙️ Apply llamado en plugin de cursores');
                
                // Obtener awareness del providerRef actual
                const currentProvider = providerRef.current;
                if (!currentProvider || !currentProvider.awareness) {
                  console.log('⚠️ Provider o awareness no disponible en apply');
                  return DecorationSet.empty;
                }
                
                const awareness = currentProvider.awareness;
                const decorations: Decoration[] = [];
                const doc = newState.doc;
                
                console.log('✅ Awareness disponible, procesando cursores...');
                console.log('📊 Estados en awareness:', awareness.getStates().size);
                
                awareness.getStates().forEach((state: any, clientId: number) => {
                  // No mostrar mi propio cursor
                  if (clientId === awareness.clientID) {
                    console.log(`⏭️ Saltando mi propio cursor (clientId: ${clientId})`);
                    return;
                  }
                  
                  const user = state.user;
                  const cursor = state.cursor;
                  
                  console.log(`🔍 Procesando cliente ${clientId}:`, { user, cursor });
                  
                  if (!user?.name || !cursor || cursor.head == null) {
                    console.log(`⏭️ Cursor incompleto para cliente ${clientId}`);
                    return;
                  }
                  
                  // Crear el elemento del cursor
                  const cursorWidget = document.createElement('span');
                  cursorWidget.className = 'collaboration-cursor';
                  cursorWidget.style.borderLeft = `2px solid ${user.color}`;
                  cursorWidget.style.height = '1.2em';
                  cursorWidget.style.position = 'relative';
                  cursorWidget.style.display = 'inline-block';
                  cursorWidget.style.pointerEvents = 'none';
                  cursorWidget.style.marginLeft = '-1px';
                  
                  // Crear etiqueta con nombre
                  const label = document.createElement('span');
                  label.className = 'collaboration-cursor__label';
                  label.style.backgroundColor = user.color;
                  label.style.color = 'white';
                  label.style.padding = '2px 6px';
                  label.style.borderRadius = '4px 4px 4px 0';
                  label.style.fontSize = '11px';
                  label.style.fontWeight = '600';
                  label.style.position = 'absolute';
                  label.style.top = '-1.6em';
                  label.style.left = '-1px';
                  label.style.whiteSpace = 'nowrap';
                  label.style.zIndex = '10';
                  label.textContent = user.name;
                  
                  cursorWidget.appendChild(label);
                  
                  try {
                    const pos = Math.min(Math.max(0, cursor.head), doc.content.size);
                    decorations.push(
                      Decoration.widget(pos, cursorWidget, { 
                        side: 1, 
                        key: `cursor-${clientId}` 
                      })
                    );
                    console.log(`👆 Cursor creado para ${user.name} en posición ${pos}`);
                  } catch (e) {
                    console.error('❌ Error creating cursor decoration:', e);
                  }
                });
                
                console.log(`📍 Total cursores creados: ${decorations.length}`);
                return DecorationSet.create(doc, decorations);
              },
            },
            
            props: {
              decorations(state) {
                return this.getState(state);
              },
            },
            
            view(editorView) {
              console.log('🎬 Inicializando view del plugin de cursores...');
              
              // Función para obtener el provider actual
              const getProvider = () => providerRef.current;
              
              const awarenessChangeHandler = () => {
                const currentProvider = getProvider();
                if (!currentProvider || !currentProvider.awareness) {
                  console.log('⚠️ Provider no disponible en awarenessChangeHandler');
                  return;
                }
                
                console.log('🔄 Awareness cambió, actualizando cursores...');
                console.log('📊 Estados después del cambio:', currentProvider.awareness.getStates().size);
                
                // Forzar actualización del estado del plugin
                const tr = editorView.state.tr;
                tr.setMeta('addToHistory', false);
                editorView.dispatch(tr);
              };
              
              // Intentar registrar handler con retry si provider no está listo
              const tryRegisterHandler = () => {
                const currentProvider = getProvider();
                if (currentProvider && currentProvider.awareness) {
                  currentProvider.awareness.on('change', awarenessChangeHandler);
                  console.log('✅ Handler registrado en awareness');
                  return true;
                }
                console.log('⏳ Provider aún no listo, reintentando...');
                return false;
              };
              
              // Intentar inmediatamente
              if (!tryRegisterHandler()) {
                // Si falla, reintentar después de un delay
                const retryTimer = setTimeout(() => {
                  tryRegisterHandler();
                }, 100);
                
                return {
                  destroy: () => {
                    console.log('💥 Destruyendo plugin de cursores...');
                    clearTimeout(retryTimer);
                    const currentProvider = getProvider();
                    if (currentProvider && currentProvider.awareness) {
                      currentProvider.awareness.off('change', awarenessChangeHandler);
                    }
                  }
                };
              }
              
              return {
                destroy: () => {
                  console.log('💥 Destruyendo plugin de cursores...');
                  const currentProvider = getProvider();
                  if (currentProvider && currentProvider.awareness) {
                    currentProvider.awareness.off('change', awarenessChangeHandler);
                  }
                }
              };
            },
          }),
        ];
      },
    });
    
    baseExtensions.push(CursorExtension);
    console.log('✨ Custom CursorExtension added to editor');

    return baseExtensions;
  }, [ydoc, provider, notebookId, userName, userColor]);

  const editor = useEditor({
    extensions: extensions,
    immediatelyRender: false,
    autofocus: !readOnly,
    editable: !readOnly,
    injectCSS: false,
    onUpdate: ({ editor }) => {
      const hasSuggestion = editor.state.doc.textContent.length > 0 && 
        editor.isActive('aiSuggestion');
      setHasSuggestions(hasSuggestion);
      
      // Actualizar posición del cursor en awareness
      if (provider?.awareness) {
        const { from, to } = editor.state.selection;
        provider.awareness.setLocalStateField('cursor', {
          anchor: from,
          head: to,
        });
        console.log('🖱️ Cursor actualizado:', { from, to, user: userName });
      }
    },
    onSelectionUpdate: ({ editor }) => {
      // También actualizar cuando cambia la selección sin editar
      if (provider?.awareness) {
        const { from, to } = editor.state.selection;
        provider.awareness.setLocalStateField('cursor', {
          anchor: from,
          head: to,
        });
      }
    },
    shouldRerenderOnTransaction: false, 
  });

  useEffect(() => {
    if (!editor) return;

    const handleUploadEvent = () => {
      fileInputRef.current?.click();
    };

    const dom = editor.view.dom;
    dom.addEventListener('trigger-image-upload', handleUploadEvent);
    return () => {
      dom.removeEventListener('trigger-image-upload', handleUploadEvent);
    };
  }, [editor]);

  // Log loaded content
  useEffect(() => {
    // With collaboration, logging initial content prop is less relevant usually, 
    // but we can keep it for debugging
    if (content) {

    }
  }, [content]);

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
          
          const activeStyles = {
            bold: editor.isActive('bold'),
            italic: editor.isActive('italic'),
            strike: editor.isActive('strike'),
            code: editor.isActive('code'),
            h1: editor.isActive('heading', { level: 1 }),
            h2: editor.isActive('heading', { level: 2 }),
            h3: editor.isActive('heading', { level: 3 }),
            bulletList: editor.isActive('bulletList'),
            orderedList: editor.isActive('orderedList'),
            blockquote: editor.isActive('blockquote'),
          };

          onTextSelection(selectedText, position, activeStyles, noteId, { from, to });
          
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
  }, [editor, onTextSelection, noteId]);

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
        return html;
      };
      
      const replaceSelection = (text: string) => {
        const cleanedText = cleanAIResponse(text);
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

        // 1. Delete selection first to assess valid state
        editor.chain().focus().deleteRange({ from, to }).run();

        // 2. Smart List Insertion Logic
        // Check if we are inserting a list structure while already inside a list item
        const inList = editor.isActive('listItem');
        let contentToInsert = cleanedText;
        
        if (inList) {
          // Parse the content to see if it's a wrapper <ul>/<ol>
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = cleanedText;
          const listElement = tempDiv.querySelector('ul, ol');
          
          if (listElement) {
               const lis = listElement.querySelectorAll('li');
               
               // Check if the current list item is empty (which happens if we replaced the entire bullet content)
               const { $from } = editor.state.selection;
               const parent = $from.parent;
               const isParentEmpty = parent.content.size === 0;

               if (isParentEmpty && lis.length > 0) {
                   // Use innerHTML for the first item to fill the current empty <li>
                   const firstPart = lis[0].innerHTML;
                   // Use outerHTML for the rest to create new sibling <li>s
                   const secondPart = Array.from(lis).slice(1).map(li => li.outerHTML).join('');
                   contentToInsert = firstPart + secondPart;
               } else {
                   // Standard strip: Extract all LI elements
                   contentToInsert = Array.from(lis).map(li => li.outerHTML).join('');
               }
          }
        }
        
        // 3. Execute insertion
        editor.chain()
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

      const manualReplaceSelection = (html: string) => {
          // Similar list logic but WITHOUT aiSuggestion mark
           const inList = editor.isActive('listItem');
           let contentToInsert = html;

           if (inList) {
             try {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                const listElement = tempDiv.querySelector('ul, ol');
                if (listElement) {
                    const lis = listElement.querySelectorAll('li');
                    const { $from } = editor.state.selection;
                    const isParentEmpty = $from.parent.content.size === 0;
                     if (isParentEmpty && lis.length > 0) {
                         const firstPart = lis[0].innerHTML;
                         const secondPart = Array.from(lis).slice(1).map(li => li.outerHTML).join('');
                         contentToInsert = firstPart + secondPart;
                     } else {
                         contentToInsert = Array.from(lis).map(li => li.outerHTML).join('');
                     }
                }
             } catch(e) { }
           }

          editor.chain().deleteSelection().insertContent(contentToInsert).run();
      }

      const toggleStyle = (style: string) => {
        const chain = editor.chain().focus();
        
        switch (style) {
            case 'bold': chain.toggleBold().run(); break;
            case 'italic': chain.toggleItalic().run(); break;
            case 'strike': chain.toggleStrike().run(); break;
            case 'code': chain.toggleCode().run(); break;
            case 'h1': chain.toggleHeading({ level: 1 }).run(); break;
            case 'h2': chain.toggleHeading({ level: 2 }).run(); break;
            case 'h3': chain.toggleHeading({ level: 3 }).run(); break;
            case 'bulletList': chain.toggleBulletList().run(); break;
            case 'orderedList': chain.toggleOrderedList().run(); break;
            case 'blockquote': chain.toggleBlockquote().run(); break;
            case 'p': chain.setParagraph().run(); break;
        }
      }
      
      // Helper to estimate text length of HTML string for selection
      const tempDivContentLength = (html: string) => {
          try {
             const div = document.createElement('div');
             div.innerHTML = html;
             return div.textContent?.length || 0;
          } catch (e) { return 0; }
      }
      
      const setCommentMark = (commentId: string, from: number, to: number) => {
        // Validate positions
        const docSize = editor.state.doc.content.size;
        if (from < 0 || to > docSize || from >= to) {
          console.error('Invalid positions for comment mark:', { from, to, docSize });
          return;
        }
                
        editor.chain()
          .setTextSelection({ from, to })
          .setCommentMark(commentId)
          .run();
        
        // Force immediate save after applying mark
        setTimeout(() => {
          const json = editor.getJSON();
          
          if (noteId) {
            // Send as string to bypass potential server component serialization issues
            saveNoteContent(noteId, JSON.stringify(json));
          }
        }, 100);
      };
      
      const removeCommentMark = (commentId: string) => {
        // Find all marks with this commentId and remove them
        const { doc, tr } = editor.state;
        let transaction = tr;
        
        doc.descendants((node, pos) => {
          if (node.isText) {
            node.marks.forEach(mark => {
              if (mark.type.name === 'commentMark' && mark.attrs.commentId === commentId) {
                const from = pos;
                const to = pos + node.nodeSize;
                transaction = transaction.removeMark(from, to, mark.type);
              }
            });
          }
        });
        
        editor.view.dispatch(transaction);
      };
      
      onEditorReady(insertContent, replaceContent, getHTML, replaceSelection, manualReplaceSelection, toggleStyle, setCommentMark, removeCommentMark);
    }
  }, [editor, onEditorReady]);

  // Toggle comment visibility by updating CSS class on editor container
  useEffect(() => {
    if (!editor) return;
    
    // Add to ProseMirror element directly
    const proseMirrorElement = editor.view.dom;
    if (showComments) {
      proseMirrorElement.classList.add('show-comments');
    } else {
      proseMirrorElement.classList.remove('show-comments');
    }
    
    // Also add to parent containers
    const editorContainer = proseMirrorElement.closest('.tiptap-editor-container');
    if (editorContainer) {
      if (showComments) {
        editorContainer.classList.add('show-comments');
      } else {
        editorContainer.classList.remove('show-comments');
      }
    }
  }, [editor, showComments]);

  // Clean up marks without valid commentId on mount
  useEffect(() => {
    if (!editor) return;
    
    const { doc, tr } = editor.state;
    let transaction = tr;
    let hasChanges = false;
    
    doc.descendants((node, pos) => {
      if (node.isText && node.marks) {
        node.marks.forEach(mark => {
          if (mark.type.name === 'commentMark' && 
              (!mark.attrs.commentId || mark.attrs.commentId === 'null' || mark.attrs.commentId === 'missing-id')) {
            const from = pos;
            const to = pos + node.nodeSize;
            transaction = transaction.removeMark(from, to, mark.type);
            hasChanges = true;
          }
        });
      }
    });
    
    if (hasChanges) {
      editor.view.dispatch(transaction);
      
      // Force save after cleanup
      setTimeout(() => {
        if (noteId) {
          const content = editor.getJSON();
          // Send as string to bypass potential server component serialization issues
          saveNoteContent(noteId, JSON.stringify(content));
        }
      }, 100);
    }
  }, [editor, noteId]);

  // Handle clicks on comment highlights
  useEffect(() => {
    if (!editor || !onCommentClick) return;
    
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const commentElement = target.closest('[data-comment-id]');
      
      if (commentElement) {
        const commentId = commentElement.getAttribute('data-comment-id');
        if (commentId) {
          onCommentClick(commentId);
        }
      }
    };
    
    const proseMirror = editor.view.dom;
    proseMirror.addEventListener('click', handleClick);
    
    return () => {
      proseMirror.removeEventListener('click', handleClick);
    };
  }, [editor, onCommentClick]);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
       toast.error("Please upload an image file");
       return;
    }

    try {
      setIsUploading(true);
      
      // 1. Create optimistic preview
      const objectUrl = URL.createObjectURL(file);
      
      // 2. Insert image with uploading state
      editor?.chain().focus().setImage({ 
          src: objectUrl,
          // @ts-ignore - custom attribute
          isUploading: true 
      }).run();
      
      // Get the position of the newly inserted image to update it later?
      // Actually, we can just replace the src later if we can find it, 
      // or easier: we rely on the objectUrl for now.
      
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      
      if (data.url) {
        // 3. Find the image node with the objectUrl and update it
        // We scan the document to find the node with matching src
        let pos = -1;
        editor?.state.doc.descendants((node, position) => {
            if (node.type.name === 'image' && node.attrs.src === objectUrl) {
                pos = position;
                return false; // Stop iteration
            }
        });

        if (pos > -1) {
            // Update the node: set new src and set isUploading to false
            const transaction = editor?.state.tr.setNodeMarkup(pos, undefined, {
                ...editor?.state.doc.nodeAt(pos)?.attrs,
                src: data.url,
                isUploading: false
            });
            if (transaction) {
               editor?.view.dispatch(transaction);
            }
        }
        
        toast.success("Image uploaded successfully");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
      
      // Cleanup: Remove the broken image node if upload failed
      // (Optional, or leave it so user knows it failed?)
      // Let's remove it to be clean.
      /* 
      let pos = -1;
      editor?.state.doc.descendants((node, position) => { ... });
      if (pos > -1) { editor?.chain().deleteRange({ from: pos, to: pos + 1 }).run(); } 
      */
    } finally {
      setIsUploading(false);
      // Reset input value
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={cn("w-full max-w-7xl bg-card text-card-foreground rounded-lg border tiptap-editor-container", className)}>

      <div className="sticky top-0 z-[45] flex items-center gap-1 p-2 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/50 border-b rounded-t-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().undo().run()}
          onMouseDown={(e) => e.preventDefault()}
          disabled={!editorState?.canUndo}
          className="size-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().redo().run()}
          onMouseDown={(e) => e.preventDefault()}
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
              suppressHydrationWarning
              onMouseDown={(e) => e.preventDefault()}
            >
              {getActiveHeading()}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 1 }).run()
              }
              onMouseDown={(e) => e.preventDefault()}
              className="text-popover-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
              onMouseDown={(e) => e.preventDefault()}
              className="text-popover-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 3 }).run()
              }
              onMouseDown={(e) => e.preventDefault()}
              className="text-popover-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Heading 3
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor?.chain().focus().setParagraph().run()}
              onMouseDown={(e) => e.preventDefault()}
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
          onMouseDown={(e) => e.preventDefault()}
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
          onMouseDown={(e) => e.preventDefault()}
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
          onMouseDown={(e) => e.preventDefault()}
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
          onMouseDown={(e) => e.preventDefault()}
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
          onMouseDown={(e) => e.preventDefault()}
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
          onMouseDown={(e) => e.preventDefault()}
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
          onMouseDown={(e) => e.preventDefault()}
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
          onMouseDown={(e) => e.preventDefault()}
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
          onMouseDown={(e) => e.preventDefault()}
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
          onMouseDown={(e) => e.preventDefault()}
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
          onMouseDown={(e) => e.preventDefault()}
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
          onMouseDown={(e) => e.preventDefault()}
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
          onMouseDown={(e) => e.preventDefault()}
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
          onMouseDown={(e) => e.preventDefault()}
          className={`size-8 p-0 hover:bg-accent ${
            editorState?.isAlignJustify
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlignJustify className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
        />
        
        <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="size-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
            title="Insert Image"
        >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenDialog}
          onMouseDown={(e) => e.preventDefault()}
          className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-accent gap-1"
        >
          <FileDown className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <div ref={editorRef} className="flex-1 p-6 bg-card rounded-b-lg overflow-y-auto">
        <style jsx global>{`
          .comment-highlight {
            background-color: rgba(255, 213, 79, 0.3);
            border-bottom: 2px solid rgba(255, 193, 7, 0.6);
            cursor: pointer;
            transition: background-color 0.2s;
          }
          .dark .comment-highlight {
            background-color: rgba(255, 193, 7, 0.2);
            border-bottom: 2px solid rgba(255, 193, 7, 0.4);
          }
          .comment-highlight:hover {
            background-color: rgba(255, 213, 79, 0.5);
          }
          .dark .comment-highlight:hover {
            background-color: rgba(255, 193, 7, 0.3);
          }
        `}</style>
        <EditorContent
          editor={editor}
          className="h-full prose prose-neutral dark:prose-invert max-w-none focus:outline-none [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:min-h-[500px] [&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_p]:mb-4 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:rounded [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:marker:text-foreground [&_a]:text-blue-500 [&_a]:underline [&_a]:cursor-pointer"
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