(function() {
    "use strict";
    const {h: h, icon: icon, fmtMin: fmtMin, ymd: ymd} = U;
    const V = window.Views = window.Views || {};
    V.ciclo = function(root) {
        const s = Store.s, c = s.ciclo, e = D.edital();
        const cs = D.cicloEstado();
        const meta = s.config.metaDiariaMin, hoje = D.minHojeVivo();
        const div = s.config.divisao || {
            teoria: 50,
            questoes: 30,
            revisao: 20
        };
        const venc = D.revisoesVencidas().length + D.cardsDevidos().length;
        const m = Object.assign({
            horasDia: 1,
            dias: 7,
            porPeso: true,
            intercalar: true
        }, c.metodo, {
            horasDia: Math.round(meta / 60 * 100) / 100
        });
        const lerHoras = t => {
            t = String(t).trim().replace(",", ".");
            const mm = t.match(/^(\d+):([0-5]?\d)$/);
            const v = mm ? +mm[1] + +mm[2] / 60 : parseFloat(t);
            return isFinite(v) && v > 0 ? v : 0;
        };
        const hd = h("input", {
            type: "text",
            inputMode: "decimal",
            value: String(m.horasDia).replace(".", ","),
            "aria-label": "Horas por dia",
            style: {
                width: "72px",
                textAlign: "center"
            }
        });
        const dd = h("input", {
            type: "number",
            min: 1,
            max: 30,
            step: 1,
            value: m.dias,
            "aria-label": "Quantos dias",
            style: {
                width: "64px",
                textAlign: "center"
            }
        });
        const resumo = h("div", {
            class: "ciclo-resumo",
            "aria-live": "polite"
        });
        const lerParametros = () => ({
            horasDia: U.clamp(lerHoras(hd.value) || 0, 0, 24),
            dias: U.clamp(Math.round(+dd.value) || 0, 0, 30)
        });
        const atualizaPrevia = () => {
            const p = lerParametros();
            if (!p.horasDia || !p.dias) {
                resumo.textContent = "Digite as horas por dia (por exemplo 6, 1,5 ou 1:30) e quantos dias.";
                return;
            }
            const pl = D.planoCiclo(p, c.itens.length ? c.itens : null), ativos = pl.itens.filter((i => i.ativo)), vezes = ativos.reduce(((a, i) => a + (i.peso || 1)), 0);
            resumo.textContent = "São " + fmtMin(pl.total) + " em " + p.dias + (p.dias === 1 ? " dia" : " dias") + " (" + fmtMin(Math.round(p.horasDia * 60)) + " por dia), ou seja, " + pl.blocosSemana + " blocos de 1 h por semana. O ciclo tem " + ativos.length + (ativos.length === 1 ? " matéria" : " matérias") + " (" + vezes + " blocos por volta). Cada matéria ganha 1 h por vez, na ordem; o que não couber na semana continua na próxima, sem recomeçar.";
        };
        hd.addEventListener("input", atualizaPrevia);
        dd.addEventListener("input", atualizaPrevia);
        atualizaPrevia();
        const gerar = () => {
            const go = () => {
                const p = lerParametros();
                if (!p.horasDia || !p.dias) return U.toast("Digite as horas por dia e quantos dias.", "err");
                const hrs = p.horasDia;
                D.gerarCiclo(p);
                Store.mut((st => {
                    st.config.metaDiariaMin = U.clamp(Math.round(hrs * 60), 15, 1440);
                }));
                D.refazerPlano();
                U.toast("Ciclo gerado! Meta de hoje: " + fmtMin(Store.s.config.metaDiariaMin) + ".", "ok");
            };
            c.itens.length ? U.confirmar("Dividir o tempo de novo? Os minutos de cada matéria serão recalculados (as vezes na volta ficam) e o que você já estudou nesta volta recomeça do zero.", "Dividir").then((ok => ok && go())) : go();
        };
        const preset = (hrs, dias) => h("button", {
            class: "chip",
            onclick: () => {
                hd.value = String(hrs).replace(".", ",");
                dd.value = dias;
                atualizaPrevia();
            }
        }, hrs + "h/dia");
        const sugestao = (() => {
            const t = meta * (div.teoria / 100), q = meta * (div.questoes / 100), r = meta * (div.revisao / 100);
            return [ [ "Teoria", t, "teoria" ], [ "Questões", q, "questoes" ], [ "Revisões", r, "revisao" ] ];
        })();
        root.appendChild(h("div", {
            class: "page"
        }, h("div", {
            class: "page-head"
        }, h("div", null, h("h1", null, "Ciclo de estudos"), h("div", {
            class: "sub"
        }, "Volta " + (c.voltas + 1) + " · " + cs.pct + "% concluída · " + fmtMin(cs.totalFeito) + " de " + fmtMin(cs.totalAlvo)))), modoCard(), D.editalZerado() ? h("div", {
            class: "callout",
            role: "status"
        }, h("b", null, "Você zerou o edital! "), 'Todos os assuntos chegaram em "Teoria concluída". Agora é revisar e fazer questões; se quiser, troque para "Por matéria" para continuar o ciclo.') : null, h("div", {
            class: "grid g2"
        }, h("div", {
            class: "card"
        }, h("h3", null, icon("target", "sm"), "Hoje"), h("div", {
            class: "row",
            style: {
                gap: "20px",
                flexWrap: "wrap"
            }
        }, Charts.anel(hoje / meta, {
            tam: 124,
            esp: 10,
            cor: "var(--amber-bar)",
            texto: fmtMin(hoje),
            sub: "meta " + fmtMin(meta),
            rotulo: "Meta de hoje"
        }), h("div", {
            class: "col grow",
            style: {
                gap: "6px"
            }
        }, cs.atual ? [ h("div", {
            class: "muted small"
        }, "Matéria da vez"), h("div", {
            style: {
                fontSize: "22px",
                fontWeight: 800,
                color: D.corDiscTexto(cs.atual.discId)
            }
        }, D.nomeDisc(cs.atual.discId, false)), D.modoAssunto() && D.assuntoDaVez() ? h("div", {
            class: "small"
        }, h("b", null, "Assunto: "), D.rotuloTopico(D.assuntoDaVez()), h("span", {
            class: "muted"
        }, " · " + D.assuntosPendentes(cs.atual.discId).feitos + " de " + D.assuntosPendentes(cs.atual.discId).total + " concluídos")) : null, h("div", {
            class: "row wrap"
        }, h("button", {
            class: "btn primary",
            onclick: () => {
                if (D.Cron.preparar({
                    discId: null,
                    fixa: false,
                    topicoId: null
                })) {
                    D.Cron.iniciar();
                    App.cronometro();
                }
            }
        }, icon("play", "sm"), "Estudar agora"), h("button", {
            class: "btn",
            onclick: () => {
                const id = cs.atual.discId;
                Store.mut((st => {
                    if (!st.ciclo.pulou.includes(id)) st.ciclo.pulou.push(id);
                    st.ciclo.fixada = null;
                }));
                U.toast(D.nomeDisc(id, false) + " pulada nesta volta.", "", {
                    acao: "Desfazer",
                    fn: () => Store.mut((st => {
                        st.ciclo.pulou = st.ciclo.pulou.filter((x => x !== id));
                    }))
                });
            }
        }, icon("skip", "sm"), "Pular")) ] : h("div", {
            class: "muted"
        }, "Sem matéria pendente. Gere ou ajuste o ciclo ao lado."))), h("hr", {
            style: {
                border: 0,
                borderTop: "1px solid var(--line)",
                margin: "14px 0"
            }
        }), h("div", {
            style: {
                fontWeight: 700,
                marginBottom: "8px"
            }
        }, "Divisão sugerida da sessão de hoje (" + fmtMin(meta) + ")"), h("div", {
            class: "row wrap"
        }, sugestao.map((([nm, mn, tp]) => h("button", {
            class: "chip",
            title: "Iniciar no cronômetro",
            onclick: () => {
                if (D.Cron.preparar({
                    tipo: tp,
                    modo: "regressivo",
                    alvoMin: Math.max(5, Math.round(mn))
                })) App.cronometro();
            }
        }, nm + " " + Math.round(mn) + "min")))), proximas(c, cs), venc ? h("div", {
            class: "hint",
            style: {
                marginTop: "8px"
            }
        }, "Faltam " + U.plural(venc, "revisão pendente", "revisões pendentes") + " hoje. Ajuste a divisão em Ajustes › Metas.") : null), h("div", {
            class: "card"
        }, h("h3", null, icon("zap", "sm"), "Montar a semana"), h("div", {
            class: "ciclo-frase"
        }, "Você quer estudar ", hd, " horas por dia, por ", dd, " dias?"), h("div", {
            class: "row wrap",
            style: {
                margin: "10px 0 4px"
            }
        }, preset(2, 7), preset(4, 7), preset(6, 7), preset(8, 7)), resumo, h("div", {
            class: "hint",
            style: {
                margin: "12px 0 12px"
            }
        }, 'Os minutos de cada matéria e quantas vezes ela entra na volta ficam na lista logo abaixo ("Seu ciclo"). Por padrão todas entram 1 vez, e quem decide é você.'), h("button", {
            class: "btn primary",
            onclick: gerar
        }, icon("refresh", "sm"), "Dividir o tempo entre as matérias"))), h("div", {
            class: "card"
        }, h("h3", null, icon("refresh", "sm"), "Seu ciclo", h("span", {
            class: "right small muted"
        }, "Mude os minutos, as vezes na volta e a ordem; desligue o interruptor para tirar da volta")), explicacao(), voltaNaOrdem(c, cs), c.itens.length ? h("div", {
            class: "col",
            style: {
                gap: "8px"
            }
        }, cabecalho(), c.itens.map(((it, i) => linha(it, i, cs)))) : h("div", {
            class: "empty"
        }, icon("refresh", "lg"), h("div", null, 'Seu ciclo está vazio. Use "Montar a semana" ou adicione matérias abaixo.')), h("div", {
            class: "row wrap",
            style: {
                marginTop: "14px"
            }
        }, addSel(), h("span", {
            class: "hint"
        }, 'Dica: o cronômetro em "seguir ciclo" escolhe a matéria da vez sozinho.')))));
    };
    function opcoesModo(aoEscolher) {
        const atual = Store.s.config.modoEstudo === "assunto" ? "assunto" : "materia";
        const op = (v, titulo, texto) => h("button", {
            type: "button",
            class: "modo-op" + (atual === v ? " on" : ""),
            "aria-pressed": atual === v ? "true" : "false",
            onclick: () => {
                Store.mut((s => {
                    s.config.modoEstudo = v;
                    s.config.modoEstudoEscolhido = true;
                }));
                D.refazerPlano && D.refazerPlano();
                aoEscolher && aoEscolher(v);
            }
        }, h("b", null, titulo), h("span", {
            class: "small muted"
        }, texto));
        return h("div", {
            class: "modo-ops"
        }, op("materia", "Por matéria", "Mais amplo: na vez da matéria você estuda o que quiser dela (Direito Constitucional inteiro, Matemática inteira…)."), op("assunto", "Por assunto", "Mais específico: a vez de cada matéria já traz o próximo assunto do edital. Terminou um, vem o seguinte, até zerar todos os assuntos de todas as matérias."));
    }
    function modoCard() {
        return h("div", {
            class: "card"
        }, h("h3", null, icon("book", "sm"), "Como você estuda"), opcoesModo((() => U.toast(Store.s.config.modoEstudo === "assunto" ? "Agora o ciclo segue assunto por assunto." : "Agora o ciclo segue por matéria.", "ok"))));
    }
    V.perguntarModoEstudo = function() {
        const m = U.modal({
            titulo: "Como você quer estudar?",
            largo: true,
            corpo: h("div", {
                class: "col"
            }, h("p", {
                style: {
                    margin: 0
                }
            }, "O ciclo de estudos pode seguir de dois jeitos. Dá para trocar depois na tela Ciclo de estudos."), opcoesModo((v => {
                m.close();
                U.toast(v === "assunto" ? "Combinado: assunto por assunto, até zerar o edital." : "Combinado: por matéria.", "ok");
            }))),
            botoes: [ {
                texto: "Decidir depois"
            } ]
        });
    };
    function explicacao() {
        const ch = (txt, cor, extra) => h("span", {
            class: "vp-chip",
            style: {
                "--rc": cor
            }
        }, txt, extra ? h("em", null, extra) : null);
        return h("div", {
            class: "ciclo-explica"
        }, h("div", {
            class: "ce-t"
        }, icon("help", "sm"), "Como o ciclo funciona"), h("ol", null, h("li", null, h("b", null, "Volta"), " é uma passada completa pelo ciclo: cada matéria ligada aparece tantas vezes quanto você marcou. Acabou a volta? Começa a próxima, na mesma sequência."), h("li", null, h("b", null, "Vezes na volta"), ": ", h("b", null, "1×"), " = uma vez por volta (o normal); ", h("b", null, "2×"), " e ", h("b", null, "3×"), " = a matéria volta mais vezes, ", h("b", null, "espalhada pela volta"), ": nunca duas vezes seguidas, nem na virada de uma volta para a outra (só acontece se quase não houver outras matérias ligadas para pôr no meio). Dê 2× ou 3× às matérias que pedem mais tempo."), h("li", null, h("b", null, "Ordem"), ': as de 1× seguem a ordem desta lista. As de 2× e 3× são espalhadas, por isso podem aparecer antes do lugar delas na lista. A sequência real está logo abaixo, em "Sua volta, na ordem".'), h("li", null, h("b", null, "Minutos por vez"), " é quanto dura cada aparição. Português com 60 min e 3× vira 3 h de Português por volta, em três blocos separados.")), h("div", {
            class: "ce-ex"
        }, h("span", {
            class: "muted"
        }, "Exemplo: Português 3×; Matemática, Direito e Informática 1× →"), h("span", {
            class: "vp-seq"
        }, ch("1 Português", "#3d7bf2"), ch("2 Matemática", "#f0743e"), ch("3 Português", "#3d7bf2", "2ª vez"), ch("4 Direito", "#18a67c"), ch("5 Português", "#3d7bf2", "3ª vez"), ch("6 Informática", "#8461ee"))));
    }
    function voltaNaOrdem(c, cs) {
        if (!cs.slots.length) return null;
        const ed = D.edital();
        const chips = cs.slots.map(((sl, n) => {
            const feita = sl.feito >= sl.alvo, atual = cs.atual && cs.atual.n === n, nm = ed.disc[sl.discId] && ed.disc[sl.discId].curto || D.nomeDisc(sl.discId, false);
            return h("span", {
                class: "vp-chip" + (feita ? " ok" : "") + (atual ? " cur" : ""),
                style: {
                    "--rc": D.corDisc(sl.discId)
                },
                title: D.nomeDisc(sl.discId, false) + " · " + fmtMin(sl.alvo) + (sl.passada > 1 ? " · " + sl.passada + "ª vez nesta volta" : "") + (feita ? " · feita" : atual ? " · é a da vez" : "")
            }, (feita ? "✓ " : n + 1 + " ") + nm, sl.passada > 1 ? h("em", null, sl.passada + "ª vez") : null);
        }));
        return h("div", {
            class: "volta-prev"
        }, h("div", {
            class: "vp-t"
        }, "Sua volta, na ordem ", h("span", {
            class: "muted small"
        }, "· " + U.plural(cs.slots.length, "bloco", "blocos") + " = " + fmtMin(cs.totalAlvo) + " por volta")), h("div", {
            class: "vp-seq"
        }, chips));
    }
    function cabecalho() {
        return h("div", {
            class: "cycle-head hid-m",
            "aria-hidden": "true"
        }, h("span"), h("span", null, "Matéria"), h("span", null, "Minutos por vez"), h("span", null, "Vezes na volta"), h("span", null, "Feito nesta volta"), h("span"));
    }
    function proximas(c, cs) {
        const ids = D.filaCiclo().slice(1, 6);
        if (!ids.length) return null;
        return h("div", {
            style: {
                marginTop: "14px"
            }
        }, h("div", {
            style: {
                fontWeight: 700,
                marginBottom: "4px"
            }
        }, "Depois dela, nesta ordem"), ids.map((id => {
            const it = c.itens.find((x => x.discId === id)) || {};
            return h("div", {
                class: "cp-linha"
            }, h("span", {
                class: "dot-c",
                style: {
                    background: D.corDisc(id)
                }
            }), h("span", {
                class: "cp-nome"
            }, D.nomeDisc(id, false)), h("b", {
                class: "num"
            }, fmtMin(it.alvo || 0)), h("span", {
                class: "tiny muted"
            }, "por vez"));
        })));
    }
    function linha(it, i, cs) {
        const s = Store.s, peso = Math.min(3, Math.max(1, Math.round(+it.peso || 1))), feito = cs.feitoItem && cs.feitoItem[i] || 0, tot = (it.alvo || 1) * peso * (s.ciclo.rodadas || 1), pct = Math.min(100, feito / tot * 100);
        const cur = cs.atual && cs.atual.discId === it.discId;
        const alvo = h("input", {
            type: "number",
            min: 5,
            step: 5,
            value: it.alvo,
            "aria-label": "Minutos de " + D.nomeDisc(it.discId, false) + " por vez",
            style: {
                width: "84px"
            },
            onchange: ev => Store.mut((st => {
                st.ciclo.itens[i].alvo = Math.max(5, +ev.target.value || 5);
            }))
        });
        return h("div", {
            class: "cycle-row" + (it.ativo ? "" : " off") + (cur ? " cur" : "")
        }, h("div", {
            class: "col",
            style: {
                gap: 0
            }
        }, h("button", {
            class: "btn ghost sm",
            style: {
                minWidth: "28px",
                minHeight: "24px",
                padding: 0
            },
            "aria-label": "Subir " + D.nomeDisc(it.discId, false),
            title: "Subir na ordem",
            disabled: i === 0,
            onclick: () => Store.mut((st => {
                const a = st.ciclo.itens;
                [a[i - 1], a[i]] = [ a[i], a[i - 1] ];
            }))
        }, icon("up", "sm")), h("button", {
            class: "btn ghost sm",
            style: {
                minWidth: "28px",
                minHeight: "24px",
                padding: 0
            },
            "aria-label": "Descer " + D.nomeDisc(it.discId, false),
            title: "Descer na ordem",
            disabled: i === s.ciclo.itens.length - 1,
            onclick: () => Store.mut((st => {
                const a = st.ciclo.itens;
                [a[i + 1], a[i]] = [ a[i], a[i + 1] ];
            }))
        }, icon("down", "sm"))), h("div", {
            class: "row",
            style: {
                minWidth: 0
            }
        }, h("span", {
            class: "dot-c",
            style: {
                background: D.corDisc(it.discId)
            }
        }), h("div", {
            class: "grow",
            style: {
                minWidth: 0
            }
        }, h("div", {
            class: "ellipsis",
            style: {
                fontWeight: 700
            }
        }, D.nomeDisc(it.discId, false), cur ? h("span", {
            class: "badge novo",
            style: {
                marginLeft: "8px"
            }
        }, "da vez") : null, s.ciclo.fixada === it.discId ? h("span", {
            class: "badge atualizado",
            style: {
                marginLeft: "6px"
            }
        }, "próxima") : null), h("div", {
            class: "tiny muted"
        }, fmtMin(feito) + " de " + fmtMin(tot) + (peso * (s.ciclo.rodadas || 1) > 1 ? " · aparece " + peso * (s.ciclo.rodadas || 1) + "× por volta" : "")))), h("div", {
            class: "hid-m row"
        }, alvo, h("span", {
            class: "small muted"
        }, "min por vez")), h("div", {
            class: "hid-m"
        }, h("select", {
            "aria-label": "Vezes na volta de " + D.nomeDisc(it.discId, false),
            title: "Quantas vezes esta matéria aparece em cada volta do ciclo",
            onchange: ev => Store.mut((st => {
                st.ciclo.itens[i].peso = +ev.target.value;
            }))
        }, [ [ 1, "1× · normal" ], [ 2, "2× · reforço" ], [ 3, "3× · foco" ] ].map((([n, rot]) => h("option", {
            value: n,
            selected: n === peso
        }, rot))))), h("div", {
            class: "hid-m"
        }, h("div", {
            class: "bar"
        }, h("i", {
            style: {
                width: pct + "%",
                background: pct >= 100 ? "var(--ok)" : D.corDisc(it.discId)
            }
        }))), h("div", {
            class: "row"
        }, h("button", {
            class: "btn ghost sm",
            title: "Pôr esta matéria como a próxima da vez",
            "aria-label": "Pôr " + D.nomeDisc(it.discId, false) + " como a próxima",
            "aria-pressed": s.ciclo.fixada === it.discId ? "true" : "false",
            onclick: () => Store.mut((st => {
                st.ciclo.fixada = st.ciclo.fixada === it.discId ? null : it.discId;
            }))
        }, icon("pin", "sm")), h("label", {
            class: "switch",
            title: it.ativo ? "Na volta (clique para tirar)" : "Fora da volta (clique para incluir)"
        }, h("input", {
            type: "checkbox",
            "aria-label": D.nomeDisc(it.discId, false) + " na volta do ciclo",
            checked: it.ativo,
            onchange: ev => Store.mut((st => {
                st.ciclo.itens[i].ativo = ev.target.checked;
            }))
        }), h("span")), h("button", {
            class: "btn ghost sm",
            title: "Remover da lista do ciclo",
            "aria-label": "Remover " + D.nomeDisc(it.discId, false) + " da lista",
            onclick: () => {
                const copia = Object.assign({}, it);
                Store.mut((st => {
                    st.ciclo.itens.splice(i, 1);
                }));
                U.toast(D.nomeDisc(it.discId, false) + " removida do ciclo.", "", {
                    acao: "Desfazer",
                    fn: () => Store.mut((st => {
                        st.ciclo.itens.splice(Math.min(i, st.ciclo.itens.length), 0, copia);
                    }))
                });
            }
        }, icon("x", "sm"))));
    }
    function addSel() {
        const e = D.edital(), ja = new Set(Store.s.ciclo.itens.map((i => i.discId)));
        const livres = e.discs.filter((d => !ja.has(d.id)));
        if (!livres.length) return null;
        const sel = h("select", {
            "aria-label": "Matéria a adicionar",
            style: {
                maxWidth: "100%",
                minWidth: 0,
                flex: "1 1 200px"
            }
        }, livres.map((d => h("option", {
            value: d.id
        }, d.nome))));
        const min = h("input", {
            type: "number",
            min: 5,
            step: 5,
            value: D.BLOCO,
            "aria-label": "Minutos para a matéria",
            style: {
                width: "84px"
            }
        });
        return h("div", {
            class: "row wrap",
            style: {
                minWidth: 0,
                maxWidth: "100%"
            }
        }, sel, min, h("span", {
            class: "small muted"
        }, "min"), h("button", {
            class: "btn",
            onclick: () => Store.mut((st => st.ciclo.itens.push({
                discId: sel.value,
                alvo: Math.max(5, +min.value || D.BLOCO),
                ativo: true,
                peso: 1
            })))
        }, icon("plus", "sm"), "Adicionar ao ciclo"));
    }
})();