import { useState, useEffect, useRef, useCallback } from 'react';
import { taskTimers } from './TaskProgressManager';
import { parseTimeToMinutes } from '@/utils/timeUtils';
import { playClickSound } from '@/utils/soundUtils';

interface BlockStackingProgressProps {
  progress: number; // 0-100
  isPaused: boolean;
  isOvertime: boolean;
  isActiveCommitted: boolean;
  taskTitle?: string;
  estimatedTime?: string;
  pausedStartTime?: number | null; // Timestamp when pause started
  taskId: string;
}

export const BlockStackingProgress = ({ progress, isPaused, isOvertime, isActiveCommitted, taskTitle, estimatedTime, pausedStartTime, taskId }: BlockStackingProgressProps) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const BLOCK_SIZE = 6;
  const CHARACTER_SIZE = 12;
  const CONTAINER_HEIGHT = 32; // Increased height for taller towers
  const GROUND_HEIGHT = 44; // Much higher ground area for text
  
  // Update timer for progress calculation
  useEffect(() => {
    if (isActiveCommitted && !isPaused) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isActiveCommitted, isPaused]);

  // Update timer for paused display
  useEffect(() => {
    if (isPaused && pausedStartTime) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isPaused, pausedStartTime]);
  
  // Calculate progress using timer state (same as card view)
  const calculateProgress = () => {
    if (!estimatedTime) return 0;
    
    const timerState = taskTimers.get(taskId);
    if (!timerState) return 0;
    
    const estimatedMinutes = parseTimeToMinutes(estimatedTime);
    if (!estimatedMinutes) return 0;
    
    const estimatedSeconds = estimatedMinutes * 60;
    
    // Calculate session elapsed time (same logic as ProgressBar)
    const sessionElapsedMs = timerState.currentSessionStart 
      ? (timerState.baseElapsedMs - timerState.sessionStartElapsedMs) + (currentTime - timerState.currentSessionStart)
      : (timerState.baseElapsedMs - timerState.sessionStartElapsedMs);
      
    const sessionElapsedSeconds = sessionElapsedMs / 1000;
    
    // Calculate progress percentage (capped at 100%)
    return Math.min((sessionElapsedSeconds / estimatedSeconds) * 100, 100);
  };
  
  const calculatedProgress = calculateProgress();
  
  // Calculate blocks configuration based on available space
  const MAX_BLOCKS_PER_COLUMN = 4; // Taller towers that feel more substantial
  const TOWER_START_X = 40;
  const TOWER_END_X = 220; // Stop before timer container
  const TOWER_SPACING = BLOCK_SIZE; // No gaps between columns
  const MAX_TOWERS = Math.floor((TOWER_END_X - TOWER_START_X) / TOWER_SPACING); // ~18 towers
  const TOTAL_BLOCKS = MAX_TOWERS * MAX_BLOCKS_PER_COLUMN; // Fill entire available space
  const blocksToShow = Math.floor((Math.max(0, calculatedProgress) / 100) * TOTAL_BLOCKS);
  
  const taskMinutes = parseTimeToMinutes(estimatedTime || '30min');
  
  // Character speed logic - use constant slower speed for ultra-compact view
  const workSpeed = 0.6; // Fixed slower speed for consistency
  
  // Character state
  const [characterX, setCharacterX] = useState(20);
  const [characterState, setCharacterState] = useState<'walking' | 'carrying'>('walking');
  const [walkFrame, setWalkFrame] = useState(0);
  const [placedBlocks, setPlacedBlocks] = useState<Array<{ height: number; isNew?: boolean; isGhosted?: boolean }>>([]);
  const [blockBeingCarried, setBlockBeingCarried] = useState(false);
  const [characterDirection, setCharacterDirection] = useState<'left' | 'right'>('right');
  const [blockSupplyPile, setBlockSupplyPile] = useState<Array<{ id: number; isShifting?: boolean; isNew?: boolean }>>([]);
  const blockIdCounter = useRef(Math.floor(Math.random() * 10000)); // Unique starting point for each component
  
  // Track which columns have been "activated" by character placement
  const [activatedColumns, setActivatedColumns] = useState(new Set<number>());
  
  const lastBlockCountRef = useRef(0);
  
  // Block color (same as card view)
  const getBlockColor = () => {
    if (!isActiveCommitted) return '#9ca3af'; // Gray when not actively playing
    if (isPaused) return '#fbbf24';
    const estimatedMinutes = parseTimeToMinutes(estimatedTime || '');
    const currentProgress = calculateProgress();
    const isOvertime = estimatedMinutes > 0 && (currentProgress > 100);
    if (isOvertime) return '#f59e0b';
    return '#fbbf24';
  };
  
  // Block placement - activates all available ghost columns at once
  const addBlock = useCallback(() => {
    // Play click sound when block is placed
    playClickSound();
    
    // Check if there are any ghost blocks to activate
    const currentBlockCount = blocksToShow;
    const totalActivatedBlocks = Array.from(activatedColumns).reduce((sum, colIndex) => {
      const column = placedBlocks[colIndex];
      return sum + (column ? column.height : 0);
    }, 0);
    
    // Only activate if there are ghost blocks waiting
    if (totalActivatedBlocks < currentBlockCount) {
      // Activate ALL inactive columns that exist
      setActivatedColumns(activated => {
        const newActivated = new Set(activated);
        for (let i = 0; i < placedBlocks.length; i++) {
          if (!activated.has(i)) {
            newActivated.add(i);
          }
        }
        return newActivated;
      });
    }
    // If no ghost blocks to activate, the placed block just disappears (no tower building)
  }, [blocksToShow, activatedColumns, placedBlocks]);
  
  // Simplified character movement - continuous cycle
  useEffect(() => {
    if (isPaused || !isActiveCommitted) return;
    
    // Check if task is 100% complete (not just current towers)
    const allTowersComplete = calculatedProgress >= 100;
    
    if (allTowersComplete) {
      // Walk character back to starting position when complete
      const startPosition = 20; // Starting position
      if (Math.abs(characterX - startPosition) > 5) {
        const moveCharacterToStart = () => {
          setCharacterX(prev => {
            // Walk to start position
            if (prev > startPosition) {
              setCharacterDirection('left');
              setCharacterState('walking');
              return Math.max(startPosition, prev - workSpeed);
            } else {
              setCharacterDirection('right');
              setCharacterState('walking');
              return Math.min(startPosition, prev + workSpeed);
            }
          });
        };
        
        // Use same framerate as normal movement
        const interval = setInterval(moveCharacterToStart, 33);
        return () => clearInterval(interval);
      } else {
        // Character reached start position - keep walking animation
        setCharacterState('walking');
      }
      return;
    }
    
    const moveCharacter = () => {
      setCharacterX(prev => {
        const pickupX = 290; // Mine entrance location
        const currentTowerIndex = Math.max(0, placedBlocks.length - 1);
        const currentTowerX = TOWER_START_X + currentTowerIndex * TOWER_SPACING;
        
        if (blockBeingCarried) {
          setCharacterDirection('left');
          setCharacterState('carrying');
          // Move to current tower position
          return Math.max(currentTowerX, prev - workSpeed);
        } else {
          setCharacterDirection('right');
          setCharacterState('walking');
          // Always walk to pickup position
          return Math.min(pickupX, prev + workSpeed);
        }
      });
    };
    
    const interval = setInterval(moveCharacter, 33); // ~30fps
    return () => clearInterval(interval);
  }, [isPaused, isActiveCommitted, blockBeingCarried, placedBlocks.length, workSpeed, calculatedProgress, characterX]);
  
  // Keep towers in sync with real progress - this is the key progress indicator
  useEffect(() => {
    const currentBlockCount = blocksToShow;
    const totalPlacedBlocks = placedBlocks.reduce((sum, col) => sum + col.height, 0);
    
    // If real progress is ahead of placed blocks, catch up the towers
    if (currentBlockCount > totalPlacedBlocks) {
      const columns: Array<{ height: number; isNew?: boolean; isGhosted?: boolean }> = [];
      let remainingBlocks = currentBlockCount;
      
      while (remainingBlocks > 0) {
        const columnHeight = Math.min(remainingBlocks, MAX_BLOCKS_PER_COLUMN);
        columns.push({ height: columnHeight, isGhosted: true }); // Mark auto-loaded blocks as ghosted
        remainingBlocks -= columnHeight;
      }
      
      setPlacedBlocks(columns);
    }
    
    lastBlockCountRef.current = currentBlockCount;
  }, [blocksToShow, MAX_BLOCKS_PER_COLUMN]);

  // Initialize blocks based on current progress (for when switching views)
  useEffect(() => {
    // Reset block counter to ensure unique IDs per task
    blockIdCounter.current = Math.floor(Math.random() * 10000) + parseInt((taskId || '').slice(-3) || '0', 10) * 100;
    
    // Reset character state for each task
    setCharacterX(20);
    setCharacterState('walking');
    setWalkFrame(0);
    setBlockBeingCarried(false);
    setCharacterDirection('right');
    
    const columns: Array<{ height: number; isNew?: boolean; isGhosted?: boolean }> = [];
    let remainingBlocks = blocksToShow;
    
    while (remainingBlocks > 0) {
      const columnHeight = Math.min(remainingBlocks, MAX_BLOCKS_PER_COLUMN);
      columns.push({ height: columnHeight, isGhosted: false }); // Start with full opacity, not ghosted
      remainingBlocks -= columnHeight;
    }
    
    setPlacedBlocks(columns);
    lastBlockCountRef.current = blocksToShow;
    
    // Initialize all existing columns as activated so they appear at full opacity
    if (columns.length > 0) {
      const initialActivated = new Set<number>();
      for (let i = 0; i < columns.length; i++) {
        initialActivated.add(i);
      }
      setActivatedColumns(initialActivated);
    }
    
    // Initialize block supply pile
    const initialSupply = [];
    if (calculatedProgress < 100) {
      for (let i = 0; i < 1; i++) { // Reduced to just 1 block
        initialSupply.push({ id: blockIdCounter.current++ });
      }
    }
    setBlockSupplyPile(initialSupply);
  }, [taskId]); // Re-initialize when taskId changes to ensure proper isolation
  
  // Block pickup logic (same as card view)
  useEffect(() => {
    if (characterX >= 285 && !blockBeingCarried && blockSupplyPile.length > 0) {
      setBlockBeingCarried(true);
      
      // Remove the front block
      setBlockSupplyPile(prev => {
        if (prev.length === 0) return prev;
        return prev.slice(1);
      });
    }
  }, [characterX, blockBeingCarried, blockSupplyPile.length]);

  // Block placement logic (same as card view)
  const hasPlacedBlock = useRef(false);
  const placementTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const currentTowerIndex = Math.max(0, placedBlocks.length - 1);
    const currentTowerX = TOWER_START_X + currentTowerIndex * TOWER_SPACING;
    
    if (characterX <= currentTowerX + 10 && blockBeingCarried && !hasPlacedBlock.current) {
      hasPlacedBlock.current = true;
      
      placementTimeoutRef.current = setTimeout(() => {
        // Always place block (will activate ghost blocks if available, otherwise disappears)
        addBlock();
        setBlockBeingCarried(false);
        hasPlacedBlock.current = false;
        placementTimeoutRef.current = null;
      }, 100);
    }
  }, [characterX, blockBeingCarried, addBlock, placedBlocks]);
  
  // Cleanup placement timeout on unmount
  useEffect(() => {
    return () => {
      if (placementTimeoutRef.current) {
        clearTimeout(placementTimeoutRef.current);
      }
    };
  }, []);

  // Always maintain block supply for continuous animation
  useEffect(() => {
    if (!isActiveCommitted) return;
    
    // Check if task is 100% complete (not just current towers)
    const allTowersComplete = calculatedProgress >= 100;
    
    if (allTowersComplete) {
      // Clear supply pile when all towers are complete
      setBlockSupplyPile([]);
      setBlockBeingCarried(false);
      return;
    }
    
    if (blockSupplyPile.length < 1) { // Always keep 1 block ready
      const newBlock = { id: blockIdCounter.current++, isNew: true };
      setBlockSupplyPile([newBlock]);
      
      // Clear new flag after animation
      setTimeout(() => {
        setBlockSupplyPile(current => 
          current.map(block => ({ ...block, isNew: false }))
        );
      }, 400);
    }
  }, [isActiveCommitted, blockSupplyPile.length, calculatedProgress]);
  
  // Walk animation - always active when not paused and committed
  useEffect(() => {
    if (!isPaused && isActiveCommitted) {
      const interval = setInterval(() => {
        setWalkFrame(prev => (prev + 1) % 2);
      }, 200);
      return () => clearInterval(interval);
    }
  }, [isPaused, isActiveCommitted]);
  
  
  return (
    <div 
      className="absolute bottom-0 left-0 right-0" 
      style={{ 
        height: `${CONTAINER_HEIGHT}px`,
        pointerEvents: 'none',
        zIndex: 20
      }}
    >
      {/* Pause overlay - covers entire card area */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: `-${GROUND_HEIGHT + 46}px`, // Extend up to cover entire card (90px card - 44px ground = 46px)
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(2px)',
          opacity: isPaused ? 1 : 0,
          transition: 'opacity 0.5s ease-in-out, backdrop-filter 0.5s ease-in-out',
          zIndex: 5 // Lower than text (zIndex 10) but covers the animation
        }}
      />
      {/* Ground line with mine step */}
      <div 
        className="absolute bottom-0 left-0 right-0" 
        style={{ 
          height: `${GROUND_HEIGHT}px`,
          background: 'rgb(255, 255, 247)', // Match main task card background
          opacity: 1, // Ensure full opacity
          clipPath: 'polygon(0% 0%, 65% 0%, 80% 50%, 100% 50%, 100% 100%, 0% 100%)'
        }}
      />
      {/* Ground outline - slightly larger element with same clipPath to create stroke effect */}
      <div 
        className="absolute left-0 right-0" 
        style={{ 
          bottom: '-1px',
          height: `${GROUND_HEIGHT + 2}px`,
          background: 'rgba(0, 0, 0, 0.1)', // Light gray
          clipPath: 'polygon(0% 0%, 65% 0%, 80% 50%, 100% 50%, 100% 100%, 0% 100%)',
          zIndex: 2 // Below the main ground
        }}
      />
      {/* Mine area (stepped down) - temporarily hidden to debug overlay */}
      <div 
        className="absolute" 
        style={{ 
          bottom: '0px',
          right: '4px', // Inset from edge
          height: `${GROUND_HEIGHT + 8}px`,
          width: '50px', // Smaller width
          background: 'rgba(0, 0, 0, 0.15)',
          borderLeft: '1px solid rgba(0, 0, 0, 0.2)',
          zIndex: 1,
          display: 'none' // Temporarily hide to see if this is causing overlay
        }}
      />
      
      {/* Progress outline - shows where task will finish */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: `${GROUND_HEIGHT}px`,
          left: `${TOWER_START_X}px`,
          width: `${TOWER_END_X - TOWER_START_X}px`,
          height: `${MAX_BLOCKS_PER_COLUMN * BLOCK_SIZE}px`,
          border: '1px dashed rgba(0, 0, 0, 0.2)',
          borderRadius: '2px',
          background: 'transparent', // Remove overlay background
          zIndex: 2
        }}
      />

      {/* Placed blocks */}
      {placedBlocks.map((column, colIndex) => {
        const leftPosition = TOWER_START_X + colIndex * TOWER_SPACING;
        // Don't render towers that would overlap with timer container
        if (leftPosition > TOWER_END_X) return null;
        
        const isColumnActivated = activatedColumns.has(colIndex);
        const isGhosted = column.isGhosted && !isColumnActivated;
        
        return (
        <div key={colIndex} className="absolute bottom-0" style={{ left: `${leftPosition}px` }}>
          {Array.from({ length: column.height }).map((_, blockIndex) => {
            const isTopBlock = blockIndex === column.height - 1;
            const isNewBlock = isTopBlock && column.isNew;
            
            return (
              <div
                key={blockIndex}
                className="absolute"
                style={{
                  bottom: `${GROUND_HEIGHT + blockIndex * BLOCK_SIZE}px`,
                  left: 0,
                  width: `${BLOCK_SIZE}px`,
                  height: `${BLOCK_SIZE}px`,
                  background: getBlockColor(),
                  borderTop: isTopBlock ? '1px solid rgba(0, 0, 0, 0.2)' : 'none',
                  borderLeft: isTopBlock ? '1px solid rgba(0, 0, 0, 0.2)' : 'none',
                  borderRight: isTopBlock ? '1px solid rgba(0, 0, 0, 0.2)' : 'none',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                  boxShadow: isTopBlock ? '0 1px 2px rgba(0, 0, 0, 0.1)' : 'none',
                  opacity: isGhosted ? 0.3 : 1, // Ghost blocks are transparent
                  transform: isNewBlock ? 'scale(0)' : 'scale(1)',
                  transition: 'transform 0.3s ease-out, opacity 0.3s ease-out, all 0.2s ease-out'
                }}
              />
            );
          })}
        </div>
        );
      })}
      
      {/* Block supply pile in mine */}
      {blockSupplyPile.map((block, index) => {
        let transform = 'translateX(0px)';
        
        if (block.isNew) {
          // New block slides in from deep in the mine to the back position
          transform = 'translateX(40px)';
        }
        
        return (
          <div
            key={block.id}
            className="absolute"
            style={{
              bottom: `${GROUND_HEIGHT * 0.5}px`, // In the stepped-down mine area
              right: `${30 + (index * 8)}px`, // Position based on index - blocks automatically move forward
              width: `${BLOCK_SIZE}px`,
              height: `${BLOCK_SIZE}px`,
              background: getBlockColor(),
              border: '1px solid rgba(0, 0, 0, 0.2)',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
              opacity: block.isNew ? 0.6 : 0.8, // Slightly transparent when sliding in
              transform: transform,
              transition: isPaused 
                ? 'transform 0.6s ease-in-out, opacity 0.6s ease-in-out, right 0.5s ease-in-out'
                : 'transform 0.4s ease-out, opacity 0.4s ease-out, right 0.3s ease-out',
              zIndex: 4 - index // Front blocks appear on top, but under pause overlay (z-index 5)
            }}
          />
        );
      })}

      {/* Character */}
      <div 
        className="absolute"
        style={{
          bottom: characterX >= 240 ? `${GROUND_HEIGHT - 18}px` : `${GROUND_HEIGHT}px`, // Lower when in mine
          left: `${characterX}px`,
          width: `${CHARACTER_SIZE}px`,
          height: `${CHARACTER_SIZE}px`,
          transition: isPaused 
            ? 'left 0.8s ease-out, bottom 0.8s ease-out, transform 0.8s ease-out, opacity 0.5s ease-in-out' 
            : 'left 0.1s linear, bottom 0.2s ease-out, transform 0.2s ease-out, opacity 0.3s ease-in-out',
          transform: characterDirection === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
          opacity: isPaused ? 0.6 : 1.0,
          zIndex: 6 // Above pause overlay (z-index 5) so character is visible but dimmed
        }}
      >
        {/* Simple pixel character */}
        <svg viewBox="0 0 12 12" width={CHARACTER_SIZE} height={CHARACTER_SIZE}>
          {/* Head */}
          <rect x="4" y="1" width="4" height="3" fill="#4a5568" rx="0.5" />
          {/* Eyes */}
          <rect x="5" y="2" width="1" height="1" fill="#fff" />
          <rect x="6" y="2" width="1" height="1" fill="#fff" />
          {/* Body */}
          <rect x="4" y="4" width="4" height="4" fill="#718096" />
          {/* Arms */}
          <rect 
            x={characterState === 'carrying' ? "8" : "2"} 
            y="5" 
            width="2" 
            height="2" 
            fill="#718096"
          />
          <rect 
            x={characterState === 'carrying' ? "2" : "8"} 
            y="5" 
            width="2" 
            height="2" 
            fill="#718096"
          />
          {/* Legs - always animate when active */}
          <rect 
            x="4" 
            y="8" 
            width="2" 
            height={walkFrame === 0 ? "3" : "2"} 
            fill="#4a5568"
          />
          <rect 
            x="6" 
            y="8" 
            width="2" 
            height={walkFrame === 1 ? "3" : "2"} 
            fill="#4a5568"
          />
        </svg>
        {/* Block being carried (same as card view) */}
        {blockBeingCarried && (
          <div
            className="absolute"
            style={{
              top: '-3px',
              left: characterDirection === 'right' ? '8px' : '-2px',
              width: `${BLOCK_SIZE}px`,
              height: `${BLOCK_SIZE}px`,
              background: getBlockColor(),
              border: '1px solid rgba(0, 0, 0, 0.2)',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
              opacity: isPaused ? 0.6 : 1.0,
              transition: isPaused 
                ? 'top 0.6s ease-in-out, opacity 0.5s ease-in-out, transform 0.6s ease-in-out'
                : 'top 0.2s ease-out, opacity 0.3s ease-in-out, transform 0.2s ease-out',
              transform: characterDirection === 'left' ? 'scaleX(-1)' : 'scaleX(1)'
            }}
          />
        )}
      </div>
      
      {/* Scrolling task title in ground area */}
      {taskTitle && (
        <div 
          className="absolute bottom-0 left-0 flex items-center pl-6 pr-4 pb-1"
          style={{ 
            height: `${GROUND_HEIGHT}px`,
            width: '260px', // Shorter container width
            zIndex: 10 // Above the pause overlay
          }}
        >
          {(() => {
            const displayText = isPaused ? (() => {
              if (!pausedStartTime) return 'Paused';
              const pausedDuration = Math.max(0, Math.floor((currentTime - pausedStartTime) / 1000));
              const minutes = Math.floor(pausedDuration / 60);
              const seconds = pausedDuration % 60;
              return `Paused for ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            })() : taskTitle;
            
            // Only scroll if text is longer than ~25 characters (fits in 260px container)
            const shouldScroll = displayText.length > 25;
            
            if (shouldScroll) {
              return (
                <div 
                  className="overflow-hidden whitespace-nowrap"
                  style={{
                    maskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)'
                  }}
                >
                  <div className="inline-flex">
                    <span 
                      className="inline-block font-semibold text-base animate-scroll-text" 
                      style={{ 
                        color: isPaused ? '#FFFFFF' : '#7C7C7C', // Ultra-compact view text color
                        animationDuration: `${Math.max(15, displayText.length * 0.6)}s`
                      }}
                    >
                      {displayText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{displayText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    </span>
                  </div>
                </div>
              );
            } else {
              return (
                <span 
                  className="font-semibold text-base" 
                  style={{ 
                    color: isPaused ? '#FFFFFF' : '#7C7C7C' // Ultra-compact view text color
                  }}
                >
                  {displayText}
                </span>
              );
            }
          })()}
          
        </div>
      )}
      
    </div>
  );
};