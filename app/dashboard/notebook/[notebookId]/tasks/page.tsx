import { CreateTaskButton } from "@/components/create-task-button";
import { PageWrapper } from "@/components/page-wrapper";
import { TaskCard } from "@/components/task-card";
import { getNotebookById } from "@/server/notebooks";
import { getTasksByNotebookId } from "@/server/tasks";
import { Task } from "@/db/schema";
import { AddTaskColumnButton } from "@/components/add-task-column-button";

type Params = Promise<{
    notebookId: string;
}>;

interface Column {
    id: string;
    title: string;
    tasks: Task[];
}

export default async function TasksPage({ params }: { params: Params }) {
    const { notebookId } = await params;
    const { notebook } = await getNotebookById(notebookId);
    const { tasks } = await getTasksByNotebookId(notebookId);

    const columns: Column[] = [
        { 
            id: "todo", 
            title: "To Do", 
            tasks: tasks?.filter(t => t.status === "todo") || []
        },
        { 
            id: "in-progress", 
            title: "In Progress", 
            tasks: tasks?.filter(t => t.status === "in-progress") || []
        },
        { 
            id: "done", 
            title: "Done", 
            tasks: tasks?.filter(t => t.status === "done") || []
        },
    ];

    return (
        <PageWrapper breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: notebook?.name ?? "Notebook", href: `/dashboard/notebook/${notebookId}` },
            { label: "Tasks", href: `/dashboard/notebook/${notebookId}/tasks` },
        ]}>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Tasks</h1>
                <CreateTaskButton notebookId={notebookId} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full mt-4">
                {columns.map((column) => (
                    <div key={column.id} className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-muted-foreground">{column.title}</h3>
                            <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground font-medium">
                                {column.tasks.length}
                            </span>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                            {column.tasks.map((task) => (
                                <TaskCard key={task.id} task={task} />
                            ))}
                            <AddTaskColumnButton 
                                notebookId={notebookId} 
                                status={column.id as "todo" | "in-progress" | "done"} 
                                label={`Add ${column.title}`} 
                            />
                        </div>
                    </div>
                ))}
            </div>
        </PageWrapper>
    );
}
