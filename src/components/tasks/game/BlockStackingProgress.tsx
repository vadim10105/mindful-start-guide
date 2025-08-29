import { useState, useEffect, useRef, useCallback } from 'react';

interface BlockStackingProgressProps {
  progress: number; // 0-100
  isPaused: boolean;
  isOvertime: boolean;
  taskTitle?: string;
  estimatedTime?: string;
  pausedStartTime?: number | null; // Timestamp when pause started
}

export const BlockStackingProgress = ({ progress, isPaused, isOvertime, taskTitle, estimatedTime, pausedStartTime }: BlockStackingProgressProps) => {
  const BLOCK_SIZE = 6;
  const CHARACTER_SIZE = 12;
  const CONTAINER_HEIGHT = 32; // Increased height for taller towers
  const GROUND_HEIGHT = 44; // Much higher ground area for text
  
  // Calculate blocks configuration based on available space
  const MAX_BLOCKS_PER_COLUMN = 4; // Taller towers that feel more substantial
  const TOWER_START_X = 40;
  const TOWER_END_X = 220; // Stop before timer container
  const TOWER_SPACING = BLOCK_SIZE; // No gaps between columns
  const MAX_TOWERS = Math.floor((TOWER_END_X - TOWER_START_X) / TOWER_SPACING); // ~18 towers
  const TOTAL_BLOCKS = MAX_TOWERS * MAX_BLOCKS_PER_COLUMN; // Fill entire available space
  const blocksToShow = Math.floor((progress / 100) * TOTAL_BLOCKS);
  
  // Calculate work pace based on task duration
  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 30;
    
    // More flexible regex to catch various formats
    const match = timeStr.match(/(\d+)(?:\s*(?:min|minute|minutes|hrs?|hour|hours?))?/i);
    
    const num = match ? parseInt(match[1]) : 30;
    const isHours = timeStr.toLowerCase().includes('h');
    const result = isHours ? num * 60 : num;
    
    return result;
  };
  
  const taskMinutes = parseTimeToMinutes(estimatedTime || '30min');
  
  // Calculate how fast character must work to keep up with actual progress
  const targetBlocksPerSecond = (TOTAL_BLOCKS * (progress / 100)) / (taskMinutes * 60);
  const roundTripTime = 10; // seconds for full pickup->place->return cycle
  const requiredTripsPerSecond = targetBlocksPerSecond;
  
  // Character speed to complete trips at required rate
  const tripDistance = 520; // pixels round trip
  // Use slower constant speed for short tasks, faster for longer tasks (all at 30fps)
  const workSpeed = taskMinutes <= 5
    ? 0.6 // Constant slower speed for 5 min tasks
    : taskMinutes < 10 
    ? Math.max(0.3, Math.min(2.0, (tripDistance / roundTripTime) / 30)) // Fast pixel speed at 30fps
    : Math.max(0.1, Math.min(0.6, (tripDistance / roundTripTime) / 30));  // Slow pixel speed at 30fps
  
  // Minimize delays when time is short - no time for breaks!
  const urgencyFactor = Math.min(1.0, 5 / taskMinutes); // More urgent for shorter tasks
  const pickupDelay = Math.max(30, 120 * (1 - urgencyFactor)); // Almost instant when urgent
  const placementDelay = Math.max(30, 120 * (1 - urgencyFactor)); // Almost instant when urgent
  
  // Character state
  const [characterX, setCharacterX] = useState(20);
  const [characterState, setCharacterState] = useState<'idle' | 'walking' | 'carrying' | 'placing'>('idle');
  const [walkFrame, setWalkFrame] = useState(0);
  const [placedBlocks, setPlacedBlocks] = useState<Array<{ height: number; isNew?: boolean; isGhosted?: boolean }>>([]);
  const [blockBeingCarried, setBlockBeingCarried] = useState(false);
  const [characterDirection, setCharacterDirection] = useState<'left' | 'right'>('right');
  const [blockSupplyPile, setBlockSupplyPile] = useState<Array<{ id: number; isShifting?: boolean; isNew?: boolean }>>([]);
  const blockIdCounter = useRef(0);
  
  // Track which columns have been "activated" by character placement
  const [activatedColumns, setActivatedColumns] = useState(new Set<number>());
  
  const lastBlockCountRef = useRef(0);
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // Block color based on state
  const getBlockColor = () => {
    if (isPaused) return '#fbbf24';
    if (isOvertime) return '#f59e0b';
    return '#fbbf24';
  };
  
  const addBlock = useCallback(() => {
    setPlacedBlocks(prev => {
      const newColumns = [...prev];
      const lastColumn = newColumns[newColumns.length - 1];
      let currentColumnIndex;
      
      if (!lastColumn || lastColumn.height >= MAX_BLOCKS_PER_COLUMN) {
        newColumns.push({ height: 1, isNew: true });
        currentColumnIndex = newColumns.length - 1;
      } else {
        newColumns[newColumns.length - 1] = { 
          height: lastColumn.height + 1, 
          isNew: true 
        };
        currentColumnIndex = newColumns.length - 1;
      }
      
      // Activate ALL columns up to and including the current one
      setActivatedColumns(activated => {
        const newActivated = new Set(activated);
        for (let i = 0; i <= currentColumnIndex; i++) {
          newActivated.add(i);
        }
        return newActivated;
      });
      
      // Clear isNew flag after animation
      setTimeout(() => {
        setPlacedBlocks(cols => cols.map(col => ({ ...col, isNew: false })));
      }, 300);
      
      return newColumns;
    });
  }, [MAX_BLOCKS_PER_COLUMN]);
  
  // Continuous character movement - always slowly walking
  useEffect(() => {
    if (isPaused) return; // Stop movement when paused
    
    if (progress >= 100) {
      // Task complete - character should return to default position
      const defaultPosition = 20; // Starting position
      
      if (blockBeingCarried) {
        // Still carrying a block, finish placing it first
        setCharacterDirection('left');
        setCharacterState('carrying');
        const currentTowerIndex = Math.max(0, placedBlocks.length - 1);
        const currentTowerX = TOWER_START_X + currentTowerIndex * TOWER_SPACING;
        setCharacterX(prev => Math.max(currentTowerX, prev - workSpeed));
      } else if (characterX > defaultPosition) {
        // No block being carried, return to default position
        setCharacterDirection('left');
        setCharacterState('walking');
        setCharacterX(prev => Math.max(defaultPosition, prev - workSpeed));
      } else {
        // At default position, go idle
        setCharacterState('idle');
      }
      return; // Skip normal movement logic when task complete
    }
    
    const moveCharacter = () => {
      setCharacterX(prev => {
        const pickupX = 290; // Mine entrance location
        const placementX = 40; // Left side placement area
        
        // Character speed adapts to task urgency
        const speed = workSpeed;
        
        // If carrying a block, move towards current building location
        if (blockBeingCarried) {
          setCharacterDirection('left');
          setCharacterState('carrying');
          // Calculate position of the current/most recent tower
          const currentTowerIndex = Math.max(0, placedBlocks.length - 1);
          const currentTowerX = TOWER_START_X + currentTowerIndex * TOWER_SPACING;
          return Math.max(currentTowerX, prev - speed); // Stop at current tower, not beginning
        } else if (blockSupplyPile.length > 0) {
          // Not carrying and blocks are available, move towards pickup
          setCharacterDirection('right');
          setCharacterState('walking');
          return Math.min(pickupX, prev + speed);
        } else {
          // No block available, wait at current position
          setCharacterState('idle');
          return prev;
        }
      });
    };
    
    // Start continuous movement at 30fps
    const interval = setInterval(moveCharacter, 33); // ~30fps
    return () => clearInterval(interval);
  }, [isPaused, blockBeingCarried, blockSupplyPile.length]);
  
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

  // Initialize placed blocks on mount only
  useEffect(() => {
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
    
    // Initialize block supply pile with 2 blocks only if task is not completed
    const initialSupply = [];
    if (progress < 100) {
      for (let i = 0; i < 2; i++) { // Reduced from 4 to 2
        initialSupply.push({ id: blockIdCounter.current++ });
      }
    }
    setBlockSupplyPile(initialSupply);
  }, []); // Only on mount
  
  // Handle block pickup when character reaches pickup area
  useEffect(() => {
    // If character reaches mine entrance and there are blocks waiting
    if (characterX >= 285 && !blockBeingCarried && blockSupplyPile.length > 0) {
      setBlockBeingCarried(true);
      
      // Remove the front block, others automatically move to new positions
      setBlockSupplyPile(prev => {
        if (prev.length === 0) return prev;
        
        // Simply remove the first block - remaining blocks will automatically 
        // be at new indices (positions) in the array
        return prev.slice(1);
      });
    }
  }, [characterX, blockBeingCarried, blockSupplyPile.length]);

  // Handle block placement when character reaches placement area  
  const hasPlacedBlock = useRef(false);
  
  useEffect(() => {
    // If character reaches current tower location while carrying a block
    const currentTowerIndex = Math.max(0, placedBlocks.length - 1);
    const currentTowerX = TOWER_START_X + currentTowerIndex * TOWER_SPACING;
    
    if (characterX <= currentTowerX + 10 && blockBeingCarried && !hasPlacedBlock.current) {
      hasPlacedBlock.current = true;
      
      // Calculate rest time based on task duration
      const taskMinutes = parseTimeToMinutes(estimatedTime || '30min');
      let restTimeMs = 0;
      if (taskMinutes <= 5) {
        restTimeMs = 1000; // 1 second rest for very short tasks
      } else if (taskMinutes > 10) {
        // For longer tasks, add wait time to stretch completion to match estimated time
        const totalTripsNeeded = TOTAL_BLOCKS / 1; // 1 block per trip
        const availableTimeSeconds = taskMinutes * 60;
        const desiredTripTime = availableTimeSeconds / totalTripsNeeded;
        const baseTripTime = 17; // ~17 seconds base trip time (adjusted for slower walking)
        const extraWaitTime = Math.max(0, desiredTripTime - baseTripTime);
        restTimeMs = extraWaitTime * 1000; // Convert to milliseconds
      }
      // 5-10 minute tasks use no extra rest (natural pace works well)
      
      setTimeout(() => {
        // Add block to towers immediately for visual feedback
        addBlock();
        setBlockBeingCarried(false);
        hasPlacedBlock.current = false;
      }, placementDelay + restTimeMs);
    }
  }, [characterX, blockBeingCarried, addBlock]);

  // Keep supply pile stocked for character animation (simplified)
  useEffect(() => {
    if (progress >= 100) {
      // Task complete - clear all supply blocks and stop character
      setBlockSupplyPile([]);
      setBlockBeingCarried(false);
      setCharacterState('idle');
    } else {
      // Always keep some blocks in supply if progress isn't complete
      setBlockSupplyPile(prev => {
        if (prev.length < 1) { // Keep at least 1 block
          const newPile = [...prev];
          while (newPile.length < 2) { // Fill up to 2 (reduced from 4)
            newPile.push({ id: blockIdCounter.current++, isNew: true });
          }
          
          // Clear new flags after animation
          setTimeout(() => {
            setBlockSupplyPile(current => 
              current.map(block => ({ ...block, isNew: false }))
            );
          }, 400);
          
          return newPile;
        }
        return prev;
      });
    }
  }, [progress]); // Update based on real progress
  
  // Walk animation
  useEffect(() => {
    if ((characterState === 'walking' || characterState === 'carrying') && !isPaused) {
      const interval = setInterval(() => {
        setWalkFrame(prev => (prev + 1) % 2);
      }, 200);
      return () => clearInterval(interval);
    }
  }, [characterState, isPaused]);
  
  // Update current time every second for pause timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
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
                  border: isTopBlock ? '1px solid rgba(0, 0, 0, 0.2)' : 'none',
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
            x={characterState === 'carrying' || characterState === 'placing' ? "8" : "2"} 
            y="5" 
            width="2" 
            height="2" 
            fill="#718096"
          />
          <rect 
            x={characterState === 'carrying' || characterState === 'placing' ? "2" : "8"} 
            y="5" 
            width="2" 
            height="2" 
            fill="#718096"
          />
          {/* Legs - animate for walking and carrying */}
          <rect 
            x="4" 
            y="8" 
            width="2" 
            height={(characterState === 'walking' || characterState === 'carrying') && walkFrame === 0 ? "3" : "2"} 
            fill="#4a5568"
          />
          <rect 
            x="6" 
            y="8" 
            width="2" 
            height={(characterState === 'walking' || characterState === 'carrying') && walkFrame === 1 ? "3" : "2"} 
            fill="#4a5568"
          />
        </svg>
        {/* Block being carried - separate from character for better animation */}
        {blockBeingCarried && (
          <div
            className="absolute"
            style={{
              top: characterState === 'placing' ? '-1px' : '-3px',
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