import { drawCommands, entitiesFromSolids, prepareRender } from '@jscad/regl-renderer'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import * as orbitView from './orbitView'
import type { OrbitView } from './orbitView'

export type RGBA = [number, number, number, number]

export interface ViewerColors {
    background: RGBA
    mesh: RGBA
    grid: RGBA
    subGrid: RGBA
}

export const DEFAULT_COLORS: ViewerColors = {
    background: [0.5, 0.5, 0.5, 1],
    mesh: [0, 0.6, 1, 1],
    grid: [0, 0, 0, 1],
    subGrid: [0, 0, 1, 0.5],
}

export interface ViewerEngine {
    setScene(solids: Geom3[], colors: ViewerColors): void
    /** Apply a camera transition and schedule a redraw. */
    update(fn: (view: OrbitView) => OrbitView): void
    destroy(): void
}

/**
 * Owns the canvas, WebGL context, camera and animation frame for one viewer. Kept outside React
 * so pointer moves update the camera without re-rendering components.
 */
export function createViewerEngine(host: HTMLElement): ViewerEngine {
    const canvas = document.createElement('canvas')
    canvas.style.display = 'block'
    host.appendChild(canvas)

    let view: OrbitView | null = null
    let content: object | null = null
    let frame: number | null = null
    let render: ((data: unknown) => void) | null = null

    const requestFrame = () => {
        if (frame !== null) return
        frame = requestAnimationFrame(() => {
            frame = null
            if (!view || !render || !content) return
            const next = orbitView.step(view)
            view = next.view
            render({ camera: view.camera, ...content })
            if (next.changed) requestFrame()
        })
    }

    const fit = () => {
        const width = Math.max(1, host.clientWidth)
        const height = Math.max(1, host.clientHeight)
        const ratio = window.devicePixelRatio || 1
        canvas.width = Math.round(width * ratio)
        canvas.height = Math.round(height * ratio)
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        view = view ? orbitView.resize(view, width, height) : orbitView.createView(width, height)
        requestFrame()
    }

    fit()
    try {
        render = prepareRender({ glOptions: { canvas } })
    } catch (e) {
        console.error('WebGL is not available', e)
    }

    const observer = new ResizeObserver(fit)
    observer.observe(host)

    return {
        setScene(solids, colors) {
            content = {
                rendering: { background: colors.background, meshColor: colors.mesh },
                drawCommands: {
                    drawGrid: drawCommands.drawGrid,
                    drawAxis: drawCommands.drawAxis,
                    drawMesh: drawCommands.drawMesh,
                },
                entities: [
                    {
                        visuals: {
                            drawCmd: 'drawGrid',
                            show: true,
                            color: colors.grid,
                            subColor: colors.subGrid,
                            fadeOut: false,
                            transparent: true,
                        },
                        size: [144, 144],
                        ticks: [12, 1],
                    },
                    { visuals: { drawCmd: 'drawAxis', show: true } },
                    ...entitiesFromSolids({ color: colors.mesh }, ...solids),
                ],
            }
            requestFrame()
        },
        update(fn) {
            if (!view) return
            view = fn(view)
            requestFrame()
        },
        destroy() {
            observer.disconnect()
            if (frame !== null) cancelAnimationFrame(frame)
            frame = null
            render = null
            // prepareRender has no destroy(), so release the GL context ourselves.
            canvas.getContext('webgl')?.getExtension('WEBGL_lose_context')?.loseContext()
            canvas.remove()
        },
    }
}
