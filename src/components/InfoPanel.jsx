function InfoPanel({ title, description, note, bullets }) {
  return (
    <div className="info-panel">
      {title && <p className="info-panel-title">{title}</p>}
      <p className="info-panel-description">{description}</p>
      {note && <p className="info-panel-note">{note}</p>}
      {bullets && bullets.length > 0 && (
        <>
          <p className="info-panel-uses-label">Common Uses</p>
          <ul className="info-panel-list">
            {bullets.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </>
      )}
    </div>
  )
}

export default InfoPanel
