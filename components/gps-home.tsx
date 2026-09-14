'use client'

import { History, Play, Settings, TrendingUp } from 'lucide-react'
import { fmtSoles } from '@/lib/shift'
import { buildCalendar, type GPSConfig } from '@/lib/gps'
import { type ClosedDay } from '@/lib/storage'
import { cn } from '@/lib/utils'

interface GPSHomeProps {
  gpsConfig: GPSConfig
  history: ClosedDay[]
  onStartShift: () => void
  onOpenSetup: () => void
  onOpenHistory: () => void
  shiftActive?: boolean
}

export function GPSHome({
  gpsConfig, history, onStartShift, onOpenSetup, onOpenHistory, shiftActive,
}: GPSHomeProps) {
  const { days, balance } = buildCalendar(gpsConfig, history, 14)
  const balanceNeg = balance < 0
  const lastDay = days[days.length - 1]
  const projectedBalance = lastDay ? lastDay.balanceAfterObs : balance
  const projectedNeg = projectedBalance < 0
  const lastDate = lastDay ? lastDay.date : new Date()
  const projLabel = `${lastDate.getDate()}/${lastDate.getMonth() + 1}`

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 pt-5 pb-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          <span className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground">GPS FINANCIERO</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onOpenHistory} aria-label="Historial"
            className="rounded-full p-2 text-muted-foreground hover:text-foreground">
            <History className="size-4" />
          </button>
          <button type="button" onClick={onOpenSetup} aria-label="Configurar"
            className="rounded-full p-2 text-muted-foreground hover:text-foreground">
            <Settings className="size-4" />
          </button>
        </div>
      </div>

      {/* Saldo hoy + proyectado */}
      <section className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-2xl bg-card p-4">
          <span className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground">SALDO HOY</span>
          <span className={cn('font-mono text-2xl font-semibold tabular-nums', balanceNeg ? 'text-destructive' : 'text-primary')}>
            {fmtSoles(balance, 0)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl bg-card p-4">
          <span className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground">AL {projLabel}</span>
          <span className={cn('font-mono text-2xl font-semibold tabular-nums', projectedNeg ? 'text-destructive' : 'text-foreground')}>
            {fmtSoles(projectedBalance, 0)}
          </span>
        </div>
      </section>

      {/* Calendario-proyección */}
      <section className="flex flex-col gap-2">
        <span className="text-sm font-bold tracking-wide text-[#a855f7]">PROYECCIÓN</span>
        <div className="flex flex-col overflow-hidden rounded-xl bg-card">
          {days.map((r, idx) => (
            <div key={r.key}>
              {/* Línea del ingreso del día */}
              <div className={cn(
                'flex items-center gap-1 px-3 py-1.5',
                r.isToday && 'bg-primary/5',
                idx > 0 && 'border-t border-border',
              )}>
                <span className={cn(
                  'w-14 shrink-0 whitespace-nowrap font-mono text-[13px] tabular-nums',
                  r.isToday ? 'font-bold text-primary' : 'text-muted-foreground',
                )}>
                  {r.isToday ? 'HOY' : r.label}
                </span>
                <span className={cn(
                  'w-16 shrink-0 text-right font-mono text-sm font-semibold tabular-nums',
                  r.actualNet !== null
                    ? r.actualNet < 0 ? 'text-destructive' : 'text-primary'
                    : 'text-foreground/30',
                )}>
                  {r.isToday && r.actualNet === null
                    ? '—'
                    : r.actualNet !== null
                      ? `${r.actualNet >= 0 ? '+' : ''}${fmtSoles(r.actualNet, 0)}`
                      : `+${fmtSoles(r.dayNet, 0)}`}
                </span>
                <span className="flex-1" />
                <span className={cn(
                  'font-mono text-sm tabular-nums',
                  r.balanceAfterIncome < 0 ? 'text-destructive' : 'text-muted-foreground',
                )}>
                  {fmtSoles(r.balanceAfterIncome, 0)}
                </span>
              </div>

              {/* Líneas de obligaciones (debajo, sangradas, restando) */}
              {r.obligations.map((ob, oi) => (
                <div key={oi} className={cn('flex items-center gap-1 px-3 py-1', r.isToday && 'bg-primary/5')}>
                  <span className="w-14 shrink-0" />
                  <span className="flex-1 truncate font-mono text-sm text-warning">
                    −{fmtSoles(ob.amount, 0)} {ob.name}
                  </span>
                  <span className={cn(
                    'font-mono text-sm tabular-nums',
                    r.balanceAfterObs < 0 ? 'text-destructive' : 'text-muted-foreground',
                  )}>
                    {fmtSoles(r.balanceAfterObs, 0)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Botón */}
      <div className="mt-auto pt-2">
        <button type="button" onClick={onStartShift}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-semibold',
            shiftActive
              ? 'bg-warning text-warning-foreground'
              : 'bg-primary text-primary-foreground',
          )}>
          <Play className="size-4" />
          {shiftActive ? 'Volver al turno' : 'Iniciar turno'}
        </button>
      </div>
    </main>
  )
}
