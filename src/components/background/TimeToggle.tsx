import React from 'react'
import { Sunrise, Sun, Sunset, Moon } from 'lucide-react'
import { TimeOfDay } from '@/contexts/TimeContext'

interface TimeToggleProps {
  currentTime: TimeOfDay
  onTimeChange: (time: TimeOfDay) => void
}

export function TimeToggle({ currentTime, onTimeChange }: TimeToggleProps) {
  const timeOptions: Array<{ value: TimeOfDay; icon: React.ComponentType<any>; label: string }> = [
    { value: 'sunrise', icon: Sunrise, label: 'Sunrise' },
    { value: 'day', icon: Sun, label: 'Day' },
    { value: 'sunset', icon: Sunset, label: 'Sunset' },
    { value: 'night', icon: Moon, label: 'Night' }
  ]

  return (
    <div style={{
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      background: 'var(--toggle-bg)',
      backdropFilter: 'blur(10px)',
      padding: '12px 8px',
      borderRadius: '20px',
      border: '1px solid var(--toggle-border)'
    }}>
      {timeOptions.map(({ value, icon: IconComponent, label }) => (
        <button
          key={value}
          onClick={() => onTimeChange(value)}
          className={`time-toggle-button ${currentTime === value ? 'active' : ''}`}
          style={{
            width: '44px',
            height: '44px',
            border: 'none',
            borderRadius: '12px',
            background: currentTime === value 
              ? 'var(--toggle-active-bg)' 
              : 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: currentTime === value ? 'blur(5px)' : 'none'
          }}
          title={label}
        >
          <IconComponent size={20} color="white" />
        </button>
      ))}
    </div>
  )
}