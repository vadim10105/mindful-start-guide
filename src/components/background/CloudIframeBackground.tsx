export function CloudIframeBackground() {
  return (
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
  )
}