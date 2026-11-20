import { describe, expect, it } from 'vitest'
import { createView, pan, resize, rotate, step, zoom } from './orbitView'
import type { OrbitView } from './orbitView'

const distance = (v: OrbitView) => {
    const { position: p, target: t } = v.camera
    return Math.hypot(p[0] - t[0], p[1] - t[1], p[2] - t[2])
}

function settle(view: OrbitView): OrbitView {
    let v = view
    for (let i = 0; i < 200; i++) {
        const s = step(v)
        v = s.view
        if (!s.changed) return v
    }
    throw new Error('camera never settled')
}

describe('orbitView', () => {
    it('starts looking at the origin with the viewport aspect ratio', () => {
        const v = createView(800, 400)
        expect(v.camera.aspect).toBe(2)
        expect(v.camera.target).toEqual([0, 0, 0])
        expect(step(v).changed).toBe(false)
    })

    it('updates the aspect ratio on resize', () => {
        expect(resize(createView(800, 400), 300, 300).camera.aspect).toBe(1)
    })

    it('rotates around the target without changing distance', () => {
        const start = createView(800, 400)
        const moved = settle(rotate(start, 100, 0))
        expect(moved.camera.position).not.toEqual(start.camera.position)
        expect(distance(moved)).toBeCloseTo(distance(start), 3)
    })

    it('zooms in and out', () => {
        const start = createView(800, 400)
        expect(distance(settle(zoom(start, -1)))).toBeLessThan(distance(start))
        expect(distance(settle(zoom(start, 1)))).toBeGreaterThan(distance(start))
    })

    it('pans the camera and target together', () => {
        const start = createView(800, 400)
        const moved = pan(start, 50, 0)
        expect(moved.camera.target).not.toEqual(start.camera.target)
        expect(distance(moved)).toBeCloseTo(distance(start), 3)
    })

    it('does not mutate the previous view', () => {
        const start = createView(800, 400)
        const before = JSON.stringify(start)
        settle(rotate(zoom(pan(start, 10, 10), 1), 30, 30))
        expect(JSON.stringify(start)).toBe(before)
    })
})
