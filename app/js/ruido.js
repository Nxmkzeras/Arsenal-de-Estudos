(function() {
    "use strict";
    const BASE = (document.currentScript && document.currentScript.src || location.href).replace(/js\/ruido\.js(\?.*)?$/, "");
    let ctx = null, mestre = null, comp = null, offline = null;
    let analisador = null;
    let coleta = null;
    const cache = {};
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    function garantir() {
        if (ctx) {
            if (ctx.state === "suspended" && !offline) ctx.resume().catch((() => {}));
            return ctx;
        }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        montar(new AC({
            latencyHint: "playback"
        }));
        return ctx;
    }
    function montar(c) {
        ctx = c;
        mestre = ctx.createGain();
        mestre.gain.value = 0;
        comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.knee.value = 24;
        comp.ratio.value = 3.5;
        comp.attack.value = .01;
        comp.release.value = .25;
        mestre.connect(comp);
        comp.connect(ctx.destination);
        analisador = ctx.createAnalyser();
        analisador.fftSize = 2048;
        comp.connect(analisador);
    }
    function fechaLoop(x, N, F) {
        const out = new Float32Array(N);
        for (let i = 0; i < N; i++) out[i] = x[i];
        for (let i = 0; i < F; i++) {
            const t = i / F * Math.PI / 2;
            out[i] = x[i] * Math.sin(t) + x[N + i] * Math.cos(t);
        }
        return out;
    }
    function normaliza(ch, rmsAlvo) {
        let s = 0, pico = 0;
        ch.forEach((x => {
            for (let i = 0; i < x.length; i++) {
                s += x[i] * x[i];
                const a = Math.abs(x[i]);
                if (a > pico) pico = a;
            }
        }));
        const n = ch.reduce(((a, x) => a + x.length), 0), rms = Math.sqrt(s / n) || 1, g = Math.min(rmsAlvo / rms, .97 / (pico || 1));
        ch.forEach((x => {
            for (let i = 0; i < x.length; i++) x[i] *= g;
        }));
    }
    function bufferRuido(tipo, seg) {
        const key = ctx.sampleRate + tipo + seg;
        if (cache[key]) return cache[key];
        const sr = ctx.sampleRate, N = Math.floor(seg * sr), F = Math.floor(.3 * sr), buf = ctx.createBuffer(2, N, sr), canais = [];
        for (let c = 0; c < 2; c++) {
            const T = N + F, x = new Float32Array(T);
            if (tipo === "branco") {
                for (let i = 0; i < T; i++) x[i] = Math.random() * 2 - 1;
            } else if (tipo === "rosa") {
                let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
                for (let i = 0; i < T; i++) {
                    const w = Math.random() * 2 - 1;
                    b0 = .99886 * b0 + w * .0555179;
                    b1 = .99332 * b1 + w * .0750759;
                    b2 = .969 * b2 + w * .153852;
                    b3 = .8665 * b3 + w * .3104856;
                    b4 = .55 * b4 + w * .5329522;
                    b5 = -.7616 * b5 - w * .016898;
                    x[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362;
                    b6 = w * .115926;
                }
            } else {
                let u = 0;
                for (let i = 0; i < T; i++) {
                    const w = Math.random() * 2 - 1;
                    u = .997 * u + .04 * w;
                    x[i] = u;
                }
            }
            canais.push(fechaLoop(x, N, F));
        }
        normaliza(canais, .2);
        canais.forEach(((x, c) => buf.copyToChannel(x, c)));
        return cache[key] = buf;
    }
    function bufferLento(seg, fc) {
        const key = ctx.sampleRate + "lento" + seg + fc;
        if (cache[key]) return cache[key];
        const sr = ctx.sampleRate, N = Math.floor(seg * sr), F = Math.floor(2 * sr), buf = ctx.createBuffer(1, N, sr), x = new Float32Array(N + F), a = 1 - Math.exp(-2 * Math.PI * fc / sr);
        let u = 0;
        for (let i = 0; i < x.length; i++) {
            u += a * (Math.random() * 2 - 1 - u);
            x[i] = u;
        }
        const c = [ fechaLoop(x, N, F) ];
        normaliza(c, .45);
        buf.copyToChannel(c[0], 0);
        return cache[key] = buf;
    }
    const fonteLoop = (buf, taxa) => {
        const s = ctx.createBufferSource();
        s.buffer = buf;
        s.loop = true;
        if (taxa) s.playbackRate.value = taxa;
        s.start(0, Math.random() * Math.max(.1, buf.duration - .2));
        if (coleta) coleta.push(s);
        return s;
    };
    const filtro = (tipo, f, q, gain) => {
        const b = ctx.createBiquadFilter();
        b.type = tipo;
        b.frequency.value = f;
        if (q != null) b.Q.value = q;
        if (gain != null) b.gain.value = gain;
        return b;
    };
    const ganho = v => {
        const g = ctx.createGain();
        g.gain.value = v;
        return g;
    };
    const osc = (tipo, f) => {
        const o = ctx.createOscillator();
        o.type = tipo;
        o.frequency.value = f;
        if (coleta) coleta.push(o);
        return o;
    };
    function lfo(freq, amp, param, tipo) {
        const o = osc(tipo || "sine", freq), g = ganho(amp);
        o.connect(g);
        g.connect(param);
        o.start();
        return o;
    }
    function modLenta(fc, amp, param, seg) {
        const s = fonteLoop(bufferLento(seg || 24, fc)), g = ganho(amp);
        s.connect(g);
        g.connect(param);
        return s;
    }
    function agenda(fn) {
        if (offline) {
            fn(offline);
            return {
                parar() {}
            };
        }
        fn(ctx.currentTime + 2);
        const id = setInterval((() => fn(ctx.currentTime + 2)), 400);
        return {
            parar() {
                clearInterval(id);
            }
        };
    }
    function eventos(proximoEm, toca, primeiroEm) {
        let t = (offline ? 0 : ctx.currentTime) + (primeiroEm != null ? primeiroEm : proximoEm());
        return agenda((limite => {
            while (t < limite) {
                toca(t);
                t += proximoEm();
            }
        }));
    }
    const parador = (fontes, extras) => ({
        parar() {
            fontes.forEach((s => {
                try {
                    s.stop();
                } catch (e) {}
            }));
            (extras || []).forEach((a => a && a.parar && a.parar()));
        }
    });
    const FAB = {};
    [ [ "ruidoBranco", "branco", .5 ], [ "ruidoRosa", "rosa", 1 ], [ "ruidoMarrom", "marrom", 1 ] ].forEach((([id, tipo, g0]) => {
        FAB[id] = d => {
            const s = fonteLoop(bufferRuido(tipo, 12)), g = ganho(g0);
            s.connect(g);
            g.connect(d);
            return parador([ s ]);
        };
    }));
    FAB.abafado = d => {
        const s = fonteLoop(bufferRuido("marrom", 10)), hp = filtro("highpass", 50, .7), f = filtro("lowpass", 330, .6), f2 = filtro("lowpass", 520, .4), g = ganho(2.6);
        s.connect(hp);
        hp.connect(f);
        f.connect(f2);
        f2.connect(g);
        g.connect(d);
        const s2 = fonteLoop(bufferRuido("rosa", 10), .5), f3 = filtro("lowpass", 180, .7), g2 = ganho(1.3);
        s2.connect(f3);
        f3.connect(g2);
        g2.connect(d);
        lfo(.07, .25, g.gain);
        return parador([ s, s2 ]);
    };
    const ARQUIVOS = {
        "lofi-hiphop": "lofi-hiphop",
        "lofi-sax-tenor": "lofi-sax-tenor",
        "lofi-sax-alto": "lofi-sax-alto",
        "lofi-sax-suave": "lofi-sax-suave",
        "lofi-piano": "lofi-piano",
        "lofi-tokyo-1": "lofi-tokyo-calmo-41",
        "lofi-tokyo-2": "lofi-tokyo-calmo-53",
        chuvaFraca: "amb-chuva-fraca",
        fogueira: "amb-fogueira",
        ventilador: "amb-ventilador",
        ondas: "amb-ondas",
        rio: "amb-rio",
        cafe: "amb-cafe",
        trem: "amb-trem",
        relogio: "amb-relogio",
        floresta: "amb-floresta",
        passaros: "amb-passaros",
        grilos: "amb-grilos"
    };
    const faixas = {};
    function decodifica(ab) {
        const c = ctx || new OfflineAudioContext(2, 48e3, 48e3);
        return new Promise(((ok, erro) => {
            const p = c.decodeAudioData(ab, ok, erro);
            if (p && p.then) p.then(ok, erro);
        }));
    }
    function baixa(url) {
        return fetch(url).then((r => {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.arrayBuffer();
        })).catch((() => new Promise(((ok, erro) => {
            const x = new XMLHttpRequest;
            x.open("GET", url);
            x.responseType = "arraybuffer";
            x.onload = () => x.response && (x.status === 200 || x.status === 0) ? ok(x.response) : erro(new Error("xhr " + x.status));
            x.onerror = () => erro(new Error("xhr"));
            x.send();
        }))));
    }
    const comprimidos = {}, usos = {}, limpeza = {};
    function carregaFaixa(id) {
        if (!faixas[id]) {
            const bruto = comprimidos[id] ? Promise.resolve(comprimidos[id].slice(0)) : baixa(BASE + "sons/" + ARQUIVOS[id] + ".ogg").then((ab => {
                comprimidos[id] = ab.slice(0);
                return ab;
            }));
            faixas[id] = bruto.then(decodifica).then((buf => {
                faixas[id].buf = buf;
                return buf;
            }));
            faixas[id].catch((() => {
                delete faixas[id];
            }));
        }
        return faixas[id];
    }
    function liberaDepois(id) {
        clearTimeout(limpeza[id]);
        limpeza[id] = setTimeout((() => {
            if (usos[id] > 0) return;
            delete faixas[id];
            try {
                setTimeout((() => {
                    if (window.gc) window.gc();
                }), 1500);
            } catch (e) {}
        }), 12e4);
    }
    const avisaFalha = id => {
        try {
            window.U && U.toast('Não consegui abrir o som "' + ((nomeDe[id] || {}).nome || id) + '". Reinstale o app se continuar.', "err");
        } catch (e) {}
    };
    function tocaArquivo(id, d) {
        const musica = /^lofi-/.test(id), saida = ganho(1e-4), t00 = offline ? 0 : ctx.currentTime;
        saida.connect(d);
        saida.gain.setValueAtTime(1e-4, t00);
        saida.gain.linearRampToValueAtTime(1, t00 + 1.2);
        let parado = false;
        const fontes = [];
        usos[id] = (usos[id] || 0) + 1;
        clearTimeout(limpeza[id]);
        const comeca = buf => {
            if (parado) return;
            const s = ctx.createBufferSource();
            s.buffer = buf;
            s.loop = true;
            s.connect(saida);
            s.start(0, musica ? 0 : Math.random() * buf.duration * .9);
            fontes.push(s);
        };
        const pronto = faixas[id] && faixas[id].buf;
        if (pronto) comeca(pronto); else carregaFaixa(id).then(comeca).catch((() => {
            if (!parado) avisaFalha(id);
        }));
        return {
            parar() {
                if (!parado) {
                    usos[id] = Math.max(0, (usos[id] || 1) - 1);
                    if (!usos[id]) liberaDepois(id);
                }
                parado = true;
                const t = offline ? 0 : ctx.currentTime;
                try {
                    saida.gain.cancelScheduledValues(t);
                    saida.gain.setValueAtTime(saida.gain.value, t);
                    saida.gain.linearRampToValueAtTime(1e-4, t + .5);
                } catch (e) {}
                setTimeout((() => {
                    fontes.forEach((s => {
                        try {
                            s.stop();
                        } catch (e) {}
                    }));
                    try {
                        saida.disconnect();
                    } catch (e) {}
                }), 700);
            }
        };
    }
    Object.keys(ARQUIVOS).forEach((id => {
        FAB[id] = d => tocaArquivo(id, d);
    }));
    const CATALOGO = [ {
        id: "lofi-hiphop",
        grupo: "Lofi",
        nome: "Lofi hip hop",
        desc: "Batida lenta e arrastada, piano elétrico quente e chiado de disco.",
        nivel: 1.25
    }, {
        id: "lofi-sax-tenor",
        grupo: "Lofi",
        nome: "Jazz com sax tenor",
        desc: "Saxofone tenor quente e cheio de ar, no ritmo lento da madrugada.",
        nivel: 1.25
    }, {
        id: "lofi-sax-alto",
        grupo: "Lofi",
        nome: "Jazz com sax alto",
        desc: "Balada esfumaçada: sax alto com notas longas e piano acústico.",
        nivel: 1.25
    }, {
        id: "lofi-sax-suave",
        grupo: "Lofi",
        nome: "Jazz suave de café",
        desc: "Sax soprano leve, piano macio e vassourinha, clima de café.",
        nivel: 1.25
    }, {
        id: "lofi-piano",
        grupo: "Lofi",
        nome: "Piano de madrugada",
        desc: "Piano acústico de verdade, contrabaixo e bateria macia; sem sopros e sem sintetizador.",
        nivel: 1.25
    }, {
        id: "lofi-tokyo-1",
        grupo: "Lofi",
        nome: "Tóquio calmo I",
        desc: "Lofi jazz lento de noite na cidade grande, a 84 batidas por minuto.",
        nivel: 1.25
    }, {
        id: "lofi-tokyo-2",
        grupo: "Lofi",
        nome: "Tóquio calmo II",
        desc: "Segunda noite de Tóquio: mais suave e espaçada, no mesmo ritmo lento.",
        nivel: 1.25
    }, {
        id: "ruidoBranco",
        grupo: "Ruídos",
        nome: "Ruído branco",
        desc: "Chiado uniforme, claro e brilhante, como TV fora do ar. Cobre vozes e conversas.",
        nivel: 1
    }, {
        id: "ruidoRosa",
        grupo: "Ruídos",
        nome: "Ruído rosa",
        desc: "Chiado equilibrado e mais suave, parecido com chuva forte ao longe. O mais usado para focar.",
        nivel: 1
    }, {
        id: "ruidoMarrom",
        grupo: "Ruídos",
        nome: "Ruído marrom",
        desc: "Grave e profundo, como cachoeira distante ou turbina de avião. Descansa o ouvido.",
        nivel: 1
    }, {
        id: "abafado",
        grupo: "Ruídos",
        nome: "Abafador",
        desc: "Corta os agudos e deixa só um rumor surdo, como protetor de ouvido ou carro fechado. Isola o barulho.",
        nivel: 1.5
    }, {
        id: "chuvaFraca",
        grupo: "Natureza",
        nome: "Chuva fraca",
        desc: "Garoa leve e constante.",
        nivel: 1.3
    }, {
        id: "fogueira",
        grupo: "Natureza",
        nome: "Fogueira",
        desc: "Madeira estalando no fogo.",
        nivel: 1.3
    }, {
        id: "ondas",
        grupo: "Natureza",
        nome: "Ondas do mar",
        desc: "Ondas quebrando e se espalhando numa praia tropical.",
        nivel: 1.3
    }, {
        id: "rio",
        grupo: "Natureza",
        nome: "Rio e corredeira",
        desc: "Água correndo sobre pedras, constante e sem pressa.",
        nivel: 1.3
    }, {
        id: "floresta",
        grupo: "Natureza",
        nome: "Floresta e riacho",
        desc: "Riacho correndo na mata, com pássaros ao longe.",
        nivel: 1.3
    }, {
        id: "passaros",
        grupo: "Natureza",
        nome: "Pássaros ao amanhecer",
        desc: "Coro de pássaros acordando no campo.",
        nivel: 1.3
    }, {
        id: "grilos",
        grupo: "Natureza",
        nome: "Grilos à noite",
        desc: "Grilos e sapos numa noite calma no campo.",
        nivel: 1.3
    }, {
        id: "cafe",
        grupo: "Ambiente",
        nome: "Café movimentado",
        desc: "Murmúrio de gente, talheres e xícaras ao fundo, sem conversa que prenda a atenção.",
        nivel: 1.3
    }, {
        id: "trem",
        grupo: "Ambiente",
        nome: "Viagem de trem",
        desc: "O ronco e o balanço de um trem em movimento, por dentro do vagão.",
        nivel: 1.3
    }, {
        id: "relogio",
        grupo: "Ambiente",
        nome: "Relógio de parede",
        desc: "Tique-taque regular e discreto, como numa sala de estudo silenciosa.",
        nivel: 2.2
    }, {
        id: "ventilador",
        grupo: "Ambiente",
        nome: "Ventilador",
        desc: "O sopro contínuo de um ventilador ligado.",
        nivel: 1.3
    } ];
    const nomeDe = {};
    CATALOGO.forEach((c => {
        nomeDe[c.id] = c;
    }));
    const COMBOS = [ {
        nome: "Abafar o mundo",
        desc: "Abafador + ventilador",
        camadas: {
            abafado: .7,
            ventilador: .35
        }
    }, {
        nome: "Lofi na garoa",
        desc: "Lofi hip hop + chuva fraca",
        camadas: {
            "lofi-hiphop": .6,
            chuvaFraca: .4
        }
    }, {
        nome: "Jazz na fogueira",
        desc: "Jazz com sax alto + fogueira",
        camadas: {
            "lofi-sax-alto": .6,
            fogueira: .35
        }
    }, {
        nome: "Para dormir",
        desc: "Chuva fraca + ventilador",
        camadas: {
            chuvaFraca: .5,
            ventilador: .35
        }
    } ];
    const S = {
        tocando: false,
        ativas: new Map,
        fimEm: 0,
        tFim: null,
        ouvintes: [],
        tickers: [],
        lastCron: null
    };
    const cfgSons = () => {
        const c = Store.s.config;
        if (!c.sons || typeof c.sons !== "object") c.sons = {};
        const s = c.sons;
        if (typeof s.mestre !== "number") s.mestre = .75;
        if (!s.camadas || typeof s.camadas !== "object") s.camadas = {};
        return s;
    };
    const emite = () => S.ouvintes.forEach((f => {
        try {
            f();
        } catch (e) {}
    }));
    const salva = () => {
        try {
            Store.mut((() => {}), true);
        } catch (e) {}
    };
    const nivelDe = id => nomeDe[id] ? nomeDe[id].nivel : .8;
    const ganhoCamada = (id, vol) => nivelDe(id) * vol * vol * 1.4;
    function sincroniza() {
        const cs = cfgSons();
        const ligadas = new Set(Object.keys(cs.camadas).filter((id => cs.camadas[id].on && FAB[id] && nomeDe[id])));
        S.ativas.forEach(((a, id) => {
            if (!S.tocando || !ligadas.has(id)) {
                a.inst.parar();
                try {
                    const t = ctx.currentTime;
                    a.g.gain.setTargetAtTime(1e-4, t, .08);
                } catch (e) {}
                setTimeout((() => {
                    a.fontes.forEach((s => {
                        try {
                            s.stop();
                        } catch (e) {}
                    }));
                    try {
                        a.g.disconnect();
                    } catch (e) {}
                }), 1e3);
                S.ativas.delete(id);
            }
        }));
        if (!S.tocando) return;
        if (!garantir()) return;
        ligadas.forEach((id => {
            if (S.ativas.has(id)) return;
            const g = ganho(1e-4);
            g.connect(mestre);
            let inst;
            coleta = [];
            try {
                inst = FAB[id](g);
            } catch (e) {
                console.warn("som", id, e);
                coleta = null;
                try {
                    g.disconnect();
                } catch (e2) {}
                return;
            }
            const fontes = coleta;
            coleta = null;
            S.ativas.set(id, {
                inst: inst,
                g: g,
                fontes: fontes
            });
            g.gain.setTargetAtTime(ganhoCamada(id, cs.camadas[id].vol), ctx.currentTime, .15);
        }));
        if (!S.ativas.size) {
            S.tocando = false;
        }
    }
    function aplicaMestre() {
        if (!ctx || !mestre) return;
        const alvo = S.tocando ? Math.pow(cfgSons().mestre, 1.6) : 0;
        mestre.gain.setTargetAtTime(alvo, ctx.currentTime, S.tocando ? .2 : .15);
    }
    const Sons = {
        catalogo: CATALOGO,
        combos: COMBOS,
        suportado: !!(window.AudioContext || window.webkitAudioContext),
        get tocando() {
            return S.tocando;
        },
        get fimEm() {
            return S.fimEm;
        },
        on(f) {
            S.ouvintes.push(f);
            return () => {
                S.ouvintes = S.ouvintes.filter((x => x !== f));
            };
        },
        onTick(f) {
            S.tickers.push(f);
            return () => {
                S.tickers = S.tickers.filter((x => x !== f));
            };
        },
        camada(id) {
            const c = cfgSons().camadas[id];
            return {
                on: !!(c && c.on),
                vol: c && typeof c.vol === "number" ? c.vol : .6
            };
        },
        mestre() {
            return cfgSons().mestre;
        },
        ligadas() {
            const cs = cfgSons();
            return Object.keys(cs.camadas).filter((id => cs.camadas[id].on && FAB[id] && nomeDe[id]));
        },
        alternar(id, ligar) {
            if (!FAB[id] || !garantir()) return;
            const cs = cfgSons(), c = cs.camadas[id] || (cs.camadas[id] = {
                on: false,
                vol: .6
            });
            c.on = ligar == null ? !c.on : !!ligar;
            if (c.on && !S.tocando) {
                S.tocando = true;
            }
            salva();
            sincroniza();
            aplicaMestre();
            emite();
        },
        volume(id, v) {
            const cs = cfgSons(), c = cs.camadas[id] || (cs.camadas[id] = {
                on: false,
                vol: .6
            });
            c.vol = Math.max(0, Math.min(1, +v || 0));
            salva();
            const a = S.ativas.get(id);
            if (a && ctx) a.g.gain.setTargetAtTime(ganhoCamada(id, c.vol), ctx.currentTime, .05);
        },
        volumeMestre(v) {
            cfgSons().mestre = Math.max(0, Math.min(1, +v || 0));
            salva();
            aplicaMestre();
        },
        tocar() {
            if (!garantir()) return;
            if (!this.ligadas().length) {
                this.combo(COMBOS[0]);
                return;
            }
            S.tocando = true;
            sincroniza();
            aplicaMestre();
            emite();
        },
        pausar() {
            S.tocando = false;
            aplicaMestre();
            setTimeout((() => {
                if (!S.tocando) sincroniza();
            }), 500);
            this.dormir(0);
            emite();
        },
        alternarTudo() {
            S.tocando ? this.pausar() : this.tocar();
        },
        combo(c) {
            if (!garantir()) return;
            const cs = cfgSons();
            Object.keys(cs.camadas).forEach((id => {
                cs.camadas[id].on = false;
            }));
            Object.entries(c.camadas).forEach((([id, vol]) => {
                if (FAB[id]) cs.camadas[id] = {
                    on: true,
                    vol: vol
                };
            }));
            S.tocando = true;
            salva();
            sincroniza();
            aplicaMestre();
            emite();
        },
        desligarTodas() {
            const cs = cfgSons();
            Object.keys(cs.camadas).forEach((id => {
                cs.camadas[id].on = false;
            }));
            S.tocando = false;
            salva();
            sincroniza();
            aplicaMestre();
            this.dormir(0);
            emite();
        },
        dormir(min) {
            clearInterval(S.tFim);
            S.tFim = null;
            S.fimEm = 0;
            if (min > 0) {
                S.fimEm = Date.now() + min * 6e4;
                S.tFim = setInterval((() => {
                    const falta = S.fimEm - Date.now();
                    if (falta <= 0) {
                        clearInterval(S.tFim);
                        S.tFim = null;
                        S.fimEm = 0;
                        this.pausar();
                        return;
                    }
                    if (falta < 15e3 && ctx && mestre) mestre.gain.setTargetAtTime(Math.pow(cfgSons().mestre, 1.6) * (falta / 15e3), ctx.currentTime, .3);
                    S.tickers.forEach((f => {
                        try {
                            f();
                        } catch (e) {}
                    }));
                }), 1e3);
            }
            emite();
        },
        seguirCronometro(ligado) {
            cfgSons().junto = !!ligado;
            salva();
            S.lastCron = null;
            emite();
        },
        get seguindoCronometro() {
            return !!cfgSons().junto;
        },
        _cron() {
            if (!window.Store || !Store.s) return;
            const st = Store.s.cron.status;
            if (st === S.lastCron) return;
            const antes = S.lastCron;
            S.lastCron = st;
            if (!cfgSons().junto || antes === null) return;
            if (st === "rodando" && !S.tocando) this.tocar(); else if ((st === "pausado" || st === "parado") && S.tocando) this.pausar();
        },
        precarregar() {
            Object.keys(ARQUIVOS).forEach((k => carregaFaixa(k).catch((() => {}))));
        },
        iniciarApp() {
            Store.on((() => Sons._cron()));
            Sons._cron();
            if (cfgSons().retomar && Sons.ligadas().length) setTimeout((() => Sons.tocar()), 800);
        },
        get retomarAoAbrir() {
            return !!cfgSons().retomar;
        },
        retomar(v) {
            cfgSons().retomar = !!v;
            salva();
            emite();
        },
        _estado() {
            return {
                ctx: ctx ? ctx.state : "nenhum",
                camadas: [ ...S.ativas.keys() ],
                vu: Sons._vu()
            };
        },
        _vu() {
            if (!analisador) return 0;
            const d = new Float32Array(analisador.fftSize);
            analisador.getFloatTimeDomainData(d);
            let s = 0;
            for (let i = 0; i < d.length; i++) s += d[i] * d[i];
            return +Math.sqrt(s / d.length).toFixed(4);
        },
        async _renderizar(id, seg, taxa) {
            if (ARQUIVOS[id]) {
                try {
                    await carregaFaixa(id);
                } catch (e) {}
            }
            const sr = taxa || 48e3, oc = new OfflineAudioContext(2, Math.round(sr * seg), sr), velho = {
                ctx: ctx,
                mestre: mestre,
                comp: comp,
                offline: offline
            };
            ctx = oc;
            offline = seg;
            const alvo = ganho(1);
            alvo.connect(oc.destination);
            coleta = [];
            try {
                FAB[id](alvo);
            } finally {
                coleta = null;
            }
            const buf = await oc.startRendering();
            ctx = velho.ctx;
            mestre = velho.mestre;
            comp = velho.comp;
            offline = velho.offline;
            return [ buf.getChannelData(0), buf.getChannelData(1) ];
        },
        async _teste(id, seg) {
            const sr = 44100, oc = new OfflineAudioContext(2, sr * seg, sr), velho = {
                ctx: ctx,
                mestre: mestre,
                comp: comp,
                offline: offline
            };
            ctx = oc;
            offline = seg;
            const alvo = ganho(1);
            alvo.connect(oc.destination);
            let inst;
            coleta = [];
            try {
                inst = FAB[id](alvo);
            } finally {
                coleta = null;
            }
            const buf = await oc.startRendering();
            ctx = velho.ctx;
            mestre = velho.mestre;
            comp = velho.comp;
            offline = velho.offline;
            let s = 0, pico = 0, nan = 0, n = 0;
            for (let c = 0; c < 2; c++) {
                const x = buf.getChannelData(c);
                for (let i = 0; i < x.length; i++) {
                    const v = x[i];
                    if (v !== v) {
                        nan++;
                        continue;
                    }
                    s += v * v;
                    n++;
                    if (Math.abs(v) > pico) pico = Math.abs(v);
                }
            }
            return {
                id: id,
                rms: +Math.sqrt(s / n).toFixed(4),
                db: +(20 * Math.log10(Math.sqrt(s / n) || 1e-9)).toFixed(1),
                pico: +pico.toFixed(3),
                nan: nan,
                inst: !!inst
            };
        }
    };
    window.Sons = Sons;
})();