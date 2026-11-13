const {contextBridge: contextBridge, ipcRenderer: ipcRenderer} = require("electron");

contextBridge.exposeInMainWorld("desenhoApi", {
    esconder: () => ipcRenderer.invoke("desenho:esconder"),
    mouse: passa => ipcRenderer.invoke("desenho:mouse", !!passa),
    capturar: () => ipcRenderer.invoke("desenho:capturar"),
    abrirPasta: () => ipcRenderer.invoke("desenho:abrirPasta"),
    aoMostrar: cb => ipcRenderer.on("desenho:mostrou", (() => {
        try {
            cb();
        } catch (e) {}
    }))
});