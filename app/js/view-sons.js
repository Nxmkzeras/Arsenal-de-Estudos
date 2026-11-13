(function() {
    "use strict";
    const {h: h, icon: icon} = U;
    const V = window.Views = window.Views || {};
    const GRUPOS = [ [ "Lofi", "Faixas de lofi instrumental que vêm com o app (sem voz), em loop contínuo, sem pausa nem corte." ], [ "Ruídos", "Cobrem o barulho de fora e ajudam a manter a atenção." ], [ "Natureza", "Sons de ambiente natural." ], [ "Ambiente", "Sons do dia a dia." ] ];
    const fmtResta = ms => {
        const s = Math.max(0, Math.round(ms / 1e3)), m = Math.floor(s / 60);
        return m + ":" + String(s % 60).padStart(2, "0");
    };
    function barrasEq() {
        return h("span", {
            class: "som-eq",
            "aria-hidden": "true"
        }, h("i"), h("i"), h("i"), h("i"));
    }
    function cartaoSom(c) {
        const est = Sons.camada(c.id);
        const vol = h("input", {
            type: "range",
            min: 0,
            max: 100,
            value: Math.round(est.vol * 100),
            "aria-label": "Volume: " + c.nome,
            title: "Volume deste som",
            oninput: ev => Sons.volume(c.id, ev.target.value / 100)
        });
        const liga = h("button", {
            class: "som-liga",
            type: "button",
            "aria-pressed": est.on ? "true" : "false",
            onclick: () => Sons.alternar(c.id)
        }, h("span", {
            class: "som-ico"
        }, est.on && Sons.tocando ? barrasEq() : icon(c.grupo === "Lofi" ? "music" : c.grupo === "Ondas cerebrais" ? "headphones" : "volume", "sm")), h("span", {
            class: "som-txt"
        }, h("b", null, c.nome), h("span", {
            class: "small muted"
        }, c.desc)));
        return h("div", {
            class: "som-card" + (est.on ? " on" : "") + (est.on && Sons.tocando ? " toca" : "")
        }, liga, vol);
    }
    V.sons = function(root) {
        if (!Sons.suportado) {
            root.appendChild(h("div", {
                class: "page"
            }, h("div", {
                class: "card"
            }, h("h3", null, "Sons de foco"), h("p", {
                class: "muted"
            }, "Este navegador não tem áudio avançado (WebAudio). " + U.txt("sons.semAudio", "Use o aplicativo.")))));
            return;
        }
        const tocando = Sons.tocando, ligadas = Sons.ligadas();
        const resta = h("span", {
            id: "sons-resta",
            class: "num small muted"
        }, Sons.fimEm ? "para em " + fmtResta(Sons.fimEm - Date.now()) : "");
        const sel = h("select", {
            "aria-label": "Parar sozinho depois de",
            onchange: ev => {
                Sons.dormir(+ev.target.value);
            }
        }, [ [ 0, "Sem temporizador" ], [ 15, "Parar em 15 min" ], [ 30, "Parar em 30 min" ], [ 45, "Parar em 45 min" ], [ 60, "Parar em 1 h" ], [ 90, "Parar em 1 h 30" ], [ 120, "Parar em 2 h" ] ].map((([v, t]) => h("option", {
            value: v
        }, t))));
        if (Sons.fimEm) {
            sel.appendChild(h("option", {
                value: ""
            }, "Temporizador ligado"));
            sel.value = "";
        } else sel.value = "0";
        const mv = h("input", {
            type: "range",
            min: 0,
            max: 100,
            value: Math.round(Sons.mestre() * 100),
            "aria-label": "Volume geral",
            oninput: ev => Sons.volumeMestre(ev.target.value / 100)
        });
        const off = Sons.onTick((() => {
            const el = document.getElementById("sons-resta");
            if (!el) return off();
            el.textContent = Sons.fimEm ? "para em " + fmtResta(Sons.fimEm - Date.now()) : "";
        }));
        root.appendChild(h("div", {
            class: "page sons"
        }, h("div", {
            class: "page-head"
        }, h("div", null, h("h1", null, "Sons de foco"), h("div", {
            class: "sub"
        }, "Ruído, chuva, lofi e outros sons para estudar. Misture quantos quiser: cada um tem o seu volume.")), h("div", {
            class: "right"
        }, h("button", {
            class: "btn primary lg sons-play",
            onclick: () => Sons.alternarTudo()
        }, icon(tocando ? "pause" : "play", "sm"), tocando ? "Pausar" : ligadas.length ? "Tocar" : "Tocar foco profundo"))), h("div", {
            class: "card sons-player"
        }, h("div", {
            class: "sons-linha"
        }, h("div", {
            class: "sons-estado"
        }, tocando ? barrasEq() : icon("volumeOff", "sm"), h("div", null, h("b", null, tocando ? "Tocando " + U.plural(ligadas.length, "som", "sons") : ligadas.length ? "Pausado" : "Nada ligado"), h("div", {
            class: "small muted"
        }, ligadas.length ? ligadas.map((id => (Sons.catalogo.find((c => c.id === id)) || {}).nome)).filter(Boolean).join(" · ") : "Escolha abaixo ou use uma combinação pronta."))), h("label", {
            class: "sons-mestre"
        }, icon("volume", "sm"), h("span", {
            class: "small"
        }, "Volume geral"), mv), h("div", {
            class: "sons-tempo"
        }, sel, resta)), h("div", {
            class: "row wrap",
            style: {
                gap: "18px",
                marginTop: "12px"
            }
        }, h("label", {
            class: "row small",
            title: "Começa quando você inicia o cronômetro e pausa quando você pausa ou termina a sessão"
        }, h("span", {
            class: "switch"
        }, h("input", {
            type: "checkbox",
            checked: Sons.seguindoCronometro,
            onchange: ev => {
                Sons.seguirCronometro(ev.target.checked);
                U.toast(ev.target.checked ? "Os sons vão tocar junto com o cronômetro." : "Os sons não acompanham mais o cronômetro.", "ok");
            }
        }), h("span")), "Tocar junto com o cronômetro"), h("label", {
            class: "row small"
        }, h("span", {
            class: "switch"
        }, h("input", {
            type: "checkbox",
            checked: Sons.retomarAoAbrir,
            onchange: ev => Sons.retomar(ev.target.checked)
        }), h("span")), "Voltar a tocar ao abrir o app"), ligadas.length ? h("button", {
            class: "btn ghost sm right",
            onclick: () => Sons.desligarTodas()
        }, "Desligar tudo") : null)), h("section", {
            class: "sec"
        }, h("header", {
            class: "sec-h"
        }, h("h2", null, "Combinações prontas"), h("span", {
            class: "right small muted"
        }, "um clique e já toca")), h("div", {
            class: "row wrap"
        }, Sons.combos.map((c => h("button", {
            class: "chip",
            title: c.desc,
            onclick: () => Sons.combo(c)
        }, c.nome))))), GRUPOS.map((([g, desc]) => h("section", {
            class: "sec"
        }, h("header", {
            class: "sec-h"
        }, h("h2", null, g), h("span", {
            class: "right small muted"
        }, desc)), h("div", {
            class: "som-grid"
        }, Sons.catalogo.filter((c => c.grupo === g)).map(cartaoSom))))), h("div", {
            class: "hint"
        }, "Todos tocam sem parar, em loop. Nada usa internet. No aplicativo (.exe) os sons continuam tocando com a janela escondida na bandeja.")));
    };
})();