import { describe, expect, it } from 'vitest'
import { measureBoundingBox, measureVolume } from '@jscad/modeling/src/measurements'
import { geom3 } from '@jscad/modeling/src/geometries'
import { DEFAULT_BOX, boxToSolids, solidsToStlBlob, BoxSchema } from './box'

describe('boxToSolids', () => {
    it('builds a box and a lid', () => {
        expect(boxToSolids(DEFAULT_BOX)).toHaveLength(2)
    })

    it('sizes the box to the requested outer dimensions, sitting on the build plate', () => {
        const box = { ...DEFAULT_BOX, width: 30, depth: 20, height: 15 }
        const [[min, max]] = [measureBoundingBox(boxToSolids(box)[0])]
        expect(max[0] - min[0]).toBeCloseTo(30)
        expect(max[1] - min[1]).toBeCloseTo(20)
        expect(max[2] - min[2]).toBeCloseTo(15)
        expect(min[2]).toBeCloseTo(0)
    })

    it('places the box and lid side by side without overlapping', () => {
        const [boxSolid, lid] = boxToSolids({ ...DEFAULT_BOX, width: 30 })
        const [, boxMax] = measureBoundingBox(boxSolid)
        const [lidMin] = measureBoundingBox(lid)
        expect(boxMax[0]).toBeLessThan(lidMin[0])
    })

    it('makes the lid cap as wide as the box', () => {
        const box = { ...DEFAULT_BOX, width: 25, depth: 18 }
        const [min, max] = measureBoundingBox(boxToSolids(box)[1])
        expect(max[0] - min[0]).toBeCloseTo(25)
        expect(max[1] - min[1]).toBeCloseTo(18)
    })
})

describe('wall thickness and lid tolerance', () => {
    // Exact area of a rounded rectangle; the meshes approximate the arcs with 16 segments per corner.
    const area = (w: number, d: number, r: number) => w * d - (4 - Math.PI) * Math.max(0, r) ** 2
    const box = {
        width: 40,
        depth: 30,
        height: 20,
        wallThickness: 1.5,
        lidThickness: 2,
        lidTolerance: 0.4,
        cornerRadius: 5,
    }
    const t = box.wallThickness
    const tol = box.lidTolerance

    // Regression: each side wall used to be half the wall thickness.
    it('makes every side wall and the floor wallThickness thick', () => {
        const outer = area(box.width, box.depth, box.cornerRadius) * box.height
        const cavity = area(box.width - 2 * t, box.depth - 2 * t, box.cornerRadius - t) * (box.height - t)
        expect(measureVolume(boxToSolids(box)[0]) / (outer - cavity)).toBeCloseTo(1, 2)
    })

    // Regression: lid tolerance used to be the total gap, split between the two sides.
    it('leaves lidTolerance of clearance on each side of the lid insert, whose ring is wallThickness thick', () => {
        const capVolume = area(box.width, box.depth, box.cornerRadius) * (box.lidThickness / 2)
        const plug = area(box.width - 2 * t - 2 * tol, box.depth - 2 * t - 2 * tol, box.cornerRadius - t - tol)
        const hole = area(box.width - 4 * t - 2 * tol, box.depth - 4 * t - 2 * tol, box.cornerRadius - 2 * t - tol)
        const ringAboveCap = (plug - hole) * (box.lidThickness / 2)
        expect(measureVolume(boxToSolids(box)[1]) / (capVolume + ringAboveCap)).toBeCloseTo(1, 2)
    })

    it('defaults to a snug 0.4mm lid tolerance', () => {
        expect(DEFAULT_BOX.lidTolerance).toBe(0.4)
    })
})

describe('corner radius', () => {
    const big = { ...DEFAULT_BOX, width: 30, depth: 20, height: 15 }

    // Regression: cornerRadius used to be ignored entirely.
    it('rounds the box and lid, removing material at the corners', () => {
        const [squareBox, squareLid] = boxToSolids({ ...big, cornerRadius: 1 })
        const [roundBox, roundLid] = boxToSolids({ ...big, cornerRadius: 5 })
        expect(measureVolume(roundBox)).toBeLessThan(measureVolume(squareBox))
        expect(measureVolume(roundLid)).toBeLessThan(measureVolume(squareLid))
    })

    it('keeps the outer dimensions', () => {
        const [min, max] = measureBoundingBox(boxToSolids({ ...big, cornerRadius: 5 })[0])
        expect(max[0] - min[0]).toBeCloseTo(30)
        expect(max[1] - min[1]).toBeCloseTo(20)
        expect(max[2] - min[2]).toBeCloseTo(15)
    })

    it('only rounds vertical edges, so the rim and floor stay flat', () => {
        const [min, max] = measureBoundingBox(boxToSolids({ ...big, cornerRadius: 5 })[0])
        const topVertices = geom3
            .toPoints(boxToSolids({ ...big, cornerRadius: 5 })[0])
            .flat()
            .filter((p) => Math.abs(p[2] - max[2]) < 1e-6)
        // The rim's outer edge reaches the full width at the top, not just at mid-height.
        const xs = topVertices.map((p) => p[0])
        expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(max[0] - min[0])
    })

    it.each([
        { label: 'radius larger than the box', box: { ...DEFAULT_BOX, width: 4, depth: 4, cornerRadius: 5 } },
        { label: 'walls thicker than the radius', box: { ...DEFAULT_BOX, wallThickness: 5, cornerRadius: 1 } },
        { label: 'zero lid tolerance', box: { ...DEFAULT_BOX, lidTolerance: 0, cornerRadius: 3 } },
    ])('builds real geometry with $label', ({ box }) => {
        const solids = boxToSolids(box)
        expect(solids).toHaveLength(2)
        // The error fallback is a single 1mm cube.
        const [min, max] = measureBoundingBox(solids[0])
        expect(max[0] - min[0]).toBeCloseTo(box.width)
    })
})

describe('solidsToStlBlob', () => {
    it('produces a binary STL', async () => {
        const blob = solidsToStlBlob(boxToSolids(DEFAULT_BOX))
        expect(blob.type).toBe('model/stl')
        const bytes = new DataView(await blob.arrayBuffer())
        // binary STL: 80 byte header, uint32 triangle count, 50 bytes per triangle
        const triangles = bytes.getUint32(80, true)
        expect(triangles).toBeGreaterThan(0)
        expect(bytes.byteLength).toBe(84 + triangles * 50)
    })
})

describe('BoxSchema', () => {
    it('accepts the defaults', () => {
        expect(BoxSchema.parse(DEFAULT_BOX)).toEqual(DEFAULT_BOX)
    })

    it('rejects non-integer widths', () => {
        expect(BoxSchema.safeParse({ ...DEFAULT_BOX, width: 10.5 }).success).toBe(false)
    })
})
