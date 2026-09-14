'use client'
import { Plus } from 'lucide-react'
import { fmtSoles, type Expense } from '@/lib/shift'
interface ExpenseStripProps { expenses: Expense[]; total: number; onAdd: () => void; disabled?: boolean }
export function ExpenseStrip({ expenses, total, onAdd, disabled }: ExpenseStripProps) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">GASTOS · {expenses.length}</h2>
          <button type="button" onClick={onAdd} disabled={disabled} aria-label="Agregar gasto"
            className="flex size-7 items-center justify-center rounded-full border border-warning/40 bg-warning/10 text-warning hover:bg-warning/20 disabled:opacity-40">
            <Plus className="size-3.5" strokeWidth={2.5} /></button>
        </div>
        <span className="font-mono text-sm font-semibold tabular-nums text-warning">−{fmtSoles(total, 0)}</span>
      </div>
      {expenses.length === 0 ? <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">Sin gastos.</p>
        : <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl bg-card">
          {expenses.map((e, i) => (<li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">#{i+1}</span>
            <span className="text-sm text-foreground/80">{e.label}</span>
            <span className="ml-auto font-mono text-sm font-semibold tabular-nums text-warning">{fmtSoles(e.amount, 0)}</span>
          </li>))}
        </ul>}
    </section>
  )
}
