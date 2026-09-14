'use client'

import { Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fmtSoles } from '@/lib/shift'
import { uid, weekdayName, type GPSConfig, type Obligation } from '@/lib/gps'
import { cn } from '@/lib/utils'

interface GPSSetupSheetProps {
  open: boolean; config: GPSConfig; onClose: () => void; onSave: (c: GPSConfig) => void
}

export function GPSSetupSheet({ open, config, onClose, onSave }: GPSSetupSheetProps) {
  const [balance, setBalance] = useState('')
  const [dailyProj, setDailyProj] = useState('')
  const [obligations, setObligations] = useState<Obligation[]>([])
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newFreq, setNewFreq] = useState<'monthly'|'weekly'>('monthly')
  const [newDay, setNewDay] = useState('')
  const [newDuration, setNewDuration] = useState<'permanent'|'weeks'>('permanent')
  const [newDurationWeeks, setNewDurationWeeks] = useState('')

  useEffect(() => {
    if (open) {
      setBalance(config.initialBalance ? String(config.initialBalance) : '')
      setDailyProj(config.dailyProjection ? String(config.dailyProjection) : '100')
      setObligations([...config.obligations]); setAdding(false); resetForm()
    }
  }, [open, config])

  function resetForm() {
    setNewName(''); setNewAmount(''); setNewFreq('monthly'); setNewDay('')
    setNewDuration('permanent'); setNewDurationWeeks('')
  }
  if (!open) return null

  function addObligation() {
    const name = newName.trim(), amount = Number(newAmount), day = Number(newDay)
    if (!name || !amount || amount <= 0) return
    if (newFreq === 'monthly' && (day < 1 || day > 31)) return
    if (newFreq === 'weekly' && (day < 0 || day > 6)) return
    let endsAt: number | null = null
    if (newDuration === 'weeks' && Number(newDurationWeeks) > 0)
      endsAt = Date.now() + Number(newDurationWeeks) * 7 * 86_400_000
    setObligations((p) => [...p, { id: uid(), name, amount, frequency: newFreq, dueDay: Math.round(day), endsAt }])
    resetForm(); setAdding(false)
  }

  function handleSave() {
    onSave({ initialBalance: Number(balance)||0, obligations, setupComplete: true, setupAt: Date.now(), dailyProjection: Number(dailyProj)||100 })
    onClose()
  }

  function durationLabel(ob: Obligation) {
    if (!ob.endsAt) return 'Siempre'
    const w = Math.max(0, Math.round((ob.endsAt - Date.now()) / (7*86_400_000)))
    return w > 0 ? `${w} sem` : 'Terminó'
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-background/80 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="flex-1 cursor-default" />
      <div className="flex max-h-[90dvh] flex-col rounded-t-2xl border-t border-border bg-popover">
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
          <div><h2 className="text-xl font-bold text-[#a855f7]">GPS Financiero</h2>
            <p className="text-sm text-muted-foreground">Tu saldo y tus obligaciones.</p></div>
          <button type="button" onClick={onClose} className="rounded-full bg-muted p-2 text-muted-foreground hover:text-foreground">
            <X className="size-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {/* Saldo */}
          <div className="flex flex-col gap-2 rounded-2xl bg-[#0ea5e9]/10 p-4">
            <label htmlFor="gps-bal" className="text-sm font-semibold text-[#0ea5e9]">SALDO INICIAL (S/)</label>
            <input id="gps-bal" type="number" inputMode="numeric" placeholder="Ej: 250" value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="rounded-xl bg-card px-4 py-3 text-xl font-bold tabular-nums text-foreground outline-none placeholder:text-muted-foreground/40" />
            <p className="text-xs text-[#0ea5e9]/70">¿Cuánto tienes acumulado hoy?</p>
          </div>
          {/* Proyección */}
          <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-[#a855f7]/10 p-4">
            <label htmlFor="gps-proj" className="text-sm font-semibold text-[#a855f7]">PROYECCIÓN DIARIA (S/)</label>
            <input id="gps-proj" type="number" inputMode="numeric" placeholder="Ej: 100" value={dailyProj}
              onChange={(e) => setDailyProj(e.target.value)}
              className="rounded-xl bg-card px-4 py-3 text-xl font-bold tabular-nums text-foreground outline-none placeholder:text-muted-foreground/40" />
            <p className="text-xs text-[#a855f7]/70">¿Cuánto esperas ganar neto por día?</p>
          </div>
          {/* Obligaciones */}
          <div className="mt-4 flex flex-col gap-3">
            <span className="text-base font-bold text-[#a855f7]">OBLIGACIONES · {obligations.length}</span>
            {obligations.length > 0 ? (
              <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl bg-card">
                {obligations.map((ob) => {
                  const freq = (ob.frequency as string)==='monthly'||(ob.frequency as string)==='fixed'||(ob.frequency as string)==='variable' ? 'monthly' : 'weekly'
                  return (<li key={ob.id} className="flex items-center gap-2 px-3 py-2.5">
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="text-base font-semibold text-foreground">{ob.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {freq==='monthly' ? `Día ${ob.dueDay} · mensual` : `${weekdayName(ob.dueDay)} · semanal`} · {durationLabel(ob)}
                      </span></div>
                    <span className="font-mono text-base font-bold tabular-nums text-warning">{fmtSoles(ob.amount, 0)}</span>
                    <button type="button" onClick={() => setObligations((p) => p.filter((o) => o.id !== ob.id))}
                      className="rounded-full p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                  </li>)
                })}
              </ul>
            ) : (<p className="rounded-xl border border-dashed border-warning/30 bg-warning/5 px-4 py-4 text-center text-sm text-warning">
              Agrega tus gastos fijos para proyectar tu ruta.</p>)}
            {adding ? (
              <div className="flex flex-col gap-2.5 rounded-xl border border-[#a855f7]/20 bg-[#a855f7]/5 p-4">
                <input type="text" placeholder="Nombre (ej: Entel)" value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="rounded-xl bg-card px-4 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/40" />
                <div className="flex gap-2">
                  <input type="number" inputMode="numeric" placeholder="Monto S/" value={newAmount} onChange={(e) => setNewAmount(e.target.value)}
                    className="flex-1 rounded-xl bg-card px-4 py-2.5 text-base tabular-nums text-foreground outline-none placeholder:text-muted-foreground/40" />
                  <div className="grid grid-cols-2 gap-0.5 rounded-xl bg-card p-0.5">
                    <button type="button" onClick={() => { setNewFreq('monthly'); setNewDay('') }}
                      className={cn('rounded-lg px-2.5 py-2 text-xs font-semibold', newFreq==='monthly' ? 'bg-[#a855f7] text-white' : 'text-muted-foreground')}>Mensual</button>
                    <button type="button" onClick={() => { setNewFreq('weekly'); setNewDay('') }}
                      className={cn('rounded-lg px-2.5 py-2 text-xs font-semibold', newFreq==='weekly' ? 'bg-[#a855f7] text-white' : 'text-muted-foreground')}>Semanal</button>
                  </div>
                </div>
                {newFreq === 'monthly' ? (
                  <input type="number" inputMode="numeric" placeholder="Día del mes (1-31)" value={newDay} onChange={(e) => setNewDay(e.target.value)}
                    className="rounded-xl bg-card px-4 py-2.5 text-base tabular-nums text-foreground outline-none placeholder:text-muted-foreground/40" />
                ) : (
                  <div className="grid grid-cols-7 gap-1">
                    {['D','L','M','X','J','V','S'].map((d,i) => (
                      <button key={i} type="button" onClick={() => setNewDay(String(i))}
                        className={cn('rounded-lg py-2.5 text-sm font-semibold', Number(newDay)===i ? 'bg-[#a855f7] text-white' : 'bg-card text-muted-foreground')}>{d}</button>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-[#a855f7]">¿Cuánto dura?</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setNewDuration('permanent'); setNewDurationWeeks('') }}
                      className={cn('flex-1 rounded-xl py-2.5 text-sm font-semibold', newDuration==='permanent' ? 'bg-[#a855f7] text-white' : 'bg-card text-muted-foreground')}>Siempre</button>
                    <button type="button" onClick={() => setNewDuration('weeks')}
                      className={cn('flex-1 rounded-xl py-2.5 text-sm font-semibold', newDuration==='weeks' ? 'bg-[#a855f7] text-white' : 'bg-card text-muted-foreground')}>Temporal</button>
                  </div>
                  {newDuration === 'weeks' ? (
                    <input type="number" inputMode="numeric" placeholder="¿Cuántas semanas?" value={newDurationWeeks} onChange={(e) => setNewDurationWeeks(e.target.value)}
                      className="rounded-xl bg-card px-4 py-2.5 text-base tabular-nums text-foreground outline-none placeholder:text-muted-foreground/40" />
                  ) : null}
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => { setAdding(false); resetForm() }}
                    className="flex-1 rounded-xl bg-card py-2.5 text-sm font-semibold text-muted-foreground">Cancelar</button>
                  <button type="button" onClick={addObligation} disabled={!newName.trim()||!Number(newAmount)||newDay===''}
                    className="flex-1 rounded-xl bg-[#a855f7] py-2.5 text-sm font-bold text-white disabled:opacity-40">Agregar</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setAdding(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#a855f7]/30 bg-[#a855f7]/5 py-3 text-sm font-semibold text-[#a855f7] hover:border-[#a855f7]/50">
                <Plus className="size-4" /> Agregar obligación</button>
            )}
          </div>
        </div>
        <div className="border-t border-border px-5 py-4">
          <button type="button" onClick={handleSave}
            className="w-full rounded-xl bg-[#a855f7] py-4 text-base font-bold text-white">
            {config.setupComplete ? 'Guardar cambios' : 'Activar GPS Financiero'}</button>
        </div>
      </div>
    </div>
  )
}
