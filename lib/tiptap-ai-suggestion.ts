import { Mark, mergeAttributes } from '@tiptap/core';

export interface AISuggestionOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiSuggestion: {
      setAISuggestion: () => ReturnType;
      unsetAISuggestion: () => ReturnType;
      acceptAISuggestion: () => ReturnType;
    };
  }
}

export const AISuggestion = Mark.create<AISuggestionOptions>({
  name: 'aiSuggestion',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      suggestionId: {
        default: null,
        parseHTML: element => element.getAttribute('data-suggestion-id'),
        renderHTML: attributes => {
          if (!attributes.suggestionId) {
            return {};
          }
          return {
            'data-suggestion-id': attributes.suggestionId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-suggestion-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      class: 'ai-suggestion',
    }), 0];
  },

  addCommands() {
    return {
      setAISuggestion: () => ({ commands }) => {
        return commands.setMark(this.name, {
          suggestionId: `suggestion-${Date.now()}`,
        });
      },
      unsetAISuggestion: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
      acceptAISuggestion: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});
