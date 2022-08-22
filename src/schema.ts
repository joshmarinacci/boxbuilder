import {ZodSchema} from "zod";
import {useEffect, useState} from "react";

export function start_doc<T>(schema: ZodSchema, backup: object): T {
    const start_box = schema.parse(backup)
    try {
        let q = window.location.search
        // console.log("page start", q)
        if (q && q.startsWith("?data=")) {
            q = q.substring(6)
            let json = decodeURIComponent(q)
            let data = schema.parse(JSON.parse(json))
            console.log("got data from url", data)
            return data
        }
    } catch (e) {
        console.log('error happened', e)
    }
    return start_box
}

let debounce_timer:any
function debounce(callback:any, time:number) {
    clearTimeout(debounce_timer)
    debounce_timer = setTimeout(callback,time)
}
export function save_doc<T>(new_box: T) {
    debounce(()=>{
        let str = encodeURIComponent(JSON.stringify(new_box))
        window.history.pushState(new_box, 'box-state', "?data=" + str)
    },1000)
}

export function useHistoryDoc<A>(schema: ZodSchema, default_box: any): [A, (a: A) => void] {
    const [box, set_box] = useState<A>(() => start_doc<A>(schema, default_box))
    const do_set_box = (box: A) => {
        set_box(box)
        save_doc<A>(box)
    }
    useEffect(() => {
        const history_changed = (event: PopStateEvent) => {
            try {
                do_set_box(schema.parse(event.state))
            } catch (e) {
                console.log("error restoring from history")
            }
        }
        window.addEventListener("popstate", history_changed)
        return () => {
            window.removeEventListener("popstate", history_changed)
        }
    })
    return [box, do_set_box]
}
