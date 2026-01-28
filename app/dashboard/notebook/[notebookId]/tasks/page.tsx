import { CreateTaskButton } from "@/components/create-task-button";
import { PageWrapper } from "@/components/page-wrapper";
import { TaskCard } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import { getNotebookById } from "@/server/notebooks";
import { Plus } from "lucide-react";

type Params = Promise<{
    notebookId: string;
}>;

interface Task {
    id: string;
    title: string;
    description?: string;
    priority: "low" | "medium" | "high";
    dueDate?: string;
    tag?: string;
    assignedTo?: string;
}

interface Column {
    id: string;
    title: string;
    tasks: Task[];
}

export default async function TasksPage({ params }: { params: Params }) {
    const { notebookId } = await params;
    const { notebook } = await getNotebookById(notebookId);

    const columns: Column[] = [
        { 
            id: "todo", 
            title: "To Do", 
            tasks: [
                { id: "1", title: "Research competitors", description: "Analyze market and competitors lorem ipsum dolor sit amet consectetur adipiscing elit", priority: "high", dueDate: "2024-02-15", tag: "Strategy", assignedTo: "Alice" },
                { id: "2", title: "Draft project proposal", description: "Create initial draft for project proposal", priority: "medium", tag: "Writing", assignedTo: "Bob" }
            ] 
        },
        { 
            id: "in-progress", 
            title: "In Progress", 
            tasks: [
                { id: "3", title: "Design system architecture", description: "Create initial system design", priority: "high", dueDate: "2024-02-20", tag: "Design", assignedTo: "Charlie" }
            ] 
        },
        { 
            id: "done", 
            title: "Done", 
            tasks: [
                { id: "4", title: "Setup Next.js project", description: "Initial project setup with Next.js", priority: "medium", dueDate: "2024-01-10", tag: "Dev", assignedTo: "Dave" },
                { id: "5", title: "Configure database", description: "Set up and configure the database", priority: "low", tag: "Dev", assignedTo: "Eve" }
            ] 
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
                <CreateTaskButton />
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
                            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground border border-dashed border-transparent hover:border-border hover:bg-muted/50">
                                <Plus className="mr-2 h-4 w-4" />
                                Add {column.title}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </PageWrapper>
    );
}
