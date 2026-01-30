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
import { ArrowRight, Loader2, Trash2 } from "lucide-react";
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
import { Separator } from "./ui/separator";

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
        <Card className="w-full gap-2">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div className="flex-col-1">
                        <CardTitle className="text-xl font-semibold">{notebook.name}</CardTitle>
                        <span>{notebook.notes?.length ?? 0} notes</span>
                    </div>
                    <Link href={`/dashboard/notebook/${notebook.id}`}>
                        <Button variant={"outline"} className="ml-auto p-0">
                            <ArrowRight className="size-4" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <Separator />
            <CardContent className="pb-2" />
            <CardFooter className="flex gap-x-4">
                <Link className="flex-1" href={`/dashboard/notebook/${notebook.id}`}>
                    <Button className="w-full">View Notebook</Button>
                </Link>
                <AlertDialog open={open} onOpenChange={setOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Trash2 className="size-4" />
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