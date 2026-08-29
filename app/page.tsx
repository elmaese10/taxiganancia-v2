'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  EXPENSE_LABELS,
  initialShift,
  uid,
  type Segment,
  type ShiftConfig,
  type ShiftState,
} from '@/lib/shift'
import {
  appendClosedDay,
  closedDayFromShift,
  enablePersistence,
  loadPersisted,
  mergeExpenseLabels,
  persistConfig,
  persistHistory,
  persistLabels,
  persistShift,
  type ClosedDay,
} from '@/lib/storage'

const AUTOSAVE_MS = 4000

export default function Page() {
  const [shift, setShift] = useState<ShiftState>(initialShift)
  const [now, setNow] = useState<number | null>(null)
  const [keypad, setKeypad] = useState<KeypadMode | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [expenseLabels, setExpenseLabels] = useState<string[]>([...EXPENSE_LABELS])
  const [history, setHistory] = useState<ClosedDay[]>([])

  const shiftRef = useRef(shift)
  const historyRef = useRef(history)
  const labelsRef = useRef(expenseLabels)
  shiftRef.current = shift
  historyRef.current = history
  labelsRef.current = expenseLabels

  useLayoutEffect(() => {
    let live = true
    void loadPersisted().then((persisted) => {
      if (!live) return
      setShift(persisted.shift)
      setExpenseLabels(persisted.labels)
      setHistory(persisted.history)
      enablePersistence()
      setNow(Date.now())
    })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (shift.status !== 'running') return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [shift.status])

  useEffect(() => {
    if (now === null) return
    enablePersistence()

    const flush = () => {
      persistShift(shiftRef.current)
      persistConfig(shiftRef.current.config)
      persistLabels(labelsRef.current)
      persistHistory(historyRef.current)
    }

    const id = window.setInterval(flush, AUTOSAVE_MS)
    const onHide = () => flush()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide()
    }
    window.addEventListener('pagehide', onHide)
    window.addEventListener('beforeunload', onHide)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(id)
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('beforeunload', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [now])

  const stats = useMemo(() => computeStats(shift, now ?? 0), [shift, now])

  const commitShift = useCallback(
    (updater: (prev: ShiftState) => ShiftState, allowReset = false) => {
      setShift((prev) => {
        const next = updater(prev)
        persistShift(next, { allowReset })
        persistConfig(next.config)
        shiftRef.current = next
        return next
      })
    },
    [],
  )

  const switchSegment = useCallback(
    (kind: Segment['kind'], amount?: number) => {
      const at = Date.now()
      setNow(at)
      commitShift((prev) => ({
        ...prev,
        segments: [
          ...prev.segments.map((segment) =>
            segment.end === null ? { ...segment, end: at, amount: amount ?? segment.amount } : segment,
          ),
          { id: uid(), kind, start: at, end: null },
        ],
      }))
    },
    [commitShift],
  )

  const startShift = useCallback(() => {
    const at = Date.now()
    setNow(at)
    commitShift((prev) => ({
      ...prev,
      status: 'running',
      startedAt: at,
      endedAt: null,
      segments: [{ id: uid(), kind: 'wait', start: at, end: null }],
      expenses: [],
    }))
  }, [commitShift])

  const endShift = useCallback(() => {
    const at = Date.now()
    setNow(at)
    commitShift((prev) => {
      if (prev.status === 'ended') return prev
      const next: ShiftState = {
        ...prev,
        status: 'ended',
        endedAt: at,
        segments: prev.segments.map((segment) =>
          segment.end === null ? { ...segment, end: at } : segment,
        ),
      }
      const nextHistory = appendClosedDay(historyRef.current, closedDayFromShift(next, at))
      historyRef.current = nextHistory
      persistHistory(nextHistory)
      setHistory(nextHistory)
      return next
    })
  }, [commitShift])

  const togglePause = useCallback(() => {
    switchSegment(stats.current?.kind === 'pause' ? 'wait' : 'pause')
  }, [stats.current?.kind, switchSegment])

  function rememberLabel(label: string) {
    const next = mergeExpenseLabels(labelsRef.current, [label])
    labelsRef.current = next
    setExpenseLabels(next)
    persistLabels(next)
  }

  function handleKeypadSubmit(amount: number, label?: string) {
    if (keypad === 'trip') {
      switchSegment('wait', amount)
    } else {
      const expenseLabel = label?.trim() || 'Otro'
      rememberLabel(expenseLabel)
      commitShift((prev) => ({
        ...prev,
        expenses: [...prev.expenses, { id: uid(), label: expenseLabel, amount, at: Date.now() }],
      }))
    }
    setKeypad(null)
  }

  function saveConfig(config: ShiftConfig) {
    persistConfig(config)
    commitShift((prev) => ({ ...prev, config }))
    setPlanOpen(false)
  }

  function startNewShift() {
    commitShift(() => ({ ...initialShift, config: shift.config }), true)
  }

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
        <ShiftSummary stats={stats} config={shift.config} onNewShift={startNewShift} />
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
        labels={expenseLabels}
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
