(function() {
    "use strict";
    const {h: h, icon: icon, norm: norm} = U;
    function carregaLib() {
        if (window.pdfjsLib) return Promise.resolve();
        return new Promise(((res, rej) => {
            const sc = document.createElement("script");
            sc.src = "vendor/pdf.min.js";
            sc.onload = () => {
                try {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
                    res();
                } catch (e) {
                    rej(e);
                }
            };
            sc.onerror = () => rej(new Error("Não consegui carregar o leitor de PDF (pasta vendor)."));
            document.head.appendChild(sc);
        }));
    }
    function linhasDe(itens) {
        itens.sort(((a, b) => b.y - a.y || a.x - b.x));
        const linhas = [];
        let atual = null;
        for (const it of itens) {
            if (atual && Math.abs(atual.y - it.y) <= Math.max(2, it.h * .45)) atual.itens.push(it); else {
                atual = {
                    y: it.y,
                    itens: [ it ]
                };
                linhas.push(atual);
            }
        }
        return linhas.map((l => {
            l.itens.sort(((a, b) => a.x - b.x));
            let t = "", fim = null;
            for (const it of l.itens) {
                if (fim != null && it.x - fim > Math.max(1, it.h * .12) && !t.endsWith(" ") && !it.s.startsWith(" ")) t += " ";
                t += it.s;
                fim = it.x + it.w;
            }
            return t.replace(/\s+/g, " ").trim();
        })).filter(Boolean);
    }
    function agruparLinhas(itens) {
        itens.sort(((a, b) => b.y - a.y || a.x - b.x));
        const linhas = [];
        let atual = null;
        for (const it of itens) {
            if (atual && Math.abs(atual.y - it.y) <= Math.max(2, it.h * .45)) atual.itens.push(it); else {
                atual = {
                    y: it.y,
                    itens: [ it ]
                };
                linhas.push(atual);
            }
        }
        return linhas;
    }
    function calha(linhas, largura) {
        const dir = [];
        linhas.forEach((l => {
            const v = l.itens.slice().sort(((a, b) => a.x - b.x));
            for (let k = 0; k < v.length; k++) {
                const vao = k ? v[k].x - (v[k - 1].x + v[k - 1].w) : 99;
                if (vao >= 8 && v[k].x > largura * .35 && v[k].x < largura * .7) dir.push(v[k].x);
            }
        }));
        if (dir.length < 6) return null;
        const cont = x => dir.filter((y => Math.abs(y - x) <= 1.5)).length;
        const fortes = dir.filter((x => cont(x) >= 4)).sort(((a, b) => a - b));
        if (!fortes.length) return null;
        const g = Math.min(...dir.filter((x => x >= fortes[0] - 20))) - .5;
        const total = linhas.reduce(((n, l) => n + l.itens.length), 0);
        const esq = linhas.reduce(((n, l) => n + l.itens.filter((it => it.x < g)).length), 0);
        return total >= 40 && esq > total * .2 && esq < total * .8 ? g : null;
    }
    function ordenarPagina(itens, largura) {
        const linhas = agruparLinhas(itens), g = calha(linhas, largura);
        if (g == null) return linhasDe(itens);
        const hs = itens.map((i => i.h)).sort(((a, b) => a - b)), mh = hs[Math.floor(hs.length / 2)] || 10;
        const sep = l => l.itens.some((it => it.x < g - 1 && it.x + it.w > g + 1 || it.h > mh * 1.25));
        const out = [];
        let faixa = [];
        const solta = () => {
            out.push(...linhasDe(faixa.filter((it => it.x < g))), ...linhasDe(faixa.filter((it => it.x >= g))));
            faixa = [];
        };
        for (const l of linhas) {
            if (sep(l)) {
                solta();
                out.push(...linhasDe(l.itens));
            } else faixa.push(...l.itens);
        }
        solta();
        return out;
    }
    const PREFIXOS = new Set([ "meio", "médico", "ex", "vice", "pré", "pós", "pró", "recém", "além", "aquém", "afro", "luso", "ibero" ]);
    const COMPOSTOS = new Set([ "para-choque", "para-brisa", "para-lama", "para-quedas", "para-raios", "guarda-chuva", "guarda-roupa", "vice-presidente", "ex-presidente" ]);
    function carregaOCR() {
        if (window.Tesseract) return Promise.resolve();
        return new Promise(((res, rej) => {
            const sc = document.createElement("script");
            sc.src = "vendor/ocr/tesseract.min.js";
            sc.onload = () => res();
            sc.onerror = () => rej(new Error("Não consegui carregar o leitor de imagem (pasta vendor/ocr)."));
            document.head.appendChild(sc);
        }));
    }
    function binarizar(cx, w, h) {
        const img = cx.getImageData(0, 0, w, h), d = img.data, hist = new Array(256).fill(0), n = w * h;
        const lum = new Uint8Array(n);
        for (let i = 0, j = 0; i < n; i++, j += 4) {
            const y = (d[j] * 299 + d[j + 1] * 587 + d[j + 2] * 114) / 1e3 | 0;
            lum[i] = y;
            hist[y]++;
        }
        let soma = 0;
        for (let t = 0; t < 256; t++) soma += t * hist[t];
        let sB = 0, wB = 0, melhor = 0, limiar = 160;
        for (let t = 0; t < 256; t++) {
            wB += hist[t];
            if (!wB) continue;
            const wF = n - wB;
            if (!wF) break;
            sB += t * hist[t];
            const mB = sB / wB, mF = (soma - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF);
            if (v > melhor) {
                melhor = v;
                limiar = t;
            }
        }
        limiar = Math.min(150, Math.max(90, limiar));
        const preto = new Uint8Array(n);
        for (let i = 0; i < n; i++) preto[i] = lum[i] > limiar ? 0 : 1;
        for (let y = 0; y < h; y++) {
            let c = 0, x0 = -1, x1 = -1;
            const o = y * w;
            for (let x = 0; x < w; x++) if (preto[o + x]) {
                c++;
                if (x0 < 0) x0 = x;
                x1 = x;
            }
            if (c > w * .35 && c > (x1 - x0 + 1) * .6) for (let x = x0; x <= x1; x++) preto[o + x] ^= 1;
        }
        for (let i = 0, j = 0; i < n; i++, j += 4) {
            const v = preto[i] ? 0 : 255;
            d[j] = d[j + 1] = d[j + 2] = v;
            d[j + 3] = 255;
        }
        cx.putImageData(img, 0, 0);
    }
    async function ocrPaginas(doc, aoProgresso) {
        await carregaOCR();
        const base = new URL("vendor/ocr/", location.href).href;
        const worker = await window.Tesseract.createWorker("por", 1, {
            workerPath: base + "worker.min.js",
            corePath: base,
            langPath: base + "lang",
            workerBlobURL: false,
            gzip: true,
            cacheMethod: "none"
        });
        const paginas = [];
        try {
            for (let n = 1; n <= doc.numPages; n++) {
                aoProgresso && aoProgresso(n, doc.numPages, "ocr");
                const pg = await doc.getPage(n), vp = pg.getViewport({
                    scale: 2.5
                });
                const cv = document.createElement("canvas");
                cv.width = Math.ceil(vp.width);
                cv.height = Math.ceil(vp.height);
                const cx = cv.getContext("2d", {
                    willReadFrequently: true
                });
                cx.fillStyle = "#fff";
                cx.fillRect(0, 0, cv.width, cv.height);
                await pg.render({
                    canvasContext: cx,
                    viewport: vp
                }).promise;
                binarizar(cx, cv.width, cv.height);
                const {data: data} = await worker.recognize(cv);
                paginas.push(String(data.text || "").split("\n").map((l => l.replace(/\s+/g, " ").trim())).filter(Boolean));
                cv.width = cv.height = 0;
            }
        } finally {
            await worker.terminate();
        }
        return paginas;
    }
    function juntarPaginas(paginas) {
        const conta = new Map, chave = l => norm(l).replace(/\d+/g, "#");
        paginas.forEach((ls => new Set(ls.map(chave)).forEach((k => conta.set(k, (conta.get(k) || 0) + 1)))));
        const repetida = l => paginas.length >= 4 && conta.get(chave(l)) > paginas.length * .5 && l.length < 120;
        let linhas = [];
        paginas.forEach((ls => ls.forEach((l => {
            if (!repetida(l) && !/^\d{1,4}$/.test(l)) linhas.push(l);
        }))));
        const vocab = new Set;
        linhas.forEach((l => (l.toLowerCase().match(/[a-zà-ÿ]+(?:-[a-zà-ÿ]+)*/g) || []).forEach((w => vocab.add(w)))));
        const out = [];
        for (const l of linhas) {
            const u = out.length - 1, ma = u >= 0 ? out[u].match(/([a-zà-ÿ]+)-$/i) : null, mb = ma ? l.match(/^([a-zà-ÿ]+)/) : null;
            if (ma && mb) {
                const esq = ma[1].toLowerCase(), dir = mb[1].toLowerCase();
                const composto = vocab.has(esq + "-" + dir) ? !vocab.has(esq + dir) : !vocab.has(esq + dir) && (PREFIXOS.has(esq) || COMPOSTOS.has(esq + "-" + dir));
                out[u] = composto ? out[u] + l : out[u].slice(0, -1) + l;
            } else out.push(l);
        }
        return out.join("\n");
    }
    async function lerPDF(arquivo, aoProgresso, opc) {
        await carregaLib();
        const dados = new Uint8Array(await arquivo.arrayBuffer());
        const doc = await window.pdfjsLib.getDocument({
            data: dados,
            isEvalSupported: false
        }).promise;
        const paginas = [];
        for (let n = 1; n <= doc.numPages; n++) {
            const pg = await doc.getPage(n), vp = pg.getViewport({
                scale: 1
            }), tc = await pg.getTextContent();
            const itens = tc.items.filter((i => i.str && i.str.trim())).map((i => ({
                x: i.transform[4],
                y: i.transform[5],
                w: i.width || 0,
                h: i.height || Math.abs(i.transform[3]) || 10,
                s: i.str
            })));
            paginas.push(ordenarPagina(itens, vp.width));
            aoProgresso && aoProgresso(n, doc.numPages);
        }
        let texto = juntarPaginas(paginas), ocr = false;
        if (texto.replace(/\s/g, "").length < 200) {
            if (opc && opc.semOCR) throw new Error("Este PDF não tem texto para ler (parece ser uma imagem escaneada).");
            const corrige = l => l.replace(/\b(ANEXO|BLOCO|M[ÓO]DULO|CAP[ÍI]TULO|T[ÍI]TULO)\s+([IVXl|1]{1,4})\b/g, ((x, a, r) => a + " " + r.replace(/[l|1]/g, "I"))).replace(/^\|\s*/, "I ");
            texto = juntarPaginas((await ocrPaginas(doc, aoProgresso)).map((ls => ls.map(corrige))));
            ocr = true;
            if (texto.replace(/\s/g, "").length < 200) throw new Error('Não consegui ler as letras deste PDF escaneado (imagem muito fraca ou torta). Copie o conteúdo programático e use "Colar texto".');
        }
        return {
            texto: texto,
            paginas: doc.numPages,
            ocr: ocr
        };
    }
    function normalizarMarkdown(texto) {
        const E = window.EditalEngine;
        const ls = String(texto).replace(/\r/g, "").split("\n").map((l => l.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1")));
        const niveis = {};
        ls.forEach((l => {
            const m = l.match(/^\s*(#{1,6})\s*(\S.*)$/);
            if (!m) return;
            const k = m[1].length, o = niveis[k] || (niveis[k] = {
                n: 0,
                c: 0
            });
            o.n++;
            if (E.conhecida(m[2].split("|")[0])) o.c++;
        }));
        const L = Object.keys(niveis).map(Number).sort(((a, b) => niveis[b].c - niveis[a].c || a - b))[0];
        if (!L || L === 1 || !niveis[L].c) return ls.join("\n");
        const out = [];
        let grupo = "";
        ls.forEach((l => {
            const m = l.match(/^\s*(#{1,6})\s*(\S.*)$/);
            if (!m) {
                out.push(l);
                return;
            }
            const k = m[1].length, nome = m[2].replace(/\s*#+\s*$/, "").trim();
            if (k < L) {
                if (k === L - 1 && niveis[k].n >= 2) grupo = nome.replace(/\|/g, " ");
            } else if (k === L) out.push("# " + nome + (grupo && !/\|\s*grupo\s/i.test(nome) ? " | grupo " + grupo : "")); else if (k === L + 1) out.push("## " + nome); else out.push("- " + nome);
        }));
        return out.join("\n");
    }
    function secoesDoTexto(texto) {
        const out = [];
        let cur = null;
        String(texto).split(/\r?\n/).forEach((l => {
            const m = l.match(/^\s*#(?!#)\s*(\S.*)$/);
            if (m) {
                const p = m[1].split("|").map((x => x.trim()));
                cur = {
                    nome: p[0],
                    extra: p.slice(1).filter(Boolean),
                    linhas: []
                };
                out.push(cur);
            } else if (cur && l.trim()) cur.linhas.push(l.trim());
        }));
        return out;
    }
    const RE_ITEM = /^(?:\d+(?:\.\d+)*[.)]?|[-*•●▪◦‣·–])\s+\S/;
    const itensDaSecao = s => s.linhas.filter((l => RE_ITEM.test(l))).length;
    const textoDasSecoes = ss => ss.map((s => [ "# " + [ s.nome ].concat(s.extra).join(" | ") ].concat(s.linhas).join("\n"))).join("\n\n");
    function juntarSecoes(acima, s, comoPai) {
        if (s.linhas.some((l => /^##\s/.test(l)))) {
            acima.linhas.push(...s.linhas);
            return;
        }
        let ult = 0;
        acima.linhas.forEach((l => {
            if (/^##\s/.test(l)) ult = 0;
            const m = l.match(/^(\d+)(?:\.\d+)*[.)]?\s/);
            if (m) ult = Math.max(ult, +m[1]);
        }));
        const P = ult + 1;
        let auto = 0;
        if (comoPai) acima.linhas.push(P + " " + s.nome);
        s.linhas.forEach((l => {
            const m = l.match(/^(\d+)((?:\.\d+)*)[.)]?\s+(.*)$/), b = m ? null : l.match(/^[-*•●▪◦‣·–]\s+(.*)$/);
            if (m) acima.linhas.push(comoPai ? P + "." + m[1] + m[2] + " " + m[3] : +m[1] + ult + m[2] + " " + m[3]); else if (b) acima.linhas.push((comoPai ? P + "." + ++auto : ult + ++auto) + " " + b[1]); else acima.linhas.push(l);
        }));
    }
    function converter(texto, cargoKey) {
        const E = window.EditalEngine;
        if (/^\s*#\s*\S/m.test(texto)) {
            const t = normalizarMarkdown(texto), ss = secoesDoTexto(t);
            const ficam = [], fora = [];
            ss.forEach((s => {
                const sp = E.suspeitaDe(s.nome, itensDaSecao(s), ss.length);
                if (sp && sp.nivel === 2 || !itensDaSecao(s)) fora.push({
                    sec: s,
                    motivo: sp && sp.nivel === 2 ? sp.motivo : "não tem assuntos"
                }); else ficam.push(s);
            }));
            return {
                texto: textoDasSecoes(ficam),
                discs: ficam.length,
                itens: ficam.reduce(((a, s) => a + itensDaSecao(s)), 0),
                avisos: fora.length ? [ "Deixei de fora " + U.plural(fora.length, "trecho que não parecia matéria", "trechos que não pareciam matéria") + " (dá para incluir de volta na lista abaixo)." ] : [],
                materias: [],
                descartadas: fora
            };
        }
        const t = texto.replace(/\r/g, "");
        const r = E.ler(t), rel = r.relatorio;
        const avisos = rel.avisos.slice();
        const cargos = r.cargos || [], multi = cargos.length > 1;
        const vis = multi ? cargoKey ? E.paraCargo(r, cargoKey) : {
            materias: []
        } : r;
        const lista = vis.materias;
        if (!r.materias.length && !(r.descartadas || []).length) avisos.unshift('Não achei matérias com assuntos numerados. Deixei o texto bruto abaixo: coloque uma linha "# Nome da matéria" antes dos itens de cada uma.');
        if (lista.some((m => m.sintetico))) avisos.push("Parte deste edital não numera os assuntos: dividi o texto em frases (cada frase virou um assunto). Confira e ajuste.");
        const somaItens = m => m.blocos.reduce(((a, bl) => a + bl.itens.length), 0);
        const materias = lista.map((m => ({
            nome: m.nome,
            grupo: m.grupo || "",
            peso: m.peso || 0,
            itens: somaItens(m),
            declarado: m.declarado,
            blocos: m.blocos.filter((bl => bl.rom)).map((bl => ({
                rom: bl.rom,
                nome: bl.nome,
                itens: bl.itens.length
            })))
        })));
        const itens = lista.reduce(((a, m) => a + somaItens(m)), 0);
        const descartadas = (r.descartadas || []).map((m => ({
            sec: secoesDoTexto(E.paraTexto({
                materias: [ m ]
            }))[0],
            motivo: m.suspeita ? m.suspeita.motivo : ""
        }))).filter((x => x.sec));
        return {
            texto: lista.length ? E.paraTexto({
                materias: lista
            }) : multi || descartadas.length ? "" : t.trim(),
            discs: lista.length,
            itens: itens,
            avisos: avisos,
            materias: materias,
            descartadas: descartadas,
            estilo: rel.estilo,
            marcados: rel.marcados,
            blocos: rel.blocos,
            cargos: cargos,
            precisaCargo: multi && !cargoKey
        };
    }
    const palavras = t => new Set(norm(t).split(/[^a-z0-9]+/).filter((w => w.length > 3)));
    function jaccard(A, B) {
        if (!A.size || !B.size) return 0;
        let i = 0;
        A.forEach((w => {
            if (B.has(w)) i++;
        }));
        return i / (A.size + B.size - i);
    }
    const aliasDe = nome => {
        const t = norm(nome);
        for (const [re, id] of D.ALIASES) if (re.test(t)) return id;
        return null;
    };
    const todosNos = d => {
        const r = [];
        (function w(ns) {
            ns.forEach((n => {
                r.push(n);
                w(n.filhos);
            }));
        })(d.topicos);
        return r;
    };
    function comparar(novo, velho) {
        const mapD = new Map, mapT = new Map;
        const pares = [];
        novo.disciplinas.forEach((nd => velho.discs.forEach((od => {
            const a = norm(nd.nome), b = norm(od.nome), c = norm(od.curto || "");
            let s = a === b || a === c ? 1 : 0;
            if (!s) {
                const x = aliasDe(nd.nome);
                if (x && (x === od.id || x === aliasDe(od.nome))) s = .9;
            }
            if (!s) s = Math.max(jaccard(palavras(nd.nome), palavras(od.nome)), a.includes(b) || b.includes(a) ? .6 : 0);
            if (s >= .5) pares.push([ s, nd, od ]);
        }))));
        pares.sort(((x, y) => y[0] - x[0]));
        const usadoN = new Set, usadoO = new Set, casais = [];
        pares.forEach((([s, nd, od]) => {
            if (usadoN.has(nd.id) || usadoO.has(od.id)) return;
            usadoN.add(nd.id);
            usadoO.add(od.id);
            mapD.set(od.id, nd.id);
            casais.push([ nd, od ]);
        }));
        const r = {
            mapD: mapD,
            mapT: mapT,
            iguais: [],
            alterados: [],
            novos: [],
            removidos: [],
            materiasNovas: [],
            materiasRemovidas: [],
            casais: casais
        };
        const marcaNovo = (nd, n) => {
            n.tag = "novo";
            r.novos.push({
                disc: nd.nome,
                texto: n.num + " " + n.texto
            });
        };
        casais.forEach((([nd, od]) => {
            if (!nd.peso && od.peso) nd.peso = od.peso;
            if (norm(nd.nome) === norm(od.nome) && od.curto) nd.curto = od.curto;
            nd.bloco = od.bloco || nd.bloco;
            nd.blocoNome = od.blocoNome || nd.blocoNome;
            if (od.ciclo === false) nd.ciclo = false;
            const nn = todosNos(nd), on = todosNos(od), cand = [];
            const pn = nn.map((n => palavras(n.texto))), po = on.map((n => palavras(n.texto)));
            nn.forEach(((n, i) => on.forEach(((o, j) => {
                let s = norm(n.texto) === norm(o.texto) ? 1 : jaccard(pn[i], po[j]);
                if (s < 1 && s > 0 && n.num === o.num) s = Math.min(.99, s + .1);
                if (s >= .55) cand.push([ s, i, j ]);
            }))));
            cand.sort(((a, b) => b[0] - a[0]));
            const un = new Set, uo = new Set;
            cand.forEach((([s, i, j]) => {
                if (un.has(i) || uo.has(j)) return;
                un.add(i);
                uo.add(j);
                mapT.set(on[j].id, nn[i].id);
                if (s >= .97) r.iguais.push(nn[i]); else {
                    nn[i].tag = "atualizado";
                    r.alterados.push({
                        disc: nd.nome,
                        antes: on[j].num + " " + on[j].texto,
                        agora: nn[i].num + " " + nn[i].texto
                    });
                }
            }));
            nn.forEach(((n, i) => {
                if (!un.has(i)) marcaNovo(nd, n);
            }));
            on.forEach(((o, j) => {
                if (!uo.has(j)) r.removidos.push({
                    disc: od.nome,
                    texto: o.num + " " + o.texto
                });
            }));
        }));
        novo.disciplinas.forEach((nd => {
            if (!usadoN.has(nd.id)) {
                r.materiasNovas.push(nd.nome);
                todosNos(nd).forEach((n => marcaNovo(nd, n)));
            }
        }));
        velho.discs.forEach((od => {
            if (!usadoO.has(od.id)) r.materiasRemovidas.push(od.nome);
        }));
        return r;
    }
    function aplicar(novo, comp, velho) {
        const {mapD: mapD, mapT: mapT} = comp;
        const folhasNovas = id => {
            let no = null;
            novo.disciplinas.some((d => todosNos(d).some((n => n.id === id ? (no = n, true) : false))));
            if (!no) return [ id ];
            const f = n => n.filhos.length ? n.filhos.flatMap(f) : [ n.id ];
            return f(no);
        };
        const mt = id => id && velho.topico[id] ? mapT.get(id) || null : id;
        const md = id => id && velho.disc[id] ? mapD.get(id) || null : id;
        Store.mut((s => {
            s.editaisCustom[novo.id] = novo;
            s.carreiraId = novo.id;
            mapT.forEach(((idNovo, idVelho) => {
                const p = s.progresso[idVelho];
                if (!p || !(p.s || p.nota)) return;
                folhasNovas(idNovo).forEach((id => {
                    const a = s.progresso[id];
                    if (!a || (a.s || 0) < (p.s || 0)) s.progresso[id] = Object.assign({}, p);
                }));
            }));
            [ "sessoes", "questoes", "registrosQ", "pastas", "cartoes", "simulados" ].forEach((l => (s[l] || []).forEach((x => {
                if (x.topicoId) x.topicoId = mt(x.topicoId);
                if (x.discId) x.discId = md(x.discId);
            }))));
            s.revisoes = s.revisoes.filter((r => {
                if (r.tipo !== "topico") return true;
                const n = mt(r.refId);
                if (!n) return !!r.feita;
                r.refId = n;
                r.discId = md(r.discId) || r.discId;
                return true;
            }));
            const c = s.ciclo;
            c.itens = c.itens.map((i => Object.assign({}, i, {
                discId: md(i.discId)
            }))).filter((i => i.discId));
            const alvos = c.itens.map((i => i.alvo)).sort(((a, b) => a - b)), mediano = alvos.length ? alvos[Math.floor(alvos.length / 2)] : 30;
            novo.disciplinas.forEach((d => {
                if (d.ciclo !== false && !c.itens.some((i => i.discId === d.id))) c.itens.push({
                    discId: d.id,
                    alvo: mediano,
                    ativo: true
                });
            }));
            c.fixada = md(c.fixada);
            c.pulou = (c.pulou || []).map(md).filter(Boolean);
            s.cron.discId = md(s.cron.discId);
            s.cron.topicoId = mt(s.cron.topicoId);
            if (s.cron.discSessao) s.cron.discSessao = md(s.cron.discSessao);
            if (s.dia && s.dia.blocos) s.dia.blocos = s.dia.blocos.map((b => Object.assign({}, b, {
                discId: md(b.discId)
            }))).filter((b => b.discId));
            Encaixe.todos("edital.trocouIds", s, mt, md);
        }));
        D.invalidarEdital();
    }
    function escolherArquivo() {
        return new Promise((res => {
            const i = h("input", {
                type: "file",
                accept: ".pdf,application/pdf"
            });
            i.addEventListener("change", (() => res(i.files[0] || null)));
            i.click();
        }));
    }
    const lista = (titulo, itens, fmt) => itens.length ? h("details", {
        class: "dobra"
    }, h("summary", null, titulo + " (" + itens.length + ")"), h("ul", null, itens.slice(0, 300).map((x => h("li", null, fmt(x)))))) : null;
    function abrir(opc) {
        const ed = D.edital().ed, primeira = !!(opc && opc.primeira);
        U.modal({
            titulo: primeira ? "Carregar o edital do seu concurso" : "Atualizar o edital",
            corpo: h("div", {
                class: "col"
            }, primeira ? h("p", {
                style: {
                    margin: 0
                }
            }, "Abra o PDF do edital do concurso que você vai prestar. O Arsenal lê as matérias e os assuntos do conteúdo programático e mostra para você conferir antes de trocar. O edital de exemplo (", h("b", null, ed.nome), ") continua guardado e dá para voltar a ele em Ajustes.") : h("p", {
                style: {
                    margin: 0
                }
            }, "Saiu edital novo, ou vai prestar outro concurso? Abra o PDF aqui. O Arsenal lê o conteúdo programático, mostra para você conferir, compara com o edital em uso (", h("b", null, ed.nome), ") e, se você quiser, leva o seu progresso, suas revisões e suas questões para o novo."), h("div", {
                class: "callout"
            }, "Nada sai do computador: o PDF é lido dentro do app. Antes de trocar, o Arsenal baixa um backup dos seus dados."), h("div", {
                class: "hint"
            }, 'Funciona melhor com PDFs de texto (os da banca e do Diário Oficial). PDF escaneado como imagem não tem texto para ler: nesse caso use "Colar texto".')),
            botoes: [ {
                texto: "Cancelar"
            }, {
                texto: "Colar texto",
                fn: () => {
                    setTimeout((() => conferir("", primeira ? "Meu concurso" : "Edital novo", null)), 200);
                }
            }, {
                texto: "Escolher o PDF",
                tipo: "primary",
                fn: () => {
                    escolherArquivo().then((f => f && lerEConferir(f)));
                }
            } ]
        });
    }
    async function lerEConferir(arquivo) {
        const barra = h("i", {
            style: {
                width: "2%"
            }
        }), txt = h("div", {
            class: "small muted"
        }, "Abrindo o PDF…");
        const m = U.modal({
            titulo: "Lendo o PDF",
            corpo: h("div", {
                class: "col"
            }, h("div", {
                style: {
                    fontWeight: 600
                }
            }, arquivo.name), h("div", {
                class: "progresso-linha"
            }, barra), txt),
            semFoco: true
        });
        try {
            const r = await lerPDF(arquivo, ((n, t, modo) => {
                barra.style.width = Math.round(n / t * 100) + "%";
                txt.textContent = modo === "ocr" ? "PDF escaneado: lendo as letras da página " + n + " de " + t + " (pode levar alguns segundos por página)" : "Página " + n + " de " + t;
            }));
            m.close();
            setTimeout((() => conferir(r.texto, arquivo.name.replace(/\.pdf$/i, ""), r.paginas, r.ocr)), 220);
        } catch (e) {
            m.close();
            U.toast(String(e && e.message || e), "err");
        }
    }
    function relatorioDe(conv) {
        return conv.materias && conv.materias.length ? h("details", {
            class: "dobra"
        }, h("summary", null, "Relatório da leitura (" + U.plural(conv.discs, "matéria", "matérias") + (conv.blocos ? ", " + U.plural(conv.blocos, "bloco", "blocos") : "") + ", " + U.plural(conv.itens, "assunto", "assuntos") + (conv.marcados ? ", " + conv.marcados + " com NOVO/ATUALIZADO" : "") + ")"), h("ul", {
            style: {
                margin: "6px 0 0",
                paddingLeft: "18px",
                fontSize: "12.5px"
            }
        }, conv.materias.map((m => h("li", null, h("b", null, m.nome), " — " + U.plural(m.itens, "assunto", "assuntos") + (m.blocos.length ? " em " + U.plural(m.blocos.length, "bloco", "blocos") : "") + (m.grupo ? " · " + m.grupo : "") + (m.peso ? " · peso " + m.peso : ""), m.declarado != null ? m.declarado === m.itens ? h("span", {
            style: {
                color: "var(--ok, #1f7a4d)"
            }
        }, " · confere com o edital (" + m.declarado + ")") : h("b", {
            style: {
                color: "var(--err, #b3261e)"
            }
        }, " · o edital diz " + m.declarado + " e li " + m.itens) : null)))), h("div", {
            class: "hint",
            style: {
                marginTop: "6px"
            }
        }, "O motor acha o conteúdo programático, o nível, o cargo e as matérias; os assuntos saem da numeração do edital (ou, se não houver, das frases). Erros de numeração do próprio edital aparecem como aviso acima; o texto foi mantido como está.")) : null;
    }
    const AVISO_OCR = "Este PDF era uma imagem escaneada: as letras foram lidas por reconhecimento de imagem (OCR). Confira com atenção, principalmente números e acentos.";
    function conferir(bruto, nomeSugerido, paginas, ocr) {
        const E = window.EditalEngine;
        let conv = null, cargoKey = null, ativas = [], fora = [];
        const aceitas = new Set;
        const nome = h("input", {
            type: "text",
            value: nomeSugerido,
            maxLength: 60,
            style: {
                width: "100%"
            }
        });
        const ta = h("textarea", {
            "aria-label": "Conteúdo do edital em texto",
            style: {
                minHeight: "260px",
                fontFamily: "var(--font-mono)",
                fontSize: "12.5px",
                width: "100%"
            },
            placeholder: "# Língua Portuguesa | peso 12\n1 Compreensão e interpretação de textos\n2 Ortografia oficial\n2.1 Acentuação\n\n# Direito Penal | peso 10\n1 Princípios básicos"
        });
        const caixaCargo = h("div", {
            class: "col"
        }), caixa = h("div", {
            class: "col"
        }), caixaLista = h("div", {
            class: "col"
        });
        const dobraTexto = h("details", {
            class: "dobra"
        }, h("summary", null, "Editar como texto (avançado)"), h("div", {
            class: "col",
            style: {
                paddingBottom: "10px"
            }
        }, ta, h("div", {
            class: "hint"
        }, 'Cada matéria começa com "#", cada bloco com "##" e cada assunto com o número dele (ou um traço). Peso e grupo são opcionais: "# Matéria | peso 12 | grupo Conhecimentos básicos" (peso = número de questões na prova; grupo vira uma aba no Edital). Sem peso, o Arsenal usa o da matéria equivalente do edital atual.')));
        const calcular = () => {
            conv = bruto ? converter(bruto, cargoKey) : {
                texto: "",
                discs: 0,
                itens: 0,
                avisos: [],
                descartadas: []
            };
            if (ocr && bruto) conv.avisos.unshift(AVISO_OCR);
            ativas = secoesDoTexto(conv.texto);
            fora = (conv.descartadas || []).slice();
            aceitas.clear();
            ta.value = conv.texto;
        };
        const sincroniza = () => {
            ta.value = textoDasSecoes(ativas);
            pintar();
        };
        const pintarCargo = () => {
            U.clear(caixaCargo);
            if (!(conv.cargos && conv.cargos.length > 1)) return;
            const porNivel = new Map;
            conv.cargos.forEach((c => {
                const k = c.nivel ? "Nível " + c.nivel : "Cargos";
                if (!porNivel.has(k)) porNivel.set(k, []);
                porNivel.get(k).push(c);
            }));
            const sel = h("select", {
                "aria-label": "Seu cargo",
                style: {
                    width: "100%"
                },
                onchange: ev => {
                    cargoKey = ev.target.value || null;
                    calcular();
                    const c = conv.cargos.find((x => x.key === cargoKey));
                    nome.value = (nomeSugerido + (c ? " – " + c.nome : "")).slice(0, 60);
                    pintar();
                }
            }, h("option", {
                value: ""
            }, "— escolha o seu cargo —"), [ ...porNivel.entries() ].map((([k, cs]) => h("optgroup", {
                label: k
            }, cs.map((c => h("option", {
                value: c.key,
                selected: c.key === cargoKey
            }, c.nome)))))));
            caixaCargo.appendChild(h("label", {
                class: "f"
            }, "Qual é o seu cargo? (" + conv.cargos.length + " cargos neste edital)", sel));
            caixaCargo.appendChild(h("div", {
                class: "hint"
            }, "O Arsenal monta o edital só com o que vale para você: as matérias comuns a todos e as do seu cargo."));
        };
        const linhaMateria = (s, i) => {
            const n = itensDaSecao(s);
            const sp = !n ? {
                motivo: "não tem nenhum assunto, por isso não entra no edital"
            } : aceitas.has(norm(s.nome)) ? null : E.suspeitaDe(s.nome, n, ativas.length);
            const previa = h("ul", {
                class: "mat-previa",
                hidden: true
            }, s.linhas.slice(0, 8).map((l => h("li", null, l))), s.linhas.length > 8 ? h("li", {
                class: "muted"
            }, "… e mais " + (s.linhas.length - 8)) : null);
            const ver = h("button", {
                class: "btn ghost sm",
                type: "button",
                "aria-expanded": "false",
                onclick: () => {
                    previa.hidden = !previa.hidden;
                    ver.setAttribute("aria-expanded", String(!previa.hidden));
                    ver.textContent = previa.hidden ? "Ver assuntos" : "Esconder";
                }
            }, "Ver assuntos");
            return h("div", {
                class: "mat-linha" + (sp ? " duvida" : "")
            }, h("div", {
                class: "mat-topo"
            }, h("input", {
                type: "text",
                class: "mat-nome",
                value: s.nome,
                maxLength: 120,
                "aria-label": "Nome da matéria " + (i + 1),
                onchange: ev => {
                    const v = ev.target.value.replace(/[|#\r\n]/g, " ").replace(/\s+/g, " ").trim();
                    if (v) {
                        s.nome = v;
                        aceitas.add(norm(v));
                    }
                    sincroniza();
                }
            }), h("span", {
                class: "mat-n"
            }, U.plural(n, "assunto", "assuntos")), h("div", {
                class: "mat-acoes"
            }, ver, i > 0 ? h("button", {
                class: "btn ghost sm",
                type: "button",
                title: "Esta não é uma matéria separada: os assuntos dela passam para a matéria de cima",
                onclick: () => {
                    const acima = ativas[i - 1], comoPai = !sp;
                    juntarSecoes(acima, s, comoPai);
                    ativas.splice(i, 1);
                    sincroniza();
                    U.toast('Juntei "' + s.nome + '" em "' + acima.nome + '"' + (comoPai ? " (o título virou um assunto)." : "."), "ok");
                }
            }, "Juntar na de cima") : null, h("button", {
                class: "btn ghost sm",
                type: "button",
                title: "Tirar esta matéria do edital",
                onclick: () => {
                    ativas.splice(i, 1);
                    fora.push({
                        sec: s,
                        motivo: "você tirou",
                        pos: i
                    });
                    sincroniza();
                }
            }, "Tirar"))), sp ? h("div", {
                class: "mat-aviso"
            }, "Confira: " + sp.motivo + ". Se não for matéria, use Tirar ou Juntar na de cima.") : null, previa);
        };
        const pintarLista = () => {
            U.clear(caixaLista);
            if (ativas.length) {
                caixaLista.appendChild(h("div", {
                    class: "mat-titulo"
                }, "Matérias que vão entrar (" + ativas.length + ")"));
                caixaLista.appendChild(h("div", {
                    class: "mat-lista"
                }, ativas.map(linhaMateria)));
            }
            if (fora.length) caixaLista.appendChild(h("details", {
                class: "dobra",
                open: !ativas.length
            }, h("summary", null, "Deixados de fora (" + fora.length + ")"), h("div", {
                class: "mat-lista fora"
            }, fora.map(((f, k) => h("div", {
                class: "mat-linha"
            }, h("div", {
                class: "mat-topo"
            }, h("span", {
                class: "mat-nome-fixo"
            }, f.sec.nome), h("span", {
                class: "mat-n"
            }, U.plural(itensDaSecao(f.sec), "assunto", "assuntos") + (f.motivo ? " · " + f.motivo : "")), h("div", {
                class: "mat-acoes"
            }, h("button", {
                class: "btn ghost sm",
                type: "button",
                "aria-label": "Incluir " + f.sec.nome,
                onclick: () => {
                    fora.splice(k, 1);
                    aceitas.add(norm(f.sec.nome));
                    ativas.splice(Math.min(f.pos == null ? ativas.length : f.pos, ativas.length), 0, f.sec);
                    sincroniza();
                }
            }, "Incluir")))))))));
        };
        const pintarResumo = () => {
            U.clear(caixa);
            if (!bruto && !ativas.length) {
                caixa.appendChild(h("div", {
                    class: "hint"
                }, 'Cole abaixo o conteúdo programático. Pode ser direto do PDF, de um site ou de um resumo feito por você (matérias em MAIÚSCULAS, "Matéria:", listas com marcadores ou numeradas): o Arsenal separa as matérias e mostra para você conferir.'));
                return;
            }
            const nItens = ativas.reduce(((a, s) => a + itensDaSecao(s)), 0), avisos = conv.avisos || [];
            caixa.appendChild(h("div", {
                class: "callout" + (avisos.length || conv.precisaCargo || !ativas.length ? " warn" : "")
            }, ativas.length ? h("b", null, U.plural(ativas.length, "matéria", "matérias") + " e " + U.plural(nItens, "assunto", "assuntos") + (paginas ? " em " + U.plural(paginas, "página", "páginas") : "") + ". ") : null, avisos.map((a => /[.!?]$/.test(a) ? a : a + ".")).join(" ") || (conv.precisaCargo ? "" : ativas.length ? "Passe o olho na lista: se aparecer algo que não é matéria, use Tirar ou Juntar na de cima. Dá para corrigir o nome clicando nele." : "Não achei matérias neste texto.")));
            const rel = relatorioDe(conv);
            if (rel) caixa.appendChild(rel);
        };
        const pintar = () => {
            pintarCargo();
            pintarResumo();
            pintarLista();
            if (!ativas.length && !conv.precisaCargo) dobraTexto.open = true;
        };
        const doTexto = U.debounce((() => {
            const v = ta.value;
            if (/^\s*#\s*\S/m.test(v)) {
                ativas = secoesDoTexto(v);
                pintarResumo();
                pintarLista();
            }
        }), 450);
        ta.addEventListener("input", doTexto);
        ta.addEventListener("paste", (() => setTimeout((() => {
            const v = ta.value;
            if (v.trim().length < 150 || ativas.length && secoesDoTexto(v).every((s => itensDaSecao(s) && s.linhas.every((l => RE_ITEM.test(l) || /^##\s/.test(l)))))) return;
            bruto = v;
            cargoKey = null;
            calcular();
            if (!ativas.length && !fora.length && !conv.precisaCargo) ta.value = v;
            pintar();
        }), 0)));
        calcular();
        pintar();
        const temEstudo = Object.keys(Store.s.progresso).length > 0 || Store.s.sessoes.length > 0 || Store.s.questoes.length > 0;
        const levar = h("input", {
            type: "checkbox",
            checked: temEstudo
        });
        U.modal({
            titulo: "Confira o que foi lido",
            largo: true,
            corpo: h("div", {
                class: "col"
            }, caixaCargo, caixa, caixaLista, dobraTexto, h("label", {
                class: "f"
            }, "Nome deste edital", nome), h("label", {
                class: "row"
            }, h("span", {
                class: "switch"
            }, levar, h("span")), "É o mesmo concurso (só saiu um edital novo): manter o que já estudei"), h("div", {
                class: "hint",
                style: {
                    marginTop: "-4px"
                }
            }, "Ligado: o Arsenal compara os dois editais e mantém seu progresso nas matérias que continuam. Desligado: este é outro concurso e tudo começa do zero (ciclo e plano de hoje passam a usar as matérias deste edital).")),
            botoes: [ {
                texto: "Cancelar"
            }, {
                texto: "Continuar",
                tipo: "primary",
                fn: () => {
                    if (conv.precisaCargo) {
                        U.toast("Escolha o seu cargo para montar o edital.", "err");
                        return false;
                    }
                    let texto = ta.value;
                    if (!texto.trim()) {
                        U.toast(fora.length ? 'Nenhuma matéria na lista. Inclua alguma de "Deixados de fora" ou cole o conteúdo em texto.' : "Não há conteúdo para importar.", "err");
                        return false;
                    }
                    if (!/^\s*#\s*\S/m.test(texto)) {
                        const c = converter(texto, cargoKey);
                        if (!c.discs) {
                            U.toast('Não achei matérias neste texto. Coloque uma linha "# Nome da matéria" antes dos assuntos de cada uma.', "err");
                            return false;
                        }
                        texto = c.texto;
                    }
                    let novo;
                    try {
                        novo = D.parseEditalTexto(texto, nome.value.trim() || "Edital novo");
                    } catch (e) {
                        U.toast(e.message, "err");
                        return false;
                    }
                    const marca = "n" + Date.now().toString(36).slice(-5) + "-";
                    novo.id = "c-" + marca + novo.id.replace(/^c-/, "");
                    novo.disciplinas.forEach((d => {
                        d.id = marca + d.id;
                        (function w(ns) {
                            ns.forEach((n => {
                                n.id = marca + n.id;
                                w(n.filhos);
                            }));
                        })(d.topicos);
                    }));
                    novo.base = "Lido de PDF/texto em " + U.fmtData(U.ymd());
                    novo.fonte = "Importado pelo usuário";
                    if (!levar.checked) {
                        Store.mut((s => {
                            s.editaisCustom[novo.id] = novo;
                        }));
                        D.trocarEdital(novo.id);
                        U.toast("Edital importado: " + U.plural(novo.disciplinas.length, "matéria", "matérias") + ".", "ok");
                        setTimeout((() => window.Views && Views.perguntarModoEstudo && Views.perguntarModoEstudo()), 400);
                        return;
                    }
                    setTimeout((() => resumo(novo)), 220);
                }
            } ]
        });
    }
    function resumo(novo) {
        const velho = D.edital(), comp = comparar(novo, velho);
        const comProgresso = [ ...comp.mapT.keys() ].filter((id => (Store.s.progresso[id] || {}).s > 0)).length;
        U.modal({
            titulo: "O que muda",
            largo: true,
            corpo: h("div", {
                class: "col"
            }, h("div", {
                class: "small muted"
            }, velho.ed.nome + "  →  " + novo.nome), h("div", {
                class: "diff"
            }, h("div", null, h("b", null, comp.iguais.length), h("span", null, "assuntos iguais")), h("div", null, h("b", null, comp.alterados.length), h("span", null, "com texto alterado")), h("div", null, h("b", null, comp.novos.length), h("span", null, "novos")), h("div", null, h("b", null, comp.removidos.length), h("span", null, "saíram"))), h("p", {
                style: {
                    margin: 0
                }
            }, U.plural(comProgresso, "assunto que você já estudou será levado", "assuntos que você já estudou serão levados") + " para o edital novo, junto com revisões, sessões e questões. Os novos e alterados ficam marcados no Edital."), comp.materiasNovas.length ? h("div", {
                class: "callout"
            }, h("b", null, "Matérias novas: "), comp.materiasNovas.join(", ")) : null, comp.materiasRemovidas.length ? h("div", {
                class: "callout warn"
            }, h("b", null, "Matérias que saíram: "), comp.materiasRemovidas.join(", "), '. O tempo e as questões delas continuam nas estatísticas como "sem matéria".') : null, h("div", null, lista("Novos", comp.novos, (x => [ h("b", null, x.disc + ": "), x.texto ])), lista("Alterados", comp.alterados, (x => [ h("b", null, x.disc + ": "), x.agora, h("div", {
                class: "tiny muted"
            }, "antes: " + x.antes) ])), lista("Saíram", comp.removidos, (x => [ h("b", null, x.disc + ": "), x.texto ])))),
            botoes: [ {
                texto: "Cancelar"
            }, {
                texto: "Baixar backup e aplicar",
                tipo: "primary",
                fn: () => {
                    try {
                        U.download("arsenal-antes-do-edital-" + U.ymd() + ".json", Store.exportar(true));
                    } catch (e) {}
                    aplicar(novo, comp, velho);
                    U.toast("Edital atualizado. O backup anterior foi baixado.", "ok");
                    App.nav("edital");
                    if (!Store.s.config.modoEstudoEscolhido) setTimeout((() => window.Views && Views.perguntarModoEstudo && Views.perguntarModoEstudo()), 400);
                }
            } ]
        });
    }
    const temArquivo = e => !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");
    window.addEventListener("dragover", (e => {
        if (temArquivo(e)) e.preventDefault();
    }));
    window.addEventListener("drop", (e => {
        if (!temArquivo(e)) return;
        e.preventDefault();
        const f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (!f || !/\.pdf$/i.test(f.name)) return;
        if (window.Store && Store._demo) {
            U.toast("Saia do tutorial para carregar um edital.", "err");
            return;
        }
        if (document.querySelector(".overlay")) return;
        lerEConferir(f);
    }));
    window.EditalPDF = {
        abrir: abrir,
        lerPDF: lerPDF,
        lerEConferir: lerEConferir,
        conferir: conferir,
        converter: converter,
        comparar: comparar,
        aplicar: aplicar,
        ordenarPagina: ordenarPagina
    };
})();