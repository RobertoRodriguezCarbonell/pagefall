import { getUserActiveTasks } from "@/server/tasks";
import { ActiveTasksTable } from "@/components/active-tasks-table";

export async function ActiveTasksList() {
    const { tasks, success } = await getUserActiveTasks();

    if (!success || !tasks || tasks.length === 0) {
        return (
             <div className="p-8 text-center border rounded-lg bg-muted/20 mt-4">
                <p className="text-muted-foreground">No active tasks found.</p>
            </div>
        )
    }

    return (
        <ActiveTasksTable tasks={tasks} />
    )
}
