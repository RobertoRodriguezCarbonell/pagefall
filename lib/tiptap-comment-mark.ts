import { Mark, mergeAttributes } from '@tiptap/core';

export interface CommentMarkOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    commentMark: {
      setCommentMark: (commentId: string) => ReturnType;
      unsetCommentMark: () => ReturnType;
    };
  }
}

export const CommentMark = Mark.create<CommentMarkOptions>({
  name: 'commentMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      commentId: {
        // Set a sentinel default value to ensure UUIDs are always serialized
        // (TipTap omits attributes matching the default value in JSON)
        default: 'missing-id',
        parseHTML: element => {
          const id = element.getAttribute('data-comment-id');
          return id || 'missing-id';
        },
        renderHTML: attributes => {
          if (!attributes.commentId || attributes.commentId === 'missing-id') {
            return {};
          }
          return {
            'data-comment-id': attributes.commentId,
          };
        },
        keepOnSplit: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
        getAttrs: element => {
          const commentId = (element as HTMLElement).getAttribute('data-comment-id');
          // Only parse if commentId exists and is not null
          return commentId && commentId !== 'null' ? { commentId } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      class: 'comment-highlight',
    }), 0];
  },

  addCommands() {
    return {
      setCommentMark:
        (commentId: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { commentId });
        },
      unsetCommentMark:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});
