"use client";

import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { TaskDialog } from "./task-dialog";

interface CreateTaskButtonProps {
    notebookId: string;
}

export const CreateTaskButton = ({ notebookId }: CreateTaskButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
      </Button>
      <TaskDialog 
        open={isOpen} 
        onOpenChange={setIsOpen} 
        notebookId={notebookId} 
      />
    </>
  );
};
