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
import { loadGPS, saveGPS, type GPSConfig } from '@/lib/gps'
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
  const [historyOpen, setHistoryOpen] = useState(false)
  const [tripMenu, setTripMenu] = useState<{ trip: Segment; index: number } | null>(null)
  const [editingTripId, setEditingTripId] = useState<string | null>(null)
  const [keypadInitial, setKeypadInitial] = useState('')
  const [expenseLabels, setExpenseLabels] = useState<string[]>([...EXPENSE_LABELS])
  const [history, setHistory] = useState<ClosedDay[]>([])
  const [gpsConfig, setGpsConfig] = useState<GPSConfig | null>(null)
  const [gpsSetupOpen, setGpsSetupOpen] = useState(false)
  /** 'gps' = pantalla principal GPS, 'shift' = modo turno */
  const [view, setView] = useState<'gps' | 'shift'>('gps')

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
      setGpsConfig(loadGPS())
      enablePersistence()
      setNow(Date.now())
      // Si hay turno activo, ir directo al modo turno
      if (persisted.shift.status === 'running') {
        setView('shift')
      }
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

  function handleSaveGPS(config: GPSConfig) {
    setGpsConfig(config)
    saveGPS(config)
  }

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

  // El cliente canceló al llegar: el viaje en curso se descarta. El tiempo que
  // manejaste yendo a recoger queda como espera, y arranca un tramo de espera nuevo.
  const cancelCurrentTrip = useCallback(() => {
    const at = Date.now()
    setNow(at)
    commitShift((prev) => ({
      ...prev,
      segments: [
        ...prev.segments.map((s) =>
          s.end === null && s.kind === 'trip'
            ? { ...s, kind: 'wait' as const, end: at, amount: undefined }
            : s,
        ),
        { id: uid(), kind: 'wait', start: at, end: null },
      ],
    }))
    setTripMenu(null)
  }, [commitShift])

  // Eliminar una carrera ya registrada: sale del total y del conteo; su tiempo pasa a espera.
  const deleteTrip = useCallback(
    (id: string) => {
      commitShift((prev) => ({
        ...prev,
        segments: prev.segments.map((s) =>
          s.id === id ? { ...s, kind: 'wait' as const, amount: undefined } : s,
        ),
      }))
      setTripMenu(null)
    },
    [commitShift],
  )

  const editTripAmount = useCallback(
    (id: string, amount: number) => {
      commitShift((prev) => ({
        ...prev,
        segments: prev.segments.map((s) => (s.id === id ? { ...s, amount } : s)),
      }))
    },
    [commitShift],
  )

  function openTripEditor(trip: Segment) {
    setEditingTripId(trip.id)
    setKeypadInitial(trip.amount != null ? String(trip.amount) : '')
    setTripMenu(null)
    setKeypad('trip')
  }

  function rememberLabel(label: string) {
    const next = mergeExpenseLabels(labelsRef.current, [label])
    labelsRef.current = next
    setExpenseLabels(next)
    persistLabels(next)
  }

  function handleKeypadSubmit(amount: number, label?: string) {
    if (keypad === 'trip') {
      if (editingTripId) {
        editTripAmount(editingTripId, amount)
      } else {
        switchSegment('wait', amount)
      }
    } else {
      const expenseLabel = label?.trim() || 'Otro'
      rememberLabel(expenseLabel)
      commitShift((prev) => ({
        ...prev,
        expenses: [...prev.expenses, { id: uid(), label: expenseLabel, amount, at: Date.now() }],
      }))
    }
    closeKeypad()
  }

  function closeKeypad() {
    setKeypad(null)
    setEditingTripId(null)
    setKeypadInitial('')
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
        <ShiftSummary
          stats={stats}
          config={shift.config}
          onNewShift={() => {
            startNewShift()
            setView('shift')
          }}
          onOpenHistory={() => setHistoryOpen(true)}
          onBackToGPS={() => {
            startNewShift()
            setView('gps')
          }}
        />
        <PlanSheet
          open={planOpen}
          config={shift.config}
          onClose={() => setPlanOpen(false)}
          onSave={saveConfig}
        />
        <HistorySheet open={historyOpen} history={history} onClose={() => setHistoryOpen(false)} />
      </>
    )
  }

  // ─── GPS HOME ───────────────────────────────────────────────────────────────
  if (view === 'gps' && gpsConfig?.setupComplete) {
    const shiftIsRunning = shift.status === 'running'
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <GPSHome
          gpsConfig={gpsConfig}
          history={history}
          onStartShift={() => {
            if (!shiftIsRunning) startShift()
            setView('shift')
          }}
          onOpenSetup={() => setGpsSetupOpen(true)}
          onOpenHistory={() => setHistoryOpen(true)}
          shiftActive={shiftIsRunning}
        />

        <HistorySheet open={historyOpen} history={history} onClose={() => setHistoryOpen(false)} />
        <GPSSetupSheet
          open={gpsSetupOpen}
          config={gpsConfig}
          onClose={() => setGpsSetupOpen(false)}
          onSave={handleSaveGPS}
        />
      </div>
    )
  }

  // ─── SHIFT MODE ─────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 pt-6 pb-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground">
            {shortDateLabel(toDateString(now))}
          </span>
          <div className="flex items-center gap-1.5">
            {gpsConfig?.setupComplete ? (
              <button
                type="button"
                onClick={() => setView('gps')}
                aria-label="Ver GPS Financiero"
                className="flex items-center gap-1.5 rounded-full bg-[#a855f7]/15 px-3 py-1.5 font-mono text-[11px] tracking-wide text-[#a855f7] transition-colors hover:bg-[#a855f7]/25"
              >
                <TrendingUp className="size-3.5" aria-hidden="true" />
                GPS
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-label="Ver historial"
              className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-mono text-[11px] tracking-wide text-muted-foreground transition-colors hover:text-foreground"
            >
              <History className="size-3.5" aria-hidden="true" />
              HISTORIAL
            </button>
          </div>
        </div>
        <ShiftTopbar stats={stats} goal={shift.config.goal} endTime={shift.config.endTime} />
        <HeroSignal stats={stats} goal={shift.config.goal} onCancelTrip={cancelCurrentTrip} />
        <TripList
          trips={stats.trips}
          earnings={stats.earnings}
          onSelectTrip={(trip, index) => setTripMenu({ trip, index })}
        />
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
          onStartShift={() => {
            startShift()
            setView('shift')
          }}
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
        initialValue={keypadInitial}
        title={
          keypad === 'trip'
            ? editingTripId
              ? 'Corregir el monto'
              : '¿Cuánto cobraste?'
            : 'Nuevo gasto'
        }
        subtitle={
          keypad === 'trip'
            ? editingTripId
              ? 'Escribe el monto correcto de esta carrera.'
              : 'Cierra la carrera con el monto real recibido.'
            : 'Se resta del neto del día.'
        }
        submitLabel={keypad === 'trip' && editingTripId ? 'Guardar monto' : undefined}
        onClose={closeKeypad}
        onSubmit={handleKeypadSubmit}
      />

      <TripActionSheet
        trip={tripMenu?.trip ?? null}
        index={tripMenu?.index ?? null}
        onEdit={openTripEditor}
        onDelete={(trip) => deleteTrip(trip.id)}
        onClose={() => setTripMenu(null)}
      />

      <PlanSheet
        open={planOpen}
        config={shift.config}
        onClose={() => setPlanOpen(false)}
        onSave={saveConfig}
      />

      <HistorySheet open={historyOpen} history={history} onClose={() => setHistoryOpen(false)} />

      {gpsConfig ? (
        <GPSSetupSheet
          open={gpsSetupOpen}
          config={gpsConfig}
          onClose={() => setGpsSetupOpen(false)}
          onSave={handleSaveGPS}
        />
      ) : null}
    </div>
  )
}
