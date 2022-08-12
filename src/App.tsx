import React from 'react';
import z from "zod";
// @ts-ignore
import * as serializer from "@jscad/stl-serializer"
import {Renderer} from "jscad-react";
import {forceDownloadBlob} from "./util";
import {AutoForm} from "./autoform";
import './App.css';
import {cuboid, roundedCuboid} from "@jscad/modeling/src/primitives";
import {Geometry} from "@jscad/modeling/src/geometries/types";
import {useHistoryDoc} from "./schema";
import {subtract,union} from "@jscad/modeling/src/operations/booleans";
import {transforms} from "@jscad/modeling";

export const BoxSchema = z.object({
    width:z.number().min(1).int(),
    height:z.number().min(1).int(),
    depth:z.number().min(1).int(),
    thickness:z.number().min(0.1).max(5),
    cornerRadius:z.number().min(1).max(5),
})
type Box = z.infer<typeof BoxSchema>;
const default_box = {
    width:10,
    height:5,
    depth:5,
    thickness:2,
    cornerRadius:2,
}

function min(numbers: number[]):number {
    let m = numbers[0]
    for(let v of numbers) {
        m = Math.min(m,v)
    }
    return m
}

function box_to_solids(box:Box):Geometry[] {
    let gap = 3
    let lid = 5
    // corner radius must be smaller than half the box dimensions
    let corner = min([box.width/2,box.depth/2,box.height/2,box.cornerRadius])
    //thickness must be less than box dimensions
    let thick = min([box.thickness, box.width-0.1])

    try {
    return [
        transforms.translate(
     [-box.width/2-gap,0,box.height/2],
            subtract(
                cuboid({
                    size: [ box.width, box.depth, box.height ],
                    // roundRadius: corner,
                }),
                cuboid({
                    size: [ box.width-thick, box.depth-thick, box.height ],
                    center:[0,0,thick],
                })
            )
        ),
        transforms.translate(
            [box.width/2+gap,0,lid/2],
            union(
                cuboid({
                    size:[box.width-thick, box.depth-thick, lid],
                }),
                cuboid({
                    size:[box.width, box.depth, lid/2],
                    center:[0,0,-lid/2/2],
                }),
            )
        ),
        ]
    } catch (e) {
        console.log(e)
        return [cuboid({size:[1,1,1]})]
    }

}
const export_stl = (solids:Geometry[]) => {
    const rawData = serializer.serialize({binary:true},solids)
    const blob = new Blob(rawData,{type:"model/stl"})
    forceDownloadBlob("box.stl",blob)
}

function App() {
    const [box, set_box] = useHistoryDoc<Box>(BoxSchema, default_box)
    const solids = box_to_solids(box)
    return <div>
        <AutoForm object={box} schema={BoxSchema} onChange={set_box}/>
        <Renderer solids={solids}  width={800} height={450}/>
        <button onClick={()=>export_stl(solids)}>to STL</button>
    </div>
}

export default App;
