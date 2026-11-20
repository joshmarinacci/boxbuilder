declare module '@jscad/stl-serializer' {
    import type { Geometry } from '@jscad/modeling/src/geometries/types'

    export const mimeType: string
    export function serialize(
        options: { binary?: boolean; statusCallback?: (status: { progress: number }) => void },
        ...objects: Geometry[]
    ): BlobPart[]
}
