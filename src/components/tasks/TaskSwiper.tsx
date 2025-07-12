
import React, { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { TaskCard } from './TaskCard';
import { TaskCardData } from '@/types';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { useToast } from '@/hooks/use-toast';

import { Pagination, Navigation, Mousewheel, Keyboard } from 'swiper/modules';

interface TaskSwiperProps {
  tasks: TaskCardData[];
  currentIndex: number;
  completedTasks: Set<string>;
  pausedTasks: Map<string, number>;
  committedTaskIndex: number | null;
  hasCommittedToTask: boolean;
  flowProgress: number;
  navigationUnlocked: boolean;
  sunsetImageUrl: string;
  onCommit: () => void;
  onComplete: (taskId: string) => void;
  onMoveOn: (taskId: string) => void;
  onCarryOn: (taskId: string) => void;
  onSkip: (taskId: string) => void;
  onBackToActive: () => void;
  onArchive?: (taskId: string) => void;
  onAddToCollection: () => void;
  onSwipeToTask: (index: number) => void;
  formatTime: (minutes: number) => string;
}

export const TaskSwiper = ({
  tasks,
  currentIndex,
  completedTasks,
  pausedTasks,
  committedTaskIndex,
  hasCommittedToTask,
  flowProgress,
  navigationUnlocked,
  sunsetImageUrl,
  onCommit,
  onComplete,
  onMoveOn,
  onCarryOn,
  onSkip,
  onBackToActive,
  onArchive,
  onAddToCollection,
  onSwipeToTask,
  formatTime
}: TaskSwiperProps) => {
  const swiperRef = useRef<any>(null);
  const { toast } = useToast();

  const handleSwipeToTask = (index: number) => {
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.slideTo(index);
    }
  };

  return (
    <Swiper
      spaceBetween={50}
      slidesPerView={1}
      loop={false}
      mousewheel={true}
      keyboard={{
        enabled: true,
      }}
      pagination={{
        clickable: true,
      }}
      navigation={true}
      modules={[Pagination, Navigation, Mousewheel, Keyboard]}
      className="mySwiper"
      onSlideChange={(swiper) => {
        onSwipeToTask(swiper.activeIndex);
      }}
      ref={swiperRef}
    >
      {tasks.map((task, index) => (
        <SwiperSlide key={task.id}>
          <TaskCard
            task={task}
            index={index}
            totalTasks={tasks.length}
            isCompleted={completedTasks.has(task.id)}
            isPaused={pausedTasks.has(task.id)}
            pausedTime={pausedTasks.get(task.id) || 0}
            isActiveCommitted={committedTaskIndex === index}
            hasCommittedToTask={hasCommittedToTask}
            isCurrentTask={currentIndex === index}
            activeCommittedIndex={committedTaskIndex || 0}
            flowProgress={flowProgress}
            sunsetImageUrl={sunsetImageUrl}
            onCommit={onCommit}
            onComplete={onComplete}
            onMoveOn={onMoveOn}
            onCarryOn={onCarryOn}
            onSkip={onSkip}
            onBackToActive={onBackToActive}
            onArchive={onArchive}
            onAddToCollection={onAddToCollection}
            navigationUnlocked={navigationUnlocked}
            formatTime={formatTime}
          />
        </SwiperSlide>
      ))}
    </Swiper>
  );
};
