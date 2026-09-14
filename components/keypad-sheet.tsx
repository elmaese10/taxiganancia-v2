'use client'

import { Delete, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EXPENSE_LABELS } from '@/lib/shift'
import { cn } from '@/lib/utils'

export type KeypadMode = 'trip' | 'expense'

interface KeypadSheetProps {
  mode: KeypadMode | null
  title: string
  subtitle: string
  labels?: readonly string[]
  initialValue?: string
  submitLabel?: string
  onClose: () => void
  onSubmit: (amount: number, label?: string) => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0']

export function KeypadSheet({
  mode,
  title,
  subtitle,
  labels = EXPENSE_LABELS,
  initialValue = '',
  submitLabel,
  onClose,
  onSubmit,
}: KeypadSheetProps) {
  const [value, setValue] = useState('')
  const [label, setLabel] = useState<string>(labels[0] ?? EXPENSE_LABELS[0])
  const [customLabel, setCustomLabel] = useState('')
  const [addingLabel, setAddingLabel] = useState(false)

  useEffect(() => {
    if (mode) {
      setValue(initialValue)
      setLabel(labels[0] ?? EXPENSE_LABELS[0])
      setCustomLabel('')
      setAddingLabel(false)
    }
  }, [mode])

  if (!mode) return null

  const amount = Number.parseFloat(value || '0')
  const chosenLabel = addingLabel ? customLabel.trim() : label
  const valid =
    Number.isFinite(amount) && amount > 0 && (mode !== 'expense' || chosenLabel.length > 0)

  function press(key: string) {
    setValue((prev) => {
      if (key === '.' && prev.includes('.')) return prev
      if (prev.replace('.', '').length >= 6) return prev
      return prev + key
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-background/80 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="flex-1 cursor-default"
      />
      <div className="flex flex-col gap-4 rounded-t-2xl border-t border-border bg-popover px-5 pt-5 pb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
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

        <p
          className={cn(
            'lcd font-mono text-5xl font-semibold tabular-nums',
            mode === 'trip' ? 'text-primary glow-primary' : 'text-warning glow-warning',
          )}
        >
          S/ {value || '0'}
        </p>

        {mode === 'expense' && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {labels.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setAddingLabel(false)
                    setLabel(option)
                  }}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs transition-colors',
                    !addingLabel && label === option
                      ? 'bg-warning text-warning-foreground'
                      : 'bg-card text-muted-foreground hover:text-foreground',
                  )}
                >
                  {option}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAddingLabel(true)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs transition-colors',
                  addingLabel
                    ? 'bg-warning text-warning-foreground'
                    : 'bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                + Nueva
              </button>
            </div>
            {addingLabel && (
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Nombre de la etiqueta"
                maxLength={24}
                className="rounded-xl bg-card px-4 py-3 font-sans text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              className="rounded-xl bg-card py-4 font-mono text-2xl font-medium text-foreground transition-colors active:bg-muted"
            >
              {key}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setValue((prev) => prev.slice(0, -1))}
            aria-label="Borrar"
            className="flex items-center justify-center rounded-xl bg-card py-4 text-muted-foreground transition-colors active:bg-muted"
          >
            <Delete className="size-5" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          disabled={!valid}
          onClick={() => onSubmit(amount, chosenLabel)}
          className={cn(
            'rounded-xl py-4 text-base font-semibold transition-opacity disabled:opacity-40',
            mode === 'trip'
              ? 'bg-primary text-primary-foreground'
              : 'bg-warning text-warning-foreground',
          )}
        >
          {submitLabel ?? (mode === 'trip' ? 'Cerrar carrera' : 'Registrar gasto')}
        </button>
      </div>
    </div>
  )
}
