const {contextBridge: contextBridge, ipcRenderer: ipcRenderer} = require("electron");

contextBridge.exposeInMainWorld("miniApi", {
    ler: () => ipcRenderer.invoke("mini:ler"),
    aoMudar: cb => ipcRenderer.on("mini:estado", ((_e, st) => {
        try {
            cb(st);
        } catch (e) {}
    })),
    comando: c => ipcRenderer.send("mini:cmd", c),
    menu: () => ipcRenderer.send("mini:menu"),
    fechar: () => ipcRenderer.invoke("mini:fechar")
});