import { type ClosedDay } from '@/lib/storage'

export interface Obligation {
  id: string
  name: string
  amount: number
  frequency: 'monthly' | 'weekly'
  dueDay: number
  endsAt: number | null
}

export interface GPSConfig {
  initialBalance: number
  obligations: Obligation[]
  setupComplete: boolean
  setupAt: number
  dailyProjection: number
}

export const DEFAULT_GPS: GPSConfig = {
  initialBalance: 0, obligations: [], setupComplete: false, setupAt: 0, dailyProjection: 100,
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export function weekdayName(dow: number) { return DIAS_SEMANA[dow] ?? '?' }

const GPS_KEY = 'taxiganancia.gps'

export function loadGPS(): GPSConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_GPS }
  try {
    const raw = window.localStorage.getItem(GPS_KEY)
    if (!raw) return { ...DEFAULT_GPS }
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return { ...DEFAULT_GPS }
    return {
      initialBalance: typeof p.initialBalance === 'number' ? p.initialBalance : 0,
      obligations: Array.isArray(p.obligations) ? p.obligations.filter(isValid) : [],
      setupComplete: p.setupComplete === true,
      setupAt: typeof p.setupAt === 'number' ? p.setupAt : 0,
      dailyProjection: typeof p.dailyProjection === 'number' ? p.dailyProjection : 100,
    }
  } catch { return { ...DEFAULT_GPS } }
}

export function saveGPS(config: GPSConfig) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(GPS_KEY, JSON.stringify(config)) } catch {}
}

function isValid(o: unknown): o is Obligation {
  if (!o || typeof o !== 'object') return false
  const ob = o as Record<string, unknown>
  return typeof ob.id === 'string' && typeof ob.name === 'string' &&
    typeof ob.amount === 'number' && typeof ob.dueDay === 'number'
}

export interface CalDay {
  date: Date; key: string; label: string; isToday: boolean
  actualNet: number | null; dayNet: number
  obligations: { name: string; amount: number }[]
  balanceAfterIncome: number; balanceAfterObs: number
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const CAL_DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']

function obligationFallsOn(ob: Obligation, d: Date): boolean {
  if (ob.endsAt !== null && d.getTime() > ob.endsAt) return false
  const freq = (ob.frequency as string) === 'fixed' || (ob.frequency as string) === 'variable' ? 'monthly' : ob.frequency
  return freq === 'monthly' ? d.getDate() === ob.dueDay : d.getDay() === ob.dueDay
}

export function buildCalendar(config: GPSConfig, history: ClosedDay[], _count = 7, now = new Date()) {
  const relevant = history.filter((c) => c.endedAt > config.setupAt)
  const actualByDate = new Map<string, number>()
  for (const c of relevant) actualByDate.set(c.date, (actualByDate.get(c.date) ?? 0) + c.net)

  const avgDaily = config.dailyProjection
  let totalNets = 0
  for (const c of relevant) totalNets += c.net
  const balance = config.initialBalance + totalNets

  // Lunes de esta semana
  const monday = new Date(now)
  const dow = monday.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  monday.setDate(monday.getDate() + diff)
  monday.setHours(0, 0, 0, 0)

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayKey = dateKey(now)

  // Restar del balance los netos de esta semana que ya están incluidos,
  // para poder sumarlos fila por fila sin contar doble
  let weekNetsAlready = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    if (d.getTime() <= todayStart.getTime()) {
      const a = actualByDate.get(dateKey(d))
      if (a !== undefined) weekNetsAlready += a
    }
  }
  let running = balance - weekNetsAlready

  const days: CalDay[] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const key = dateKey(d)
    const isToday = key === todayKey
    const isPast = d.getTime() < todayStart.getTime()

    const actual = actualByDate.get(key)
    const dayNet = isPast || isToday ? (actual ?? 0) : avgDaily

    running += dayNet
    const balanceAfterIncome = running

    const obs: { name: string; amount: number }[] = []
    for (const ob of config.obligations) {
      if (obligationFallsOn(ob, d)) {
        obs.push({ name: ob.name, amount: ob.amount })
        running -= ob.amount
      }
    }
    days.push({ date: d, key, label: `${CAL_DIAS[d.getDay()]} ${d.getDate()}`,
      isToday, actualNet: actual ?? null, dayNet, obligations: obs,
      balanceAfterIncome, balanceAfterObs: running })
  }
  return { days, balance, avgDaily }
}

export function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2,7)}` }
