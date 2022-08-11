import React, {useEffect, useState} from 'react';
import z, {ZodSchema} from "zod";
import {cuboid} from "@jscad/modeling/src/primitives";
// @ts-ignore
import * as serializer from "@jscad/stl-serializer"
import {Renderer} from "jscad-react";
import {forceDownloadBlob} from "./util";
import {AutoForm} from "./autoform";
import './App.css';
import {Geom3} from "@jscad/modeling/src/geometries/types";

export const BoxSchema = z.object({
    width:z.number(),
    height:z.number(),
    depth:z.number(),
    thickness:z.number().min(1).max(5)
})
type Box = z.infer<typeof BoxSchema>;


function box_to_solids(new_box:Box):Geom3[] {
    return [
        cuboid({size: [ new_box.width, new_box.height, new_box.depth ]})
    ]
}

function make_start_doc(schema:ZodSchema, backup:object):Box {
    const start_box:Box = schema.parse(backup)
    try {
        let q = window.location.search
        // console.log("page start", q)
        if(q && q.startsWith("?data=")) {
            q = q.substring(6)
            let json = decodeURIComponent(q)
            let data = BoxSchema.parse(JSON.parse(json))
            console.log("got data from url",data)
            return data
        }
    }catch (e) {
        console.log('error happened',e)
    }
    return start_box
}

const export_stl = (solids:Geom3[]) => {
    const rawData = serializer.serialize({binary:true},solids)
    const blob = new Blob(rawData,{type:"model/stl"})
    forceDownloadBlob("sphere.stl",blob)
}


const default_box = {
    width:10,
    height:5,
    depth:5,
    thickness:2
}

function App() {
    const [box, set_box] = useState<Box>(()=> make_start_doc(BoxSchema, default_box))
    const solids = box_to_solids(box)

    const update_box = (new_box:Box) => {
        set_box(new_box)
        let str = encodeURIComponent(JSON.stringify(new_box))
        window.history.pushState(new_box,'box-state',"?data="+str)
    }
    useEffect(()=>{
        const history_changed = (event:PopStateEvent) => {
            try {
                set_box(BoxSchema.parse(event.state))
            } catch (e) {
                console.log("error restoring from history")
            }
        }
        window.addEventListener("popstate",history_changed)
        return () => {
            window.removeEventListener("popstate",history_changed)
        }
    },[window])
    return <div>
        <AutoForm object={box} schema={BoxSchema} onChange={update_box}/>
        <Renderer solids={solids}  width={800} height={450}/>
        <button onClick={()=>export_stl(solids)}>to STL</button>
    </div>
}

export default App;
