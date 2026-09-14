import { type ClosedDay } from '@/lib/storage'

export interface DayBucket {
  date: string
  net: number
  earnings: number
  expenses: number
  trips: number
  workedSeconds: number
  tripSeconds: number
  waitSeconds: number
  pauseSeconds: number
  goal: number
  shifts: number
  endedAt: number
}

export interface WeekBucket {
  weekStartMs: number
  weekEndMs: number
  net: number
  earnings: number
  expenses: number
  trips: number
  workedSeconds: number
  daysWorked: number
  goalTotal: number
}

const DIAS_CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const DAY_MS = 86_400_000

function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y || 1970, (m || 1) - 1, d || 1)
}

function startOfDay(input: Date): Date {
  const d = new Date(input); d.setHours(0, 0, 0, 0); return d
}

export function weekStart(input: Date): Date {
  const d = startOfDay(input)
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return d
}

export function toDateString(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function shortDateLabel(date: string): string {
  const d = parseLocalDate(date)
  return `${DIAS_CORTO[d.getDay()]} ${d.getDate()} ${MESES_CORTO[d.getMonth()]}`.toUpperCase()
}

export function dayLabel(date: string, now = Date.now()): { primary: string; secondary: string } {
  const d = parseLocalDate(date)
  const diffDays = Math.round((startOfDay(d).getTime() - startOfDay(new Date(now)).getTime()) / DAY_MS)
  const fecha = `${d.getDate()} ${MESES_CORTO[d.getMonth()]}`
  if (diffDays === 0) return { primary: 'Hoy', secondary: fecha }
  if (diffDays === -1) return { primary: 'Ayer', secondary: fecha }
  const nombre = DIAS[d.getDay()]
  return { primary: nombre.charAt(0).toUpperCase() + nombre.slice(1), secondary: fecha }
}

export function weekLabel(startMs: number, endMs: number, now = Date.now()): { primary: string; secondary: string } {
  const s = new Date(startMs), e = new Date(endMs)
  const sameMonth = s.getMonth() === e.getMonth()
  const range = sameMonth
    ? `${s.getDate()} – ${e.getDate()} ${MESES_CORTO[e.getMonth()]}`
    : `${s.getDate()} ${MESES_CORTO[s.getMonth()]} – ${e.getDate()} ${MESES_CORTO[e.getMonth()]}`
  const thisWeek = weekStart(new Date(now)).getTime()
  if (startMs === thisWeek) return { primary: 'Esta semana', secondary: range }
  if (startMs === thisWeek - 7 * DAY_MS) return { primary: 'Semana pasada', secondary: range }
  return { primary: range, secondary: '' }
}

export function dailyBuckets(history: ClosedDay[]): DayBucket[] {
  const map = new Map<string, DayBucket>()
  for (const c of history) {
    const b = map.get(c.date)
    if (b) {
      b.net += c.net; b.earnings += c.earnings; b.expenses += c.expenses
      b.trips += c.trips; b.workedSeconds += c.workedSeconds
      b.tripSeconds += c.tripSeconds; b.waitSeconds += c.waitSeconds
      b.pauseSeconds += c.pauseSeconds; b.shifts += 1
      if (c.endedAt > b.endedAt) { b.endedAt = c.endedAt; b.goal = c.goal }
    } else {
      map.set(c.date, { date: c.date, net: c.net, earnings: c.earnings, expenses: c.expenses,
        trips: c.trips, workedSeconds: c.workedSeconds, tripSeconds: c.tripSeconds,
        waitSeconds: c.waitSeconds, pauseSeconds: c.pauseSeconds, goal: c.goal,
        shifts: 1, endedAt: c.endedAt })
    }
  }
  return [...map.values()].sort((a, b) => b.endedAt - a.endedAt)
}

export function weeklyBuckets(history: ClosedDay[]): WeekBucket[] {
  const map = new Map<number, WeekBucket>()
  for (const d of dailyBuckets(history)) {
    const key = weekStart(parseLocalDate(d.date)).getTime()
    const b = map.get(key)
    if (b) {
      b.net += d.net; b.earnings += d.earnings; b.expenses += d.expenses
      b.trips += d.trips; b.workedSeconds += d.workedSeconds
      b.daysWorked += 1; b.goalTotal += d.goal
    } else {
      map.set(key, { weekStartMs: key, weekEndMs: key + 6 * DAY_MS,
        net: d.net, earnings: d.earnings, expenses: d.expenses, trips: d.trips,
        workedSeconds: d.workedSeconds, daysWorked: 1, goalTotal: d.goal })
    }
  }
  return [...map.values()].sort((a, b) => b.weekStartMs - a.weekStartMs)
}
