import React from 'react';
import z from "zod";
import {cuboid} from "@jscad/modeling/src/primitives";
// @ts-ignore
import * as serializer from "@jscad/stl-serializer"
import {Renderer} from "jscad-react";
import {forceDownloadBlob} from "./util";
import {AutoForm} from "./autoform";
import './App.css';
import {Geom3} from "@jscad/modeling/src/geometries/types";
import {useHistoryDoc} from "./schema";

export const BoxSchema = z.object({
    width:z.number(),
    height:z.number(),
    depth:z.number(),
    thickness:z.number().min(1).max(5)
})
type Box = z.infer<typeof BoxSchema>;
const default_box = {
    width:10,
    height:5,
    depth:5,
    thickness:2
}

function box_to_solids(new_box:Box):Geom3[] {
    return [
        cuboid({size: [ new_box.width, new_box.height, new_box.depth ]})
    ]
}
const export_stl = (solids:Geom3[]) => {
    const rawData = serializer.serialize({binary:true},solids)
    const blob = new Blob(rawData,{type:"model/stl"})
    forceDownloadBlob("sphere.stl",blob)
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
