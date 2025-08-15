import React, { useState, useRef, useEffect } from 'react'
import { TimeToggle, TimeOfDay } from './TimeToggle'

function getCurrentTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  
  if (hour >= 5 && hour < 10) return 'sunrise'  // 5am - 10am
  if (hour >= 10 && hour < 17) return 'day'     // 10am - 5pm  
  if (hour >= 17 && hour < 21) return 'sunset'  // 5pm - 9pm
  return 'night'                                 // 9pm - 5am
}

export function CloudIframeBackground() {
  const [currentTime, setCurrentTime] = useState<TimeOfDay>(() => getCurrentTimeOfDay())
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleTimeChange = (newTime: TimeOfDay) => {
    setCurrentTime(newTime)
    
    // Send message to iframe
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'TIME_CHANGE',
        timeOfDay: newTime
      }, '*')
    }
  }

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -10,
        pointerEvents: 'none'
      }}>
        <iframe
          ref={iframeRef}
          src="/cloud"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            pointerEvents: 'none'
          }}
          title="Cloud Background"
        />
      </div>
      <TimeToggle 
        currentTime={currentTime}
        onTimeChange={handleTimeChange}
      />
    </>
  )
}