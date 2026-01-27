"use client";

import { MessageSquare, Check, Trash2, MoreVertical, Edit2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateCommentResolved, deleteComment, updateCommentContent } from "@/server/comments";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";

// Function to convert URLs in text to clickable links
const linkify = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 underline underline-offset-2 break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

interface Comment {
  id: string;
  content: string;
  selectionText?: string | null;
  resolved: boolean;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

interface CommentsPanelProps {
  comments: Comment[];
  onCommentUpdate: () => void;
  onCommentDeleted?: (commentId: string) => void;
  selectedCommentId?: string | null;
  onCommentSelect?: (commentId: string | null) => void;
}

export function CommentsPanel({ comments, onCommentUpdate, onCommentDeleted, selectedCommentId, onCommentSelect }: CommentsPanelProps) {
  const selectedCardRef = useRef<HTMLDivElement>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  
  // Scroll to selected comment when it changes
  useEffect(() => {
    if (selectedCommentId && selectedCardRef.current) {
      selectedCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Clear selection after 3 seconds
      const timeout = setTimeout(() => {
        if (onCommentSelect) {
          onCommentSelect(null);
        }
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [selectedCommentId, onCommentSelect]);
  
  const handleToggleResolved = async (commentId: string, currentResolved: boolean) => {
    const result = await updateCommentResolved(commentId, !currentResolved);
    if (result.success) {
      toast.success(currentResolved ? "Comment reopened" : "Comment marked as resolved");
      onCommentUpdate();
    } else {
      toast.error(result.error || "Failed to update comment");
    }
  };

  const handleStartEdit = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setEditingContent(content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent("");
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editingContent.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    const result = await updateCommentContent(commentId, editingContent);
    if (result.success) {
      toast.success("Comment updated");
      setEditingCommentId(null);
      setEditingContent("");
      onCommentUpdate();
    } else {
      toast.error(result.error || "Failed to update comment");
    }
  };

  const handleDelete = async (commentId: string) => {
    // Remove the mark from the editor first
    if (onCommentDeleted) {
      onCommentDeleted(commentId);
    }
    
    const result = await deleteComment(commentId);
    if (result.success) {
      toast.success("Comment deleted");
      onCommentUpdate();
    } else {
      toast.error(result.error || "Failed to delete comment");
    }
  };

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center p-4">
        <MessageSquare className="size-8 text-muted-foreground mb-2 opacity-50" />
        <p className="text-sm text-muted-foreground">No comments yet</p>
        <p className="text-xs text-muted-foreground mt-1">Select text and add a comment to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {comments.map((comment) => {
        const isSelected = comment.id === selectedCommentId;
        
        return (
          <div
            key={comment.id}
            ref={isSelected ? selectedCardRef : null}
            data-comment-id={comment.id}
            className={`relative bg-card border-2 rounded-lg p-3 shadow-sm transition-all hover:shadow-md ${
              comment.resolved ? "opacity-60 border-green-500/20" : "border-border"
            } ${
              isSelected ? "!border-primary !ring-4 !ring-primary/30 !shadow-lg bg-primary/5" : ""
            }`}
          >
          {comment.resolved && (
            <div className="absolute top-2 right-2">
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                <Check className="size-3" />
                Resolved
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-2 mb-2">
            {comment.user.image ? (
              <img
                src={comment.user.image}
                alt={comment.user.name}
                className="size-7 rounded-full"
              />
            ) : (
              <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                {comment.user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{comment.user.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(comment.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6 -mr-1">
                  <MoreVertical className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleStartEdit(comment.id, comment.content)}>
                  <Edit2 className="size-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleResolved(comment.id, comment.resolved)}>
                  <Check className="size-4 mr-2" />
                  {comment.resolved ? "Reopen" : "Mark as resolved"}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDelete(comment.id)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {comment.selectionText && (
            <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded mb-2 italic">
              "{comment.selectionText.substring(0, 60)}{comment.selectionText.length > 60 ? '...' : ''}"
            </div>
          )}
          
          {editingCommentId === comment.id ? (
            <div className="space-y-2">
              <textarea
                value={editingContent}
                onChange={(e) => {
                  setEditingContent(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                className="w-full min-h-[60px] max-h-[300px] p-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ overflow: 'hidden' }}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                >
                  <X className="size-3.5 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveEdit(comment.id)}
                  disabled={!editingContent.trim()}
                >
                  <Check className="size-3.5 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
              {linkify(comment.content)}
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}
