'use client'
import { ArrowLeft, History, RotateCcw, TrendingUp } from 'lucide-react'
import { fmtHM, fmtRate, fmtSoles, type ShiftConfig, type ShiftStats } from '@/lib/shift'
import { cn } from '@/lib/utils'
interface ShiftSummaryProps { stats: ShiftStats; config: ShiftConfig; onNewShift: () => void; onOpenHistory?: () => void; onBackToGPS?: () => void; onReopen?: () => void }
export function ShiftSummary({ stats, config, onNewShift, onOpenHistory, onBackToGPS, onReopen }: ShiftSummaryProps) {
  const goalMet = stats.net >= config.goal; const netNeg = stats.net < 0
  const wasted = stats.waitSeconds; const productive = stats.tripSeconds + wasted
  const tripShare = productive > 0 ? Math.round((stats.tripSeconds / productive) * 100) : 0
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-1">
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground">RESUMEN DEL TURNO</p>
        <h1 className={cn('font-mono text-5xl leading-none font-semibold tabular-nums',
          netNeg ? 'text-destructive' : goalMet ? 'text-primary glow-primary' : 'text-warning glow-warning')}>
          {fmtSoles(stats.net, 0)}</h1>
        <p className="text-base text-muted-foreground text-pretty">
          {goalMet ? `Superaste la meta de ${fmtSoles(config.goal, 0)}.` : `Te faltaron ${fmtSoles(config.goal - stats.net, 0)} para la meta de ${fmtSoles(config.goal, 0)}.`}</p>
      </header>
      <section className="flex flex-col gap-3 rounded-2xl bg-card p-5">
        <h2 className="font-mono text-xs tracking-[0.18em] text-muted-foreground">EN QUÉ SE FUE TU TIEMPO</h2>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${tripShare}%` }} />
          <div className="h-full flex-1 bg-destructive/70" />
        </div>
        <dl className="flex gap-3">
          <div className="flex flex-1 flex-col gap-0.5"><dt className="font-mono text-xs text-primary">EN VIAJES</dt>
            <dd className="font-mono text-2xl font-semibold tabular-nums text-foreground">{fmtHM(stats.tripSeconds)}</dd>
            <dd className="font-mono text-xs text-muted-foreground">{tripShare}% del turno</dd></div>
          <div className="flex flex-1 flex-col gap-0.5"><dt className="font-mono text-xs text-destructive">TIEMPO PERDIDO</dt>
            <dd className="font-mono text-2xl font-semibold tabular-nums text-foreground">{fmtHM(wasted)}</dd>
            <dd className="font-mono text-xs text-muted-foreground">{fmtSoles((wasted / 3600) * config.idealRate)} en costo</dd></div>
        </dl>
      </section>
      <section className="flex flex-col divide-y divide-border rounded-2xl bg-card px-5">
        {[{ label: 'Tiempo total', value: fmtHM(stats.elapsedSeconds) },
          { label: 'Viajes', value: String(stats.trips.length) },
          { label: 'Brutos', value: fmtSoles(stats.earnings, 0) },
          { label: 'Gastos', value: `−${fmtSoles(stats.expensesTotal, 0)}` },
          { label: 'Ritmo', value: `${fmtRate(stats.rate)} S//h` },
        ].map((r) => (<div key={r.label} className="flex items-center justify-between gap-4 py-4">
          <span className="text-base text-muted-foreground">{r.label}</span>
          <span className="font-mono text-base font-semibold tabular-nums text-foreground">{r.value}</span></div>))}
      </section>
      <div className="flex flex-col gap-2">
        {onBackToGPS ? <button type="button" onClick={onBackToGPS}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground">
          <TrendingUp className="size-5" /> Ver mi GPS Financiero</button> : null}
        {onReopen ? <button type="button" onClick={onReopen}
          className="flex items-center justify-center gap-2 rounded-xl bg-warning/15 py-3.5 text-sm font-semibold text-warning">
          <ArrowLeft className="size-4" /> Volver al turno (seguir con las carreras)</button> : null}
        <button type="button" onClick={onNewShift}
          className={cn('flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-medium',
            onBackToGPS ? 'bg-card text-muted-foreground' : 'bg-primary py-4 text-base font-semibold text-primary-foreground')}>
          <RotateCcw className="size-4" /> Resetear turno</button>
        {onOpenHistory ? <button type="button" onClick={onOpenHistory}
          className="flex items-center justify-center gap-2 rounded-xl bg-card py-3.5 text-sm font-medium text-muted-foreground">
          <History className="size-4" /> Ver historial</button> : null}
      </div>
    </main>
  )
}
