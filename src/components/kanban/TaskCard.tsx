import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/hooks/useTasks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

const priorityColors: Record<string, string> = {
  high: "bg-priority-high/15 text-priority-high border-priority-high/30",
  medium: "bg-priority-medium/15 text-priority-medium border-priority-medium/30",
  low: "bg-priority-low/15 text-priority-low border-priority-low/30",
};

const categoryColors: Record<string, string> = {
  design: "bg-tag-design/15 text-tag-design",
  dev: "bg-tag-dev/15 text-tag-dev",
  media: "bg-tag-media/15 text-tag-media",
  marketing: "bg-tag-marketing/15 text-tag-marketing",
  research: "bg-tag-research/15 text-tag-research",
};

function getCategoryColor(cat: string) {
  const lower = cat.toLowerCase();
  return categoryColors[lower] || "bg-muted text-muted-foreground";
}

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group"
    >
      <Card className="p-4 bg-card border-border/40 hover:border-primary/30 transition-all duration-200 cursor-grab active:cursor-grabbing hover:glow-purple-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <button {...attributes} {...listeners} className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground shrink-0">
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-sm leading-tight text-foreground truncate">{task.title}</h4>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center flex-wrap gap-1.5 mt-3">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 font-medium border ${priorityColors[task.priority]}`}>
            {task.priority}
          </Badge>
          {task.category && (
            <Badge className={`text-[10px] px-1.5 py-0 h-5 font-medium border-0 ${getCategoryColor(task.category)}`}>
              {task.category}
            </Badge>
          )}
          {task.due_date && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
              <Calendar className="h-3 w-3" />
              {format(new Date(task.due_date), "MMM d")}
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
