import { useState, useEffect, useRef, useCallback } from 'react';

interface BlockStackingProgressProps {
  progress: number; // 0-100
  isPaused: boolean;
  isOvertime: boolean;
  taskTitle?: string;
  estimatedTime?: string;
}

export const BlockStackingProgress = ({ progress, isPaused, isOvertime, taskTitle, estimatedTime }: BlockStackingProgressProps) => {
  const BLOCK_SIZE = 6;
  const CHARACTER_SIZE = 12;
  const CONTAINER_HEIGHT = 32; // Increased height for taller towers
  const GROUND_HEIGHT = 44; // Much higher ground area for text
  
  // Calculate blocks configuration based on available space
  const MAX_BLOCKS_PER_COLUMN = 4; // Taller towers that feel more substantial
  const TOWER_START_X = 40;
  const TOWER_END_X = 220; // Stop before timer container
  const TOWER_SPACING = BLOCK_SIZE + 4; // 10px spacing
  const MAX_TOWERS = Math.floor((TOWER_END_X - TOWER_START_X) / TOWER_SPACING); // ~18 towers
  const TOTAL_BLOCKS = MAX_TOWERS * MAX_BLOCKS_PER_COLUMN; // Fill entire available space
  const blocksToShow = Math.floor((progress / 100) * TOTAL_BLOCKS);
  
  // Calculate work pace based on task duration
  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 30;
    const match = timeStr.match(/(\d+)(?:\s*(?:min|minute|minutes|hrs?|hours?))/i);
    const num = match ? parseInt(match[1]) : 30;
    return timeStr.toLowerCase().includes('h') ? num * 60 : num;
  };
  
  const taskMinutes = parseTimeToMinutes(estimatedTime || '30min');
  
  // Calculate how fast character must work to keep up with actual progress
  const targetBlocksPerSecond = (TOTAL_BLOCKS * (progress / 100)) / (taskMinutes * 60);
  const roundTripTime = 10; // seconds for full pickup->place->return cycle
  const requiredTripsPerSecond = targetBlocksPerSecond;
  
  // Character speed to complete trips at required rate
  const tripDistance = 520; // pixels round trip
  const workSpeed = Math.max(0.3, Math.min(2.0, (tripDistance / roundTripTime) / 60)); // pixels per frame
  
  // Minimize delays when time is short - no time for breaks!
  const urgencyFactor = Math.min(1.0, 5 / taskMinutes); // More urgent for shorter tasks
  const pickupDelay = Math.max(50, 200 * (1 - urgencyFactor)); // Almost instant when urgent
  const placementDelay = Math.max(50, 200 * (1 - urgencyFactor)); // Almost instant when urgent
  
  // Character state
  const [characterX, setCharacterX] = useState(20);
  const [characterState, setCharacterState] = useState<'idle' | 'walking' | 'carrying' | 'placing'>('idle');
  const [walkFrame, setWalkFrame] = useState(0);
  const [placedBlocks, setPlacedBlocks] = useState<Array<{ height: number; isNew?: boolean }>>([]);
  const [blockBeingCarried, setBlockBeingCarried] = useState(false);
  const [characterDirection, setCharacterDirection] = useState<'left' | 'right'>('right');
  const [availableBlockAtPickup, setAvailableBlockAtPickup] = useState(true); // Pre-loaded block waiting
  
  const lastBlockCountRef = useRef(0);
  
  // Block color based on state
  const getBlockColor = () => {
    if (isPaused) return '#fbbf24';
    if (isOvertime) return '#f59e0b';
    return '#fbbf24';
  };
  
  const addBlock = useCallback(() => {
    console.log('🧱 AddBlock called');
    setPlacedBlocks(prev => {
      console.log('📊 Current columns:', prev);
      const newColumns = [...prev];
      const lastColumn = newColumns[newColumns.length - 1];
      
      if (!lastColumn || lastColumn.height >= MAX_BLOCKS_PER_COLUMN) {
        // Start new column
        console.log('🏗️ Starting new column');
        newColumns.push({ height: 1, isNew: true });
      } else {
        // Add to existing column
        console.log('⬆️ Adding to existing column');
        newColumns[newColumns.length - 1] = { 
          height: lastColumn.height + 1, 
          isNew: true 
        };
      }
      
      console.log('📊 New columns:', newColumns);
      
      // Clear isNew flag after animation
      setTimeout(() => {
        setPlacedBlocks(cols => cols.map(col => ({ ...col, isNew: false })));
      }, 300);
      
      return newColumns;
    });
  }, [MAX_BLOCKS_PER_COLUMN]);
  
  // Continuous character movement - always slowly walking
  useEffect(() => {
    if (isPaused) return;
    
    const moveCharacter = () => {
      setCharacterX(prev => {
        const pickupX = 320; // Mine entrance location
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
        } else if (availableBlockAtPickup) {
          // Not carrying and block is available, move towards pickup
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
    
    // Start continuous movement at 60fps
    const interval = setInterval(moveCharacter, 16); // ~60fps
    return () => clearInterval(interval);
  }, [isPaused, blockBeingCarried, availableBlockAtPickup]);
  
  // Initialize placed blocks on mount only
  useEffect(() => {
    const columns: Array<{ height: number; isNew?: boolean }> = [];
    let remainingBlocks = blocksToShow;
    
    while (remainingBlocks > 0) {
      const columnHeight = Math.min(remainingBlocks, MAX_BLOCKS_PER_COLUMN);
      columns.push({ height: columnHeight });
      remainingBlocks -= columnHeight;
    }
    
    setPlacedBlocks(columns);
    lastBlockCountRef.current = blocksToShow;
  }, []); // Only on mount
  
  // Handle block pickup when character reaches pickup area
  useEffect(() => {
    // If character reaches mine entrance and there's a block waiting
    if (characterX >= 315 && !blockBeingCarried && availableBlockAtPickup) {
      setBlockBeingCarried(true);
      setAvailableBlockAtPickup(false); // Block is now taken
    }
  }, [characterX, blockBeingCarried, availableBlockAtPickup]);

  // Handle block placement when character reaches placement area  
  const hasPlacedBlock = useRef(false);
  
  useEffect(() => {
    // If character reaches current tower location while carrying a block
    const currentTowerIndex = Math.max(0, placedBlocks.length - 1);
    const currentTowerX = TOWER_START_X + currentTowerIndex * TOWER_SPACING;
    
    if (characterX <= currentTowerX + 10 && blockBeingCarried && !hasPlacedBlock.current) {
      hasPlacedBlock.current = true;
      setTimeout(() => {
        // Add block to towers immediately for visual feedback
        addBlock();
        setBlockBeingCarried(false);
        hasPlacedBlock.current = false;
      }, placementDelay); // Adaptive placement timing
    }
  }, [characterX, blockBeingCarried, addBlock]);

  // Generate new block at pickup when progress increases
  useEffect(() => {
    const currentBlockCount = blocksToShow;
    
    if (currentBlockCount > lastBlockCountRef.current) {
      // Only make block available if there isn't one already and character isn't carrying
      if (!availableBlockAtPickup && !blockBeingCarried) {
        setAvailableBlockAtPickup(true);
      }
      
      lastBlockCountRef.current = currentBlockCount;
    }
  }, [blocksToShow, availableBlockAtPickup, blockBeingCarried]);
  
  // Walk animation
  useEffect(() => {
    if ((characterState === 'walking' || characterState === 'carrying') && !isPaused) {
      const interval = setInterval(() => {
        setWalkFrame(prev => (prev + 1) % 2);
      }, 200);
      return () => clearInterval(interval);
    }
  }, [characterState, isPaused]);
  
  return (
    <div 
      className="absolute bottom-0 left-0 right-0" 
      style={{ 
        height: `${CONTAINER_HEIGHT}px`,
        pointerEvents: 'none',
        zIndex: 20
      }}
    >
      {/* Ground line with mine step */}
      <div 
        className="absolute bottom-0 left-0 right-0" 
        style={{ 
          height: `${GROUND_HEIGHT}px`,
          background: '#90EE90',
          clipPath: 'polygon(0% 0%, 75% 0%, 85% 50%, 100% 50%, 100% 100%, 0% 100%)'
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
      
      {/* Placed blocks */}
      {placedBlocks.map((column, colIndex) => {
        const leftPosition = TOWER_START_X + colIndex * TOWER_SPACING;
        // Don't render towers that would overlap with timer container
        if (leftPosition > TOWER_END_X) return null;
        
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
                  transform: isNewBlock ? 'scale(0)' : 'scale(1)',
                  transition: 'transform 0.3s ease-out, all 0.2s ease-out'
                }}
              />
            );
          })}
        </div>
        );
      })}
      
      {/* Block available in mine */}
      {availableBlockAtPickup && (
        <div
          className="absolute"
          style={{
            bottom: `${GROUND_HEIGHT * 0.5}px`, // In the stepped-down mine area
            right: '30px', // Inside the mine area
            width: `${BLOCK_SIZE}px`,
            height: `${BLOCK_SIZE}px`,
            background: getBlockColor(),
            border: '1px solid rgba(0, 0, 0, 0.2)',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
            opacity: 0.8
          }}
        />
      )}

      {/* Character */}
      <div 
        className="absolute"
        style={{
          bottom: characterX >= 280 ? `${GROUND_HEIGHT - 18}px` : `${GROUND_HEIGHT}px`, // Lower when in mine
          left: `${characterX}px`,
          width: `${CHARACTER_SIZE}px`,
          height: `${CHARACTER_SIZE}px`,
          transition: 'left 0.1s linear, bottom 0.2s ease-out',
          transform: characterDirection === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
          zIndex: 10
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
          {/* Legs - animate for walking */}
          <rect 
            x="4" 
            y="8" 
            width="2" 
            height={characterState === 'walking' && walkFrame === 0 ? "3" : "2"} 
            fill="#4a5568"
          />
          <rect 
            x="6" 
            y="8" 
            width="2" 
            height={characterState === 'walking' && walkFrame === 1 ? "3" : "2"} 
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
              transition: 'top 0.2s ease-out',
              transform: characterDirection === 'left' ? 'scaleX(-1)' : 'scaleX(1)'
            }}
          />
        )}
      </div>
      
      {/* Static task title in ground area */}
      {taskTitle && (
        <div 
          className="absolute bottom-0 left-0 right-0 flex items-center pl-6 pr-4 pb-1"
          style={{ height: `${GROUND_HEIGHT}px` }}
        >
          <span 
            className="font-medium text-base w-full" 
            style={{ 
              color: '#7C7C7C'
            }}
          >
            {isPaused ? `Paused for XX:XX` : taskTitle}
          </span>
        </div>
      )}
      
    </div>
  );
};