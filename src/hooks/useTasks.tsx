import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress";
  priority: "low" | "medium" | "high";
  category: string;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export type TaskInsert = Omit<Task, "id" | "created_at" | "updated_at" | "user_id">;

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("position", { ascending: true });

    if (error) {
      toast.error("Failed to load tasks");
      console.error(error);
    } else {
      setTasks(data as Task[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchTasks]);

  const addTask = async (task: TaskInsert) => {
    if (!user) return;
    const { error } = await supabase.from("tasks").insert({
      ...task,
      user_id: user.id,
    });
    if (error) {
      toast.error("Failed to create task");
      console.error(error);
    } else {
      toast.success("Task created!");
    }
  };

  const updateTask = async (id: string, updates: Partial<TaskInsert>) => {
    const { error } = await supabase.from("tasks").update(updates).eq("id", id);
    if (error) {
      toast.error("Failed to update task");
      console.error(error);
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete task");
      console.error(error);
    } else {
      toast.success("Task deleted");
    }
  };

  const moveTask = async (id: string, newStatus: "todo" | "in_progress") => {
    await updateTask(id, { status: newStatus });
  };

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");

  return { tasks, todoTasks, inProgressTasks, loading, addTask, updateTask, deleteTask, moveTask, fetchTasks };
}
