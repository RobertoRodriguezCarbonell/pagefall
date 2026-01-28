import React, {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { CheckCircle, Circle, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  notebookId: string;
}

interface TaskMentionListProps {
  items: TaskItem[];
  command: (item: { id: string; label: string; notebookId: string }) => void;
}

export const TaskMentionList = forwardRef((props: TaskMentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = useCallback(
    (index: number) => {
      const item = props.items[index];
      if (item) {
        props.command({ id: item.id, label: item.title, notebookId: item.notebookId });
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

  if (props.items.length === 0) {
      return null;
  }

  return (
    <div className="z-50 h-auto w-72 overflow-hidden rounded-md border bg-popover p-1 shadow-md">
      <div className="flex flex-col gap-1">
          {props.items.map((item, index) => {
            return (
              <button
                key={item.id}
                onClick={() => selectItem(index)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
                  index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <div className="flex h-5 w-5 items-center justify-center">
                    {item.status === 'done' ? <CheckCircle className="h-4 w-4 text-green-500" /> :
                     item.status === 'in-progress' ? <CircleDashed className="h-4 w-4 text-yellow-500" /> :
                     <Circle className="h-4 w-4 text-gray-500" />}
                </div>
                <span className="truncate">{item.title}</span>
              </button>
            );
          })}
      </div>
    </div>
  );
});

TaskMentionList.displayName = "TaskMentionList";
