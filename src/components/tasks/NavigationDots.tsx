interface TaskCardData {
  id: string;
  title: string;
  priority_score: number;
  explanation: string;
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
}

interface NavigationDotsProps {
  tasks: TaskCardData[];
  currentViewingIndex: number;
  activeCommittedIndex: number;
  hasCommittedToTask: boolean;
  completedTasks: Set<string>;
  pausedTasks: Map<string, number>;
}

export const NavigationDots = ({
  tasks,
  currentViewingIndex,
  activeCommittedIndex,
  hasCommittedToTask,
  completedTasks,
  pausedTasks
}: NavigationDotsProps) => {
  return (
    <div className="flex justify-center gap-2 mb-8">
      {tasks.map((task, index) => (
        <div
          key={index}
          className={`w-3 h-3 rounded-full transition-all duration-300 ${
            index === currentViewingIndex
              ? 'bg-primary scale-125'
              : completedTasks.has(task.id)
              ? 'bg-green-500'
              : pausedTasks.has(task.id)
              ? 'bg-amber-500'
              : index === activeCommittedIndex && hasCommittedToTask
              ? 'bg-primary/60 border-2 border-primary'
              : 'bg-muted border-2 border-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
};