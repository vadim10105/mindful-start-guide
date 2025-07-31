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
  nextRewardCard: {
    card: RewardCardData;
    cardId: string;
    cardNumber: number;
    collectionId: string;
  } | null;
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
  nextRewardCard,
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
                sunsetImageUrl={(() => {
                  if (gameState.completedTasks.has(task.id)) {
                    // For completed tasks, use their earned card from todaysCompletedTasks
                    const completedTask = gameState.todaysCompletedTasks.find(t => t.id === task.id);
                    return completedTask?.sunsetImageUrl || "";
                  }
                  // For incomplete tasks, show next reward preview
                  return nextRewardCard?.card.imageUrl || "";
                })()}
                attribution={(() => {
                  if (gameState.completedTasks.has(task.id)) {
                    // For completed tasks, get metadata from their earned card
                    const completedTask = gameState.todaysCompletedTasks.find(t => t.id === task.id);
                    console.log('🔍 Looking for completed task:', task.id, 'found:', completedTask, 'attribution:', completedTask?.attribution);
                    return completedTask?.attribution || "";
                  }
                  // For incomplete tasks, show next reward preview
                  return nextRewardCard?.card.attribution || "";
                })()}
                attributionUrl={(() => {
                  if (gameState.completedTasks.has(task.id)) {
                    const completedTask = gameState.todaysCompletedTasks.find(t => t.id === task.id);
                    return completedTask?.attributionUrl || "";
                  }
                  return nextRewardCard?.card.attributionUrl || "";
                })()}
                description={(() => {
                  if (gameState.completedTasks.has(task.id)) {
                    const completedTask = gameState.todaysCompletedTasks.find(t => t.id === task.id);
                    return completedTask?.description || "";
                  }
                  return nextRewardCard?.card.description || "";
                })()}
                caption={(() => {
                  if (gameState.completedTasks.has(task.id)) {
                    const completedTask = gameState.todaysCompletedTasks.find(t => t.id === task.id);
                    return completedTask?.caption || "";
                  }
                  return nextRewardCard?.card.caption || "";
                })()}
                cardNumber={gameState.completedTasks.has(task.id) ? undefined : nextRewardCard?.card.cardNumber}
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