export function StaticSunsetBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -10,
        background: 'linear-gradient(to bottom, #ffd89b 0%, #ff8c69 70%, #d2691e 100%)',
        pointerEvents: 'none',
        userSelect: 'none'
      }}
    />
  )
}