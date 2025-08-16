import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type TimeOfDay = 'sunrise' | 'day' | 'sunset' | 'night';

interface TimeContextType {
  currentTime: TimeOfDay;
  setCurrentTime: (time: TimeOfDay) => void;
  isDarkMode: boolean;
}

const TimeContext = createContext<TimeContextType | undefined>(undefined);

// Helper function to determine time of day based on current hour
const getCurrentTimeOfDay = (): TimeOfDay => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 10) return 'sunrise';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'sunset';
  return 'night';
};

interface TimeProviderProps {
  children: ReactNode;
}

export const TimeProvider: React.FC<TimeProviderProps> = ({ children }) => {
  const [currentTime, setCurrentTime] = useState<TimeOfDay>(() => getCurrentTimeOfDay());
  
  // Dark mode is active when time is 'night'
  const isDarkMode = currentTime === 'night';

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }, [isDarkMode]);

  const value: TimeContextType = {
    currentTime,
    setCurrentTime,
    isDarkMode
  };

  return (
    <TimeContext.Provider value={value}>
      {children}
    </TimeContext.Provider>
  );
};

// Custom hook for using time context
export const useTime = (): TimeContextType => {
  const context = useContext(TimeContext);
  if (!context) {
    throw new Error('useTime must be used within a TimeProvider');
  }
  return context;
};

// Hook specifically for accessing dark mode state
export const useDarkMode = (): boolean => {
  const { isDarkMode } = useTime();
  return isDarkMode;
};