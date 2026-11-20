import { z } from 'zod'
import { serialize } from '@jscad/stl-serializer'
import { cuboid, rectangle, roundedRectangle } from '@jscad/modeling/src/primitives'
import { subtract, union } from '@jscad/modeling/src/operations/booleans'
import { extrudeLinear } from '@jscad/modeling/src/operations/extrusions'
import { translate } from '@jscad/modeling/src/operations/transforms'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'

export const BoxSchema = z.object({
    width: z.number().min(1).int(),
    height: z.number().min(1).int(),
    depth: z.number().min(1).int(),
    wallThickness: z.number().min(0.1).max(5),
    lidThickness: z.number().min(0.1).max(5),
    lidTolerance: z.number().min(0.0).max(5),
    cornerRadius: z.number().min(1).max(5),
})
export type Box = z.infer<typeof BoxSchema>

export const DEFAULT_BOX: Box = {
    width: 10,
    height: 10,
    depth: 10,
    wallThickness: 2,
    lidThickness: 2,
    lidTolerance: 0.4,
    cornerRadius: 2,
}

const EPS = 0.01
// Segments per full circle (16 per corner). JSCAD's default of 32 leaves visible facets in prints.
const CORNER_SEGMENTS = 64

/**
 * A block centered on the origin in X/Y (and on `centerZ`) whose four vertical edges are rounded.
 * Only vertical edges are rounded, so the box rim and lid stay flat and seat against each other.
 * The radius is clamped so it always fits; a radius of ~0 gives square corners.
 */
function roundedBlock(width: number, depth: number, height: number, radius: number, centerZ = 0): Geom3 {
    const r = Math.max(0, Math.min(radius, width / 2 - EPS, depth / 2 - EPS))
    const outline =
        r < EPS
            ? rectangle({ size: [width, depth] })
            : roundedRectangle({ size: [width, depth], roundRadius: r, segments: CORNER_SEGMENTS })
    return translate([0, 0, centerZ - height / 2], extrudeLinear({ height }, outline))
}

/** Build the open box and its lid, laid out side by side on the build plate. */
export function boxToSolids(box: Box): Geom3[] {
    // gap between the two shapes
    const gap = 3
    const lidThick = box.lidThickness
    // Wall thickness and lid tolerance are per side. Clamp walls so the cavity always has some room.
    const thick = Math.min(box.wallThickness, (Math.min(box.width, box.depth) - 0.1) / 2)
    const lidTol = box.lidTolerance

    // How much narrower than the outside each part is, counting both sides.
    const cavityShrink = 2 * thick // the box's inside
    const plugShrink = cavityShrink + 2 * lidTol // the lid's insert, a tolerance gap inside the cavity
    const holeShrink = plugShrink + 2 * thick // the hole that turns the insert into a ring

    // Each inner outline is the outer one inset by half its shrink, and insetting a rounded
    // rectangle by d shrinks its corner radius by d. That keeps walls an even thickness around the
    // corners and keeps the lid insert the same shape as the opening it drops into.
    const r = box.cornerRadius
    const insetRadius = (shrink: number) => Math.max(0, r - shrink / 2)
    const fits = (shrink: number) => Math.min(box.width, box.depth) - shrink > EPS
    const inset = (shrink: number, height: number, centerZ = 0) =>
        roundedBlock(box.width - shrink, box.depth - shrink, height, insetRadius(shrink), centerZ)

    // The lid is a flat cap plus a ring that drops into the box opening. On small boxes with thick
    // walls there may be no room for the ring's hole (the ring becomes a solid plug), or for the
    // ring at all (the lid is just the cap).
    const lidCap = () => roundedBlock(box.width, box.depth, lidThick / 2, r, -lidThick / 2 / 2)
    const lidPlug = () => inset(plugShrink, lidThick)
    const lidHole = () => inset(holeShrink, 20, -lidThick / 2 / 2 + lidThick / 2)
    const lidRing = () => (fits(holeShrink) ? subtract(lidPlug(), lidHole()) : lidPlug())
    const lid = () => (fits(plugShrink) ? union(lidRing(), lidCap()) : lidCap())

    try {
        return [
            // the box: full-height cavity raised by `thick`, leaving a floor of that thickness
            translate(
                [-box.width / 2 - gap, 0, box.height / 2],
                subtract(roundedBlock(box.width, box.depth, box.height, r), inset(cavityShrink, box.height, thick)),
            ),
            // the lid
            translate([box.width / 2 + gap, 0, lidThick / 2], lid()),
        ]
    } catch (e) {
        console.log(e)
        return [cuboid({ size: [1, 1, 1] })]
    }
}

export function solidsToStlBlob(solids: Geom3[]): Blob {
    const rawData = serialize({ binary: true }, ...solids)
    return new Blob(rawData, { type: 'model/stl' })
}
