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
  isPiP?: boolean;
}

export const NavigationDots = ({
  tasks,
  currentViewingIndex,
  activeCommittedIndex,
  hasCommittedToTask,
  completedTasks,
  pausedTasks,
  isPiP = false
}: NavigationDotsProps) => {
  return (
    <div className={`flex justify-center ${isPiP ? 'gap-1' : 'gap-2'}`}>
      {tasks.map((task, index) => (
        <div
          key={index}
          className={`${isPiP ? 'w-2 h-2' : 'w-3 h-3'} rounded-full transition-all duration-300 relative`}
        >
          {completedTasks.has(task.id) ? (
            // Completed task - green dot with inner dot if currently viewing
            <>
              <div className={`${isPiP ? 'w-2 h-2' : 'w-3 h-3'} rounded-full bg-green-500/40`} />
              {index === currentViewingIndex && (
                <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${isPiP ? 'w-1 h-1' : 'w-1.5 h-1.5'} rounded-full bg-gray-700/50`} />
              )}
            </>
          ) : index === currentViewingIndex ? (
            // Current viewing task - highlighted
            <>
              <div className={`${isPiP ? 'w-2 h-2' : 'w-3 h-3'} rounded-full bg-white/30`} />
              <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${isPiP ? 'w-1 h-1' : 'w-1.5 h-1.5'} rounded-full bg-gray-700/50`} />
            </>
          ) : (
            // Other tasks - default
            <div className={`${isPiP ? 'w-2 h-2' : 'w-3 h-3'} rounded-full bg-white/20`} />
          )}
        </div>
      ))}
    </div>
  );
};