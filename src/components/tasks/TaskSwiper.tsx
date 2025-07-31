import { forwardRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards } from 'swiper/modules';
import { TaskCard } from './TaskCard';
import 'swiper/css';
import 'swiper/css/effect-cards';
import { RewardCardData } from '@/services/cardService';

interface TaskCardData {
  id: string;
  title: string;
  priority_score: number;
  explanation: string;
  is_liked?: boolean;
  is_urgent?: boolean;
  is_quick?: boolean;
  notes?: string;
  estimated_time?: string;
}

interface TaskSwiperProps {
  tasks: TaskCardData[];
  gameState: any; // All game state in one object
  rewardCards: RewardCardData[];
  onSlideChange: (activeIndex: number) => void;
  onCommit: () => void;
  onComplete: (taskId: string) => void;
  onMadeProgress: (taskId: string) => void;
  onMoveOn: (taskId: string) => void;
  onCarryOn: (taskId: string) => void;
  onSkip: (taskId: string) => void;
  onBackToActive: () => void;
  onAddToCollection: () => void;
  onNotesChange?: (taskId: string, notes: string) => void;
  formatTime: (minutes: number) => string;
}

export const TaskSwiper = forwardRef<any, TaskSwiperProps>(({
  tasks,
  gameState,
  rewardCards,
  onSlideChange,
  onCommit,
  onComplete,
  onMadeProgress,
  onMoveOn,
  onCarryOn,
  onSkip,
  onBackToActive,
  onAddToCollection,
  onNotesChange,
  formatTime
}, ref) => {
  const sunsetImages = rewardCards.map(card => card.imageUrl);
  return (
    <div className="mb-6 flex justify-center">
      <div className="w-[368px]" style={{ aspectRatio: '63/88' }}>
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
            onSlideChange(swiper.activeIndex);
          }}
          allowSlideNext={true}
          allowSlidePrev={true}
          key={gameState.currentViewingIndex} // Force re-render when index changes
          initialSlide={gameState.currentViewingIndex} // Start at the current viewing index
          className="w-full h-full"
        >
          {tasks.map((task, index) => (
            <SwiperSlide key={task.id}>
              <TaskCard
                task={task}
                index={index}
                totalTasks={tasks.length}
                isCompleted={gameState.completedTasks.has(task.id)}
                isPaused={gameState.pausedTasks.has(task.id)}
                pausedTime={gameState.pausedTasks.get(task.id) || 0}
                isActiveCommitted={index === gameState.activeCommittedIndex}
                hasCommittedToTask={gameState.hasCommittedToTask}
                isCurrentTask={index === gameState.currentViewingIndex}
                activeCommittedIndex={gameState.activeCommittedIndex}
                flowProgress={gameState.flowProgress}
                sunsetImageUrl={sunsetImages[index % sunsetImages.length]}
                attribution={rewardCards[index % rewardCards.length]?.attribution}
                attributionUrl={rewardCards[index % rewardCards.length]?.attributionUrl}
                description={rewardCards[index % rewardCards.length]?.description}
                caption={rewardCards[index % rewardCards.length]?.caption}
                cardNumber={rewardCards[index % rewardCards.length]?.cardNumber}
                taskStartTimes={gameState.taskStartTimes}
                onCommit={onCommit}
                onComplete={onComplete}
                onMadeProgress={onMadeProgress}
                onMoveOn={onMoveOn}
                onCarryOn={onCarryOn}
                onSkip={onSkip}
                onBackToActive={onBackToActive}
                onAddToCollection={onAddToCollection}
                onNotesChange={onNotesChange}
                navigationUnlocked={gameState.navigationUnlocked}
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