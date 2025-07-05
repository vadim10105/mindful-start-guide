import React from 'react';

interface ProgressBorderProps {
  progress: number; // 0-1 range
  width?: number;
  height?: number;
  stroke?: number;
  color?: string;
  className?: string;
  borderRadius?: number;
}

export function ProgressBorder({ 
  progress, 
  width = 320,
  height = 447, // aspect ratio 63/88 for w-80
  stroke = 6, 
  color = 'hsl(var(--primary))',
  className = '',
  borderRadius = 8 // rounded-lg equivalent
}: ProgressBorderProps) {
  // Calculate the rounded rectangle path
  const r = borderRadius;
  const w = width - stroke;
  const h = height - stroke;
  const x = stroke / 2;
  const y = stroke / 2;

  // Create the rounded rectangle path
  const path = `
    M ${x + r} ${y}
    L ${x + w - r} ${y}
    Q ${x + w} ${y} ${x + w} ${y + r}
    L ${x + w} ${y + h - r}
    Q ${x + w} ${y + h} ${x + w - r} ${y + h}
    L ${x + r} ${y + h}
    Q ${x} ${y + h} ${x} ${y + h - r}
    L ${x} ${y + r}
    Q ${x} ${y} ${x + r} ${y}
    Z
  `;

  // Calculate total path length for a rounded rectangle
  const straightSides = 2 * (w - 2 * r) + 2 * (h - 2 * r);
  const cornerArcs = 2 * Math.PI * r;
  const totalLength = straightSides + cornerArcs;
  
  const offset = totalLength * (1 - progress);

  return (
    <svg 
      width={width} 
      height={height} 
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none'
      }}
    >
      {/* Background border */}
      <path
        d={path}
        stroke="hsl(var(--muted))"
        fill="transparent"
        strokeWidth={stroke}
        opacity={0.3}
      />
      
      {/* Progress border */}
      <path
        d={path}
        stroke={color}
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={totalLength}
        strokeDashoffset={offset}
        style={{ 
          transition: 'stroke-dashoffset 0.5s linear'
        }}
      />
    </svg>
  );
}