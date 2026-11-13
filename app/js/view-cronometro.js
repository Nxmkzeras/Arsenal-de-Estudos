(function() {
    "use strict";
    const {h: h, icon: icon, fmtMin: fmtMin, fmtClock: fmtClock, ymd: ymd, uid: uid} = U;
    const V = window.Views = window.Views || {};
    const PRESETS = [ 15, 25, 30, 45, 50, 60, 90, 120 ];
    let tickId = null;
    function beep() {
        if (!Store.s.config.som) return;
        try {
            if (!beep.ac) beep.ac = new (window.AudioContext || window.webkitAudioContext);
            const ac = beep.ac;
            if (ac.state === "suspended") ac.resume();
            [ 0, .28, .56 ].forEach((t => {
                const o = ac.createOscillator(), g = ac.createGain();
                o.frequency.value = 880;
                g.gain.setValueAtTime(1e-4, ac.currentTime + t);
                g.gain.exponentialRampToValueAtTime(.25, ac.currentTime + t + .02);
                g.gain.exponentialRampToValueAtTime(1e-4, ac.currentTime + t + .24);
                o.connect(g);
                g.connect(ac.destination);
                o.start(ac.currentTime + t);
                o.stop(ac.currentTime + t + .26);
            }));
        } catch (e) {}
    }
    function discAtual() {
        return D.Cron.discEfetiva();
    }
    const rotuloOpcao = (t, n) => "  ".repeat(n) + (n ? "↳ " : "") + t.num + " " + t.texto.slice(0, 80);
    function opcoesAssuntos(sel, disc, escolhido) {
        if (!disc) return;
        const walk = (ns, n) => ns.forEach((t => {
            sel.appendChild(h("option", {
                value: t.id,
                selected: t.id === escolhido
            }, rotuloOpcao(t, n)));
            walk(t.filhos, n + 1);
        }));
        walk(disc.topicos, 0);
    }
    function painelSessao() {
        const s = Store.s, c = s.cron, e = D.edital();
        const parado = c.status === "parado";
        const disc = discAtual();
        const ciclo = D.cicloEstado();
        const dsel = h("select", {
            style: {
                width: "100%"
            },
            disabled: !parado,
            onchange: ev => Store.mut((st => {
                st.cron.discId = ev.target.value || null;
                st.cron.topicoId = null;
                if (!ev.target.value) st.cron.fixa = false;
            }))
        }, h("option", {
            value: ""
        }, "↻ Seguir o ciclo" + (ciclo.atual ? " (agora: " + D.nomeDisc(ciclo.atual.discId) + ")" : "")), e.discs.map((d => h("option", {
            value: d.id,
            selected: d.id === c.discId
        }, d.nome))));
        const tsel = h("select", {
            style: {
                width: "100%"
            },
            disabled: !parado || !disc,
            onchange: ev => Store.mut((st => {
                st.cron.topicoId = ev.target.value || null;
            }), true)
        });
        tsel.appendChild(h("option", {
            value: ""
        }, "(sem assunto específico)"));
        if (disc && e.disc[disc]) opcoesAssuntos(tsel, e.disc[disc], c.topicoId);
        const tipo = h("select", {
            disabled: !parado,
            onchange: ev => Store.mut((st => {
                st.cron.tipo = ev.target.value;
            }), true)
        }, Object.entries(D.TIPOS).map((([k, v]) => h("option", {
            value: k,
            selected: k === c.tipo
        }, v))));
        const custom = h("input", {
            type: "number",
            min: 1,
            max: 600,
            value: c.alvoMin,
            style: {
                width: "84px"
            },
            disabled: !parado,
            onchange: ev => Store.mut((st => {
                st.cron.alvoMin = Math.max(1, +ev.target.value || 25);
            }))
        });
        const config = h("div", {
            class: "card sessao-cfg"
        }, h("h3", null, icon("settings", "sm"), "Como vai ser a sessão"), h("div", {
            class: "col"
        }, h("div", {
            class: "tabs"
        }, h("button", {
            class: "tab" + (c.modo === "livre" ? " on" : ""),
            disabled: !parado,
            onclick: () => Store.mut((st => {
                st.cron.modo = "livre";
            }))
        }, "Cronômetro livre"), h("button", {
            class: "tab" + (c.modo === "regressivo" ? " on" : ""),
            disabled: !parado,
            onclick: () => Store.mut((st => {
                st.cron.modo = "regressivo";
            }))
        }, "Contagem regressiva")), c.modo === "regressivo" ? h("div", {
            class: "col",
            style: {
                gap: "8px"
            }
        }, h("div", {
            class: "pill-sel"
        }, PRESETS.map((m => h("button", {
            class: "chip" + (c.alvoMin === m ? " on" : ""),
            disabled: !parado,
            onclick: () => Store.mut((st => {
                st.cron.alvoMin = m;
            }))
        }, m + " min")))), h("label", {
            class: "row small muted"
        }, "Personalizado:", custom, "minutos")) : h("div", {
            class: "hint"
        }, "Livre: o tempo corre até você finalizar. Para ter um alarme, use a contagem regressiva."), h("label", {
            class: "f"
        }, "Matéria", dsel), h("label", {
            class: "row",
            title: "Mantém a matéria escolhida nas próximas sessões"
        }, h("span", {
            class: "switch"
        }, h("input", {
            type: "checkbox",
            checked: c.fixa,
            disabled: !parado || !c.discId,
            onchange: ev => Store.mut((st => {
                st.cron.fixa = ev.target.checked;
            }))
        }), h("span")), icon("lock", "sm"), "Manter esta matéria nas próximas sessões (não voltar ao ciclo)"), h("label", {
            class: "f"
        }, "Assunto do edital (opcional)", tsel), h("label", {
            class: "f"
        }, "Tipo de estudo", tipo)));
        const hojeSes = s.sessoes.filter((x => x.data === ymd())).sort(((a, b) => b.ini.localeCompare(a.ini)));
        const hoje = h("div", {
            class: "card"
        }, h("h3", null, icon("list", "sm"), "Sessões de hoje", h("span", {
            class: "right"
        }, fmtMin(D.minDia(ymd())) + " / meta " + fmtMin(s.config.metaDiariaMin))), hojeSes.length ? h("div", {
            class: "lista"
        }, hojeSes.map((x => h("div", {
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
        }, x.discId ? D.nomeDisc(x.discId) : "Sem matéria", " · ", D.TIPOS[x.tipo] || x.tipo), h("div", {
            class: "tiny muted ellipsis"
        }, new Date(x.ini).toTimeString().slice(0, 5) + (x.topicoId ? " · " + D.rotuloTopico(x.topicoId).slice(0, 50) : "") + (x.nota ? " · " + x.nota : ""))), h("b", {
            class: "num"
        }, fmtMin(x.seg / 60)), h("button", {
            class: "btn ghost sm",
            title: "Excluir",
            "aria-label": "Excluir sessão",
            onclick: () => {
                Store.mut((st => {
                    st.sessoes = st.sessoes.filter((y => y.id !== x.id));
                }));
                U.toast("Sessão excluída.", "", {
                    acao: "Desfazer",
                    fn: () => Store.mut((st => {
                        st.sessoes.push(x);
                    }))
                });
            }
        }, icon("trash", "sm")))))) : h("div", {
            class: "empty"
        }, "Nenhuma sessão hoje ainda."), h("div", {
            style: {
                marginTop: "12px"
            }
        }, h("button", {
            class: "btn",
            onclick: manual
        }, icon("plus", "sm"), "Registrar sessão manualmente")));
        return h("section", {
            class: "sec",
            "aria-label": "Sessão de estudo",
            id: "sessao"
        }, h("header", {
            class: "sec-h"
        }, h("h2", null, "Sessão de estudo"), h("span", {
            class: "right small muted"
        }, parado ? "Espaço inicia e pausa · o tempo continua contando mesmo se você trocar de tela" : "Travado enquanto a sessão está aberta · finalize para mudar")), h("div", {
            class: "grid g2",
            style: {
                alignItems: "start"
            }
        }, config, hoje));
    }
    function manual() {
        const e = D.edital();
        const d = h("select", null, e.discs.map((x => h("option", {
            value: x.id
        }, x.nome))));
        const tp = h("select", null, Object.entries(D.TIPOS).map((([k, v]) => h("option", {
            value: k
        }, v))));
        const dt = h("input", {
            type: "date",
            value: ymd(),
            max: ymd()
        }), mn = h("input", {
            type: "number",
            min: 1,
            value: 30,
            style: {
                width: "100%"
            }
        });
        const top = h("select", {
            style: {
                width: "100%"
            }
        });
        const preencher = () => {
            U.clear(top);
            top.appendChild(h("option", {
                value: ""
            }, "(sem assunto)"));
            opcoesAssuntos(top, e.disc[d.value], null);
        };
        d.addEventListener("change", preencher);
        preencher();
        const nt = h("input", {
            type: "text",
            placeholder: "observação (opcional)",
            style: {
                width: "100%"
            }
        });
        U.modal({
            titulo: "Registrar sessão manual",
            corpo: h("div", {
                class: "col"
            }, h("label", {
                class: "f"
            }, "Matéria", d), h("label", {
                class: "f"
            }, "Assunto (opcional)", top), h("div", {
                class: "grid g2"
            }, h("label", {
                class: "f"
            }, "Data", dt), h("label", {
                class: "f"
            }, "Minutos", mn)), h("label", {
                class: "f"
            }, "Tipo", tp), h("label", {
                class: "f"
            }, "Nota", nt)),
            botoes: [ {
                texto: "Cancelar"
            }, {
                texto: "Salvar",
                tipo: "primary",
                fn: () => {
                    const min = +mn.value;
                    if (!dt.value) {
                        U.toast("Escolha a data.", "err");
                        return false;
                    }
                    if (!(min >= 1)) {
                        U.toast("Informe pelo menos 1 minuto.", "err");
                        return false;
                    }
                    const ini = dt.value === ymd() ? new Date : new Date(dt.value + "T12:00:00");
                    try {
                        D.addSessao({
                            discId: d.value,
                            topicoId: top.value || null,
                            tipo: tp.value,
                            seg: min * 60,
                            ini: ini.toISOString(),
                            nota: nt.value,
                            fonte: "manual"
                        });
                    } catch (er) {
                        U.toast(er.message, "err");
                        return false;
                    }
                    U.toast("Sessão registrada: " + fmtMin(min), "ok");
                }
            } ]
        });
    }
    function finalizar(opts) {
        opts = opts || {};
        if (Store.s.cron.status === "rodando") D.Cron.pausar();
        const dados = D.Cron.dados();
        if (Store.s.cron.status === "parado") return;
        const e = D.edital();
        if (!dados.topicoId && dados.discId) dados.topicoId = D.proximoAssunto(dados.discId) || null;
        const d = h("select", null, h("option", {
            value: ""
        }, "(sem matéria)"), e.discs.map((x => h("option", {
            value: x.id,
            selected: x.id === dados.discId
        }, x.nome))));
        const mn = h("input", {
            type: "number",
            min: 0,
            step: 1,
            value: Math.round(dados.seg / 60) || 1,
            style: {
                width: "100%"
            }
        });
        const tp = h("select", null, Object.entries(D.TIPOS).map((([k, v]) => h("option", {
            value: k,
            selected: k === dados.tipo
        }, v))));
        const top = h("select", {
            style: {
                width: "100%"
            }
        });
        const preencheTop = () => {
            U.clear(top);
            top.appendChild(h("option", {
                value: ""
            }, "(sem assunto)"));
            opcoesAssuntos(top, e.disc[d.value], dados.topicoId);
        };
        d.addEventListener("change", (() => {
            dados.topicoId = null;
            preencheTop();
        }));
        preencheTop();
        const st = h("select", null, h("option", {
            value: ""
        }, "Não alterar"), D.STATUS.slice(1).map(((nm, i) => h("option", {
            value: i + 1
        }, nm))));
        const nt = h("textarea", {
            placeholder: "O que você estudou? Onde parou?",
            style: {
                minHeight: "70px"
            }
        });
        const terminou = h("input", {
            type: "checkbox"
        });
        const linhaTerminou = D.modoAssunto() ? h("label", {
            class: "row callout",
            style: {
                gap: "10px",
                alignItems: "center"
            }
        }, h("span", {
            class: "switch"
        }, terminou, h("span")), h("span", null, h("b", null, "Terminei este assunto"), h("span", {
            class: "small muted",
            style: {
                display: "block"
            }
        }, 'Marca como "Teoria concluída" e o ciclo passa para o próximo assunto da matéria.'))) : null;
        const qf = h("input", {
            type: "number",
            min: 0,
            value: 0,
            style: {
                width: "100%"
            }
        }), qa = h("input", {
            type: "number",
            min: 0,
            value: 0,
            style: {
                width: "100%"
            }
        });
        const botoes = [ {
            texto: "Descartar",
            tipo: "danger",
            fn: async () => {
                if (!await U.confirmar("Descartar esta sessão? O tempo não será salvo e não dá para desfazer.", "Descartar")) return false;
                D.Cron.descartar();
            }
        }, {
            texto: "Voltar (fica pausado)",
            fn: () => {}
        } ];
        if (opts.extra) botoes.splice(1, 0, {
            texto: "+5 min",
            fn: () => {
                Store.mut((x => {
                    x.cron.alvoMin += 5;
                }));
                D.Cron.retomar();
            }
        });
        botoes.push({
            texto: "Salvar sessão",
            tipo: "primary",
            fn: () => {
                const seg = Math.round((+mn.value || 0) * 60);
                if (seg < 1) {
                    U.toast("Informe pelo menos 1 minuto.", "err");
                    return false;
                }
                let ses;
                try {
                    ses = D.addSessao({
                        discId: d.value || null,
                        topicoId: top.value || null,
                        tipo: tp.value,
                        seg: seg,
                        ini: new Date(dados.ini).toISOString(),
                        nota: nt.value.trim()
                    });
                } catch (er) {
                    U.toast(er.message, "err");
                    return false;
                }
                if (terminou.checked && top.value && !st.value) D.setStatus(top.value, Math.max(2, D.statusDe(top.value)));
                if (st.value && top.value) D.setStatus(top.value, +st.value); else if (st.value && !top.value) U.toast("Escolha um assunto para marcar o status dele.", "err");
                if (+qf.value > 0) Store.mut((s => s.registrosQ.push({
                    id: uid(),
                    data: ses.data,
                    discId: d.value || null,
                    topicoId: top.value || null,
                    feitas: +qf.value,
                    acertos: Math.min(+qa.value, +qf.value)
                })));
                const fixa = Store.s.cron.fixa;
                D.Cron.descartar();
                Store.mut((s => {
                    if (!fixa) {
                        s.cron.discId = null;
                    }
                    s.cron.topicoId = null;
                }));
                U.toast("Sessão salva: " + fmtMin(seg / 60), "ok");
                document.title = "Arsenal de Estudos";
            }
        });
        U.modal({
            titulo: opts.extra ? "Tempo esgotado" : "Finalizar sessão",
            largo: true,
            corpo: h("div", {
                class: "col"
            }, h("div", {
                class: "grid g2"
            }, h("label", {
                class: "f"
            }, "Matéria", d), h("label", {
                class: "f"
            }, "Minutos estudados", mn)), h("div", {
                class: "grid g2"
            }, h("label", {
                class: "f"
            }, "Assunto", top), h("label", {
                class: "f"
            }, "Tipo", tp)), linhaTerminou, h("label", {
                class: "f"
            }, "Marcar o assunto como… (precisa de um assunto)", st), h("div", {
                class: "grid g2"
            }, h("label", {
                class: "f"
            }, "Questões feitas (opcional)", qf), h("label", {
                class: "f"
            }, "Acertos", qa)), h("label", {
                class: "f"
            }, "Anotação", nt)),
            botoes: botoes
        });
    }
    async function fim() {
        if (window.Foco && Foco.ativo && Foco.fimRodada()) return;
        beep();
        if (window.Notification && Notification.permission === "granted") {
            try {
                new Notification("Arsenal de Estudos", {
                    body: "Tempo da sessão esgotado!"
                });
            } catch (e) {}
        }
        D.Cron.pausar();
        finalizar({
            extra: true
        });
    }
    window.Cronometro = {
        finalizar: finalizar,
        fim: fim,
        beep: beep,
        painelSessao: painelSessao
    };
})();