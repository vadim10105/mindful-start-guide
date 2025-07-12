
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { TaskCard } from "./TaskCard";
import { NavigationDots } from "./NavigationDots";
import { Swiper, SwiperSlide } from 'swiper/react';
import { useProgress } from "@/hooks/use-progress";

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';

import { Navigation, Pagination, Scrollbar, A11y, EffectFade, Virtual, Mousewheel } from 'swiper/modules';

interface TaskCardData {
  id: string;
  title: string;
  priority_score: number;
  explanation: string;
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
}

interface GameTaskCardsProps {
  tasks: TaskCardData[];
  onComplete: () => void;
  onTaskComplete: (taskId: string) => void;
}

const GameTaskCards = ({ tasks, onComplete, onTaskComplete }: GameTaskCardsProps) => {
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(new Set<string>());
  const [pausedTasks, setPausedTasks] = useState(new Map<string, number>());
  const [committedTaskIndex, setCommittedTaskIndex] = useState<number | null>(null);
  const [hasCommittedToTask, setHasCommittedToTask] = useState(false);
  const [navigationUnlocked, setNavigationUnlocked] = useState(false);
  const [sunsetImageUrl, setSunsetImageUrl] = useState("");
  const [internalTasks, setTasks] = useState(tasks);
  const { user } = useUser();
  const { toast } = useToast();
  const { flowProgress, setFlowProgress, startFlow, pauseFlow, resumeFlow, resetFlow } = useProgress();
  const swiperRef = useRef<any>(null);

  useEffect(() => {
    if (tasks && tasks.length > 0) {
      setTasks(tasks);
    }
  }, [tasks]);

  useEffect(() => {
    if (completedTasks.size === tasks.length && tasks.length > 0) {
      setTimeout(() => {
        onComplete();
      }, 2000);
    }
  }, [completedTasks, tasks, onComplete]);

  useEffect(() => {
    const fetchSunset = async () => {
      const randomNum = Math.floor(Math.random() * 1000);
      setSunsetImageUrl(`https://source.unsplash.com/640x480/?sunset&sig=${randomNum}`);
    };
    fetchSunset();
  }, []);

  const formatTime = (minutes: number) => {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCommit = () => {
    if (currentTaskIndex !== null) {
      setCommittedTaskIndex(currentTaskIndex);
      setHasCommittedToTask(true);
      setNavigationUnlocked(false);
      startFlow();
    }
  };

  const completeTask = async (taskId: string) => {
    setCompletedTasks(prev => new Set(prev).add(taskId));
    setHasCommittedToTask(false);
    setNavigationUnlocked(true);
    setFlowProgress(100);
    resetFlow();
    onTaskComplete(taskId);

    setTimeout(() => {
      moveToNextTask();
    }, 2000);
  };

  const moveOnFromTask = (taskId: string) => {
    pauseFlow();
    setPausedTasks(prev => {
      const newPausedTasks = new Map(prev);
      newPausedTasks.set(taskId, flowProgress);
      return newPausedTasks;
    });
    setHasCommittedToTask(false);
    setNavigationUnlocked(true);
  };

  const carryOnTask = (taskId: string) => {
    resumeFlow();
    setPausedTasks(prev => {
      const newPausedTasks = new Map(prev);
      newPausedTasks.delete(taskId);
      return newPausedTasks;
    });
    setHasCommittedToTask(true);
    setNavigationUnlocked(false);
  };

  const skipTask = (taskId: string) => {
    setHasCommittedToTask(false);
    setNavigationUnlocked(true);
    resetFlow();
    moveToNextTask();
  };

  const goBackToActive = () => {
    if (committedTaskIndex !== null) {
      setCurrentTaskIndex(committedTaskIndex);
      setNavigationUnlocked(false);
    }
  };

  const addToCollection = () => {
    toast({
      title: "Added to Collection!",
      description: "This sunset has been added to your collection.",
    });
  };

  const moveToNextTask = () => {
    if (swiperRef.current && currentTaskIndex < tasks.length - 1) {
      swiperRef.current.swiper.slideNext();
    }
  };

  const handleSwipeToTask = (index: number) => {
    setCurrentTaskIndex(index);
  };

  const archiveTask = async (taskId: string) => {
    if (!user) return;

    try {
      // Get the next archive position
      const { data: lastArchived } = await supabase
        .from('tasks')
        .select('archive_position')
        .eq('user_id', user.id)
        .not('archive_position', 'is', null)
        .order('archive_position', { ascending: false })
        .limit(1)
        .single();

      const nextPosition = (lastArchived?.archive_position || 0) + 1;

      const { error } = await supabase
        .from('tasks')
        .update({
          archived_at: new Date().toISOString(),
          archive_position: nextPosition,
          status: 'completed'
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Task Archived",
        description: "Task has been moved to your archive",
      });

      // Remove the task from current view
      setTasks(prev => prev.filter(task => task.id !== taskId));

    } catch (error) {
      console.error('Error archiving task:', error);
      toast({
        title: "Error",
        description: "Failed to archive task",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div
        className="absolute inset-0 bg-[url('/confetti.svg')] bg-center bg-repeat opacity-50 dark:opacity-20 pointer-events-none"
      />
      <div className="absolute inset-0 bg-[url('/grid-lines.svg')] bg-center bg-repeat opacity-50 dark:opacity-20 pointer-events-none" />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-sm h-[500px]">
          <Swiper
            ref={swiperRef}
            spaceBetween={50}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            scrollbar={{ draggable: true }}
            onSlideChange={() => handleSwipeToTask(swiperRef.current.swiper.activeIndex)}
            onSwiper={(swiper) => console.log(swiper)}
            virtual
            mousewheel
            modules={[Navigation, Pagination, Scrollbar, A11y, EffectFade, Virtual, Mousewheel]}
          >
            {internalTasks.map((task, index) => (
              <SwiperSlide key={task.id}>
                <TaskCard
                  task={task}
                  index={index}
                  totalTasks={internalTasks.length}
                  isCompleted={completedTasks.has(task.id)}
                  isPaused={pausedTasks.has(task.id)}
                  pausedTime={pausedTasks.get(task.id) || 0}
                  isActiveCommitted={committedTaskIndex === index}
                  hasCommittedToTask={hasCommittedToTask}
                  isCurrentTask={currentTaskIndex === index}
                  activeCommittedIndex={committedTaskIndex || 0}
                  flowProgress={flowProgress}
                  sunsetImageUrl={sunsetImageUrl}
                  onCommit={handleCommit}
                  onComplete={completeTask}
                  onMoveOn={moveOnFromTask}
                  onCarryOn={carryOnTask}
                  onSkip={skipTask}
                  onBackToActive={goBackToActive}
                  onArchive={archiveTask}
                  onAddToCollection={addToCollection}
                  navigationUnlocked={navigationUnlocked}
                  formatTime={formatTime}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>

      <NavigationDots
        tasks={internalTasks}
        currentViewingIndex={currentTaskIndex}
        activeCommittedIndex={committedTaskIndex || 0}
        hasCommittedToTask={hasCommittedToTask}
        completedTasks={completedTasks}
        pausedTasks={pausedTasks}
      />
    </div>
  );
};

export default GameTaskCards;
