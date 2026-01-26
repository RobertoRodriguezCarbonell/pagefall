"use client";

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Note } from "@/db/schema";
import Link from "next/link";
import { Button } from "./ui/button";
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
} from "@/components/ui/alert-dialog";
import { ArrowRight, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteNote } from "@/server/notes";
import { Separator } from "./ui/separator";

interface NotebookCardProps {
    note: Note;
}

export default function NoteCard({ note }: NotebookCardProps) {
    const router = useRouter();

    const [isDeleting, setIsDeleting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const [response] = await Promise.all([
                deleteNote(note.id),
                new Promise(resolve => setTimeout(resolve, 1000))
            ]);

            if (response.success) {
                toast.success("Note deleted successfully");
                setIsOpen(false);
                router.refresh();
            }
        } catch {
            toast.error("Failed to delete note");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Card className="w-full gap-2">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div className="flex-col-1">
                        <CardTitle className="text-xl font-semibold">{note.title}</CardTitle>
                    </div>
                    <Link href={`/dashboard/notebook/${note.notebookId}/note/${note.id}`}>
                        <Button variant={"outline"} className="ml-auto p-0">
                            <ArrowRight className="size-4" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <Separator />
            <CardContent className="pb-2" />
            <CardFooter className="flex gap-x-4">
                <Link className="flex-1" href={`/dashboard/notebook/${note.notebookId}/note/${note.id}`}>
                    <Button className="w-full">View Note</Button>
                </Link>
                <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Trash2 className="size-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the
                                note "{note.title}".
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
    );
}