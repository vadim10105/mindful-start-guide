
import { useState } from 'react';
import { MrIntentCharacter } from './MrIntentCharacter';

export const useCharacterMessages = () => {
  const [showCharacter, setShowCharacter] = useState(true);
  const [characterMessage, setCharacterMessage] = useState(
    "Ugh, fine... I guess we should probably do something productive. Click 'Play this card' if you're feeling ambitious."
  );

  const showMessage = (message: string, duration: number = 8000) => {
    setCharacterMessage(message);
    setShowCharacter(true);
    setTimeout(() => setShowCharacter(false), duration);
  };

  const getRandomMessage = (messages: string[]) => {
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getCommitMessages = (taskTitle: string) => [
    `Alright, "${taskTitle}"... I'd probably procrastinate on this too, but here we are.`,
    `Even I can manage 5 minutes of focus on "${taskTitle}"... probably.`,
    `Fine, we're doing "${taskTitle}". At least one of us is being productive today.`,
    `"${taskTitle}" it is. Try not to make me look too lazy by comparison.`
  ];

  const getMoveOnMessages = (taskTitle: string) => [
    `Fine, moving on to "${taskTitle}"... this better be more interesting.`,
    `Next up: "${taskTitle}". Here we go again...`,
    `"${taskTitle}" is next. Let's see if we can actually focus this time.`,
    `Moving to "${taskTitle}"... hopefully this goes better.`
  ];

  const getPauseMessages = (taskTitle: string) => [
    `Fine, taking a break from "${taskTitle}"... I wasn't really in the mood anyway.`,
    `"${taskTitle}" can wait. Even I need a breather sometimes.`,
    `Pausing "${taskTitle}"... probably for the best, honestly.`,
    `We'll get back to "${taskTitle}" when we feel like it. No rush.`
  ];

  const getContinueMessages = (taskTitle: string) => [
    `Alright, back to "${taskTitle}"... where were we? Oh right, avoiding it.`,
    `Continuing with "${taskTitle}"... hope you're more motivated than I am.`,
    `"${taskTitle}" again... fine, let's see if we can actually finish it this time.`,
    `Back to the grind with "${taskTitle}"... joy.`
  ];

  const getSkipMessages = (taskTitle: string) => [
    `Skipping "${taskTitle}"... honestly, probably for the best.`,
    `"${taskTitle}" is now officially someone else's problem.`,
    `Goodbye "${taskTitle}"... it's not you, it's definitely me.`,
    `"${taskTitle}" has been eliminated. One less thing to worry about.`
  ];

  const getNewCardMessages = (taskTitle: string) => [
    `Oh great, now we have "${taskTitle}"... this day just keeps getting better.`,
    `Next up: "${taskTitle}". I'm already tired just thinking about it.`,
    `"${taskTitle}" is calling... but I'm not answering.`,
    `Well, "${taskTitle}" isn't going to do itself... unfortunately.`
  ];

  return {
    showCharacter,
    characterMessage,
    setShowCharacter,
    showMessage,
    getRandomMessage,
    getCommitMessages,
    getMoveOnMessages,
    getPauseMessages,
    getContinueMessages,
    getSkipMessages,
    getNewCardMessages
  };
};

interface CharacterDisplayProps {
  showCharacter: boolean;
  characterMessage: string;
  onClose: () => void;
}

export const CharacterDisplay = ({ showCharacter, characterMessage, onClose }: CharacterDisplayProps) => {
  if (!showCharacter) return null;
  
  return (
    <MrIntentCharacter
      message={characterMessage}
      onClose={onClose}
    />
  );
};
