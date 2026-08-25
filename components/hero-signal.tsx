'use client'

import { fmtRate, fmtShort, fmtSoles, type ShiftStats } from '@/lib/shift'
import { cn } from '@/lib/utils'

interface HeroSignalProps {
  stats: ShiftStats
  goal: number
}

const TONE = {
  idle: {
    text: 'text-muted-foreground',
    glow: '',
    ring: 'border-border',
    bg: 'bg-card',
    label: 'META DE HOY',
  },
  wait: {
    text: 'text-wait',
    glow: 'glow-wait',
    ring: 'border-wait/40',
    bg: 'bg-wait/10',
    label: 'BUSCANDO CARRERA',
  },
  trip: {
    text: 'text-primary',
    glow: 'glow-primary',
    ring: 'border-primary/50',
    bg: 'bg-primary/12',
    label: 'EN VIAJE · GENERANDO',
  },
  losing: {
    text: 'text-destructive',
    glow: 'glow-destructive',
    ring: 'border-destructive/45',
    bg: 'bg-destructive/8',
    label: 'PERDIENDO PLATA',
  },
  paused: {
    text: 'text-muted-foreground',
    glow: '',
    ring: 'border-border',
    bg: 'bg-muted/40',
    label: 'EN PAUSA',
  },
  ended: {
    text: 'text-foreground',
    glow: '',
    ring: 'border-border',
    bg: 'bg-card',
    label: 'TURNO CERRADO',
  },
} as const

export function HeroSignal({ stats, goal }: HeroSignalProps) {
  const tone = TONE[stats.mood]
  const kind = stats.current?.kind

  // El número estrella cambia de significado según el contexto del turno.
  let star = fmtSoles(goal, 0)
  let sub = 'Aún no arrancas'

  if (stats.mood === 'ended') {
    star = fmtSoles(stats.net, 0)
    sub = 'Neto del turno'
  } else if (kind === 'trip') {
    star = fmtShort(stats.currentSeconds)
    sub = 'Duración de esta carrera'
  } else if (kind === 'pause') {
    star = fmtShort(stats.currentSeconds)
    sub = 'Tiempo en pausa'
  } else if (kind === 'wait') {
    star = fmtShort(stats.currentSeconds)
    sub = `${fmtSoles(stats.burned)} quemados esperando`
  }

  return (
    <section
      aria-label="Señal de urgencia"
      className={cn(
        'flex flex-col gap-4 rounded-2xl border p-5 transition-colors duration-500',
        tone.ring,
        tone.bg,
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'size-2 rounded-full bg-current',
            tone.text,
            stats.mood === 'losing' && 'animate-pulse',
          )}
          aria-hidden="true"
        />
        <span className={cn('font-mono text-sm font-bold tracking-[0.16em]', tone.text)}>
          {tone.label}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <p
          className={cn(
            'lcd font-mono text-6xl leading-none font-semibold tabular-nums',
            tone.text,
            tone.glow,
          )}
        >
          {star}
        </p>
        <p className="font-mono text-base tracking-wide text-muted-foreground">{sub}</p>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-border pt-4">
        <p className="text-xl leading-relaxed font-semibold text-foreground text-pretty">
          {stats.message}
        </p>
        <p className="text-base leading-relaxed text-muted-foreground text-pretty">{stats.hint}</p>
      </div>

      <dl className="flex items-stretch gap-3">
        <div className="flex flex-1 flex-col gap-0.5 rounded-xl bg-background/60 px-3 py-3">
          <dt className="font-mono text-xs tracking-[0.16em] text-muted-foreground">TU RITMO</dt>
          <dd
            className={cn(
              'font-mono text-3xl font-semibold tabular-nums',
              stats.onPace ? 'text-primary' : 'text-destructive',
            )}
          >
            {fmtRate(stats.rate)}
            <span className="text-sm font-normal text-muted-foreground"> S//h</span>
          </dd>
        </div>
        <div className="flex flex-1 flex-col gap-0.5 rounded-xl bg-background/60 px-3 py-3">
          <dt className="font-mono text-xs tracking-[0.16em] text-muted-foreground">NECESITAS</dt>
          <dd className="font-mono text-3xl font-semibold tabular-nums text-foreground">
            {fmtRate(stats.neededRate)}
            <span className="text-sm font-normal text-muted-foreground"> S//h</span>
          </dd>
        </div>
      </dl>
    </section>
  )
}
