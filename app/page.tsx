'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActionBar } from '@/components/action-bar'
import { ExpenseStrip } from '@/components/expense-strip'
import { HeroSignal } from '@/components/hero-signal'
import { KeypadSheet, type KeypadMode } from '@/components/keypad-sheet'
import { PlanSheet } from '@/components/plan-sheet'
import { ShiftSummary } from '@/components/shift-summary'
import { ShiftTopbar } from '@/components/shift-topbar'
import { TripList } from '@/components/trip-list'
import {
  computeStats,
  initialShift,
  uid,
  type Segment,
  type ShiftConfig,
  type ShiftState,
} from '@/lib/shift'

export default function Page() {
  const [shift, setShift] = useState<ShiftState>(initialShift)
  // El reloj arranca en null: los cálculos dependen de la hora local del
  // conductor, que no coincide con la del servidor durante el render inicial.
  const [now, setNow] = useState<number | null>(null)
  const [keypad, setKeypad] = useState<KeypadMode | null>(null)
  const [planOpen, setPlanOpen] = useState(false)

  useEffect(() => {
    setNow(Date.now())
  }, [])

  useEffect(() => {
    if (shift.status !== 'running') return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [shift.status])

  const stats = useMemo(() => computeStats(shift, now ?? 0), [shift, now])

  /** Cierra el segmento abierto y abre uno nuevo del tipo indicado */
  const switchSegment = useCallback((kind: Segment['kind'], amount?: number) => {
    const at = Date.now()
    setNow(at)
    setShift((prev) => ({
      ...prev,
      segments: [
        ...prev.segments.map((segment) =>
          segment.end === null ? { ...segment, end: at, amount: amount ?? segment.amount } : segment,
        ),
        { id: uid(), kind, start: at, end: null },
      ],
    }))
  }, [])

  const startShift = useCallback(() => {
    const at = Date.now()
    setNow(at)
    setShift((prev) => ({
      ...prev,
      status: 'running',
      startedAt: at,
      endedAt: null,
      segments: [{ id: uid(), kind: 'wait', start: at, end: null }],
      expenses: [],
    }))
  }, [])

  const endShift = useCallback(() => {
    const at = Date.now()
    setNow(at)
    setShift((prev) => ({
      ...prev,
      status: 'ended',
      endedAt: at,
      segments: prev.segments.map((segment) =>
        segment.end === null ? { ...segment, end: at } : segment,
      ),
    }))
  }, [])

  const togglePause = useCallback(() => {
    switchSegment(stats.current?.kind === 'pause' ? 'wait' : 'pause')
  }, [stats.current?.kind, switchSegment])

  function handleKeypadSubmit(amount: number, label?: string) {
    if (keypad === 'trip') {
      switchSegment('wait', amount)
    } else {
      setShift((prev) => ({
        ...prev,
        expenses: [...prev.expenses, { id: uid(), label: label ?? 'Otro', amount, at: Date.now() }],
      }))
    }
    setKeypad(null)
  }

  function saveConfig(config: ShiftConfig) {
    setShift((prev) => ({ ...prev, config }))
    setPlanOpen(false)
  }

  // Primer render (servidor y cliente antes de montar): estructura sin valores
  // de reloj, para que la hidratación coincida siempre.
  if (now === null) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 pt-6 pb-4">
          <div className="h-16 animate-pulse rounded-lg bg-muted/40" />
          <div className="h-56 animate-pulse rounded-3xl bg-muted/40" />
          <div className="h-24 animate-pulse rounded-2xl bg-muted/30" />
          <span className="sr-only">Cargando tu turno</span>
        </main>
      </div>
    )
  }

  if (shift.status === 'ended') {
    return (
      <>
        <ShiftSummary
          stats={stats}
          config={shift.config}
          onNewShift={() => setShift({ ...initialShift, config: shift.config })}
        />
        <PlanSheet
          open={planOpen}
          config={shift.config}
          onClose={() => setPlanOpen(false)}
          onSave={saveConfig}
        />
      </>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 pt-6 pb-4">
        <ShiftTopbar stats={stats} goal={shift.config.goal} endTime={shift.config.endTime} />
        <HeroSignal stats={stats} goal={shift.config.goal} />
        <TripList trips={stats.trips} earnings={stats.earnings} />
        <ExpenseStrip
          expenses={shift.expenses}
          total={stats.expensesTotal}
          onAdd={() => setKeypad('expense')}
          disabled={shift.status !== 'running'}
        />
      </main>

      <div className="sticky bottom-0 mx-auto w-full max-w-md">
        <ActionBar
          status={shift.status}
          stats={stats}
          onStartShift={startShift}
          onStartTrip={() => switchSegment('trip')}
          onEndTrip={() => setKeypad('trip')}
          onTogglePause={togglePause}
          onEndShift={endShift}
          onOpenSettings={() => setPlanOpen(true)}
        />
      </div>

      <KeypadSheet
        mode={keypad}
        title={keypad === 'trip' ? '¿Cuánto cobraste?' : 'Nuevo gasto'}
        subtitle={
          keypad === 'trip'
            ? 'Cierra la carrera con el monto real recibido.'
            : 'Se resta del neto del día.'
        }
        onClose={() => setKeypad(null)}
        onSubmit={handleKeypadSubmit}
      />

      <PlanSheet
        open={planOpen}
        config={shift.config}
        onClose={() => setPlanOpen(false)}
        onSave={saveConfig}
      />
    </div>
  )
}
