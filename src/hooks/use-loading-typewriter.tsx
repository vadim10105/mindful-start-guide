import { useState, useEffect } from 'react';

const loadingMessages = [
  "Cool. I guess I'll do something with this now.",
  "Ugh, fine. Let's sort it.",
  "Wow. That's… a lot. Okay, give me a sec.",
  "Didn't expect you to actually type something. Impressive.",
  "Okay okay, I get it. You're busy. I'll handle this part.",
  "Great. Another pile of thoughts to wrangle. My favorite.",
  "So many words. So little tagging. Let's fix that.",
  "Alright, let's pretend I know what I'm doing.",
  "Look at you, being productive. Weird, but I'm into it.",
  "Fabulous. Let's slap some meaning on this mess."
];

export const useLoadingTypewriter = (isActive: boolean) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  const currentMessage = loadingMessages[currentMessageIndex];

  // Reset when isActive changes
  useEffect(() => {
    if (isActive) {
      setCurrentMessageIndex(0);
      setCurrentText('');
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    let timeout: NodeJS.Timeout;

    // Just show the full message immediately, then change to next message
    if (currentText !== currentMessage) {
      setCurrentText(currentMessage);
    } else {
      // Message is showing, pause then switch to next
      timeout = setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
        setCurrentText('');
      }, 5000); // 5 second pause before next message
    }

    return () => clearTimeout(timeout);
  }, [currentText, currentMessage, isActive]);

  // Cursor blink effect
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [isActive]);

  return {
    text: currentText,
    showCursor,
  };
};