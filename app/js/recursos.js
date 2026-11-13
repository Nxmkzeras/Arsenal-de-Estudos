(function() {
    "use strict";
    const {h: h, icon: icon, fmtMin: fmtMin, ymd: ymd, uid: uid, pct: pct, addDays: addDays} = U;
    const V = window.Views = window.Views || {};
    const fmtH = m => {
        m = Math.round(m || 0);
        return m >= 60 ? Math.floor(m / 60) + "h" + String(m % 60).padStart(2, "0") : m + " min";
    };
    const clock = seg => {
        seg = Math.max(0, Math.round(seg));
        const hh = Math.floor(seg / 3600), mm = Math.floor(seg % 3600 / 60), ss = seg % 60;
        return (hh ? hh + ":" + String(mm).padStart(2, "0") : String(mm)) + ":" + String(ss).padStart(2, "0");
    };
    const cfg = () => Store.s.config;
    const bip = () => {
        try {
            Cronometro.beep();
        } catch (e) {}
    };
    const RITMOS = [ {
        id: "pomo",
        nome: "Pomodoro clássico",
        desc: "25 min de foco + 5 de pausa, 4 rodadas e pausa longa de 15",
        f: 25,
        p: 5,
        l: 15,
        r: 4
    }, {
        id: "m50",
        nome: "Foco médio",
        desc: "50 min de foco + 10 de pausa, 3 rodadas e pausa longa de 20",
        f: 50,
        p: 10,
        l: 20,
        r: 3
    }, {
        id: "m90",
        nome: "Foco profundo",
        desc: "90 min de foco + 15 de pausa, 2 rodadas",
        f: 90,
        p: 15,
        l: 30,
        r: 2
    } ];
    let pausaTimer = null;
    const GRACA_PAUSA = 30 * 6e4;
    const Foco = {
        _modalPausa: null,
        get estado() {
            const f = cfg().foco;
            if (!f || !f.ativo) return null;
            const c = Store.s.cron;
            if (c.status !== "parado" && c.focoSid && c.focoSid === f.sid) return f;
            if (f.pausaAte && Date.now() < f.pausaAte) return f;
            return null;
        },
        get ativo() {
            return !!this.estado;
        },
        get emPausa() {
            const f = this.estado;
            return !!(f && f.pausaFim && Store.s.cron.status === "parado");
        },
        abrir() {
            if (Store.s.cron.status !== "parado") {
                U.toast("Há uma sessão em andamento. Finalize-a no Painel antes de começar outra.", "err", {
                    acao: "Ir ao Painel",
                    fn: () => App.cronometro()
                });
                return;
            }
            if (this.emPausa) {
                this.pausa();
                return;
            }
            const e = D.edital(), ciclo = D.cicloEstado();
            const u = cfg().focoUltimo || {};
            const rit = h("select", null, RITMOS.map((r => h("option", {
                value: r.id,
                selected: r.id === (u.ritmo || "pomo")
            }, r.nome + " · " + r.desc))));
            const disc = h("select", null, h("option", {
                value: ""
            }, "↻ Seguir o ciclo" + (ciclo.atual ? " (agora: " + D.nomeDisc(ciclo.atual.discId) + ")" : "")), e.discs.map((d => h("option", {
                value: d.id,
                selected: d.id === u.disc
            }, d.nome))));
            const top = h("select", {
                "aria-label": "Assunto do edital (opcional)"
            });
            const preencheTop = () => {
                U.clear(top);
                top.appendChild(h("option", {
                    value: ""
                }, "(sem assunto específico)"));
                const dsel = e.disc[disc.value];
                top.disabled = !dsel;
                if (dsel) {
                    const walk = (ns, n) => ns.forEach((t => {
                        top.appendChild(h("option", {
                            value: t.id,
                            selected: t.id === u.topico
                        }, "  ".repeat(n) + (n ? "↳ " : "") + t.num + " " + t.texto.slice(0, 80)));
                        walk(t.filhos || [], n + 1);
                    }));
                    walk(dsel.topicos, 0);
                }
            };
            disc.addEventListener("change", preencheTop);
            preencheTop();
            const tipo = h("select", null, Object.entries(D.TIPOS).filter((([k]) => k !== "simulado")).map((([k, nm]) => h("option", {
                value: k,
                selected: k === (u.tipo || "teoria")
            }, nm))));
            const som = h("select", null, h("option", {
                value: ""
            }, "Sem som"), Sons.combos.map(((c, i) => h("option", {
                value: "c" + i,
                selected: u.som === "c" + i
            }, "Combo: " + c.nome + " (" + c.desc + ")"))), Sons.catalogo.map((c => h("option", {
                value: "s:" + c.id,
                selected: u.som === "s:" + c.id
            }, c.nome))));
            const exe = window.arsenalExe;
            const mini = exe && exe.mini ? h("input", {
                type: "checkbox",
                checked: !!u.mini
            }) : null;
            const desenho = exe && exe.desenho ? h("input", {
                type: "checkbox",
                checked: !!u.desenho
            }) : null;
            U.modal({
                titulo: "Estudar agora",
                largo: true,
                corpo: h("div", {
                    class: "col"
                }, h("p", {
                    class: "muted small"
                }, "Você escolhe e o Arsenal conduz: liga o cronômetro, o som, avisa a hora da pausa e emenda a próxima rodada. Cada rodada de foco vira uma sessão salva."), h("label", {
                    class: "f"
                }, "Ritmo", rit), h("div", {
                    class: "grid g2"
                }, h("label", {
                    class: "f"
                }, "Matéria", disc), h("label", {
                    class: "f"
                }, "Assunto (opcional)", top)), h("div", {
                    class: "grid g2"
                }, h("label", {
                    class: "f"
                }, "O que você vai fazer", tipo), h("label", {
                    class: "f"
                }, "Som de fundo", som)), mini ? h("label", {
                    class: "row small"
                }, mini, " Cronômetro fixo no canto da tela") : null, desenho ? h("label", {
                    class: "row small"
                }, desenho, " Abrir a camada de desenho (Alt+Shift+D mostra e esconde)") : null),
                botoes: [ {
                    texto: "Cancelar"
                }, {
                    texto: "Começar",
                    tipo: "primary",
                    fn: () => {
                        const r = RITMOS.find((x => x.id === rit.value)) || RITMOS[0];
                        const topico = disc.value && top.value || null;
                        const ult = {
                            ritmo: r.id,
                            disc: disc.value,
                            topico: topico,
                            tipo: tipo.value,
                            som: som.value,
                            mini: !!(mini && mini.checked),
                            desenho: !!(desenho && desenho.checked)
                        };
                        const sid = uid();
                        Store.mut((s => {
                            s.config.focoUltimo = ult;
                            s.config.foco = {
                                sid: sid,
                                ativo: true,
                                ritmo: r.id,
                                f: r.f,
                                p: r.p,
                                l: r.l,
                                r: r.r,
                                rodada: 1,
                                disc: disc.value || null,
                                topico: topico,
                                tipo: tipo.value,
                                som: som.value,
                                feitos: 0,
                                seg: 0
                            };
                        }), true);
                        if (!D.Cron.preparar({
                            discId: disc.value || null,
                            fixa: !!disc.value,
                            topicoId: topico,
                            tipo: tipo.value,
                            modo: "regressivo",
                            alvoMin: r.f
                        })) {
                            Store.mut((s => {
                                s.config.foco = null;
                            }), true);
                            return false;
                        }
                        Store.mut((s => {
                            s.cron.focoSid = sid;
                        }), true);
                        D.Cron.iniciar();
                        Foco.tocaSom(true);
                        if (mini && mini.checked) exe.mini.abrir();
                        if (desenho && desenho.checked) exe.desenho.abrir();
                        App.cronometro();
                        U.toast("Foco começou: rodada 1 de " + r.r + " (" + r.f + " min).", "ok");
                    }
                } ]
            });
        },
        tocaSom(liga) {
            const f = this.estado;
            if (!f || !f.som) return;
            try {
                if (!liga) {
                    Sons.pausar();
                    return;
                }
                if (f.som[0] === "c") Sons.combo(Sons.combos[+f.som.slice(1)]); else Sons.alternar(f.som.slice(2), true);
                if (!Sons.tocando) Sons.tocar();
            } catch (e) {}
        },
        fimRodada() {
            const f = this.estado;
            if (!f || Store.s.cron.focoSid !== f.sid) return false;
            bip();
            const d = D.Cron.dados(), seg = Math.max(60, d.seg);
            let ses = null;
            try {
                ses = D.addSessao({
                    discId: d.discId,
                    topicoId: d.topicoId || null,
                    tipo: d.tipo || f.tipo || "teoria",
                    seg: seg,
                    ini: new Date(d.ini).toISOString(),
                    nota: "Foco guiado, rodada " + f.rodada + " de " + f.r,
                    fonte: "foco"
                });
            } catch (e) {}
            const ultima = f.rodada >= f.r, min = ultima ? f.l : f.p;
            Store.mut((st => {
                const o = st.config.foco;
                if (!o) return;
                o.feitos++;
                o.seg += seg;
                o.ultima = ultima;
                o.pausaFim = Date.now() + min * 6e4;
                o.pausaAte = o.pausaFim + GRACA_PAUSA;
                o.rodadaQ = {
                    rodada: o.rodada,
                    discId: d.discId || null,
                    topicoId: d.topicoId || null,
                    data: ses ? ses.data : ymd(),
                    salvo: false
                };
            }), true);
            D.Cron.descartar();
            Store.mut((st => {
                st.cron.focoSid = null;
            }), true);
            this.tocaSom(false);
            this.pausa();
            return true;
        },
        pausa() {
            const f = this.estado;
            if (!f || !f.pausaFim) return;
            const ultima = !!f.ultima, rq = f.rodadaQ;
            const resta = () => Math.round((f.pausaFim - Date.now()) / 1e3);
            const rot = h("div", {
                class: "foco-clock num"
            }, clock(Math.max(0, resta())));
            const msg = h("div", {
                class: "muted"
            }, ultima ? "Você completou as " + f.r + " rodadas! Pausa longa: levante, beba água, descanse a vista." : "Rodada " + f.rodada + " de " + f.r + " salva (" + fmtH(f.seg / 60) + " até agora). Pausa curta: levante, respire, olhe longe.");
            const qf = h("input", {
                type: "number",
                min: 0,
                inputmode: "numeric",
                placeholder: "0",
                "aria-label": "Questões feitas nesta rodada"
            });
            const qa = h("input", {
                type: "number",
                min: 0,
                inputmode: "numeric",
                placeholder: "0",
                "aria-label": "Acertos nesta rodada"
            });
            const salvarQ = () => {
                if (!rq || rq.salvo) return;
                const feitas = Math.max(0, Math.round(+qf.value || 0)), acertos = Math.min(feitas, Math.max(0, Math.round(+qa.value || 0)));
                if (!feitas) return;
                Store.mut((s => {
                    rq.salvo = true;
                    s.registrosQ.push({
                        id: uid(),
                        data: rq.data,
                        discId: rq.discId,
                        topicoId: rq.topicoId,
                        feitas: feitas,
                        acertos: acertos
                    });
                }));
                U.toast(U.plural(feitas, "questão registrada", "questões registradas") + " (" + pct(acertos, feitas) + "% de acerto).", "ok");
            };
            const blocoQ = rq && !rq.salvo ? h("div", {
                class: "grid g2",
                style: {
                    textAlign: "left",
                    marginTop: "6px"
                }
            }, h("label", {
                class: "f"
            }, "Questões feitas nesta rodada (opcional)", qf), h("label", {
                class: "f"
            }, "Acertos", qa)) : null;
            const fimDaPausa = () => {
                rot.textContent = "0:00";
                msg.textContent = ultima ? "Fim da pausa longa. Bom trabalho!" : "A pausa acabou. Pronto para a rodada " + (f.rodada + 1) + "?";
            };
            if (this._modalPausa) this._modalPausa.close();
            this._modalPausa = U.modal({
                titulo: ultima ? "Pausa longa" : "Pausa",
                largo: false,
                corpo: h("div", {
                    class: "col",
                    style: {
                        textAlign: "center"
                    }
                }, msg, rot, blocoQ),
                aoFechar: () => {
                    clearInterval(pausaTimer);
                    Foco._modalPausa = null;
                    salvarQ();
                    V.refresh();
                },
                botoes: [ {
                    texto: "Encerrar o foco",
                    tipo: "danger",
                    fn: () => {
                        salvarQ();
                        Foco.encerrar();
                    }
                }, {
                    texto: ultima ? "Terminar" : "Começar a rodada " + (f.rodada + 1),
                    tipo: "primary",
                    fn: () => {
                        salvarQ();
                        if (ultima) Foco.encerrar(); else Foco.proximaRodada();
                    }
                } ]
            });
            clearInterval(pausaTimer);
            let avisou = resta() <= 0;
            if (avisou) fimDaPausa();
            pausaTimer = setInterval((() => {
                if (!rot.isConnected) {
                    clearInterval(pausaTimer);
                    return;
                }
                const r = resta();
                if (r > 0) {
                    rot.textContent = clock(r);
                    return;
                }
                if (!avisou) {
                    avisou = true;
                    bip();
                    fimDaPausa();
                    if (window.Notification && Notification.permission === "granted") {
                        try {
                            new Notification("Arsenal de Estudos", {
                                body: "A pausa acabou."
                            });
                        } catch (e) {}
                    }
                }
            }), 500);
        },
        proximaRodada() {
            const f = this.estado;
            if (!f) return;
            if (!D.Cron.preparar({
                discId: f.disc,
                fixa: !!f.disc,
                topicoId: f.topico || null,
                tipo: f.tipo || "teoria",
                modo: "regressivo",
                alvoMin: f.f
            })) return;
            Store.mut((s => {
                const o = s.config.foco;
                if (o) {
                    o.rodada++;
                    o.pausaAte = 0;
                    o.pausaFim = 0;
                }
                s.cron.focoSid = f.sid;
            }), true);
            D.Cron.iniciar();
            Foco.tocaSom(true);
            App.cronometro();
            U.toast("Rodada " + f.rodada + " de " + f.r + " começou.", "ok");
        },
        pularPausa() {
            const f = this.estado;
            if (!f || !this.emPausa) return;
            if (this._modalPausa) this._modalPausa.close();
            if (f.ultima) this.encerrar(); else this.proximaRodada();
        },
        encerrar() {
            const f = this.estado;
            Store.mut((s => {
                s.config.foco = null;
            }), true);
            this.tocaSom(false);
            if (f && f.feitos) U.toast("Foco encerrado: " + f.feitos + (f.feitos === 1 ? " rodada" : " rodadas") + ", " + fmtH(f.seg / 60) + " de estudo.", "ok");
            V.refresh();
        }
    };
    (function() {
        const orig = D.addSessao;
        D.addSessao = function() {
            const seqAntes = D.sequenciaDias(), semAntes = D.minSemana(), diaAntes = D.minDia(ymd());
            const r = orig.apply(this, arguments);
            try {
                const seq = D.sequenciaDias(), meta = D.metaSemana(), sem = D.minSemana(), metaDia = cfg().metaDiariaMin;
                const marcos = {
                    2: "2 dias seguidos. Está pegando ritmo!",
                    3: "3 dias seguidos! O hábito começa a se formar.",
                    5: "5 dias seguidos. Quase uma semana inteira!",
                    7: "Uma semana inteira estudando todos os dias!",
                    14: "14 dias seguidos: duas semanas sem falhar.",
                    21: "21 dias seguidos: já é um hábito.",
                    30: "30 dias seguidos! Um mês de constância.",
                    60: "60 dias seguidos. Isso é disciplina de aprovado.",
                    100: "100 dias seguidos!"
                };
                let msg = "";
                if (seq > seqAntes && marcos[seq]) msg = marcos[seq]; else if (metaDia > 0 && diaAntes < metaDia && D.minDia(ymd()) >= metaDia) msg = "Meta de hoje batida (" + fmtH(metaDia) + ")!";
                if (meta > 0 && semAntes < meta && sem >= meta) msg = "Meta da semana batida: " + fmtH(sem) + " de " + fmtH(meta) + "!";
                if (msg) setTimeout((() => U.toast(msg, "ok")), 700);
            } catch (e) {}
            return r;
        };
    })();
    const ESTILOS = {
        multipla: "Múltipla escolha (cada acerto vale 1)",
        ce: "Certo/Errado (cada erro anula 1 acerto)"
    };
    let simTimer = null;
    const simAtivo = () => Store.s.simAtivo || null;
    const notaSim = x => x.estilo === "ce" ? x.acertos - x.erros : x.acertos;
    V.simulado = function(root) {
        clearInterval(simTimer);
        const s = Store.s, at = simAtivo(), hist = (s.simulados || []).slice().sort(((a, b) => b.ini - a.ini));
        const corpo = at ? rodando(at) : montagem();
        root.appendChild(h("div", {
            class: "page"
        }, h("div", {
            class: "page-head"
        }, h("div", null, h("span", {
            class: "eyebrow"
        }, "Treino de prova"), h("h1", null, "Simulado cronometrado"), h("div", {
            class: "sub"
        }, "Resolva as questões onde quiser (caderno, site, PDF) e deixe o Arsenal marcar o tempo e o ritmo. No fim você informa os acertos e tudo entra nas estatísticas."))), corpo, historicoSim(hist)));
    };
    function montagem() {
        const e = D.edital(), u = cfg().simUltimo || {};
        const nq = h("input", {
            type: "number",
            min: 1,
            max: 300,
            value: u.nq || 30,
            style: {
                width: "100%"
            }
        });
        const mq = h("input", {
            type: "number",
            min: .5,
            max: 10,
            step: .5,
            value: u.mq || 3,
            style: {
                width: "100%"
            }
        });
        const disc = h("select", null, h("option", {
            value: ""
        }, "Misto (várias matérias)"), e.discs.map((d => h("option", {
            value: d.id,
            selected: d.id === u.disc
        }, d.nome))));
        const est = h("select", null, Object.entries(ESTILOS).map((([k, v]) => h("option", {
            value: k,
            selected: k === (u.estilo || "multipla")
        }, v))));
        const total = h("b", {
            class: "num"
        });
        const calc = () => {
            total.textContent = fmtH(Math.round((+nq.value || 0) * (+mq.value || 0)));
        };
        nq.addEventListener("input", calc);
        mq.addEventListener("input", calc);
        calc();
        return h("div", {
            class: "card",
            style: {
                maxWidth: "620px"
            }
        }, h("h3", null, icon("target", "sm"), "Novo simulado"), h("div", {
            class: "col"
        }, h("div", {
            class: "grid g2"
        }, h("label", {
            class: "f"
        }, "Quantas questões", nq), h("label", {
            class: "f"
        }, "Minutos por questão", mq)), h("div", {
            class: "small muted"
        }, "Tempo total: ", total, " (use o seu ritmo de prova; costuma ser 2 a 4 min por questão)"), h("label", {
            class: "f"
        }, "Matéria", disc), h("label", {
            class: "f"
        }, "Estilo de correção", est), h("div", null, h("button", {
            class: "btn primary",
            onclick: () => {
                const n = Math.round(+nq.value), m = +mq.value;
                if (!(n >= 1) || !(m > 0)) {
                    U.toast("Informe o número de questões e o tempo por questão.", "err");
                    return;
                }
                if (Store.s.cron.status !== "parado") {
                    U.toast("Há uma sessão de estudo em andamento. Finalize-a antes.", "err");
                    return;
                }
                Store.mut((st => {
                    st.config.simUltimo = {
                        nq: n,
                        mq: m,
                        disc: disc.value,
                        estilo: est.value
                    };
                    st.simAtivo = {
                        iniMs: Date.now(),
                        nq: n,
                        totalSeg: Math.round(n * m * 60),
                        discId: disc.value || null,
                        estilo: est.value
                    };
                }), true);
                App.nav("simulado", {
                    n: Date.now() % 1e6
                });
            }
        }, icon("play", "sm"), "Começar o simulado"))));
    }
    function rodando(at) {
        const rel = h("div", {
            class: "foco-clock num",
            role: "timer"
        }), ritmo = h("div", {
            class: "muted"
        }), barra = h("div", {
            class: "sim-barra"
        }, h("i"));
        let avisou = false;
        const tick = () => {
            const dec = (Date.now() - at.iniMs) / 1e3, resta = at.totalSeg - dec;
            rel.textContent = (resta < 0 ? "+" : "") + clock(Math.abs(resta));
            rel.classList.toggle("estourou", resta < 0);
            const esperado = Math.min(at.nq, Math.floor(dec / (at.totalSeg / at.nq)));
            ritmo.textContent = "Pelo ritmo, você deveria estar na questão " + Math.min(at.nq, esperado + 1) + " de " + at.nq + ". Tempo por questão: " + clock(at.totalSeg / at.nq) + ".";
            barra.firstChild.style.width = Math.min(100, dec / at.totalSeg * 100) + "%";
            if (resta <= 0 && !avisou) {
                avisou = true;
                bip();
                U.toast("O tempo do simulado acabou. Termine e informe os acertos.", "ok");
            }
            if (!rel.isConnected) clearInterval(simTimer);
        };
        clearInterval(simTimer);
        tick();
        simTimer = setInterval(tick, 500);
        return h("div", {
            class: "card",
            style: {
                textAlign: "center",
                maxWidth: "620px"
            }
        }, h("h3", null, icon("clock", "sm"), (at.discId ? D.nomeDisc(at.discId) : "Simulado misto") + " · " + at.nq + " questões"), rel, barra, ritmo, h("div", {
            class: "row",
            style: {
                justifyContent: "center",
                marginTop: "14px",
                gap: "10px"
            }
        }, h("button", {
            class: "btn primary",
            onclick: () => encerrarSim(at)
        }, icon("check", "sm"), "Terminei"), h("button", {
            class: "btn danger ghost",
            onclick: async () => {
                if (await U.confirmar("Cancelar o simulado? Nada será salvo.", "Cancelar simulado")) {
                    Store.mut((st => {
                        st.simAtivo = null;
                    }), true);
                    App.nav("simulado", {
                        n: Date.now() % 1e6
                    });
                }
            }
        }, "Cancelar")));
    }
    function encerrarSim(at) {
        const usadoSeg = Math.max(60, Math.round((Date.now() - at.iniMs) / 1e3));
        const ac = h("input", {
            type: "number",
            min: 0,
            max: at.nq,
            value: 0,
            style: {
                width: "100%"
            }
        });
        const er = h("input", {
            type: "number",
            min: 0,
            max: at.nq,
            value: 0,
            style: {
                width: "100%"
            }
        });
        U.modal({
            titulo: "Resultado do simulado",
            corpo: h("div", {
                class: "col"
            }, h("p", {
                class: "muted small"
            }, "Tempo usado: " + clock(usadoSeg) + " de " + clock(at.totalSeg) + ". Informe só os números (o Arsenal não guarda o texto das questões)."), h("div", {
                class: "grid g2"
            }, h("label", {
                class: "f"
            }, "Acertos", ac), h("label", {
                class: "f"
            }, "Erros", er)), h("p", {
                class: "tiny muted"
            }, "As que ficaram em branco são o que sobra: " + at.nq + " − acertos − erros.")),
            botoes: [ {
                texto: "Voltar"
            }, {
                texto: "Salvar resultado",
                tipo: "primary",
                fn: () => {
                    const a = Math.max(0, Math.round(+ac.value || 0)), e = Math.max(0, Math.round(+er.value || 0));
                    if (a + e > at.nq) {
                        U.toast("Acertos + erros passam de " + at.nq + ".", "err");
                        return false;
                    }
                    const ini = new Date(at.iniMs);
                    const rec = {
                        id: uid(),
                        ini: at.iniMs,
                        data: ymd(ini),
                        discId: at.discId,
                        nq: at.nq,
                        totalSeg: at.totalSeg,
                        usadoSeg: usadoSeg,
                        acertos: a,
                        erros: e,
                        brancas: at.nq - a - e,
                        estilo: at.estilo
                    };
                    try {
                        D.addSessao({
                            discId: at.discId,
                            topicoId: null,
                            tipo: "questoes",
                            seg: usadoSeg,
                            ini: ini.toISOString(),
                            nota: "Simulado de " + at.nq + " questões",
                            fonte: "simulado"
                        });
                    } catch (er2) {}
                    Store.mut((st => {
                        (st.simulados = st.simulados || []).push(rec);
                        if (a + e > 0) st.registrosQ.push({
                            id: uid(),
                            data: rec.data,
                            discId: at.discId,
                            topicoId: null,
                            feitas: a + e,
                            acertos: a
                        });
                        st.simAtivo = null;
                    }));
                    U.toast("Simulado salvo: " + a + " acertos em " + at.nq + ".", "ok");
                    App.nav("simulado", {
                        n: Date.now() % 1e6
                    });
                }
            } ]
        });
    }
    function historicoSim(hist) {
        if (!hist.length) return h("section", {
            class: "sec"
        }, h("header", {
            class: "sec-h"
        }, h("h2", null, "Seus simulados")), h("div", {
            class: "empty"
        }, icon("target", "lg"), h("div", null, "Nenhum simulado ainda. Faça o primeiro e acompanhe a evolução aqui.")));
        const ult = hist.slice(0, 10);
        const media = (l, f) => l.length ? l.reduce(((a, x) => a + f(x)), 0) / l.length : 0;
        const p = x => pct(x.acertos, x.nq);
        const tendencia = hist.length >= 4 ? media(hist.slice(0, 3), p) - media(hist.slice(3, 6), p) : null;
        return h("section", {
            class: "sec"
        }, h("header", {
            class: "sec-h"
        }, h("h2", null, "Seus simulados"), h("span", {
            class: "right small muted"
        }, hist.length + " feito(s) · média de acerto " + Math.round(media(hist, p)) + "%" + (tendencia == null ? "" : " · últimos 3 " + (tendencia >= 0 ? "+" : "") + Math.round(tendencia) + " pts"))), h("div", {
            class: "lista"
        }, ult.map((x => h("div", {
            class: "item"
        }, h("span", {
            class: "dot-c",
            style: {
                background: x.discId ? D.corDisc(x.discId) : "#8a9099"
            }
        }), h("div", {
            class: "grow"
        }, h("div", {
            class: "small",
            style: {
                fontWeight: 700
            }
        }, (x.discId ? D.nomeDisc(x.discId) : "Misto") + " · " + x.nq + " questões"), h("div", {
            class: "tiny muted"
        }, U.fmtData(x.data) + " · " + clock(x.usadoSeg) + " de " + clock(x.totalSeg) + " · " + clock(x.usadoSeg / x.nq) + " por questão · " + x.brancas + " em branco")), h("b", {
            class: "num",
            title: "Nota líquida"
        }, (x.estilo === "ce" ? "líq. " + notaSim(x) : x.acertos + "/" + x.nq) + " · " + p(x) + "%"), h("button", {
            class: "btn ghost sm",
            "aria-label": "Excluir simulado",
            title: "Excluir",
            onclick: () => {
                Store.mut((st => {
                    st.simulados = (st.simulados || []).filter((y => y.id !== x.id));
                }));
                U.toast("Simulado excluído (as sessões e questões já contadas ficam).", "ok");
                App.nav("simulado", {
                    n: Date.now() % 1e6
                });
            }
        }, icon("trash", "sm")))))));
    }
    function dadosResumo() {
        const s = Store.s, hoje = ymd(), sem = D.semanaDe(hoje), ant = D.semanaDe(addDays(sem.ini, -1));
        const mpd = D.minutosPorDia(), soma = (ini, fim) => {
            let t = 0;
            for (let d = ini; d <= fim; d = addDays(d, 1)) t += mpd[d] || 0;
            return t;
        };
        const dias = [];
        for (let d = sem.ini; d <= sem.fim; d = addDays(d, 1)) dias.push({
            d: d,
            min: mpd[d] || 0
        });
        const min = soma(sem.ini, sem.fim), minAnt = soma(ant.ini, ant.fim), meta = D.metaSemana();
        const ses = s.sessoes.filter((x => x.data >= sem.ini && x.data <= sem.fim));
        const porDisc = {};
        ses.forEach((x => {
            const k = x.discId || "—";
            porDisc[k] = (porDisc[k] || 0) + x.seg / 60;
        }));
        const tops = Object.entries(porDisc).sort(((a, b) => b[1] - a[1]));
        const e = D.edital(), ultimo = {};
        s.sessoes.forEach((x => {
            if (x.discId && (!ultimo[x.discId] || x.data > ultimo[x.discId])) ultimo[x.discId] = x.data;
        }));
        const esquecidas = e.discs.filter((d => d.ciclo !== false)).map((d => ({
            d: d,
            dias: ultimo[d.id] ? U.diffDays(hoje, ultimo[d.id]) : null
        }))).filter((x => x.dias == null || x.dias >= 7)).sort(((a, b) => (b.dias == null ? 999 : b.dias) - (a.dias == null ? 999 : a.dias)));
        const qSem = s.registrosQ.filter((x => x.data >= sem.ini && x.data <= sem.fim)).reduce(((a, x) => ({
            f: a.f + x.feitas,
            a: a.a + x.acertos
        })), {
            f: 0,
            a: 0
        });
        const qAnt = s.registrosQ.filter((x => x.data >= ant.ini && x.data <= ant.fim)).reduce(((a, x) => ({
            f: a.f + x.feitas,
            a: a.a + x.acertos
        })), {
            f: 0,
            a: 0
        });
        const venc = D.revisoesVencidas().length, cards = D.cardsDevidos().length;
        const melhor = dias.reduce(((a, x) => x.min > a.min ? x : a), {
            min: 0
        });
        const diasEstudados = dias.filter((x => x.min > 0)).length;
        const dicas = [];
        if (meta && min >= meta) dicas.push("Você bateu a meta da semana. Que tal subir um pouco a meta ou reforçar as questões?"); else if (meta && sem.fim >= hoje) {
            const falta = meta - min, restam = Math.max(1, U.diffDays(sem.fim, hoje) + 1);
            dicas.push("Faltam " + fmtH(falta) + " para a meta da semana: cerca de " + fmtH(falta / restam) + " por dia até domingo.");
        }
        if (esquecidas.length) dicas.push("Matérias sem estudo há 7 dias ou mais: " + esquecidas.slice(0, 3).map((x => x.d.curto || x.d.nome)).join(", ") + ". Reserve um bloco para elas.");
        if (venc + cards) dicas.push("Você tem " + U.plural(venc, "revisão de assunto", "revisões de assunto") + " e " + U.plural(cards, "flashcard", "flashcards") + " para revisar. Revisar em dia fixa mais do que estudar de novo.");
        if (qSem.f < 20) dicas.push("Só " + qSem.f + " questões na semana. Resolver questões cedo mostra o que realmente cai na prova.");
        if (qSem.f >= 10 && qSem.f && pct(qSem.a, qSem.f) < 60) dicas.push("Acerto em " + pct(qSem.a, qSem.f) + "%: volte ao caderno de erros e refaça as que errou.");
        return {
            sem: sem,
            ant: ant,
            dias: dias,
            min: min,
            minAnt: minAnt,
            meta: meta,
            ses: ses.length,
            tops: tops,
            esquecidas: esquecidas,
            qSem: qSem,
            qAnt: qAnt,
            venc: venc,
            cards: cards,
            melhor: melhor,
            diasEstudados: diasEstudados,
            dicas: dicas,
            seq: D.sequenciaDias()
        };
    }
    const Resumo = {
        corpo(r) {
            const dif = r.minAnt ? Math.round((r.min - r.minAnt) / r.minAnt * 100) : null;
            const max = Math.max(60, ...r.dias.map((x => x.min)));
            const nomeDia = [ "seg", "ter", "qua", "qui", "sex", "sáb", "dom" ];
            return h("div", {
                class: "col"
            }, h("div", {
                class: "grid g3 resumo-n"
            }, h("div", {
                class: "kpi"
            }, h("b", {
                class: "num"
            }, fmtH(r.min)), h("span", null, "estudadas" + (r.meta ? " · " + pct(r.min, r.meta) + "% da meta" : ""))), h("div", {
                class: "kpi"
            }, h("b", {
                class: "num"
            }, dif == null ? "—" : (dif >= 0 ? "+" : "") + dif + "%"), h("span", null, "em relação à semana passada (" + fmtH(r.minAnt) + ")")), h("div", {
                class: "kpi"
            }, h("b", {
                class: "num"
            }, r.diasEstudados + "/7"), h("span", null, "dias com estudo · sequência de " + r.seq))), h("div", {
                class: "resumo-dias",
                "aria-label": "Horas por dia"
            }, r.dias.map(((x, i) => h("div", {
                class: "rd"
            }, h("div", {
                class: "rd-b"
            }, h("i", {
                style: {
                    height: Math.round(x.min / max * 100) + "%"
                },
                title: nomeDia[i] + ": " + fmtH(x.min)
            })), h("span", {
                class: "tiny muted"
            }, nomeDia[i]))))), r.tops.length ? h("div", null, h("h4", null, "Onde o tempo foi"), h("div", {
                class: "lista"
            }, r.tops.slice(0, 6).map((([k, m]) => h("div", {
                class: "item"
            }, h("span", {
                class: "dot-c",
                style: {
                    background: k === "—" ? "#8a9099" : D.corDisc(k)
                }
            }), h("div", {
                class: "grow small"
            }, k === "—" ? "Sem matéria" : D.nomeDisc(k)), h("b", {
                class: "num"
            }, fmtH(m))))))) : h("p", {
                class: "muted"
            }, "Nenhuma sessão registrada nesta semana ainda."), h("div", {
                class: "grid g2"
            }, h("div", {
                class: "kpi"
            }, h("b", {
                class: "num"
            }, r.qSem.f ? pct(r.qSem.a, r.qSem.f) + "%" : "—"), h("span", null, "acerto em " + r.qSem.f + " questões" + (r.qAnt.f ? " (semana passada: " + pct(r.qAnt.a, r.qAnt.f) + "%)" : ""))), h("div", {
                class: "kpi"
            }, h("b", {
                class: "num"
            }, String(r.venc + r.cards)), h("span", null, "revisões e flashcards esperando"))), r.dicas.length ? h("div", null, h("h4", null, "O que fazer agora"), h("ul", {
                class: "dicas"
            }, r.dicas.map((t => h("li", null, t))))) : null);
        },
        abrir() {
            const r = dadosResumo();
            U.modal({
                titulo: "Resumo da semana · " + U.fmtData(r.sem.ini) + " a " + U.fmtData(r.sem.fim),
                largo: true,
                corpo: this.corpo(r),
                botoes: [ {
                    texto: "Fechar"
                }, {
                    texto: "Relatório completo",
                    tipo: "primary",
                    fn: () => {
                        setTimeout((() => Relatorio.abrir()), 120);
                    }
                } ]
            });
        },
        cartao() {
            const r = dadosResumo();
            return h("section", {
                class: "sec"
            }, h("header", {
                class: "sec-h"
            }, h("h2", null, "Sua semana"), h("span", {
                class: "right small muted"
            }, U.fmtData(r.sem.ini) + " a " + U.fmtData(r.sem.fim))), h("div", {
                class: "card"
            }, h("div", {
                class: "row",
                style: {
                    gap: "20px",
                    flexWrap: "wrap"
                }
            }, h("div", null, h("b", {
                class: "num",
                style: {
                    fontSize: "26px"
                }
            }, fmtH(r.min)), h("div", {
                class: "tiny muted"
            }, r.meta ? pct(r.min, r.meta) + "% da meta de " + fmtH(r.meta) : "sem meta semanal")), h("div", null, h("b", {
                class: "num",
                style: {
                    fontSize: "26px"
                }
            }, r.diasEstudados + "/7"), h("div", {
                class: "tiny muted"
            }, "dias com estudo")), h("div", {
                class: "grow small muted",
                style: {
                    minWidth: "220px"
                }
            }, r.dicas[0] || "Estude hoje para começar a semana bem."), h("div", {
                class: "row",
                style: {
                    gap: "8px"
                }
            }, h("button", {
                class: "btn",
                onclick: () => Resumo.abrir()
            }, icon("chart", "sm"), "Resumo"), h("button", {
                class: "btn ghost",
                onclick: () => Relatorio.abrir()
            }, icon("download", "sm"), "Relatório")))));
        }
    };
    const Relatorio = {
        html(dias) {
            const s = Store.s, e = D.edital(), hoje = ymd(), de = addDays(hoje, -(dias - 1));
            const ses = s.sessoes.filter((x => x.data >= de));
            const min = ses.reduce(((a, x) => a + x.seg / 60), 0);
            const mpd = D.minutosPorDia(), diasEst = Object.keys(mpd).filter((d => d >= de && mpd[d] > 0)).length;
            const des = D.desempenho(dias), q = Object.values(des).reduce(((a, x) => ({
                f: a.f + x.feitas,
                a: a.a + x.acertos
            })), {
                f: 0,
                a: 0
            });
            const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, (c => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;"
            }[c])));
            const porD = {};
            ses.forEach((x => {
                porD[x.discId || "—"] = (porD[x.discId || "—"] || 0) + x.seg / 60;
            }));
            const lin = e.discs.filter((d => d.ciclo !== false)).map((d => {
                const p = D.progressoDe(d), t = porD[d.id] || 0, dq = des[d.id] || {
                    feitas: 0,
                    acertos: 0
                };
                return {
                    n: d.nome,
                    t: t,
                    pr: p.pct,
                    c: p.concluido,
                    tot: p.total,
                    qf: dq.feitas,
                    qa: dq.acertos
                };
            }));
            const sims = (s.simulados || []).filter((x => x.data >= de)).sort(((a, b) => a.ini - b.ini));
            const nome = String(s.perfil && s.perfil.nome || "").trim();
            const tr = l => "<tr>" + l.map(((c, i) => "<td" + (i ? ' class="n"' : "") + ">" + esc(c) + "</td>")).join("") + "</tr>";
            return '<h1>Relatório de estudos</h1><p class="s">' + esc((nome && nome !== "Concurseiro" ? nome + " · " : "") + e.ed.nome + (e.ed.banca ? " · " + e.ed.banca : "")) + "<br>Período: " + esc(U.fmtData(de)) + " a " + esc(U.fmtData(hoje)) + " (" + dias + " dias) · gerado em " + esc(U.fmtData(hoje)) + "</p>" + '<div class="k"><div><b>' + esc(fmtH(min)) + "</b>estudadas</div><div><b>" + diasEst + "/" + dias + "</b>dias com estudo</div><div><b>" + esc(fmtH(min / dias)) + "</b>média por dia</div><div><b>" + (q.f ? pct(q.a, q.f) + "%" : "—") + "</b>acerto em " + q.f + " questões</div><div><b>" + D.sequenciaDias() + "</b>dias seguidos agora (recorde " + D.melhorSequencia() + ")</div></div>" + "<h2>Por matéria</h2><table><tr><th>Matéria</th><th>Tempo</th><th>Edital concluído</th><th>Questões</th><th>Acerto</th></tr>" + lin.map((x => tr([ x.n, fmtH(x.t), x.pr + "% (" + x.c + "/" + x.tot + ")", x.qf, x.qf ? pct(x.qa, x.qf) + "%" : "—" ]))).join("") + "</table>" + (sims.length ? "<h2>Simulados</h2><table><tr><th>Data</th><th>Matéria</th><th>Questões</th><th>Acertos</th><th>Erros</th><th>Em branco</th><th>Tempo</th><th>Acerto</th></tr>" + sims.map((x => tr([ U.fmtData(x.data), x.discId ? D.nomeDisc(x.discId) : "Misto", x.nq, x.acertos, x.erros, x.brancas, clock(x.usadoSeg), pct(x.acertos, x.nq) + "%" ]))).join("") + "</table>" : "") + '<p class="r">Gerado pelo Arsenal de Estudos. Os dados ficam só no seu computador.</p>';
        },
        css: "body{font:14px/1.5 system-ui,Segoe UI,sans-serif;color:#111;margin:24px}h1{font-size:24px;margin:0 0 4px}h2{font-size:16px;margin:22px 0 6px;border-bottom:2px solid #111;padding-bottom:3px}.s{color:#555;margin:0 0 16px}.k{display:flex;flex-wrap:wrap;gap:10px}.k div{border:1px solid #bbb;border-radius:8px;padding:8px 14px;min-width:120px;font-size:12px;color:#555}.k b{display:block;font-size:22px;color:#111}table{border-collapse:collapse;width:100%;font-size:13px}th,td{border-bottom:1px solid #ddd;padding:5px 8px;text-align:left}th{background:#f1f1f1}td.n{text-align:right;font-variant-numeric:tabular-nums}.r{margin-top:24px;font-size:11px;color:#777}",
        abrir() {
            let dias = 30;
            const ov = h("div", {
                class: "relatorio-ov"
            });
            const pagina = h("div", {
                class: "relatorio-pg"
            });
            const desenha = () => {
                pagina.innerHTML = Relatorio.html(dias);
            };
            const sel = h("select", {
                onchange: ev => {
                    dias = +ev.target.value;
                    desenha();
                }
            }, [ [ 7, "Últimos 7 dias" ], [ 30, "Últimos 30 dias" ], [ 90, "Últimos 90 dias" ], [ 365, "Último ano" ] ].map((([v, t]) => h("option", {
                value: v,
                selected: v === dias
            }, t))));
            const fechar = () => {
                ov.remove();
                document.body.classList.remove("imprimindo");
                document.removeEventListener("keydown", esc, true);
            };
            const esc = e => {
                if (e.key === "Escape") fechar();
            };
            document.addEventListener("keydown", esc, true);
            desenha();
            ov.appendChild(h("div", {
                class: "relatorio-bar"
            }, h("b", null, "Relatório de estudos"), sel, h("button", {
                class: "btn",
                onclick: () => {
                    document.body.classList.add("imprimindo");
                    setTimeout((() => {
                        window.print();
                    }), 50);
                }
            }, icon("download", "sm"), "Imprimir / salvar em PDF"), window.arsenalExe && arsenalExe.relatorioPdf ? h("button", {
                class: "btn primary",
                onclick: async () => {
                    const r = await arsenalExe.relatorioPdf('<!doctype html><meta charset="utf-8"><title>Relatório de estudos</title><style>' + Relatorio.css + "</style>" + Relatorio.html(dias), "relatorio-arsenal-" + ymd() + "-" + dias + "d");
                    if (r && r.ok) U.toast("PDF salvo em Documentos › Arsenal de Estudos.", "ok"); else U.toast("Não consegui gerar o PDF: " + (r && r.erro || "erro"), "err");
                }
            }, icon("download", "sm"), "Salvar PDF") : null, h("button", {
                class: "btn",
                onclick: () => {
                    U.download("relatorio-arsenal-" + ymd() + ".html", '<!doctype html><meta charset="utf-8"><title>Relatório de estudos</title><style>' + Relatorio.css + "</style>" + Relatorio.html(dias), "text/html");
                }
            }, "Baixar .html"), h("button", {
                class: "btn ghost",
                onclick: fechar
            }, "Fechar")));
            ov.appendChild(pagina);
            document.body.appendChild(ov);
            window.addEventListener("afterprint", (() => document.body.classList.remove("imprimindo")), {
                once: true
            });
        }
    };
    window.Foco = Foco;
    window.Resumo = Resumo;
    window.Relatorio = Relatorio;
})();