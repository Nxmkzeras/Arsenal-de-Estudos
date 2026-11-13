(function() {
    "use strict";
    const {ymd: ymd, addDays: addDays, uid: uid} = U;
    function rng(seed) {
        let a = seed >>> 0;
        return () => {
            a |= 0;
            a = a + 1831565813 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    function montar() {
        const r = rng(2026), entre = (a, b) => a + r() * (b - a), escolhe = arr => arr[Math.floor(r() * arr.length)];
        const s = Store.novoEstado(), hoje = ymd(), DIAS = 730, META = 360;
        s.perfil.nome = "Ana (exemplo)";
        s.carreiraId = Store.s.carreiraId;
        Object.assign(s.config, {
            metaDiariaMin: META,
            metaSemanalMin: META * 6,
            metaSemanalManual: false,
            provaData: addDays(hoje, 87),
            tourVisto: true,
            provaCartaoFechado: true,
            boasVindasVisto: true
        });
        s.ciclo.metodo = {
            horasDia: 6,
            dias: 6,
            porPeso: true,
            intercalar: true
        };
        s.editaisCustom = JSON.parse(JSON.stringify(Store.s.editaisCustom || {}));
        s.criadoEm = new Date(addDays(hoje, -DIAS) + "T08:00:00").getTime();
        const e = D.edital(), discs = e.discs.filter((d => d.ciclo !== false));
        if (!discs.length) return s;
        const peso = d => Math.max(1, +d.peso || 1), somaPeso = discs.reduce(((a, d) => a + peso(d)), 0);
        const sorteiaDisc = () => {
            let x = r() * somaPeso;
            for (const d of discs) {
                x -= peso(d);
                if (x <= 0) return d;
            }
            return discs[0];
        };
        const folhas = d => e.folhas[d.id] || [];
        const tipos = [ [ "teoria", .45 ], [ "questoes", .3 ], [ "revisao", .15 ], [ "lei", .1 ] ];
        const sorteiaTipo = () => {
            let x = r();
            for (const [t, p] of tipos) {
                x -= p;
                if (x <= 0) return t;
            }
            return "teoria";
        };
        for (let k = DIAS; k >= 0; k--) {
            const dia = addDays(hoje, -k), dow = new Date(dia + "T12:00:00").getDay(), fase = 1 - k / DIAS;
            if (k > 0 && r() < (dow === 0 ? .45 : .08)) continue;
            let alvo = k === 0 ? 150 : META * (dow === 0 ? .5 : entre(.82, 1.12)) * (.88 + .18 * fase);
            let h = 7 + Math.floor(r() * 2), m = Math.floor(r() * 50);
            while (alvo > 15) {
                const d = sorteiaDisc(), min = Math.min(alvo, Math.round(entre(40, 95))), f = folhas(d), t = f.length ? escolhe(f).id : null;
                const ini = new Date(dia + "T" + String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":00");
                s.sessoes.push({
                    id: uid(),
                    discId: d.id,
                    topicoId: t,
                    tipo: sorteiaTipo(),
                    seg: Math.round(min * 60),
                    ini: ini.toISOString(),
                    data: dia,
                    nota: "",
                    fonte: "cronometro"
                });
                alvo -= min;
                const fim = h * 60 + m + min + Math.round(entre(5, 25));
                h = Math.floor(fim / 60);
                m = fim % 60;
                if (h >= 23) break;
            }
            if (r() < .8) {
                const d = sorteiaDisc(), feitas = Math.round(entre(25, 70)), taxa = Math.min(.95, .61 + .23 * fase + entre(-.06, .06));
                s.registrosQ.push({
                    id: uid(),
                    data: dia,
                    discId: d.id,
                    topicoId: null,
                    feitas: feitas,
                    acertos: Math.round(feitas * taxa)
                });
            }
        }
        discs.forEach((d => folhas(d).forEach(((n, i, arr) => {
            const pos = i / Math.max(1, arr.length), x = r() - pos * .25;
            const st = x > .55 ? 4 : x > .25 ? 3 : x > 0 ? 2 : x > -.12 ? 1 : 0;
            if (st) s.progresso[n.id] = {
                s: st,
                nota: "",
                em: addDays(hoje, -Math.round(entre(3, DIAS - 30)))
            };
        }))));
        Object.keys(s.progresso).filter((id => s.progresso[id].s >= 2)).forEach(((id, i) => {
            if (r() > .35) return;
            const due = i % 9 === 0 ? addDays(hoje, -Math.round(entre(0, 3))) : addDays(hoje, Math.round(entre(1, 45)));
            s.revisoes.push({
                id: uid(),
                tipo: "topico",
                refId: id,
                discId: e.discDe[id],
                due: due,
                passo: Math.floor(entre(0, 4)),
                base: addDays(due, -7)
            });
        }));
        for (let i = 0; i < 24; i++) {
            const d = sorteiaDisc(), f = folhas(d), t = f.length ? escolhe(f) : null, res = r() < .6 ? "erro" : "acerto", dia = addDays(hoje, -Math.round(entre(0, 120)));
            s.questoes.push({
                id: uid(),
                fonte: "manual",
                enunciado: "Questão de exemplo de " + (d.curto || d.nome) + (t ? ' sobre "' + t.texto.replace(/\.$/, "") + '"' : "") + ". (Texto fictício: aqui fica o enunciado das questões que você registrar.)",
                discId: d.id,
                topicoId: t ? t.id : null,
                alternativas: [],
                gabarito: "C",
                resposta: res === "acerto" ? "C" : "E",
                resultado: res,
                criadaEm: dia,
                respondidaEm: dia,
                marcada: r() < .2,
                nota: res === "erro" ? "Revisar este ponto antes da prova." : ""
            });
        }
        s.questoes.filter((q => q.resultado === "erro")).slice(0, 5).forEach(((q, i) => {
            q.srs = {
                due: addDays(hoje, i < 2 ? 0 : Math.round(entre(1, 20))),
                passo: Math.floor(entre(0, 3)),
                ef: 2.5
            };
        }));
        const semPonto = t => String(t || "").replace(/\.$/, "");
        discs.slice(0, 6).forEach(((d, k) => {
            const f = folhas(d);
            for (let i = 0; i < 3; i++) {
                const t = f.length ? escolhe(f) : null, assunto = t ? semPonto(t.texto).slice(0, 70) : d.curto || d.nome;
                const tipo = (k + i) % 3 === 1 ? "lacuna" : (k + i) % 3 === 2 ? "ce" : "basico";
                const base = {
                    id: uid(),
                    tipo: tipo,
                    ce: null,
                    imgF: "",
                    imgV: "",
                    discId: d.id,
                    topicoId: t ? t.id : null,
                    tags: [ "exemplo" ],
                    criadoEm: new Date(addDays(hoje, -Math.round(entre(1, 60))) + "T20:00:00").toISOString(),
                    suspenso: false,
                    fsrs: null
                };
                if (tipo === "lacuna") {
                    base.frente = 'Em "' + assunto + '", o ponto que mais cai é {{este trecho aqui}}.';
                    base.verso = "Cartão de exemplo: o trecho entre chaves some na hora de revisar.";
                } else if (tipo === "ce") {
                    base.frente = 'Afirmação de exemplo sobre "' + assunto + '".';
                    base.ce = i % 2 ? "E" : "C";
                    base.verso = "Cartão de exemplo: aqui fica a justificativa do gabarito.";
                } else {
                    base.frente = 'O que você precisa lembrar de "' + assunto + '"?';
                    base.verso = "Cartão de exemplo: aqui fica a sua resposta, curta e direta.";
                }
                s.cartoes.push(base);
            }
        }));
        for (let k = 1; k <= 30; k++) {
            if (r() < .2) continue;
            const rev = Math.round(entre(8, 26));
            s.flashDia[addDays(hoje, -k)] = {
                novos: Math.round(entre(0, 8)),
                revisoes: rev,
                errei: Math.round(rev * entre(.1, .26))
            };
        }
        for (let k = 260; k >= 7; k -= Math.round(entre(15, 26))) {
            const dia = addDays(hoje, -k), nq = 60, taxa = .58 + .24 * (1 - k / 260) + entre(-.04, .04), acertos = Math.round(nq * taxa), brancas = Math.round(entre(0, 4));
            s.simulados.push({
                id: uid(),
                ini: new Date(dia + "T09:00:00").getTime(),
                data: dia,
                discId: null,
                nq: nq,
                totalSeg: 3 * 3600,
                usadoSeg: Math.round(entre(2.3, 2.9) * 3600),
                acertos: acertos,
                erros: nq - acertos - brancas,
                brancas: brancas,
                estilo: "misto"
            });
        }
        return s;
    }
    const Demo = {
        async entrar() {
            if (Store._demo) return;
            if (window.Flash) Flash.sair();
            const est = montar();
            await Store.entrarDemo(est);
            try {
                D.invalidarEdital();
                D.gerarCiclo({
                    horasDia: 6,
                    dias: 6,
                    porPeso: true,
                    intercalar: true
                });
                D.pastasDoEdital(1);
                D.refazerPlano && D.refazerPlano();
            } catch (e) {
                console.warn("demo", e);
            }
            document.documentElement.classList.add("modo-demo");
        },
        sair() {
            if (!Store._demo) return;
            if (window.Flash) Flash.sair();
            Store.sairDemo();
            try {
                D.invalidarEdital();
            } catch (e) {}
            document.documentElement.classList.remove("modo-demo");
        }
    };
    window.Demo = Demo;
})();