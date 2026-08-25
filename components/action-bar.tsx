'use client'

import { Car, Flag, Pause, Play, Settings, Square } from 'lucide-react'
import type { ShiftState, ShiftStats } from '@/lib/shift'
import { cn } from '@/lib/utils'

interface ActionBarProps {
  status: ShiftState['status']
  stats: ShiftStats
  onStartShift: () => void
  onStartTrip: () => void
  onEndTrip: () => void
  onTogglePause: () => void
  onEndShift: () => void
  onOpenSettings: () => void
}

export function ActionBar({
  status,
  stats,
  onStartShift,
  onStartTrip,
  onEndTrip,
  onTogglePause,
  onEndShift,
  onOpenSettings,
}: ActionBarProps) {
  const kind = stats.current?.kind
  const running = status === 'running'
  const paused = kind === 'pause'

  const primary = !running
    ? { label: 'Iniciar turno', icon: Play, onClick: onStartShift }
    : kind === 'trip'
      ? { label: 'Terminar viaje', icon: Flag, onClick: onEndTrip }
      : { label: 'Iniciar viaje', icon: Car, onClick: onStartTrip }

  const PrimaryIcon = primary.icon

  return (
    <div className="flex items-center gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
      <button
        type="button"
        onClick={primary.onClick}
        disabled={paused}
        className={cn(
          'flex flex-1 items-center justify-center gap-2 rounded-xl py-4 text-base font-semibold transition-opacity disabled:opacity-40',
          kind === 'trip'
            ? 'bg-warning text-warning-foreground'
            : 'bg-primary text-primary-foreground',
        )}
      >
        <PrimaryIcon className="size-5" aria-hidden="true" />
        {primary.label}
      </button>

      <button
        type="button"
        onClick={onTogglePause}
        disabled={!running || kind === 'trip'}
        aria-label={paused ? 'Reanudar turno' : 'Pausar turno'}
        className="rounded-xl bg-card p-4 text-foreground/80 transition-colors hover:text-foreground disabled:opacity-30"
      >
        {paused ? (
          <Play className="size-5" aria-hidden="true" />
        ) : (
          <Pause className="size-5" aria-hidden="true" />
        )}
      </button>

      <button
        type="button"
        onClick={onEndShift}
        disabled={!running}
        aria-label="Cerrar turno"
        className="rounded-xl bg-card p-4 text-destructive transition-colors disabled:opacity-30"
      >
        <Square className="size-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Planear el día"
        className="rounded-xl bg-card p-4 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Settings className="size-5" aria-hidden="true" />
      </button>
    </div>
  )
}
