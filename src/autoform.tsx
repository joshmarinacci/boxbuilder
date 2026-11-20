import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { ZodArray, ZodEnum, ZodNumber, ZodObject, ZodString } from 'zod'
import type { z } from 'zod'

// Renders a form from a zod object schema. Each field is a tooltheme property row:
// <label>Name <control> <control-or-output></label>.

interface FieldProps<S, V> {
    label: string
    schema: S
    value: V
    onChange: (v: V) => void
}

/** "wallThickness" -> "Wall thickness" */
function humanize(key: string): string {
    const words = key.replace(/([A-Z])/g, ' $1').toLowerCase()
    return words.charAt(0).toUpperCase() + words.slice(1)
}

function NumberField({ label, schema, value, onChange }: FieldProps<ZodNumber, number>) {
    const step = schema.isInt ? 1 : 0.1
    // zod 4's .int() reports ±MAX_SAFE_INTEGER as the bounds; treat that as "no limit" so the
    // slider falls back to the browser's 0–100 instead of a 9-quadrillion-wide track.
    const bound = (n: number | null) => (n !== null && Math.abs(n) < Number.MAX_SAFE_INTEGER ? n : undefined)
    const limits = { min: bound(schema.minValue), max: bound(schema.maxValue), step }
    // While typing, the box may hold text that isn't a number yet (empty, "-", "1."). Keep that as
    // a local draft and only push real numbers to the document.
    const [draft, setDraft] = useState<string | null>(null)
    const commit = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.valueAsNumber
        if (!Number.isNaN(v)) onChange(v)
    }
    return (
        <label>
            {label}
            <input type="range" {...limits} value={value} onChange={commit} aria-label={label} />
            <input
                type="number"
                {...limits}
                value={draft ?? value}
                aria-label={label}
                onChange={(e) => {
                    setDraft(e.target.value)
                    commit(e)
                }}
                onBlur={() => setDraft(null)}
            />
        </label>
    )
}

function StringField({ label, value, onChange }: FieldProps<ZodString, string>) {
    return (
        <label>
            {label}
            <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
        </label>
    )
}

function EnumField({ label, schema, value, onChange }: FieldProps<ZodEnum, string>) {
    return (
        <label>
            {label}
            <select value={value} onChange={(e) => onChange(e.target.value)}>
                {schema.options.map((option) => (
                    <option key={String(option)} value={String(option)}>
                        {String(option)}
                    </option>
                ))}
            </select>
        </label>
    )
}

function ArrayField({ label, value, onChange }: FieldProps<ZodArray, unknown[]>) {
    const [text, setText] = useState('')
    const add = () => {
        onChange([...value, text])
        setText('')
    }
    return (
        <fieldset>
            <legend>{label}</legend>
            <ul>
                {value.map((item, i) => (
                    <li key={i}>
                        {String(item)}
                        <button
                            onClick={() => onChange(value.filter((_, j) => j !== i))}
                            aria-label={`Remove ${String(item)}`}
                        >
                            ×
                        </button>
                    </li>
                ))}
            </ul>
            <div role="group">
                <input
                    type="text"
                    value={text}
                    aria-label={`New ${label}`}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') add()
                    }}
                />
                <button onClick={add}>Add</button>
            </div>
        </fieldset>
    )
}

type Obj = Record<string, unknown>

function ObjectFields({ schema, value, onChange }: { schema: ZodObject; value: Obj; onChange: (v: Obj) => void }) {
    return (
        <>
            {Object.entries(schema.shape).map(([key, field]) => {
                const label = humanize(key)
                const set = (v: unknown) => onChange({ ...value, [key]: v })
                const current = value[key]
                if (field instanceof ZodNumber) {
                    return (
                        <NumberField key={key} label={label} schema={field} value={current as number} onChange={set} />
                    )
                }
                if (field instanceof ZodString) {
                    return (
                        <StringField key={key} label={label} schema={field} value={current as string} onChange={set} />
                    )
                }
                if (field instanceof ZodEnum) {
                    return <EnumField key={key} label={label} schema={field} value={current as string} onChange={set} />
                }
                if (field instanceof ZodArray) {
                    return (
                        <ArrayField
                            key={key}
                            label={label}
                            schema={field}
                            value={current as unknown[]}
                            onChange={set}
                        />
                    )
                }
                if (field instanceof ZodObject) {
                    return (
                        <fieldset key={key}>
                            <legend>{label}</legend>
                            <ObjectFields schema={field} value={current as Obj} onChange={set} />
                        </fieldset>
                    )
                }
                return <p key={key}>Unsupported field: {key}</p>
            })}
        </>
    )
}

/** Form fields for every property of `schema`. Wrap in a <details> or <fieldset> for a panel. */
export function AutoForm<S extends ZodObject>(props: {
    schema: S
    value: z.infer<S>
    onChange: (v: z.infer<S>) => void
}) {
    // Values aren't re-validated here: a number box may briefly hold an out-of-range value while typing.
    return (
        <ObjectFields
            schema={props.schema}
            value={props.value as Obj}
            onChange={(v) => props.onChange(v as z.infer<S>)}
        />
    )
}
