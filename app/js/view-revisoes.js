(function() {
    "use strict";
    const {h: h, icon: icon, ymd: ymd, addDays: addDays} = U;
    const V = window.Views = window.Views || {};
    const ui = {
        aba: "hoje",
        limite: 40
    };
    V.flashcards = root => V.revisoes(root, {
        aba: "cards"
    });
    V.revisoes = function(root, params) {
        ui.aba = params && params.aba ? params.aba : ui.aba === "cards" ? "hoje" : ui.aba;
        const hoje = ymd();
        const pend = D.revisoesPendentes();
        const venc = pend.filter((r => r.due <= hoje));
        const futuras = pend.filter((r => r.due > hoje));
        const cards = D.cardsDevidos();
        const feitasHoje = Store.s.revisoes.filter((r => r.feita === hoje)).length;
        root.appendChild(h("div", {
            class: "page"
        }, h("div", {
            class: "page-head"
        }, h("div", null, h("h1", null, ui.aba === "cards" ? "Flashcards" : "Revisões"), h("div", {
            class: "sub"
        }, ui.aba === "cards" ? "Cartões que voltam pouco antes de você esquecer (FSRS, o método do Anki) e as questões que você errou." : "Intervalos: " + Store.s.config.revisaoDias.join(" · ") + " dias após concluir a teoria · " + U.plural(feitasHoje, "feita", "feitas") + " hoje")), h("div", {
            class: "tabs right",
            role: "tablist"
        }, tab("hoje", "Hoje (" + venc.length + ")"), tab("prox", "Agendadas (" + futuras.length + ")"), tab("cards", "Flashcards (" + cards.length + ")"))), ui.aba === "hoje" ? aHoje(venc) : ui.aba === "prox" ? aProx(futuras) : Flash.aba()));
    };
    const tab = (k, t) => h("button", {
        class: "tab" + (ui.aba === k ? " on" : ""),
        role: "tab",
        "aria-selected": ui.aba === k ? "true" : "false",
        onclick: () => {
            Flash.sair();
            ui.limite = 40;
            if (k === "cards") App.nav("flashcards"); else App.nav("revisoes", {
                aba: k
            });
        }
    }, t);
    function concluir(r) {
        const id = D.concluirRevisao(r.id);
        if (!id) return;
        const prox = Store.s.revisoes.find((x => x.origem === id));
        U.toast("Revisão concluída." + (prox ? " Próxima: " + U.fmtData(prox.due) + "." : " Ciclo de revisões completo."), "ok", {
            acao: "Desfazer",
            fn: () => D.desfazerRevisao(id)
        });
    }
    function linha(r) {
        const atras = r.due < ymd() ? U.diffDays(ymd(), r.due) : 0;
        const nome = D.rotuloTopico(r.refId) || r.refId;
        return h("div", {
            class: "row linha-solta"
        }, h("span", {
            class: "dot-c",
            style: {
                background: D.corDisc(r.discId)
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
            },
            title: nome
        }, nome), h("div", {
            class: "tiny muted"
        }, D.nomeDisc(r.discId, false) + " · passo " + (r.passo + 1) + "/" + Store.s.config.revisaoDias.length + " · " + (atras ? U.plural(atras, "dia", "dias") + " de atraso" : U.fmtData(r.due)))), h("button", {
            class: "btn sm",
            title: "Ver assunto no edital",
            "aria-label": "Ver assunto no edital",
            onclick: () => App.nav("edital", {
                t: r.refId
            })
        }, icon("book", "sm")), h("button", {
            class: "btn sm",
            title: "Revisar com o cronômetro",
            "aria-label": "Revisar com o cronômetro",
            onclick: () => {
                if (D.Cron.preparar({
                    discId: r.discId,
                    topicoId: D.topicoExiste(r.refId) ? r.refId : null,
                    tipo: "revisao",
                    fixa: false
                })) App.cronometro();
            }
        }, icon("clock", "sm")), h("button", {
            class: "btn sm",
            title: "Adiar esta revisão para amanhã",
            "aria-label": "Adiar para amanhã",
            onclick: () => Store.mut((s => {
                const x = s.revisoes.find((y => y.id === r.id));
                if (x) x.due = addDays(ymd(), 1);
            }))
        }, "+1 dia"), h("button", {
            class: "btn sm primary",
            onclick: () => concluir(r)
        }, icon("check", "sm"), "Revisei"));
    }
    function aHoje(venc) {
        const nCards = D.cardsDevidos().length;
        if (!venc.length) return h("div", {
            class: "card"
        }, h("div", {
            class: "empty"
        }, icon("check", "lg"), h("div", null, "Nenhuma revisão de assunto para hoje."), nCards ? h("button", {
            class: "btn primary",
            style: {
                marginTop: "10px"
            },
            onclick: () => App.nav("flashcards")
        }, icon("cards", "sm"), U.plural(nCards, "flashcard", "flashcards") + " para hoje") : null, h("div", {
            class: "hint"
        }, 'As revisões são criadas quando você marca um assunto como "Teoria concluída" no Edital.')));
        const por = {};
        venc.forEach((r => (por[r.discId] = por[r.discId] || []).push(r)));
        let n = 0;
        const grupos = Object.entries(por).map((([d, lst]) => {
            const fatia = lst.slice(0, Math.max(0, ui.limite - n));
            n += lst.length;
            return fatia.length ? h("div", {
                class: "col",
                style: {
                    gap: "8px"
                }
            }, h("div", {
                style: {
                    fontWeight: 800,
                    color: D.corDiscTexto(d)
                }
            }, D.nomeDisc(d, false)), fatia.map(linha)) : null;
        }));
        return h("div", {
            class: "col",
            style: {
                gap: "18px"
            }
        }, h("div", {
            class: "callout"
        }, U.plural(venc.length, "revisão pendente", "revisões pendentes") + " em " + U.plural(Object.keys(por).length, "matéria", "matérias") + '. Use o botão "Revisei" para agendar a próxima.'), grupos, venc.length > ui.limite ? h("button", {
            class: "btn",
            style: {
                alignSelf: "center"
            },
            onclick: () => {
                ui.limite += 40;
                V.refresh();
            }
        }, "Mostrar mais (" + (venc.length - ui.limite) + " restantes)") : null);
    }
    function aProx(fut) {
        if (!fut.length) return h("div", {
            class: "card"
        }, h("div", {
            class: "empty"
        }, icon("cal", "lg"), "Nada agendado para os próximos dias."));
        const por = {};
        fut.slice(0, ui.limite).forEach((r => (por[r.due] = por[r.due] || []).push(r)));
        return h("div", {
            class: "col",
            style: {
                gap: "18px"
            }
        }, Object.entries(por).map((([d, lst]) => h("div", {
            class: "col",
            style: {
                gap: "8px"
            }
        }, h("div", {
            style: {
                fontWeight: 800
            }
        }, U.fmtDataLonga(d), h("span", {
            class: "muted small",
            style: {
                marginLeft: "8px"
            }
        }, "em " + U.plural(U.diffDays(d, ymd()), "dia", "dias"))), lst.map(linha)))), fut.length > ui.limite ? h("button", {
            class: "btn",
            style: {
                alignSelf: "center"
            },
            onclick: () => {
                ui.limite += 40;
                V.refresh();
            }
        }, "Mostrar mais (" + (fut.length - ui.limite) + " restantes)") : null);
    }
})();