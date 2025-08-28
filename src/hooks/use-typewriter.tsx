import { useState, useEffect, useCallback } from 'react';

const placeholderMessages = [
  "What would feel good to start today?",
  "Let your thoughts land here, however they arrive",
  "What wants to become real today?",
  "Don't know what to prioritise? Share it all first",
  "Lot to do today? Let's untangle it together",
  "Brain full? Pour it out gently...",
  "Already have a list? Drop a photo here",
  "Everything feels urgent? Pour it out, we'll sort it",
  "Big day ahead? We can break it down gently",
  "Handwritten chaos? Photo it, we'll organise it",
  "Every half-thought counts, drop them in",
  "Share what you're dreaming of today...",
  "Let it all drift out, messy is perfect",
  "Blank page? Share thoughts, we'll find the tasks",
  "Too many options? Pour them out, we'll choose together",
  "Everything and nothing to do? Let it all out…"
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