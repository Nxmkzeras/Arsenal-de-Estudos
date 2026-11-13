(function() {
    "use strict";
    const {h: h, icon: icon} = U;
    const ARQ = "arsenal-backup.json", CHAVE = "backup.pasta", RE_DIA = /^arsenal-backup-\d{4}-\d\d-\d\d\.json$/;
    const INTERVALO = 3 * 6e4;
    const exe = window.arsenalExe && window.arsenalExe.backup ? window.arsenalExe.backup : null;
    const nomeDe = caminho => String(caminho || "").replace(/[\\/]+$/, "").split(/[\\/]/).pop() || String(caminho || "");
    const B = {
        nativo: !!exe,
        suportado: !!exe || typeof window.showDirectoryPicker === "function",
        configurado: false,
        estado: "desligado",
        nome: "",
        caminho: "",
        ultimoEm: 0,
        erro: "",
        precisaEscolher: false,
        _h: null,
        _v: -1,
        _ocupado: false,
        _nSes: 0
    };
    const avisa = () => {
        try {
            window.Views && Views.refresh && Views.refresh();
        } catch (e) {}
    };
    function haQuanto(ms) {
        if (!ms) return "nunca";
        const m = Math.floor((Date.now() - ms) / 6e4);
        if (m < 1) return "agora há pouco";
        if (m < 60) return "há " + m + " min";
        const hh = Math.floor(m / 60);
        if (hh < 24) return "há " + hh + " h";
        const d = Math.floor(hh / 24);
        return "há " + U.plural(d, "dia", "dias");
    }
    async function grava(nome, texto) {
        const fh = await B._h.getFileHandle(nome, {
            create: true
        });
        const w = await fh.createWritable();
        await w.write(texto);
        await w.close();
    }
    async function limpaAntigos() {
        try {
            const nomes = [];
            for await (const [nome] of B._h.entries()) if (RE_DIA.test(nome)) nomes.push(nome);
            nomes.sort();
            for (const n of nomes.slice(0, Math.max(0, nomes.length - 7))) await B._h.removeEntry(n);
        } catch (e) {}
    }
    const temPasta = () => exe ? !!B.caminho : !!B._h;
    async function salvar(forcar) {
        if (!temPasta() || B._ocupado || B.estado === "pausa") return false;
        if (B.estado === "erro" && !forcar) return false;
        if (!forcar && B._v === Store._v) return false;
        B._ocupado = true;
        const antes = B.estado;
        try {
            const v = Store._v, texto = Store.exportar(true);
            if (exe) {
                const r = await exe.gravar(texto);
                if (!r || !r.ok) {
                    const e = new Error(r && r.erro || "Não consegui gravar.");
                    e.nativo = true;
                    throw e;
                }
            } else {
                await grava(ARQ, texto);
                await grava("arsenal-backup-" + U.ymd() + ".json", texto);
                await limpaAntigos();
            }
            B._v = v;
            B.ultimoEm = Date.now();
            B.estado = "ok";
            B.erro = "";
            Store.s.config.backupPastaEm = B.ultimoEm;
            Store.s.config.ultimoBackupEm = B.ultimoEm;
            Store.salvarLogo();
            if (antes !== "ok" || forcar) avisa();
            return true;
        } catch (e) {
            const nomeErro = e && e.name || "";
            if (!e.nativo && (nomeErro === "NotAllowedError" || nomeErro === "SecurityError")) B.estado = "pausa"; else {
                B.estado = "erro";
                B.erro = e.nativo ? e.message : nomeErro === "NotFoundError" ? "A pasta não foi encontrada (foi movida ou apagada?)." : String(e && e.message || e);
            }
            if (antes !== B.estado) avisa();
            return false;
        } finally {
            B._ocupado = false;
        }
    }
    async function reconferir() {
        if (!exe || !B.caminho || B.estado !== "erro") return;
        try {
            const est = await exe.estado();
            if (est && est.ok) {
                B.estado = "ok";
                B.erro = "";
                B._v = -1;
                avisa();
                await salvar(true);
            } else if (est && est.erro && est.erro !== B.erro) {
                B.erro = est.erro;
                avisa();
            }
        } catch (e) {}
    }
    async function iniciar() {
        if (!B.suportado) return;
        if (exe) await iniciarNativo(); else await iniciarNavegador();
        B._nSes = Store.s.sessoes.length;
        setInterval((() => {
            if (B.estado === "ok" && Date.now() - B.ultimoEm >= INTERVALO) salvar(false); else reconferir();
        }), 6e4);
        document.addEventListener("visibilitychange", (() => {
            if (document.hidden && B.estado === "ok") salvar(false);
        }));
        Store.on((() => {
            const n = Store.s.sessoes.length;
            if (n !== B._nSes) {
                B._nSes = n;
                if (B.estado === "ok") setTimeout((() => salvar(false)), 2500);
            }
        }));
    }
    async function iniciarNavegador() {
        const hd = await Store.kvGet(CHAVE);
        if (hd && typeof hd.queryPermission === "function") {
            B._h = hd;
            B.configurado = true;
            B.nome = hd.name;
            B.ultimoEm = Store.s.config.backupPastaEm || 0;
            try {
                B.estado = await hd.queryPermission({
                    mode: "readwrite"
                }) === "granted" ? "ok" : "pausa";
            } catch (e) {
                B.estado = "pausa";
            }
            avisa();
            if (B.estado === "pausa") {
                const tenta = () => {
                    document.removeEventListener("pointerdown", tenta, true);
                    if (B.estado === "pausa") reativar(true);
                };
                document.addEventListener("pointerdown", tenta, true);
            }
        }
    }
    async function iniciarNativo() {
        let est = null;
        try {
            est = await exe.estado();
        } catch (e) {}
        if (est && est.pasta) {
            B.caminho = est.pasta;
            B.nome = nomeDe(est.pasta);
            B.configurado = true;
            B.ultimoEm = Store.s.config.backupPastaEm || 0;
            B.estado = est.ok ? "ok" : "erro";
            B.erro = est.erro || "";
            avisa();
            if (est.ok) {
                B._v = -1;
                setTimeout((() => salvar(false)), 4e3);
            }
            return;
        }
        const nomeAntigo = Store.s.config.backupPasta;
        if (nomeAntigo) {
            let achou = null;
            try {
                achou = await exe.descobrir(nomeAntigo);
            } catch (e) {}
            if (achou) {
                const r = await exe.usar(achou);
                if (r && r.ok) {
                    B.caminho = achou;
                    B.nome = nomeDe(achou);
                    B.configurado = true;
                    B.estado = "ok";
                    B.ultimoEm = Store.s.config.backupPastaEm || 0;
                    B._v = -1;
                    setTimeout((() => U.toast('O backup automático voltou na pasta "' + B.nome + '". Agora ele não pausa mais.', "ok")), 1200);
                    avisa();
                    setTimeout((() => salvar(true)), 3e3);
                    return;
                }
            }
            B.precisaEscolher = true;
            B.nome = nomeAntigo;
            B.configurado = false;
            avisa();
        }
    }
    async function usarPasta(refPasta) {
        if (exe) {
            const r = await exe.usar(refPasta);
            if (!r || !r.ok) throw new Error(r && r.erro || "Não consegui usar essa pasta.");
            B.caminho = refPasta;
            B.nome = nomeDe(refPasta);
        } else {
            B._h = refPasta;
            B.nome = refPasta.name;
            await Store.kvSet(CHAVE, refPasta);
        }
        B.configurado = true;
        B.estado = "ok";
        B._v = -1;
        B.erro = "";
        B.precisaEscolher = false;
        Store.mut((s => {
            s.config.backupPasta = B.nome;
        }), true);
    }
    async function pedirPasta() {
        if (!B.suportado) {
            U.toast("Este navegador não deixa o app gravar numa pasta. Use o Chrome ou o Edge.", "err");
            return null;
        }
        if (exe) {
            const r = await exe.escolher();
            if (!r || r.cancelado) return null;
            return {
                ref: r.pasta,
                existente: r.existente || null,
                nome: nomeDe(r.pasta)
            };
        }
        let hd;
        try {
            hd = await window.showDirectoryPicker({
                id: "arsenal-backup",
                mode: "readwrite",
                startIn: "documents"
            });
        } catch (e) {
            if (e && e.name !== "AbortError") U.toast("Não consegui abrir a pasta: " + (e && e.message || e), "err");
            return null;
        }
        let existente = null;
        try {
            existente = await (await (await hd.getFileHandle(ARQ)).getFile()).text();
        } catch (e) {
            existente = null;
        }
        return {
            ref: hd,
            existente: existente,
            nome: hd.name
        };
    }
    async function escolherPasta() {
        const p = await pedirPasta();
        if (!p) return false;
        const temDados = Store.s.sessoes.length || Store.s.questoes.length || Object.keys(Store.s.progresso).length;
        if (p.existente && !temDados) {
            if (await U.confirmar("Esta pasta já tem um backup do Arsenal e este app está vazio. Quer restaurar os dados do backup?", "Restaurar")) {
                try {
                    Store.importar(p.existente, "substituir");
                    D.invalidarEdital();
                    U.toast("Backup restaurado.", "ok");
                } catch (e) {
                    U.toast(e.message, "err");
                    return false;
                }
            }
        } else if (p.existente && temDados) {
            if (!await U.confirmar("Esta pasta já tem um backup do Arsenal. O backup de lá será substituído pelos dados deste app (as cópias diárias antigas ficam). Continuar?", "Usar esta pasta")) return false;
        }
        try {
            await usarPasta(p.ref);
        } catch (e) {
            U.toast(e.message, "err");
            return false;
        }
        const ok = await salvar(true);
        U.toast(ok ? 'Backup automático ligado na pasta "' + p.nome + '".' : "Pasta escolhida, mas não consegui gravar nela. " + (B.erro || "Escolha outra."), ok ? "ok" : "err");
        avisa();
        return ok;
    }
    async function reativar(silencioso) {
        if (exe) {
            if (!B.caminho) return escolherPasta();
            B.estado = "erro";
            await reconferir();
            if (B.estado !== "ok") {
                const ok = await salvar(true);
                if (!ok && !silencioso) U.toast("Ainda não consegui gravar: " + (B.erro || "confira a pasta"), "err");
            } else U.toast("Backup automático funcionando.", "ok");
            avisa();
            return;
        }
        if (!B._h) return escolherPasta();
        try {
            if (await B._h.requestPermission({
                mode: "readwrite"
            }) === "granted") {
                B.estado = "ok";
                await salvar(true);
                U.toast("Backup automático reativado.", "ok");
            } else if (!silencioso) U.toast("Sem a permissão, o backup automático fica pausado.", "err");
        } catch (e) {
            if (!silencioso) U.toast("Não consegui reativar: " + (e && e.message || e), "err");
        }
        avisa();
    }
    async function desligar() {
        if (!await U.confirmar("Desligar o backup automático? Os arquivos que já estão na pasta continuam lá.", "Desligar")) return;
        if (exe) {
            try {
                await exe.desligar();
            } catch (e) {}
        } else await Store.kvSet(CHAVE, undefined);
        B._h = null;
        B.caminho = "";
        B.configurado = false;
        B.estado = "desligado";
        B.nome = "";
        B.erro = "";
        B.precisaEscolher = false;
        Store.mut((s => {
            s.config.backupPasta = "";
        }));
    }
    async function restaurarDePasta() {
        if (!B.suportado) return U.toast('Use "Importar e substituir tudo" com o arquivo arsenal-backup.json.', "err");
        const p = await pedirPasta();
        if (!p) return;
        if (!p.existente) return U.toast("Não achei o arquivo " + ARQ + " nessa pasta.", "err");
        if (!await U.confirmar("Restaurar o backup desta pasta? Os dados atuais do app serão substituídos pelos do arquivo.", "Restaurar")) return;
        try {
            Store.importar(p.existente, "substituir");
            D.invalidarEdital();
        } catch (e) {
            return U.toast(e.message, "err");
        }
        try {
            await usarPasta(p.ref);
        } catch (e) {
            return U.toast(e.message, "err");
        }
        B._v = Store._v;
        B.ultimoEm = Date.now();
        U.toast('Backup restaurado. A pasta "' + p.nome + '" continua sendo usada para o backup automático.', "ok");
        avisa();
    }
    function cartao() {
        const luz = B.estado === "ok" ? "ok" : B.estado === "pausa" || B.estado === "erro" ? "pausa" : "";
        let corpo;
        if (!B.suportado) corpo = h("p", {
            class: "hint"
        }, "Este navegador não permite gravar numa pasta sozinho. No Chrome ou no Edge esta opção aparece. Enquanto isso, use o backup manual abaixo."); else if (!B.configurado) corpo = h("div", {
            class: "col"
        }, B.precisaEscolher ? h("div", {
            class: "callout warn",
            role: "status"
        }, h("b", null, "Escolha a pasta do backup mais uma vez. "), 'Antes você tinha escolhido "' + B.nome + '", mas não consegui achar essa pasta neste computador. Escolhendo agora, o programa guarda o caminho e o backup deixa de pausar.') : null, h("p", {
            style: {
                margin: 0
            }
        }, "Escolha uma pasta que já sincroniza com a nuvem, por exemplo dentro do OneDrive, do Dropbox ou do Google Drive do computador. O Arsenal grava ali uma cópia dos seus dados a cada poucos minutos e ao fim de cada sessão. Se o PC for formatado, é só apontar a mesma pasta e restaurar."), h("div", {
            class: "row wrap"
        }, h("button", {
            class: "btn primary",
            onclick: escolherPasta
        }, icon("folder", "sm"), "Escolher a pasta do backup"), h("button", {
            class: "btn",
            onclick: restaurarDePasta
        }, icon("upload", "sm"), "Restaurar de uma pasta"))); else corpo = h("div", {
            class: "col"
        }, h("div", {
            class: "bk"
        }, h("span", {
            class: "bk-luz " + luz
        }), h("div", {
            class: "grow"
        }, h("div", {
            style: {
                fontWeight: 600
            }
        }, B.estado === "ok" ? 'Ligado · pasta "' + B.nome + '"' : B.estado === "pausa" ? 'Pausado · o navegador precisa que você libere a pasta "' + B.nome + '" de novo' : "Com erro · " + B.erro), h("div", {
            class: "small muted"
        }, "Última cópia: " + haQuanto(B.ultimoEm) + " · arquivo " + ARQ + " + 7 cópias diárias"), exe && B.caminho ? h("div", {
            class: "tiny muted ellipsis",
            title: B.caminho
        }, B.caminho) : null), B.estado === "pausa" ? h("button", {
            class: "btn primary",
            onclick: () => reativar()
        }, "Liberar a pasta") : B.estado === "erro" && exe ? h("button", {
            class: "btn primary",
            onclick: () => reativar()
        }, "Tentar de novo") : h("button", {
            class: "btn",
            onclick: async () => {
                const ok = await salvar(true);
                U.toast(ok ? "Cópia salva na pasta." : "Não consegui salvar. " + (B.erro || ""), ok ? "ok" : "err");
            }
        }, "Salvar agora")), B.estado === "pausa" ? h("div", {
            class: "hint"
        }, 'Dica: quando o Chrome perguntar, escolha "Permitir em todas as visitas" para não precisar liberar de novo. No aplicativo (.exe) isso não acontece.') : null, exe ? h("div", {
            class: "hint"
        }, "Neste aplicativo o backup é gravado pelo próprio programa: não depende de permissão do navegador e não pausa sozinho. Se a pasta do OneDrive estiver fora do ar, ele tenta de novo a cada minuto.") : null, h("div", {
            class: "row wrap"
        }, h("button", {
            class: "btn ghost sm",
            onclick: escolherPasta
        }, "Trocar de pasta"), h("button", {
            class: "btn ghost sm",
            onclick: restaurarDePasta
        }, "Restaurar de uma pasta"), exe ? h("button", {
            class: "btn ghost sm",
            onclick: () => exe.abrirPasta()
        }, "Abrir a pasta") : null, h("button", {
            class: "btn ghost sm",
            onclick: desligar
        }, "Desligar")));
        return h("div", {
            class: "card"
        }, h("h3", null, "Backup automático na nuvem"), corpo);
    }
    function linhaMenu() {
        if (!B.suportado) return null;
        const luz = B.estado === "ok" ? "ok" : B.configurado ? "pausa" : "";
        const texto = !B.configurado ? B.precisaEscolher ? "Backup: escolher a pasta" : "Backup automático desligado" : B.estado === "ok" ? "Backup " + haQuanto(B.ultimoEm) : B.estado === "pausa" ? "Backup pausado: liberar pasta" : "Backup com erro";
        return h("a", {
            class: "side-bk",
            href: "#/ajustes",
            title: B.configurado ? 'Pasta "' + B.nome + '"' : "Escolher uma pasta do OneDrive, Dropbox ou Google Drive",
            onclick: ev => {
                if (B.estado === "pausa") {
                    ev.preventDefault();
                    reativar();
                }
            }
        }, h("span", {
            class: "bk-luz " + luz
        }), texto);
    }
    Object.assign(B, {
        iniciar: iniciar,
        salvar: salvar,
        escolherPasta: escolherPasta,
        reativar: reativar,
        desligar: desligar,
        restaurarDePasta: restaurarDePasta,
        cartao: cartao,
        linhaMenu: linhaMenu,
        haQuanto: haQuanto
    });
    window.Backup = B;
})();