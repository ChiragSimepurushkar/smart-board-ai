import { useState } from "react";
import { DndContext, DragEndEvent, DragOverEvent, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useTasks, Task, TaskInsert } from "@/hooks/useTasks";
import { KanbanColumn } from "./KanbanColumn";
import { TaskModal } from "./TaskModal";
import { Loader2 } from "lucide-react";

export function KanbanBoard() {
  const { todoTasks, inProgressTasks, loading, addTask, updateTask, deleteTask, moveTask } = useTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<"todo" | "in_progress">("todo");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // If dropped on a column
    if (overId === "todo" || overId === "in_progress") {
      moveTask(taskId, overId);
      return;
    }

    // If dropped on another task, figure out which column it belongs to
    const overTask = [...todoTasks, ...inProgressTasks].find((t) => t.id === overId);
    if (overTask) {
      moveTask(taskId, overTask.status);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = [...todoTasks, ...inProgressTasks].find((t) => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;
    let targetStatus: "todo" | "in_progress" | null = null;

    if (overId === "todo" || overId === "in_progress") {
      targetStatus = overId;
    } else {
      const overTask = [...todoTasks, ...inProgressTasks].find((t) => t.id === overId);
      if (overTask) targetStatus = overTask.status;
    }

    if (targetStatus && activeTask.status !== targetStatus) {
      moveTask(activeTask.id, targetStatus);
    }
  };

  const handleAddTask = (status: "todo" | "in_progress") => {
    setEditTask(null);
    setDefaultStatus(status);
    setModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditTask(task);
    setModalOpen(true);
  };

  const handleSubmit = async (taskData: TaskInsert) => {
    if (editTask) {
      await updateTask(editTask.id, taskData);
    } else {
      await addTask(taskData);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
        <div className="flex gap-6 p-6 h-full overflow-x-auto">
          <KanbanColumn
            id="todo"
            title="To-Do"
            tasks={todoTasks}
            onAddTask={() => handleAddTask("todo")}
            onEditTask={handleEditTask}
            onDeleteTask={deleteTask}
          />
          <KanbanColumn
            id="in_progress"
            title="In Progress"
            tasks={inProgressTasks}
            onAddTask={() => handleAddTask("in_progress")}
            onEditTask={handleEditTask}
            onDeleteTask={deleteTask}
          />
        </div>
      </DndContext>

      <TaskModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTask(null); }}
        onSubmit={handleSubmit}
        editTask={editTask}
        defaultStatus={defaultStatus}
      />
    </>
  );
}
