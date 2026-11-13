import { useEffect, useRef } from 'react'
import { MissionDashboard } from './MissionDashboard'
import type { MissionDashboardProps } from './MissionDashboard'
import './game-interface.css'

export interface MissionOverviewProps extends MissionDashboardProps {
  readonly open: boolean
  readonly onClose: () => void
}

export function MissionOverview({ open, onClose, ...dashboard }: MissionOverviewProps) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    if (!open || !element) return
    if (!element.open) element.showModal()
    return () => { if (element.open) element.close() }
  }, [open])

  if (!open) return null
  return (
    <dialog ref={dialog} className="lg-modal lg-overview" aria-label="Mission overview" onCancel={(event) => {
      event.preventDefault()
      onClose()
    }}>
      <div className="lg-overview-bar"><button type="button" className="lg-button" onClick={onClose}>Close mission overview</button></div>
      <MissionDashboard {...dashboard} />
    </dialog>
  )
}
