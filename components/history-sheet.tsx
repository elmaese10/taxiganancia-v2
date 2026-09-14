'use client'

import { History, X } from 'lucide-react'
import { useState } from 'react'
import { fmtHM, fmtSoles } from '@/lib/shift'
import { dailyBuckets, dayLabel, weekLabel, weeklyBuckets, type DayBucket, type WeekBucket } from '@/lib/history-stats'
import { type ClosedDay } from '@/lib/storage'
import { cn } from '@/lib/utils'

interface HistorySheetProps { open: boolean; history: ClosedDay[]; onClose: () => void }
type Tab = 'daily' | 'weekly'

export function HistorySheet({ open, history, onClose }: HistorySheetProps) {
  const [tab, setTab] = useState<Tab>('daily')
  if (!open) return null
  const days = dailyBuckets(history); const weeks = weeklyBuckets(history)
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-background/80 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="flex-1 cursor-default" />
      <div className="flex max-h-[88dvh] flex-col rounded-t-2xl border-t border-border bg-popover">
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
          <div><h2 className="text-lg font-semibold text-foreground">Tu historial</h2>
            <p className="text-sm text-muted-foreground">Lo que cerraste, por día y por semana.</p></div>
          <button type="button" onClick={onClose} className="rounded-full bg-muted p-2 text-muted-foreground hover:text-foreground">
            <X className="size-4" /></button>
        </div>
        <div className="mx-5 grid grid-cols-2 gap-1 rounded-xl bg-card p-1">
          <TabBtn active={tab==='daily'} onClick={() => setTab('daily')}>Diario</TabBtn>
          <TabBtn active={tab==='weekly'} onClick={() => setTab('weekly')}>Semanal</TabBtn>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-8">
          {history.length === 0 ? <Empty /> : tab === 'daily'
            ? <div className="flex flex-col gap-3">{days.map(d => <DayCard key={d.date} bucket={d} />)}</div>
            : <div className="flex flex-col gap-3">{weeks.map(w => <WeekCard key={w.weekStartMs} bucket={w} />)}</div>}
        </div>
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn('rounded-lg py-2 text-sm font-medium',
    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{children}</button>
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className="flex items-center gap-1.5"><span className="tracking-[0.1em]">{label}</span>
    <span className={cn('font-semibold text-foreground', tone)}>{value}</span></div>
}

function progressColor(pct: number) { return pct >= 75 ? 'bg-primary' : pct >= 50 ? 'bg-warning' : 'bg-destructive' }

function DayCard({ bucket }: { bucket: DayBucket }) {
  const label = dayLabel(bucket.date); const met = bucket.goal > 0 && bucket.net >= bucket.goal
  const netNeg = bucket.net < 0; const pct = bucket.goal > 0 ? Math.round((bucket.net / bucket.goal) * 100) : 0
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col"><span className="text-lg font-semibold text-foreground">{label.primary}</span>
          <span className="font-mono text-xs text-muted-foreground">{label.secondary}{bucket.shifts > 1 ? ` · ${bucket.shifts} turnos` : ''}</span></div>
        <div className="flex flex-col items-end"><span className={cn('font-mono text-2xl font-semibold tabular-nums',
          netNeg ? 'text-destructive' : met ? 'text-primary' : 'text-foreground')}>{fmtSoles(bucket.net, 0)}</span>
          <span className="font-mono text-xs text-muted-foreground">{pct}% meta</span></div>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', progressColor(Math.max(0, pct)))}
          style={{ width: `${Math.min(100, Math.max(Math.abs(pct), 2))}%` }} /></div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-sm text-muted-foreground">
        <Stat label="BRUTO" value={fmtSoles(bucket.earnings, 0)} />
        <Stat label="GASTOS" value={`−${fmtSoles(bucket.expenses, 0)}`} tone="text-warning" />
        <Stat label="VIAJES" value={String(bucket.trips)} />
        <Stat label="EN VIAJE" value={fmtHM(bucket.tripSeconds)} />
      </dl>
    </div>
  )
}

function WeekCard({ bucket }: { bucket: WeekBucket }) {
  const label = weekLabel(bucket.weekStartMs, bucket.weekEndMs)
  const netNeg = bucket.net < 0; const avg = bucket.daysWorked > 0 ? bucket.net / bucket.daysWorked : 0
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col"><span className="text-lg font-semibold text-foreground">{label.primary}</span>
          {label.secondary ? <span className="font-mono text-xs text-muted-foreground">{label.secondary}</span> : null}</div>
        <div className="flex flex-col items-end"><span className={cn('font-mono text-2xl font-semibold tabular-nums',
          netNeg ? 'text-destructive' : 'text-foreground')}>{fmtSoles(bucket.net, 0)}</span>
          <span className="font-mono text-xs text-muted-foreground">{bucket.daysWorked} {bucket.daysWorked === 1 ? 'día' : 'días'}</span></div>
      </div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-sm text-muted-foreground">
        <Stat label="BRUTO" value={fmtSoles(bucket.earnings, 0)} />
        <Stat label="GASTOS" value={`−${fmtSoles(bucket.expenses, 0)}`} tone="text-warning" />
        <Stat label="VIAJES" value={String(bucket.trips)} />
        <Stat label="PROM/DÍA" value={fmtSoles(avg, 0)} />
      </dl>
    </div>
  )
}

function Empty() {
  return <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-5 py-12 text-center">
    <History className="size-8 text-muted-foreground/60" />
    <p className="text-sm font-medium text-foreground">Todavía no hay días cerrados</p>
    <p className="text-sm text-muted-foreground text-pretty">Cuando cierres tu primer turno, acá vas a ver el resumen.</p>
  </div>
}
