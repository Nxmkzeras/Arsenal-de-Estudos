(function() {
    "use strict";
    const {h: h, icon: icon, fmtMin: fmtMin, fmtHoras: fmtHoras, fmtClock: fmtClock, ymd: ymd, addDays: addDays, pct: pct} = U;
    const V = window.Views = window.Views || {};
    let periodo = 30, pulsoId = null;
    function dias(n) {
        const r = [];
        for (let i = n - 1; i >= 0; i--) r.push(addDays(ymd(), -i));
        return r;
    }
    const fmtHoraEixo = v => Charts.fmtEixoHoras(v);
    const fmtCarga = m => {
        const hh = Math.floor(m / 60), mm = Math.round(m % 60);
        return hh ? hh + "h" + (mm ? U.pad(mm) : "") : mm + "min";
    };
    const nomeDe = id => id ? D.nomeDisc(id, false) : "Sem matéria";
    const corDe = id => id ? D.corDisc(id) : "#8a9099";
    function definirProva() {
        const c = Store.s.config;
        const data = h("input", {
            type: "date",
            value: c.provaData || "",
            min: ymd()
        });
        const sem = h("input", {
            type: "number",
            min: 0,
            max: 10080,
            step: 30,
            value: D.metaSemana()
        });
        U.modal({
            titulo: "Prova e meta da semana",
            corpo: h("div", {
                class: "col"
            }, h("label", {
                class: "f"
            }, "Data da prova", data), h("div", {
                class: "hint"
            }, "Deixe em branco se o edital ainda não saiu. Dá para mudar depois."), h("label", {
                class: "f"
            }, "Meta da semana (minutos)", sem), h("div", {
                class: "hint"
            }, "Sem mexer, ela acompanha a meta de hoje: " + U.fmtMin(c.metaDiariaMin) + " × " + D.diasSemana() + " dias = " + U.fmtMin(c.metaDiariaMin * D.diasSemana()) + ".")),
            botoes: [ {
                texto: "Cancelar"
            }, {
                texto: "Salvar",
                tipo: "primary",
                fn: () => {
                    Store.mut((s => {
                        s.config.provaData = data.value || "";
                        if (data.value) s.config.provaCartaoFechado = true;
                    }));
                    D.definirMetaSemana(sem.value);
                    U.toast("Prova e metas atualizadas", "ok");
                }
            } ]
        });
    }
    function boasVindas(s) {
        const passo = (feito, titulo, texto, rotulo, ir) => h("li", {
            class: feito ? "feito" : null
        }, h("div", {
            class: "grow"
        }, h("div", {
            class: "titulo"
        }, titulo), h("div", {
            class: "small muted"
        }, texto)), feito ? h("span", {
            class: "small muted",
            style: {
                paddingTop: "2px"
            }
        }, "feito") : h("button", {
            class: "btn sm",
            onclick: ir
        }, rotulo, icon("arrowRight", "sm")));
        const algumProg = Object.values(s.progresso).some((p => p && p.s > 0));
        const passos = [ {
            feito: algumProg,
            titulo: "Marque no Edital o que você já estudou",
            texto: "Cada assunto tem 5 estágios. Ao concluir a teoria, as revisões são agendadas sozinhas.",
            rotulo: "Abrir o Edital",
            ir: () => App.nav("edital")
        }, {
            feito: s.sessoes.length > 0,
            titulo: "Faça sua primeira sessão de estudo",
            texto: "Aperte o play no meio do anel: ele começa a encher na matéria da vez.",
            rotulo: "Ir ao anel",
            ir: () => document.querySelector(".palco-anel") && document.querySelector(".palco-anel").scrollIntoView({
                behavior: "smooth",
                block: "center"
            })
        } ].concat(...Encaixe.todos("painel.passos", s));
        return h("section", {
            class: "hero",
            "aria-label": "Primeiros passos"
        }, h("div", {
            style: {
                minWidth: 0
            }
        }, h("div", {
            class: "row",
            style: {
                alignItems: "baseline",
                marginBottom: "4px"
            }
        }, h("h2", null, "Primeiros passos"), h("span", {
            class: "prog"
        }, passos.filter((x => x.feito)).length + " de " + passos.length)), h("p", {
            class: "muted",
            style: {
                margin: "0 0 10px"
            }
        }, "Deixe o Arsenal pronto em uns 5 minutos. Se preferir ver tudo antes, faça o tour."), h("ol", {
            class: "steps"
        }, passos.map((x => passo(x.feito, x.titulo, x.texto, x.rotulo, x.ir))))), h("div", {
            class: "col",
            style: {
                gap: "8px",
                alignItems: "stretch"
            }
        }, h("button", {
            class: "btn primary",
            onclick: () => window.Tour && Tour.iniciar()
        }, icon("compass", "sm"), "Fazer o tour guiado"), h("button", {
            class: "btn ghost sm",
            onclick: () => Store.mut((st => {
                st.config.boasVindasVisto = true;
            }))
        }, "Dispensar este bloco")));
    }
    const DIAS_LONGOS = [ "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado" ];
    const MESES_LONGOS = [ "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro" ];
    const dataTitulo = s => {
        const d = U.parseYmd(s);
        return DIAS_LONGOS[d.getDay()] + ", " + d.getDate() + " de " + MESES_LONGOS[d.getMonth()];
    };
    function irAoCronometro() {
        let mexeu = false;
        const para = () => {
            mexeu = true;
        };
        [ "wheel", "touchstart", "keydown", "pointerdown" ].forEach((ev => window.addEventListener(ev, para, {
            once: true,
            passive: true
        })));
        const ajusta = primeira => {
            const el = document.getElementById("cronometro");
            if (!el || !el.isConnected || mexeu) return;
            const topo = (document.querySelector(".topbar") || {}).offsetHeight || 64;
            window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - topo - 14));
            if (primeira) {
                el.classList.remove("destaque-cron");
                void el.offsetWidth;
                el.classList.add("destaque-cron");
                const bt = el.querySelector(".ac-acoes button");
                if (bt) try {
                    bt.focus({
                        preventScroll: true
                    });
                } catch (e) {}
            }
        };
        [ 40, 250, 700, 1400 ].forEach(((ms, i) => setTimeout((() => ajusta(i === 0)), ms)));
    }
    function comecar(discId) {
        if (Store.s.cron.status !== "parado") return;
        if (!discId && !D.cicloAtual()) return U.toast('Monte um ciclo ou escolha uma matéria em "Sessão de estudo".', "err");
        Store.mut((st => {
            st.cron.discId = discId || null;
            st.cron.topicoId = null;
            st.cron.fixa = false;
        }), true);
        D.Cron.iniciar();
    }
    function mudarCarga(delta) {
        const atual = Store.s.config.metaDiariaMin, novo = U.clamp(atual + delta, 15, 1440);
        if (novo === atual) return;
        D.definirMetaDia(novo);
    }
    function ajustarPlano() {
        const e = D.edital(), s = Store.s;
        let blocos = D.planoDia().blocos.map((b => Object.assign({}, b)));
        let mexeu = !!(s.dia && s.dia.manual);
        const corpo = h("div", {
            class: "col"
        });
        const bm = h("select", {
            "aria-label": "Duração de cada bloco"
        }, [ 30, 45, 50, 60, 90, 120 ].map((n => h("option", {
            value: n,
            selected: n === (s.config.blocoMin || 60)
        }, fmtCarga(n)))));
        function desenha() {
            U.clear(corpo);
            const soma = blocos.reduce(((a, b) => a + (+b.min || 0)), 0);
            corpo.appendChild(h("div", {
                class: "row wrap"
            }, h("label", {
                class: "f"
            }, "Bloco adicionado à mão dura", bm), h("div", {
                class: "right",
                style: {
                    textAlign: "right"
                }
            }, h("div", {
                class: "kpi-v"
            }, fmtCarga(soma)), h("div", {
                class: "small muted"
            }, "planejadas para hoje"))));
            corpo.appendChild(h("div", {
                class: "lista"
            }, blocos.map(((b, i) => h("div", {
                class: "item"
            }, h("span", {
                class: "dot-c",
                style: {
                    background: corDe(b.discId)
                }
            }), h("select", {
                class: "grow",
                "aria-label": "Matéria do bloco " + (i + 1),
                onchange: ev => {
                    b.discId = ev.target.value;
                    mexeu = true;
                    desenha();
                }
            }, e.discs.map((d => h("option", {
                value: d.id,
                selected: d.id === b.discId
            }, d.nome)))), h("input", {
                type: "number",
                min: 10,
                max: 480,
                step: 5,
                value: b.min,
                "aria-label": "Minutos do bloco " + (i + 1),
                style: {
                    width: "84px"
                },
                onchange: ev => {
                    b.min = U.clamp(Math.round(+ev.target.value) || 10, 10, 480);
                    mexeu = true;
                    desenha();
                }
            }), h("span", {
                class: "small muted"
            }, "min"), h("button", {
                class: "btn ghost sm",
                "aria-label": "Tirar o bloco " + (i + 1),
                title: "Tirar do dia",
                onclick: () => {
                    blocos.splice(i, 1);
                    mexeu = true;
                    desenha();
                }
            }, icon("x", "sm")))))));
            corpo.appendChild(h("div", {
                class: "row wrap"
            }, h("button", {
                class: "btn",
                onclick: () => {
                    const fila = D.filaCiclo(), ja = blocos.map((b => b.discId));
                    const prox = fila.find((id => !ja.includes(id))) || fila[0] || e.discs[0].id;
                    blocos.push({
                        id: U.uid(),
                        discId: prox,
                        min: +bm.value || 60
                    });
                    mexeu = true;
                    desenha();
                }
            }, icon("plus", "sm"), "Adicionar bloco"), h("button", {
                class: "btn ghost",
                title: "Monta de novo a partir da matéria da vez no ciclo",
                onclick: () => {
                    blocos = D.montarBlocos(s.config.metaDiariaMin, []);
                    mexeu = false;
                    desenha();
                }
            }, icon("refresh", "sm"), "Refazer pelo ciclo")));
            corpo.appendChild(h("div", {
                class: "hint"
            }, mexeu ? 'Plano montado à mão: ele fica assim hoje, mesmo se você mudar o ciclo. "Refazer pelo ciclo" volta ao automático.' : 'Plano automático: cada bloco tem os minutos "por vez" da matéria no ciclo e se refaz sozinho quando você muda o ciclo ou a meta.'));
            corpo.appendChild(h("div", {
                class: "hint"
            }, "O que você estudar além do plano aparece no anel como fatia extra; nada se perde."));
        }
        desenha();
        U.modal({
            titulo: "Plano de hoje",
            largo: true,
            corpo: corpo,
            botoes: [ {
                texto: "Cancelar"
            }, {
                texto: "Salvar plano",
                tipo: "primary",
                fn: () => {
                    Store.mut((st => {
                        st.config.blocoMin = +bm.value || 60;
                    }), true);
                    const soma = D.salvarPlanoManual(blocos, mexeu);
                    U.toast("Plano de hoje salvo: " + fmtCarga(soma), "ok");
                }
            } ]
        });
    }
    function palco(root) {
        const s = Store.s;
        let est = D.diaEstado();
        const anel = Charts.anelDia({
            cor: corDe,
            nome: nomeDe,
            aoEntrar: sg => {
                marcaLinha(sg.id, true);
                if (sg.discId) Detalhe.passar(sg.discId);
            },
            aoSair: sg => {
                marcaLinha(sg.id, false);
                Detalhe.sair();
            },
            aoClicar: sg => {
                if (sg.discId) Detalhe.fixar(sg.discId);
            }
        });
        const elRot = h("div", {
            class: "ac-rot"
        }), elTempo = h("div", {
            class: "ac-tempo",
            role: "timer",
            "aria-label": "Tempo estudado hoje"
        }), elSub = h("div", {
            class: "ac-sub"
        }), elAcoes = h("div", {
            class: "ac-acoes"
        });
        const centro = h("div", {
            class: "anel-centro"
        }, elRot, elTempo, elSub, elAcoes);
        const linhas = h("div", {
            class: "blocos"
        });
        const elCarga = h("b", {
            class: "num"
        });
        let chaveAcoes = "", chaveLinhas = "", chaveFoco = "";
        function alinhar() {
            requestAnimationFrame((() => {
                const id = est.ativo || est.proximo && est.proximo.id || "";
                const el = id && linhas.querySelector('[data-id="' + id + '"]');
                linhas.scrollTop = el ? Math.max(0, el.offsetTop - 4) : 0;
            }));
        }
        function marcaLinha(id, on) {
            const l = linhas.querySelector('[data-id="' + id + '"]');
            if (l) l.classList.toggle("foco", on);
        }
        function acoes() {
            const st = est.status, vez = st === "parado" ? D.materiaDaVez() : null;
            const k = st + "|" + (vez || "");
            if (k === chaveAcoes) return;
            chaveAcoes = k;
            U.clear(elAcoes);
            if (st === "parado") {
                elAcoes.appendChild(h("button", {
                    class: "ac-play",
                    title: vez ? "Começar " + nomeDe(vez) : "Começar a estudar",
                    "aria-label": vez ? "Começar " + nomeDe(vez) : "Começar a estudar",
                    onclick: () => {
                        if (Store.s.cron.discId) D.Cron.iniciar(); else comecar(null);
                    }
                }, icon("play")));
                if (vez) elAcoes.appendChild(h("button", {
                    class: "ac-mini",
                    title: "Pular " + nomeDe(vez) + " nesta volta do ciclo",
                    "aria-label": "Pular " + nomeDe(vez),
                    onclick: () => App.pularMateria()
                }, icon("skip", "sm")));
            } else {
                elAcoes.appendChild(h("button", {
                    class: "ac-mini",
                    title: "Finalizar e salvar a sessão",
                    "aria-label": "Finalizar e salvar a sessão",
                    onclick: () => App.finalizarSessao()
                }, icon("stop", "sm")));
                elAcoes.appendChild(st === "rodando" ? h("button", {
                    class: "ac-play",
                    title: "Pausar",
                    "aria-label": "Pausar",
                    onclick: () => D.Cron.pausar()
                }, icon("pause")) : h("button", {
                    class: "ac-play",
                    title: "Continuar",
                    "aria-label": "Continuar",
                    onclick: () => D.Cron.retomar()
                }, icon("play")));
            }
        }
        function textos() {
            const st = est.status, alvo = est.planejado || s.config.metaDiariaMin;
            centro.dataset.st = st;
            if (st === "parado") {
                elRot.textContent = est.feitoTotal >= alvo && alvo ? "Meta batida" : "Hoje";
                elTempo.textContent = fmtCarga(est.feitoTotal);
                elSub.textContent = "de " + fmtCarga(alvo) + " · " + pct(est.feitoTotal, alvo) + "%";
            } else {
                const ativo = est.segs.find((x => x.id === est.ativo));
                elRot.textContent = (st === "rodando" ? "Estudando" : "Pausado") + (ativo ? " · " + (ativo.discId ? D.nomeDisc(ativo.discId) : "sem matéria") : "");
                const cc = Store.s.cron;
                if (cc.modo === "regressivo") {
                    elTempo.textContent = fmtClock(Math.max(0, cc.alvoMin * 6e4 - D.Cron.ms()) / 1e3);
                    elSub.textContent = "restam · sessão de " + fmtCarga(cc.alvoMin) + " · hoje " + fmtCarga(est.feitoTotal);
                } else {
                    elTempo.textContent = fmtClock(D.Cron.ms() / 1e3);
                    elSub.textContent = fmtCarga(est.feitoTotal) + " de " + fmtCarga(Math.max(alvo, est.total)) + " hoje";
                }
            }
            elCarga.textContent = fmtCarga(s.config.metaDiariaMin);
        }
        function desenhaLinhas() {
            const k = est.segs.map((x => x.id + ":" + x.discId + ":" + x.min)).join("|") + "#" + est.status;
            if (k !== chaveLinhas) {
                chaveLinhas = k;
                chaveFoco = "";
                U.clear(linhas);
                est.segs.forEach(((sg, i) => {
                    const l = h("div", {
                        class: "bloco",
                        style: "--i:" + i,
                        dataset: {
                            id: sg.id
                        },
                        title: "Clique para ver o desempenho por assunto",
                        onclick: sg.discId ? () => Detalhe.fixar(sg.discId) : null
                    }, h("span", {
                        class: "b-cor",
                        style: {
                            background: corDe(sg.discId)
                        }
                    }), h("div", {
                        class: "grow"
                    }, h("div", {
                        class: "b-nome ellipsis"
                    }, nomeDe(sg.discId)), h("div", {
                        class: "b-sub num"
                    })), h("div", {
                        class: "b-bar"
                    }, h("i", {
                        style: {
                            background: corDe(sg.discId)
                        }
                    })), h("div", {
                        class: "b-fim"
                    }));
                    l.addEventListener("mouseenter", (() => {
                        anel.destacar(sg.id);
                        if (sg.discId) Detalhe.passar(sg.discId);
                    }));
                    l.addEventListener("mouseleave", (() => {
                        anel.destacar(null);
                        Detalhe.sair();
                    }));
                    linhas.appendChild(l);
                }));
            }
            const idFoco = est.ativo || est.proximo && est.proximo.id || "";
            if (idFoco !== chaveFoco) {
                chaveFoco = idFoco;
                alinhar();
            }
            est.segs.forEach((sg => {
                const l = linhas.querySelector('[data-id="' + sg.id + '"]');
                if (!l) return;
                const ativo = est.ativo === sg.id;
                l.classList.toggle("ativo", ativo);
                l.classList.toggle("ok", sg.ok);
                l.classList.toggle("extra", sg.extra);
                l.querySelector(".b-sub").textContent = sg.extra ? fmtMin(sg.feito) + " além do plano" : sg.feito > sg.min + .5 ? fmtMin(sg.feito) + " · passou " + fmtMin(sg.feito - sg.min) + " do bloco" : fmtMin(sg.feito) + " de " + fmtMin(sg.min);
                l.querySelector(".b-bar > i").style.width = Math.min(100, sg.tam ? sg.feito / sg.tam * 100 : 0) + "%";
                const fim = l.querySelector(".b-fim"), estado = ativo ? "agora" : sg.ok ? "ok" : sg.extra ? "extra" : est.status === "parado" ? "play" : "";
                if (fim.dataset.e !== estado) {
                    fim.dataset.e = estado;
                    U.clear(fim);
                    if (estado === "agora") fim.appendChild(h("span", {
                        class: "agora"
                    }, h("i"), est.status === "pausado" ? "pausado" : "agora")); else if (estado === "ok") fim.appendChild(h("span", {
                        class: "feito",
                        title: "Bloco concluído"
                    }, icon("check", "sm"))); else if (estado === "extra") fim.appendChild(h("span", {
                        class: "tiny muted"
                    }, "extra")); else if (estado === "play") fim.appendChild(h("button", {
                        class: "btn ghost sm b-play",
                        "aria-label": "Estudar " + nomeDe(sg.discId) + " agora",
                        title: "Estudar esta agora",
                        onclick: ev => {
                            ev.stopPropagation();
                            comecar(sg.discId);
                        }
                    }, icon("play", "sm")));
                }
            }));
        }
        function pinta() {
            anel.atualizar(est);
            textos();
            acoes();
            desenhaLinhas();
        }
        if (root.classList.contains("entrar")) anel.entrar();
        pinta();
        clearInterval(pulsoId);
        pulsoId = setInterval((() => {
            if (!anel.el.isConnected) return clearInterval(pulsoId);
            if (Store.s.cron.status === "parado" || document.hidden) return;
            est = D.diaEstado();
            pinta();
        }), 1e3);
        const vazio = !est.segs.length;
        return h("section", {
            class: "palco",
            id: "cronometro",
            "aria-label": "Cronômetro e plano de hoje"
        }, h("div", {
            class: "palco-anel"
        }, anel.el, centro), h("div", {
            class: "palco-plano"
        }, h("div", {
            class: "plano-h"
        }, h("h2", null, "Plano de hoje"), h("div", {
            class: "carga",
            role: "group",
            "aria-label": "Carga horária de hoje"
        }, h("button", {
            "aria-label": "Menos 30 minutos",
            title: "Menos 30 min",
            onclick: () => mudarCarga(-30)
        }, "−"), elCarga, h("button", {
            "aria-label": "Mais 30 minutos",
            title: "Mais 30 min",
            onclick: () => mudarCarga(30)
        }, "+")), h("button", {
            class: "btn ghost sm",
            onclick: ajustarPlano
        }, icon("edit", "sm"), "Ajustar")), vazio ? h("div", {
            class: "empty"
        }, h("div", null, "Seu ciclo está vazio, então ainda não há blocos para hoje."), h("button", {
            class: "btn primary",
            style: {
                marginTop: "12px"
            },
            onclick: () => App.nav("ciclo")
        }, "Montar meu ciclo", icon("arrowRight", "sm"))) : linhas, vazio ? null : h("div", {
            class: "plano-dica"
        }, "Passe o mouse numa fatia ou num bloco para abrir o desempenho por assunto. Estudou a mais? O anel abre espaço sozinho.")));
    }
    function fato(valor, rotulo, extra, aoClicar, n, cor) {
        return h("div", {
            class: "fato" + (aoClicar ? " clicavel" : ""),
            style: cor ? "--fc:" + cor : null,
            onclick: aoClicar || null
        }, h("b", {
            "data-count": n != null ? n : null
        }, valor), h("span", null, rotulo), extra ? h("small", null, extra) : null);
    }
    function secDesempenho() {
        const e = D.edital(), desemp = D.desempenho(periodo);
        const dados = e.discs.filter((d => desemp[d.id] && desemp[d.id].feitas > 0)).map((d => ({
            id: d.id,
            rotulo: d.nome,
            cor: D.corDisc(d.id),
            feitas: desemp[d.id].feitas,
            pct: pct(desemp[d.id].acertos, desemp[d.id].feitas)
        })));
        const tot = Object.values(desemp).reduce(((a, x) => ({
            f: a.f + x.feitas,
            a: a.a + x.acertos
        })), {
            f: 0,
            a: 0
        });
        const sel = h("select", {
            "aria-label": "Período",
            onchange: ev => {
                periodo = +ev.target.value;
                V.refresh();
            }
        }, [ 7, 14, 30, 90 ].map((n => h("option", {
            value: n,
            selected: n === periodo
        }, "Últimos " + n + " dias"))));
        const status = Encaixe.um("painel.desempenho.status") || null;
        let corpo;
        if (!dados.length) {
            corpo = h("div", {
                class: "vazio-largo"
            }, Charts.rosa([], {
                centro: "—",
                sub: "sem questões"
            }), h("div", null, h("h3", null, "Seu desempenho aparece aqui"), h("p", {
                class: "muted"
            }, U.txt("painel.desempenhoVazio", "Registre as questões que você resolve (uma a uma ou em lote) e o desempenho aparece aqui: o gráfico mostra uma fatia por matéria; ao passar o mouse, abre o detalhe por assunto.")), h("div", {
                class: "row wrap"
            }, Encaixe.todos("painel.desempenho.botoes"), h("button", {
                class: Encaixe.tem("painel.desempenho.botoes") ? "btn ghost" : "btn",
                onclick: () => App.nav("questoes")
            }, U.txt("painel.registrar", "Registrar questões")))));
        } else {
            const fracos = [];
            dados.forEach((d => D.desempenhoAssuntos(d.id, periodo).forEach((a => {
                if (a.feitas >= 3 && a.chave !== "—") fracos.push(Object.assign({
                    discId: d.id
                }, a));
            }))));
            fracos.sort(((a, b) => a.pct - b.pct || b.feitas - a.feitas));
            const tom = p => p >= 75 ? "bom" : p >= 50 ? "meio" : "ruim";
            const porMateria = dados.slice().sort(((a, b) => b.feitas - a.feitas));
            corpo = h("div", {
                class: "desemp"
            }, h("div", {
                class: "desemp-geral"
            }, Charts.anel(tot.f ? tot.a / tot.f : 0, {
                tam: 190,
                esp: 18,
                cor: "var(--c-laranja)",
                texto: pct(tot.a, tot.f) + "%",
                sub: "de acerto",
                rotulo: "Acerto geral"
            }), h("div", {
                class: "desemp-kv"
            }, h("div", null, h("b", {
                class: "bom"
            }, String(tot.a)), h("span", null, "acertos")), h("div", null, h("b", {
                class: "ruim"
            }, String(tot.f - tot.a)), h("span", null, "erros")))), h("div", null, h("h3", null, "Por matéria"), h("div", {
                class: "dmat-lista"
            }, porMateria.map((d => {
                const l = h("div", {
                    class: "dmat",
                    onclick: () => Detalhe.fixar(d.id),
                    title: d.rotulo + ": " + d.pct + "% de acerto em " + d.feitas + " questões"
                }, h("div", {
                    class: "nm"
                }, h("span", {
                    class: "dot-c",
                    style: {
                        background: d.cor
                    }
                }), h("span", null, d.rotulo)), h("div", {
                    class: "trilho"
                }, h("i", {
                    style: {
                        width: Math.max(3, d.pct) + "%",
                        background: d.cor
                    }
                })), h("div", {
                    class: "val"
                }, h("b", {
                    class: "nota " + tom(d.pct)
                }, d.pct + "%"), h("small", null, d.feitas + " questões")));
                l.addEventListener("mouseenter", (() => Detalhe.passar(d.id)));
                l.addEventListener("mouseleave", (() => Detalhe.sair()));
                return l;
            })))), h("div", {
                class: "desemp-fracos"
            }, h("h3", null, "Onde você mais erra"), fracos.length ? h("div", {
                class: "fracos-grade"
            }, fracos.slice(0, 6).map((a => {
                const l = h("div", {
                    class: "fraco-card",
                    onclick: () => Detalhe.fixar(a.discId)
                }, h("span", {
                    class: "dot-c",
                    style: {
                        background: D.corDisc(a.discId)
                    }
                }), h("div", {
                    class: "grow"
                }, h("div", {
                    class: "ellipsis",
                    style: {
                        fontWeight: 600
                    }
                }, a.rotulo), h("div", {
                    class: "tiny muted ellipsis"
                }, D.nomeDisc(a.discId) + " · " + a.acertos + " de " + a.feitas)), h("b", {
                    class: "num nota " + tom(a.pct)
                }, a.pct + "%"));
                l.addEventListener("mouseenter", (() => Detalhe.passar(a.discId)));
                l.addEventListener("mouseleave", (() => Detalhe.sair()));
                return l;
            }))) : h("p", {
                class: "muted small"
            }, "Quando um assunto tiver pelo menos 3 questões respondidas, os de menor acerto aparecem aqui.")));
        }
        return h("section", {
            class: "sec"
        }, h("header", {
            class: "sec-h"
        }, h("h2", null, "Desempenho em questões"), h("div", {
            class: "right"
        }, sel)), corpo, status);
    }
    function mini(cor, grafico, valor, rotulo, sub, aoClicar) {
        return h("div", {
            class: "mini" + (aoClicar ? " clicavel" : ""),
            style: "--mc:" + cor,
            onclick: aoClicar || null,
            title: rotulo + ": " + valor + (sub ? " · " + sub : "")
        }, h("div", {
            class: "mini-g"
        }, grafico), h("div", {
            class: "mini-t"
        }, h("b", null, valor), h("span", null, rotulo), sub ? h("small", null, sub) : null));
    }
    function secTempo() {
        const ses = D.sessoesNoPeriodo(periodo);
        const por = {};
        ses.forEach((x => {
            const k = x.discId || "—";
            por[k] = (por[k] || 0) + x.seg / 60;
        }));
        const arr = Object.entries(por).map((([k, v]) => ({
            rotulo: k === "—" ? "Sem matéria" : nomeDe(k),
            valor: v,
            cor: k === "—" ? "#8a9099" : corDe(k),
            id: k
        }))).sort(((a, b) => b.valor - a.valor));
        const total = arr.reduce(((a, x) => a + x.valor), 0);
        const top = arr.slice(0, 10), maxV = top.length ? top[0].valor : 1;
        const linhasT = lista => Charts.hbarras(lista.map((x => ({
            rotulo: x.rotulo,
            cor: x.cor,
            valor: x.valor,
            texto: fmtHoras(x.valor) + " · " + pct(x.valor, total) + "%",
            dica: x.rotulo + ": " + fmtMin(x.valor)
        }))), {
            max: maxV,
            fmt: fmtHoras
        });
        const dpPer = new Set(ses.map((x => x.data))).size;
        return h("section", {
            class: "sec"
        }, h("header", {
            class: "sec-h"
        }, h("h2", null, "Para onde foi o tempo"), h("span", {
            class: "right small muted"
        }, "últimos " + periodo + ' dias · mude o período em "Desempenho em questões"')), arr.length ? h("div", {
            class: "tempo2"
        }, h("div", {
            class: "tempo-topo"
        }, h("div", {
            class: "tt-num"
        }, fmtHoras(total), h("small", null, U.plural(dpPer, "dia com estudo", "dias com estudo") + " · " + U.plural(ses.length, "sessão", "sessões"))), h("div", {
            class: "pilha",
            role: "img",
            "aria-label": "Divisão do tempo por matéria"
        }, arr.map((x => h("i", {
            style: "flex:" + x.valor + " 1 0;background:" + x.cor,
            title: x.rotulo + ": " + fmtHoras(x.valor) + " · " + pct(x.valor, total) + "%"
        }))))), h("div", {
            class: "tempo-colunas"
        }, linhasT(top.slice(0, 5)), top.length > 5 ? linhasT(top.slice(5)) : null)) : h("div", {
            class: "empty"
        }, "Sem sessões no período. Inicie o cronômetro no anel do dia para ver este gráfico."));
    }
    V.painel = function(root, params) {
        const s = Store.s, e = D.edital(), hoje = ymd();
        const meta = s.config.metaDiariaMin;
        const mpd = D.minutosPorDia(), minDe = d => mpd[d] || 0;
        const ses = D.sessoesNoPeriodo(14);
        const minPer = ses.reduce(((a, x) => a + x.seg / 60), 0);
        const venc = D.revisoesVencidas(), cards = D.cardsDevidos();
        const allProg = e.discs.filter((d => d.ciclo !== false)).map((d => ({
            d: d,
            p: D.progressoDe(d)
        })));
        const folhasTot = allProg.reduce(((a, x) => a + x.p.total), 0), concl = allProg.reduce(((a, x) => a + x.p.concluido), 0);
        const sem = D.minSemana(), metaSem = D.metaSemana(), dp = D.diasParaProva();
        const d14 = dias(14), d7 = dias(7), cap = D.respostasHoje(), seq = D.sequenciaDias();
        const acerto30 = Object.values(D.desempenho(30)).reduce(((a, x) => ({
            f: a.f + x.feitas,
            a: a.a + x.acertos
        })), {
            f: 0,
            a: 0
        });
        const nome = String(s.perfil && s.perfil.nome || "").trim();
        const minTotal = s.sessoes.reduce(((a, x) => a + x.seg / 60), 0);
        const lembrarBackup = window.Backup && Backup.suportado && !Backup.configurado && minTotal >= 120 && Date.now() - (s.config.backupLembreteEm || 0) > 7 * 864e5;
        root.appendChild(h("div", {
            class: "page painel"
        }, h("div", {
            class: "page-head"
        }, h("div", null, h("span", {
            class: "eyebrow"
        }, e.ed.nome + (e.ed.banca ? " · " + e.ed.banca : "")), h("h1", null, dataTitulo(hoje)), h("div", {
            class: "sub"
        }, (nome && nome !== "Concurseiro" ? "Bons estudos, " + nome + ". " : "") + (dp != null && dp >= 0 ? dp === 0 ? "A prova é hoje." : "Faltam " + U.plural(dp, "dia", "dias") + " para a prova." : ""))), h("div", {
            class: "minis",
            "aria-label": "Resumo em gráficos"
        }, mini("var(--c-azul)", Charts.anel(metaSem ? sem / metaSem : sem / Math.max(1, meta * 7), {
            tam: 56,
            esp: 8,
            cor: "var(--c-azul)",
            texto: "",
            rotulo: "Meta da semana"
        }), fmtHoras(sem), "na semana", metaSem ? pct(sem, metaSem) + "% da meta" : "sem meta semanal", definirProva), mini("var(--c-verde)", Charts.miniBarras(d7.map(minDe), "var(--c-verde)", {
            w: 84,
            h: 44,
            corUltimo: "var(--amber-bar)"
        }), fmtHoras(d7.reduce(((a, d) => a + minDe(d)), 0)), "7 dias", "hoje em amarelo", (() => App.nav("estatisticas"))), mini("var(--c-roxo)", Charts.anel(folhasTot ? concl / folhasTot : 0, {
            tam: 56,
            esp: 8,
            cor: "var(--c-roxo)",
            texto: "",
            rotulo: "Edital concluído"
        }), pct(concl, folhasTot) + "%", "do edital", concl + " de " + folhasTot, (() => App.nav("edital"))), mini("var(--c-laranja)", Charts.anel(acerto30.f ? acerto30.a / acerto30.f : 0, {
            tam: 56,
            esp: 8,
            cor: "var(--c-laranja)",
            texto: "",
            rotulo: "Acerto em questões"
        }), acerto30.f ? pct(acerto30.a, acerto30.f) + "%" : "—", "de acerto", acerto30.f ? U.plural(acerto30.f, "questão", "questões") + " em 30 dias" : "sem questões ainda", (() => App.nav("questoes"))))), !s.config.boasVindasVisto && s.sessoes.length < 3 ? boasVindas(s) : null, h("div", {
            class: "estudar-agora"
        }, h("button", {
            class: "btn primary lg",
            onclick: () => Foco.abrir()
        }, icon("play", "sm"), window.Foco && Foco.emPausa ? "Voltar à pausa" : "Estudar agora"), h("span", {
            class: "small muted"
        }, window.Foco && Foco.emPausa ? "Pausa do foco guiado: rodada " + Foco.estado.rodada + " de " + Foco.estado.r + " concluída. A próxima começa quando você quiser." : window.Foco && Foco.ativo ? "Foco guiado em andamento: rodada " + Foco.estado.rodada + " de " + Foco.estado.r + "." : "Foco guiado com som, cronômetro e pausas. Ou use o relógio abaixo."), h("button", {
            class: "btn ghost sm",
            onclick: () => App.nav("simulado")
        }, icon("target", "sm"), "Fazer um simulado")), palco(root), h("div", {
            class: "fatos"
        }, fato(String(seq), seq === 1 ? "dia seguido" : "dias seguidos", "recorde " + D.melhorSequencia(), null, seq, "var(--c-laranja)"), fato(fmtHoras(sem), "nesta semana", metaSem ? pct(sem, metaSem) + "% da meta de " + fmtHoras(metaSem) : "sem meta semanal", definirProva, null, "var(--c-azul)"), fato(String(cap.total), cap.total === 1 ? "questão hoje" : "questões hoje", cap.total ? pct(cap.acertos, cap.total) + "% de acerto" : "nenhuma ainda", null, cap.total, "var(--c-verde)"), fato(String(venc.length + cards.length), "revisões para hoje", U.plural(venc.length, "assunto", "assuntos") + " · " + U.plural(cards.length, "flashcard", "flashcards"), (() => App.nav("revisoes")), venc.length + cards.length, "var(--c-rosa)"), fato(pct(concl, folhasTot) + "%", "do edital concluído", concl + " de " + folhasTot + " assuntos", (() => App.nav("edital")), null, "var(--c-roxo)"), fato(dp == null ? "—" : dp < 0 ? "0" : String(dp), dp === 1 ? "dia para a prova" : "dias para a prova", dp == null ? "definir a data" : U.fmtDataLonga(s.config.provaData), definirProva, dp != null && dp >= 0 ? dp : null, "var(--c-ciano)")), Cronometro.painelSessao(), lembrarBackup ? h("div", {
            class: "aviso-linha"
        }, icon("shield"), h("div", {
            class: "grow"
        }, h("b", null, "Você já tem " + fmtHoras(minTotal) + " de estudo registradas."), " Elas ficam só neste computador. Escolha uma pasta do OneDrive, Dropbox ou Google Drive e o Arsenal passa a salvar uma cópia lá sozinho."), h("button", {
            class: "btn primary",
            onclick: () => Backup.escolherPasta()
        }, "Escolher pasta"), h("button", {
            class: "btn ghost sm",
            onclick: () => Store.mut((st => {
                st.config.backupLembreteEm = Date.now();
            }))
        }, "Agora não")) : null, h("section", {
            class: "sec"
        }, h("header", {
            class: "sec-h"
        }, h("h2", null, "Ritmo"), h("span", {
            class: "right small muted"
        }, "últimos 14 dias · hoje em amarelo · linha = meta")), h("div", {
            class: "ritmo"
        }, h("div", null, Charts.barras(d14.map((d => ({
            rotulo: d.slice(8),
            valor: +(minDe(d) / 60).toFixed(2),
            dica: U.fmtData(d) + ": " + fmtMin(minDe(d))
        }))), {
            fmt: fmtHoraEixo,
            meta: meta / 60,
            h: 210,
            destacarUltimo: true,
            cor: "var(--c-azul)"
        }), h("div", {
            class: "mini-kv"
        }, h("div", null, h("b", null, String(ses.length)), h("span", null, "sessões em 14 dias")), h("div", null, h("b", null, fmtMin(Math.max(0, ...d14.map(minDe)))), h("span", null, "melhor dia")), h("div", null, h("b", null, fmtMin(minPer / 14)), h("span", null, "média por dia")))), h("div", null, h("h3", null, "Presença"), Charts.presenca(mpd, {
            semanas: 22,
            meta: meta
        })))), Resumo.cartao(), secDesempenho(), secTempo(), h("section", {
            class: "sec"
        }, h("header", {
            class: "sec-h"
        }, h("h2", null, "Revisões de hoje"), h("a", {
            class: "right small",
            href: "#/revisoes"
        }, "ver todas")), listaRevisoes(venc.slice(0, 6), cards.length)), h("section", {
            class: "sec"
        }, h("header", {
            class: "sec-h"
        }, h("h2", null, "Edital por matéria"), h("a", {
            class: "right small",
            href: "#/edital"
        }, "abrir edital")), h("div", {
            class: "materias"
        }, allProg.map((({d: d, p: p}) => {
            const m = h("div", {
                class: "mat",
                onclick: () => Detalhe.fixar(d.id)
            }, Charts.anel(p.pct / 100, {
                tam: 40,
                esp: 5,
                cor: D.corDisc(d.id),
                texto: "",
                rotulo: d.curto
            }), h("div", {
                class: "grow"
            }, h("div", {
                class: "ellipsis",
                style: {
                    fontWeight: 600
                }
            }, d.curto), h("div", {
                class: "tiny muted num"
            }, p.pct + "% · " + p.concluido + " de " + p.total)));
            return m;
        }))))));
        if (params && (params.ir === "cronometro" || params.ir === "sessao") && root.classList.contains("entrar")) irAoCronometro();
    };
    function listaRevisoes(lista, nCards) {
        if (!lista.length && !nCards) return h("div", {
            class: "empty"
        }, icon("check", "lg"), h("div", null, "Nada para revisar hoje."));
        return h("div", {
            class: "lista"
        }, lista.map((r => h("div", {
            class: "item"
        }, h("span", {
            class: "dot-c",
            style: {
                background: D.corDisc(r.discId)
            }
        }), h("div", {
            class: "grow"
        }, h("div", {
            class: "ellipsis",
            style: {
                fontWeight: 600
            }
        }, D.rotuloTopico(r.refId) || r.refId), h("div", {
            class: "tiny muted"
        }, D.nomeDisc(r.discId) + " · " + (r.due < ymd() ? "atrasada desde " : "") + U.fmtData(r.due))), h("button", {
            class: "btn sm soft",
            onclick: () => {
                const id = D.concluirRevisao(r.id);
                const prox = Store.s.revisoes.find((x => x.origem === id));
                U.toast("Revisão concluída." + (prox ? " Próxima: " + U.fmtData(prox.due) + "." : ""), "ok", {
                    acao: "Desfazer",
                    fn: () => D.desfazerRevisao(id)
                });
            }
        }, icon("check", "sm"), "Revisei")))), nCards ? h("div", {
            class: "item"
        }, h("button", {
            class: "btn soft",
            onclick: () => App.nav("flashcards")
        }, icon("cards", "sm"), U.plural(nCards, "flashcard", "flashcards") + " para revisar")) : null);
    }
})();