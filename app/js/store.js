(function() {
    "use strict";
    const KEY = "arsenal.estado.v1";
    const TEMA_KEY = "arsenal.tema";
    const DB = "arsenal-estudos", ST = "kv";
    const VERSAO = 2;
    const LISTAS = [ "sessoes", "questoes", "pastas", "revisoes", "registrosQ", "simulados", "cartoes" ];
    const OBJETOS = [ "config", "perfil", "ciclo", "cron", "progresso", "editaisCustom", "dia", "flashDia" ];
    const EXTRA = {
        listas: [],
        objetos: [],
        padrao: []
    };
    const listas = () => LISTAS.concat(EXTRA.listas);
    function padrao() {
        const p = {
            v: VERSAO,
            perfil: {
                nome: "Concurseiro"
            },
            carreiraId: "bb",
            editaisCustom: {},
            config: {
                metaDiariaMin: 60,
                metaSemanalMin: 420,
                sessaoPadraoMin: 50,
                revisaoDias: [ 1, 7, 30, 60 ],
                tema: "claro",
                som: true,
                notificar: false,
                pausaMin: 10,
                provaData: "",
                ultimoBackupEm: 0,
                divisao: {
                    teoria: 50,
                    questoes: 30,
                    revisao: 20
                },
                tourVisto: false,
                blocoMin: 60,
                backupPasta: "",
                backupPastaEm: 0,
                backupLembreteEm: 0,
                flash: {
                    novosDia: 20,
                    revDia: 200,
                    retencao: .9
                }
            },
            progresso: {},
            revisoes: [],
            sessoes: [],
            registrosQ: [],
            questoes: [],
            simulados: [],
            dia: {
                data: "",
                metaMin: 0,
                blocos: []
            },
            pastas: [],
            cartoes: [],
            flashDia: {},
            ciclo: {
                itens: [],
                voltas: 0,
                voltaIniEm: Date.now(),
                fixada: null,
                pulou: [],
                metodo: {
                    horasDia: 1,
                    dias: 7,
                    porPeso: true,
                    intercalar: true
                }
            },
            cron: {
                status: "parado",
                modo: "livre",
                alvoMin: 50,
                discId: null,
                topicoId: null,
                tipo: "teoria",
                fixa: false,
                iniMs: null,
                acumMs: 0,
                inicioMs: null
            },
            criadoEm: Date.now()
        };
        EXTRA.padrao.forEach((f => mesclarPadrao(p, f())));
        return p;
    }
    let dbp = null;
    function abrirDB() {
        if (dbp) return dbp;
        dbp = new Promise(((res, rej) => {
            if (!window.indexedDB) return rej(new Error("sem indexedDB"));
            const r = indexedDB.open(DB, 1);
            r.onupgradeneeded = () => r.result.createObjectStore(ST);
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
            r.onblocked = () => rej(new Error("banco bloqueado"));
        }));
        dbp.catch((() => {
            dbp = null;
        }));
        return dbp;
    }
    const comTempo = (p, ms) => Promise.race([ p, new Promise(((_, rej) => setTimeout((() => rej(new Error("tempo esgotado"))), ms))) ]);
    async function lerBruto() {
        try {
            const db = await comTempo(abrirDB(), 4e3);
            const v = await new Promise(((res, rej) => {
                const q = db.transaction(ST).objectStore(ST).get(KEY);
                q.onsuccess = () => res(q.result);
                q.onerror = () => rej(q.error);
            }));
            if (v) return v;
        } catch (e) {}
        try {
            const t = localStorage.getItem(KEY);
            if (t) return JSON.parse(t);
        } catch (e) {}
        return null;
    }
    async function gravarBruto(obj) {
        obj._salvoEm = Date.now();
        try {
            const db = await comTempo(abrirDB(), 4e3);
            await new Promise(((res, rej) => {
                const tx = db.transaction(ST, "readwrite");
                tx.objectStore(ST).put(obj, KEY);
                tx.oncomplete = res;
                tx.onerror = () => rej(tx.error);
                tx.onabort = () => rej(tx.error);
            }));
            return true;
        } catch (e) {}
        try {
            localStorage.setItem(KEY, JSON.stringify(obj));
            return true;
        } catch (e) {
            console.warn("Falha ao salvar", e);
            return false;
        }
    }
    async function kvGet(chave) {
        try {
            const db = await comTempo(abrirDB(), 4e3);
            return await new Promise(((res, rej) => {
                const q = db.transaction(ST).objectStore(ST).get(chave);
                q.onsuccess = () => res(q.result);
                q.onerror = () => rej(q.error);
            }));
        } catch (e) {
            return undefined;
        }
    }
    async function kvSet(chave, valor) {
        try {
            const db = await comTempo(abrirDB(), 4e3);
            await new Promise(((res, rej) => {
                const tx = db.transaction(ST, "readwrite");
                if (valor === undefined) tx.objectStore(ST).delete(chave); else tx.objectStore(ST).put(valor, chave);
                tx.oncomplete = res;
                tx.onerror = () => rej(tx.error);
                tx.onabort = () => rej(tx.error);
            }));
            return true;
        } catch (e) {
            return false;
        }
    }
    function mesclarPadrao(dst, src) {
        for (const k of Object.keys(src)) {
            if (dst[k] === undefined || dst[k] === null) dst[k] = JSON.parse(JSON.stringify(src[k])); else if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === "object") mesclarPadrao(dst[k], src[k]); else if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k]) && typeof dst[k] !== "object") dst[k] = JSON.parse(JSON.stringify(src[k])); else if (Array.isArray(src[k]) && !Array.isArray(dst[k])) dst[k] = JSON.parse(JSON.stringify(src[k]));
        }
        return dst;
    }
    function validar(est) {
        if (!est || typeof est !== "object" || Array.isArray(est)) throw new Error("Arquivo inválido.");
        if (!("sessoes" in est || "progresso" in est || "questoes" in est || "config" in est)) throw new Error("Arquivo não parece um backup do Arsenal.");
        for (const k of listas()) {
            if (est[k] != null && !Array.isArray(est[k])) throw new Error('Backup inválido: "' + k + '" deveria ser uma lista.');
            est[k] = (est[k] || []).filter((x => x && typeof x === "object" && x.id != null));
        }
        est.sessoes = est.sessoes.filter((x => isFinite(+x.seg) && x.data));
        for (const k of OBJETOS.concat(EXTRA.objetos)) {
            if (est[k] != null && (typeof est[k] !== "object" || Array.isArray(est[k]))) throw new Error('Backup inválido: "' + k + '".');
            if (est[k] == null) delete est[k];
        }
        if (est.ciclo && est.ciclo.itens != null && !Array.isArray(est.ciclo.itens)) throw new Error("Backup inválido: ciclo.");
        if (est.perfil && typeof est.perfil.nome !== "string") est.perfil.nome = "Concurseiro";
        return est;
    }
    function migrar(s) {
        if ((s.v || 1) < 2) {
            if (s.config && s.config.tema === "claro" && s.config.__auto == null) {}
            s.v = 2;
        }
        if (s.config && s.config.metaSemanalManual == null) s.config.metaSemanalManual = +s.config.metaSemanalMin !== 420 && +s.config.metaSemanalMin !== s.config.metaDiariaMin * 7;
        return s;
    }
    const mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
    function temaEfetivo(t) {
        return t === "escuro" || t === "auto" && mq && mq.matches ? "escuro" : "claro";
    }
    let canal = null;
    const Store = {
        registrar(o) {
            if (o.listas) EXTRA.listas.push(...o.listas);
            if (o.objetos) EXTRA.objetos.push(...o.objetos);
            if (o.padrao) EXTRA.padrao.push(typeof o.padrao === "function" ? o.padrao : () => JSON.parse(JSON.stringify(o.padrao)));
        },
        s: null,
        _subs: [],
        _timer: null,
        _falhou: false,
        _sujo: false,
        kvGet: kvGet,
        kvSet: kvSet,
        _v: 0,
        async init() {
            let bruto = await lerBruto();
            if (window.arsenalExe && window.arsenalExe.espelhoLer) {
                try {
                    const esp = await window.arsenalExe.espelhoLer();
                    if (esp && esp.texto) {
                        const o = JSON.parse(esp.texto);
                        let valido = false;
                        try {
                            valido = !!bruto && !!validar(JSON.parse(JSON.stringify(bruto)));
                        } catch (e) {
                            valido = false;
                        }
                        if (o && typeof o === "object" && (!valido || (+o._salvoEm || 0) > (+(bruto && bruto._salvoEm) || 0) + 1500)) {
                            if (bruto) {
                                try {
                                    await kvSet("guardado-antes-da-restauracao-" + Date.now(), bruto);
                                } catch (e) {}
                            }
                            bruto = o;
                            this._restauradoDoDisco = true;
                            console.warn("Dados restaurados da cópia em disco.");
                        }
                    }
                } catch (e) {
                    console.warn("cópia em disco", e);
                }
            }
            let est = bruto;
            try {
                est = bruto ? validar(bruto) : {};
            } catch (e) {
                console.warn("Estado salvo inválido, usando padrão:", e);
                try {
                    await kvSet("estado-ilegivel-" + Date.now(), bruto);
                } catch (e2) {}
                this._estadoIlegivel = true;
                est = {};
            }
            this.s = migrar(mesclarPadrao(est, padrao()));
            this.aplicarTema();
            if (mq) mq.addEventListener && mq.addEventListener("change", (() => this.aplicarTema()));
            try {
                canal = new BroadcastChannel("arsenal-estado");
                canal.onmessage = async () => {
                    if (this._demo) return;
                    if (this._timer) return;
                    const novo = await lerBruto();
                    if (!novo) return;
                    try {
                        this.s = migrar(mesclarPadrao(validar(novo), padrao()));
                    } catch (e) {
                        return;
                    }
                    this._v++;
                    this.aplicarTema();
                    this._subs.forEach((f => {
                        try {
                            f();
                        } catch (e) {
                            console.error(e);
                        }
                    }));
                };
            } catch (e) {
                canal = null;
            }
            const flush = () => {
                if (this._timer) {
                    clearTimeout(this._timer);
                    this._timer = null;
                    gravarBruto(this.s).then((() => this.espelhar(true)));
                }
            };
            window.addEventListener("pagehide", flush);
            document.addEventListener("visibilitychange", (() => {
                if (document.hidden) flush();
            }));
            return this.s;
        },
        aplicarTema() {
            const t = this.s.config.tema || "claro", ef = temaEfetivo(t);
            document.documentElement.dataset.tema = ef;
            try {
                localStorage.setItem(TEMA_KEY, t);
            } catch (e) {}
        },
        on(fn) {
            this._subs.push(fn);
            return () => {
                this._subs = this._subs.filter((f => f !== fn));
            };
        },
        mut(fn, silencioso) {
            const r = fn(this.s);
            this._v++;
            this.salvarLogo();
            if (!silencioso) this._subs.forEach((f => {
                try {
                    f();
                } catch (e) {
                    console.error(e);
                }
            }));
            return r;
        },
        salvarLogo() {
            if (this._demo) return;
            clearTimeout(this._timer);
            this._timer = setTimeout((async () => {
                this._timer = null;
                const ok = await gravarBruto(this.s);
                if (ok) {
                    this._falhou = false;
                    this._sujo = true;
                    this.espelhar();
                    try {
                        canal && canal.postMessage(1);
                    } catch (e) {}
                } else if (!this._falhou) {
                    this._falhou = true;
                    U.toast("Não consegui salvar os dados neste navegador. Exporte um backup em Ajustes.", "err");
                }
            }), 250);
        },
        async salvarAgora() {
            if (this._demo) return true;
            clearTimeout(this._timer);
            this._timer = null;
            const ok = await gravarBruto(this.s);
            if (ok) {
                await this.espelhar(true);
                try {
                    canal && canal.postMessage(1);
                } catch (e) {}
            }
            return ok;
        },
        _tEsp: null,
        espelhar(agora) {
            if (this._demo) return Promise.resolve();
            if (!(window.arsenalExe && window.arsenalExe.espelhoGravar) || !this.s) return Promise.resolve();
            const grava = () => {
                this._tEsp = null;
                try {
                    return window.arsenalExe.espelhoGravar(JSON.stringify(this.s)).catch((() => {}));
                } catch (e) {
                    return Promise.resolve();
                }
            };
            if (agora) {
                clearTimeout(this._tEsp);
                return grava();
            }
            if (!this._tEsp) this._tEsp = setTimeout(grava, 4e3);
            return Promise.resolve();
        },
        _demo: false,
        _real: null,
        novoEstado() {
            return padrao();
        },
        async entrarDemo(estado) {
            if (this._demo) return;
            await this.salvarAgora();
            this._real = this.s;
            this._demo = true;
            estado.config.tema = this._real.config.tema;
            this.s = estado;
            this._v++;
            this._subs.forEach((f => {
                try {
                    f();
                } catch (e) {
                    console.error(e);
                }
            }));
        },
        sairDemo() {
            if (!this._demo) return;
            this.s = this._real;
            this._real = null;
            this._demo = false;
            this._v++;
            this.aplicarTema();
            this._subs.forEach((f => {
                try {
                    f();
                } catch (e) {
                    console.error(e);
                }
            }));
        },
        async zerar() {
            if (this._demo) this.sairDemo();
            clearTimeout(this._timer);
            this._timer = null;
            this.s = padrao();
            this._v++;
            await gravarBruto(this.s);
            this.espelhar(true);
            try {
                localStorage.removeItem(KEY);
            } catch (e) {}
            this.aplicarTema();
            try {
                canal && canal.postMessage(1);
            } catch (e) {}
        },
        exportar(semMarca) {
            if (this._demo) return JSON.stringify({
                arsenal: 1,
                exportadoEm: (new Date).toISOString(),
                estado: this._real
            }, null, 1);
            if (!semMarca) {
                this.s.config.ultimoBackupEm = Date.now();
                this.salvarLogo();
            }
            return JSON.stringify({
                arsenal: 1,
                exportadoEm: (new Date).toISOString(),
                estado: this.s
            }, null, 1);
        },
        importar(texto, modo) {
            let o;
            try {
                o = JSON.parse(texto);
            } catch (e) {
                throw new Error("O arquivo não é um JSON válido.");
            }
            const est = validar(o && o.estado ? o.estado : o);
            if (modo === "substituir") {
                this.s = migrar(mesclarPadrao(est, padrao()));
            } else {
                const s = this.s;
                for (const lista of listas()) {
                    const ids = new Set(s[lista].map((x => x.id)));
                    (est[lista] || []).forEach((x => {
                        if (!ids.has(x.id)) s[lista].push(x);
                    }));
                }
                for (const [k, v] of Object.entries(est.progresso || {})) {
                    if (!v || typeof v !== "object") continue;
                    const atual = s.progresso[k];
                    if (!atual) s.progresso[k] = v; else {
                        const nota = atual.nota || v.nota || "";
                        if ((v.s || 0) > (atual.s || 0)) s.progresso[k] = Object.assign({}, v, {
                            nota: nota
                        }); else atual.nota = nota;
                    }
                }
            }
            this._v++;
            this.aplicarTema();
            this.salvarLogo();
            this._subs.forEach((f => f()));
        }
    };
    window.Store = Store;
})();