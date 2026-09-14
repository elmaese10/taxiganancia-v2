'use client'
import { Pencil } from 'lucide-react'
import { fmtShort, fmtSoles, segmentSeconds, type Segment } from '@/lib/shift'
interface TripListProps { trips: Segment[]; earnings: number; onSelectTrip?: (t: Segment, i: number) => void }
export function TripList({ trips, earnings, onSelectTrip }: TripListProps) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">VIAJES · {trips.length}</h2>
        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{fmtSoles(earnings, 0)}</span>
      </div>
      {trips.length === 0 ? <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">Aún no registras carreras.</p>
        : <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl bg-card">
          {trips.slice().reverse().map((t, idx) => { const num = trips.length - idx; return (
            <li key={t.id}><button type="button" onClick={() => onSelectTrip?.(t, num)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted active:bg-muted">
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">#{num}</span>
              <span className="font-mono text-sm tabular-nums text-foreground/80">{fmtShort(segmentSeconds(t, Date.now()))}</span>
              <span className="ml-auto font-mono text-sm font-semibold tabular-nums text-primary">{fmtSoles(t.amount ?? 0, 0)}</span>
              <Pencil className="size-3.5 shrink-0 text-muted-foreground/50" /></button></li>
          )})}
        </ul>}
    </section>
  )
}
