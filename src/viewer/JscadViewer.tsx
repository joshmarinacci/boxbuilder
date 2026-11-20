import { useEffect, useRef } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import * as orbitView from './orbitView'
import { createViewerEngine, DEFAULT_COLORS } from './viewerEngine'
import type { ViewerColors, ViewerEngine } from './viewerEngine'

interface JscadViewerProps {
    solids: Geom3[]
    colors?: ViewerColors
    label?: string
}

type Drag =
    | { mode: 'idle' }
    | { mode: 'rotate' | 'pan'; pointerId: number; x: number; y: number }
    | { mode: 'pinch'; distance: number; midX: number; midY: number }

const KEY_STEP = 20
const ARROWS: Record<string, [number, number]> = {
    ArrowLeft: [-KEY_STEP, 0],
    ArrowRight: [KEY_STEP, 0],
    ArrowUp: [0, -KEY_STEP],
    ArrowDown: [0, KEY_STEP],
}

/**
 * Interactive WebGL preview of JSCAD solids. Fills its parent element.
 * Drag to rotate, shift+drag to pan, wheel or pinch to zoom; arrow keys, shift+arrows
 * and +/- do the same from the keyboard once the viewer has focus.
 */
export function JscadViewer({ solids, colors = DEFAULT_COLORS, label = '3D preview' }: JscadViewerProps) {
    const hostRef = useRef<HTMLDivElement>(null)
    const engineRef = useRef<ViewerEngine | null>(null)
    // Gesture state changes on every pointer move, so it lives in refs, not React state.
    const dragRef = useRef<Drag>({ mode: 'idle' })
    const pointersRef = useRef(new Map<number, { x: number; y: number }>())

    useEffect(() => {
        const host = hostRef.current
        if (!host) return
        const engine = createViewerEngine(host)
        engineRef.current = engine
        // React's onWheel is passive, so it can't stop the page from scrolling.
        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
            engine.update((v) => orbitView.zoom(v, e.deltaY))
        }
        host.addEventListener('wheel', onWheel, { passive: false })
        return () => {
            host.removeEventListener('wheel', onWheel)
            engine.destroy()
            engineRef.current = null
        }
    }, [])

    useEffect(() => {
        engineRef.current?.setScene(solids, colors)
    }, [solids, colors])

    const update = (fn: (v: orbitView.OrbitView) => orbitView.OrbitView) => engineRef.current?.update(fn)

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return
        try {
            e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
            // Capture is a nicety (keeps the drag when the pointer leaves the viewer); the gesture
            // still works without it, e.g. if the pointer was already released.
        }
        const pointers = pointersRef.current
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (pointers.size === 2) {
            const [a, b] = [...pointers.values()]
            dragRef.current = {
                mode: 'pinch',
                distance: Math.hypot(a.x - b.x, a.y - b.y),
                midX: (a.x + b.x) / 2,
                midY: (a.y + b.y) / 2,
            }
        } else if (pointers.size === 1) {
            dragRef.current = {
                mode: e.shiftKey ? 'pan' : 'rotate',
                pointerId: e.pointerId,
                x: e.clientX,
                y: e.clientY,
            }
        }
    }

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        const pointers = pointersRef.current
        if (!pointers.has(e.pointerId)) return
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const drag = dragRef.current
        if (drag.mode === 'rotate' || drag.mode === 'pan') {
            if (drag.pointerId !== e.pointerId) return
            const dx = e.clientX - drag.x
            const dy = e.clientY - drag.y
            dragRef.current = { ...drag, x: e.clientX, y: e.clientY }
            update((v) => (drag.mode === 'pan' ? orbitView.pan(v, dx, dy) : orbitView.rotate(v, dx, dy)))
        } else if (drag.mode === 'pinch' && pointers.size === 2) {
            const [a, b] = [...pointers.values()]
            const distance = Math.hypot(a.x - b.x, a.y - b.y)
            const midX = (a.x + b.x) / 2
            const midY = (a.y + b.y) / 2
            const spread = distance - drag.distance
            dragRef.current = { mode: 'pinch', distance, midX, midY }
            update((v) => {
                const panned = orbitView.pan(v, midX - drag.midX, midY - drag.midY)
                return Math.abs(spread) > 1 ? orbitView.zoom(panned, -spread) : panned
            })
        }
    }

    const endPointer = (e: PointerEvent<HTMLDivElement>) => {
        pointersRef.current.delete(e.pointerId)
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
        dragRef.current = { mode: 'idle' }
    }

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const arrow = ARROWS[e.key]
        if (arrow) {
            const [dx, dy] = arrow
            update((v) => (e.shiftKey ? orbitView.pan(v, dx, dy) : orbitView.rotate(v, dx * 5, dy * 5)))
        } else if (e.key === '+' || e.key === '=') {
            update((v) => orbitView.zoom(v, -1))
        } else if (e.key === '-' || e.key === '_') {
            update((v) => orbitView.zoom(v, 1))
        } else {
            return
        }
        e.preventDefault()
    }

    return (
        <div
            ref={hostRef}
            className="jscad-viewer"
            role="application"
            aria-roledescription="3D viewer"
            aria-label={`${label}. Drag or use arrow keys to rotate, shift to pan, scroll or plus and minus to zoom.`}
            tabIndex={0}
            style={{ touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onKeyDown={onKeyDown}
        />
    )
}
