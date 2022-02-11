const express = require("express")
const minimist = require("minimist")
const cluster = require("cluster")
const {fork} = require("child_process")
const core = require("os")

const app = express()

let minimizedArgs= minimist(process.argv)
let port = minimizedArgs.port || 8082
if (!minimizedArgs.mode) minimizedArgs.mode= "FORK"

let server
if (minimizedArgs.mode === "CLUSTER") {    
    if (cluster.isMaster) {
        console.log(`proceso primario, port: ${port} - pid: ${process.pid}`)
        for (let i=0; i<core.cpus().length; i++) {
            cluster.fork()
        }
        cluster.on("exit",(worker,code,signal)=> {
            console.log(`worker ${worker.process.pid} caído`)
            cluster.fork()
            console.log(`worker restaurado`)
        })
    } else {
        server = app.listen(port, ()=>{
            console.log(`Servidor worker pid: ${process.pid} escuchando en ${port} `)
        })
    }
} else if (minimizedArgs.mode === "FORK") {
    server = app.listen(port, ()=> {
        console.log(`listening in ${port}`)
    })
}

app.get("/", (req,res)=> {
    res.send(minimizedArgs)
})

app.get("/info", (req,res)=> {
    const info= {
        entry_arg: minimizedArgs._.slice(2),
        platform: process.platform,
        node_version: process.version,
        reserved_memory: process.memoryUsage(),
        execution_path: process.execPath,
        process_id: process.pid,
        proyect_folder: process.cwd(),
        cpus: cluster.isMaster? 1 : core.cpus().length,
        port: port,
        mode: minimizedArgs.mode    
    }
    res.send(info)
})

app.get("/api/randoms", (req,res)=> {
    const cantidad= req.query.cant
    const childProcess = fork("./src/calculus.js",[cantidad])
    childProcess.on("message", data => {
        console.log(data)
        res.send({pid: process.pid, port:port, lista: data})
    })
})