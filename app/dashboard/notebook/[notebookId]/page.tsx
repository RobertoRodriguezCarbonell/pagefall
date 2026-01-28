import { CreateNoteButton } from "@/components/create-note-button";
import NoteCard from "@/components/note-card";
import { PageWrapper } from "@/components/page-wrapper";
import { Button } from "@/components/ui/button";
import { getNotebookById } from "@/server/notebooks";
import { ListTodo } from "lucide-react";
import Link from "next/link";

type Params = Promise<{
    notebookId: string;
}>;

export default async function NotebookPage({ params }: { params: Params }) {
    const { notebookId } = await params;

    const { notebook } = await getNotebookById(notebookId);

    return (
        <PageWrapper breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: notebook?.name ?? "Notebook", href: `/dashboard/notebook/${notebookId}` },
        ]}>
            <h1 className="text-2xl font-bold">{notebook?.name}</h1>

            <div className="flex items-center gap-2">
                <CreateNoteButton notebookId={notebookId} />
                <Button asChild variant="outline">
                    <Link href={`/dashboard/notebook/${notebookId}/tasks`}>
                        <ListTodo className="h-4 w-4 mr-2" />
                        Tasks
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {notebook?.notes?.map((note) => (
                    <NoteCard key={note.id} note={note} />
                ))}
            </div>
        </PageWrapper>
    )
}