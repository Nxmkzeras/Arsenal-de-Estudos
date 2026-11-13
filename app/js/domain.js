(function() {
    "use strict";
    const {uid: uid, ymd: ymd, addDays: addDays, diffDays: diffDays, norm: norm, clamp: clamp} = U;
    const S = () => Store.s;
    const CORES = [ "#3d7bf2", "#f0743e", "#18a67c", "#e0508f", "#8461ee", "#17a9cc", "#7fb228", "#e8544d", "#0f9d97", "#b95bd8", "#c98a1e", "#3a94e6", "#4fae5c", "#d96a86", "#6976ea", "#b8923a", "#27a7a3" ];
    function clarear(hex) {
        const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
        let hh = 0, ss = 0;
        if (d) {
            ss = d / (1 - Math.abs(2 * l - 1));
            hh = mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
            hh *= 60;
            if (hh < 0) hh += 360;
        }
        return "hsl(" + Math.round(hh) + " " + Math.round(Math.min(100, ss * 100)) + "% " + Math.max(Math.round(l * 100), 66) + "%)";
    }
    const STATUS = [ "Não iniciado", "Estudando", "Teoria concluída", "Revisado", "Dominado" ];
    const TIPOS = {
        teoria: "Teoria",
        questoes: "Questões",
        revisao: "Revisão",
        lei: "Leitura de lei",
        resumo: "Resumo / mapa",
        simulado: "Simulado",
        outro: "Outro"
    };
    let cacheEdital = null, cacheId = null, cacheRev = -1;
    function carreiras() {
        const base = window.ARSENAL_EDITAIS || {}, custom = {};
        Object.entries(S().editaisCustom || {}).forEach((([k, v]) => {
            if (v && typeof v === "object" && Array.isArray(v.disciplinas) && v.disciplinas.length && v.disciplinas.every((d => d && d.id && Array.isArray(d.topicos)))) custom[k] = v;
        }));
        return Object.assign({}, base, custom);
    }
    function edital() {
        const id = S().carreiraId;
        const todas = carreiras();
        const ed = todas[id] || todas.bb || Object.values(todas)[0];
        if (cacheEdital && cacheId === ed.id && cacheRev === (ed._rev || 0)) return cacheEdital;
        const idx = {
            ed: ed,
            discs: ed.disciplinas,
            disc: {},
            topico: {},
            pai: {},
            discDe: {},
            folhas: {},
            cor: {}
        };
        ed.disciplinas.forEach(((d, i) => {
            idx.disc[d.id] = d;
            idx.cor[d.id] = CORES[i % CORES.length];
            const walk = (ns, pai) => ns.forEach((n => {
                idx.topico[n.id] = n;
                idx.pai[n.id] = pai;
                idx.discDe[n.id] = d.id;
                walk(n.filhos, n.id);
            }));
            walk(d.topicos, null);
        }));
        const folhasDe = n => n.filhos.length ? n.filhos.flatMap(folhasDe) : [ n ];
        ed.disciplinas.forEach((d => {
            idx.folhas[d.id] = d.topicos.flatMap(folhasDe);
        }));
        Object.values(idx.topico).forEach((n => {
            idx.folhas[n.id] = folhasDe(n);
        }));
        cacheEdital = idx;
        cacheId = ed.id;
        cacheRev = ed._rev || 0;
        return idx;
    }
    const invalidarEdital = () => {
        cacheEdital = null;
    };
    const corDisc = id => {
        const c = edital().cor[id] || "#8a8aa8";
        return document.documentElement.dataset.tema === "escuro" ? clarear(c) : c;
    };
    const _ct = new Map;
    function corDiscTexto(id) {
        const esc = document.documentElement.dataset.tema === "escuro";
        const hex = (edital().cor[id] || "#8a8aa8").replace("#", "");
        const k = hex + (esc ? "e" : "c");
        if (_ct.has(k)) return _ct.get(k);
        let c = [ 0, 2, 4 ].map((i => parseInt(hex.slice(i, i + 2), 16)));
        const fundo = esc ? [ 24, 27, 30 ] : [ 242, 241, 236 ];
        const lum = v => {
            const f = x => {
                x /= 255;
                return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4);
            };
            return .2126 * f(v[0]) + .7152 * f(v[1]) + .0722 * f(v[2]);
        };
        const cr = (a, b) => {
            const x = lum(a), y = lum(b);
            return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
        };
        for (let i = 0; i < 14 && cr(c, fundo) < 4.7; i++) c = c.map((v => Math.round(esc ? v + (255 - v) * .12 : v * .88)));
        const r = "rgb(" + c.join(",") + ")";
        _ct.set(k, r);
        return r;
    }
    const nomeDisc = (id, curto) => {
        const d = edital().disc[id];
        return d ? curto === false ? d.nome : d.curto || d.nome : "—";
    };
    function caminhoTopico(id) {
        const e = edital(), p = [];
        for (let n = id; n; n = e.pai[n]) {
            const t = e.topico[n];
            if (!t) break;
            p.unshift(t);
        }
        return p;
    }
    const rotuloTopico = id => {
        if (!id) return "";
        const p = caminhoTopico(id);
        return p.length ? p[p.length - 1].num + " " + p[p.length - 1].texto : "(assunto removido)";
    };
    const topicoExiste = id => !!edital().topico[id];
    const _memo = new Map;
    function memo(chave, fn) {
        const v = Store._v || 0;
        const m = _memo.get(chave);
        if (m && m.v === v) return m.r;
        const r = fn();
        _memo.set(chave, {
            v: v,
            r: r
        });
        return r;
    }
    const statusDe = id => (S().progresso[id] || {}).s || 0;
    function progressoDe(noOuDisc) {
        const e = edital();
        const folhas = noOuDisc.topicos ? e.folhas[noOuDisc.id] : e.folhas[noOuDisc.id] || [];
        const por = [ 0, 0, 0, 0, 0 ];
        folhas.forEach((f => por[statusDe(f.id)]++));
        const n = folhas.length || 1;
        return {
            total: folhas.length,
            por: por,
            concluido: por[2] + por[3] + por[4],
            pct: Math.round((por[2] + por[3] + por[4]) / n * 100),
            pctDominado: Math.round(por[4] / n * 100),
            pontos: por.reduce(((a, v, i) => a + v * i), 0) / (4 * n)
        };
    }
    function setStatus(id, st, opts) {
        opts = opts || {};
        Store.mut((s => {
            const e = edital();
            const alvo = e.folhas[id] && e.topico[id] && e.topico[id].filhos.length ? e.folhas[id] : [ e.topico[id] ];
            alvo.forEach((n => {
                const ant = (s.progresso[n.id] || {}).s || 0;
                const p = s.progresso[n.id] || (s.progresso[n.id] = {
                    s: 0,
                    nota: ""
                });
                p.s = st;
                p.em = ymd();
                if (st >= 2 && ant < 2 && !opts.semRevisao) agendarRevisoes(n.id);
                if (st === 0) s.revisoes = s.revisoes.filter((r => !(r.tipo === "topico" && r.refId === n.id && !r.feita)));
            }));
        }));
    }
    function setNota(id, nota) {
        Store.mut((s => {
            const p = s.progresso[id] || (s.progresso[id] = {
                s: 0
            });
            p.nota = nota;
        }), true);
    }
    function agendarRevisoes(topicoId, base) {
        const s = S(), e = edital();
        if (s.revisoes.some((r => r.tipo === "topico" && r.refId === topicoId && !r.feita))) return;
        const dias = s.config.revisaoDias;
        if (!dias.length) return;
        const b = base || ymd();
        s.revisoes.push({
            id: uid(),
            tipo: "topico",
            refId: topicoId,
            discId: e.discDe[topicoId],
            due: addDays(b, dias[0]),
            passo: 0,
            base: b
        });
    }
    function concluirRevisao(id) {
        let feita = null;
        Store.mut((s => {
            const r = s.revisoes.find((x => x.id === id));
            if (!r || r.feita) return;
            r.feita = ymd();
            feita = r.id;
            const prox = r.passo + 1;
            if (r.tipo === "topico" && prox < s.config.revisaoDias.length) {
                const base = r.base || ymd();
                const due = [ addDays(base, s.config.revisaoDias[prox]), addDays(ymd(), 1) ].sort().pop();
                s.revisoes.push({
                    id: uid(),
                    tipo: "topico",
                    refId: r.refId,
                    discId: r.discId,
                    due: due,
                    passo: prox,
                    base: base,
                    origem: r.id
                });
            } else if (r.tipo === "topico") {
                const p = s.progresso[r.refId];
                if (p && p.s < 3) {
                    r.statusAnt = p.s;
                    p.s = 3;
                }
            }
        }));
        return feita;
    }
    function desfazerRevisao(id) {
        Store.mut((s => {
            const r = s.revisoes.find((x => x.id === id));
            if (!r || !r.feita) return;
            delete r.feita;
            s.revisoes = s.revisoes.filter((x => x.origem !== r.id));
            if (r.statusAnt != null) {
                const p = s.progresso[r.refId];
                if (p) p.s = r.statusAnt;
                delete r.statusAnt;
            }
        }));
    }
    const revisoesPendentes = () => S().revisoes.filter((r => !r.feita)).sort(((a, b) => a.due.localeCompare(b.due)));
    const revisoesVencidas = dia => revisoesPendentes().filter((r => r.due <= (dia || ymd())));
    function addSessao(o) {
        const ini = o.ini ? new Date(o.ini) : new Date;
        if (isNaN(ini.getTime())) throw new Error("Data inválida.");
        const seg = Math.round(+o.seg);
        if (!isFinite(seg) || seg < 1) throw new Error("Duração inválida.");
        const ses = {
            id: uid(),
            discId: o.discId || null,
            topicoId: o.topicoId && topicoExiste(o.topicoId) ? o.topicoId : null,
            tipo: o.tipo || "teoria",
            seg: seg,
            ini: ini.toISOString(),
            data: ymd(ini),
            nota: o.nota || "",
            fonte: o.fonte || "cronometro"
        };
        Store.mut((s => {
            s.sessoes.push(ses);
            if (ses.topicoId) {
                const p = s.progresso[ses.topicoId] || (s.progresso[ses.topicoId] = {
                    s: 0,
                    nota: ""
                });
                if (p.s === 0) {
                    p.s = 1;
                    p.em = ymd();
                }
            }
        }));
        verificarVolta();
        return ses;
    }
    function minutosPorDia(de, ate) {
        if (!de && !ate) return memo("mpd", (() => {
            const r = {};
            S().sessoes.forEach((x => {
                r[x.data] = (r[x.data] || 0) + x.seg / 60;
            }));
            return r;
        }));
        const r = {};
        S().sessoes.forEach((x => {
            if ((!de || x.data >= de) && (!ate || x.data <= ate)) r[x.data] = (r[x.data] || 0) + x.seg / 60;
        }));
        return r;
    }
    const minDia = dia => minutosPorDia()[dia] || 0;
    const minHojeVivo = () => minDia(ymd()) + (S().cron.status !== "parado" ? Cron.ms() / 6e4 : 0);
    function semanaDe(dia) {
        const d = U.parseYmd(dia || ymd());
        const off = (d.getDay() + 6) % 7;
        const ini = addDays(ymd(d), -off);
        return {
            ini: ini,
            fim: addDays(ini, 6)
        };
    }
    function minSemana(dia) {
        const {ini: ini, fim: fim} = semanaDe(dia);
        const m = minutosPorDia();
        let t = 0;
        for (let d = ini; d <= fim; d = addDays(d, 1)) t += m[d] || 0;
        return t;
    }
    const diasSemana = () => clamp(Math.round(+(S().ciclo.metodo || {}).dias || 7), 1, 7);
    function metaSemana() {
        const c = S().config;
        return c.metaSemanalManual ? Math.max(0, +c.metaSemanalMin || 0) : Math.round(c.metaDiariaMin * diasSemana());
    }
    function definirMetaSemana(min) {
        min = Math.max(0, Math.round(+min || 0));
        Store.mut((s => {
            const auto = Math.round(s.config.metaDiariaMin * diasSemana());
            s.config.metaSemanalManual = min !== auto;
            s.config.metaSemanalMin = min;
        }));
    }
    function diasParaProva() {
        const p = S().config.provaData;
        return p && /^\d{4}-\d{2}-\d{2}$/.test(p) ? diffDays(p, ymd()) : null;
    }
    function sessoesNoPeriodo(dias) {
        if (!dias) return S().sessoes.slice();
        const de = addDays(ymd(), -(dias - 1));
        return S().sessoes.filter((x => x.data >= de));
    }
    function sequenciaDias() {
        const m = minutosPorDia();
        let d = ymd(), n = 0;
        if (!m[d]) d = addDays(d, -1);
        while (m[d] > 0) {
            n++;
            d = addDays(d, -1);
        }
        return n;
    }
    function melhorSequencia() {
        const dias = Object.keys(minutosPorDia()).sort();
        let best = 0, cur = 0, prev = null;
        dias.forEach((d => {
            cur = prev && diffDays(d, prev) === 1 ? cur + 1 : 1;
            best = Math.max(best, cur);
            prev = d;
        }));
        return best;
    }
    const pesoDe = it => clamp(Math.round(+(it && it.peso) || 1), 1, 3);
    function ordemDaVolta(itens) {
        const ativos = itens.map(((it, i) => ({
            it: it,
            i: i
        }))).filter((x => x.it.ativo));
        const n = ativos.length, apar = [];
        ativos.forEach(((x, pos) => {
            const k = pesoDe(x.it), off = (pos + .5) / n;
            for (let j = 0; j < k; j++) apar.push({
                x: x,
                j: j,
                pos: pos,
                chave: Math.round((off + j / k) * 1e9)
            });
        }));
        apar.sort(((a, b) => a.chave - b.chave || a.j - b.j || a.pos - b.pos));
        for (let passo = 0; passo < 3; passo++) {
            for (let t = 1; t < apar.length; t++) {
                if (apar[t].x !== apar[t - 1].x) continue;
                const m = apar.findIndex(((a, q) => q > t && a.x !== apar[t].x));
                if (m < 0) break;
                apar.splice(t, 0, apar.splice(m, 1)[0]);
            }
            const L = apar.length, ult = L > 2 ? apar[L - 1] : null;
            if (ult && ult.x === apar[0].x) {
                for (let p = L - 2; p >= 1; p--) if (apar[p - 1].x !== ult.x && apar[p].x !== ult.x) {
                    apar.splice(p, 0, apar.pop());
                    break;
                }
            }
        }
        return apar;
    }
    const modoAssunto = () => S().config.modoEstudo === "assunto";
    function proximoAssunto(discId) {
        const f = discId && edital().folhas[discId];
        if (!f) return null;
        const n = f.find((x => statusDe(x.id) < 2));
        return n ? n.id : null;
    }
    function assuntosPendentes(discId) {
        const f = discId && edital().folhas[discId] || [];
        return {
            feitos: f.filter((x => statusDe(x.id) >= 2)).length,
            total: f.length
        };
    }
    const assuntoDaVez = () => modoAssunto() ? proximoAssunto(cicloAtual()) : null;
    const editalZerado = () => modoAssunto() && edital().discs.filter((d => d.ciclo !== false)).every((d => !proximoAssunto(d.id)));
    function cicloSlots(itens, rodadas) {
        if (modoAssunto()) itens = itens.map((it => it.ativo && !proximoAssunto(it.discId) ? Object.assign({}, it, {
            ativo: false
        }) : it));
        const slots = [], ordem = ordemDaVolta(itens);
        for (let k = 1; k <= (rodadas || 1); k++) ordem.forEach((a => slots.push({
            i: a.x.i,
            discId: a.x.it.discId,
            alvo: a.x.it.alvo,
            rodada: k,
            passada: a.j + 1,
            feito: 0
        })));
        return slots;
    }
    const BLOCO = 60;
    function planoCiclo(m, atuais) {
        const lista = atuais && atuais.length ? atuais.map((i => Object.assign({}, i))) : edital().discs.filter((d => d.ciclo !== false)).map((d => ({
            discId: d.id,
            alvo: BLOCO,
            ativo: true,
            peso: 1
        })));
        lista.forEach((i => {
            i.peso = pesoDe(i);
            i.alvo = BLOCO;
        }));
        const total = Math.round(m.horasDia * 60 * m.dias);
        return {
            itens: lista,
            rodadas: 1,
            total: total,
            blocosSemana: Math.floor(total / BLOCO)
        };
    }
    function gerarCiclo(m, novo) {
        const p = planoCiclo(m, novo ? null : S().ciclo.itens);
        Store.mut((s => {
            s.ciclo.itens = p.itens;
            s.ciclo.rodadas = p.rodadas;
            s.ciclo.metodo = Object.assign({}, m);
            s.ciclo.voltaIniEm = Date.now();
            s.ciclo.pulou = [];
            s.ciclo.fixada = null;
        }));
    }
    function feitoCiclo() {
        const r = {};
        const ini = S().ciclo.voltaIniEm;
        S().sessoes.forEach((x => {
            if (x.discId && new Date(x.ini).getTime() >= ini) r[x.discId] = (r[x.discId] || 0) + x.seg / 60;
        }));
        return r;
    }
    function cicloEstado() {
        const c = S().ciclo, feito = feitoCiclo();
        const slots = cicloSlots(c.itens, c.rodadas), resto = Object.assign({}, feito);
        slots.forEach((sl => {
            const t = Math.min(sl.alvo, resto[sl.discId] || 0);
            sl.feito = t;
            resto[sl.discId] = (resto[sl.discId] || 0) - t;
        }));
        const feitoItem = c.itens.map((() => 0));
        slots.forEach((sl => {
            feitoItem[sl.i] += sl.feito;
        }));
        const ativos = c.itens.filter((i => i.ativo && (!modoAssunto() || proximoAssunto(i.discId))));
        const pend = slots.filter((sl => sl.feito < sl.alvo));
        const nao = pend.filter((sl => !c.pulou.includes(sl.discId)));
        const sl0 = c.fixada && pend.find((sl => sl.discId === c.fixada)) || nao[0] || pend[0] || null;
        const atual = sl0 ? {
            discId: sl0.discId,
            alvo: sl0.alvo,
            i: sl0.i,
            rodada: sl0.rodada,
            n: slots.indexOf(sl0),
            feitoSlot: sl0.feito
        } : null;
        const totalAlvo = slots.reduce(((a, sl) => a + sl.alvo), 0), totalFeito = slots.reduce(((a, sl) => a + sl.feito), 0);
        return {
            feito: feito,
            feitoItem: feitoItem,
            slots: slots,
            ativos: ativos,
            pendentes: pend,
            atual: atual,
            totalAlvo: totalAlvo,
            totalFeito: totalFeito,
            pct: totalAlvo ? Math.round(totalFeito / totalAlvo * 100) : 0
        };
    }
    function verificarVolta() {
        const c = S().ciclo;
        if (!c.itens.length) return;
        const st = cicloEstado();
        if (st.ativos.length && !st.pendentes.length) {
            Store.mut((s => {
                s.ciclo.voltas++;
                s.ciclo.voltaIniEm = Date.now() + 1;
                s.ciclo.pulou = [];
            }));
            U.toast("Volta do ciclo concluída! Começando a volta " + (S().ciclo.voltas + 1) + ".", "ok");
        }
    }
    const cicloAtual = () => (cicloEstado().atual || {}).discId || null;
    const novoBloco = (discId, min) => ({
        id: uid(),
        discId: discId,
        min: min
    });
    function filaSlots() {
        const cs = cicloEstado(), c = S().ciclo;
        if (!cs.slots.length) return [];
        const iAtual = cs.atual ? Math.max(0, cs.atual.n) : 0;
        const rod = cs.slots.slice(iAtual).concat(cs.slots.slice(0, iAtual));
        const pend = rod.filter((sl => sl.feito < sl.alvo && !c.pulou.includes(sl.discId)));
        return pend.concat(rod.filter((sl => !pend.includes(sl))));
    }
    const filaCiclo = () => filaSlots().map((sl => sl.discId));
    function montarBlocos(metaMin, existentes) {
        const blocos = (existentes || []).map((b => Object.assign({}, b)));
        let soma = blocos.reduce(((a, b) => a + b.min), 0);
        let fila = filaSlots();
        if (!fila.length) return blocos;
        const resto = feitoHoje(), cobre = {};
        blocos.forEach((b => {
            const r = resto[b.discId] || 0, t = Math.min(b.min, r);
            resto[b.discId] = r - t;
            if (t < b.min - .5) cobre[b.discId] = (cobre[b.discId] || 0) + 1;
        }));
        fila = fila.filter((sl => {
            if (cobre[sl.discId] > 0 && sl.feito < sl.alvo) {
                cobre[sl.discId]--;
                return false;
            }
            return true;
        }));
        if (!fila.length) fila = filaSlots();
        let i = 0;
        const usados = new Set;
        for (let guarda = 0; metaMin - soma >= 1 && guarda < 200; guarda++, i++) {
            const k = i % fila.length, sl = fila[k], primeira = !usados.has(k);
            usados.add(k);
            const falta = primeira && sl.feito > 0 && sl.alvo - sl.feito >= 10 ? sl.alvo - sl.feito : sl.alvo;
            const m = Math.min(clamp(Math.round(falta) || BLOCO, 5, 480), metaMin - soma);
            if (m < 10 && blocos.length) {
                blocos[blocos.length - 1].min += m;
                soma += m;
                break;
            }
            blocos.push(novoBloco(sl.discId, m));
            soma += m;
        }
        return blocos;
    }
    function assinaturaPlano(s) {
        const c = s.ciclo;
        return JSON.stringify([ s.config.metaDiariaMin, c.itens.map((i => [ i.discId, +i.alvo || 0, pesoDe(i), !!i.ativo ])), c.fixada || "", c.pulou || [], c.rodadas || 1, c.voltaIniEm || 0, "ordem2" ]);
    }
    function feitoHoje() {
        const s = S(), hoje = ymd(), c = s.cron, feito = {};
        s.sessoes.forEach((x => {
            if (x.data === hoje) {
                const k = x.discId || "";
                feito[k] = (feito[k] || 0) + x.seg / 60;
            }
        }));
        if (c.status !== "parado") {
            const k = c.discSessao || c.discId || "";
            feito[k] = (feito[k] || 0) + Cron.ms() / 6e4;
        }
        return feito;
    }
    function blocosComEstudo(blocos) {
        const resto = feitoHoje();
        return (blocos || []).filter((b => {
            const r = resto[b.discId] || 0;
            if (r < .5) return false;
            resto[b.discId] = r - Math.min(r, b.min);
            return true;
        })).map((b => Object.assign({}, b)));
    }
    function planoDia() {
        const s = S(), hoje = ymd(), d = s.dia, meta = s.config.metaDiariaMin, sig = assinaturaPlano(s);
        if (d && d.data === hoje && Array.isArray(d.blocos)) {
            if (!d.manual && d.sig !== sig) {
                s.dia = {
                    data: hoje,
                    metaMin: meta,
                    blocos: montarBlocos(meta, blocosComEstudo(d.blocos)),
                    sig: sig
                };
                Store.salvarLogo();
                return s.dia;
            }
            if (d.blocos.length || !filaCiclo().length) return d;
        }
        s.dia = {
            data: hoje,
            metaMin: meta,
            blocos: montarBlocos(meta, []),
            sig: sig
        };
        Store.salvarLogo();
        return s.dia;
    }
    function definirMetaDia(min) {
        min = clamp(Math.round(min), 15, 1440);
        Store.mut((s => {
            const d = planoDia(), bl = d.blocos.map((b => Object.assign({}, b)));
            s.config.metaDiariaMin = min;
            s.ciclo.metodo = Object.assign({
                dias: 7
            }, s.ciclo.metodo, {
                horasDia: min / 60
            });
            let soma = bl.reduce(((a, b) => a + b.min), 0);
            while (soma > min && bl.length) {
                const u = bl[bl.length - 1], corta = Math.min(u.min, soma - min);
                u.min -= corta;
                soma -= corta;
                if (u.min < 10) {
                    soma -= u.min;
                    bl.pop();
                }
            }
            d.blocos = montarBlocos(min, bl);
            d.metaMin = min;
            d.sig = assinaturaPlano(s);
        }));
    }
    function refazerPlano() {
        Store.mut((s => {
            const ant = s.dia && s.dia.data === ymd() ? blocosComEstudo(s.dia.blocos) : [];
            s.dia = {
                data: ymd(),
                metaMin: s.config.metaDiariaMin,
                blocos: montarBlocos(s.config.metaDiariaMin, ant),
                sig: assinaturaPlano(s)
            };
        }));
    }
    function salvarPlanoManual(blocos, manual) {
        const soma = blocos.reduce(((a, b) => a + b.min), 0);
        Store.mut((s => {
            if (soma >= 15) s.config.metaDiariaMin = Math.min(1440, soma);
            s.dia = {
                data: ymd(),
                metaMin: soma,
                blocos: blocos,
                manual: !!manual,
                sig: assinaturaPlano(s)
            };
        }));
        return soma;
    }
    function diaEstado() {
        const s = S(), plano = planoDia(), c = s.cron;
        const feito = feitoHoje();
        const vivo = c.status !== "parado" ? c.discSessao || c.discId || "" : null;
        const segs = plano.blocos.map((b => ({
            id: b.id,
            discId: b.discId,
            min: b.min,
            feito: 0,
            extra: false
        })));
        const resto = Object.assign({}, feito);
        segs.forEach((sg => {
            const r = resto[sg.discId] || 0, t = Math.min(sg.min, r);
            sg.feito = t;
            resto[sg.discId] = r - t;
        }));
        Object.keys(resto).forEach((k => {
            const r = resto[k];
            if (!(r > .02)) return;
            let ult = null;
            if (k) for (const sg of segs) if (sg.discId === k) ult = sg;
            if (ult) ult.feito += r; else segs.push({
                id: "x-" + k,
                discId: k || null,
                min: 0,
                feito: r,
                extra: true
            });
        }));
        let total = 0, feitoTotal = 0, planejado = 0;
        segs.forEach((sg => {
            sg.tam = Math.max(sg.min, sg.feito);
            sg.ok = !sg.extra && sg.feito >= sg.min - .01;
            total += sg.tam;
            feitoTotal += sg.feito;
            planejado += sg.min;
        }));
        let ativo = null;
        if (vivo !== null) {
            for (const sg of segs) if ((sg.discId || "") === vivo) {
                ativo = sg;
                if (sg.feito < sg.min) break;
            }
        }
        const livres = segs.filter((sg => !sg.extra && sg.feito < sg.min - .5)), pul = s.ciclo.pulou || [], vezC = plano.manual ? null : cicloAtual();
        const proximo = vezC && livres.find((sg => sg.discId === vezC)) || livres.find((sg => !pul.includes(sg.discId))) || livres[0] || null;
        return {
            segs: segs,
            total: total,
            feitoTotal: feitoTotal,
            planejado: planejado,
            ativo: ativo ? ativo.id : null,
            proximo: proximo,
            status: c.status
        };
    }
    function sigla(ed) {
        ed = ed || edital().ed;
        if (ed.sigla) return ed.sigla;
        const nome = String(ed.nome || "concurso").trim();
        if (nome.length <= 18) return nome;
        const ini = nome.split(/\s+/).filter((w => /^[A-Za-zÀ-ÿ]/.test(w) && !/^(de|da|do|das|dos|e|em|para|a|o)$/i.test(w))).map((w => w[0])).join("").toUpperCase();
        return ini.length >= 2 && ini.length <= 6 ? ini : nome.slice(0, 17) + "…";
    }
    function recomecarCiclo() {
        invalidarEdital();
        gerarCiclo(Object.assign({
            horasDia: 1,
            dias: 7
        }, S().ciclo.metodo || {}), true);
        const e = edital();
        Store.mut((s => {
            s.dia = {
                data: "",
                metaMin: 0,
                blocos: []
            };
            if (s.cron.discId && !e.disc[s.cron.discId]) {
                s.cron.discId = null;
                s.cron.topicoId = null;
            }
            if (s.cron.discSessao && !e.disc[s.cron.discSessao]) s.cron.discSessao = null;
        }));
    }
    function trocarEdital(id) {
        Store.mut((s => {
            s.carreiraId = id;
        }));
        invalidarEdital();
        const e = edital(), c = S().ciclo;
        if (!c.itens.length || c.itens.some((i => !e.disc[i.discId]))) recomecarCiclo();
    }
    function materiaDaVez() {
        const s = S(), c = s.cron;
        if (c.status !== "parado") return c.discSessao || c.discId || null;
        if (c.discId) return c.discId;
        if (s.dia && s.dia.manual && s.dia.data === ymd()) {
            const p = diaEstado().proximo;
            if (p && p.discId) return p.discId;
        }
        return cicloAtual();
    }
    function pularDaVez() {
        const s = S(), c = s.cron;
        if (c.status !== "parado") return null;
        const id = materiaDaVez();
        if (!id) return null;
        if (c.discId === id && c.fixa) return null;
        Store.mut((st => {
            if (st.cron.discId === id) {
                st.cron.discId = null;
                st.cron.topicoId = null;
            }
            if (!st.ciclo.pulou.includes(id)) st.ciclo.pulou.push(id);
            if (st.ciclo.fixada === id) st.ciclo.fixada = null;
        }));
        return id;
    }
    function desfazerPulo(id) {
        Store.mut((st => {
            st.ciclo.pulou = st.ciclo.pulou.filter((x => x !== id));
        }));
    }
    const Cron = {
        get c() {
            return S().cron;
        },
        ms() {
            const c = this.c;
            return c.acumMs + (c.status === "rodando" ? Date.now() - c.iniMs : 0);
        },
        discEfetiva() {
            return materiaDaVez();
        },
        iniciar() {
            const vez = this.c.status === "parado" ? materiaDaVez() : null;
            Store.mut((s => {
                const c = s.cron;
                if (c.status === "rodando") return;
                const agora = Date.now();
                if (c.status === "parado") {
                    c.acumMs = 0;
                    c.inicioMs = agora;
                    c.discSessao = c.discId || (c.fixa ? null : vez);
                    if (modoAssunto() && !c.topicoId && c.discSessao) c.topicoId = proximoAssunto(c.discSessao);
                }
                c.iniMs = agora;
                c.status = "rodando";
            }));
        },
        pausar() {
            Store.mut((s => {
                const c = s.cron;
                if (c.status !== "rodando") return;
                c.acumMs += Date.now() - c.iniMs;
                c.status = "pausado";
                c.iniMs = null;
            }));
        },
        retomar() {
            Store.mut((s => {
                const c = s.cron;
                if (c.status !== "pausado") return;
                c.iniMs = Date.now();
                c.status = "rodando";
            }));
        },
        corrigirLacuna(desdeMs) {
            Store.mut((s => {
                const c = s.cron;
                if (c.status !== "rodando") return;
                c.acumMs += Math.max(0, desdeMs - c.iniMs);
                c.iniMs = Date.now();
            }), true);
        },
        descartar() {
            Store.mut((s => {
                Object.assign(s.cron, {
                    status: "parado",
                    acumMs: 0,
                    iniMs: null,
                    inicioMs: null
                });
            }));
        },
        preparar(campos) {
            if (this.c.status !== "parado") {
                U.toast("Há uma sessão em andamento. Finalize-a no Painel antes de começar outra.", "err", {
                    acao: "Ir ao Painel",
                    fn: () => App.cronometro()
                });
                return false;
            }
            Store.mut((s => {
                Object.assign(s.cron, campos);
            }));
            return true;
        },
        dados() {
            const c = this.c, seg = Math.round(this.ms() / 1e3), ini = c.inicioMs || Date.now();
            return {
                seg: seg,
                ini: ini,
                discId: c.discSessao || c.discId || null,
                topicoId: c.topicoId,
                tipo: c.tipo
            };
        }
    };
    const pastaPorId = id => S().pastas.find((p => p.id === id));
    const COLL = new Intl.Collator("pt", {
        numeric: true,
        sensitivity: "base"
    });
    const filhasDe = id => S().pastas.filter((p => (p.paiId || null) === (id || null))).sort(((a, b) => (a.ordem || 0) - (b.ordem || 0) || COLL.compare(a.nome, b.nome)));
    function caminhoPasta(id) {
        const r = [], vis = new Set;
        for (let p = pastaPorId(id); p && !vis.has(p.id); p = pastaPorId(p.paiId)) {
            vis.add(p.id);
            r.unshift(p);
        }
        return r;
    }
    function descendentesPasta(id, vis) {
        vis = vis || new Set;
        if (vis.has(id)) return [];
        vis.add(id);
        const r = [ id ];
        filhasDe(id).forEach((f => r.push(...descendentesPasta(f.id, vis))));
        return r;
    }
    function novaPasta(nome, paiId, extra) {
        const p = Object.assign({
            id: uid(),
            nome: nome,
            paiId: paiId || null,
            ordem: filhasDe(paiId).length
        }, extra || {});
        Store.mut((s => s.pastas.push(p)));
        return p;
    }
    function garantirCaminho(nomes) {
        let pai = null, ult = null;
        for (const nome of nomes) {
            ult = S().pastas.find((p => (p.paiId || null) === (pai || null) && norm(p.nome) === norm(nome))) || novaPasta(nome, pai);
            pai = ult.id;
        }
        return ult;
    }
    function pastasDoEdital(prof) {
        const e = edital();
        Store.mut((s => {
            e.discs.forEach(((d, i) => {
                let pd = s.pastas.find((p => !p.paiId && p.discId === d.id));
                if (!pd) {
                    pd = {
                        id: uid(),
                        nome: d.curto || d.nome,
                        paiId: null,
                        discId: d.id,
                        ordem: s.pastas.filter((p => !p.paiId)).length
                    };
                    s.pastas.push(pd);
                }
                if (prof >= 1) d.topicos.forEach((t => {
                    if (!s.pastas.some((p => p.paiId === pd.id && p.topicoId === t.id))) s.pastas.push({
                        id: uid(),
                        nome: t.num + " " + t.texto.replace(/\.$/, ""),
                        paiId: pd.id,
                        discId: d.id,
                        topicoId: t.id,
                        ordem: parseInt(t.num, 10)
                    });
                }));
            }));
        }));
    }
    function contagemPasta(id, recursivo) {
        const ids = new Set(recursivo ? descendentesPasta(id) : [ id ]);
        const qs = S().questoes.filter((q => q.pastaId && ids.has(q.pastaId)));
        return {
            total: qs.length,
            erros: qs.filter((q => q.resultado === "erro")).length
        };
    }
    const ALIASES = [ [ /portugu/, "portugues" ], [ /matematica financeira|financeira|juros/, "matematica-financeira" ], [ /raciocinio|matematica/, "raciocinio-logico" ], [ /matematica|raciocinio/, "matematica" ], [ /informatica/, "informatica" ], [ /fisica/, "fisica" ], [ /bancari|sistema financeiro/, "conhecimentos-bancarios" ], [ /atualidades|mercado financeiro/, "atualidades-mercado-financeiro" ], [ /vendas|negociacao/, "vendas-negociacao" ], [ /lingua inglesa|ingles/, "ingles" ], [ /etica/, "etica" ], [ /geopolitica|geografia/, "geopolitica" ], [ /ingles|espanhol|lingua estrangeira/, "ingles-espanhol" ], [ /transito|ctb|contran|mbft/, "leg-de-transito" ], [ /administrativ/, "dir-administrativo" ], [ /constitucional/, "dir-constitucional" ], [ /processual penal|processo penal/, "proc-penal" ], [ /penal especial|legislacao especial|legislacao penal|leis? especia/, "leg-especial" ], [ /direito penal|^penal/, "dir-penal" ], [ /direitos humanos/, "direitos-humanos" ], [ /racism|antidiscrimin|racial/, "combate-ao-racismo" ], [ /discursiva|redacao/, "discursiva" ], [ /sumula|jurisprud/, "sumulas-e-jurisp" ] ];
    function matchDisciplina(texto) {
        const t = norm(texto);
        if (!t) return null;
        const e = edital();
        const map = Encaixe.um("materia.vinculo", t);
        if (map && e.disc[map]) return map;
        const direto = e.discs.find((d => norm(d.nome) === t || norm(d.curto) === t));
        if (direto) return direto.id;
        for (const [re, id] of ALIASES) if (re.test(t) && e.disc[id]) return id;
        const parc = e.discs.find((d => norm(d.nome).includes(t) || t.includes(norm(d.curto))));
        return parc ? parc.id : null;
    }
    const palavras = t => new Set(norm(t).split(/[^a-z0-9]+/).filter((w => w.length > 3)));
    function matchTopico(discId, texto) {
        const e = edital(), d = e.disc[discId];
        if (!d || !texto) return null;
        const A = palavras(texto);
        if (!A.size) return null;
        let melhor = null, sc = 0;
        const walk = ns => ns.forEach((n => {
            const B = palavras(n.texto);
            if (B.size) {
                let inter = 0;
                A.forEach((w => {
                    if (B.has(w)) inter++;
                }));
                const cont = A.size >= 2 && inter / A.size >= .75 ? inter / A.size * .8 - B.size * .001 : 0;
                const j = Math.max(inter / (A.size + B.size - inter), cont);
                if (j > sc) {
                    sc = j;
                    melhor = n;
                }
            }
            walk(n.filhos);
        }));
        walk(d.topicos);
        return sc >= .34 ? melhor.id : null;
    }
    function chaveQuestao(q) {
        const ext = Encaixe.um("questao.chave", q);
        if (ext) return ext;
        const e = norm(q.enunciado || "");
        if (!e) return "u:" + (q.id || uid());
        return "h:" + e + "|" + (q.alternativas || []).map((a => norm(a.t || "").slice(0, 60))).join("|");
    }
    const indiceQuestoes = () => memo("qidx", (() => {
        const m = new Map;
        S().questoes.forEach((x => m.set(chaveQuestao(x), x)));
        return m;
    }));
    function resultadoDe(q) {
        const g = String(q.gabarito || "").trim().toUpperCase(), r = String(q.resposta || "").trim().toUpperCase();
        if (g && r) return g === r ? "acerto" : "erro";
        return q.resultado || "pendente";
    }
    function addQuestao(q, opts) {
        opts = opts || {};
        const s = S();
        q = Object.assign({}, q);
        q.resultado = resultadoDe(q);
        const k = chaveQuestao(q);
        let ex = indiceQuestoes().get(k);
        const hoje = ymd();
        Encaixe.todos("questao.chegando", s, q, k, hoje);
        if (!q.discId) q.discId = matchDisciplina(q.materia || q.materiaOrig);
        if (!q.topicoId && q.discId) q.topicoId = matchTopico(q.discId, q.assunto || q.assuntoOrig);
        if (!q.pastaId) {
            const pid = Encaixe.um("questao.pasta", s, q);
            if (pid) q.pastaId = pid;
        }
        if (ex) {
            Store.mut((st => {
                const t = st.questoes.find((x => x.id === ex.id));
                if (q.resultado && q.resultado !== "pendente") {
                    t.resultado = q.resultado;
                    t.resposta = q.resposta || t.resposta;
                    t.respondidaEm = hoje;
                }
                if (q.gabarito && !t.gabarito) t.gabarito = q.gabarito;
                if (q.comentario && !t.comentario) t.comentario = q.comentario;
                if (q.pastaId && !t.pastaId) t.pastaId = q.pastaId;
                if (t.resultado === "erro" && !t.srs) t.srs = {
                    ef: 2.5,
                    rep: 0,
                    int: 0,
                    due: hoje
                };
            }), opts.silencioso);
            return {
                nova: false,
                q: ex
            };
        }
        const nova = Object.assign({
            id: uid(),
            fonte: "manual",
            alternativas: [],
            resultado: "pendente",
            criadaEm: hoje,
            nota: "",
            tags: []
        }, q);
        nova.id = uid();
        if (nova.url && !U.linkSeguro(nova.url)) nova.url = "";
        if (nova.resultado === "erro" || nova.marcada) nova.srs = nova.srs || {
            ef: 2.5,
            rep: 0,
            int: 0,
            due: hoje
        };
        if (nova.resultado !== "pendente") nova.respondidaEm = hoje;
        Store.mut((st => st.questoes.push(nova)), opts.silencioso);
        return {
            nova: true,
            q: nova
        };
    }
    const respostasExtras = () => [].concat(...Encaixe.todos("respostas.extras"));
    function desempenho(dias) {
        const de = dias ? addDays(ymd(), -(dias - 1)) : null;
        const r = {};
        const mk = d => r[d] || (r[d] = {
            feitas: 0,
            acertos: 0
        });
        S().registrosQ.forEach((x => {
            if (!de || x.data >= de) {
                const o = mk(x.discId || "—");
                o.feitas += x.feitas;
                o.acertos += x.acertos;
            }
        }));
        S().questoes.forEach((q => {
            if (q.resultado !== "pendente" && (!de || (q.respondidaEm || q.criadaEm) >= de)) {
                const o = mk(q.discId || "—");
                o.feitas++;
                if (q.resultado === "acerto") o.acertos++;
            }
        }));
        respostasExtras().forEach((t => {
            if (!de || t.data >= de) {
                const o = mk(t.discId || "—");
                o.feitas++;
                if (t.resultado === "acerto") o.acertos++;
            }
        }));
        return r;
    }
    function desempenhoAssuntos(discId, dias) {
        const de = dias ? addDays(ymd(), -(dias - 1)) : null, m = new Map;
        const mk = (topicoId, texto) => {
            if (topicoId && !topicoExiste(topicoId)) topicoId = null;
            const k = topicoId ? "t:" + topicoId : texto ? "a:" + norm(texto) : "—";
            let o = m.get(k);
            if (!o) {
                o = {
                    chave: k,
                    topicoId: topicoId || null,
                    rotulo: topicoId ? rotuloTopico(topicoId) : texto || "Sem assunto identificado",
                    feitas: 0,
                    acertos: 0
                };
                m.set(k, o);
            }
            return o;
        };
        S().questoes.forEach((q => {
            if (q.discId === discId && q.resultado !== "pendente" && (!de || (q.respondidaEm || q.criadaEm) >= de)) {
                const o = mk(q.topicoId, q.assuntoOrig || q.assunto);
                o.feitas++;
                if (q.resultado === "acerto") o.acertos++;
            }
        }));
        respostasExtras().forEach((t => {
            if (t.discId === discId && (!de || t.data >= de)) {
                const o = mk(t.topicoId, t.assunto);
                o.feitas++;
                if (t.resultado === "acerto") o.acertos++;
            }
        }));
        S().registrosQ.forEach((x => {
            if (x.discId === discId && (!de || x.data >= de)) {
                const o = mk(x.topicoId, "");
                o.feitas += x.feitas;
                o.acertos += x.acertos;
            }
        }));
        return [ ...m.values() ].map((o => Object.assign(o, {
            pct: U.pct(o.acertos, o.feitas)
        }))).sort(((a, b) => a.pct - b.pct || b.feitas - a.feitas));
    }
    function respostasHoje() {
        const hoje = ymd(), r = {
            total: 0,
            acertos: 0,
            porFonte: {}
        };
        const soma = (fonte, acerto) => {
            r.total++;
            if (acerto) r.acertos++;
            const f = fonte || "manual";
            r.porFonte[f] = (r.porFonte[f] || 0) + 1;
        };
        respostasExtras().forEach((t => {
            if (t.data === hoje) soma(t.fonte, t.resultado === "acerto");
        }));
        S().questoes.forEach((q => {
            if (q.resultado !== "pendente" && (q.respondidaEm || q.criadaEm) === hoje) soma(q.fonte, q.resultado === "acerto");
        }));
        return r;
    }
    const desempenhoPorDia = () => memo("dpd", (() => {
        const r = {};
        const mk = d => r[d] || (r[d] = {
            feitas: 0,
            acertos: 0
        });
        S().registrosQ.forEach((x => {
            const o = mk(x.data);
            o.feitas += x.feitas;
            o.acertos += x.acertos;
        }));
        S().questoes.forEach((q => {
            if (q.resultado !== "pendente") {
                const o = mk(q.respondidaEm || q.criadaEm);
                o.feitas++;
                if (q.resultado === "acerto") o.acertos++;
            }
        }));
        respostasExtras().forEach((t => {
            const o = mk(t.data);
            o.feitas++;
            if (t.resultado === "acerto") o.acertos++;
        }));
        return r;
    }));
    const ROMANOS = [ "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X" ];
    function parseEditalTexto(txt, nomeCarreira) {
        let discs = [];
        let cur = null, nodes = null, ult = null, raiz = null, usados = null, ultGrupo = "", auto = 0, subAuto = 0, paiNum = null;
        const slug = x => norm(x).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const curtoDe = n => window.EditalEngine ? window.EditalEngine.curto(n) : n;
        for (const bruto of txt.split(/\r?\n/)) {
            const l = bruto.trim();
            if (!l) continue;
            let m;
            if (cur && (m = l.match(/^##\s+(\S.*)$/))) {
                const mm = m[1].match(/^(I{1,3}|IV|V|VI{0,3}|IX|X)\s+(\S.*)$/);
                const rom = mm ? mm[1] : String(cur.topicos.filter((t => t.grupo)).length + 1), nome = mm ? mm[2] : m[1];
                const n = {
                    id: cur.id + "-b" + rom,
                    num: rom,
                    texto: nome,
                    tag: null,
                    filhos: [],
                    grupo: true
                };
                usados.add(n.id);
                cur.topicos.push(n);
                raiz = n;
                nodes = {};
                ult = n;
                auto = subAuto = 0;
                paiNum = null;
                continue;
            }
            if (m = l.match(/^#+\s*(\S.*)$/)) {
                const partes = m[1].split("|").map((x => x.trim()));
                let peso = 0, grupo = "", q;
                partes.slice(1).forEach((p => {
                    if (q = p.match(/^peso\s*(\d+)$/i)) peso = +q[1]; else if (q = p.match(/^grupo\s+(\S.*)$/i)) grupo = q[1];
                }));
                if (grupo) ultGrupo = grupo;
                const nome = partes[0];
                let did = slug(nome) || "disciplina", k = 2;
                while (discs.some((d => d.id === did))) did = (slug(nome) || "disciplina") + "-" + k++;
                cur = {
                    id: did,
                    nome: nome,
                    curto: curtoDe(nome),
                    bloco: "I",
                    blocoNome: "Conteúdo",
                    peso: peso,
                    ciclo: true,
                    nota: "",
                    topicos: [],
                    _grupo: ultGrupo
                };
                discs.push(cur);
                nodes = {};
                ult = null;
                raiz = null;
                usados = new Set;
                auto = subAuto = 0;
                paiNum = null;
                continue;
            }
            if (!cur) continue;
            const marc = l.match(/^(?:[-*•●▪◦‣·–]\s+|\[[ xX]?\]\s*)(\S.*)$/);
            if (marc) {
                const pai = paiNum && nodes[paiNum] ? paiNum : null;
                m = [ l, pai ? pai + "." + ++subAuto : String(++auto), marc[1] ];
                while (nodes[m[1]]) m[1] = pai ? pai + "." + ++subAuto : String(++auto);
            } else if (m = l.match(/^(\d+(?:\.\d+)*)[.)]?\s+(.+)$/)) {
                paiNum = m[1];
                subAuto = 0;
                if (!m[1].includes(".")) auto = Math.max(auto, +m[1]);
            }
            if (m) {
                const num = m[1];
                let t = m[2];
                let tag = null;
                const mt = t.match(/\s+(NOVO|ATUALIZADO)$/i);
                if (mt) {
                    tag = mt[1].toLowerCase();
                    t = t.slice(0, -mt[0].length);
                }
                const base = (raiz ? raiz.id : cur.id) + "-" + num.replace(/\./g, "-");
                let id = base, r = 2;
                while (usados.has(id)) id = base + "-r" + r++;
                usados.add(id);
                const n = {
                    id: id,
                    num: num,
                    texto: t,
                    tag: tag,
                    filhos: []
                };
                nodes[num] = n;
                const pai = num.includes(".") ? nodes[num.slice(0, num.lastIndexOf("."))] : null;
                (pai ? pai.filhos : raiz ? raiz.filhos : cur.topicos).push(n);
                ult = n;
            } else if (ult) ult.texto += " " + l;
        }
        discs = discs.filter((d => d.topicos.length));
        if (!discs.length) throw new Error('Nenhuma matéria com assuntos encontrada. Use uma linha "# Nome da matéria" e, abaixo dela, os assuntos numerados (1, 1.1, 2…) ou com traço.');
        const nomesGrupo = [];
        discs.forEach((d => {
            if (d._grupo) {
                let i = nomesGrupo.indexOf(d._grupo);
                if (i < 0) {
                    nomesGrupo.push(d._grupo);
                    i = nomesGrupo.length - 1;
                }
                d.bloco = ROMANOS[i] || String(i + 1);
                d.blocoNome = d._grupo;
            }
            delete d._grupo;
        }));
        const blocos = {};
        nomesGrupo.forEach(((n, i) => {
            blocos[ROMANOS[i] || String(i + 1)] = n;
        }));
        if (!nomesGrupo.length) blocos.I = "Conteúdo";
        const soma = discs.reduce(((a, d) => a + d.peso), 0);
        return {
            id: "c-" + slug(nomeCarreira),
            nome: nomeCarreira,
            cargo: nomeCarreira,
            banca: "",
            base: "Importado em texto",
            totalItensProva: soma,
            blocos: blocos,
            disciplinas: discs,
            resolucoes: [],
            fonte: "Importado pelo usuário",
            _rev: Date.now()
        };
    }
    window.D = {
        CORES: CORES,
        STATUS: STATUS,
        TIPOS: TIPOS,
        carreiras: carreiras,
        edital: edital,
        invalidarEdital: invalidarEdital,
        corDisc: corDisc,
        corDiscTexto: corDiscTexto,
        nomeDisc: nomeDisc,
        caminhoTopico: caminhoTopico,
        rotuloTopico: rotuloTopico,
        topicoExiste: topicoExiste,
        memo: memo,
        statusDe: statusDe,
        progressoDe: progressoDe,
        setStatus: setStatus,
        setNota: setNota,
        agendarRevisoes: agendarRevisoes,
        concluirRevisao: concluirRevisao,
        desfazerRevisao: desfazerRevisao,
        revisoesPendentes: revisoesPendentes,
        revisoesVencidas: revisoesVencidas,
        addSessao: addSessao,
        minDia: minDia,
        minHojeVivo: minHojeVivo,
        metaSemana: metaSemana,
        definirMetaSemana: definirMetaSemana,
        diasSemana: diasSemana,
        minutosPorDia: minutosPorDia,
        semanaDe: semanaDe,
        minSemana: minSemana,
        diasParaProva: diasParaProva,
        sessoesNoPeriodo: sessoesNoPeriodo,
        sequenciaDias: sequenciaDias,
        melhorSequencia: melhorSequencia,
        resultadoDe: resultadoDe,
        modoAssunto: modoAssunto,
        proximoAssunto: proximoAssunto,
        assuntosPendentes: assuntosPendentes,
        assuntoDaVez: assuntoDaVez,
        editalZerado: editalZerado,
        sigla: sigla,
        materiaDaVez: materiaDaVez,
        pularDaVez: pularDaVez,
        desfazerPulo: desfazerPulo,
        recomecarCiclo: recomecarCiclo,
        trocarEdital: trocarEdital,
        gerarCiclo: gerarCiclo,
        planoCiclo: planoCiclo,
        feitoCiclo: feitoCiclo,
        cicloEstado: cicloEstado,
        verificarVolta: verificarVolta,
        cicloAtual: cicloAtual,
        Cron: Cron,
        planoDia: planoDia,
        definirMetaDia: definirMetaDia,
        refazerPlano: refazerPlano,
        salvarPlanoManual: salvarPlanoManual,
        diaEstado: diaEstado,
        BLOCO: BLOCO,
        montarBlocos: montarBlocos,
        filaCiclo: filaCiclo,
        pastaPorId: pastaPorId,
        filhasDe: filhasDe,
        caminhoPasta: caminhoPasta,
        descendentesPasta: descendentesPasta,
        novaPasta: novaPasta,
        garantirCaminho: garantirCaminho,
        pastasDoEdital: pastasDoEdital,
        contagemPasta: contagemPasta,
        matchDisciplina: matchDisciplina,
        matchTopico: matchTopico,
        addQuestao: addQuestao,
        desempenho: desempenho,
        desempenhoPorDia: desempenhoPorDia,
        desempenhoAssuntos: desempenhoAssuntos,
        respostasHoje: respostasHoje,
        indiceQuestoes: indiceQuestoes,
        parseEditalTexto: parseEditalTexto,
        ALIASES: ALIASES
    };
})();