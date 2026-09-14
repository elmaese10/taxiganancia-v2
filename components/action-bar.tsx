'use client'
import { Car, Flag, Pause, Play, Settings, Square } from 'lucide-react'
import type { ShiftState, ShiftStats } from '@/lib/shift'
import { cn } from '@/lib/utils'
interface ActionBarProps { status: ShiftState['status']; stats: ShiftStats; onStartShift: () => void; onStartTrip: () => void; onEndTrip: () => void; onTogglePause: () => void; onEndShift: () => void; onOpenSettings: () => void }
export function ActionBar({ status, stats, onStartShift, onStartTrip, onEndTrip, onTogglePause, onEndShift, onOpenSettings }: ActionBarProps) {
  const kind = stats.current?.kind; const running = status === 'running'; const paused = kind === 'pause'
  const primary = !running ? { label: 'Iniciar turno', icon: Play, onClick: onStartShift }
    : kind === 'trip' ? { label: 'Terminar viaje', icon: Flag, onClick: onEndTrip }
    : { label: 'Iniciar viaje', icon: Car, onClick: onStartTrip }
  const PrimaryIcon = primary.icon
  return (
    <div className="flex items-center gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
      <button type="button" onClick={primary.onClick} disabled={paused}
        className={cn('flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold disabled:opacity-40',
          kind === 'trip' ? 'bg-warning text-warning-foreground' : 'bg-primary text-primary-foreground')}>
        <PrimaryIcon className="size-4" /> {primary.label}</button>
      <button type="button" onClick={onTogglePause} disabled={!running || kind === 'trip'}
        className="rounded-xl bg-card p-3.5 text-foreground/80 disabled:opacity-30">
        {paused ? <Play className="size-5" /> : <Pause className="size-5" />}</button>
      <button type="button" onClick={onEndShift} disabled={!running}
        className="rounded-xl bg-card p-3.5 text-destructive disabled:opacity-30"><Square className="size-5" /></button>
      <button type="button" onClick={onOpenSettings}
        className="rounded-xl bg-card p-3.5 text-muted-foreground hover:text-foreground"><Settings className="size-5" /></button>
    </div>
  )
}
