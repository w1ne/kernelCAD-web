export function TitleCard({ title, tagline }: { title: string; tagline: string }): React.JSX.Element {
  return (
    <div
      data-testid="title-card"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        gap: 16,
      }}
    >
      <div style={{ position: 'absolute', top: 24, left: 32, fontSize: 24 }}>kernelCAD</div>
      <div style={{ fontSize: 56 }}>{title}</div>
      <div style={{ fontSize: 28, color: '#9aa0a6' }}>{tagline}</div>
    </div>
  );
}
