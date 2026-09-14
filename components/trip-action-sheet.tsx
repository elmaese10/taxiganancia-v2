'use client'

import { Pencil, Trash2, X } from 'lucide-react'
import { fmtShort, fmtSoles, segmentSeconds, type Segment } from '@/lib/shift'

interface TripActionSheetProps {
  trip: Segment | null; index: number | null
  onEdit: (trip: Segment) => void; onDelete: (trip: Segment) => void; onClose: () => void
}

export function TripActionSheet({ trip, index, onEdit, onDelete, onClose }: TripActionSheetProps) {
  if (!trip) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-background/80 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="flex-1 cursor-default" />
      <div className="flex flex-col gap-5 rounded-t-2xl border-t border-border bg-popover px-5 pt-5 pb-8">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-lg font-semibold text-foreground">{index !== null ? `Carrera #${index}` : 'Carrera'}</h2>
            <p className="font-mono text-sm text-muted-foreground">{fmtSoles(trip.amount ?? 0)} · {fmtShort(segmentSeconds(trip, Date.now()))}</p></div>
          <button type="button" onClick={onClose} className="rounded-full bg-muted p-2 text-muted-foreground hover:text-foreground">
            <X className="size-4" /></button>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => onEdit(trip)}
            className="flex items-center gap-3 rounded-xl bg-card px-4 py-3.5 text-left text-foreground hover:bg-muted">
            <Pencil className="size-5 text-muted-foreground" />
            <span className="flex flex-col"><span className="text-base font-medium">Corregir el monto</span>
              <span className="text-xs text-muted-foreground">Cambia lo que cobraste.</span></span>
          </button>
          <button type="button" onClick={() => onDelete(trip)}
            className="flex items-center gap-3 rounded-xl bg-card px-4 py-3.5 text-left text-destructive hover:bg-destructive/10">
            <Trash2 className="size-5" />
            <span className="flex flex-col"><span className="text-base font-medium">Eliminar la carrera</span>
              <span className="text-xs text-muted-foreground">Sale del total. El tiempo queda como espera.</span></span>
          </button>
        </div>
      </div>
    </div>
  )
}
