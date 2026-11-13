(function() {
    "use strict";
    const {h: h, icon: icon, fmtMin: fmtMin, fmtHoras: fmtHoras, ymd: ymd, addDays: addDays, pct: pct} = U;
    const V = window.Views = window.Views || {};
    const ui = {
        dias: 30
    };
    V.estatisticas = function(root) {
        const s = Store.s, e = D.edital(), hoje = ymd();
        const dias = ui.dias;
        const ses = D.sessoesNoPeriodo(dias);
        const totMin = ses.reduce(((a, x) => a + x.seg / 60), 0);
        const nDias = dias || Math.max(1, s.sessoes.length ? U.diffDays(hoje, s.sessoes.map((x => x.data)).sort()[0]) + 1 : 1);
        const diasEstudados = new Set(ses.map((x => x.data))).size;
        const des = D.desempenho(dias);
        const tot = Object.values(des).reduce(((a, x) => ({
            f: a.f + x.feitas,
            a: a.a + x.acertos
        })), {
            f: 0,
            a: 0
        });
        const porDisc = {};
        ses.forEach((x => {
            const k = x.discId || "—";
            const o = porDisc[k] || (porDisc[k] = {
                min: 0,
                n: 0
            });
            o.min += x.seg / 60;
            o.n++;
        }));
        const arrTempo = Object.entries(porDisc).map((([k, v]) => ({
            rotulo: k === "—" ? "Sem matéria" : D.nomeDisc(k),
            valor: v.min,
            cor: k === "—" ? "#8a9099" : D.corDisc(k)
        }))).sort(((a, b) => b.valor - a.valor));
        const porTipo = {};
        ses.forEach((x => {
            porTipo[x.tipo] = (porTipo[x.tipo] || 0) + x.seg / 60;
        }));
        const arrTipo = Object.entries(porTipo).map((([k, v], i) => ({
            rotulo: D.TIPOS[k] || k,
            valor: v,
            cor: D.CORES[(i * 3 + 1) % D.CORES.length]
        }))).sort(((a, b) => b.valor - a.valor));
        let barras;
        const mpd = D.minutosPorDia();
        if (dias && dias <= 31) {
            const arr = [];
            for (let i = dias - 1; i >= 0; i--) {
                const d = addDays(hoje, -i);
                arr.push({
                    rotulo: d.slice(8) + "/" + d.slice(5, 7),
                    valor: +((mpd[d] || 0) / 60).toFixed(2),
                    dica: U.fmtData(d) + ": " + fmtMin(mpd[d] || 0)
                });
            }
            barras = Charts.barras(arr, {
                fmt: Charts.fmtEixoHoras,
                meta: s.config.metaDiariaMin / 60,
                h: 220,
                rotEvery: dias > 16 ? 3 : dias > 7 ? 2 : 1,
                destacarUltimo: true
            });
        } else {
            const n = dias === 90 ? 13 : 26, arr = [];
            for (let w = n - 1; w >= 0; w--) {
                let t = 0;
                for (let k = 0; k < 7; k++) t += mpd[addDays(hoje, -(w * 7 + k))] || 0;
                arr.push({
                    rotulo: rotDia(addDays(hoje, -(w * 7 + 6))),
                    valor: +(t / 60).toFixed(1),
                    dica: "Semana de " + U.fmtData(addDays(hoje, -(w * 7 + 6))) + ": " + fmtMin(t)
                });
            }
            barras = Charts.barras(arr, {
                fmt: Charts.fmtEixoHoras,
                h: 220,
                rotEvery: 2
            });
        }
        const dpd = D.desempenhoPorDia();
        const semanas = [], nS = 12;
        for (let w = nS - 1; w >= 0; w--) {
            let f = 0, a = 0;
            for (let k = 0; k < 7; k++) {
                const x = dpd[addDays(hoje, -(w * 7 + k))];
                if (x) {
                    f += x.feitas;
                    a += x.acertos;
                }
            }
            semanas.push({
                rot: rotDia(addDays(hoje, -(w * 7 + 6))),
                f: f,
                a: a
            });
        }
        const temQ = semanas.some((x => x.f > 0));
        const linhas = e.discs.filter((d => d.ciclo !== false || porDisc[d.id])).map((d => {
            const t = (porDisc[d.id] || {}).min || 0, q = des[d.id] || {
                feitas: 0,
                acertos: 0
            }, p = D.progressoDe(d);
            return {
                d: d,
                t: t,
                n: (porDisc[d.id] || {}).n || 0,
                q: q,
                p: p,
                pesoPct: pct(d.peso, e.ed.totalItensProva || 120),
                tempoPct: pct(t, totMin)
            };
        })).sort(((a, b) => b.t - a.t));
        root.appendChild(h("div", {
            class: "page"
        }, h("div", {
            class: "page-head"
        }, h("div", null, h("h1", null, "Estatísticas"), h("div", {
            class: "sub"
        }, "Tempo, presença e desempenho — tudo calculado no seu aparelho.")), h("div", {
            class: "right row wrap"
        }, h("div", {
            class: "tabs"
        }, [ [ 7, "7 dias" ], [ 30, "30 dias" ], [ 90, "90 dias" ], [ 0, "Tudo" ] ].map((([n, t]) => h("button", {
            class: "tab" + (ui.dias === n ? " on" : ""),
            "aria-pressed": ui.dias === n ? "true" : "false",
            onclick: () => {
                ui.dias = n;
                V.refresh();
            }
        }, t)))), h("button", {
            class: "btn",
            onclick: exportar,
            disabled: !s.sessoes.length,
            title: "Baixar todas as sessões em CSV"
        }, icon("download", "sm"), "Exportar CSV"))), h("div", {
            class: "kpis"
        }, card(fmtHoras(totMin), "Tempo total", "média de " + fmtMin(totMin / nDias) + " por dia"), card(diasEstudados + "/" + nDias, "Dias com estudo", pct(diasEstudados, nDias) + "% de presença"), card(tot.f ? pct(tot.a, tot.f) + "%" : "—", "Acerto em questões", U.plural(tot.f, "questão", "questões")), card(U.plural(D.sequenciaDias(), "dia", "dias"), "Sequência atual", "recorde: " + U.plural(D.melhorSequencia(), "dia", "dias"))), h("div", {
            class: "grid g-main"
        }, h("div", {
            class: "card"
        }, h("h3", null, icon("chart", "sm"), dias && dias <= 31 ? "Horas por dia" : "Horas por semana"), barras), h("div", {
            class: "card"
        }, h("h3", null, icon("pie", "sm"), "Tempo por tipo de estudo"), arrTipo.length ? h("div", {
            class: "col",
            style: {
                alignItems: "center"
            }
        }, Charts.rosca(arrTipo, {
            tam: 170
        }), h("div", {
            style: {
                width: "100%"
            }
        }, Charts.legenda(arrTipo))) : h("div", {
            class: "empty"
        }, "Sem sessões no período."))), h("div", {
            class: "grid g2"
        }, h("div", {
            class: "card"
        }, h("h3", null, icon("pie", "sm"), "Tempo por matéria"), arrTempo.length ? h("div", {
            class: "row",
            style: {
                gap: "20px",
                flexWrap: "wrap",
                alignItems: "center"
            }
        }, Charts.rosca(arrTempo.slice(0, 12), {
            tam: 200
        }), h("div", {
            class: "grow",
            style: {
                minWidth: "170px"
            }
        }, Charts.legenda(arrTempo.slice(0, 12)))) : h("div", {
            class: "empty"
        }, "Sem sessões no período.")), h("div", {
            class: "card"
        }, h("h3", null, icon("target", "sm"), "Acerto por semana"), temQ ? Charts.linha(semanas.map((x => x.f ? pct(x.a, x.f) : 0)), semanas.map((x => x.rot)), {
            max: 100,
            fmt: v => v + "%"
        }) : h("div", {
            class: "empty"
        }, "Registre questões para ver a evolução."), temQ ? h("div", {
            class: "hint"
        }, "Semanas sem questões aparecem como 0%, mesmo sem ter errado nada.") : null)), h("div", {
            class: "card"
        }, h("h3", null, icon("cal", "sm"), "Presença no último ano"), Charts.presenca(D.minutosPorDia(), {
            semanas: 52,
            meta: s.config.metaDiariaMin,
            cel: 11,
            gap: 2
        })), h("div", {
            class: "card"
        }, h("h3", null, icon("award", "sm"), "Desempenho por matéria"), h("div", {
            class: "scroll-x"
        }, h("table", {
            class: "t"
        }, h("thead", null, h("tr", null, [ "Matéria", "Peso na prova", "Tempo estudado", "Sessões", "Questões", "Acerto", "Edital concluído" ].map((t => h("th", {
            scope: "col"
        }, t))))), h("tbody", null, linhas.map((r => h("tr", null, h("td", null, h("span", {
            class: "dot-c",
            style: {
                background: D.corDisc(r.d.id),
                marginRight: "8px"
            }
        }), h("b", null, r.d.curto)), h("td", null, r.d.peso ? r.d.peso + " (" + r.pesoPct + "%)" : "—"), h("td", null, fmtMin(r.t), h("span", {
            class: "muted tiny"
        }, r.t && totMin ? "  " + r.tempoPct + "%" : "")), h("td", null, r.n), h("td", null, r.q.feitas || "—"), h("td", null, r.q.feitas ? h("b", {
            style: {
                color: pct(r.q.acertos, r.q.feitas) >= 70 ? "var(--ok-t)" : pct(r.q.acertos, r.q.feitas) >= 50 ? "var(--warn-t)" : "var(--bad-t)"
            }
        }, pct(r.q.acertos, r.q.feitas) + "%") : "—"), h("td", {
            style: {
                minWidth: "140px"
            }
        }, h("div", {
            class: "row"
        }, h("div", {
            class: "bar grow"
        }, h("i", {
            style: {
                width: r.p.pct + "%",
                background: D.corDisc(r.d.id)
            }
        })), h("span", {
            class: "tiny num"
        }, r.p.pct + "%"))))))))), h("div", {
            class: "hint",
            style: {
                marginTop: "8px"
            }
        }, 'Dica: compare "Peso na prova" com "Tempo estudado". Matéria de peso alto com pouco tempo é onde você está perdendo pontos.'))));
    };
    const rotDia = d => d.slice(8) + "/" + d.slice(5, 7);
    const card = (v, l, d) => h("div", {
        class: "stat"
    }, h("div", {
        class: "v"
    }, v), h("div", {
        class: "l"
    }, l), h("div", {
        class: "d"
    }, d));
    function exportar() {
        const linhas = [ "data;inicio;materia;assunto;tipo;minutos;nota" ].concat(Store.s.sessoes.slice().sort(((a, b) => a.ini.localeCompare(b.ini))).map((x => [ x.data, (() => {
            const t = new Date(x.ini);
            return isNaN(t) ? "" : String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0");
        })(), D.nomeDisc(x.discId, false), x.topicoId ? D.rotuloTopico(x.topicoId) : "", D.TIPOS[x.tipo] || x.tipo, (x.seg / 60).toFixed(1).replace(".", ","), x.nota || "" ].map((v => {
            let c = String(v == null ? "" : v);
            if (/^[=+\-@\t\r]/.test(c)) c = "'" + c;
            return '"' + c.replace(/"/g, '""') + '"';
        })).join(";"))));
        U.download("arsenal-sessoes-" + ymd() + ".csv", "\ufeff" + linhas.join("\n"), "text/csv;charset=utf-8");
    }
})();