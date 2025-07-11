import { forwardRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards } from 'swiper/modules';
import { TaskCard } from './TaskCard';
import 'swiper/css';
import 'swiper/css/effect-cards';

interface TaskCardData {
  id: string;
  title: string;
  priority_score: number;
  explanation: string;
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  ai_effort: 'quick' | 'medium' | 'long';
}

interface TaskSwiperProps {
  tasks: TaskCardData[];
  currentViewingIndex: number;
  activeCommittedIndex: number;
  hasCommittedToTask: boolean;
  completedTasks: Set<string>;
  pausedTasks: Map<string, number>;
  isNavigationLocked: boolean;
  flowProgress: number;
  sunsetImages: string[];
  navigationUnlocked: boolean;
  onSlideChange: (activeIndex: number) => void;
  onCommit: () => void;
  onComplete: (taskId: string) => void;
  onMoveOn: (taskId: string) => void;
  onCarryOn: (taskId: string) => void;
  onSkip: (taskId: string) => void;
  onBackToActive: () => void;
  onShowCompletionModal: () => void;
  onAddToCollection: () => void;
  formatTime: (minutes: number) => string;
}

export const TaskSwiper = forwardRef<any, TaskSwiperProps>(({
  tasks,
  currentViewingIndex,
  activeCommittedIndex,
  hasCommittedToTask,
  completedTasks,
  pausedTasks,
  isNavigationLocked,
  flowProgress,
  sunsetImages,
  navigationUnlocked,
  onSlideChange,
  onCommit,
  onComplete,
  onMoveOn,
  onCarryOn,
  onSkip,
  onBackToActive,
  onShowCompletionModal,
  onAddToCollection,
  formatTime
}, ref) => {
  return (
    <div className="mb-6 flex justify-center">
      <div className="w-80" style={{ aspectRatio: '63/88' }}>
        <Swiper
          ref={ref}
          effect="cards"
          grabCursor={true}
          modules={[EffectCards]}
          cardsEffect={{
            perSlideOffset: 8,
            perSlideRotate: 2,
            rotate: true,
            slideShadows: true,
          }}
          onSlideChange={(swiper) => {
            if (!isNavigationLocked) {
              onSlideChange(swiper.activeIndex);
            }
          }}
          allowSlideNext={!isNavigationLocked}
          allowSlidePrev={!isNavigationLocked}
          key={currentViewingIndex} // Force re-render when index changes
          initialSlide={0} // Always start at 0 since we're re-rendering
          className="w-full h-full"
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
                isActiveCommitted={index === activeCommittedIndex}
                hasCommittedToTask={hasCommittedToTask}
                isCurrentTask={index === currentViewingIndex}
                activeCommittedIndex={activeCommittedIndex}
                flowProgress={flowProgress}
                sunsetImageUrl={sunsetImages[index % sunsetImages.length]}
                onCommit={onCommit}
                onComplete={onComplete}
                onMoveOn={onMoveOn}
                onCarryOn={onCarryOn}
                onSkip={onSkip}
                onBackToActive={onBackToActive}
                onShowCompletionModal={onShowCompletionModal}
                onAddToCollection={onAddToCollection}
                navigationUnlocked={navigationUnlocked}
                formatTime={formatTime}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
});

TaskSwiper.displayName = 'TaskSwiper';