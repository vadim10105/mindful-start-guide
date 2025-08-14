import { useState, useEffect } from 'react';

// Time-based messages (shown after 10+ minutes)
const timeBasedMessages: string[] = [
];

// Time-independent messages  
const timeIndependentMessages = [
  "Mind wandering? Capture it here",
  "Stuck? Break it down smaller", 
  "Overwhelmed? Next tiny step only",
  "Cmd/Ctrl+L for quick checklists",
  "What a performative professional <3",
];

// Shuffle array function
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const useNotesTypewriter = (taskStartTime?: Date) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showCursor, setShowCursor] = useState(true);
  const [availableMessages, setAvailableMessages] = useState(() => shuffleArray(timeIndependentMessages));
  const [shuffledMessages, setShuffledMessages] = useState(() => shuffleArray(timeIndependentMessages));

  // Check if 10+ minutes have passed since task start and update shuffled messages
  useEffect(() => {
    let baseMessages = timeIndependentMessages;
    
    if (taskStartTime) {
      const checkTimeElapsed = () => {
        const now = new Date();
        const elapsed = now.getTime() - taskStartTime.getTime();
        const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
        
        if (elapsed >= tenMinutes) {
          // Include time-based messages after 10 minutes
          baseMessages = [...timeIndependentMessages, ...timeBasedMessages];
        } else {
          baseMessages = timeIndependentMessages;
        }
        
        // Only update if the available messages actually changed
        if (JSON.stringify(availableMessages) !== JSON.stringify(baseMessages)) {
          const newShuffled = shuffleArray(baseMessages);
          setShuffledMessages(newShuffled);
          setAvailableMessages(baseMessages);
        }
      };

      // Check immediately and set up interval
      checkTimeElapsed();
      const interval = setInterval(checkTimeElapsed, 60000); // Check every minute

      return () => clearInterval(interval);
    } else {
      setAvailableMessages(timeIndependentMessages);
    }
  }, [taskStartTime]);

  const currentMessage = shuffledMessages[currentMessageIndex];

  // Typewriter effect
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      // Typing phase
      if (currentText.length < currentMessage.length) {
        timeout = setTimeout(() => {
          setCurrentText(currentMessage.slice(0, currentText.length + 1));
        }, 80); // Typing speed
      } else {
        // Message complete, show for 3 minutes then start deleting
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, 180000); // Show message for 3 minutes
      }
    } else {
      // Deleting phase
      if (currentText.length > 0) {
        timeout = setTimeout(() => {
          setCurrentText(currentText.slice(0, -1));
        }, 40); // Faster deletion
      } else {
        // Move to next message
        setCurrentMessageIndex((prev) => {
          const nextIndex = (prev + 1) % shuffledMessages.length;
          // If we've completed a full cycle, reshuffle the messages
          if (nextIndex === 0) {
            setShuffledMessages(shuffleArray(availableMessages));
          }
          return nextIndex;
        });
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [currentText, currentMessage, isTyping, availableMessages, shuffledMessages]);

  // Cursor blink effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return {
    text: currentText,
    showCursor,
  };
};