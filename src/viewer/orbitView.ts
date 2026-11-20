import { cameras, controls } from '@jscad/regl-renderer'

// Pure camera state for the 3D viewer. Every function returns a new OrbitView rather than
// mutating, so pointer, wheel and keyboard input all go through the same transitions and can
// be tested without WebGL.

const { perspective } = cameras
const { orbit } = controls

type Camera = (typeof perspective)['cameraState']
type Controls = (typeof orbit)['controlsState']

export interface OrbitView {
    camera: Camera
    controls: Controls
}

// Same feel as the jscad-react viewer this replaces.
export const SPEEDS = { rotate: 0.002, pan: 0.75, zoom: 0.03 } as const
const INITIAL_POSITION = [50, -50, 50]

export function createView(width: number, height: number): OrbitView {
    const base: Camera = { ...perspective.defaults, position: [...INITIAL_POSITION] }
    const camera = withProjection(base, width, height)
    return { camera, controls: { ...orbit.defaults } }
}

function withProjection(camera: Camera, width: number, height: number): Camera {
    const projected = { ...camera, ...perspective.setProjection(null, camera, { width, height }) }
    return { ...projected, ...perspective.update({ ...projected }, projected) }
}

export function resize(view: OrbitView, width: number, height: number): OrbitView {
    return { ...view, camera: withProjection(view.camera, width, height) }
}

/** Queue a rotation by a screen-space drag of (dx, dy) pixels. Applied by `step`. */
export function rotate(view: OrbitView, dx: number, dy: number): OrbitView {
    const r = orbit.rotate({ ...view, speed: SPEEDS.rotate }, [dx, -dy])
    return { ...view, controls: { ...view.controls, ...r.controls } }
}

/** Queue a zoom step. Positive zooms out, negative zooms in. Applied by `step`. */
export function zoom(view: OrbitView, delta: number): OrbitView {
    const z = orbit.zoom({ ...view, speed: SPEEDS.zoom }, delta)
    return { ...view, controls: { ...view.controls, ...z.controls } }
}

/** Move camera and target together by a screen-space drag of (dx, dy) pixels. */
export function pan(view: OrbitView, dx: number, dy: number): OrbitView {
    const p = orbit.pan({ ...view, speed: SPEEDS.pan }, [-dx, dy])
    const moved = { ...view.camera, ...p.camera }
    return { ...view, camera: { ...moved, ...perspective.update({ ...moved }, moved) } }
}

/**
 * Advance one animation frame: apply queued rotation/zoom (with the orbit controls' momentum)
 * and report whether the camera moved, so the caller knows whether to keep animating.
 */
export function step(view: OrbitView): { view: OrbitView; changed: boolean } {
    const u = orbit.update(view)
    const { changed, ...rest } = u.controls
    return {
        view: { camera: { ...view.camera, ...u.camera }, controls: { ...view.controls, ...rest } },
        changed,
    }
}
