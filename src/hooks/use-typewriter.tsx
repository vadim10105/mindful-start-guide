import { useState, useEffect, useCallback } from 'react';

const placeholderMessages = [
  "Sure, just add everything you forgot last week.",
  "Go ahead, overwhelm me. I'm built for this.",
  "Is that a to-do or a plot twist? Either way, write it down.",
  "Another distraction? Fantastic. Let's capture it.",
  "Creative chaos? Sounds about right.",
  "Typing is cheaper than a coffee break, right?",
  "Remember: perfection is so last year.",
  "This is your brain's secret stash. Reveal away.",
  "Don't worry, I'm cool with your typos.",
  "Procrastination fuel? Let's get it on paper.",
  "If you wander off, just blame Mr.Intent.",
  "One step closer to 'done' — or at least closer than before."
];

export const useTypewriter = () => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showCursor, setShowCursor] = useState(true);

  const currentMessage = placeholderMessages[currentMessageIndex];

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      // Typing phase
      if (currentText.length < currentMessage.length) {
        timeout = setTimeout(() => {
          setCurrentText(currentMessage.slice(0, currentText.length + 1));
        }, 100);
      } else {
        // Message complete, pause before deleting
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, 12000);
      }
    } else {
      // Deleting phase
      if (currentText.length > 0) {
        timeout = setTimeout(() => {
          setCurrentText(currentText.slice(0, -1));
        }, 50);
      } else {
        // Move to next message
        setCurrentMessageIndex((prev) => (prev + 1) % placeholderMessages.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [currentText, currentMessage, isTyping]);

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