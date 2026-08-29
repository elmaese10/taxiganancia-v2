'use client'

import { RotateCcw } from 'lucide-react'
import { fmtClock, fmtRate, fmtSoles, type ShiftConfig, type ShiftStats } from '@/lib/shift'
import { cn } from '@/lib/utils'

interface ShiftSummaryProps {
  stats: ShiftStats
  config: ShiftConfig
  onNewShift: () => void
}

export function ShiftSummary({ stats, config, onNewShift }: ShiftSummaryProps) {
  const goalMet = stats.net >= config.goal
  const wasted = stats.waitSeconds + stats.pauseSeconds
  const productive = stats.tripSeconds + wasted
  const tripShare = productive > 0 ? Math.round((stats.tripSeconds / productive) * 100) : 0

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-1">
        <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">
          RESUMEN DEL TURNO
        </p>
        <h1
          className={cn(
            'font-mono text-5xl leading-none font-semibold tabular-nums',
            goalMet ? 'text-primary glow-primary' : 'text-warning glow-warning',
          )}
        >
          {fmtSoles(stats.net, 0)}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {goalMet
            ? `Superaste la meta de ${fmtSoles(config.goal, 0)}. Buen día de trabajo.`
            : `Te faltaron ${fmtSoles(config.goal - stats.net, 0)} para la meta de ${fmtSoles(config.goal, 0)}.`}
        </p>
      </header>

      <section aria-label="Balance de tiempo" className="flex flex-col gap-3 rounded-2xl bg-card p-5">
        <h2 className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">
          EN QUÉ SE FUE TU TIEMPO
        </h2>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${tripShare}%` }} />
          <div className="h-full flex-1 bg-destructive/70" />
        </div>
        <dl className="flex gap-3">
          <div className="flex flex-1 flex-col gap-0.5">
            <dt className="font-mono text-[10px] tracking-[0.14em] text-primary">EN VIAJES</dt>
            <dd className="font-mono text-xl font-semibold tabular-nums text-foreground">
              {fmtClock(stats.tripSeconds)}
            </dd>
            <dd className="font-mono text-[11px] text-muted-foreground">{tripShare}% del turno</dd>
          </div>
          <div className="flex flex-1 flex-col gap-0.5">
            <dt className="font-mono text-[10px] tracking-[0.14em] text-destructive">
              TIEMPO PERDIDO
            </dt>
            <dd className="font-mono text-xl font-semibold tabular-nums text-foreground">
              {fmtClock(wasted)}
            </dd>
            <dd className="font-mono text-[11px] text-muted-foreground">
              {fmtSoles((wasted / 3600) * config.idealRate)} en costo
            </dd>
          </div>
        </dl>
      </section>

      <section aria-label="Números del turno" className="flex flex-col divide-y divide-border rounded-2xl bg-card px-5">
        {[
          { label: 'Tiempo total en turno', value: fmtClock(stats.elapsedSeconds) },
          { label: 'Viajes completados', value: String(stats.trips.length) },
          { label: 'Ingresos brutos', value: fmtSoles(stats.earnings, 0) },
          { label: 'Gastos del día', value: `−${fmtSoles(stats.expensesTotal, 0)}` },
          { label: 'Ritmo promedio', value: `${fmtRate(stats.rate)} S//h` },
          {
            label: 'Tarifa ideal',
            value: `${fmtRate(config.idealRate)} S//h`,
          },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 py-3.5">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {row.value}
            </span>
          </div>
        ))}
      </section>

      <button
        type="button"
        onClick={onNewShift}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground"
      >
        <RotateCcw className="size-5" aria-hidden="true" />
        Empezar un turno nuevo
      </button>
    </main>
  )
}
