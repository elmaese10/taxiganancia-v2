export type SegmentKind = 'trip' | 'wait' | 'pause'

export interface Segment {
  id: string
  kind: SegmentKind
  start: number
  end: number | null
  amount?: number
}

export interface Expense {
  id: string
  label: string
  amount: number
  at: number
}

export interface ShiftConfig {
  /** Meta neta del día en soles */
  goal: number
  /** Tarifa ideal S/ por hora: define el "costo" de cada minuto de espera */
  idealRate: number
  /** Hora de fin del turno en formato HH:MM (24h) */
  endTime: string
}

export type ShiftStatus = 'idle' | 'running' | 'ended'

export interface ShiftState {
  status: ShiftStatus
  startedAt: number | null
  endedAt: number | null
  segments: Segment[]
  expenses: Expense[]
  config: ShiftConfig
}

export const EXPENSE_LABELS = ['GNV', 'Comida', 'Cochera', 'Recarga', 'Peaje', 'Otro'] as const

export const DEFAULT_CONFIG: ShiftConfig = {
  goal: 180,
  idealRate: 25,
  endTime: '21:30',
}

export const initialShift: ShiftState = {
  status: 'idle',
  startedAt: null,
  endedAt: null,
  segments: [],
  expenses: [],
  config: DEFAULT_CONFIG,
}

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export function segmentSeconds(segment: Segment, now: number) {
  return Math.max(0, ((segment.end ?? now) - segment.start) / 1000)
}

export function sumSeconds(segments: Segment[], kind: SegmentKind, now: number) {
  return segments
    .filter((s) => s.kind === kind)
    .reduce((total, s) => total + segmentSeconds(s, now), 0)
}

/** Horas que faltan hasta la hora de fin configurada (mínimo 0) */
export function hoursUntilEnd(endTime: string, now: number) {
  const [hh, mm] = endTime.split(':').map(Number)
  const target = new Date(now)
  target.setHours(hh || 0, mm || 0, 0, 0)
  return Math.max(0, (target.getTime() - now) / 3_600_000)
}

export type Mood = 'idle' | 'trip' | 'wait' | 'losing' | 'paused' | 'ended'

/** Minutos de gracia buscando carrera antes de que la interfaz pase a alerta roja */
export const WAIT_GRACE_MINUTES = 5

export interface ShiftStats {
  current: Segment | null
  currentSeconds: number
  elapsedSeconds: number
  tripSeconds: number
  waitSeconds: number
  pauseSeconds: number
  workedSeconds: number
  trips: Segment[]
  earnings: number
  expensesTotal: number
  net: number
  /** Soles por hora reales sobre tiempo trabajado */
  rate: number
  goalProgress: number
  remaining: number
  hoursLeft: number
  /** S/ por hora que necesitas de aquí al fin del turno */
  neededRate: number
  /** Soles quemados en la espera actual, al costo de la tarifa ideal */
  burned: number
  onPace: boolean
  mood: Mood
  message: string
  hint: string
}

export function computeStats(shift: ShiftState, now: number): ShiftStats {
  const { segments, expenses, config, status, startedAt, endedAt } = shift
  const clock = status === 'ended' && endedAt ? endedAt : now

  const current = status === 'running' ? (segments.find((s) => s.end === null) ?? null) : null
  const currentSeconds = current ? segmentSeconds(current, clock) : 0

  const tripSeconds = sumSeconds(segments, 'trip', clock)
  const waitSeconds = sumSeconds(segments, 'wait', clock)
  const pauseSeconds = sumSeconds(segments, 'pause', clock)
  const elapsedSeconds = startedAt ? Math.max(0, (clock - startedAt) / 1000) : 0
  const workedSeconds = tripSeconds + waitSeconds

  const trips = segments.filter((s) => s.kind === 'trip' && s.end !== null)
  const earnings = trips.reduce((total, s) => total + (s.amount ?? 0), 0)
  const expensesTotal = expenses.reduce((total, e) => total + e.amount, 0)
  const net = earnings - expensesTotal

  const rate = workedSeconds > 10 ? earnings / (workedSeconds / 3600) : 0
  const remaining = Math.max(0, config.goal - net)
  const goalProgress = config.goal > 0 ? Math.min(1, Math.max(0, net / config.goal)) : 0
  const hoursLeft = hoursUntilEnd(config.endTime, clock)
  const neededRate = hoursLeft > 0.05 ? remaining / hoursLeft : remaining > 0 ? Infinity : 0

  const burned = current?.kind === 'wait' ? (currentSeconds / 3600) * config.idealRate : 0
  const onPace = remaining === 0 || (rate > 0 && rate >= neededRate)

  let mood: Mood = 'idle'
  let message = 'Presiona iniciar para arrancar el turno'
  let hint = `Meta de hoy S/ ${config.goal} · fin ${config.endTime}`

  if (status === 'ended') {
    mood = 'ended'
    message = remaining === 0 ? 'Meta cumplida' : `Cerraste S/ ${remaining.toFixed(0)} abajo de la meta`
    hint = 'Turno cerrado'
  } else if (current?.kind === 'trip') {
    mood = 'trip'
    message = 'En viaje, estás generando'
    hint = onPace ? 'Vas al ritmo de la meta' : `Necesitas S/ ${fmtRate(neededRate)}/h para llegar`
  } else if (current?.kind === 'pause') {
    mood = 'paused'
    message = 'Turno en pausa'
    hint = 'El reloj de espera está detenido'
  } else if (current?.kind === 'wait') {
    const mins = currentSeconds / 60
    if (mins >= WAIT_GRACE_MINUTES) {
      mood = 'losing'
      message = 'Estás perdiendo plata parado'
      hint = `Muévete de zona: ya son S/ ${burned.toFixed(2)} quemados`
    } else {
      mood = 'wait'
      message = onPace ? 'Buscando carrera, vas bien' : 'Buscando carrera, vas atrasado'
      hint =
        remaining === 0
          ? 'Meta cumplida, todo lo que sigue es extra'
          : `Te falta S/ ${remaining.toFixed(0)} · tienes ${Math.max(0, Math.ceil(WAIT_GRACE_MINUTES - mins))} min antes de la alerta`
    }
  } else if (status === 'running') {
    mood = 'wait'
  }

  return {
    current,
    currentSeconds,
    elapsedSeconds,
    tripSeconds,
    waitSeconds,
    pauseSeconds,
    workedSeconds,
    trips,
    earnings,
    expensesTotal,
    net,
    rate,
    goalProgress,
    remaining,
    hoursLeft,
    neededRate,
    burned,
    onPace,
    mood,
    message,
    hint,
  }
}

export function fmtRate(value: number) {
  if (!Number.isFinite(value)) return '—'
  return value >= 100 ? value.toFixed(0) : value.toFixed(1)
}

export function fmtSoles(value: number, decimals = 2) {
  return `S/ ${value.toFixed(decimals)}`
}

export function fmtClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function fmtShort(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function fmtHours(totalSeconds: number) {
  const hours = totalSeconds / 3600
  return `${hours.toFixed(1)} h`
}
