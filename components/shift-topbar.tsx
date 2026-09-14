'use client'
import { fmtClock, fmtSoles, type ShiftStats } from '@/lib/shift'
import { cn } from '@/lib/utils'
interface ShiftTopbarProps { stats: ShiftStats; goal: number; endTime: string }
export function ShiftTopbar({ stats, goal, endTime }: ShiftTopbarProps) {
  const pct = Math.round(stats.goalProgress * 100)
  const netNeg = stats.net < 0
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="whitespace-nowrap font-mono text-[11px] tracking-[0.12em] text-muted-foreground">TIEMPO EN TURNO</span>
          <span className="lcd font-mono text-2xl font-medium tabular-nums text-foreground/90">{fmtClock(stats.elapsedSeconds)}</span>
        </div>
        <div className="flex min-w-0 flex-col items-end">
          <span className="whitespace-nowrap font-mono text-[11px] tracking-[0.12em] text-muted-foreground">NETO · META {fmtSoles(goal, 0)}</span>
          <span className={cn('lcd font-mono text-2xl font-semibold tabular-nums',
            netNeg ? 'text-destructive' : stats.remaining === 0 ? 'text-primary' : 'text-foreground')}>
            {fmtSoles(stats.net, 0)}</span>
        </div>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar"
        aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn('h-full rounded-full transition-[width] duration-700',
          stats.onPace ? 'bg-primary' : 'bg-warning')} style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
      <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.10em] text-muted-foreground">
        <span>{pct}% META</span>
        <span>FIN {endTime} · {stats.hoursLeft.toFixed(1)}h</span>
      </div>
    </header>
  )
}
