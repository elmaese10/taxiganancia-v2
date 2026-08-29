import {
  computeStats,
  DEFAULT_CONFIG,
  EXPENSE_LABELS,
  initialShift,
  type Expense,
  type Segment,
  type ShiftConfig,
  type ShiftState,
  type ShiftStatus,
} from '@/lib/shift'

/** Nombres del cuaderno en el celular. Prefijo propio para no chocar con otras webs. */
export const STORAGE_KEYS = {
  shift: 'taxiganancia.shift',
  backup: 'taxiganancia.shift.backup',
  config: 'taxiganancia.config',
  history: 'taxiganancia.history',
  labels: 'taxiganancia.expenseLabels',
} as const

const STORE_VERSION = 1
const HISTORY_CAP = 400
const IDB_NAME = 'taxiganancia-db'
const IDB_STORE = 'kv'
const IDB_BUNDLE_KEY = 'bundle'

export interface ClosedDay {
  id: string
  date: string
  startedAt: number | null
  endedAt: number
  earnings: number
  expenses: number
  net: number
  trips: number
  goal: number
  tripSeconds: number
  waitSeconds: number
  pauseSeconds: number
  workedSeconds: number
}

interface ShiftEnvelope {
  version: number
  savedAt: number
  shift: ShiftState
}

interface DurableBundle {
  savedAt: number
  shift: unknown
  config: unknown
  history: unknown
  labels: unknown
}

export interface PersistedBundle {
  shift: ShiftState
  labels: string[]
  history: ClosedDay[]
}

export interface PersistOptions {
  /** Permite guardar un turno vacío (p. ej. “empezar un turno nuevo”). */
  allowReset?: boolean
}

/** Hasta leer el cuaderno, está prohibido escribir. Evita borrar datos al arrancar. */
let writesEnabled = false

export function enablePersistence() {
  writesEnabled = true
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readRaw(key: string): string | null {
  if (!canUseStorage()) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeRaw(key: string, value: string) {
  if (!canUseStorage()) return false
  try {
    window.localStorage.setItem(key, value)
    return window.localStorage.getItem(key) === value
  } catch {
    return false
  }
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

function isStatus(value: unknown): value is ShiftStatus {
  return value === 'idle' || value === 'running' || value === 'ended'
}

function coerceEndTime(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!match) return null
  const hh = String(Math.min(23, Number(match[1]))).padStart(2, '0')
  const mm = String(Math.min(59, Number(match[2]))).padStart(2, '0')
  return `${hh}:${mm}`
}

function coerceSegment(value: unknown): Segment | null {
  if (!value || typeof value !== 'object') return null
  const s = value as Record<string, unknown>
  const kind = s.kind
  if (kind !== 'trip' && kind !== 'wait' && kind !== 'pause') return null
  const start = coerceNumber(s.start)
  if (start === null) return null
  let end: number | null = null
  if (s.end !== null && s.end !== undefined) {
    end = coerceNumber(s.end)
    if (end === null) return null
  }
  const amountRaw = s.amount === undefined ? undefined : coerceNumber(s.amount)
  if (s.amount !== undefined && amountRaw === null) return null
  const id = typeof s.id === 'string' && s.id ? s.id : `seg-${start}`
  const segment: Segment = { id, kind, start, end }
  if (amountRaw !== undefined && amountRaw !== null) segment.amount = amountRaw
  return segment
}

function coerceExpense(value: unknown): Expense | null {
  if (!value || typeof value !== 'object') return null
  const e = value as Record<string, unknown>
  const amount = coerceNumber(e.amount)
  const at = coerceNumber(e.at) ?? Date.now()
  if (amount === null) return null
  const label = typeof e.label === 'string' && e.label.trim() ? e.label : 'Otro'
  const id = typeof e.id === 'string' && e.id ? e.id : `exp-${at}`
  return { id, label, amount, at }
}

export function sanitizeConfig(value: unknown): ShiftConfig {
  if (!value || typeof value !== 'object') return { ...DEFAULT_CONFIG }
  const c = value as Record<string, unknown>
  const goal = coerceNumber(c.goal)
  const idealRate = coerceNumber(c.idealRate)
  const endTime = coerceEndTime(c.endTime)
  return {
    goal: goal === null ? DEFAULT_CONFIG.goal : Math.max(0, goal),
    idealRate: idealRate === null ? DEFAULT_CONFIG.idealRate : Math.max(1, idealRate),
    endTime: endTime ?? DEFAULT_CONFIG.endTime,
  }
}

export function sanitizeShift(value: unknown): ShiftState | null {
  if (!value || typeof value !== 'object') return null
  const s = value as Record<string, unknown>
  if (!isStatus(s.status)) return null

  const startedAt = s.startedAt === null || s.startedAt === undefined ? null : coerceNumber(s.startedAt)
  const endedAt = s.endedAt === null || s.endedAt === undefined ? null : coerceNumber(s.endedAt)
  if (s.startedAt != null && startedAt === null) return null
  if (s.endedAt != null && endedAt === null) return null

  const segments = Array.isArray(s.segments)
    ? s.segments.map(coerceSegment).filter((seg): seg is Segment => seg !== null)
    : []
  const expenses = Array.isArray(s.expenses)
    ? s.expenses.map(coerceExpense).filter((exp): exp is Expense => exp !== null)
    : []

  return {
    status: s.status,
    startedAt,
    endedAt,
    segments,
    expenses,
    config: sanitizeConfig(s.config),
  }
}

function envelopeSavedAt(raw: unknown): number {
  if (!raw || typeof raw !== 'object') return 0
  return coerceNumber((raw as ShiftEnvelope).savedAt) ?? 0
}

function unwrapShift(raw: unknown): ShiftState | null {
  if (!raw || typeof raw !== 'object') return null
  const asEnvelope = raw as ShiftEnvelope
  if ('shift' in asEnvelope) return sanitizeShift(asEnvelope.shift)
  return sanitizeShift(raw)
}

function uniqueLabels(list: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of list) {
    const label = item.trim()
    if (!label) continue
    const key = label.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(label)
  }
  return out
}

export function mergeExpenseLabels(...groups: string[][]) {
  return uniqueLabels([...EXPENSE_LABELS, ...groups.flat()])
}

function sanitizeLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [...EXPENSE_LABELS]
  const fromStore = value.filter((item): item is string => typeof item === 'string')
  return mergeExpenseLabels(fromStore)
}

function sanitizeHistory(value: unknown): ClosedDay[] {
  if (!Array.isArray(value)) return []
  const days: ClosedDay[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const d = item as Record<string, unknown>
    if (typeof d.id !== 'string' || typeof d.date !== 'string') continue
    const endedAt = coerceNumber(d.endedAt)
    const earnings = coerceNumber(d.earnings)
    const expenses = coerceNumber(d.expenses)
    const net = coerceNumber(d.net)
    if (endedAt === null || earnings === null || expenses === null || net === null) continue
    days.push({
      id: d.id,
      date: d.date,
      startedAt: coerceNumber(d.startedAt),
      endedAt,
      earnings,
      expenses,
      net,
      trips: coerceNumber(d.trips) ?? 0,
      goal: coerceNumber(d.goal) ?? DEFAULT_CONFIG.goal,
      tripSeconds: coerceNumber(d.tripSeconds) ?? 0,
      waitSeconds: coerceNumber(d.waitSeconds) ?? 0,
      pauseSeconds: coerceNumber(d.pauseSeconds) ?? 0,
      workedSeconds: coerceNumber(d.workedSeconds) ?? 0,
    })
  }
  return days
}

export function isBlankShift(shift: ShiftState) {
  return (
    shift.status === 'idle' &&
    shift.startedAt === null &&
    shift.segments.length === 0 &&
    shift.expenses.length === 0
  )
}

function blankShift(config: ShiftConfig): ShiftState {
  return {
    status: 'idle',
    startedAt: null,
    endedAt: null,
    segments: [],
    expenses: [],
    config: { ...config },
  }
}

function envelope(shift: ShiftState): ShiftEnvelope {
  return { version: STORE_VERSION, savedAt: Date.now(), shift }
}

function snapshotFromParts(
  shiftRaw: unknown,
  configRaw: unknown,
  historyRaw: unknown,
  labelsRaw: unknown,
  savedAt = 0,
): { bundle: PersistedBundle; savedAt: number; shift: ShiftState | null } {
  const shift = unwrapShift(shiftRaw)
  const config = sanitizeConfig(configRaw ?? shift?.config)
  const history = sanitizeHistory(historyRaw)
  const storedLabels = sanitizeLabels(labelsRaw)
  const resolved = shift ? { ...shift, config: shift.config ?? config } : blankShift(config)
  const labels = mergeExpenseLabels(
    storedLabels,
    resolved.expenses.map((e) => e.label),
  )
  return { bundle: { shift: resolved, labels, history }, savedAt, shift }
}

function readLsSnapshot() {
  const shiftJson = parseJson(readRaw(STORAGE_KEYS.shift))
  const backupJson = parseJson(readRaw(STORAGE_KEYS.backup))
  const mainShift = unwrapShift(shiftJson)
  const rawShift = mainShift ? shiftJson : backupJson
  const savedAt = Math.max(envelopeSavedAt(shiftJson), envelopeSavedAt(backupJson))
  return snapshotFromParts(
    rawShift,
    parseJson(readRaw(STORAGE_KEYS.config)),
    parseJson(readRaw(STORAGE_KEYS.history)),
    parseJson(readRaw(STORAGE_KEYS.labels)),
    savedAt,
  )
}

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    let settled = false
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true
        resolve(null)
      }
    }, 1200)
    try {
      const req = window.indexedDB.open(IDB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE)
      }
      req.onsuccess = () => {
        if (settled) {
          req.result.close()
          return
        }
        settled = true
        window.clearTimeout(timer)
        resolve(req.result)
      }
      req.onerror = () => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        resolve(null)
      }
    } catch {
      window.clearTimeout(timer)
      resolve(null)
    }
  })
}

function idbGetBundle(): Promise<DurableBundle | null> {
  return openIdb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) {
          resolve(null)
          return
        }
        try {
          const tx = db.transaction(IDB_STORE, 'readonly')
          const req = tx.objectStore(IDB_STORE).get(IDB_BUNDLE_KEY)
          req.onsuccess = () => {
            const value = req.result
            db.close()
            resolve(value && typeof value === 'object' ? (value as DurableBundle) : null)
          }
          req.onerror = () => {
            db.close()
            resolve(null)
          }
        } catch {
          db.close()
          resolve(null)
        }
      }),
  )
}

function idbPutBundle(bundle: DurableBundle) {
  return openIdb().then(
    (db) =>
      new Promise<void>((resolve) => {
        if (!db) {
          resolve()
          return
        }
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite')
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => {
            db.close()
            resolve()
          }
          tx.objectStore(IDB_STORE).put(bundle, IDB_BUNDLE_KEY)
        } catch {
          db.close()
          resolve()
        }
      }),
  )
}

function chooseSnapshot(
  ls: ReturnType<typeof snapshotFromParts>,
  idb: ReturnType<typeof snapshotFromParts> | null,
) {
  if (!idb) return ls
  const lsLive = ls.shift && !isBlankShift(ls.bundle.shift)
  const idbLive = idb.shift && !isBlankShift(idb.bundle.shift)
  if (idbLive && !lsLive) return idb
  if (lsLive && !idbLive) return ls
  return idb.savedAt > ls.savedAt ? idb : ls
}

let memoryBundle: DurableBundle | null = null

function writeEverywhere(shift: ShiftState, config: ShiftConfig, history: ClosedDay[], labels: string[]) {
  const payload = JSON.stringify(envelope(shift))
  writeRaw(STORAGE_KEYS.shift, payload)
  writeRaw(STORAGE_KEYS.backup, payload)
  writeRaw(STORAGE_KEYS.config, JSON.stringify(sanitizeConfig(config)))
  writeRaw(STORAGE_KEYS.history, JSON.stringify(history.slice(-HISTORY_CAP)))
  writeRaw(STORAGE_KEYS.labels, JSON.stringify(mergeExpenseLabels(labels)))

  const durable: DurableBundle = {
    savedAt: Date.now(),
    shift,
    config,
    history,
    labels,
  }
  memoryBundle = durable
  void idbPutBundle(durable)
}

function currentHistoryAndLabels(shift: ShiftState): { history: ClosedDay[]; labels: string[] } {
  if (memoryBundle) {
    return {
      history: sanitizeHistory(memoryBundle.history),
      labels: mergeExpenseLabels(sanitizeLabels(memoryBundle.labels), shift.expenses.map((e) => e.label)),
    }
  }
  const ls = readLsSnapshot()
  return {
    history: ls.bundle.history,
    labels: mergeExpenseLabels(ls.bundle.labels, shift.expenses.map((e) => e.label)),
  }
}

function shouldSkipBlankWrite(shift: ShiftState, allowReset?: boolean) {
  if (allowReset || !isBlankShift(shift)) return false
  const existing = unwrapShift(parseJson(readRaw(STORAGE_KEYS.shift))) ?? unwrapShift(parseJson(readRaw(STORAGE_KEYS.backup)))
  if (existing && !isBlankShift(existing)) return true
  if (memoryBundle) {
    const mem = unwrapShift(memoryBundle.shift)
    if (mem && !isBlankShift(mem)) return true
  }
  return false
}

export function persistShift(shift: ShiftState, options?: PersistOptions) {
  if (!writesEnabled) return
  if (shouldSkipBlankWrite(shift, options?.allowReset)) return
  const extras = currentHistoryAndLabels(shift)
  writeEverywhere(shift, shift.config, extras.history, extras.labels)
}

export function persistConfig(config: ShiftConfig) {
  if (!writesEnabled) return
  writeRaw(STORAGE_KEYS.config, JSON.stringify(sanitizeConfig(config)))
  if (memoryBundle) {
    memoryBundle = { ...memoryBundle, savedAt: Date.now(), config }
    void idbPutBundle(memoryBundle)
  }
}

export function persistLabels(labels: string[]) {
  if (!writesEnabled) return
  const merged = mergeExpenseLabels(labels)
  writeRaw(STORAGE_KEYS.labels, JSON.stringify(merged))
  if (memoryBundle) {
    memoryBundle = { ...memoryBundle, savedAt: Date.now(), labels: merged }
    void idbPutBundle(memoryBundle)
  }
}

export function persistHistory(history: ClosedDay[]) {
  if (!writesEnabled) return
  const clipped = history.slice(-HISTORY_CAP)
  writeRaw(STORAGE_KEYS.history, JSON.stringify(clipped))
  if (memoryBundle) {
    memoryBundle = { ...memoryBundle, savedAt: Date.now(), history: clipped }
    void idbPutBundle(memoryBundle)
  }
}

function localDate(at: number) {
  const d = new Date(at)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function closedDayFromShift(shift: ShiftState, endedAt: number): ClosedDay {
  const stats = computeStats({ ...shift, status: 'ended', endedAt }, endedAt)
  return {
    id: `${endedAt}-${shift.startedAt ?? 'na'}`,
    date: localDate(endedAt),
    startedAt: shift.startedAt,
    endedAt,
    earnings: stats.earnings,
    expenses: stats.expensesTotal,
    net: stats.net,
    trips: stats.trips.length,
    goal: shift.config.goal,
    tripSeconds: stats.tripSeconds,
    waitSeconds: stats.waitSeconds,
    pauseSeconds: stats.pauseSeconds,
    workedSeconds: stats.workedSeconds,
  }
}

export function appendClosedDay(history: ClosedDay[], day: ClosedDay): ClosedDay[] {
  if (history.some((item) => item.id === day.id)) return history
  return [...history, day].slice(-HISTORY_CAP)
}

function snapshotFromIdb(raw: DurableBundle | null) {
  if (!raw) return null
  return snapshotFromParts(raw.shift, raw.config, raw.history, raw.labels, coerceNumber(raw.savedAt) ?? 0)
}

/** Lee localStorage e IndexedDB. Nunca escribe. */
export async function loadPersisted(): Promise<PersistedBundle> {
  writesEnabled = false
  const ls = readLsSnapshot()
  const idbRaw = await idbGetBundle()
  const idb = snapshotFromIdb(idbRaw)
  const chosen = chooseSnapshot(ls, idb)
  memoryBundle = {
    savedAt: chosen.savedAt || Date.now(),
    shift: chosen.bundle.shift,
    config: chosen.bundle.shift.config,
    history: chosen.bundle.history,
    labels: chosen.bundle.labels,
  }
  return chosen.bundle
}
