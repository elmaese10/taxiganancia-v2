'use client'

import { Plus } from 'lucide-react'
import { fmtSoles, type Expense } from '@/lib/shift'

interface ExpenseStripProps {
  expenses: Expense[]
  total: number
  onAdd: () => void
  disabled?: boolean
}

export function ExpenseStrip({ expenses, total, onAdd, disabled }: ExpenseStripProps) {
  return (
    <section aria-label="Gastos del día" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">
          GASTOS DEL DÍA
        </h2>
        <span className="font-mono text-sm font-semibold tabular-nums text-warning">
          −{fmtSoles(total, 0)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {expenses.map((expense) => (
          <span
            key={expense.id}
            className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs text-foreground/80"
          >
            {expense.label}
            <span className="font-mono tabular-nums text-muted-foreground">
              {fmtSoles(expense.amount, 0)}
            </span>
          </span>
        ))}
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-40"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Agregar gasto
        </button>
      </div>
    </section>
  )
}
