import { CreateNotebookButton } from "@/components/create-notebook-button";
import NotebookCard from "@/components/notebook-card";
import { PageWrapper } from "@/components/page-wrapper";
import { getNotebooks, getNotebookInvitations } from "@/server/notebooks";
import { ActiveTasksList } from "@/components/active-tasks-list";
import { CheckSquare } from "lucide-react";
import { NotebookInvitationList } from "@/components/notebook-invitation-list";

export default async function Page() {
    const notebooks = await getNotebooks();
    const invitations = await getNotebookInvitations();

    return (
        <PageWrapper breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }]}>
            <div className="flex flex-col gap-8">
                {invitations.success && invitations.invitations && invitations.invitations.length > 0 && (
                    <NotebookInvitationList initialInvitations={invitations.invitations} />
                )}

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold tracking-tight">Notebooks</h1>
                        <CreateNotebookButton />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {notebooks.success &&
                            notebooks?.notebooks?.map((notebook) => (
                                <NotebookCard key={notebook.id} notebook={notebook} />
                            ))}
                    </div>
                    {notebooks.success && notebooks?.notebooks?.length === 0 && (
                        <div className="text-muted-foreground mt-4">No notebooks found. Create one to get started.</div>
                    )}
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <CheckSquare className="h-6 w-6 text-primary" />
                        <h2 className="text-2xl font-bold tracking-tight">Active Tasks</h2>
                    </div>
                    <p className="text-muted-foreground mb-4">Recent tasks from all your notebooks.</p>
                    <ActiveTasksList />
                </section>
            </div>
        </PageWrapper>

    )
}