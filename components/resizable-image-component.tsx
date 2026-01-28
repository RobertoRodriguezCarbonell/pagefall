import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, useEffect, useRef } from 'react';
import { Resizable } from 're-resizable';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export const ResizableImageComponent = (props: NodeViewProps) => {
  const { node, updateAttributes, selected } = props;
  const { src, alt, title, width, height, isUploading } = node.attrs;
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    if (src && !aspectRatio) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setAspectRatio(img.width / img.height);
      };
    }
  }, [src, aspectRatio]);

  return (
    <NodeViewWrapper className="inline-block leading-none">
      <Resizable
        size={{ 
            width: width || 'auto', 
            height: height || 'auto' 
        }}
        onResizeStop={(e, direction, ref, d) => {
          updateAttributes({
            width: ref.style.width,
            height: ref.style.height,
          });
        }}
        lockAspectRatio={true}
        enable={{
            top: false,
            right: selected, // Only show handles when selected
            bottom: false,
            left: selected,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false,
        }}
        handleClasses={{
            right: "w-2 h-full cursor-col-resize hover:bg-primary/50 absolute top-0 -right-1 z-10 transition-colors rounded-sm",
            left: "w-2 h-full cursor-col-resize hover:bg-primary/50 absolute top-0 -left-1 z-10 transition-colors rounded-sm",
        }}
        className={cn(
            "relative group transition-all duration-200", 
            selected && "ring-2 ring-primary ring-offset-2 rounded-sm"
        )}
      >
        <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
            src={src}
            alt={alt}
            title={title}
            className={cn(
                "rounded-md max-w-full h-auto object-contain transition-opacity duration-300",
                isUploading ? "opacity-50 blur-[2px]" : "opacity-100"
            )}
            style={{
                width: '100%',
                height: '100%',
            }}
            />
            
            {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-lg">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                </div>
            )}
        </div>
      </Resizable>
    </NodeViewWrapper>
  );
};
