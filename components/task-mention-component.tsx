import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React from 'react';
import { cn } from '@/lib/utils';

export const TaskMentionComponent = (props: NodeViewProps) => {
  const { node } = props;
  const { id, label, notebookId } = node.attrs;

  const handleClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent editor from stealing focus or treating as text selection if needed
    e.stopPropagation();
    
    if (notebookId && id) {
        window.open(`/dashboard/notebook/${notebookId}/tasks?taskId=${id}`, '_blank');
    }
  };

  return (
    <NodeViewWrapper as="span" className="inline-block mx-0.5 align-middle">
      <span 
        onClick={handleClick}
        className={cn(
            "inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium",
            "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            "cursor-pointer hover:underline decoration-1 underline-offset-2 transition-colors"
        )}
        title="Open task in new tab"
      >
        @{label || id}
      </span>
    </NodeViewWrapper>
  );
};
