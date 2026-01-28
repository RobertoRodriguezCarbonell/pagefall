"use client";

import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { TaskDialog } from "./task-dialog";

interface AddTaskColumnButtonProps {
    notebookId: string;
    status: "todo" | "in-progress" | "done";
    label: string;
}

export const AddTaskColumnButton = ({ notebookId, status, label }: AddTaskColumnButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        variant="ghost" 
        className="w-full justify-start text-muted-foreground hover:text-foreground border border-dashed border-transparent hover:border-border hover:bg-muted/50"
        onClick={() => setIsOpen(true)}
      >
          <Plus className="mr-2 h-4 w-4" />
          {label}
      </Button>
      <TaskDialog 
        open={isOpen} 
        onOpenChange={setIsOpen} 
        notebookId={notebookId}
        defaultStatus={status}
      />
    </>
  );
};