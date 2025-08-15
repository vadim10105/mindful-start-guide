import React from 'react'

export type TimeOfDay = 'sunrise' | 'day' | 'sunset' | 'night'

interface TimeToggleProps {
  currentTime: TimeOfDay
  onTimeChange: (time: TimeOfDay) => void
}

export function TimeToggle({ currentTime, onTimeChange }: TimeToggleProps) {
  const timeOptions: Array<{ value: TimeOfDay; icon: string; label: string }> = [
    { value: 'sunrise', icon: '🌅', label: 'Sunrise' },
    { value: 'day', icon: '☀️', label: 'Day' },
    { value: 'sunset', icon: '🌇', label: 'Sunset' },
    { value: 'night', icon: '🌙', label: 'Night' }
  ]

  return (
    <div style={{
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      padding: '12px 8px',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    }}>
      {timeOptions.map(({ value, icon, label }) => (
        <button
          key={value}
          onClick={() => onTimeChange(value)}
          style={{
            width: '44px',
            height: '44px',
            border: 'none',
            borderRadius: '12px',
            background: currentTime === value 
              ? 'rgba(255, 255, 255, 0.3)' 
              : 'transparent',
            cursor: 'pointer',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            backdropFilter: currentTime === value ? 'blur(5px)' : 'none'
          }}
          title={label}
          onMouseEnter={(e) => {
            if (currentTime !== value) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
            }
          }}
          onMouseLeave={(e) => {
            if (currentTime !== value) {
              e.currentTarget.style.background = 'transparent'
            }
          }}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}