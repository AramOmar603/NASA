import { useEffect, useId, useRef } from 'react'
import './game-interface.css'

export interface MissionEvent {
  readonly title: string
  readonly description: string
  readonly decisions: readonly { readonly id: string; readonly label: string }[]
}

export interface MissionEventDialogProps {
  readonly event?: MissionEvent
  readonly onDecision: (id: string) => void
  readonly onDismiss?: () => void
}

export function MissionEventDialog({ event, onDecision, onDismiss }: MissionEventDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useId()
  const description = useId()
  const open = Boolean(event)

  useEffect(() => {
    const element = dialog.current
    if (!open || !element) return
    if (!element.open) element.showModal()
    return () => { if (element.open) element.close() }
  }, [open])

  if (!event) return null

  return (
    <dialog ref={dialog} className="lg-modal" aria-labelledby={title} aria-describedby={description} onCancel={(cancel) => {
      cancel.preventDefault()
      onDismiss?.()
    }}>
      <div className="lg-dialog-content">
        <p className="lg-kicker">Emergency decision</p>
        <h2 id={title}>{event.title}</h2>
        <p id={description}>{event.description}</p>
        <div className="lg-actions">
          {event.decisions.map(({ id, label }) => <button type="button" className="lg-button" key={id} onClick={() => onDecision(id)}>{label}</button>)}
          {onDismiss && <button type="button" className="lg-button" onClick={onDismiss}>Review later</button>}
        </div>
      </div>
    </dialog>
  )
}
