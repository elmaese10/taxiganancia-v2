'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DEFAULT_CONFIG, type ShiftConfig } from '@/lib/shift'

interface PlanSheetProps {
  open: boolean
  config: ShiftConfig
  onClose: () => void
  onSave: (config: ShiftConfig) => void
}

export function PlanSheet({ open, config, onClose, onSave }: PlanSheetProps) {
  const [draft, setDraft] = useState(config)

  useEffect(() => {
    if (open) setDraft(config)
  }, [open, config])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-background/80 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="flex-1 cursor-default" />
      <div className="flex flex-col gap-5 rounded-t-2xl border-t border-border bg-popover px-5 pt-5 pb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-semibold text-foreground">Planea tu día</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Define la meta y el ritmo que quieres sostener.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full bg-muted p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground">
              META NETA DEL DÍA (S/)
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={draft.goal}
              onChange={(e) => setDraft({ ...draft, goal: Number(e.target.value) })}
              className="rounded-xl bg-card px-4 py-3.5 font-mono text-xl tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground">
              TARIFA IDEAL (S/ POR HORA)
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={draft.idealRate}
              onChange={(e) => setDraft({ ...draft, idealRate: Number(e.target.value) })}
              className="rounded-xl bg-card px-4 py-3.5 font-mono text-xl tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              Con esto se calcula cuánta plata quemas por cada minuto de espera.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground">
              HORA DE FIN
            </span>
            <input
              type="time"
              value={draft.endTime}
              onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
              className="rounded-xl bg-card px-4 py-3.5 font-mono text-xl tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_CONFIG)}
            className="rounded-xl bg-card px-4 py-3.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Restaurar
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="flex-1 rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground"
          >
            Guardar plan
          </button>
        </div>
      </div>
    </div>
  )
}
