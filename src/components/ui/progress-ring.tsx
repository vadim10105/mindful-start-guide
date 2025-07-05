import React from 'react';

interface ProgressRingProps {
  progress: number; // 0-1 range
  size?: number;
  stroke?: number;
  color?: string;
  className?: string;
}

export function ProgressRing({ 
  progress, 
  size = 96, 
  stroke = 6, 
  color = 'hsl(var(--primary))',
  className = ''
}: ProgressRingProps) {
  const radius = (size / 2) - (stroke / 2);
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className={className}>
      <circle
        stroke="hsl(var(--muted))"
        fill="transparent"
        strokeWidth={stroke}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        stroke={color}
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{ 
          transition: 'stroke-dashoffset 0.5s linear',
          transform: 'rotate(-90deg)',
          transformOrigin: '50% 50%'
        }}
      />
    </svg>
  );
}