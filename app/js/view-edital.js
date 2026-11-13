(function() {
    "use strict";
    const {h: h, icon: icon, norm: norm, ymd: ymd, fmtMin: fmtMin} = U;
    const V = window.Views = window.Views || {};
    const ui = {
        discId: null,
        bloco: "todos",
        filtro: "todos",
        busca: "",
        abertos: new Set,
        destaque: null
    };
    const indices = () => D.memo("edital-idx", (() => {
        const q = new Map, min = new Map, rev = new Map;
        Store.s.questoes.forEach((x => {
            if (x.topicoId) q.set(x.topicoId, (q.get(x.topicoId) || 0) + 1);
        }));
        Store.s.sessoes.forEach((x => {
            if (x.topicoId) min.set(x.topicoId, (min.get(x.topicoId) || 0) + x.seg / 60);
        }));
        Store.s.revisoes.forEach((r => {
            if (!r.feita && !rev.has(r.refId)) rev.set(r.refId, r);
        }));
        return {
            q: q,
            min: min,
            rev: rev
        };
    }));
    const qtdQuestoes = id => indices().q.get(id) || 0;
    const minTopico = id => indices().min.get(id) || 0;
    V.edital = function(root, params) {
        const e = D.edital(), s = Store.s;
        if (params && params.t && e.topico[params.t]) {
            ui.discId = e.discDe[params.t];
            ui.destaque = params.t;
            ui.busca = "";
            ui.filtro = "todos";
            for (let n = e.pai[params.t]; n; n = e.pai[n]) ui.abertos.add(n);
        } else if (params && params.d && e.disc[params.d]) ui.discId = params.d;
        if (!ui.discId || !e.disc[ui.discId]) ui.discId = e.discs[0].id;
        const disc = e.disc[ui.discId];
        const blocos = [ "todos", ...Object.keys(e.ed.blocos || {}) ];
        const lista = e.discs.filter((d => ui.bloco === "todos" || d.bloco === ui.bloco));
        const geral = e.discs.filter((d => d.ciclo !== false)).reduce(((a, d) => {
            const p = D.progressoDe(d);
            return {
                t: a.t + p.total,
                c: a.c + p.concluido
            };
        }), {
            t: 0,
            c: 0
        });
        const left = h("div", {
            class: "card",
            style: {
                padding: "12px"
            }
        }, h("div", {
            class: "tabs",
            style: {
                marginBottom: "10px"
            }
        }, blocos.map((b => h("button", {
            class: "tab" + (ui.bloco === b ? " on" : ""),
            onclick: () => {
                ui.bloco = b;
                V.refresh();
            }
        }, b === "todos" ? "Todas" : "Bloco " + b)))), h("div", {
            class: "disc-list"
        }, lista.map((d => {
            const p = D.progressoDe(d);
            return h("button", {
                class: "disc-item" + (d.id === ui.discId ? " on" : ""),
                onclick: () => {
                    ui.discId = d.id;
                    ui.destaque = null;
                    V.refresh();
                }
            }, Charts.anel(p.pct / 100, {
                tam: 34,
                esp: 4,
                cor: D.corDisc(d.id),
                texto: ""
            }), h("div", {
                class: "grow"
            }, h("div", {
                class: "nm ellipsis"
            }, d.curto), h("div", {
                class: "tiny muted"
            }, `${p.concluido}/${p.total} · ${d.peso ? d.peso + " itens na prova" : "sem peso"}`)), p.pct === 100 ? icon("check", "sm") : h("span", {
                class: "small num muted"
            }, p.pct + "%"));
        }))));
        root.appendChild(h("div", {
            class: "page"
        }, h("div", {
            class: "page-head"
        }, h("div", null, h("span", {
            class: "eyebrow"
        }, e.ed.nome), h("h1", null, "Edital"), h("div", {
            class: "sub"
        }, (e.ed.base ? e.ed.base + " · " : "") + geral.c + " de " + geral.t + " assuntos concluídos (" + U.pct(geral.c, geral.t) + "%)")), h("div", {
            class: "right row"
        }, h("button", {
            class: "btn",
            onclick: () => App.nav("pastas")
        }, icon("folder", "sm"), "Organizar em pastas"))), h("div", {
            class: "grid g-side"
        }, left, painelDisc(disc, e))));
        if (ui.destaque) setTimeout((() => {
            const el = U.$('[data-nid="' + ui.destaque + '"]');
            if (el) {
                el.scrollIntoView({
                    block: "center",
                    behavior: U.reduzMov() ? "auto" : "smooth"
                });
                el.classList.add("hl");
            }
            ui.destaque = null;
        }), 60);
    };
    function painelDisc(disc, e) {
        const p = D.progressoDe(disc);
        const cor = D.corDisc(disc.id);
        const tags = new Set;
        (function marca(ns) {
            ns.forEach((n => {
                if (n.tag) tags.add(n.tag);
                marca(n.filhos || []);
            }));
        })(disc.topicos);
        const filtros = [ [ "todos", "Todos" ], [ "pend", "Pendentes" ], [ "novo", "Novos" ], [ "atualizado", "Atualizados" ], [ "rev", "Em revisão" ] ].filter((([k]) => k !== "novo" && k !== "atualizado" || tags.has(k)));
        if (!filtros.some((([k]) => k === ui.filtro))) ui.filtro = "todos";
        const busca = h("input", {
            type: "search",
            "aria-label": "Buscar assunto nesta matéria",
            placeholder: "Buscar nesta matéria…",
            value: ui.busca,
            style: {
                minWidth: "220px"
            }
        });
        busca.addEventListener("input", U.debounce((() => {
            ui.busca = busca.value;
            renderArvore();
        }), 160));
        const arv = h("div", {
            class: "tree"
        });
        function renderArvore() {
            U.clear(arv);
            const q = norm(ui.busca);
            const visivel = n => {
                const proprio = (!q || norm(n.texto).includes(q) || n.num === q) && (ui.filtro === "todos" || ui.filtro === "pend" && D.statusDe(n.id) < 2 || ui.filtro === "novo" && n.tag === "novo" || ui.filtro === "atualizado" && n.tag === "atualizado" || ui.filtro === "rev" && indices().rev.has(n.id));
                return proprio || n.filhos.some(visivel);
            };
            const nodes = disc.topicos.filter(visivel);
            if (!nodes.length) arv.appendChild(h("div", {
                class: "empty"
            }, "Nenhum assunto com esse filtro."));
            nodes.forEach((n => arv.appendChild(no(n, visivel, !!(q || ui.filtro !== "todos")))));
        }
        renderArvore();
        return h("div", {
            class: "col",
            style: {
                gap: "16px",
                minWidth: 0
            }
        }, h("div", {
            class: "card"
        }, h("div", {
            class: "row wrap"
        }, h("span", {
            class: "dot-c",
            style: {
                background: cor,
                width: "14px",
                height: "14px"
            }
        }), h("h2", {
            style: {
                fontSize: "19px"
            }
        }, disc.nome), h("span", {
            class: "chip"
        }, "Bloco " + disc.bloco + " · " + disc.blocoNome), disc.peso ? h("span", {
            class: "chip"
        }, "≈ " + disc.peso + " itens de " + (e.ed.totalItensProva || 120) + " na prova") : null, h("div", {
            class: "right row"
        }, h("button", {
            class: "btn sm",
            onclick: () => {
                if (D.Cron.preparar({
                    discId: disc.id,
                    fixa: true,
                    topicoId: null
                })) App.cronometro();
            }
        }, icon("clock", "sm"), "Estudar"), !!(disc.ciclo !== false) ? cicloBtn(disc) : null)), h("div", {
            style: {
                marginTop: "16px"
            }
        }, segBar(p)), h("div", {
            class: "status-leg"
        }, D.STATUS.map(((nm, i) => h("span", null, h("i", {
            style: {
                background: CORES_ST[i],
                boxShadow: i ? "none" : "inset 0 0 0 1px var(--line-strong)"
            }
        }), h("b", null, p.por[i]), nm)))), disc.nota ? h("div", {
            class: "callout",
            style: {
                marginTop: "14px"
            }
        }, h("b", null, "Observação: "), disc.nota) : null), h("div", {
            class: "card"
        }, h("div", {
            class: "row wrap",
            style: {
                marginBottom: "12px"
            }
        }, h("div", {
            class: "tabs"
        }, filtros.map((([k, t]) => h("button", {
            class: "tab" + (ui.filtro === k ? " on" : ""),
            onclick: () => {
                ui.filtro = k;
                V.refresh();
            }
        }, t)))), h("div", {
            class: "right row wrap"
        }, busca, h("button", {
            class: "btn sm",
            onclick: () => {
                const all = ns => ns.forEach((n => {
                    if (n.filhos.length) {
                        ui.abertos.add(n.id);
                        all(n.filhos);
                    }
                }));
                all(disc.topicos);
                V.refresh();
            }
        }, "Expandir"), h("button", {
            class: "btn sm",
            onclick: () => {
                ui.abertos.clear();
                V.refresh();
            }
        }, "Recolher"))), arv));
    }
    function cicloBtn(disc) {
        const it = Store.s.ciclo.itens.find((i => i.discId === disc.id));
        const on = !!(it && it.ativo);
        return h("button", {
            class: "btn sm " + (on ? "soft" : ""),
            title: on ? "Tirar do ciclo" : "Incluir no ciclo",
            onclick: () => {
                Store.mut((s => {
                    let i = s.ciclo.itens.find((x => x.discId === disc.id));
                    if (!i) {
                        i = {
                            discId: disc.id,
                            alvo: D.BLOCO,
                            peso: 1,
                            ativo: false
                        };
                        s.ciclo.itens.push(i);
                    }
                    i.ativo = !i.ativo;
                }));
            }
        }, icon("refresh", "sm"), on ? "No ciclo" : "Fora do ciclo");
    }
    const CORES_ST = [ "var(--surface-3)", "var(--st1)", "var(--st2)", "var(--st3)", "var(--st4)" ];
    function segBar(p) {
        return h("div", {
            class: "bar seg",
            style: {
                height: "10px"
            }
        }, p.por.map(((n, i) => n ? h("i", {
            style: {
                width: n / (p.total || 1) * 100 + "%",
                background: CORES_ST[i]
            },
            title: D.STATUS[i] + ": " + n
        }) : null)));
    }
    function no(n, visivel, forcar) {
        const tem = n.filhos.length > 0;
        const aberto = ui.abertos.has(n.id) || forcar;
        const p = D.progressoDe({
            id: n.id
        });
        const st = D.statusDe(n.id);
        const nota = (Store.s.progresso[n.id] || {}).nota;
        const nq = qtdQuestoes(n.id), tmin = minTopico(n.id);
        const rev = indices().rev.get(n.id);
        const kids = tem ? h("div", {
            class: "children-wrap" + (aberto ? " open" : "")
        }, h("div", {
            class: "children"
        }, n.filhos.filter(visivel).map((c => no(c, visivel, forcar))))) : null;
        const linha = h("div", {
            class: "node",
            dataset: {
                nid: n.id
            }
        }, tem ? h("button", {
            class: "caret" + (aberto ? " open" : ""),
            "aria-expanded": aberto ? "true" : "false",
            "aria-label": (aberto ? "Recolher " : "Expandir ") + n.num,
            onclick: ev => {
                if (forcar) return;
                const abre = !ui.abertos.has(n.id);
                abre ? ui.abertos.add(n.id) : ui.abertos.delete(n.id);
                ev.currentTarget.classList.toggle("open", abre);
                ev.currentTarget.setAttribute("aria-expanded", String(abre));
                kids.classList.toggle("open", abre);
            }
        }, icon("right", "sm")) : h("span", {
            style: {
                width: "20px",
                flex: "none"
            }
        }), h("div", {
            class: "nnum"
        }, n.num), h("div", {
            class: "txt"
        }, n.texto, " ", n.tag ? h("span", {
            class: "badge " + n.tag
        }, n.tag === "novo" ? "Novo" : "Atualizado") : null, tem ? h("span", {
            class: "tiny muted",
            style: {
                marginLeft: "6px"
            }
        }, p.concluido + "/" + p.total) : null, h("div", {
            class: "row tiny muted",
            style: {
                gap: "10px",
                marginTop: "2px"
            }
        }, rev ? h("span", {
            class: "row",
            style: {
                gap: "4px"
            },
            title: "Próxima revisão"
        }, icon("refresh", "sm"), U.fmtData(rev.due)) : null, tmin ? h("span", {
            class: "row",
            style: {
                gap: "4px"
            },
            title: "Tempo estudado"
        }, icon("clock", "sm"), fmtMin(tmin)) : null, nota ? h("span", {
            class: "note-ico row",
            style: {
                gap: "4px"
            },
            title: nota
        }, icon("note", "sm"), "nota") : null)), h("div", {
            class: "acts"
        }, nq ? h("span", {
            class: "q-count",
            title: "Questões ligadas"
        }, nq + " q") : null, h("button", {
            class: "btn ghost sm",
            title: "Anotação, revisão, cronômetro…",
            onclick: () => detalhe(n)
        }, icon("edit", "sm")), tem ? statusMulti(n, p) : statusBtn(n, st)));
        if (!tem) return linha;
        return h("div", null, linha, kids);
    }
    const medidor = () => h("span", {
        class: "mtr",
        "aria-hidden": "true"
    }, h("i"), h("i"), h("i"), h("i"));
    function statusBtn(n, st) {
        return h("button", {
            class: "st",
            dataset: {
                s: st
            },
            title: "Clique para avançar o status (Shift + clique volta)",
            "aria-label": n.num + ": " + D.STATUS[st] + ". Clique para avançar o status",
            onclick: ev => {
                const novo = ev.shiftKey ? (st + 4) % 5 : (st + 1) % 5;
                D.setStatus(n.id, novo);
                if (novo === 0) U.toast("Status: " + D.STATUS[novo], "", {
                    acao: "Desfazer",
                    fn: () => D.setStatus(n.id, st, {
                        semRevisao: true
                    })
                }); else if (novo === 2) U.toast("Revisões agendadas: " + Store.s.config.revisaoDias.join(", ") + " dias");
            }
        }, medidor(), D.STATUS[st]);
    }
    function statusMulti(n, p) {
        const sel = h("select", {
            class: "st",
            "aria-label": "Definir todos os subitens",
            onchange: ev => {
                if (ev.target.value !== "") D.setStatus(n.id, +ev.target.value);
            }
        }, h("option", {
            value: ""
        }, "Todos…"), D.STATUS.map(((nm, i) => h("option", {
            value: i
        }, nm))));
        sel.style.minWidth = "108px";
        return sel;
    }
    function detalhe(n) {
        const prog = Store.s.progresso[n.id] || {
            s: 0,
            nota: ""
        };
        const ta = h("textarea", {
            placeholder: "Resumo, mnemônicos, pegadinhas da banca, onde parei…"
        }, prog.nota || "");
        const caminho = D.caminhoTopico(n.id);
        const rev = Store.s.revisoes.filter((r => r.refId === n.id)).sort(((a, b) => a.due.localeCompare(b.due)));
        const st = h("select", null, D.STATUS.map(((nm, i) => h("option", {
            value: i,
            selected: i === D.statusDe(n.id)
        }, nm))));
        const dt = h("input", {
            type: "date",
            value: U.addDays(ymd(), 1)
        });
        const qs = Store.s.questoes.filter((q => q.topicoId === n.id));
        const M = U.modal({
            titulo: n.num + " " + n.texto.slice(0, 80),
            largo: true,
            corpo: h("div", {
                class: "col"
            }, h("div", {
                class: "small muted"
            }, caminho.map((c => c.num)).join(" › ") + " · " + D.nomeDisc(D.edital().discDe[n.id], false)), h("div", null, n.texto, n.tag ? h("span", {
                class: "badge " + n.tag,
                style: {
                    marginLeft: "8px"
                }
            }, n.tag) : null), h("div", {
                class: "row wrap"
            }, h("label", {
                class: "f"
            }, "Status", st), h("button", {
                class: "btn",
                onclick: () => {
                    if (!D.Cron.preparar({
                        discId: D.edital().discDe[n.id],
                        topicoId: n.id,
                        fixa: true
                    })) return;
                    M.close();
                    App.cronometro();
                }
            }, icon("clock", "sm"), "Estudar este assunto")), h("label", {
                class: "f"
            }, "Anotações", ta), h("div", null, h("b", null, "Revisões"), rev.length ? h("div", {
                class: "col",
                style: {
                    gap: "4px",
                    marginTop: "6px"
                }
            }, rev.map((r => h("div", {
                class: "small"
            }, (r.feita ? "Feita em " + U.fmtData(r.feita) : "Agendada para " + U.fmtData(r.due)) + " (passo " + (r.passo + 1) + ")")))) : h("div", {
                class: "hint"
            }, 'Nenhuma revisão agendada. Elas surgem sozinhas quando o assunto chega a "Teoria concluída".')), h("div", {
                class: "row"
            }, h("label", {
                class: "f"
            }, "Agendar revisão extra", dt), h("button", {
                class: "btn",
                style: {
                    alignSelf: "flex-end"
                },
                onclick: () => {
                    if (!dt.value) return U.toast("Escolha uma data.", "err");
                    Store.mut((s => s.revisoes.push({
                        id: U.uid(),
                        tipo: "topico",
                        refId: n.id,
                        discId: D.edital().discDe[n.id],
                        due: dt.value,
                        passo: 0,
                        base: dt.value
                    })));
                    U.toast("Revisão agendada para " + U.fmtData(dt.value), "ok");
                }
            }, icon("plus", "sm"), "Agendar")), qs.length ? h("div", null, h("b", null, U.plural(qs.length, "questão ligada", "questões ligadas")), h("div", {
                class: "row wrap",
                style: {
                    marginTop: "6px"
                }
            }, h("span", {
                class: "chip"
            }, qs.filter((q => q.resultado === "acerto")).length + " acertos"), h("span", {
                class: "chip"
            }, qs.filter((q => q.resultado === "erro")).length + " erros"))) : null),
            botoes: [ {
                texto: "Fechar"
            }, {
                texto: "Salvar",
                tipo: "primary",
                fn: () => {
                    D.setNota(n.id, ta.value);
                    if (+st.value !== D.statusDe(n.id)) D.setStatus(n.id, +st.value); else Store.salvarLogo();
                    V.refresh();
                }
            } ]
        });
    }
})();