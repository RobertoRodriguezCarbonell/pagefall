"use client"

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Notebook } from "@/db/schema"
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteNotebook } from "@/server/notebooks";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface NotebookCardProps {
    notebook: Notebook;
}

export default function NotebookCard({ notebook }: NotebookCardProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [open, setOpen] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const [response] = await Promise.all([
                deleteNotebook(notebook.id),
                new Promise(resolve => setTimeout(resolve, 1000))
            ]);

            if (response.success) {
                toast.success("Notebook deleted successfully");
                setOpen(false);
                router.refresh();
            }
        } catch {
            toast.error("Failed to delete notebook");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>{notebook.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <p>{notebook.notes?.length ?? 0} notes</p>
            </CardContent>
            <CardFooter className="flex flex-col gap-y-4">
                <Link className="w-full" href={`/dashboard/notebook/${notebook.id}`}>
                    <Button className="w-full" variant="outline">View Notebook</Button>
                </Link>
                <AlertDialog open={open} onOpenChange={setOpen}>
                    <AlertDialogTrigger asChild>
                        <Button className="w-full">
                            <Trash2 className="size-4 mr-2" />
                            Delete Notebook
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the notebook
                                "{notebook.name}" and all its notes.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleDelete();
                                }}
                                disabled={isDeleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin mr-2" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Delete"
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    )
}