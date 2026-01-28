import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Editor, Range, Extension } from "@tiptap/core";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance, GetReferenceClientRect } from "tippy.js";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Text,
  Quote,
  Code,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList as CommandListComponent,
} from "@/components/ui/command";

interface CommandItemProps {
  title: string;
  icon: React.ReactNode;
  command: (params: { editor: Editor; range: Range }) => void;
}

interface CommandListProps {
  items: CommandItemProps[];
  command: (item: CommandItemProps) => void;
  editor: Editor;
  range: Range;
}

const CommandList = forwardRef((props: CommandListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = useCallback(
    (index: number) => {
      const item = props.items[index];
      if (item) {
        props.command(item);
      }
    },
    [props]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  return (
    <Command className="h-auto w-72 overflow-hidden rounded-md border bg-popover p-1 shadow-md">
      <CommandListComponent>
        <CommandGroup heading="Suggestions">
          {props.items.map((item, index) => {
            return (
              <CommandItem
                key={index}
                value={item.title}
                onSelect={() => selectItem(index)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                  index === selectedIndex && "bg-accent text-accent-foreground"
                )}
                data-selected={index === selectedIndex}
              >
                <div className="flex h-5 w-5 items-center justify-center">
                  {item.icon}
                </div>
                <span>{item.title}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandListComponent>
    </Command>
  );
});

CommandList.displayName = "CommandList";


const renderItems = () => {
  let component: ReactRenderer | null = null;
  let popup: TippyInstance | null = null;

  return {
    onStart: (props: { editor: Editor; clientRect: GetReferenceClientRect }) => {
      component = new ReactRenderer(CommandList, {
        props,
        editor: props.editor,
      });

      if (!props.clientRect) {
        return;
      }

      const tippyInstance = tippy(document.body, {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
      });

      popup = Array.isArray(tippyInstance) ? tippyInstance[0] : tippyInstance;
    },


    onUpdate: (props: { editor: Editor; clientRect: GetReferenceClientRect }) => {
      component?.updateProps(props);

      if (!props.clientRect) {
        return;
      }

      popup?.setProps({
        getReferenceClientRect: props.clientRect,
      });
    },

    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === "Escape") {
        popup?.hide();
        return true;
      }

      return (component?.ref as any)?.onKeyDown(props);
    },

    onExit: () => {
      popup?.destroy();
      component?.destroy();
    },
  };
};

const getSuggestionItems = ({ query }: { query: string }) => {
  return [
    {
      title: "Text",
      icon: <Text className="h-4 w-4" />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode("paragraph")
          .run();
      },
    },
    {
      title: "Heading 1",
      icon: <Heading1 className="h-4 w-4" />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode("heading", { level: 1 })
          .run();
      },
    },
    {
      title: "Heading 2",
      icon: <Heading2 className="h-4 w-4" />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode("heading", { level: 2 })
          .run();
      },
    },
    {
      title: "Heading 3",
      icon: <Heading3 className="h-4 w-4" />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode("heading", { level: 3 })
          .run();
      },
    },
    {
      title: "Bullet List",
      icon: <List className="h-4 w-4" />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "Numbered List",
      icon: <ListOrdered className="h-4 w-4" />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "Quote",
      icon: <Quote className="h-4 w-4" />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode("paragraph")
          .toggleBlockquote()
          .run();
      },
    },
    {
      title: "Code",
      icon: <Code className="h-4 w-4" />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
    {
      title: "Image",
      icon: <ImageIcon className="h-4 w-4" />,
      command: ({ editor, range }: { editor: Editor; range: Range }) => {
        editor.chain().focus().deleteRange(range).run();
        const event = new Event('trigger-image-upload');
        editor.view.dom.dispatchEvent(event);
      },
    },
  ].filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );
};

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: any;
        }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export const slashCommandSuggestion = {
  items: getSuggestionItems,
  render: renderItems,
};
