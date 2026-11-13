const {contextBridge: contextBridge, ipcRenderer: ipcRenderer} = require("electron");

const inv = (canal, ...a) => ipcRenderer.invoke(canal, ...a);

let temPessoal = false;

try {
    temPessoal = !!ipcRenderer.sendSync("casca:pessoal");
} catch (e) {
    temPessoal = false;
}

const pessoal = temPessoal ? {
    puxar: () => inv("pessoal:puxar"),
    confirmar: ids => inv("pessoal:confirmar", ids),
    abrirNavegador: instalar => inv("pessoal:abrirNavegador", !!instalar),
    pasta: () => inv("pessoal:pasta"),
    abrirPasta: () => inv("pessoal:abrirPasta")
} : undefined;

contextBridge.exposeInMainWorld("arsenalExe", {
    ativo: true,
    versaoCasca: 2,
    info: () => inv("app:info"),
    ...pessoal ? {
        pessoal: pessoal
    } : {},
    relatorioPdf: (html, nome) => inv("relatorio:pdf", html, nome),
    desenho: {
        abrir: () => inv("desenho:abrir"),
        abrirPasta: () => inv("desenho:abrirPasta")
    },
    mini: {
        abrir: () => inv("mini:abrir"),
        fechar: () => inv("mini:fechar"),
        estado: st => ipcRenderer.send("mini:estado", st),
        aoMudar: cb => ipcRenderer.on("mini:aberto", ((_e, aberto) => {
            try {
                cb(!!aberto);
            } catch (e) {}
        })),
        aoComando: cb => ipcRenderer.on("mini:cmd", ((_e, c) => {
            try {
                cb(c);
            } catch (e) {}
        }))
    },
    publicacao: () => inv("pub:info"),
    atualizacao: {
        verificar: () => inv("atu:verificar"),
        baixar: () => inv("atu:baixar"),
        aplicar: () => inv("atu:aplicar"),
        resultado: () => inv("atu:resultado"),
        backup: (texto, versao) => inv("atu:backup", texto, versao),
        aoProgresso: cb => ipcRenderer.on("atu:progresso", ((_e, p) => {
            try {
                cb(p);
            } catch (e) {}
        }))
    },
    config: () => inv("exe:config:ler"),
    definirConfig: p => inv("exe:config:definir", p),
    chamar: () => inv("app:chamar"),
    sair: () => inv("app:sair"),
    aoNavegar: cb => ipcRenderer.on("app:navegar", ((_e, hash) => {
        try {
            cb(hash);
        } catch (e) {}
    })),
    aoMudarConfig: cb => ipcRenderer.on("app:config-mudou", (() => {
        try {
            cb();
        } catch (e) {}
    })),
    aoSalvar: cb => ipcRenderer.on("app:salvar", (async () => {
        try {
            await cb();
        } catch (e) {}
        ipcRenderer.send("app:salvo");
    })),
    espelhoGravar: (texto, rotulo) => inv("espelho:gravar", texto, rotulo),
    espelhoLer: () => inv("espelho:ler"),
    espelhoAbrirPasta: () => inv("espelho:abrirPasta"),
    backup: {
        estado: () => inv("backup:estado"),
        escolher: () => inv("backup:escolher"),
        usar: pasta => inv("backup:usar", pasta),
        gravar: texto => inv("backup:gravar", texto),
        ler: () => inv("backup:ler"),
        desligar: () => inv("backup:desligar"),
        abrirPasta: () => inv("backup:abrirPasta"),
        descobrir: nome => inv("backup:descobrir", nome)
    }
});