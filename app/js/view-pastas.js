(function() {
    "use strict";
    const {h: h, icon: icon, norm: norm} = U;
    const V = window.Views = window.Views || {};
    const ui = {
        sel: null,
        abertas: new Set,
        recursivo: true,
        drag: null,
        dragQ: null,
        selQ: new Set,
        busca: "",
        res: "",
        disc: "",
        mais: 60
    };
    const contagens = () => D.memo("pastas-cont", (() => {
        const dir = new Map;
        Store.s.questoes.forEach((q => {
            if (!q.pastaId) return;
            const c = dir.get(q.pastaId) || {
                total: 0,
                erros: 0
            };
            c.total++;
            if (q.resultado === "erro") c.erros++;
            dir.set(q.pastaId, c);
        }));
        const memo = new Map;
        const soma = (id, vis) => {
            if (memo.has(id)) return memo.get(id);
            const r = Object.assign({}, dir.get(id) || {
                total: 0,
                erros: 0
            });
            if (!vis.has(id)) {
                vis.add(id);
                D.filhasDe(id).forEach((f => {
                    const c = soma(f.id, vis);
                    r.total += c.total;
                    r.erros += c.erros;
                }));
            }
            memo.set(id, r);
            return r;
        };
        return id => soma(id, new Set);
    }));
    V.pastas = function(root) {
        const s = Store.s;
        const cont = contagens();
        const sel = ui.sel && D.pastaPorId(ui.sel) ? D.pastaPorId(ui.sel) : null;
        if (!sel) ui.sel = null;
        const arvore = h("div", {
            class: "ptree"
        });
        const rootRow = h("div", {
            class: "pf" + (!ui.sel ? " on" : ""),
            onclick: () => {
                ui.sel = null;
                V.refresh();
            }
        }, icon("layers", "sm"), "Todas as pastas", h("span", {
            class: "cnt"
        }, s.questoes.length));
        arvore.appendChild(rootRow);
        const desenha = (paiId, nivel) => D.filhasDe(paiId).forEach((p => {
            const filhos = D.filhasDe(p.id), aberta = ui.abertas.has(p.id) || ui.sel && D.caminhoPasta(ui.sel).some((x => x.id === p.id));
            const c = cont(p.id);
            const row = h("div", {
                class: "pf" + (ui.sel === p.id ? " on" : ""),
                draggable: "true",
                tabindex: 0,
                role: "button",
                "aria-label": "Pasta " + p.nome + (c.total ? ", " + c.total + " questões" : ""),
                style: {
                    paddingLeft: 8 + nivel * 16 + "px"
                },
                onclick: () => {
                    ui.sel = p.id;
                    V.refresh();
                },
                onkeydown: ev => {
                    if (ev.target === row && (ev.key === "Enter" || ev.key === " ")) {
                        ev.preventDefault();
                        ui.sel = p.id;
                        V.refresh();
                    }
                }
            }, filhos.length ? h("button", {
                class: "caret" + (aberta ? " open" : ""),
                "aria-expanded": aberta ? "true" : "false",
                "aria-label": (aberta ? "Recolher " : "Expandir ") + p.nome,
                onclick: ev => {
                    ev.stopPropagation();
                    aberta ? ui.abertas.delete(p.id) : ui.abertas.add(p.id);
                    V.refresh();
                }
            }, icon("right", "sm")) : h("span", {
                style: {
                    width: "15px"
                }
            }), h("span", {
                style: {
                    color: p.discId ? D.corDisc(p.discId) : "var(--muted)",
                    display: "grid"
                }
            }, icon("folder", "sm")), h("span", {
                class: "ellipsis"
            }, p.nome), c.total ? h("span", {
                class: "cnt"
            }, c.total) : null);
            row.addEventListener("dragstart", (ev => {
                ui.drag = p.id;
                row.classList.add("arrastando");
                ev.dataTransfer.effectAllowed = "move";
                ev.dataTransfer.setData("text/plain", p.id);
            }));
            row.addEventListener("dragend", (() => {
                ui.drag = null;
                row.classList.remove("arrastando");
                document.querySelectorAll(".pf.drop").forEach((x => x.classList.remove("drop")));
            }));
            row.addEventListener("dragover", (ev => {
                if (ui.drag && ui.drag !== p.id || ui.dragQ) {
                    ev.preventDefault();
                    row.classList.add("drop");
                }
            }));
            row.addEventListener("dragleave", (() => row.classList.remove("drop")));
            row.addEventListener("drop", (ev => {
                ev.preventDefault();
                row.classList.remove("drop");
                if (ui.dragQ) {
                    const ids = ui.dragQ;
                    ui.dragQ = null;
                    moverQuestoes(ids, p.id);
                    return;
                }
                const id = ui.drag;
                ui.drag = null;
                mover(id, p.id);
            }));
            arvore.appendChild(row);
            if (aberta) desenha(p.id, nivel + 1);
        }));
        desenha(null, 0);
        rootRow.title = "Solte uma pasta aqui para levá-la à raiz, ou uma questão para tirá-la da pasta";
        rootRow.addEventListener("dragover", (ev => {
            if (ui.drag || ui.dragQ) {
                ev.preventDefault();
                rootRow.classList.add("drop");
            }
        }));
        rootRow.addEventListener("dragleave", (() => rootRow.classList.remove("drop")));
        rootRow.addEventListener("drop", (ev => {
            ev.preventDefault();
            rootRow.classList.remove("drop");
            if (ui.dragQ) {
                const ids = ui.dragQ;
                ui.dragQ = null;
                moverQuestoes(ids, null);
                return;
            }
            const id = ui.drag;
            ui.drag = null;
            mover(id, null);
        }));
        const filhas = D.filhasDe(ui.sel);
        const ids = ui.sel ? new Set(ui.recursivo ? D.descendentesPasta(ui.sel) : [ ui.sel ]) : null;
        const qs = ui.sel ? s.questoes.filter((q => q.pastaId && ids.has(q.pastaId))) : s.questoes.filter((q => !q.pastaId));
        const cam = ui.sel ? D.caminhoPasta(ui.sel) : [];
        const e = D.edital();
        ui.selQ = new Set([ ...ui.selQ ].filter((id => s.questoes.some((q => q.id === id)))));
        const filtradas = () => {
            const nq = norm(ui.busca);
            return qs.filter((q => (!ui.res || q.resultado === ui.res) && (!ui.disc || (ui.disc === "-" ? !q.discId : q.discId === ui.disc)) && (!nq || norm((q.enunciado || "") + " " + (q.assuntoOrig || "") + " " + (q.banca || "") + " " + (q.nota || "")).includes(nq))));
        };
        const filtrando = () => !!(ui.busca || ui.res || ui.disc);
        const listaEl = h("div", {
            class: "col",
            style: {
                gap: "8px"
            }
        }), barraSel = h("div", {
            class: "barra-sel"
        }), contEl = h("span", {
            class: "right muted small"
        });
        const linhaQ = q => {
            const on = ui.selQ.has(q.id);
            const w = h("div", {
                class: "qsel" + (on ? " on" : ""),
                draggable: "true",
                title: "Arraste para uma pasta"
            }, h("label", {
                class: "qsel-ck",
                onclick: ev => ev.stopPropagation()
            }, h("input", {
                type: "checkbox",
                checked: on,
                "aria-label": "Selecionar esta questão",
                onchange: ev => {
                    ev.target.checked ? ui.selQ.add(q.id) : ui.selQ.delete(q.id);
                    w.classList.toggle("on", ev.target.checked);
                    desenhaBarra();
                }
            })), V.qLinha(q));
            w.addEventListener("dragstart", (ev => {
                ui.dragQ = ui.selQ.has(q.id) ? [ ...ui.selQ ] : [ q.id ];
                ev.dataTransfer.effectAllowed = "move";
                ev.dataTransfer.setData("text/plain", "questoes:" + ui.dragQ.length);
                w.classList.add("arrastando");
            }));
            w.addEventListener("dragend", (() => {
                ui.dragQ = null;
                w.classList.remove("arrastando");
                document.querySelectorAll(".pf.drop, .folder-card.drop").forEach((x => x.classList.remove("drop")));
            }));
            return w;
        };
        function desenhaBarra() {
            U.clear(barraSel);
            const L = filtradas(), n = ui.selQ.size;
            if (n) {
                barraSel.appendChild(h("b", null, U.plural(n, "questão selecionada", "questões selecionadas")));
                barraSel.appendChild(h("button", {
                    class: "btn sm primary",
                    onclick: () => moverParaDialogo([ ...ui.selQ ])
                }, icon("folder", "sm"), "Mover para uma pasta…"));
                barraSel.appendChild(h("button", {
                    class: "btn sm ghost",
                    onclick: () => {
                        ui.selQ.clear();
                        desenhaLista();
                    }
                }, "Limpar seleção"));
            } else if (L.length) {
                barraSel.appendChild(h("button", {
                    class: "btn sm",
                    title: "Marca todas as questões que estão aparecendo, para mover de uma vez",
                    onclick: () => {
                        L.forEach((q => ui.selQ.add(q.id)));
                        desenhaLista();
                    }
                }, icon("checkSq", "sm"), filtrando() ? "Selecionar as " + L.length + " filtradas" : "Selecionar as " + L.length));
                barraSel.appendChild(h("span", {
                    class: "tiny muted"
                }, "Ou arraste uma questão direto para uma pasta, na lista da esquerda."));
            }
        }
        function desenhaLista() {
            const L = filtradas();
            contEl.textContent = filtrando() ? L.length + " de " + qs.length : String(qs.length);
            U.clear(listaEl);
            L.slice(0, ui.mais).forEach((q => listaEl.appendChild(linhaQ(q))));
            if (L.length > ui.mais) listaEl.appendChild(h("button", {
                class: "btn",
                onclick: () => {
                    ui.mais += 60;
                    desenhaLista();
                }
            }, "Mostrar mais (faltam " + (L.length - ui.mais) + ")"));
            if (!L.length && !Store.s.questoes.length) listaEl.appendChild(h("div", {
                class: "empty"
            }, icon("folder", "lg"), h("div", null, 'Você ainda não tem questões registradas. Registre em "Questões e erros" e organize aqui.'), h("button", {
                class: "btn sm",
                style: {
                    marginTop: "10px"
                },
                onclick: () => App.nav("questoes")
            }, "Ir para Questões e erros"))); else if (!L.length) listaEl.appendChild(h("div", {
                class: "empty"
            }, icon("folder", "lg"), h("div", null, qs.length ? "Nenhuma questão combina com o filtro." : ui.sel ? 'Nenhuma questão nesta pasta ainda. Arraste questões da pasta "Todas as pastas" (sem pasta) para cá, ou use "Mover para uma pasta".' : "Todas as suas questões já estão em pastas.")));
            desenhaBarra();
        }
        const fBusca = h("input", {
            type: "search",
            placeholder: "Buscar no enunciado, assunto ou banca",
            value: ui.busca,
            "aria-label": "Buscar nas questões",
            style: {
                flex: "1 1 220px",
                minWidth: "160px"
            },
            oninput: ev => {
                ui.busca = ev.target.value;
                ui.mais = 60;
                desenhaLista();
            }
        });
        const fRes = h("select", {
            "aria-label": "Resultado",
            onchange: ev => {
                ui.res = ev.target.value;
                ui.mais = 60;
                desenhaLista();
            }
        }, [ [ "", "Todos os resultados" ], [ "erro", "Só erros" ], [ "acerto", "Só acertos" ], [ "pendente", "Pendentes" ] ].map((([v, t]) => h("option", {
            value: v,
            selected: v === ui.res
        }, t))));
        const fDisc = h("select", {
            "aria-label": "Matéria",
            onchange: ev => {
                ui.disc = ev.target.value;
                ui.mais = 60;
                desenhaLista();
            }
        }, h("option", {
            value: ""
        }, "Todas as matérias"), h("option", {
            value: "-",
            selected: ui.disc === "-"
        }, "Sem matéria"), e.discs.map((d => h("option", {
            value: d.id,
            selected: d.id === ui.disc
        }, d.curto || d.nome))));
        const limpaFiltro = h("button", {
            class: "btn sm ghost",
            onclick: () => {
                ui.busca = "";
                ui.res = "";
                ui.disc = "";
                fBusca.value = "";
                fRes.value = "";
                fDisc.value = "";
                desenhaLista();
            }
        }, "Limpar filtros");
        desenhaLista();
        root.appendChild(h("div", {
            class: "page"
        }, h("div", {
            class: "page-head"
        }, h("div", null, h("h1", null, "Pastas"), h("div", {
            class: "sub"
        }, 'Crie pastas à mão, arraste questões para elas (ou marque várias e use "Mover") e filtre por resultado ou matéria. Arraste uma pasta sobre outra para movê-la.')), h("div", {
            class: "right row wrap"
        }, h("button", {
            class: "btn",
            onclick: () => gerarDoEdital()
        }, icon("book", "sm"), "Gerar a partir do edital"), Encaixe.todos("pastas.botoes", s), h("button", {
            class: "btn",
            onclick: () => colarLista(ui.sel)
        }, icon("list", "sm"), "Colar lista"), h("button", {
            class: "btn primary",
            onclick: () => nova(ui.sel)
        }, icon("folderPlus", "sm"), "Nova pasta"))), h("div", {
            class: "grid g-side"
        }, h("div", {
            class: "card",
            style: {
                padding: "10px"
            }
        }, arvore), h("div", {
            class: "col",
            style: {
                gap: "16px",
                minWidth: 0
            }
        }, h("div", {
            class: "card"
        }, h("div", {
            class: "row wrap"
        }, h("div", {
            class: "row wrap small",
            style: {
                fontWeight: 700
            }
        }, h("a", {
            href: "#/pastas",
            onclick: ev => {
                ev.preventDefault();
                ui.sel = null;
                V.refresh();
            }
        }, "Pastas"), cam.map((p => [ h("span", {
            class: "muted"
        }, "›"), h("a", {
            href: "#/pastas",
            onclick: ev => {
                ev.preventDefault();
                ui.sel = p.id;
                V.refresh();
            }
        }, p.nome) ]))), sel ? h("div", {
            class: "right row wrap"
        }, h("button", {
            class: "btn sm",
            onclick: () => renomear(sel)
        }, icon("edit", "sm"), "Renomear"), h("button", {
            class: "btn sm",
            onclick: () => moverDialogo(sel)
        }, icon("right", "sm"), "Mover"), h("button", {
            class: "btn sm",
            onclick: () => vincular(sel)
        }, icon("link", "sm"), "Vincular"), h("button", {
            class: "btn sm danger",
            onclick: () => excluir(sel)
        }, icon("trash", "sm"), "Excluir")) : null), sel && (sel.discId || Encaixe.todos("pastas.chips", sel).length) ? h("div", {
            class: "row wrap small muted",
            style: {
                marginTop: "8px"
            }
        }, sel.discId ? h("span", {
            class: "chip"
        }, h("span", {
            class: "dot-c",
            style: {
                background: D.corDisc(sel.discId)
            }
        }), D.nomeDisc(sel.discId, false)) : null, sel.topicoId ? h("span", {
            class: "chip"
        }, D.rotuloTopico(sel.topicoId).slice(0, 60)) : null, Encaixe.todos("pastas.chips", sel)) : null), filhas.length ? h("div", {
            class: "card"
        }, h("h3", null, "Subpastas", h("span", {
            class: "right muted small"
        }, filhas.length)), h("div", {
            class: "grid",
            style: {
                gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))",
                gap: "10px"
            }
        }, filhas.map((p => {
            const c = cont(p.id);
            const fc = h("div", {
                class: "folder-card",
                tabindex: 0,
                role: "button",
                onkeydown: ev => {
                    if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        ui.sel = p.id;
                        ui.abertas.add(p.id);
                        V.refresh();
                    }
                },
                onclick: () => {
                    ui.sel = p.id;
                    ui.abertas.add(p.id);
                    V.refresh();
                }
            }, h("span", {
                style: {
                    color: p.discId ? D.corDisc(p.discId) : "var(--muted)"
                }
            }, icon("folder", "lg")), h("div", {
                class: "grow"
            }, h("div", {
                class: "ellipsis",
                style: {
                    fontWeight: 700
                }
            }, p.nome), h("div", {
                class: "tiny muted"
            }, U.plural(c.total, "questão", "questões") + " · " + U.plural(c.erros, "erro", "erros") + " · " + U.plural(D.filhasDe(p.id).length, "subpasta", "subpastas") + Encaixe.todos("pastas.resumo", p).join(""))));
            fc.addEventListener("dragover", (ev => {
                if (ui.dragQ) {
                    ev.preventDefault();
                    fc.classList.add("drop");
                }
            }));
            fc.addEventListener("dragleave", (() => fc.classList.remove("drop")));
            fc.addEventListener("drop", (ev => {
                ev.preventDefault();
                fc.classList.remove("drop");
                if (ui.dragQ) {
                    const ids = ui.dragQ;
                    ui.dragQ = null;
                    moverQuestoes(ids, p.id);
                }
            }));
            return fc;
        })))) : null, h("div", {
            class: "card"
        }, h("h3", null, ui.sel ? "Questões nesta pasta" : "Questões sem pasta", contEl), h("div", {
            class: "row wrap",
            style: {
                marginBottom: "10px"
            }
        }, fBusca, fRes, fDisc, limpaFiltro), ui.sel ? h("label", {
            class: "row small muted",
            style: {
                marginBottom: "10px"
            }
        }, h("span", {
            class: "switch"
        }, h("input", {
            type: "checkbox",
            checked: ui.recursivo,
            onchange: ev => {
                ui.recursivo = ev.target.checked;
                V.refresh();
            }
        }), h("span")), "Incluir subpastas") : null, barraSel, listaEl)))));
    };
    function nova(paiId) {
        const e = D.edital();
        const nome = h("input", {
            type: "text",
            placeholder: "Ex.: Crimes contra a pessoa",
            style: {
                width: "100%"
            },
            "aria-label": "Nome da pasta"
        });
        const pai = h("select", {
            style: {
                width: "100%"
            }
        }, opcoesPastas());
        pai.value = paiId || "";
        const disc = h("select", {
            style: {
                width: "100%"
            }
        }, h("option", {
            value: ""
        }, "(nenhuma)"), e.discs.map((d => h("option", {
            value: d.id
        }, d.nome))));
        const herda = () => {
            const pp = D.pastaPorId(pai.value);
            disc.value = pp && pp.discId || "";
        };
        pai.addEventListener("change", herda);
        herda();
        const m = U.modal({
            titulo: "Nova pasta",
            corpo: h("div", {
                class: "col"
            }, h("label", {
                class: "f"
            }, "Nome", nome), h("label", {
                class: "f"
            }, "Dentro de", pai), h("label", {
                class: "f"
            }, "Matéria do edital (opcional)", disc), h("div", {
                class: "hint"
            }, 'Com a matéria escolhida, as questões da pasta contam para ela. Dá para mudar depois em "Vincular".')),
            botoes: [ {
                texto: "Cancelar"
            }, {
                texto: "Criar pasta",
                tipo: "primary",
                fn: () => {
                    const n = nome.value.trim();
                    if (!n) {
                        U.toast("Dê um nome à pasta.", "err");
                        return false;
                    }
                    const p = D.novaPasta(n, pai.value || null, disc.value ? {
                        discId: disc.value
                    } : null);
                    ui.sel = p.id;
                    if (pai.value) ui.abertas.add(pai.value);
                    V.refresh();
                }
            } ]
        });
        setTimeout((() => nome.focus()), 60);
    }
    function moverQuestoes(ids, pastaId) {
        const set = new Set(ids), antes = new Map;
        if (!set.size) return;
        Store.mut((st => {
            st.questoes.forEach((q => {
                if (set.has(q.id)) {
                    antes.set(q.id, q.pastaId || null);
                    q.pastaId = pastaId || null;
                }
            }));
        }));
        ui.selQ.clear();
        const alvo = pastaId ? D.pastaPorId(pastaId) : null;
        U.toast(U.plural(antes.size, "questão movida", "questões movidas") + (alvo ? ' para "' + alvo.nome + '".' : " para fora das pastas."), "ok", {
            acao: "Desfazer",
            fn: () => Store.mut((st => {
                st.questoes.forEach((q => {
                    if (antes.has(q.id)) q.pastaId = antes.get(q.id);
                }));
            }))
        });
    }
    function moverParaDialogo(ids) {
        const opts = opcoesPastas();
        opts[0] = h("option", {
            value: ""
        }, "(tirar de qualquer pasta)");
        const sel = h("select", {
            style: {
                width: "100%"
            }
        }, opts);
        sel.value = ui.sel || "";
        const novoNome = h("input", {
            type: "text",
            placeholder: "Ou escreva o nome de uma pasta nova, criada dentro da escolhida",
            style: {
                width: "100%"
            }
        });
        U.modal({
            titulo: "Mover " + U.plural(ids.length, "questão", "questões"),
            corpo: h("div", {
                class: "col"
            }, h("label", {
                class: "f"
            }, "Para a pasta", sel), h("label", {
                class: "f"
            }, "Pasta nova (opcional)", novoNome)),
            botoes: [ {
                texto: "Cancelar"
            }, {
                texto: "Mover",
                tipo: "primary",
                fn: () => {
                    let alvo = sel.value || null;
                    const n = novoNome.value.trim();
                    if (n) {
                        const p = D.novaPasta(n, alvo, alvo && D.pastaPorId(alvo) && D.pastaPorId(alvo).discId ? {
                            discId: D.pastaPorId(alvo).discId
                        } : null);
                        alvo = p.id;
                        if (p.paiId) ui.abertas.add(p.paiId);
                    }
                    moverQuestoes(ids, alvo);
                    if (n) ui.sel = alvo;
                }
            } ]
        });
    }
    function colarLista(paiId) {
        const pai = paiId ? D.pastaPorId(paiId) : null;
        const ta = h("textarea", {
            "aria-label": "Lista de pastas",
            placeholder: "Crimes contra a pessoa\n  Homicídio\n  Lesão corporal\nCrimes contra o patrimônio",
            style: {
                minHeight: "200px"
            }
        });
        U.modal({
            titulo: "Criar várias pastas de uma vez",
            corpo: h("div", {
                class: "col"
            }, h("p", {
                class: "hint",
                style: {
                    margin: 0
                }
            }, "Uma pasta por linha; 2 espaços no começo da linha indicam subpasta. " + (pai ? 'Tudo será criado dentro de "' + pai.nome + '".' : "Tudo será criado na raiz (selecione uma pasta antes para criar dentro dela).")), ta),
            botoes: [ {
                texto: "Cancelar"
            }, {
                texto: "Criar pastas",
                tipo: "primary",
                fn: () => {
                    if (!ta.value.trim()) {
                        U.toast("Cole ou escreva ao menos uma linha.", "err");
                        return false;
                    }
                    criarDeTexto(ta.value, paiId);
                }
            } ]
        });
    }
    async function renomear(p) {
        const n = await U.perguntar("Renomear pasta", "Novo nome", p.nome);
        if (n && n.trim()) Store.mut((s => {
            const x = s.pastas.find((y => y.id === p.id));
            if (x) x.nome = n.trim();
        }));
    }
    async function excluir(p) {
        const desc = D.descendentesPasta(p.id);
        if (!await U.confirmar(`Excluir "${p.nome}"${desc.length > 1 ? " e " + (desc.length - 1) + " subpasta(s)" : ""}? As questões não serão apagadas, só ficarão sem pasta.`, "Excluir")) return;
        const setDesc = new Set(desc);
        const pastasAntes = Store.s.pastas.filter((x => setDesc.has(x.id))).map((x => Object.assign({}, x)));
        const qsAntes = Store.s.questoes.filter((q => setDesc.has(q.pastaId))).map((q => [ q.id, q.pastaId ]));
        Store.mut((s => {
            s.pastas = s.pastas.filter((x => !setDesc.has(x.id)));
            s.questoes.forEach((q => {
                if (setDesc.has(q.pastaId)) q.pastaId = null;
            }));
        }));
        ui.sel = p.paiId || null;
        U.toast('Pasta "' + p.nome + '" excluída.', "", {
            acao: "Desfazer",
            fn: () => Store.mut((s => {
                pastasAntes.forEach((x => s.pastas.push(x)));
                const m = new Map(qsAntes);
                s.questoes.forEach((q => {
                    if (m.has(q.id)) q.pastaId = m.get(q.id);
                }));
            }))
        });
    }
    function mover(id, paiId) {
        if (!id || id === paiId) return;
        if (paiId && D.descendentesPasta(id).includes(paiId)) return U.toast("Não dá para mover uma pasta para dentro dela mesma.", "err");
        Store.mut((s => {
            const p = s.pastas.find((x => x.id === id));
            if (p) {
                p.paiId = paiId;
                p.ordem = s.pastas.filter((x => (x.paiId || null) === (paiId || null))).length;
            }
        }));
        if (paiId) ui.abertas.add(paiId);
    }
    function opcoesPastas(excluirIds) {
        const r = [ h("option", {
            value: ""
        }, "(raiz)") ];
        const walk = (pai, n) => D.filhasDe(pai).forEach((p => {
            if (!(excluirIds || []).includes(p.id)) {
                r.push(h("option", {
                    value: p.id
                }, "  ".repeat(n) + (n ? "↳ " : "") + p.nome));
                walk(p.id, n + 1);
            }
        }));
        walk(null, 0);
        return r;
    }
    V.opcoesPastas = opcoesPastas;
    function moverDialogo(p) {
        const sel = h("select", {
            style: {
                width: "100%"
            }
        }, opcoesPastas(D.descendentesPasta(p.id)));
        sel.value = p.paiId || "";
        U.modal({
            titulo: 'Mover "' + p.nome + '"',
            corpo: h("label", {
                class: "f"
            }, "Para dentro de", sel),
            botoes: [ {
                texto: "Cancelar"
            }, {
                texto: "Mover",
                tipo: "primary",
                fn: () => mover(p.id, sel.value || null)
            } ]
        });
    }
    function vincular(p) {
        const e = D.edital();
        const dsel = h("select", {
            "aria-label": "Matéria"
        }, h("option", {
            value: ""
        }, "(nenhuma)"), e.discs.map((d => h("option", {
            value: d.id,
            selected: d.id === p.discId
        }, d.nome))));
        const tsel = h("select", {
            "aria-label": "Assunto",
            style: {
                width: "100%"
            }
        });
        const preenche = () => {
            U.clear(tsel);
            tsel.appendChild(h("option", {
                value: ""
            }, "(toda a matéria)"));
            const d = e.disc[dsel.value];
            if (!d) return;
            const walk = (ns, n) => ns.forEach((t => {
                tsel.appendChild(h("option", {
                    value: t.id,
                    selected: t.id === p.topicoId
                }, "  ".repeat(n) + (n ? "↳ " : "") + t.num + " " + t.texto.slice(0, 90)));
                walk(t.filhos, n + 1);
            }));
            walk(d.topicos, 0);
        };
        dsel.addEventListener("change", preenche);
        preenche();
        const extras = Encaixe.todos("pastas.vincular", p);
        U.modal({
            titulo: "Vincular pasta ao edital",
            corpo: h("div", {
                class: "col"
            }, h("p", {
                class: "hint",
                style: {
                    margin: 0
                }
            }, "O vínculo faz as questões e o tempo desta pasta contarem para a matéria/assunto escolhido."), h("label", {
                class: "f"
            }, "Matéria", dsel), h("label", {
                class: "f"
            }, "Assunto", tsel), extras.map((x => x.el))),
            botoes: [ {
                texto: "Cancelar"
            }, {
                texto: "Salvar",
                tipo: "primary",
                fn: () => {
                    if (extras.some((x => x.validar && x.validar() === false))) return false;
                    Store.mut((s => {
                        const x = s.pastas.find((y => y.id === p.id));
                        if (!x) return;
                        x.discId = dsel.value || null;
                        x.topicoId = tsel.value || null;
                        extras.forEach((e => e.aplicar && e.aplicar(x)));
                    }));
                }
            } ]
        });
    }
    function gerarDoEdital() {
        const prof = h("select", null, h("option", {
            value: 0
        }, "Só matérias (pastas de 1º nível)"), h("option", {
            value: 1,
            selected: true
        }, "Matérias + assuntos principais (2 níveis)"));
        U.modal({
            titulo: "Gerar pastas a partir do edital",
            corpo: h("div", {
                class: "col"
            }, h("p", {
                style: {
                    margin: 0
                }
            }, "Cria uma pasta para cada matéria do edital " + D.edital().ed.nome + ", com os assuntos principais dentro" + U.txt("pastas.gerarComo", "") + ". Pastas que já existem não são duplicadas."), h("label", {
                class: "f"
            }, "Profundidade", prof)),
            botoes: [ {
                texto: "Cancelar"
            }, {
                texto: "Gerar",
                tipo: "primary",
                fn: () => {
                    const antes = Store.s.pastas.length;
                    D.pastasDoEdital(+prof.value);
                    const n = Store.s.pastas.length - antes;
                    U.toast(n ? U.plural(n, "pasta criada", "pastas criadas") : "Nenhuma pasta nova: as do edital já existem.", n ? "ok" : "");
                }
            } ]
        });
    }
    function criarDeTexto(t, paiId) {
        const base = paiId ? D.caminhoPasta(paiId).map((p => p.nome)) : [];
        const pilha = [];
        let n = 0;
        t.split(/\r?\n/).forEach((l => {
            if (!l.trim()) return;
            const nivel = Math.min(Math.floor(l.match(/^\s*/)[0].replace(/\t/g, "  ").length / 2), pilha.length);
            pilha.length = nivel;
            pilha[nivel] = l.trim();
            D.garantirCaminho(base.concat(pilha.slice(0, nivel + 1)));
            n++;
        }));
        U.toast(n ? U.plural(n, "linha processada", "linhas processadas") + ". Pastas repetidas não são duplicadas." : "Nada para criar: cole ao menos uma linha.", n ? "ok" : "err");
        V.refresh();
    }
    V.pastasDeTexto = criarDeTexto;
})();