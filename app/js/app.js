(function() {
    "use strict";
    const {h: h, icon: icon, $: $, clear: clear, norm: norm, ymd: ymd, fmtClock: fmtClock} = U;
    const V = window.Views = window.Views || {};
    const NAV = [ [ "painel", "Painel", "home" ], [ "edital", "Edital", "book" ], [ "pastas", "Pastas", "folder" ], [ "ciclo", "Ciclo de estudos", "refresh" ], [ "revisoes", "Revisões", "layers" ], [ "flashcards", "Flashcards", "cards" ], [ "questoes", "Questões e erros", "checkSq" ], [ "simulado", "Simulado", "target" ], [ "estatisticas", "Estatísticas", "chart" ], [ "sons", "Sons de foco", "music" ], [ "guia", "Guia e tutorial", "compass" ], ...[].concat(...Encaixe.todos("menu.rodape")), [ "ajustes", "Ajustes", "settings" ] ];
    const NAV_PRINCIPAL = 10;
    let atual = "painel", params = {};
    let elMain, elSide, elTop, elScrim;
    const App = {
        nav(view, p) {
            location.hash = "#/" + view + (p ? "?" + new URLSearchParams(p).toString() : "");
        },
        tema(t) {
            Store.mut((s => {
                s.config.tema = t;
            }), true);
            Store.aplicarTema();
            V.refresh();
        },
        alternarTema() {
            App.tema(document.documentElement.dataset.tema === "escuro" ? "claro" : "escuro");
        },
        finalizarSessao: () => Cronometro.finalizar(),
        cronometro() {
            App.nav("painel", {
                ir: "cronometro",
                n: Date.now() % 1e6
            });
        },
        atalhos: () => mostrarAtalhos(),
        logo: tam => logo(tam)
    };
    window.App = App;
    const inicial = () => (String(Store.s.perfil && Store.s.perfil.nome || "").trim()[0] || "C").toUpperCase();
    const nomePerfil = () => String(Store.s.perfil && Store.s.perfil.nome || "Concurseiro");
    function lerHash() {
        const m = location.hash.replace(/^#\/?/, "").split("?");
        const v = m[0] || "painel";
        params = Object.fromEntries(new URLSearchParams(m[1] || ""));
        atual = NAV.some((n => n[0] === v)) && V[v] ? v : "painel";
    }
    function badgeRev() {
        return D.revisoesVencidas().length + D.cardsDevidos().length;
    }
    function fechaMenu() {
        elSide.classList.remove("open");
        elScrim.classList.remove("on");
    }
    function itemNav([k, t, ic]) {
        const n = k === "revisoes" ? D.revisoesVencidas().length : k === "flashcards" ? D.cardsDevidos().length : 0;
        return h("a", {
            href: "#/" + k,
            class: atual === k ? "on" : "",
            "aria-current": atual === k ? "page" : null,
            onclick: fechaMenu
        }, icon(ic), t, n ? h("span", {
            class: "dot",
            "aria-label": n + " pendentes"
        }, n) : null);
    }
    function desenhaMenu() {
        clear(elSide);
        const cs = D.cicloEstado(), meta = Store.s.config.metaDiariaMin, min = D.minHojeVivo();
        const ed = D.edital().ed;
        elSide.appendChild(h("a", {
            class: "brand",
            href: "#/painel",
            "aria-label": "Arsenal de Estudos — Painel",
            onclick: fechaMenu
        }, logo(36), h("div", null, h("b", null, "Arsenal"), h("small", null, "para concursos"))));
        elSide.appendChild(h("nav", {
            class: "nav",
            "aria-label": "Telas"
        }, NAV.slice(0, NAV_PRINCIPAL).map(itemNav)));
        elSide.appendChild(h("div", {
            class: "side-title"
        }, h("span", {
            class: "eyebrow"
        }, "Agora"), h("a", {
            href: "#/ciclo"
        }, "ciclo")));
        elSide.appendChild(cs.atual ? h("div", {
            class: "side-card",
            title: "Estudar a matéria da vez",
            onclick: () => App.cronometro()
        }, h("div", {
            class: "ico",
            style: {
                background: D.corDisc(cs.atual.discId)
            }
        }, icon("play", "sm")), h("div", {
            class: "grow",
            style: {
                minWidth: 0
            }
        }, h("div", {
            class: "ellipsis",
            style: {
                fontWeight: 700,
                fontSize: "14px"
            }
        }, D.nomeDisc(cs.atual.discId)), D.assuntoDaVez() ? h("div", {
            class: "tiny ellipsis",
            title: D.rotuloTopico(D.assuntoDaVez())
        }, D.rotuloTopico(D.assuntoDaVez())) : null, h("div", {
            class: "tiny muted num",
            id: "side-agora",
            dataset: {
                disc: cs.atual.discId,
                feito: cs.atual.feitoSlot || 0,
                alvo: cs.atual.alvo
            }
        }, U.fmtMin(cs.atual.feitoSlot || 0) + " de " + U.fmtMin(cs.atual.alvo)))) : h("div", {
            class: "side-card",
            onclick: () => App.nav("ciclo")
        }, h("div", {
            class: "ico",
            style: {
                background: "var(--surface-3)",
                color: "var(--text)"
            }
        }, icon(D.editalZerado() ? "check" : "plus", "sm")), h("div", {
            class: "small"
        }, D.editalZerado() ? "Edital zerado! Hora de revisar" : "Monte seu ciclo de estudos")));
        elSide.appendChild(h("div", {
            class: "side-title"
        }, h("span", {
            class: "eyebrow"
        }, "Hoje")));
        elSide.appendChild(h("div", {
            class: "side-meter"
        }, h("div", {
            class: "row"
        }, h("b", {
            class: "num",
            id: "side-min"
        }, U.fmtMin(min)), h("span", {
            class: "muted"
        }, "de " + U.fmtMin(meta)), h("span", {
            class: "right muted num",
            id: "side-pct"
        }, U.pct(min, meta) + "%")), h("div", {
            class: "bar hoje",
            id: "side-bar",
            role: "progressbar",
            "aria-label": "Meta de hoje",
            "aria-valuenow": Math.min(100, U.pct(min, meta)),
            "aria-valuemin": 0,
            "aria-valuemax": 100,
            style: {
                marginTop: "7px"
            }
        }, h("i", {
            style: {
                width: Math.min(100, U.pct(min, meta)) + "%"
            }
        }))));
        const dp = D.diasParaProva();
        const cfgP = Store.s.config;
        if (!cfgP.provaData && !cfgP.provaCartaoFechado) {
            const dt = h("input", {
                type: "date",
                min: ymd(),
                "aria-label": "Data da prova",
                style: {
                    width: "100%"
                },
                onchange: ev => {
                    if (!ev.target.value) return;
                    Store.mut((st => {
                        st.config.provaData = ev.target.value;
                        st.config.provaCartaoFechado = true;
                    }));
                    U.toast("Data da prova salva.", "ok");
                }
            });
            elSide.appendChild(h("div", {
                class: "side-title"
            }, h("span", {
                class: "eyebrow"
            }, "Prova")));
            elSide.appendChild(h("div", {
                class: "side-prova"
            }, h("div", {
                class: "small",
                style: {
                    fontWeight: 700
                }
            }, "Quando é a sua prova?"), h("div", {
                class: "tiny muted"
            }, "Escolha a data e o Arsenal conta os dias para você."), dt, h("button", {
                class: "btn ghost sm",
                onclick: () => Store.mut((st => {
                    st.config.provaCartaoFechado = true;
                }))
            }, "Ainda não saiu")));
        }
        if (dp != null && dp >= 0) elSide.appendChild(h("div", null, h("div", {
            class: "side-title"
        }, h("span", {
            class: "eyebrow"
        }, "Prova")), h("div", {
            class: "prova-km",
            title: U.fmtDataLonga(Store.s.config.provaData)
        }, h("b", null, dp), h("span", {
            class: "muted small"
        }, dp === 1 ? "dia" : "dias"))));
        elSide.appendChild(h("div", {
            class: "side-foot"
        }, h("nav", {
            class: "nav",
            "aria-label": "Ajuda e ajustes"
        }, NAV.slice(NAV_PRINCIPAL).map(itemNav)), window.Backup ? Backup.linhaMenu() : null, h("div", {
            class: "user",
            onclick: () => App.nav("ajustes"),
            "aria-label": "Perfil e ajustes"
        }, h("div", {
            class: "avatar"
        }, inicial()), h("div", {
            style: {
                minWidth: 0
            }
        }, h("b", {
            class: "ellipsis",
            style: {
                display: "block",
                fontSize: "14px"
            }
        }, nomePerfil()), h("div", {
            class: "tiny muted ellipsis"
        }, "Foco: " + D.sigla(ed))))));
    }
    function logo(tam) {
        const S = Charts.svg, s = S("svg", {
            viewBox: "0 0 40 40",
            width: tam || 36,
            height: tam || 36,
            "aria-hidden": "true",
            class: "brand-mark"
        });
        s.appendChild(S("rect", {
            class: "t",
            x: 2,
            y: 2,
            width: 36,
            height: 36,
            rx: 10
        }));
        s.appendChild(S("path", {
            class: "m",
            d: "M13.6 24.8 H26.4",
            "stroke-width": 3.6
        }));
        s.appendChild(S("path", {
            class: "a",
            d: "M12.4 30 L20 10.6 L27.6 30",
            "stroke-width": 3.6,
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
        }));
        return s;
    }
    function buscar(q) {
        const e = D.edital(), s = Store.s, r = [];
        const go = (v, p) => () => App.nav(v, p);
        NAV.filter((n => norm(n[1]).includes(q))).forEach((n => r.push({
            sec: "Ir para",
            ic: n[2],
            t: n[1],
            f: go(n[0])
        })));
        if ("tema escuro claro".includes(q) || norm("alternar tema").includes(q)) r.push({
            sec: "Ir para",
            ic: "moon",
            t: "Alternar tema claro/escuro",
            f: () => App.alternarTema()
        });
        if ("atalhos teclado ajuda".includes(q)) r.push({
            sec: "Ir para",
            ic: "keyboard",
            t: "Atalhos de teclado",
            f: () => mostrarAtalhos()
        });
        if ("ruido chuva lofi musica som sons foco ventilador abafar abafador fogueira cafeteria garoa".includes(q)) r.push({
            sec: "Ir para",
            ic: "music",
            t: "Sons de foco (ruído, chuva, lofi...)",
            f: go("sons")
        });
        if ("backup nuvem salvar copia onedrive dropbox google drive".includes(q)) r.push({
            sec: "Ir para",
            ic: "download",
            t: "Backup automático na nuvem",
            f: go("ajustes")
        });
        if ("pdf edital novo atualizar importar".includes(q)) r.push({
            sec: "Ir para",
            ic: "upload",
            t: "Atualizar o edital por PDF",
            f: () => window.EditalPDF && EditalPDF.abrir()
        });
        if ("tutorial tour ajuda como usar comecar".includes(q)) r.push({
            sec: "Ir para",
            ic: "compass",
            t: "Fazer o tour guiado",
            f: () => window.Tour && Tour.iniciar()
        });
        e.discs.filter((d => norm(d.nome).includes(q))).slice(0, 5).forEach((d => r.push({
            sec: "Matérias",
            cor: D.corDisc(d.id),
            t: d.nome,
            f: go("edital", {
                d: d.id
            })
        })));
        let n = 0;
        for (const [id, t] of Object.entries(e.topico)) {
            if (norm(t.texto).includes(q) || t.num === q) {
                r.push({
                    sec: "Assuntos",
                    cor: D.corDisc(e.discDe[id]),
                    num: t.num,
                    t: t.texto.slice(0, 90),
                    ex: D.nomeDisc(e.discDe[id]),
                    f: go("edital", {
                        t: id
                    })
                });
                if (++n >= 8) break;
            }
        }
        n = 0;
        for (const x of s.questoes) {
            if (norm(x.enunciado || "").includes(q)) {
                r.push({
                    sec: "Questões",
                    ic: "checkSq",
                    t: String(x.enunciado).slice(0, 90),
                    ex: x.resultado,
                    f: () => {
                        App.nav("questoes");
                        setTimeout((() => V.abrirQuestao && V.abrirQuestao(x.id)), 60);
                    }
                });
                if (++n >= 5) break;
            }
        }
        n = 0;
        for (const p of s.pastas) {
            if (norm(p.nome).includes(q)) {
                r.push({
                    sec: "Pastas",
                    ic: "folder",
                    t: p.nome,
                    f: go("pastas", {
                        p: p.id
                    })
                });
                if (++n >= 5) break;
            }
        }
        return r;
    }
    function desenhaTopo() {
        clear(elTop);
        const c = Store.s.cron, n = badgeRev();
        const busca = h("input", {
            type: "search",
            placeholder: "Buscar assunto, matéria, questão ou pasta",
            "aria-label": "Buscar (atalho: barra)",
            autocomplete: "off",
            role: "combobox",
            "aria-expanded": "false",
            "aria-controls": "search-res"
        });
        const res = h("div", {
            class: "search-res hide",
            id: "search-res",
            role: "listbox"
        });
        let itens = [], sel = -1;
        const marca = i => {
            sel = i;
            [ ...res.querySelectorAll("button") ].forEach(((b, k) => b.classList.toggle("sel", k === i)));
            const b = res.querySelectorAll("button")[i];
            b && b.scrollIntoView({
                block: "nearest"
            });
        };
        const fecha = () => {
            res.classList.add("hide");
            busca.setAttribute("aria-expanded", "false");
        };
        const abre = it => {
            fecha();
            busca.value = "";
            it.f();
        };
        busca.addEventListener("input", U.debounce((() => {
            const q = norm(busca.value);
            clear(res);
            itens = [];
            sel = -1;
            if (q.length < 2) return fecha();
            itens = buscar(q);
            let secAtual = "";
            itens.forEach((it => {
                if (it.sec !== secAtual) {
                    secAtual = it.sec;
                    res.appendChild(h("div", {
                        class: "sec"
                    }, secAtual));
                }
                res.appendChild(h("button", {
                    role: "option",
                    onmousedown: ev => ev.preventDefault(),
                    onclick: () => abre(it)
                }, it.cor ? h("span", {
                    class: "dot-c",
                    style: {
                        background: it.cor
                    }
                }) : icon(it.ic || "search", "sm"), it.num ? h("span", {
                    class: "tiny muted",
                    style: {
                        minWidth: "34px"
                    }
                }, it.num) : null, h("span", {
                    class: "small"
                }, it.t), it.ex ? h("span", {
                    class: "muted tiny right"
                }, it.ex) : null));
            }));
            if (!itens.length) res.appendChild(h("div", {
                class: "empty small"
            }, "Nada encontrado"));
            res.classList.remove("hide");
            busca.setAttribute("aria-expanded", "true");
        }), 120));
        busca.addEventListener("blur", (() => setTimeout(fecha, 150)));
        busca.addEventListener("keydown", (e => {
            if (e.key === "Escape") {
                busca.value = "";
                fecha();
                busca.blur();
            } else if (e.key === "ArrowDown" && itens.length) {
                e.preventDefault();
                marca(Math.min(itens.length - 1, sel + 1));
            } else if (e.key === "ArrowUp" && itens.length) {
                e.preventDefault();
                marca(Math.max(0, sel - 1));
            } else if (e.key === "Enter" && itens[Math.max(0, sel)]) {
                e.preventDefault();
                abre(itens[Math.max(0, sel)]);
            }
        }));
        elTop.appendChild(h("button", {
            class: "icon-btn menu-btn",
            "aria-label": "Abrir menu",
            onclick: () => {
                elSide.classList.add("open");
                elScrim.classList.add("on");
            }
        }, icon("menu")));
        const kbdBusca = h("kbd", {
            class: "atalho",
            "aria-hidden": "true"
        }, "/");
        busca.addEventListener("focus", (() => kbdBusca.classList.add("hide")));
        busca.addEventListener("blur", (() => kbdBusca.classList.remove("hide")));
        elTop.appendChild(h("div", {
            class: "search"
        }, icon("search"), busca, kbdBusca, res));
        if (c.status !== "parado") {
            elTop.appendChild(h("button", {
                class: "timer-pill",
                id: "pill",
                title: "Ir ao cronômetro",
                onclick: () => App.cronometro()
            }, h("span", {
                class: "live"
            }), h("span", {
                id: "pillt"
            }, "00:00")));
        }
        if (window.Sons && Sons.tocando) elTop.appendChild(h("button", {
            class: "timer-pill sons-pill",
            title: "Pausar os sons de foco",
            "aria-label": "Pausar os sons de foco",
            onclick: () => Sons.pausar()
        }, h("span", {
            class: "som-eq",
            "aria-hidden": "true"
        }, h("i"), h("i"), h("i"), h("i")), h("span", null, "Pausar sons")));
        const escuro = document.documentElement.dataset.tema === "escuro";
        elTop.appendChild(h("div", {
            class: "top-acts"
        }, h("button", {
            class: "icon-btn",
            title: "Sons de foco (ruído, chuva, lofi)",
            "aria-label": "Sons de foco",
            onclick: () => App.nav("sons")
        }, icon("music")), window.arsenalExe && arsenalExe.desenho ? h("button", {
            class: "icon-btn",
            title: "Desenhar na tela (Alt+Shift+D)",
            "aria-label": "Desenhar na tela",
            onclick: () => arsenalExe.desenho.abrir()
        }, icon("edit")) : null, window.arsenalExe && arsenalExe.mini ? h("button", {
            class: "icon-btn" + (miniAberto ? " on" : ""),
            title: miniAberto ? "Fechar o cronômetro fixo na tela" : "Cronômetro fixo na tela",
            "aria-label": "Cronômetro fixo na tela",
            "aria-pressed": miniAberto ? "true" : "false",
            onclick: () => miniAberto ? arsenalExe.mini.fechar() : arsenalExe.mini.abrir()
        }, icon("pin")) : null, window.Publicacao ? Publicacao.botaoApoio() : null, h("button", {
            class: "btn ghost sm btn-tutorial",
            title: "Tour guiado pelas telas (2 minutos)",
            onclick: () => window.Tour && Tour.iniciar()
        }, icon("compass", "sm"), h("span", null, "Tutorial")), h("button", {
            class: "icon-btn so-teclado",
            title: "Atalhos de teclado ( ? )",
            "aria-label": "Atalhos de teclado",
            onclick: mostrarAtalhos
        }, icon("keyboard")), h("button", {
            class: "icon-btn",
            title: escuro ? "Tema claro" : "Tema escuro",
            "aria-label": escuro ? "Mudar para o tema claro" : "Mudar para o tema escuro",
            onclick: () => App.alternarTema()
        }, icon(escuro ? "sun" : "moon")), h("button", {
            class: "icon-btn",
            title: n ? U.plural(n, "revisão pendente", "revisões pendentes") : "Nenhuma revisão pendente",
            "aria-label": n + " revisões pendentes",
            onclick: () => App.nav("revisoes")
        }, icon("bell"), n ? h("span", {
            class: "pip"
        }) : null)));
    }
    function recepcao() {
        const nome = h("input", {
            type: "text",
            maxLength: 40,
            placeholder: "Como você quer ser chamado?",
            value: Store.s.perfil.nome === "Concurseiro" ? "" : Store.s.perfil.nome,
            style: {
                width: "100%"
            }
        });
        const marca = h("div", {
            class: "row",
            style: {
                gap: "14px",
                alignItems: "center"
            }
        }, logo(52), h("div", null, h("div", {
            class: "eyebrow"
        }, "Bem-vindo"), h("div", {
            style: {
                fontSize: "22px",
                fontWeight: 800,
                letterSpacing: "-.015em"
            }
        }, "Arsenal de Estudos")));
        const salvarNome = () => {
            const v = nome.value.trim();
            if (v) Store.mut((s => {
                s.perfil.nome = v;
            }), true);
        };
        const m = U.modal({
            titulo: "Primeiro acesso",
            corpo: h("div", {
                class: "col",
                style: {
                    gap: "16px"
                }
            }, marca, h("p", {
                style: {
                    margin: 0
                }
            }, "Seu edital, seu ciclo de estudos, o cronômetro, as revisões e o caderno de erros num lugar só. Tudo fica salvo neste computador: sem conta e sem internet."), h("label", {
                class: "f"
            }, "Seu nome (opcional)", nome), h("div", {
                class: "callout"
            }, h("b", null, "Qual é o seu concurso? "), "O Arsenal já vem com o edital do Banco do Brasil (Escriturário), para você explorar. Vai estudar outro? Abra o PDF do edital dele: o app lê as matérias e os assuntos e monta o ciclo e as pastas.", h("div", {
                style: {
                    marginTop: "10px"
                }
            }, h("button", {
                class: "btn",
                onclick: () => {
                    salvarNome();
                    m.close();
                    setTimeout((() => window.EditalPDF && EditalPDF.abrir({
                        primeira: true
                    })), 280);
                }
            }, icon("upload", "sm"), "Carregar o edital do meu concurso"))), h("div", {
                class: "callout"
            }, h("b", null, "Sugestão: "), "faça o tour guiado. São " + (window.Tour ? Tour.total : 14) + " passos curtos que mostram onde fica cada coisa. Dá para refazer quando quiser no botão ", h("b", null, "Tutorial"), ", no topo da tela.")),
            botoes: [ {
                texto: "Explorar sozinho",
                fn: () => {
                    salvarNome();
                }
            }, {
                texto: "Fazer o tour (2 min)",
                tipo: "primary",
                fn: () => {
                    salvarNome();
                    setTimeout((() => window.Tour && Tour.iniciar()), 260);
                }
            } ],
            aoFechar: () => Store.mut((s => {
                s.config.tourVisto = true;
            }), true)
        });
    }
    function mostrarAtalhos() {
        const L = (teclas, t) => h("div", {
            class: "kv-row"
        }, h("span", null, t), h("span", null, teclas.map(((k, i) => [ i ? " " : null, h("kbd", null, k) ]))));
        U.modal({
            titulo: "Atalhos de teclado",
            corpo: h("div", {
                class: "grid g2"
            }, h("div", null, h("h4", {
                style: {
                    marginBottom: "6px"
                }
            }, "No app"), L([ "/" ], "Buscar"), L([ "?" ], "Esta lista"), L([ "Esc" ], "Fechar janela ou busca"), L([ "Espaço" ], "Iniciar/pausar o cronômetro (no Painel)"), L([ "G", "P" ], "Ir ao Painel"), L([ "G", "E" ], "Ir ao Edital"), L([ "G", "R" ], "Ir às Revisões"), L([ "G", "C" ], "Ir aos Flashcards"), L([ "G", "Q" ], "Ir às Questões"), L([ "G", "G" ], "Abrir o Guia")), h("div", null, h("h4", {
                style: {
                    marginBottom: "6px"
                }
            }, "Flashcards"), L([ "Espaço" ], "Mostrar resposta"), L([ "1" ], "Errei"), L([ "2" ], "Difícil"), L([ "3" ], "Bom"), L([ "4" ], "Fácil"), L([ "C", "E" ], "Responder Certo ou errado"), L([ "Z" ], "Desfazer a última nota"), L([ "Ctrl", "Enter" ], "Salvar o cartão (no editor)"), Encaixe.todos("atalhos.extras", L))),
            largo: true,
            botoes: [ {
                texto: "Fechar"
            } ]
        });
    }
    const BARRAS = ".bar > i, .b-bar > i, .trilho > i";
    const chaveArco = el => (el.ownerSVGElement && el.ownerSVGElement.getAttribute("aria-label") || "").split(":")[0];
    function fotografar(raiz) {
        const arcos = new Map;
        raiz.querySelectorAll("circle.arco").forEach((el => {
            const k = chaveArco(el);
            (arcos.get(k) || arcos.set(k, []).get(k)).push(el.getAttribute("stroke-dasharray"));
        }));
        return {
            barras: [ ...raiz.querySelectorAll(BARRAS) ].map((el => el.style.width)),
            arcos: arcos,
            sw: [ ...raiz.querySelectorAll(".switch input") ].map((el => el.dataset.vis))
        };
    }
    function continuar(raiz, antes) {
        const sws = [ ...raiz.querySelectorAll(".switch input") ];
        if (antes && !U.reduzMov()) {
            const depois = [];
            const barras = [ ...raiz.querySelectorAll(BARRAS) ];
            if (barras.length === antes.barras.length) barras.forEach(((el, i) => {
                const fim = el.style.width, ini = antes.barras[i];
                if (ini && fim && ini !== fim) {
                    el.style.width = ini;
                    depois.push((() => {
                        el.style.width = fim;
                    }));
                }
            }));
            const vistos = new Map;
            raiz.querySelectorAll("circle.arco").forEach((el => {
                const k = chaveArco(el), n = vistos.get(k) || 0;
                vistos.set(k, n + 1);
                const ini = (antes.arcos.get(k) || [])[n], fim = el.getAttribute("stroke-dasharray");
                if (ini && ini !== fim) {
                    el.setAttribute("stroke-dasharray", ini);
                    depois.push((() => el.setAttribute("stroke-dasharray", fim)));
                }
            }));
            if (sws.length === antes.sw.length) sws.forEach(((el, i) => {
                const fim = el.checked, ini = antes.sw[i];
                if (ini != null && ini === "1" !== fim) {
                    el.checked = ini === "1";
                    depois.push((() => {
                        el.checked = fim;
                    }));
                }
            }));
            if (depois.length) {
                void raiz.offsetWidth;
                depois.forEach((f => f()));
            }
        }
        sws.forEach((el => {
            el.dataset.vis = el.checked ? "1" : "0";
        }));
    }
    const assinaturaCampo = x => x.tagName + "|" + (x.id || x.getAttribute("aria-label") || x.getAttribute("placeholder") || x.textContent.trim().slice(0, 40));
    function guardarFoco(raiz) {
        const el = document.activeElement;
        if (!el || el === raiz || !raiz.contains(el) || !/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(el.tagName)) return null;
        const s = assinaturaCampo(el);
        let sel = null;
        try {
            sel = el.selectionStart != null ? [ el.selectionStart, el.selectionEnd ] : null;
        } catch (e) {}
        return {
            s: s,
            tag: el.tagName,
            sel: sel,
            n: [ ...raiz.querySelectorAll(el.tagName) ].filter((x => assinaturaCampo(x) === s)).indexOf(el)
        };
    }
    function voltarFoco(raiz, f) {
        if (!f || f.n < 0 || document.querySelector(".overlay:not(.saindo)")) return;
        const el = [ ...raiz.querySelectorAll(f.tag) ].filter((x => assinaturaCampo(x) === f.s))[f.n];
        if (el && !el.disabled) try {
            el.focus({
                preventScroll: true
            });
            if (f.sel) el.setSelectionRange(f.sel[0], f.sel[1]);
        } catch (e) {}
    }
    function renderTudo(novaTela) {
        if (!elMain) return;
        const wy = window.scrollY;
        U.tiraTip();
        const fotoSide = fotografar(elSide), fotoMain = novaTela ? null : fotografar(elMain), foco = novaTela ? null : guardarFoco(elMain);
        try {
            desenhaMenu();
            desenhaTopo();
        } catch (e) {
            console.error("casca", e);
        }
        continuar(elSide, fotoSide);
        clear(elMain);
        elMain.classList.toggle("entrar", !!novaTela);
        try {
            V[atual](elMain, params);
        } catch (e) {
            console.error(e);
            elMain.appendChild(h("div", {
                class: "page"
            }, h("div", {
                class: "card"
            }, h("h3", null, "Ops, algo deu errado nesta tela"), h("p", {
                class: "muted"
            }, "Seus dados estão salvos. Tente outra tela ou recarregue (F5)."), h("pre", {
                style: {
                    whiteSpace: "pre-wrap",
                    fontSize: "12px"
                }
            }, String(e && e.stack || e)))));
        }
        if (novaTela) {
            elMain.querySelectorAll(".page > *").forEach(((el, i) => el.style.setProperty("--i", Math.min(i, 8))));
            elMain.querySelectorAll("[data-count]").forEach((el => U.contar(el, +el.dataset.count)));
        }
        continuar(elMain, fotoMain);
        window.scrollTo(0, novaTela ? 0 : wy);
        voltarFoco(elMain, foco);
        const nome = (NAV.find((n => n[0] === atual)) || [])[1];
        if (Store.s.cron.status === "parado") document.title = (nome ? nome + " · " : "") + "Arsenal de Estudos";
    }
    let rafPend = false;
    V.refresh = () => {
        if (rafPend) return;
        rafPend = true;
        setTimeout((() => {
            rafPend = false;
            renderTudo(false);
        }), 0);
    };
    function menuAoVivo(ms) {
        const meta = Store.s.config.metaDiariaMin, min = D.minHojeVivo(), p = Math.min(100, U.pct(min, meta));
        const a = $("#side-min"), b = $("#side-pct"), bar = $("#side-bar");
        if (a) a.textContent = U.fmtMin(min);
        if (b) b.textContent = U.pct(min, meta) + "%";
        if (bar) {
            bar.setAttribute("aria-valuenow", p);
            bar.firstChild.style.width = p + "%";
        }
        const ag = $("#side-agora"), c = Store.s.cron;
        if (ag && (c.discSessao || c.discId) === ag.dataset.disc) ag.textContent = U.fmtMin(+ag.dataset.feito + ms / 6e4) + " de " + U.fmtMin(+ag.dataset.alvo);
    }
    let ultimoTick = Date.now(), diaVisto = ymd();
    let miniAberto = false;
    function empurraMini(c) {
        if (!miniAberto || !window.arsenalExe || !arsenalExe.mini) return;
        if (c.status === "parado" && window.Foco && Foco.emPausa) {
            const f = Foco.estado;
            arsenalExe.mini.estado({
                txt: fmtClock(Math.max(0, f.pausaFim - Date.now()) / 1e3),
                status: "pausado",
                modo: "regressivo",
                disc: "Pausa · rodada " + f.rodada + " de " + f.r + " feita"
            });
            return;
        }
        const ms = c.status === "parado" ? 0 : D.Cron.ms();
        const txt = c.modo === "regressivo" ? fmtClock(Math.max(0, c.alvoMin * 6e4 - ms) / 1e3) : fmtClock(ms / 1e3);
        let disc = "";
        try {
            const d = D.Cron.discEfetiva();
            disc = d ? D.nomeDisc(d, false) : "";
        } catch (e) {}
        arsenalExe.mini.estado({
            txt: txt,
            status: c.status,
            modo: c.modo,
            disc: disc
        });
    }
    const VIVO_KEY = "arsenal.cron.vivo";
    let vivoGravado = 0;
    const lerVivo = () => {
        try {
            return +localStorage.getItem(VIVO_KEY) || 0;
        } catch (e) {
            return 0;
        }
    };
    const gravarVivo = ms => {
        vivoGravado = ms;
        try {
            localStorage.setItem(VIVO_KEY, String(ms));
        } catch (e) {}
    };
    function tick() {
        const agora = Date.now(), c = Store.s.cron;
        const limite = document.hidden && !window.arsenalExe ? 18e4 : 3e4;
        if (agora - ultimoTick > limite && c.status === "rodando") {
            D.Cron.corrigirLacuna(ultimoTick);
            U.toast("Percebi uma pausa longa (" + U.fmtMin((agora - ultimoTick) / 6e4) + "). Esse intervalo não foi contado.");
        }
        ultimoTick = agora;
        if (c.status === "rodando" && agora - vivoGravado >= 15e3) gravarVivo(agora);
        empurraMini(c);
        if (ymd() !== diaVisto) {
            diaVisto = ymd();
            V.refresh();
        }
        if (c.status === "parado") return;
        const ms = D.Cron.ms();
        const txt = c.modo === "regressivo" ? fmtClock(Math.max(0, c.alvoMin * 6e4 - ms) / 1e3) : fmtClock(ms / 1e3);
        const pt = $("#pillt");
        if (pt) pt.textContent = txt;
        menuAoVivo(ms);
        document.title = (c.status === "rodando" ? "▶ " : "‖ ") + txt + " · Arsenal";
        if (c.status === "rodando" && c.modo === "regressivo" && ms >= c.alvoMin * 6e4) Cronometro.fim();
    }
    async function iniciar() {
        await Store.init();
        if (!D.carreiras()[Store.s.carreiraId]) {
            Encaixe.todos("app.editalSumiu");
            D.trocarEdital("bb");
            Store.s.ciclo.gerado = true;
        }
        const c0 = Store.s.cron;
        if (c0.status === "rodando" && c0.iniMs) {
            const vivo = Math.max(c0.iniMs, lerVivo());
            if (Date.now() - vivo > 12e4) {
                Store.mut((s => {
                    s.cron.acumMs += Math.max(0, vivo - s.cron.iniMs);
                    s.cron.status = "pausado";
                    s.cron.iniMs = null;
                }), true);
                const hh = new Date(vivo).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit"
                });
                setTimeout((() => U.toast("O cronômetro estava rodando quando o app fechou. Contei o estudo até " + hh + " e pausei; o tempo com o app fechado não entrou.")), 600);
            }
        }
        if (!Store.s.ciclo.itens.length && !Store.s.ciclo.gerado) {
            D.gerarCiclo({
                horasDia: 1,
                dias: 7,
                porPeso: true,
                intercalar: true
            });
            Store.s.ciclo.gerado = true;
            Store.s.ciclo.voltaIniEm = Date.now();
        }
        const root = $("#app");
        elSide = h("aside", {
            class: "sidebar",
            "aria-label": "Menu principal"
        });
        elTop = h("header", {
            class: "topbar"
        });
        elMain = h("div", {
            id: "view",
            tabindex: "-1"
        });
        elScrim = h("div", {
            class: "scrim",
            onclick: fechaMenu
        });
        root.appendChild(elSide);
        root.appendChild(elScrim);
        root.appendChild(h("main", {
            class: "main",
            id: "conteudo"
        }, elTop, elMain));
        document.body.insertBefore(h("a", {
            class: "skip",
            href: "#conteudo",
            onclick: e => {
                e.preventDefault();
                elMain.focus({
                    preventScroll: true
                });
            }
        }, "Pular para o conteúdo"), document.body.firstChild);
        Store.on(V.refresh);
        window.addEventListener("hashchange", (() => {
            lerHash();
            fechaMenu();
            window.Detalhe && Detalhe.fechar();
            renderTudo(true);
            elMain.focus({
                preventScroll: true
            });
        }));
        let prefixoG = 0;
        document.addEventListener("keydown", (e => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const t = document.activeElement, digitando = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
            if (e.key === "Escape") {
                fechaMenu();
                return;
            }
            if (digitando || document.querySelector(".overlay:not(.saindo)")) return;
            if (e.key === "/") {
                e.preventDefault();
                const i = $(".search input");
                i && i.focus();
                return;
            }
            if (e.key === "?") {
                e.preventDefault();
                mostrarAtalhos();
                return;
            }
            if (e.key === " " && atual === "painel" && !(t && t.tagName === "BUTTON")) {
                e.preventDefault();
                const st = Store.s.cron.status;
                st === "parado" ? D.Cron.iniciar() : st === "rodando" ? D.Cron.pausar() : D.Cron.retomar();
                return;
            }
            if (Date.now() < prefixoG) {
                const m = {
                    p: "painel",
                    e: "edital",
                    f: "pastas",
                    r: "revisoes",
                    c: "flashcards",
                    q: "questoes",
                    s: "estatisticas",
                    a: "ajustes",
                    g: "guia"
                }[e.key.toLowerCase()];
                prefixoG = 0;
                if (m) {
                    e.preventDefault();
                    App.nav(m);
                }
                return;
            }
            if (e.key.toLowerCase() === "g") prefixoG = Date.now() + 1200;
        }));
        document.addEventListener("visibilitychange", (() => {
            if (!document.hidden) Encaixe.todos("app.voltou");
        }));
        lerHash();
        renderTudo(true);
        if (window.Backup) Backup.iniciar().catch((e => console.warn("backup", e)));
        if (window.Sons) {
            Sons.on((() => V.refresh()));
            Sons.iniciarApp();
        }
        if (window.Publicacao) Publicacao.iniciar();
        if (!Store.s.config.tourVisto) setTimeout(recepcao, 450);
        window.addEventListener("scroll", (() => elTop.classList.toggle("rolou", window.scrollY > 4)), {
            passive: true
        });
        setInterval(tick, 500);
        Encaixe.todos("app.iniciou");
        window.addEventListener("pagehide", (() => {
            if (Store.s.cron.status === "rodando") gravarVivo(Date.now());
            Store.salvarAgora();
        }));
        if (window.arsenalExe) {
            try {
                if (arsenalExe.aoSalvar) arsenalExe.aoSalvar((() => Store.salvarAgora()));
                if (arsenalExe.mini) {
                    arsenalExe.mini.aoMudar((aberto => {
                        miniAberto = aberto;
                        empurraMini(Store.s.cron);
                        V.refresh();
                    }));
                    arsenalExe.mini.aoComando((cmd => {
                        if (cmd !== "alternar") return;
                        const st = Store.s.cron.status;
                        if (st === "parado" && window.Foco && Foco.emPausa) {
                            Foco.pularPausa();
                            empurraMini(Store.s.cron);
                            return;
                        }
                        if (st === "parado") D.Cron.iniciar(); else if (st === "rodando") D.Cron.pausar(); else D.Cron.retomar();
                        empurraMini(Store.s.cron);
                    }));
                }
                if (arsenalExe.aoNavegar) arsenalExe.aoNavegar((hash => {
                    if (/^#\/[a-z]+(\?[\w=&%-]*)?$/i.test(hash || "")) {
                        if (location.hash === hash) window.dispatchEvent(new HashChangeEvent("hashchange")); else location.hash = hash;
                    }
                }));
            } catch (e) {
                console.warn("casca", e);
            }
        }
        if (Store._restauradoDoDisco) setTimeout((() => U.toast("Seus dados foram recuperados da cópia que o programa guarda no computador.", "ok")), 1e3);
        if (Store._estadoIlegivel) setTimeout((() => U.toast("Os dados salvos estavam ilegíveis. Guardei uma cópia deles; procure ajuda antes de continuar (ou restaure um backup em Ajustes).", "err")), 1e3);
    }
    document.addEventListener("DOMContentLoaded", iniciar);
})();