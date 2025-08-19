import React, { useRef, useEffect } from 'react'
import { TimeToggle } from './TimeToggle'
import { useTime, TimeOfDay } from '@/contexts/TimeContext'

export function CloudIframeBackground() {
  const { currentTime, setCurrentTime } = useTime()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null)

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
      {/* Full background iframe */}
      <iframe
        ref={iframeRef}
        src="/cloud"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          border: 'none',
          pointerEvents: 'none',
          zIndex: -5,
          imageRendering: 'pixelated',
          imageRendering: '-moz-crisp-edges',
          imageRendering: 'crisp-edges',
          filter: 'contrast(1.3) saturate(1.2)',
        }}
        title="Cloud Background"
      />

      {/* Pixel grid overlay for traditional pixel art look */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '14px 14px',
          opacity: 0.05,
        }}
      />
      <TimeToggle 
        currentTime={currentTime}
        onTimeChange={handleTimeChange}
      />
    </>
  )
}