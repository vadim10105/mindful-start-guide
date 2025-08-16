import React, { useRef, useEffect } from 'react'
import { TimeToggle } from './TimeToggle'
import { useTime, TimeOfDay } from '@/contexts/TimeContext'

export function CloudIframeBackground() {
  const { currentTime, setCurrentTime } = useTime()
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

  // Send initial time to iframe when it loads
  useEffect(() => {
    const handleLoad = () => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'TIME_CHANGE',
          timeOfDay: currentTime
        }, '*')
      }
    }

    const iframe = iframeRef.current
    if (iframe) {
      iframe.addEventListener('load', handleLoad)
      return () => iframe.removeEventListener('load', handleLoad)
    }
  }, [currentTime])

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