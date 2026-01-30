import { CreateNoteButton } from "@/components/create-note-button";
import NoteCard from "@/components/note-card";
import { PageWrapper } from "@/components/page-wrapper";
import { Button } from "@/components/ui/button";
import { getNotebookById, checkNotebookAccess } from "@/server/notebooks";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ListTodo, Settings } from "lucide-react";
import Link from "next/link";

type Params = Promise<{
    notebookId: string;
}>;

export default async function NotebookPage({ params }: { params: Params }) {
    const { notebookId } = await params;
    const session = await auth.api.getSession({
        headers: await headers()
    });

    const { notebook } = await getNotebookById(notebookId);
    
    // Check if user is owner to show settings button
    let isOwner = false;
    if (session?.user?.id) {
        const access = await checkNotebookAccess(notebookId, session.user.id);
        isOwner = !!access.isOwner;
    }

    return (
        <PageWrapper breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: notebook?.name ?? "Notebook", href: `/dashboard/notebook/${notebookId}` },
        ]}>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{notebook?.name}</h1>
                
                <div className="flex items-center gap-2">
                     <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/notebook/${notebookId}/tasks`}>
                            <ListTodo className="h-4 w-4 mr-2" />
                            Tasks
                        </Link>
                    </Button>
                    
                    {isOwner && (
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/notebook/${notebookId}/settings`}>
                                <Settings className="h-4 w-4 mr-2" />
                                Settings
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
                <CreateNoteButton notebookId={notebookId} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {notebook?.notes?.map((note) => (
                    <NoteCard key={note.id} note={note} />
                ))}
            </div>
        </PageWrapper>
    )
}