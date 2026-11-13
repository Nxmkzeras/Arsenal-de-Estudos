(function() {
    "use strict";
    const {h: h, icon: icon, ymd: ymd, uid: uid, norm: norm, pct: pct} = U;
    const V = window.Views = window.Views || {};
    const S = () => Store.s;
    const cfgF = () => Object.assign({
        novosDia: 20,
        revDia: 200,
        retencao: .9
    }, S().config.flash || {});
    const TIPOS = {
        basico: "Frente e verso",
        lacuna: "Lacuna",
        ce: "Certo ou errado",
        questao: "Questão errada"
    };
    const NOTAS = [ [ 1, "Errei" ], [ 2, "Difícil" ], [ 3, "Bom" ], [ 4, "Fácil" ] ];
    let motorCache = null, motorChave = "";
    function motor() {
        const ret = Math.min(.97, Math.max(.7, +cfgF().retencao || .9));
        const dp = D.diasParaProva(), maxI = dp != null && dp > 0 ? Math.max(1, dp - 3) : 3650;
        const chave = ret + "|" + maxI;
        if (!motorCache || motorChave !== chave) {
            motorCache = FSRS.fsrs(FSRS.generatorParameters({
                request_retention: ret,
                maximum_interval: maxI,
                enable_fuzz: true,
                enable_short_term: true
            }));
            motorChave = chave;
        }
        return motorCache;
    }
    const cardDe = o => o.fsrs ? Object.assign({}, o.fsrs, {
        due: new Date(o.fsrs.due),
        last_review: o.fsrs.last_review ? new Date(o.fsrs.last_review) : undefined
    }) : FSRS.createEmptyCard(new Date);
    const guardar = c => JSON.parse(JSON.stringify(c));
    const fimDoDia = () => {
        const d = new Date;
        d.setHours(23, 59, 59, 999);
        return d;
    };
    function itens() {
        const r = [];
        S().cartoes.forEach((c => {
            if (!c.suspenso) r.push({
                k: "c",
                id: c.id,
                o: c
            });
        }));
        S().questoes.forEach((q => {
            if (q.srs) r.push({
                k: "q",
                id: q.id,
                o: q
            });
        }));
        return r;
    }
    const objDe = it => S()[it.k === "c" ? "cartoes" : "questoes"].find((x => x.id === it.id));
    const discDoBaralho = o => o.discId && D.edital().disc[o.discId] ? o.discId : "";
    function situacao(it) {
        const o = it.o;
        if (it.k === "q" && !o.fsrs) return (o.srs.due || ymd()) <= ymd() ? "revisar" : "futuro";
        if (!o.fsrs) return "novo";
        const due = new Date(o.fsrs.due), st = o.fsrs.state;
        if (due > fimDoDia()) return "futuro";
        return st === 1 || st === 3 ? "aprendendo" : "revisar";
    }
    const diaHoje = () => S().flashDia[ymd()] || {
        novos: 0,
        revisoes: 0,
        errei: 0
    };
    function contagem(discId) {
        const c = cfgF(), dia = diaHoje();
        let novos = 0, revisar = 0, aprendendo = 0, total = 0;
        itens().forEach((it => {
            if (discId !== undefined && discDoBaralho(it.o) !== discId) return;
            total++;
            const s = situacao(it);
            if (s === "novo") novos++; else if (s === "revisar") revisar++; else if (s === "aprendendo") aprendendo++;
        }));
        const novosHoje = Math.max(0, Math.min(novos, c.novosDia - (dia.novos || 0)));
        const revHoje = Math.max(0, Math.min(revisar, c.revDia - (dia.revisoes || 0)));
        return {
            novos: novos,
            novosHoje: novosHoje,
            revisar: revisar,
            revHoje: revHoje,
            aprendendo: aprendendo,
            total: total,
            paraHoje: aprendendo + revHoje + novosHoje
        };
    }
    function montarFila(discId) {
        const c = cfgF(), dia = diaHoje();
        const apr = [], rev = [], nov = [];
        itens().forEach((it => {
            if (discId !== undefined && discDoBaralho(it.o) !== discId) return;
            const s = situacao(it);
            if (s === "aprendendo") apr.push(it); else if (s === "revisar") rev.push(it); else if (s === "novo") nov.push(it);
        }));
        const due = it => it.o.fsrs ? +new Date(it.o.fsrs.due) : 0;
        apr.sort(((a, b) => due(a) - due(b)));
        rev.sort(((a, b) => due(a) - due(b)));
        nov.sort(((a, b) => String(a.o.criadoEm || "").localeCompare(String(b.o.criadoEm || ""))));
        const r = rev.slice(0, Math.max(0, c.revDia - (dia.revisoes || 0)));
        const n = nov.slice(0, Math.max(0, c.novosDia - (dia.novos || 0)));
        const fila = apr.slice();
        let i = 0, j = 0;
        while (i < r.length || j < n.length) {
            for (let k = 0; k < 4 && i < r.length; k++) fila.push(r[i++]);
            if (j < n.length) fila.push(n[j++]);
        }
        return fila.map((it => ({
            k: it.k,
            id: it.id
        })));
    }
    let filaCache = {
        v: -1,
        t: 0,
        r: []
    };
    D.cardsDevidos = () => {
        const v = Store._v, agora = Date.now();
        if (filaCache.v !== v || agora - filaCache.t > 6e4) filaCache = {
            v: v,
            t: agora,
            r: montarFila()
        };
        return filaCache.r;
    };
    let ultimo = null;
    function avaliar(it, nota) {
        const o = objDe(it);
        if (!o) return null;
        const agora = new Date, hoje = ymd();
        const eraNovo = it.k === "c" && !o.fsrs;
        const antes = {
            fsrs: o.fsrs ? JSON.parse(JSON.stringify(o.fsrs)) : null,
            srsDue: o.srs ? o.srs.due : null
        };
        const r = motor().next(cardDe(o), agora, nota);
        Store.mut((s => {
            const x = s[it.k === "c" ? "cartoes" : "questoes"].find((y => y.id === it.id));
            if (!x) return;
            x.fsrs = guardar(r.card);
            if (x.srs) x.srs.due = ymd(new Date(r.card.due));
            const d = s.flashDia[hoje] || (s.flashDia[hoje] = {
                novos: 0,
                revisoes: 0,
                errei: 0
            });
            if (eraNovo) d.novos++; else d.revisoes++;
            if (nota === 1) d.errei++;
        }), true);
        ultimo = {
            it: it,
            antes: antes,
            eraNovo: eraNovo,
            nota: nota,
            hoje: hoje
        };
        return r.card;
    }
    function desfazer() {
        if (!ultimo) return null;
        const u = ultimo;
        ultimo = null;
        Store.mut((s => {
            const x = s[u.it.k === "c" ? "cartoes" : "questoes"].find((y => y.id === u.it.id));
            if (!x) return;
            x.fsrs = u.antes.fsrs;
            if (x.srs && u.antes.srsDue) x.srs.due = u.antes.srsDue;
            const d = s.flashDia[u.hoje];
            if (d) {
                if (u.eraNovo) d.novos = Math.max(0, d.novos - 1); else d.revisoes = Math.max(0, d.revisoes - 1);
                if (u.nota === 1) d.errei = Math.max(0, d.errei - 1);
            }
        }), true);
        return u.it;
    }
    const fmtIntervalo = ms => {
        const m = Math.round(ms / 6e4);
        if (m < 60) return Math.max(1, m) + " min";
        const hh = Math.round(m / 60);
        if (hh < 24) return hh + " h";
        const d = Math.round(m / 1440);
        if (d < 31) return d + (d === 1 ? " dia" : " dias");
        const me = Math.round(d / 30);
        if (me < 12) return me + (me === 1 ? " mês" : " meses");
        const a = Math.round(d / 365 * 10) / 10;
        return String(a).replace(".", ",") + (a <= 1 ? " ano" : " anos");
    };
    function previa(it) {
        const o = objDe(it);
        if (!o) return [ "", "", "", "" ];
        const agora = new Date, p = motor().repeat(cardDe(o), agora);
        return [ 1, 2, 3, 4 ].map((g => fmtIntervalo(new Date(p[g].card.due) - agora)));
    }
    const RE_LAC = /\{\{(?:c\d+::)?([\s\S]+?)(?:::([\s\S]*?))?\}\}/g;
    const temLacuna = t => {
        RE_LAC.lastIndex = 0;
        const r = RE_LAC.test(t || "");
        RE_LAC.lastIndex = 0;
        return r;
    };
    function comLacunas(texto, mostrar) {
        const out = [];
        let i = 0, m;
        RE_LAC.lastIndex = 0;
        while (m = RE_LAC.exec(texto)) {
            if (m.index > i) out.push(texto.slice(i, m.index));
            out.push(h("span", {
                class: "lacuna" + (mostrar ? " mostra" : "")
            }, mostrar ? m[1] : "[" + (m[2] || "…") + "]"));
            i = RE_LAC.lastIndex;
        }
        if (i < texto.length) out.push(texto.slice(i));
        return out;
    }
    const semLacunas = t => String(t || "").replace(RE_LAC, ((x, a) => a));
    const resumo = (o, k) => {
        const t = k === "q" ? o.enunciado || "(questão sem enunciado)" : semLacunas(o.frente);
        const um = String(t || "").replace(/\s+/g, " ").trim();
        return um.length > 140 ? um.slice(0, 138) + "…" : um || (o.imgF ? "(imagem)" : "(vazio)");
    };
    const imagem = (src, alt) => src ? h("img", {
        class: "flash-img",
        src: src,
        alt: alt || "Imagem do cartão",
        loading: "lazy"
    }) : null;
    function comprimir(arquivo) {
        return new Promise(((res, rej) => {
            const url = URL.createObjectURL(arquivo), img = new Image;
            img.onload = () => {
                const M = 1100, k = Math.min(1, M / Math.max(img.naturalWidth, img.naturalHeight));
                const w = Math.max(1, Math.round(img.naturalWidth * k)), hh = Math.max(1, Math.round(img.naturalHeight * k));
                const cv = document.createElement("canvas");
                cv.width = w;
                cv.height = hh;
                const cx = cv.getContext("2d");
                cx.fillStyle = "#fff";
                cx.fillRect(0, 0, w, hh);
                cx.drawImage(img, 0, 0, w, hh);
                URL.revokeObjectURL(url);
                let q = .82, d = cv.toDataURL("image/webp", q);
                if (!d.startsWith("data:image/webp")) d = cv.toDataURL("image/jpeg", q);
                const tipo = d.startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
                while (d.length > 38e4 && q > .4) {
                    q -= .1;
                    d = cv.toDataURL(tipo, q);
                }
                res(d);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                rej(new Error("Não consegui ler a imagem."));
            };
            img.src = url;
        }));
    }
    const imagemDoColar = ev => {
        const it = [ ...ev.clipboardData && ev.clipboardData.items || [] ].find((x => x.type && x.type.startsWith("image/")));
        return it ? it.getAsFile() : null;
    };
    function salvarCartao(dados, id) {
        const limpo = {
            tipo: dados.tipo,
            frente: String(dados.frente || "").trim(),
            verso: String(dados.verso || "").trim(),
            ce: dados.tipo === "ce" ? dados.ce : null,
            imgF: dados.imgF || "",
            imgV: dados.imgV || "",
            discId: dados.discId || null,
            topicoId: dados.topicoId && D.topicoExiste(dados.topicoId) ? dados.topicoId : null
        };
        let novo = null;
        Store.mut((s => {
            if (id) {
                const x = s.cartoes.find((y => y.id === id));
                if (x) Object.assign(x, limpo);
                return;
            }
            novo = Object.assign({
                id: uid(),
                tags: [],
                criadoEm: (new Date).toISOString(),
                suspenso: false,
                fsrs: null
            }, limpo, dados.origem ? {
                origem: dados.origem
            } : {});
            s.cartoes.push(novo);
            s.config.flashUltimo = {
                tipo: limpo.tipo,
                discId: limpo.discId,
                topicoId: limpo.topicoId
            };
        }));
        return novo;
    }
    function apagar(it) {
        if (it.k === "q") {
            let antes = null;
            Store.mut((s => {
                const q = s.questoes.find((x => x.id === it.id));
                if (q) {
                    antes = {
                        srs: q.srs,
                        fsrs: q.fsrs
                    };
                    q.srs = null;
                    q.fsrs = null;
                }
            }));
            U.toast("A questão saiu dos flashcards (continua no caderno de questões).", "", {
                acao: "Desfazer",
                fn: () => Store.mut((s => {
                    const q = s.questoes.find((x => x.id === it.id));
                    if (q && antes) Object.assign(q, antes);
                }))
            });
            return;
        }
        let tirado = null, pos = -1;
        Store.mut((s => {
            pos = s.cartoes.findIndex((x => x.id === it.id));
            if (pos >= 0) tirado = s.cartoes.splice(pos, 1)[0];
        }));
        if (tirado) U.toast("Cartão apagado.", "", {
            acao: "Desfazer",
            fn: () => Store.mut((s => {
                s.cartoes.splice(Math.min(pos, s.cartoes.length), 0, tirado);
            }))
        });
    }
    function suspender(id) {
        Store.mut((s => {
            const c = s.cartoes.find((x => x.id === id));
            if (c) c.suspenso = !c.suspenso;
        }));
    }
    function opcoesAssunto(sel, discId, escolhido) {
        U.clear(sel);
        sel.appendChild(h("option", {
            value: ""
        }, "(sem assunto específico)"));
        const d = D.edital().disc[discId];
        sel.disabled = !d;
        if (!d) return;
        const walk = (ns, n) => ns.forEach((t => {
            sel.appendChild(h("option", {
                value: t.id,
                selected: t.id === escolhido
            }, "  ".repeat(n) + (n ? "↳ " : "") + t.num + " " + t.texto.slice(0, 80)));
            walk(t.filhos || [], n + 1);
        }));
        walk(d.topicos, 0);
    }
    function editor(base) {
        base = base || {};
        const ed = D.edital(), ult = S().config.flashUltimo || {};
        const st = {
            tipo: base.tipo || ult.tipo || "basico",
            ce: base.ce || "",
            imgF: base.imgF || "",
            imgV: base.imgV || ""
        };
        const discIni = base.id || base.discId !== undefined ? base.discId || "" : ult.discId || "";
        const disc = h("select", {
            "aria-label": "Matéria"
        }, h("option", {
            value: ""
        }, "(sem matéria)"), ed.discs.map((d => h("option", {
            value: d.id,
            selected: d.id === discIni
        }, d.nome))));
        const top = h("select", {
            "aria-label": "Assunto"
        });
        opcoesAssunto(top, disc.value, base.id || base.topicoId !== undefined ? base.topicoId : ult.topicoId);
        disc.addEventListener("change", (() => opcoesAssunto(top, disc.value, null)));
        const frente = h("textarea", {
            rows: 5,
            value: base.frente || ""
        });
        const verso = h("textarea", {
            rows: 4,
            value: base.verso || ""
        });
        const rotF = h("span"), rotV = h("span"), dica = h("div", {
            class: "hint"
        });
        const btLac = h("button", {
            class: "btn sm",
            type: "button",
            onclick: () => {
                const a = frente.selectionStart, b = frente.selectionEnd, t = frente.value;
                if (a === b) {
                    U.toast("Selecione no texto a palavra ou o trecho que vai sumir.");
                    frente.focus();
                    return;
                }
                frente.value = t.slice(0, a) + "{{" + t.slice(a, b) + "}}" + t.slice(b);
                frente.focus();
                frente.setSelectionRange(b + 4, b + 4);
            }
        }, icon("edit", "sm"), "Esconder o trecho selecionado");
        const ceBotoes = h("div", {
            class: "row"
        });
        const desenhaCe = () => {
            U.clear(ceBotoes);
            [ [ "C", "Certo" ], [ "E", "Errado" ] ].forEach((([v, t]) => ceBotoes.appendChild(h("button", {
                type: "button",
                class: "chip" + (st.ce === v ? " on" : ""),
                "aria-pressed": st.ce === v ? "true" : "false",
                onclick: () => {
                    st.ce = v;
                    desenhaCe();
                }
            }, t))));
        };
        desenhaCe();
        const ceLinha = h("div", {
            class: "f"
        }, h("span", null, "Gabarito da afirmação"), ceBotoes);
        const caixaImg = lado => {
            const box = h("div", {
                class: "img-campo",
                tabindex: 0
            });
            const desenha = () => {
                U.clear(box);
                if (st[lado]) box.appendChild(h("img", {
                    src: st[lado],
                    alt: ""
                }));
                box.appendChild(h("span", null, st[lado] ? "" : "Imagem (opcional): cole com Ctrl+V ou "));
                const inp = h("input", {
                    type: "file",
                    accept: "image/*",
                    style: {
                        display: "none"
                    },
                    onchange: async () => {
                        const f = inp.files[0];
                        if (f) await usar(f);
                    }
                });
                box.appendChild(inp);
                box.appendChild(h("button", {
                    type: "button",
                    class: "btn sm",
                    onclick: () => inp.click()
                }, icon("upload", "sm"), st[lado] ? "Trocar" : "escolher um arquivo"));
                if (st[lado]) box.appendChild(h("button", {
                    type: "button",
                    class: "btn sm danger",
                    onclick: () => {
                        st[lado] = "";
                        desenha();
                    }
                }, icon("x", "sm"), "Tirar"));
            };
            const usar = async arq => {
                try {
                    st[lado] = await comprimir(arq);
                    desenha();
                } catch (e) {
                    U.toast(e.message, "err");
                }
            };
            box.addEventListener("paste", (ev => {
                const f = imagemDoColar(ev);
                if (f) {
                    ev.preventDefault();
                    usar(f);
                }
            }));
            box._usar = usar;
            box._desenha = desenha;
            desenha();
            return box;
        };
        const boxF = caixaImg("imgF"), boxV = caixaImg("imgV");
        frente.addEventListener("paste", (ev => {
            const f = imagemDoColar(ev);
            if (f) {
                ev.preventDefault();
                boxF._usar(f);
            }
        }));
        verso.addEventListener("paste", (ev => {
            const f = imagemDoColar(ev);
            if (f) {
                ev.preventDefault();
                boxV._usar(f);
            }
        }));
        const tiposEl = h("div", {
            class: "tabs",
            role: "radiogroup",
            "aria-label": "Tipo de cartão"
        });
        const ajusta = () => {
            U.clear(tiposEl);
            [ "basico", "lacuna", "ce" ].forEach((k => tiposEl.appendChild(h("button", {
                type: "button",
                class: "tab" + (st.tipo === k ? " on" : ""),
                role: "radio",
                "aria-checked": st.tipo === k ? "true" : "false",
                onclick: () => {
                    st.tipo = k;
                    ajusta();
                }
            }, TIPOS[k]))));
            rotF.textContent = st.tipo === "lacuna" ? "Texto (o que estiver entre {{ }} some na hora de revisar)" : st.tipo === "ce" ? "Afirmação" : "Frente (pergunta)";
            rotV.textContent = st.tipo === "lacuna" ? "Extra (opcional, aparece com a resposta)" : st.tipo === "ce" ? "Justificativa (opcional)" : "Verso (resposta)";
            dica.textContent = st.tipo === "lacuna" ? 'Ótimo para lei seca e prazos. Ex.: "O prazo de prescrição é de {{5 anos}}". Pode ter várias lacunas; todas somem juntas.' : st.tipo === "ce" ? "No estilo Cebraspe: na revisão você responde Certo ou Errado antes de ver o gabarito." : "Pergunta curta na frente, resposta direta no verso. Um conceito por cartão.";
            btLac.style.display = st.tipo === "lacuna" ? "" : "none";
            ceLinha.style.display = st.tipo === "ce" ? "" : "none";
            boxF.setAttribute("aria-label", "Imagem " + (st.tipo === "basico" ? "da frente" : "do texto") + " (opcional): cole com Ctrl+V");
            boxV.setAttribute("aria-label", "Imagem " + (st.tipo === "lacuna" ? "do extra" : st.tipo === "ce" ? "da justificativa" : "do verso") + " (opcional): cole com Ctrl+V");
        };
        ajusta();
        const dados = () => {
            const d = {
                tipo: st.tipo,
                frente: frente.value,
                verso: verso.value,
                ce: st.ce,
                imgF: st.imgF,
                imgV: st.imgV,
                discId: disc.value || null,
                topicoId: top.value || null,
                origem: base.origem
            };
            if (!d.frente.trim() && !d.imgF) {
                U.toast("Escreva a frente do cartão (ou cole uma imagem).", "err");
                frente.focus();
                return null;
            }
            if (d.tipo === "lacuna" && !temLacuna(d.frente)) {
                U.toast('Marque pelo menos um trecho entre {{ }} (selecione e use "Esconder o trecho selecionado").', "err");
                frente.focus();
                return null;
            }
            if (d.tipo === "ce" && !d.ce) {
                U.toast("Escolha o gabarito: Certo ou Errado.", "err");
                return null;
            }
            if (d.tipo === "basico" && !d.verso.trim() && !d.imgV) {
                U.toast("Escreva o verso (a resposta).", "err");
                verso.focus();
                return null;
            }
            return d;
        };
        const limpar = () => {
            frente.value = "";
            verso.value = "";
            st.imgF = "";
            st.imgV = "";
            st.ce = "";
            boxF._desenha();
            boxV._desenha();
            desenhaCe();
            frente.focus();
        };
        let criados = 0;
        const m = U.modal({
            titulo: base.id ? "Editar flashcard" : "Novo flashcard",
            largo: true,
            corpo: h("div", {
                class: "col"
            }, tiposEl, dica, h("div", {
                class: "grid g2"
            }, h("label", {
                class: "f"
            }, "Matéria", disc), h("label", {
                class: "f"
            }, "Assunto (opcional)", top)), h("label", {
                class: "f"
            }, rotF, frente), btLac, boxF, ceLinha, h("label", {
                class: "f"
            }, rotV, verso), boxV, h("div", {
                class: "tiny muted"
            }, "Ctrl+Enter salva" + (base.id ? "." : " e já abre o próximo cartão."))),
            botoes: [ {
                texto: "Cancelar"
            }, base.id ? null : {
                texto: "Salvar e criar outro",
                manter: true,
                fn: () => {
                    const d = dados();
                    if (!d) return false;
                    salvarCartao(d);
                    criados++;
                    U.toast(U.plural(criados, "cartão criado", "cartões criados") + " nesta janela.", "ok");
                    limpar();
                    return false;
                }
            }, {
                texto: "Salvar",
                tipo: "primary",
                fn: () => {
                    const d = dados();
                    if (!d) return false;
                    salvarCartao(d, base.id);
                    U.toast(base.id ? "Cartão salvo." : "Cartão criado.", "ok");
                }
            } ].filter(Boolean)
        });
        m.el.addEventListener("keydown", (ev => {
            if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
                ev.preventDefault();
                const alvo = [ ...m.el.querySelectorAll(".modal-f .btn") ].find((b => (base.id ? /^Salvar$/ : /Salvar e criar outro/).test(b.textContent.trim())));
                if (alvo) alvo.click();
            }
        }));
        setTimeout((() => frente.focus()), 60);
        return m;
    }
    function lerTabela(txt) {
        const linhas = String(txt || "").replace(/^﻿/, "").split(/\r?\n/);
        let sep = null, colTags = 0;
        const corpo = [];
        for (const l of linhas) {
            const m = !corpo.length && l.match(/^#([a-z][a-z ]*):(.*)$/i);
            if (m) {
                const k = m[1].trim().toLowerCase(), v = m[2].trim();
                if (k === "separator") sep = {
                    tab: "\t",
                    semicolon: ";",
                    comma: ",",
                    pipe: "|",
                    space: " "
                }[v.toLowerCase()] || v;
                if (k === "tags column") colTags = +v || 0;
                continue;
            }
            corpo.push(l);
        }
        const texto = corpo.join("\n");
        if (!sep) {
            const p = texto.split("\n").slice(0, 30).join("\n");
            sep = /\t/.test(p) ? "\t" : (p.match(/;/g) || []).length >= (p.match(/,/g) || []).length ? ";" : ",";
        }
        const rows = [];
        let row = [], campo = "", aspas = false;
        for (let i = 0; i < texto.length; i++) {
            const ch = texto[i];
            if (aspas) {
                if (ch === '"') {
                    if (texto[i + 1] === '"') {
                        campo += '"';
                        i++;
                    } else aspas = false;
                } else campo += ch;
            } else if (ch === '"' && campo === "") aspas = true; else if (ch === sep) {
                row.push(campo);
                campo = "";
            } else if (ch === "\n") {
                row.push(campo);
                rows.push(row);
                row = [];
                campo = "";
            } else campo += ch;
        }
        if (campo !== "" || row.length) {
            row.push(campo);
            rows.push(row);
        }
        return {
            rows: rows.filter((r => r.some((c => c.trim())))),
            colTags: colTags
        };
    }
    function semHtml(s) {
        s = String(s || "");
        if (!/[<&]/.test(s)) return s.trim();
        const doc = (new DOMParser).parseFromString("<div>" + s.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(div|p|li|h\d)>/gi, "\n") + "</div>", "text/html");
        return String(doc.body.textContent || "").replace(/ /g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    }
    function importar() {
        const ed = D.edital();
        const area = h("textarea", {
            rows: 6,
            placeholder: "Cole aqui (uma linha por cartão: frente, Tab, verso) ou escolha um arquivo .txt / .csv",
            "aria-label": "Texto para importar"
        });
        const disc = h("select", {
            "aria-label": "Matéria"
        }, h("option", {
            value: ""
        }, "(sem matéria)"), ed.discs.map((d => h("option", {
            value: d.id
        }, d.nome))));
        const top = h("select", {
            "aria-label": "Assunto"
        });
        opcoesAssunto(top, "", null);
        disc.addEventListener("change", (() => opcoesAssunto(top, disc.value, null)));
        const previaEl = h("div", {
            class: "callout",
            role: "status"
        }, "Nada lido ainda.");
        let lidos = [];
        const ler = () => {
            const {rows: rows} = lerTabela(area.value);
            lidos = rows.map((r => {
                const f = semHtml(r[0]), v = semHtml(r[1] || "");
                return temLacuna(f) ? {
                    tipo: "lacuna",
                    frente: f,
                    verso: v
                } : {
                    tipo: "basico",
                    frente: f,
                    verso: v
                };
            })).filter((x => x.frente && (x.tipo === "lacuna" || x.verso)));
            const nl = lidos.filter((x => x.tipo === "lacuna")).length;
            U.clear(previaEl);
            previaEl.appendChild(h("div", null, h("b", null, U.plural(lidos.length, "cartão encontrado", "cartões encontrados")), nl ? " (" + U.plural(nl, "de lacuna", "de lacuna") + ")" : "", lidos.length ? ". Exemplo:" : ". Confira se cada linha tem frente e verso separados por Tab, ponto e vírgula ou vírgula."));
            if (lidos[0]) previaEl.appendChild(h("div", {
                class: "small",
                style: {
                    marginTop: "6px"
                }
            }, h("b", null, "Frente: "), semLacunas(lidos[0].frente).slice(0, 160), h("br"), h("b", null, "Verso: "), (lidos[0].verso || "—").slice(0, 160)));
        };
        area.addEventListener("input", U.debounce(ler, 200));
        U.modal({
            titulo: "Importar flashcards",
            largo: true,
            corpo: h("div", {
                class: "col"
            }, h("p", {
                class: "hint",
                style: {
                    margin: 0
                }
            }, 'Aceita o texto exportado pelo Anki ("Notas em texto simples"), planilhas salvas em CSV e listas coladas. A primeira coluna vira a frente e a segunda o verso; lacunas no formato {{c1::...}} viram cartões de lacuna.'), h("div", {
                class: "row wrap"
            }, h("button", {
                class: "btn",
                type: "button",
                onclick: async () => {
                    const f = await U.pickFile(".txt,.csv,.tsv");
                    if (f) {
                        area.value = f.texto;
                        ler();
                    }
                }
            }, icon("upload", "sm"), "Escolher arquivo")), area, previaEl, h("div", {
                class: "grid g2"
            }, h("label", {
                class: "f"
            }, "Matéria dos cartões", disc), h("label", {
                class: "f"
            }, "Assunto (opcional)", top))),
            botoes: [ {
                texto: "Cancelar"
            }, {
                texto: "Importar",
                tipo: "primary",
                fn: () => {
                    ler();
                    if (!lidos.length) {
                        U.toast("Nenhum cartão para importar.", "err");
                        return false;
                    }
                    const ja = new Set(S().cartoes.map((c => norm(c.frente) + "|" + norm(c.verso))));
                    const agora = Date.now();
                    let n = 0, rep = 0;
                    Store.mut((s => {
                        lidos.forEach(((x, i) => {
                            const k = norm(x.frente) + "|" + norm(x.verso);
                            if (ja.has(k)) {
                                rep++;
                                return;
                            }
                            ja.add(k);
                            s.cartoes.push({
                                id: uid(),
                                tipo: x.tipo,
                                frente: x.frente,
                                verso: x.verso,
                                ce: null,
                                imgF: "",
                                imgV: "",
                                discId: disc.value || null,
                                topicoId: top.value || null,
                                tags: [ "importado" ],
                                criadoEm: new Date(agora + i).toISOString(),
                                suspenso: false,
                                fsrs: null
                            });
                            n++;
                        }));
                    }));
                    U.toast(U.plural(n, "cartão importado", "cartões importados") + (rep ? " (" + U.plural(rep, "repetido ficou de fora", "repetidos ficaram de fora") + ")" : "") + ".", n ? "ok" : "");
                }
            } ]
        });
        setTimeout((() => area.focus()), 60);
    }
    function exportar() {
        const ed = D.edital();
        const disc = h("select", {
            "aria-label": "Matéria"
        }, h("option", {
            value: ""
        }, "Todas as matérias"), ed.discs.filter((d => S().cartoes.some((c => c.discId === d.id)))).map((d => h("option", {
            value: d.id
        }, d.nome))));
        const esc = s => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r?\n/g, "<br>").replace(/\t/g, " ");
        const slug = t => norm(t).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "materia";
        const baixa = lacuna => {
            const lista = S().cartoes.filter((c => (!disc.value || c.discId === disc.value) && (lacuna ? c.tipo === "lacuna" : c.tipo !== "lacuna")));
            if (!lista.length) {
                U.toast(lacuna ? "Nenhum cartão de lacuna para exportar." : "Nenhum cartão de frente e verso (ou Certo ou errado) para exportar.", "err");
                return;
            }
            const linhas = [ "#separator:tab", "#html:true", "#tags column:3", "#deck column:4" ];
            let comImg = 0;
            lista.forEach((c => {
                let f = c.frente, v = c.verso || "";
                if (c.tipo === "lacuna") {
                    let k = 0;
                    f = String(f).replace(RE_LAC, ((x, a, dica) => "{{c" + ++k + "::" + a + (dica ? "::" + dica : "") + "}}"));
                }
                if (c.tipo === "ce") v = (c.ce === "C" ? "Certo" : "Errado") + (v ? " — " + v : "");
                if (c.imgF || c.imgV) comImg++;
                const nomeD = c.discId ? D.nomeDisc(c.discId, false) : "Sem matéria";
                linhas.push([ esc(f), esc(v), "arsenal " + slug(nomeD), "Arsenal::" + nomeD.replace(/::/g, ":") ].join("\t"));
            }));
            U.download("flashcards-" + (disc.value ? slug(D.nomeDisc(disc.value, false)) : "todos") + (lacuna ? "-lacunas" : "") + "-" + ymd() + ".txt", linhas.join("\n"), "text/plain;charset=utf-8");
            U.toast(U.plural(lista.length, "cartão exportado", "cartões exportados") + (comImg ? ". As imagens não vão no arquivo (" + comImg + " com imagem)." : "."), "ok");
        };
        U.modal({
            titulo: "Exportar flashcards (para o Anki)",
            largo: true,
            corpo: h("div", {
                class: "col"
            }, h("p", {
                class: "hint",
                style: {
                    margin: 0
                }
            }, 'Gera um arquivo de texto que o Anki importa (Arquivo › Importar). Assim dá para revisar também no celular, pelo AnkiDroid ou AnkiMobile. Os cartões de frente e verso e os de lacuna saem em arquivos separados: no Anki, escolha o tipo "Básico" para o primeiro e "Omissão de palavras" (Cloze) para o de lacunas.'), h("label", {
                class: "f"
            }, "Quais cartões", disc), h("div", {
                class: "row wrap"
            }, h("button", {
                class: "btn",
                type: "button",
                onclick: () => baixa(false)
            }, icon("download", "sm"), "Baixar frente e verso"), h("button", {
                class: "btn",
                type: "button",
                onclick: () => baixa(true)
            }, icon("download", "sm"), "Baixar lacunas"))),
            botoes: [ {
                texto: "Fechar"
            } ]
        });
    }
    function ajustes() {
        const c = cfgF();
        const nov = h("input", {
            type: "number",
            min: 0,
            max: 500,
            value: c.novosDia
        });
        const rev = h("input", {
            type: "number",
            min: 10,
            max: 2e3,
            value: c.revDia
        });
        const ret = h("select", null, [ [ .8, "80% (menos revisões, esquece mais)" ], [ .85, "85%" ], [ .9, "90% (recomendado)" ], [ .93, "93%" ], [ .95, "95% (muitas revisões)" ] ].map((([v, t]) => h("option", {
            value: v,
            selected: Math.abs(v - c.retencao) < .001
        }, t))));
        U.modal({
            titulo: "Ajustes dos flashcards",
            corpo: h("div", {
                class: "col"
            }, h("label", {
                class: "f"
            }, "Cartões novos por dia", nov), h("label", {
                class: "f"
            }, "Máximo de revisões por dia", rev), h("label", {
                class: "f"
            }, "Quanto você quer lembrar na hora da revisão", ret), h("p", {
                class: "hint",
                style: {
                    margin: 0
                }
            }, "O Arsenal usa o FSRS, o mesmo método do Anki atual: cada cartão volta pouco antes de você esquecer. Com a data da prova definida (Ajustes › Perfil e metas), nenhum cartão fica marcado para depois dela.")),
            botoes: [ {
                texto: "Cancelar"
            }, {
                texto: "Salvar",
                tipo: "primary",
                fn: () => {
                    Store.mut((s => {
                        s.config.flash = {
                            novosDia: U.clamp(Math.round(+nov.value || 0), 0, 500),
                            revDia: U.clamp(Math.round(+rev.value || 200), 10, 2e3),
                            retencao: +ret.value || .9
                        };
                    }));
                    U.toast("Ajustes dos flashcards salvos.", "ok");
                }
            } ]
        });
    }
    const ui = {
        sessao: null,
        disc: "",
        busca: "",
        situ: "todos",
        mais: 50
    };
    function iniciar(discId) {
        const fila = montarFila(discId);
        if (!fila.length) {
            U.toast("Nada para revisar agora. Volte mais tarde ou crie cartões novos.");
            return;
        }
        ultimo = null;
        ui.sessao = {
            fila: fila,
            i: 0,
            mostrar: false,
            resp: null,
            feitos: 0,
            acertos: 0,
            disc: discId,
            reposto: false
        };
        V.refresh();
    }
    function telaInicio() {
        const ed = D.edital(), cont = contagem();
        const dias30 = Object.entries(S().flashDia).filter((([d]) => d >= U.addDays(ymd(), -29))).map((([, v]) => v));
        const tot30 = dias30.reduce(((a, v) => a + (v.revisoes || 0) + (v.novos || 0)), 0), err30 = dias30.reduce(((a, v) => a + (v.errei || 0)), 0);
        const todos = itens(), temAlgo = S().cartoes.length || todos.length;
        const acoes = h("div", {
            class: "row wrap"
        }, h("button", {
            class: "btn primary",
            disabled: !cont.paraHoje,
            onclick: () => iniciar()
        }, icon("play", "sm"), "Estudar agora" + (cont.paraHoje ? " (" + cont.paraHoje + ")" : "")), h("button", {
            class: "btn",
            onclick: () => editor()
        }, icon("plus", "sm"), "Novo cartão"), h("button", {
            class: "btn",
            onclick: importar
        }, icon("upload", "sm"), "Importar"), h("button", {
            class: "btn",
            onclick: exportar,
            disabled: !S().cartoes.length
        }, icon("download", "sm"), "Exportar"), h("button", {
            class: "btn ghost",
            onclick: ajustes,
            title: "Novos por dia, revisões por dia e retenção"
        }, icon("settings", "sm"), "Ajustes"));
        const topo = h("div", {
            class: "kpis"
        }, h("div", {
            class: "stat"
        }, h("div", {
            class: "v"
        }, cont.aprendendo + cont.revHoje), h("div", {
            class: "l"
        }, "Para revisar hoje"), h("div", {
            class: "d"
        }, cont.aprendendo ? cont.aprendendo + " em aprendizado" : "no tempo certo")), h("div", {
            class: "stat"
        }, h("div", {
            class: "v"
        }, cont.novosHoje), h("div", {
            class: "l"
        }, "Novos hoje"), h("div", {
            class: "d"
        }, cont.novos > cont.novosHoje ? cont.novos + " novos na fila" : "limite: " + cfgF().novosDia + " por dia")), h("div", {
            class: "stat"
        }, h("div", {
            class: "v"
        }, cont.total), h("div", {
            class: "l"
        }, "No total"), h("div", {
            class: "d"
        }, U.plural(S().cartoes.length, "cartão", "cartões") + " · " + U.plural(todos.filter((x => x.k === "q")).length, "questão", "questões"))), h("div", {
            class: "stat"
        }, h("div", {
            class: "v"
        }, tot30 ? pct(tot30 - err30, tot30) + "%" : "—"), h("div", {
            class: "l"
        }, "Lembrou (30 dias)"), h("div", {
            class: "d"
        }, U.plural(tot30, "revisão", "revisões"))));
        if (!temAlgo) {
            return h("div", {
                class: "col",
                style: {
                    gap: "16px"
                }
            }, h("div", {
                class: "card"
            }, h("h3", null, icon("cards", "sm"), "Flashcards"), h("p", {
                class: "muted",
                style: {
                    marginTop: 0
                }
            }, "Cartões que voltam pouco antes de você esquecer (o mesmo método do Anki). Três tipos:"), h("div", {
                class: "grid g3"
            }, h("div", {
                class: "card tela"
            }, h("h4", null, "Frente e verso"), h("div", {
                class: "small"
            }, 'Pergunta curta, resposta direta. Ex.: "Prazo do mandado de segurança?" › "120 dias".')), h("div", {
                class: "card tela"
            }, h("h4", null, "Lacuna"), h("div", {
                class: "small"
            }, 'Para lei seca: "A prescrição ocorre em {{5 anos}}". O trecho some na revisão.')), h("div", {
                class: "card tela"
            }, h("h4", null, "Certo ou errado"), h("div", {
                class: "small"
            }, "No estilo Cebraspe: você responde C ou E antes de ver o gabarito e a justificativa."))), h("div", {
                class: "row wrap",
                style: {
                    marginTop: "14px"
                }
            }, h("button", {
                class: "btn primary",
                onclick: () => editor()
            }, icon("plus", "sm"), "Criar o primeiro cartão"), h("button", {
                class: "btn",
                onclick: importar
            }, icon("upload", "sm"), "Importar do Anki ou de uma planilha")), h("p", {
                class: "hint",
                style: {
                    marginBottom: 0
                }
            }, 'As questões que você registrar como erradas em "Questões e erros" também entram aqui.')), Encaixe.todos("flash.sugestoes"));
        }
        const discsCom = ed.discs.filter((d => todos.some((x => x.o.discId === d.id))));
        const semDisc = todos.some((x => !x.o.discId || !ed.disc[x.o.discId]));
        const linhaBaralho = (id, nome, cor) => {
            const c = contagem(id);
            return h("div", {
                class: "baralho"
            }, h("span", {
                class: "dot-c",
                style: {
                    background: cor
                }
            }), h("div", {
                style: {
                    minWidth: 0
                }
            }, h("div", {
                class: "ellipsis",
                style: {
                    fontWeight: 700
                }
            }, nome), h("div", {
                class: "tiny muted"
            }, c.aprendendo + c.revHoje + " para revisar · " + c.novosHoje + " novos · " + c.total + " no total")), h("button", {
                class: "btn sm",
                title: "Novo cartão de " + nome,
                "aria-label": "Novo cartão de " + nome,
                onclick: () => editor({
                    discId: id || null,
                    topicoId: null
                })
            }, icon("plus", "sm")), h("button", {
                class: "btn sm" + (c.paraHoje ? " primary" : ""),
                disabled: !c.paraHoje,
                onclick: () => iniciar(id)
            }, "Estudar" + (c.paraHoje ? " (" + c.paraHoje + ")" : "")));
        };
        const baralhos = h("div", {
            class: "card"
        }, h("h3", null, "Por matéria"), h("div", {
            class: "baralhos"
        }, discsCom.map((d => linhaBaralho(d.id, d.nome, D.corDisc(d.id)))), semDisc ? linhaBaralho("", "Sem matéria", "#8a9099") : null));
        const busca = h("input", {
            type: "search",
            placeholder: "Procurar nos cartões",
            value: ui.busca,
            "aria-label": "Procurar nos cartões",
            style: {
                minWidth: "200px"
            }
        });
        const fDisc = h("select", {
            "aria-label": "Matéria",
            onchange: ev => {
                ui.disc = ev.target.value;
                ui.mais = 50;
                desenhaLista();
            }
        }, h("option", {
            value: ""
        }, "Todas as matérias"), ed.discs.map((d => h("option", {
            value: d.id,
            selected: d.id === ui.disc
        }, d.nome))));
        const fSitu = h("select", {
            "aria-label": "Situação",
            onchange: ev => {
                ui.situ = ev.target.value;
                ui.mais = 50;
                desenhaLista();
            }
        }, [ [ "todos", "Todos" ], [ "hoje", "Para hoje" ], [ "novos", "Novos" ], [ "questoes", "Questões erradas" ], [ "suspensos", "Suspensos" ] ].map((([k, t]) => h("option", {
            value: k,
            selected: k === ui.situ
        }, t))));
        const lista = h("div", {
            class: "col",
            style: {
                gap: "6px"
            }
        });
        function desenhaLista() {
            U.clear(lista);
            const q = norm(ui.busca);
            const base = S().cartoes.map((c => ({
                k: "c",
                id: c.id,
                o: c
            }))).concat(S().questoes.filter((x => x.srs)).map((x => ({
                k: "q",
                id: x.id,
                o: x
            }))));
            const L = base.filter((it => {
                if (ui.disc && it.o.discId !== ui.disc) return false;
                if (ui.situ === "suspensos" && !(it.k === "c" && it.o.suspenso)) return false;
                if (ui.situ !== "suspensos" && it.k === "c" && it.o.suspenso && ui.situ !== "todos") return false;
                if (ui.situ === "questoes" && it.k !== "q") return false;
                if (ui.situ === "novos" && !(it.k === "c" && !it.o.fsrs)) return false;
                if (ui.situ === "hoje") {
                    const s = situacao(it);
                    if (s === "futuro" || it.k === "c" && it.o.suspenso) return false;
                }
                if (q && !norm((it.k === "q" ? it.o.enunciado : it.o.frente + " " + it.o.verso) || "").includes(q)) return false;
                return true;
            })).sort(((a, b) => String(b.o.criadoEm || "").localeCompare(String(a.o.criadoEm || ""))));
            if (!L.length) {
                lista.appendChild(h("div", {
                    class: "empty small"
                }, "Nenhum cartão com esses filtros."));
                return;
            }
            L.slice(0, ui.mais).forEach((it => lista.appendChild(linhaCartao(it))));
            if (L.length > ui.mais) lista.appendChild(h("button", {
                class: "btn",
                style: {
                    alignSelf: "center"
                },
                onclick: () => {
                    ui.mais += 50;
                    desenhaLista();
                }
            }, "Mostrar mais (faltam " + (L.length - ui.mais) + ")"));
        }
        busca.addEventListener("input", U.debounce((() => {
            ui.busca = busca.value;
            ui.mais = 50;
            desenhaLista();
        }), 160));
        desenhaLista();
        return h("div", {
            class: "col",
            style: {
                gap: "16px"
            }
        }, topo, h("div", {
            class: "card"
        }, h("div", {
            class: "row wrap"
        }, h("div", {
            class: "grow"
        }, h("h3", {
            style: {
                marginBottom: "4px"
            }
        }, "Flashcards"), h("div", {
            class: "hint"
        }, "Atalhos na revisão: Espaço mostra a resposta, 1 a 4 dão a nota, C ou E respondem os de Certo ou errado e Z desfaz."))), acoes), Encaixe.todos("flash.sugestoes"), baralhos, h("div", {
            class: "card"
        }, h("div", {
            class: "row wrap",
            style: {
                marginBottom: "10px"
            }
        }, h("h3", {
            style: {
                margin: 0
            }
        }, "Seus cartões"), h("div", {
            class: "right row wrap"
        }, busca, fDisc, fSitu)), lista));
    }
    function proximaEm(it) {
        const o = it.o;
        if (it.k === "q" && !o.fsrs) return "revisar " + (o.srs.due <= ymd() ? "hoje" : "em " + U.fmtData(o.srs.due));
        if (!o.fsrs) return "novo";
        const d = new Date(o.fsrs.due);
        return d <= fimDoDia() ? "revisar hoje" : "próxima: " + U.fmtData(ymd(d));
    }
    function linhaCartao(it) {
        const o = it.o, tipo = it.k === "q" ? "questao" : o.tipo;
        const local = discDoBaralho(o) ? D.nomeDisc(o.discId, false) + (o.topicoId && D.topicoExiste(o.topicoId) ? " › " + D.rotuloTopico(o.topicoId).slice(0, 50) : "") : "Sem matéria";
        return h("div", {
            class: "row linha-solta" + (it.k === "c" && o.suspenso ? " apagado" : "")
        }, h("span", {
            class: "dot-c",
            style: {
                background: o.discId ? D.corDisc(o.discId) : "#8a9099"
            }
        }), h("div", {
            class: "grow",
            style: {
                minWidth: 0
            }
        }, h("div", {
            class: "ellipsis",
            style: {
                fontWeight: 600
            },
            title: resumo(o, it.k)
        }, resumo(o, it.k)), h("div", {
            class: "tiny muted ellipsis"
        }, TIPOS[tipo] + " · " + local + " · " + (it.k === "c" && o.suspenso ? "suspenso" : proximaEm(it)) + (o.imgF || o.imgV ? " · com imagem" : ""))), it.k === "c" ? [ h("button", {
            class: "btn sm",
            title: "Editar",
            "aria-label": "Editar",
            onclick: () => editor(o)
        }, icon("edit", "sm")), h("button", {
            class: "btn sm",
            title: o.suspenso ? "Voltar a revisar" : "Suspender (para de aparecer)",
            "aria-label": o.suspenso ? "Voltar a revisar" : "Suspender",
            onclick: () => suspender(o.id)
        }, icon(o.suspenso ? "play" : "pause", "sm")) ] : h("button", {
            class: "btn sm",
            title: "Abrir a questão",
            "aria-label": "Abrir a questão",
            onclick: () => {
                App.nav("questoes");
                setTimeout((() => V.abrirQuestao && V.abrirQuestao(o.id)), 80);
            }
        }, icon("ext", "sm")), h("button", {
            class: "btn sm danger",
            title: it.k === "q" ? "Tirar dos flashcards" : "Apagar",
            "aria-label": it.k === "q" ? "Tirar dos flashcards" : "Apagar",
            onclick: () => apagar(it)
        }, icon("trash", "sm")));
    }
    function telaSessao() {
        const se = ui.sessao;
        if (se.i >= se.fila.length) {
            const mais = montarFila(se.disc).length;
            return h("div", {
                class: "card flash-sessao"
            }, h("div", {
                class: "empty"
            }, icon("award", "lg"), h("h3", {
                style: {
                    justifyContent: "center"
                }
            }, "Sessão concluída"), h("div", null, U.plural(se.feitos, "cartão revisado", "cartões revisados") + (se.feitos ? " · lembrou " + pct(se.acertos, se.feitos) + "%" : "") + "."), h("div", {
                class: "row",
                style: {
                    justifyContent: "center",
                    marginTop: "12px"
                }
            }, mais ? h("button", {
                class: "btn primary",
                onclick: () => iniciar(se.disc)
            }, "Continuar (" + mais + ")") : null, h("button", {
                class: mais ? "btn" : "btn primary",
                onclick: () => {
                    ui.sessao = null;
                    V.refresh();
                }
            }, "Voltar"))));
        }
        const it = se.fila[se.i], o = objDe(it);
        if (!o || it.k === "c" && o.suspenso) {
            se.i++;
            return telaSessao();
        }
        const tipo = it.k === "q" ? "questao" : o.tipo;
        const nota = n => {
            const card = avaliar(it, n);
            se.feitos++;
            if (n > 1) se.acertos++;
            se.reposto = false;
            if (card && new Date(card.due) - Date.now() < 20 * 6e4) {
                se.fila.push({
                    k: it.k,
                    id: it.id
                });
                se.reposto = true;
            }
            se.ultNota = n;
            se.i++;
            se.mostrar = false;
            se.resp = null;
            V.refresh();
        };
        const voltar = () => {
            const x = desfazer();
            if (!x) return;
            if (se.reposto) se.fila.pop();
            se.i = Math.max(0, se.i - 1);
            se.feitos = Math.max(0, se.feitos - 1);
            if (se.ultNota > 1) se.acertos = Math.max(0, se.acertos - 1);
            se.reposto = false;
            se.mostrar = true;
            V.refresh();
        };
        const responderCe = v => {
            se.resp = v;
            se.mostrar = true;
            V.refresh();
        };
        se.acoes = {
            nota: nota,
            voltar: voltar,
            responderCe: responderCe,
            mostrar: () => {
                se.mostrar = true;
                V.refresh();
            }
        };
        const meta = h("div", {
            class: "row wrap small muted"
        }, h("span", {
            class: "dot-c",
            style: {
                background: o.discId ? D.corDisc(o.discId) : "#8a9099"
            }
        }), discDoBaralho(o) ? D.nomeDisc(o.discId, false) : "Sem matéria", o.topicoId && D.topicoExiste(o.topicoId) ? " › " + D.rotuloTopico(o.topicoId).slice(0, 60) : "", h("span", {
            class: "chip right"
        }, TIPOS[tipo]));
        let corpo;
        if (tipo === "questao") {
            corpo = [ h("div", {
                class: "enun"
            }, o.enunciado || "(sem enunciado)"), o.alternativas && o.alternativas.length ? h("div", null, o.alternativas.map((a => h("div", {
                class: "alt" + (se.mostrar && a.l === o.gabarito ? " gab" : "") + (se.mostrar && o.resposta === a.l && o.resposta !== o.gabarito ? " mine" : "")
            }, h("b", null, a.l), h("div", null, a.t))))) : null, se.mostrar ? h("div", {
                class: "callout",
                "aria-live": "polite"
            }, h("b", null, "Gabarito: " + (o.gabarito || "—")), o.resposta ? " · você marcou " + o.resposta : "", o.comentario ? h("div", {
                class: "enun small",
                style: {
                    marginTop: "8px"
                }
            }, o.comentario) : null, o.nota ? h("div", {
                class: "small",
                style: {
                    marginTop: "8px"
                }
            }, "Nota: " + o.nota) : null) : null ];
        } else if (tipo === "lacuna") {
            corpo = [ h("div", {
                class: "enun"
            }, comLacunas(o.frente, se.mostrar)), imagem(o.imgF), se.mostrar && (o.verso || o.imgV) ? h("div", {
                class: "verso",
                "aria-live": "polite"
            }, o.verso ? h("div", {
                class: "enun small"
            }, o.verso) : null, imagem(o.imgV)) : null ];
        } else if (tipo === "ce") {
            const acertou = se.resp ? se.resp === o.ce : null;
            corpo = [ h("div", {
                class: "enun"
            }, o.frente), imagem(o.imgF), se.mostrar ? h("div", {
                class: "callout" + (acertou === false ? " warn" : ""),
                "aria-live": "polite"
            }, h("b", null, "Gabarito: " + (o.ce === "C" ? "Certo" : "Errado")), se.resp ? acertou ? " · você acertou" : " · você marcou " + (se.resp === "C" ? "Certo" : "Errado") : "", o.verso ? h("div", {
                class: "enun small",
                style: {
                    marginTop: "8px"
                }
            }, o.verso) : null, imagem(o.imgV)) : null ];
        } else {
            corpo = [ h("div", {
                class: "enun"
            }, o.frente), imagem(o.imgF), se.mostrar ? h("div", {
                class: "verso",
                "aria-live": "polite"
            }, o.verso ? h("div", {
                class: "enun"
            }, o.verso) : null, imagem(o.imgV)) : null ];
        }
        const iv = se.mostrar ? previa(it) : null;
        const errou = tipo === "ce" && se.resp && se.resp !== o.ce;
        const rodape = !se.mostrar ? tipo === "ce" ? h("div", {
            class: "flash-ce"
        }, h("button", {
            class: "btn",
            onclick: () => responderCe("C")
        }, "Certo ", h("kbd", null, "C")), h("button", {
            class: "btn",
            onclick: () => responderCe("E")
        }, "Errado ", h("kbd", null, "E")), h("button", {
            class: "btn ghost",
            onclick: () => se.acoes.mostrar()
        }, "Só ver o gabarito ", h("kbd", null, "Espaço"))) : h("button", {
            class: "btn primary",
            style: {
                alignSelf: "center"
            },
            onclick: () => se.acoes.mostrar()
        }, "Mostrar resposta ", h("kbd", null, "Espaço")) : h("div", {
            class: "flash-notas",
            role: "group",
            "aria-label": "Quanto você lembrou"
        }, NOTAS.map((([n, t], i) => h("button", {
            class: "btn" + (n === 1 ? " errei" : "") + (errou && n === 1 || !errou && n === 3 ? " primary" : ""),
            onclick: () => nota(n)
        }, h("span", null, t, " ", h("kbd", null, String(n))), h("small", null, iv[i])))));
        const trocou = se.visto !== se.i;
        se.visto = se.i;
        return h("div", {
            class: "col flash-sessao",
            style: {
                gap: "14px"
            }
        }, h("div", {
            class: "row small muted"
        }, h("button", {
            class: "btn sm",
            onclick: () => {
                ui.sessao = null;
                V.refresh();
            }
        }, "Sair"), ultimo ? h("button", {
            class: "btn sm ghost",
            title: "Desfazer a última nota (Z)",
            onclick: voltar
        }, icon("undo", "sm"), "Desfazer") : null, it.k === "c" ? h("button", {
            class: "btn sm ghost",
            title: "Editar este cartão",
            onclick: () => editor(o)
        }, icon("edit", "sm"), "Editar") : null, h("span", {
            class: "right"
        }, se.i + 1 + " / " + se.fila.length)), h("div", {
            class: "bar",
            role: "progressbar",
            "aria-label": "Progresso da sessão",
            "aria-valuemin": 0,
            "aria-valuemax": se.fila.length,
            "aria-valuenow": se.i
        }, h("i", {
            style: {
                width: se.i / se.fila.length * 100 + "%"
            }
        })), h("div", {
            class: "card flash" + (trocou ? " troca" : "")
        }, meta, corpo), rodape);
    }
    document.addEventListener("keydown", (e => {
        const se = ui.sessao;
        if (!se || !se.acoes || !document.querySelector(".flash-sessao") || e.ctrlKey || e.metaKey || e.altKey) return;
        const t = document.activeElement;
        if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
        if (document.querySelector(".overlay:not(.saindo)")) return;
        if (se.i >= se.fila.length) return;
        const it = se.fila[se.i], o = objDe(it);
        if (!o) return;
        const ce = it.k === "c" && o.tipo === "ce";
        const k = e.key.toLowerCase();
        if (k === "z") {
            e.preventDefault();
            se.acoes.voltar();
        } else if (!se.mostrar && ce && (k === "c" || k === "e")) {
            e.preventDefault();
            se.acoes.responderCe(k.toUpperCase());
        } else if (!se.mostrar && (e.key === " " || e.key === "Enter")) {
            e.preventDefault();
            se.acoes.mostrar();
        } else if (se.mostrar && /^[1-4]$/.test(e.key)) {
            e.preventDefault();
            se.acoes.nota(+e.key);
        }
    }));
    window.Flash = {
        aba: () => ui.sessao ? telaSessao() : telaInicio(),
        emSessao: () => !!ui.sessao,
        sair: () => {
            ui.sessao = null;
        },
        editor: editor,
        importar: importar,
        exportar: exportar,
        contagem: contagem,
        montarFila: montarFila,
        avaliar: avaliar,
        desfazer: desfazer,
        previa: previa,
        situacao: situacao,
        lerTabela: lerTabela,
        semHtml: semHtml,
        comLacunas: comLacunas,
        temLacuna: temLacuna,
        daQuestao(q) {
            const alts = (q.alternativas || []).map((a => a.l + ") " + a.t)).join("\n");
            editor({
                tipo: "basico",
                discId: q.discId || null,
                topicoId: q.topicoId || null,
                frente: (q.enunciado || "") + (alts ? "\n\n" + alts : ""),
                verso: (q.gabarito ? "Gabarito: " + q.gabarito : "") + (q.comentario ? (q.gabarito ? "\n\n" : "") + q.comentario : ""),
                origem: {
                    questaoId: q.id
                }
            });
        }
    };
})();