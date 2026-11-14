import './oxygen-reserve.css'

export function oxygenPercent(stored: number | undefined, capacity: number | undefined) {
  if (stored === undefined || capacity === undefined || !Number.isFinite(stored) || !Number.isFinite(capacity)) return undefined
  if (capacity <= 0) return 0
  return Math.round(Math.min(100, Math.max(0, stored / capacity * 100)))
}

export function oxygenLabel(stored: number | undefined, capacity: number | undefined) {
  const percent = oxygenPercent(stored, capacity)
  return percent === undefined ? 'Unavailable' : `${percent}%`
}

export function OxygenReserve({ stored, capacity, compact = false }: {
  stored?: number
  capacity?: number
  compact?: boolean
}) {
  const percent = oxygenPercent(stored, capacity)
  if (percent === undefined) return <span>Unavailable</span>
  const tone = percent < 25 ? 'low' : percent < 60 ? 'watch' : 'good'
  const message = tone === 'low' ? 'Oxygen is running low!' : tone === 'watch' ? 'Keep an eye on our oxygen.' : 'Plenty of oxygen!'
  return <span className="oxygen-reserve" data-tone={tone}>
    <strong>{percent}%</strong>
    <span className="oxygen-track" role="progressbar" aria-label="Oxygen left" aria-valuenow={percent} aria-valuetext={`${percent}%. ${message}`}>
      <span style={{ width: `${percent}%` }} />
    </span>
    {!compact && <small>{message}</small>}
  </span>
}
