(function() {
    "use strict";
    const {h: h, icon: icon, fmtMin: fmtMin, pct: pct} = U;
    let el = null, discAtual = null, fixo = false, tAbrir = null, tFechar = null, periodo = 30, todos = false;
    const faixa = p => p >= 75 ? "bom" : p >= 50 ? "meio" : "ruim";
    function conteudo(discId) {
        const e = D.edital(), d = e.disc[discId];
        if (!d) return h("div", {
            class: "fly-b"
        }, h("p", {
            class: "muted"
        }, "Matéria não encontrada neste edital."));
        const cor = D.corDisc(discId), prog = D.progressoDe(d);
        const est = D.diaEstado(), meus = est.segs.filter((s => s.discId === discId));
        const hojeFeito = meus.reduce(((a, s) => a + s.feito), 0), hojePlano = meus.reduce(((a, s) => a + s.min), 0);
        const des = D.desempenho(periodo || 0)[discId] || {
            feitas: 0,
            acertos: 0
        };
        const ass = D.desempenhoAssuntos(discId, periodo || 0);
        const erros = Store.s.questoes.filter((q => q.discId === discId && q.resultado === "erro")).length;
        const lista = todos ? ass : ass.slice(0, 8);
        const parado = Store.s.cron.status === "parado";
        const chips = h("div", {
            class: "seg-ctl",
            role: "group",
            "aria-label": "Período"
        }, [ [ 7, "7 dias" ], [ 30, "30 dias" ], [ 0, "Tudo" ] ].map((([n, t]) => h("button", {
            class: periodo === n ? "on" : "",
            onclick: () => {
                periodo = n;
                redesenha();
            }
        }, t))));
        return h("div", {
            class: "fly-b"
        }, h("div", {
            class: "fly-h"
        }, h("span", {
            class: "fly-cor",
            style: {
                background: cor
            }
        }), h("div", {
            class: "grow"
        }, h("div", {
            class: "fly-t"
        }, d.nome), h("div", {
            class: "small muted"
        }, (d.peso ? "Peso " + d.peso + " no edital · " : "") + prog.pct + "% do edital concluído")), h("button", {
            class: "icon-btn",
            "aria-label": "Fechar",
            title: "Fechar (Esc)",
            onclick: fechar
        }, icon("x"))), h("div", {
            class: "fly-trio"
        }, h("div", null, h("b", null, hojePlano || hojeFeito ? fmtMin(hojeFeito) : "—"), h("span", null, hojePlano ? "de " + fmtMin(hojePlano) + " hoje" : "hoje")), h("div", null, h("b", null, des.feitas ? pct(des.acertos, des.feitas) + "%" : "—"), h("span", null, des.feitas ? "acerto em " + des.feitas + " questões" : "sem questões")), h("div", null, h("b", null, String(erros)), h("span", null, erros === 1 ? "erro no caderno" : "erros no caderno"))), h("div", {
            class: "fly-sec"
        }, h("h4", null, "Desempenho por assunto"), chips), ass.length ? h("div", {
            class: "ass-lista"
        }, lista.map(((a, i) => h("div", {
            class: "ass " + faixa(a.pct),
            style: "--i:" + i,
            title: a.rotulo,
            onclick: a.topicoId ? () => {
                fechar();
                App.nav("edital", {
                    t: a.topicoId
                });
            } : null
        }, h("div", {
            class: "ass-n"
        }, a.rotulo), h("div", {
            class: "ass-v"
        }, h("b", null, a.pct + "%"), h("span", null, a.acertos + "/" + a.feitas)), h("div", {
            class: "ass-bar"
        }, h("i", {
            style: {
                width: Math.max(3, a.pct) + "%"
            }
        }))))), ass.length > 8 ? h("button", {
            class: "btn ghost sm",
            onclick: () => {
                todos = !todos;
                redesenha();
            }
        }, todos ? "Mostrar menos" : "Ver os " + ass.length + " assuntos") : null) : h("div", {
            class: "fly-vazio"
        }, h("p", null, "Ainda não há questões desta matéria " + (periodo ? "nos últimos " + periodo + " dias." : "registradas.")), h("p", {
            class: "small muted"
        }, U.txt("detalhe.semQuestoes", "Registre questões em Questões e em Registrar lote: o desempenho entra aqui, separado por assunto."))), h("div", {
            class: "fly-acts"
        }, h("button", {
            class: "btn primary",
            onclick: () => {
                fechar();
                if (parado) {
                    Store.mut((st => {
                        st.cron.discId = discId;
                        st.cron.topicoId = null;
                        st.cron.fixa = false;
                    }), true);
                    D.Cron.iniciar();
                    App.cronometro();
                } else App.cronometro();
            }
        }, icon("play", "sm"), parado ? "Estudar agora" : "Ver no cronômetro"), h("button", {
            class: "btn",
            onclick: () => {
                fechar();
                App.nav("edital", {
                    d: discId
                });
            }
        }, "Abrir no edital"), erros ? h("button", {
            class: "btn",
            onclick: () => {
                fechar();
                App.nav("questoes");
            }
        }, "Caderno de erros") : null));
    }
    function garante() {
        if (el && el.isConnected) return el;
        el = h("aside", {
            class: "flyout",
            role: "dialog",
            "aria-label": "Detalhes da matéria"
        });
        el.addEventListener("mouseenter", (() => clearTimeout(tFechar)));
        el.addEventListener("mouseleave", (() => {
            if (!fixo) sair();
        }));
        el.addEventListener("mousedown", (() => {
            fixo = true;
            el.classList.add("fixo");
        }));
        document.body.appendChild(el);
        document.addEventListener("keydown", (ev => {
            if (ev.key === "Escape" && discAtual) {
                fechar();
            }
        }));
        document.addEventListener("mousedown", (ev => {
            if (!discAtual || !fixo) return;
            if (el.contains(ev.target) || ev.target.closest && ev.target.closest(".ad-seg,.rosa-seg,.bloco,.fraco")) return;
            fechar();
        }));
        window.addEventListener("hashchange", fechar);
        Store.on((() => {
            if (discAtual && el.classList.contains("on")) redesenha();
        }));
        return el;
    }
    function redesenha() {
        if (!discAtual) return;
        const y = el.scrollTop;
        U.clear(el);
        el.appendChild(conteudo(discAtual));
        el.scrollTop = y;
    }
    function abrir(discId, prender) {
        if (!discId) return;
        clearTimeout(tAbrir);
        clearTimeout(tFechar);
        garante();
        if (prender) fixo = true;
        const novo = discId !== discAtual;
        if (novo) {
            discAtual = discId;
            todos = false;
            U.clear(el);
            el.appendChild(conteudo(discId));
            el.scrollTop = 0;
            el.classList.remove("troca");
            void el.offsetWidth;
            if (el.classList.contains("on")) el.classList.add("troca");
        }
        el.classList.toggle("fixo", fixo);
        el.classList.add("on");
    }
    function passar(discId) {
        if (!discId || fixo) {
            if (fixo && discId && discId !== discAtual) return;
            return;
        }
        clearTimeout(tFechar);
        clearTimeout(tAbrir);
        tAbrir = setTimeout((() => abrir(discId, false)), discAtual ? 60 : 160);
    }
    function sair() {
        clearTimeout(tAbrir);
        if (fixo) return;
        clearTimeout(tFechar);
        tFechar = setTimeout(fechar, 320);
    }
    function fechar() {
        clearTimeout(tAbrir);
        clearTimeout(tFechar);
        fixo = false;
        discAtual = null;
        if (el) el.classList.remove("on", "fixo", "troca");
    }
    window.Detalhe = {
        abrir: abrir,
        passar: passar,
        sair: sair,
        fechar: fechar,
        fixar: id => {
            fixo = false;
            abrir(id, true);
        },
        get aberto() {
            return discAtual;
        }
    };
})();