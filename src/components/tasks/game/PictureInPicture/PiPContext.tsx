import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';

// Chrome Document Picture-in-Picture API types
declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
      window?: Window;
    };
  }
}

interface PiPContextType {
  isPiPActive: boolean;
  isPiPAvailable: boolean;
  pipWindow: Window | null;
  enterPiP: () => Promise<void>;
  exitPiP: () => void;
  setPiPAvailable: (available: boolean) => void;
  setOnPiPClose: (callback: (() => void) | null) => void;
}

const PiPContext = createContext<PiPContextType | undefined>(undefined);

interface PiPProviderProps {
  children: ReactNode;
}

const DEFAULT_PIP_SIZE = { width: 368, height: 514 };

export const PiPProvider: React.FC<PiPProviderProps> = ({ children }) => {
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isPiPAvailable, setIsPiPAvailable] = useState(() => {
    // Check if Chrome's Document Picture-in-Picture API is supported
    return 'documentPictureInPicture' in window;
  });
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const pipContentRef = useRef<HTMLElement | null>(null);
  const onPiPCloseRef = useRef<(() => void) | null>(null);

  const setOnPiPClose = useCallback((callback: (() => void) | null) => {
    onPiPCloseRef.current = callback;
  }, []);

  const copyStylesToPiPWindow = useCallback((pipWindow: Window) => {
    // Copy all stylesheets from the main document to the PiP window
    const stylesheets = Array.from(document.styleSheets);
    
    stylesheets.forEach((stylesheet) => {
      try {
        if (stylesheet.href) {
          // External stylesheet - create link element
          const linkElement = pipWindow.document.createElement('link');
          linkElement.rel = 'stylesheet';
          linkElement.href = stylesheet.href;
          pipWindow.document.head.appendChild(linkElement);
        } else if (stylesheet.cssRules) {
          // Inline stylesheet - create style element
          const styleElement = pipWindow.document.createElement('style');
          
          // Copy all CSS rules
          const cssText = Array.from(stylesheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
          
          styleElement.textContent = cssText;
          pipWindow.document.head.appendChild(styleElement);
        }
      } catch (error) {
        console.warn('Failed to copy stylesheet:', error);
        
        // Fallback: try to copy the entire CSS content
        try {
          if (stylesheet.ownerNode && stylesheet.ownerNode.textContent) {
            const styleElement = pipWindow.document.createElement('style');
            styleElement.textContent = stylesheet.ownerNode.textContent;
            pipWindow.document.head.appendChild(styleElement);
          }
        } catch (fallbackError) {
          console.warn('Fallback stylesheet copy also failed:', fallbackError);
        }
      }
    });

    // Set up card-like styling for the PiP window
    pipWindow.document.body.style.margin = '0';
    pipWindow.document.body.style.padding = '0';
    pipWindow.document.body.style.overflow = 'hidden';
    pipWindow.document.body.style.backgroundColor = 'hsl(202 10% 16%)'; // Dark card background
    pipWindow.document.body.style.borderRadius = '16px';
    pipWindow.document.body.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
    pipWindow.document.body.style.height = '100vh';
    pipWindow.document.body.style.width = '100vw';
    
    // Apply dark mode classes
    pipWindow.document.documentElement.className = 'dark';
    pipWindow.document.body.className = document.body.className;
  }, []);

  const enterPiP = useCallback(async () => {
    if (!isPiPAvailable || !window.documentPictureInPicture) {
      console.error('Document Picture-in-Picture API not supported');
      return;
    }

    try {
      // Request a new Picture-in-Picture window
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: DEFAULT_PIP_SIZE.width,
        height: DEFAULT_PIP_SIZE.height
      });

      // Copy styles to the PiP window
      copyStylesToPiPWindow(pipWindow);

      // Set up the PiP window
      setPipWindow(pipWindow);
      setIsPiPActive(true);

      // Handle when the PiP window is closed
      pipWindow.addEventListener('unload', () => {
        setIsPiPActive(false);
        setPipWindow(null);
        pipContentRef.current = null;
        // Call the refresh callback when PiP closes
        onPiPCloseRef.current?.();
      });

      // Handle when the user closes the PiP window via the X button
      pipWindow.addEventListener('pagehide', () => {
        setIsPiPActive(false);
        setPipWindow(null);
        pipContentRef.current = null;
        // Call the refresh callback when PiP closes
        onPiPCloseRef.current?.();
      });

      // No theme observer needed since we only use dark mode

      console.log('Picture-in-Picture window opened successfully');
    } catch (error) {
      console.error('Failed to open Picture-in-Picture window:', error);
      
      // Provide user-friendly error messages
      if (error.name === 'InvalidStateError') {
        alert('Picture-in-Picture is already active. Please close the existing PiP window first.');
      } else if (error.name === 'NotAllowedError') {
        alert('Picture-in-Picture was blocked. Please allow PiP access in your browser settings.');
      } else {
        alert('Failed to open Picture-in-Picture window. Please try again.');
      }
    }
  }, [isPiPAvailable, copyStylesToPiPWindow]);

  const exitPiP = useCallback(() => {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }
    setIsPiPActive(false);
    // Call the refresh callback when PiP exits
    onPiPCloseRef.current?.();
    setPipWindow(null);
    pipContentRef.current = null;
  }, [pipWindow]);

  const setPiPAvailableCallback = useCallback((available: boolean) => {
    // Only set available if the API is actually supported
    const isSupported = 'documentPictureInPicture' in window;
    setIsPiPAvailable(available && isSupported);
  }, []);

  const value: PiPContextType = {
    isPiPActive,
    isPiPAvailable,
    pipWindow,
    enterPiP,
    exitPiP,
    setPiPAvailable: setPiPAvailableCallback,
    setOnPiPClose
  };

  return (
    <PiPContext.Provider value={value}>
      {children}
    </PiPContext.Provider>
  );
};

export const usePiP = (): PiPContextType => {
  const context = useContext(PiPContext);
  if (context === undefined) {
    throw new Error('usePiP must be used within a PiPProvider');
  }
  return context;
};