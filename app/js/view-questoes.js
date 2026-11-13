(function() {
    "use strict";
    const {h: h, icon: icon, norm: norm, ymd: ymd} = U;
    const V = window.Views = window.Views || {};
    const ui = {
        disc: "",
        res: "",
        fonte: "",
        pasta: "",
        busca: "",
        marcadas: false,
        pag: 1
    };
    const POR_PAG = 30;
    const FONTES = Object.assign({}, ...Encaixe.todos("questoes.fontes"), {
        manual: "Manual",
        outro: "Outro"
    });
    const ROTULO_RES = {
        acerto: "Acertei",
        erro: "Errei",
        pendente: "Pendente"
    };
    V.qLinha = function(q) {
        const abre = () => V.abrirQuestao(q.id);
        return h("div", {
            class: "qcard",
            tabindex: 0,
            role: "button",
            "aria-label": "Abrir questão: " + (q.enunciado || "").slice(0, 80),
            onclick: abre,
            onkeydown: ev => {
                if (ev.target === ev.currentTarget && (ev.key === "Enter" || ev.key === " ")) {
                    ev.preventDefault();
                    abre();
                }
            }
        }, h("div", {
            class: "row wrap"
        }, h("span", {
            class: "res " + q.resultado
        }, ROTULO_RES[q.resultado] || "Pendente"), q.discId ? h("span", {
            class: "chip"
        }, h("span", {
            class: "dot-c",
            style: {
                background: D.corDisc(q.discId)
            }
        }), D.nomeDisc(q.discId)) : h("span", {
            class: "chip"
        }, "Sem matéria"), q.assuntoOrig || q.topicoId ? h("span", {
            class: "tiny muted ellipsis",
            style: {
                maxWidth: "260px"
            }
        }, q.topicoId ? D.rotuloTopico(q.topicoId) : q.assuntoOrig) : null, h("span", {
            class: "right tiny muted"
        }, (FONTES[q.fonte] || q.fonte) + (q.banca ? " · " + q.banca : "") + (q.ano ? " " + q.ano : "")), q.marcada ? h("span", {
            title: "Marcada",
            style: {
                color: "var(--warn-t)",
                display: "grid"
            }
        }, icon("star", "sm")) : null), h("div", {
            class: "enun-prev",
            style: {
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden"
            }
        }, q.enunciado || "(sem enunciado)"));
    };
    const textos = () => D.memo("q-textos", (() => {
        const m = new Map;
        Store.s.questoes.forEach((x => m.set(x.id, norm((x.enunciado || "") + " " + (x.assuntoOrig || "") + " " + (x.nota || "")))));
        return m;
    }));
    function filtrar() {
        const s = Store.s;
        const t = textos(), q = norm(ui.busca);
        const pastas = ui.pasta ? new Set(D.descendentesPasta(ui.pasta)) : null;
        const lista = s.questoes.filter((x => (!ui.disc || x.discId === ui.disc) && (!ui.res || x.resultado === ui.res) && (!ui.fonte || x.fonte === ui.fonte) && (!pastas || x.pastaId && pastas.has(x.pastaId)) && (!ui.marcadas || x.marcada) && (!q || (t.get(x.id) || "").includes(q))));
        const chave = x => x.respondidaEm || x.criadaEm || "";
        return lista.sort(((a, b) => chave(a) < chave(b) ? 1 : chave(a) > chave(b) ? -1 : 0));
    }
    V.questoes = function(root) {
        const s = Store.s, e = D.edital();
        const tot = s.questoes.length;
        const ac = s.questoes.filter((x => x.resultado === "acerto")).length, erros = s.questoes.filter((x => x.resultado === "erro")).length;
        const area = h("div", {
            class: "col",
            style: {
                gap: "16px"
            },
            "aria-live": "polite"
        });
        const desenhaLista = () => {
            U.clear(area);
            const lista = filtrar();
            const pags = Math.max(1, Math.ceil(lista.length / POR_PAG));
            if (ui.pag > pags) ui.pag = pags;
            const pagina = lista.slice((ui.pag - 1) * POR_PAG, ui.pag * POR_PAG);
            const filtrando = ui.disc || ui.res || ui.fonte || ui.pasta || ui.busca || ui.marcadas;
            area.appendChild(lista.length ? h("div", {
                class: "grid g2"
            }, pagina.map(V.qLinha)) : h("div", {
                class: "card"
            }, h("div", {
                class: "empty"
            }, icon("checkSq", "lg"), h("div", null, tot ? "Nenhuma questão com esses filtros." : "Nenhuma questão ainda."), filtrando && tot ? h("button", {
                class: "btn",
                onclick: () => {
                    Object.assign(ui, {
                        disc: "",
                        res: "",
                        fonte: "",
                        pasta: "",
                        busca: "",
                        marcadas: false,
                        pag: 1
                    });
                    V.refresh();
                }
            }, "Limpar filtros") : h("div", {
                class: "hint"
            }, 'Use "Nova questão" para registrar à mão. ' + U.txt("questoes.vazioExtra", 'Para lançar só quantas fez e quantas acertou, use "Registrar lote".')))));
            if (lista.length) area.appendChild(h("div", {
                class: "row small muted",
                style: {
                    justifyContent: "center",
                    gap: "12px"
                }
            }, pags > 1 ? h("button", {
                class: "btn sm",
                "aria-label": "Página anterior",
                disabled: ui.pag <= 1,
                onclick: () => {
                    ui.pag--;
                    V.refresh();
                }
            }, icon("left", "sm")) : null, h("span", null, U.plural(lista.length, "questão", "questões") + (pags > 1 ? " · página " + ui.pag + " de " + pags : "")), pags > 1 ? h("button", {
                class: "btn sm",
                "aria-label": "Próxima página",
                disabled: ui.pag >= pags,
                onclick: () => {
                    ui.pag++;
                    V.refresh();
                }
            }, icon("right", "sm")) : null));
        };
        const busca = h("input", {
            type: "search",
            "aria-label": "Buscar nas questões",
            placeholder: "Buscar no enunciado ou nas notas…",
            value: ui.busca,
            style: {
                minWidth: "240px"
            }
        });
        busca.addEventListener("input", U.debounce((() => {
            ui.busca = busca.value;
            ui.pag = 1;
            desenhaLista();
        }), 200));
        const sel = (k, opts, ph) => h("select", {
            "aria-label": ph,
            onchange: ev => {
                ui[k] = ev.target.value;
                ui.pag = 1;
                V.refresh();
            }
        }, h("option", {
            value: ""
        }, ph), opts.map((([v, t]) => h("option", {
            value: v,
            selected: ui[k] === v
        }, t))));
        root.appendChild(h("div", {
            class: "page"
        }, h("div", {
            class: "page-head"
        }, h("div", null, h("h1", null, "Questões e erros"), h("div", {
            class: "sub"
        }, U.plural(tot, "questão", "questões") + " · " + U.plural(ac, "acerto", "acertos") + " · " + U.plural(erros, "erro", "erros") + U.txt("questoes.origem", " · digitadas aqui"))), h("div", {
            class: "right row wrap"
        }, h("button", {
            class: "btn",
            onclick: registroRapido,
            title: U.txt("questoes.loteDica", "Para lançar só quantas você fez e quantas acertou")
        }, icon("checkSq", "sm"), "Registrar lote"), h("button", {
            class: "btn",
            onclick: exportar,
            disabled: !tot
        }, icon("download", "sm"), "Exportar"), h("button", {
            class: "btn primary",
            onclick: () => formulario()
        }, icon("plus", "sm"), "Nova questão"))), h("div", {
            class: "card"
        }, h("div", {
            class: "row wrap"
        }, busca, sel("disc", e.discs.map((d => [ d.id, d.curto || d.nome ])), "Todas as matérias"), sel("res", [ [ "erro", "Erros" ], [ "acerto", "Acertos" ], [ "pendente", "Pendentes" ] ], "Qualquer resultado"), sel("fonte", Object.entries(FONTES), "Qualquer fonte"), (() => {
            const sp = h("select", {
                "aria-label": "Pasta",
                onchange: ev => {
                    ui.pasta = ev.target.value;
                    ui.pag = 1;
                    V.refresh();
                }
            }, h("option", {
                value: ""
            }, "Qualquer pasta"), V.opcoesPastas().slice(1));
            sp.value = ui.pasta;
            return sp;
        })(), h("label", {
            class: "row small"
        }, h("span", {
            class: "switch"
        }, h("input", {
            type: "checkbox",
            checked: ui.marcadas,
            onchange: ev => {
                ui.marcadas = ev.target.checked;
                ui.pag = 1;
                V.refresh();
            }
        }), h("span")), "Só marcadas"))), area));
        desenhaLista();
    };
    function trocarMateria(t, discId) {
        if ((t.discId || null) === (discId || null)) return;
        t.discId = discId;
        if (t.topicoId && (!discId || D.edital().discDe[t.topicoId] !== discId)) t.topicoId = discId ? D.matchTopico(discId, t.assuntoOrig || t.assunto) : null;
    }
    V.abrirQuestao = function(id) {
        const q = Store.s.questoes.find((x => x.id === id));
        if (!q) return;
        const nota = h("textarea", {
            placeholder: "Por que errei? Qual o macete? Qual a regra?"
        }, q.nota || "");
        const e = D.edital();
        const dsel = h("select", null, h("option", {
            value: ""
        }, "(sem matéria)"), e.discs.map((d => h("option", {
            value: d.id,
            selected: d.id === q.discId
        }, d.nome))));
        const psel = h("select", null, V.opcoesPastas());
        psel.value = q.pastaId || "";
        const marc = h("input", {
            type: "checkbox",
            checked: !!q.marcada
        });
        const srs = h("input", {
            type: "checkbox",
            checked: !!q.srs
        });
        const link = U.linkSeguro(q.url);
        U.modal({
            titulo: "Questão",
            largo: true,
            corpo: h("div", {
                class: "col"
            }, h("div", {
                class: "row wrap"
            }, h("span", {
                class: "res " + q.resultado
            }, ROTULO_RES[q.resultado] || q.resultado), h("span", {
                class: "chip"
            }, FONTES[q.fonte] || q.fonte), q.banca ? h("span", {
                class: "chip"
            }, q.banca) : null, q.ano ? h("span", {
                class: "chip"
            }, q.ano) : null, q.orgao ? h("span", {
                class: "chip"
            }, q.orgao) : null, link ? h("a", {
                class: "btn sm right",
                href: link,
                target: "_blank",
                rel: "noopener noreferrer"
            }, icon("ext", "sm"), "Abrir no site") : null), q.assuntoOrig || q.materiaOrig ? h("div", {
                class: "tiny muted"
            }, [ q.materiaOrig, q.assuntoOrig ].filter(Boolean).join(" › ")) : null, h("div", {
                class: "enun"
            }, q.enunciado || "(sem enunciado)"), q.alternativas && q.alternativas.length ? h("div", null, q.alternativas.map((a => h("div", {
                class: "alt" + (a.l === q.gabarito ? " gab" : "") + (a.l === q.resposta ? " mine" : "")
            }, h("b", null, a.l), h("div", null, a.t))))) : null, h("div", {
                class: "small"
            }, "Gabarito: ", h("b", null, q.gabarito || "—"), " · Sua resposta: ", h("b", null, q.resposta || "—")), q.comentario ? h("div", {
                class: "callout enun small"
            }, h("b", null, "Comentário: "), q.comentario) : null, h("div", {
                class: "grid g2"
            }, h("label", {
                class: "f"
            }, "Matéria", dsel), h("label", {
                class: "f"
            }, "Pasta", psel)), h("label", {
                class: "f"
            }, "Minhas anotações", nota), h("div", {
                class: "row wrap"
            }, h("label", {
                class: "row"
            }, h("span", {
                class: "switch"
            }, marc, h("span")), "Marcar com estrela"), h("label", {
                class: "row"
            }, h("span", {
                class: "switch"
            }, srs, h("span")), "Revisar a questão nos flashcards"), window.Flash ? h("button", {
                class: "btn sm right",
                type: "button",
                title: "Cria um cartão de frente e verso a partir desta questão (você resume e ajusta)",
                onclick: () => Flash.daQuestao(q)
            }, icon("cards", "sm"), "Virar flashcard") : null)),
            botoes: [ {
                texto: "Excluir",
                tipo: "danger",
                fn: () => {
                    const copia = Object.assign({}, q);
                    Store.mut((s => {
                        s.questoes = s.questoes.filter((x => x.id !== id));
                    }));
                    U.toast("Questão excluída.", "", {
                        acao: "Desfazer",
                        fn: () => Store.mut((s => {
                            if (!s.questoes.some((x => x.id === copia.id))) s.questoes.push(copia);
                        }))
                    });
                }
            }, {
                texto: "Editar",
                fn: () => {
                    setTimeout((() => formulario(q)), 30);
                }
            }, {
                texto: "Salvar",
                tipo: "primary",
                fn: () => Store.mut((s => {
                    const t = s.questoes.find((x => x.id === id));
                    if (!t) return;
                    t.nota = nota.value;
                    trocarMateria(t, dsel.value || null);
                    t.pastaId = psel.value || null;
                    t.marcada = marc.checked;
                    if (srs.checked && !t.srs) t.srs = {
                        ef: 2.5,
                        rep: 0,
                        int: 0,
                        due: ymd()
                    };
                    if (!srs.checked) {
                        t.srs = null;
                        t.fsrs = null;
                    }
                }))
            } ]
        });
    };
    function formulario(q) {
        q = q || {
            alternativas: [],
            resultado: "pendente",
            fonte: "manual"
        };
        const e = D.edital();
        const enun = h("textarea", {
            "aria-label": "Enunciado",
            style: {
                minHeight: "120px"
            }
        }, q.enunciado || "");
        const dsel = h("select", null, h("option", {
            value: ""
        }, "(sem matéria)"), e.discs.map((d => h("option", {
            value: d.id,
            selected: d.id === q.discId
        }, d.nome))));
        const altTxt = h("textarea", {
            placeholder: "Uma alternativa por linha. Ex.:\nA) texto…\nB) texto…\n(para Certo/Errado deixe vazio)",
            style: {
                minHeight: "90px"
            }
        }, (q.alternativas || []).map((a => a.l + ") " + a.t)).join("\n"));
        const gab = h("input", {
            type: "text",
            value: q.gabarito || "",
            placeholder: "A, B, C, D, E, C ou E",
            maxLength: 3,
            style: {
                width: "100%"
            }
        });
        const resp = h("input", {
            type: "text",
            value: q.resposta || "",
            maxLength: 3,
            style: {
                width: "100%"
            },
            placeholder: "o que você marcou"
        });
        const res = h("select", null, [ [ "pendente", "Ainda não respondi" ], [ "acerto", "Acertei" ], [ "erro", "Errei" ] ].map((([v, t]) => h("option", {
            value: v,
            selected: q.resultado === v
        }, t))));
        const dica = h("div", {
            class: "hint"
        });
        const atualiza = () => {
            const calc = gab.value.trim() && resp.value.trim();
            res.disabled = !!calc;
            if (calc) res.value = D.resultadoDe({
                gabarito: gab.value,
                resposta: resp.value
            });
            dica.textContent = calc ? "Resultado calculado: gabarito × sua resposta." : "Preencha gabarito e resposta para o resultado ser calculado sozinho.";
        };
        gab.addEventListener("input", atualiza);
        resp.addEventListener("input", atualiza);
        atualiza();
        const banca = h("input", {
            type: "text",
            value: q.banca || "",
            placeholder: "Cebraspe",
            style: {
                width: "100%"
            }
        }), ano = h("input", {
            type: "text",
            inputMode: "numeric",
            value: q.ano || "",
            style: {
                width: "100%"
            }
        });
        const url = h("input", {
            type: "url",
            value: q.url || "",
            placeholder: "link da questão (opcional)",
            style: {
                width: "100%"
            }
        });
        U.modal({
            titulo: q.id ? "Editar questão" : "Nova questão",
            largo: true,
            corpo: h("div", {
                class: "col"
            }, h("label", {
                class: "f"
            }, "Enunciado", enun), h("label", {
                class: "f"
            }, "Matéria (necessária para entrar nas estatísticas por matéria)", dsel), h("label", {
                class: "f"
            }, "Alternativas", altTxt), h("div", {
                class: "grid g3"
            }, h("label", {
                class: "f"
            }, "Gabarito", gab), h("label", {
                class: "f"
            }, "Minha resposta", resp), h("label", {
                class: "f"
            }, "Resultado", res)), dica, h("div", {
                class: "grid g2"
            }, h("label", {
                class: "f"
            }, "Banca", banca), h("label", {
                class: "f"
            }, "Ano", ano)), h("label", {
                class: "f"
            }, "Link", url)),
            botoes: [ {
                texto: "Cancelar"
            }, {
                texto: "Salvar",
                tipo: "primary",
                fn: () => {
                    if (!enun.value.trim()) {
                        U.toast("Escreva o enunciado.", "err");
                        return false;
                    }
                    const u = url.value.trim();
                    if (u && !U.linkSeguro(u)) {
                        U.toast("O link precisa começar com http:// ou https://", "err");
                        return false;
                    }
                    const alts = altTxt.value.split(/\r?\n/).map((l => l.trim())).filter(Boolean).map(((l, i) => {
                        const m = l.match(/^\(?([A-Ea-e])[).:-]\s*(.*)$/);
                        return m ? {
                            l: m[1].toUpperCase(),
                            t: m[2]
                        } : {
                            l: "ABCDE"[i] || "?",
                            t: l
                        };
                    }));
                    const dados = {
                        enunciado: enun.value.trim(),
                        discId: dsel.value || null,
                        alternativas: alts,
                        gabarito: gab.value.trim().toUpperCase(),
                        resposta: resp.value.trim().toUpperCase(),
                        resultado: res.value,
                        banca: banca.value.trim(),
                        ano: ano.value.trim(),
                        url: u
                    };
                    dados.resultado = D.resultadoDe(dados);
                    const hoje = ymd();
                    if (q.id) {
                        Store.mut((s => {
                            const t = s.questoes.find((x => x.id === q.id));
                            if (!t) return;
                            const disc = dados.discId;
                            delete dados.discId;
                            Object.assign(t, dados);
                            trocarMateria(t, disc);
                            if (t.resultado !== "pendente" && !t.respondidaEm) t.respondidaEm = hoje;
                            if (t.resultado === "erro" && !t.srs) t.srs = {
                                ef: 2.5,
                                rep: 0,
                                int: 0,
                                due: hoje
                            };
                        }));
                        U.toast("Questão atualizada.", "ok");
                    } else {
                        const r = D.addQuestao(Object.assign({
                            fonte: "manual"
                        }, dados));
                        U.toast(r.nova ? "Questão salva." : "Essa questão já estava salva: atualizei o resultado.", "ok");
                    }
                    if (!dados.discId) U.toast("Sem matéria: ela não entra nas estatísticas por matéria.", "");
                }
            } ]
        });
    }
    function registroRapido() {
        const e = D.edital();
        const d = h("select", null, e.discs.map((x => h("option", {
            value: x.id
        }, x.nome))));
        const f = h("input", {
            type: "number",
            min: 1,
            value: 20,
            style: {
                width: "100%"
            }
        }), a = h("input", {
            type: "number",
            min: 0,
            value: 15,
            style: {
                width: "100%"
            }
        }), dt = h("input", {
            type: "date",
            value: ymd(),
            max: ymd()
        });
        U.modal({
            titulo: "Registrar lote de questões",
            corpo: h("div", {
                class: "col"
            }, h("p", {
                class: "hint",
                style: {
                    margin: 0
                }
            }, U.txt("questoes.loteTexto", "Para lançar só quantas você fez e quantas acertou.") + " Entra nas estatísticas de desempenho."), h("label", {
                class: "f"
            }, "Matéria", d), h("div", {
                class: "grid g3"
            }, h("label", {
                class: "f"
            }, "Feitas", f), h("label", {
                class: "f"
            }, "Acertos", a), h("label", {
                class: "f"
            }, "Data", dt))),
            botoes: [ {
                texto: "Cancelar"
            }, {
                texto: "Salvar",
                tipo: "primary",
                fn: () => {
                    const feitas = Math.round(+f.value), acertos = Math.round(+a.value);
                    if (!(feitas >= 1)) {
                        U.toast("Informe quantas questões você fez.", "err");
                        return false;
                    }
                    if (!(acertos >= 0) || acertos > feitas) {
                        U.toast("Os acertos não podem passar das questões feitas.", "err");
                        return false;
                    }
                    if (!dt.value) {
                        U.toast("Escolha a data.", "err");
                        return false;
                    }
                    Store.mut((s => s.registrosQ.push({
                        id: U.uid(),
                        data: dt.value,
                        discId: d.value,
                        feitas: feitas,
                        acertos: acertos
                    })));
                    U.toast("Registrado: " + acertos + " de " + feitas + " (" + Math.round(acertos / feitas * 100) + "%).", "ok");
                }
            } ]
        });
    }
    const celula = v => {
        let t = String(v == null ? "" : v);
        if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
        return '"' + t.replace(/"/g, '""') + '"';
    };
    function exportar() {
        const qs = Store.s.questoes;
        U.modal({
            titulo: "Exportar questões",
            corpo: h("p", {
                style: {
                    margin: 0
                }
            }, U.plural(qs.length, "questão será exportada", "questões serão exportadas") + ". Escolha o formato: CSV abre no Excel; JSON guarda tudo, inclusive alternativas e comentários."),
            botoes: [ {
                texto: "Cancelar"
            }, {
                texto: "JSON",
                fn: () => U.download("arsenal-questoes-" + ymd() + ".json", JSON.stringify(qs, null, 1))
            }, {
                texto: "CSV (Excel)",
                tipo: "primary",
                fn: () => {
                    const csv = [ "data;fonte;materia;assunto;banca;ano;resultado;gabarito;resposta;link;enunciado" ].concat(qs.map((q => [ q.respondidaEm || q.criadaEm, q.fonte, D.nomeDisc(q.discId, false), q.assuntoOrig || "", q.banca || "", q.ano || "", q.resultado, q.gabarito || "", q.resposta || "", q.url || "", (q.enunciado || "").replace(/\s+/g, " ") ].map(celula).join(";")))).join("\n");
                    U.download("arsenal-questoes-" + ymd() + ".csv", "\ufeff" + csv, "text/csv;charset=utf-8");
                }
            } ]
        });
    }
})();