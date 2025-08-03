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
          className="w-3 h-3 rounded-full transition-all duration-300 relative"
        >
          {index === currentViewingIndex ? (
            <>
              <div className="w-3 h-3 rounded-full bg-white/30" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-700/50" />
            </>
          ) : (
            <div className="w-3 h-3 rounded-full bg-white/20" />
          )}
        </div>
      ))}
    </div>
  );
};