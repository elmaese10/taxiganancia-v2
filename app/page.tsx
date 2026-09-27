'use client'

import { History, TrendingUp } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ActionBar } from '@/components/action-bar'
import { ExpenseStrip } from '@/components/expense-strip'
import { GPSHome } from '@/components/gps-home'
import { GPSSetupSheet } from '@/components/gps-setup-sheet'
import { HeroSignal } from '@/components/hero-signal'
import { HistorySheet } from '@/components/history-sheet'
import { KeypadSheet, type KeypadMode } from '@/components/keypad-sheet'
import { PlanSheet } from '@/components/plan-sheet'
import { ShiftSummary } from '@/components/shift-summary'
import { ShiftTopbar } from '@/components/shift-topbar'
import { TripActionSheet } from '@/components/trip-action-sheet'
import { TripList } from '@/components/trip-list'
import { DEFAULT_GPS, loadGPS, saveGPS, type GPSConfig } from '@/lib/gps'
import { shortDateLabel, toDateString } from '@/lib/history-stats'
import {
  computeStats,
  EXPENSE_LABELS,
  initialShift,
  uid,
  type Segment,
  type ShiftConfig,
  type ShiftState,
} from '@/lib/shift'
import { type ClosedDay, enablePersistence, loadPersisted, persistShift, closedDayFromShift, appendClosedDay } from '@/lib/storage'

export default function Home() {
  const [shift, setShift] = useState<ShiftState>(initialShift)
  const [now, setNow] = useState<number>(0)
  const [keypad, setKeypad] = useState<KeypadMode | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<ClosedDay[]>([])
  const [gpsConfig, setGpsConfig] = useState<GPSConfig>(DEFAULT_GPS)
  const [gpsSetupOpen, setGpsSetupOpen] = useState(false)
  const [view, setView] = useState<'gps' | 'shift'>('gps')
  const [tripMenu, setTripMenu] = useState<{ trip: Segment; index: number } | null>(null)
  const [editingTripId, setEditingTripId] = useState<string | null>(null)
  const [keypadInitial, setKeypadInitial] = useState('')
  const [expenseLabels, setExpenseLabels] = useState<string[]>([...EXPENSE_LABELS])

  const loadedRef = useRef(false)
  useLayoutEffect(() => {
    if (loadedRef.current) return; loadedRef.current = true
    loadPersisted().then((persisted) => {
      setShift(persisted.shift); setHistory(persisted.history); setGpsConfig(loadGPS())
      enablePersistence(); setNow(Date.now())
      if (persisted.shift.status === 'running') setView('shift')
    })
  }, [])

  useEffect(() => {
    if (!now) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    const onHide = () => persistShift(shift)
    const onVisibility = () => { if (document.visibilityState === 'visible') setNow(Date.now()) }
    window.addEventListener('pagehide', onHide); window.addEventListener('beforeunload', onHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => { window.clearInterval(id); window.removeEventListener('pagehide', onHide); window.removeEventListener('beforeunload', onHide); document.removeEventListener('visibilitychange', onVisibility) }
  }, [now])

  const stats = useMemo(() => computeStats(shift, now ?? 0), [shift, now])

  function handleSaveGPS(config: GPSConfig) { setGpsConfig(config); saveGPS(config) }

  const commitShift = useCallback(
    (updater: (prev: ShiftState) => ShiftState, allowReset = false) => {
      setShift((prev) => { const next = updater(prev); persistShift(next, { allowReset }); return next })
    }, [],
  )

  const saveConfig = useCallback((config: ShiftConfig) => {
    commitShift((prev) => ({ ...prev, config }))
  }, [commitShift])

  const switchSegment = useCallback((kind: Segment['kind'], amount?: number) => {
    const at = Date.now(); setNow(at)
    commitShift((prev) => ({
      ...prev,
      segments: [
        ...prev.segments.map((s) => s.end === null ? { ...s, end: at, amount: s.kind === 'trip' && amount !== undefined ? amount : s.amount } : s),
        { id: uid(), kind, start: at, end: null },
      ],
    }))
  }, [commitShift])

  const startShift = useCallback(() => {
    const at = Date.now(); setNow(at)
    commitShift((prev) => ({ ...prev, status: 'running', startedAt: at, endedAt: null,
      segments: [{ id: uid(), kind: 'wait', start: at, end: null }], expenses: [] }))
  }, [commitShift])

  const endShift = useCallback(() => {
    const at = Date.now(); setNow(at)
    commitShift((prev) => {
      const segments = prev.segments.map((s) => s.end === null ? { ...s, end: at } : s)
      const ended = { ...prev, status: 'ended' as const, endedAt: at, segments }
      const closed = closedDayFromShift(ended, at)
      setHistory((h) => appendClosedDay(h, closed))
      return ended
    })
  }, [commitShift])

  const startNewShift = useCallback(() => {
    commitShift(() => ({ ...initialShift }), true)
  }, [commitShift])

  /** Resetea el turno actual descartando todo sin guardar en historial. Vuelve a estado "listo". */
  const resetShift = useCallback(() => {
    setNow(Date.now())
    commitShift(() => ({
      ...initialShift,
      config: shift.config, // mantiene la configuración actual (meta, hora fin)
    }), true)
  }, [commitShift, shift.config])

  const togglePause = useCallback(() => {
    switchSegment(stats.current?.kind === 'pause' ? 'wait' : 'pause')
  }, [stats.current?.kind, switchSegment])

  const cancelCurrentTrip = useCallback(() => {
    const at = Date.now(); setNow(at)
    commitShift((prev) => ({
      ...prev,
      segments: [
        ...prev.segments.map((s) => s.end === null && s.kind === 'trip' ? { ...s, kind: 'wait' as const, end: at, amount: undefined } : s),
        { id: uid(), kind: 'wait', start: at, end: null },
      ],
    })); setTripMenu(null)
  }, [commitShift])

  const deleteTrip = useCallback((id: string) => {
    commitShift((prev) => ({ ...prev, segments: prev.segments.map((s) => s.id === id ? { ...s, kind: 'wait' as const, amount: undefined } : s) }))
    setTripMenu(null)
  }, [commitShift])

  const editTripAmount = useCallback((id: string, amount: number) => {
    commitShift((prev) => ({ ...prev, segments: prev.segments.map((s) => s.id === id ? { ...s, amount } : s) }))
  }, [commitShift])

  function openTripEditor(trip: Segment) {
    setEditingTripId(trip.id); setKeypadInitial(trip.amount != null ? String(trip.amount) : '')
    setTripMenu(null); setKeypad('trip')
  }

  function rememberLabel(label: string) {
    const known = EXPENSE_LABELS as readonly string[]
    if (!known.includes(label) && !expenseLabels.includes(label))
      setExpenseLabels((prev) => [...prev, label])
  }

  function handleKeypadSubmit(amount: number, label?: string) {
    if (keypad === 'trip') {
      if (editingTripId) editTripAmount(editingTripId, amount); else switchSegment('wait', amount)
    } else {
      const l = label?.trim() || 'Otro'; rememberLabel(l)
      commitShift((prev) => ({ ...prev, expenses: [...prev.expenses, { id: uid(), label: l, amount, at: Date.now() }] }))
    }
    closeKeypad()
  }

  function closeKeypad() { setKeypad(null); setEditingTripId(null); setKeypadInitial('') }

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  if (shift.status === 'ended') {
    return (
      <>
        <ShiftSummary stats={stats} config={shift.config} onOpenHistory={() => setHistoryOpen(true)}
          onNewShift={() => { resetShift(); setView(gpsConfig?.setupComplete ? 'gps' : 'shift') }}
          onBackToGPS={gpsConfig?.setupComplete ? () => { startNewShift(); setView('gps') } : undefined} />
        <PlanSheet open={planOpen} config={shift.config} onClose={() => setPlanOpen(false)} onSave={saveConfig} />
        <HistorySheet open={historyOpen} history={history} onClose={() => setHistoryOpen(false)} />
      </>
    )
  }

  if (view === 'gps' && gpsConfig?.setupComplete) {
    const shiftRunning = shift.status === 'running'
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <GPSHome gpsConfig={gpsConfig} history={history} shiftActive={shiftRunning}
          onStartShift={() => { if (!shiftRunning) startShift(); setView('shift') }}
          onOpenSetup={() => setGpsSetupOpen(true)} onOpenHistory={() => setHistoryOpen(true)} />
        <HistorySheet open={historyOpen} history={history} onClose={() => setHistoryOpen(false)} />
        <GPSSetupSheet open={gpsSetupOpen} config={gpsConfig} onClose={() => setGpsSetupOpen(false)} onSave={handleSaveGPS} />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 pt-6 pb-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground">{shortDateLabel(toDateString(now))}</span>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => gpsConfig.setupComplete ? setView('gps') : setGpsSetupOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-[#a855f7]/15 px-3 py-1.5 font-mono text-[11px] tracking-wide text-[#a855f7] hover:bg-[#a855f7]/25">
              <TrendingUp className="size-3.5" /> GPS</button>
            <button type="button" onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-mono text-[11px] tracking-wide text-muted-foreground hover:text-foreground">
              <History className="size-3.5" /> HISTORIAL</button>
          </div>
        </div>
        <ShiftTopbar stats={stats} goal={shift.config.goal} endTime={shift.config.endTime} />

        <HeroSignal stats={stats} goal={shift.config.goal} onCancelTrip={cancelCurrentTrip} />
        <TripList trips={stats.trips} earnings={stats.earnings} onSelectTrip={(t, i) => setTripMenu({ trip: t, index: i })} />
        <ExpenseStrip expenses={shift.expenses} total={stats.expensesTotal} onAdd={() => setKeypad('expense')} />
      </main>
      <div className="sticky bottom-0 mx-auto w-full max-w-md">
        <ActionBar status={shift.status} stats={stats}
          onStartShift={() => { startShift(); setView('shift') }}
          onStartTrip={() => switchSegment('trip')} onEndTrip={() => setKeypad('trip')}
          onTogglePause={togglePause} onEndShift={endShift} onOpenSettings={() => setPlanOpen(true)} />
      </div>
      <KeypadSheet mode={keypad} labels={expenseLabels} initialValue={keypadInitial}
        title={keypad === 'trip' ? (editingTripId ? 'Corregir el monto' : '¿Cuánto cobraste?') : 'Nuevo gasto'}
        subtitle={keypad === 'trip' ? (editingTripId ? 'Escribe el monto correcto.' : 'Cierra la carrera con el monto real.') : 'Se resta del neto del día.'}
        submitLabel={keypad === 'trip' && editingTripId ? 'Guardar monto' : undefined}
        onClose={closeKeypad} onSubmit={handleKeypadSubmit} />
      <TripActionSheet trip={tripMenu?.trip ?? null} index={tripMenu?.index ?? null}
        onEdit={openTripEditor} onDelete={(t) => deleteTrip(t.id)} onClose={() => setTripMenu(null)} />
      <PlanSheet open={planOpen} config={shift.config} onClose={() => setPlanOpen(false)} onSave={saveConfig} />
      <HistorySheet open={historyOpen} history={history} onClose={() => setHistoryOpen(false)} />
      <GPSSetupSheet open={gpsSetupOpen} config={gpsConfig} onClose={() => setGpsSetupOpen(false)} onSave={handleSaveGPS} />
    </div>
  )
}
