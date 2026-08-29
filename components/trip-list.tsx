'use client'

import { fmtShort, fmtSoles, segmentSeconds, type Segment } from '@/lib/shift'

interface TripListProps {
  trips: Segment[]
  earnings: number
}

export function TripList({ trips, earnings }: TripListProps) {
  return (
    <section aria-label="Viajes del turno" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">
          VIAJES · {trips.length}
        </h2>
        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
          {fmtSoles(earnings, 0)}
        </span>
      </div>

      {trips.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm leading-relaxed text-muted-foreground">
          Aún no registras carreras.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl bg-card">
          {trips
            .slice()
            .reverse()
            .map((trip, index) => (
              <li key={trip.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  #{trips.length - index}
                </span>
                <span className="font-mono text-sm tabular-nums text-foreground/80">
                  {fmtShort(segmentSeconds(trip, Date.now()))}
                </span>
                <span className="ml-auto font-mono text-sm font-semibold tabular-nums text-primary">
                  {fmtSoles(trip.amount ?? 0)}
                </span>
              </li>
            ))}
        </ul>
      )}
    </section>
  )
}
