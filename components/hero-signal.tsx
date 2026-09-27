'use client'
import { XCircle } from 'lucide-react'
import { fmtHM, fmtRate, fmtShort, fmtSoles, segmentSeconds, type ShiftStats } from '@/lib/shift'
import { cn } from '@/lib/utils'
interface HeroSignalProps { stats: ShiftStats; goal: number; onCancelTrip?: () => void }
const TONE: Record<string, { text: string; glow: string; ring: string; bg: string; label: string }> = {
  idle: { text: 'text-muted-foreground', glow: '', ring: 'border-border', bg: 'bg-muted/40', label: 'LISTO' },
  wait: { text: 'text-primary', glow: 'glow-primary', ring: 'border-primary/40', bg: 'bg-primary/10', label: 'BUSCANDO CARRERA' },
  losing: { text: 'text-primary', glow: 'glow-primary', ring: 'border-primary/40', bg: 'bg-primary/10', label: 'BUSCANDO CARRERA' },
  trip: { text: 'text-[#c084fc]', glow: 'glow-purple', ring: 'border-[#c084fc]/40', bg: 'bg-[#c084fc]/10', label: 'EN VIAJE' },
  paused: { text: 'text-warning', glow: 'glow-warning', ring: 'border-warning/40', bg: 'bg-warning/10', label: 'EN PAUSA' },
  ended: { text: 'text-muted-foreground', glow: '', ring: 'border-border', bg: 'bg-muted/40', label: 'TERMINADO' },
}
export function HeroSignal({ stats, goal, onCancelTrip }: HeroSignalProps) {
  const tone = TONE[stats.mood] ?? TONE.idle
  const kind = stats.current?.kind
  const seg = stats.current; const elapsed = seg ? segmentSeconds(seg, Date.now()) : 0
  return (
    <section className={cn('flex flex-col gap-4 rounded-2xl border p-5', tone.ring, tone.bg)}>
      <div className="flex flex-col gap-2">
        <span className={cn('font-mono text-xs font-semibold tracking-[0.18em]', tone.text)}>● {tone.label}</span>
        <div className={cn('font-mono text-5xl font-semibold tabular-nums leading-none', tone.text, tone.glow)}>
          {kind === 'pause' && elapsed >= 3600 ? fmtHM(elapsed) : fmtShort(elapsed)}</div>
        <p className="font-mono text-sm text-muted-foreground">
          {kind === 'trip' ? `${fmtSoles((elapsed / 3600) * stats.rate)} quemados en viaje`
            : kind === 'pause' ? 'Tiempo en pausa'
            : `${fmtSoles(stats.burned)} quemados esperando`}</p>
      </div>
      <hr className="border-border" />
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold text-foreground leading-snug">{stats.message}</p>
        <p className="text-sm text-muted-foreground">{stats.hint}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <div className={cn('flex flex-col gap-1 rounded-xl p-3', tone.bg)}>
          <dt className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">TU RITMO</dt>
          <dd className={cn('font-mono text-3xl font-semibold tabular-nums', stats.rate > 0 ? 'text-primary' : 'text-destructive')}>
            {fmtRate(stats.rate)}</dd>
          <dd className="font-mono text-xs text-muted-foreground">S//h</dd>
        </div>
        <div className={cn('flex flex-col gap-1 rounded-xl p-3', tone.bg)}>
          <dt className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">NECESITAS</dt>
          <dd className="font-mono text-3xl font-semibold tabular-nums text-foreground">{fmtRate(stats.neededRate)}</dd>
          <dd className="font-mono text-xs text-muted-foreground">S//h</dd>
        </div>
      </dl>
      {kind === 'trip' && onCancelTrip ? (
        <button type="button" onClick={onCancelTrip}
          className="flex items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-medium text-destructive hover:bg-destructive/10">
          <XCircle className="size-4" /> El cliente canceló</button>
      ) : null}
    </section>
  )
}
