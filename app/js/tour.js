(function() {
    "use strict";
    const {h: h, icon: icon} = U;
    const PASSOS = [ {
        tela: "painel",
        alvo: null,
        titulo: "Bem-vindo ao Arsenal",
        texto: "Este tour mostra onde fica cada coisa e o que fazer em cada tela. Leva uns dois minutos.",
        dica: "Use as setas do teclado ou os botões. Esc sai a qualquer momento."
    }, {
        tela: "painel",
        alvo: ".sidebar .nav",
        titulo: "O menu",
        texto: "As telas de estudo ficam aqui (inclusive os Flashcards e os Sons de foco). Embaixo, no rodapé do menu, estão o Guia (este tutorial por escrito)" + U.txt("tour.menuExtra", "") + " e os Ajustes."
    }, {
        tela: "painel",
        alvo: ".palco-anel",
        titulo: "O anel do dia",
        texto: "Cada fatia é um bloco de matéria do seu plano de hoje. Aperte o play no meio: a fatia da vez começa a encher enquanto o cronômetro anda. Se você estudar além do plano, o anel abre uma fatia nova sozinho.",
        dica: "Passe o mouse numa fatia para abrir o desempenho por assunto daquela matéria."
    }, {
        tela: "painel",
        alvo: ".palco-plano",
        titulo: "Plano de hoje",
        texto: 'Os blocos saem do seu ciclo de estudos, a partir da matéria da vez. Use − e + para mudar a carga horária do dia; em "Ajustar" você troca matérias e tempos.'
    }, {
        tela: "painel",
        alvo: ".fatos",
        titulo: "Seus números",
        texto: "Dias seguidos, horas da semana, questões de hoje, revisões pendentes, quanto do edital já foi e os dias até a prova. Os gráficos coloridos ao lado da data resumem a semana, o edital e o acerto."
    }, {
        tela: "edital",
        alvo: ".disc-list",
        titulo: "O edital inteiro",
        texto: "Todas as matérias do edital, com o progresso de cada uma. Clique numa matéria para ver os assuntos dela à direita."
    }, {
        tela: "edital",
        alvo: ".tree .st",
        titulo: "Status de cada assunto",
        texto: 'Clique para avançar: Estudando, Teoria concluída, Revisado, Dominado. Quando chega em "Teoria concluída", as revisões de 1, 7, 30 e 60 dias são agendadas sozinhas.',
        dica: "Shift + clique volta um estágio. O lápis ao lado abre anotações e revisões extras."
    }, {
        tela: "ciclo",
        alvo: ".cycle-row",
        titulo: "Ciclo de estudos",
        texto: 'Cada matéria ganha um bloco de cerca de 1 h, na ordem. Mude os minutos e as "vezes na volta" (1× a 3×: quantas vezes ela aparece em cada volta, sempre espalhadas, nunca seguidas), reordene com as setas, desligue o interruptor para tirar da volta ou use o alfinete para escolher a próxima. O que não couber na semana continua na seguinte.'
    }, {
        tela: "painel",
        alvo: "#sessao",
        titulo: "Sessão de estudo",
        texto: "O cronômetro é o anel lá em cima. Aqui embaixo você escolhe se ele é livre ou em contagem regressiva, a matéria, o assunto e o tipo de estudo. Ele continua contando mesmo se você trocar de tela ou recarregar. Ao finalizar, você ajusta os minutos, marca o assunto e registra as questões feitas.",
        dica: "Espaço inicia e pausa."
    }, {
        tela: "revisoes",
        alvo: ".page-head .tabs",
        titulo: "Revisões e flashcards",
        texto: '"Hoje" mostra os assuntos que venceram, "Agendadas" o que vem pela frente e "Flashcards" os seus cartões (frente e verso, lacuna ou Certo ou errado) e as questões que você errou, que voltam no dia certo.',
        dica: "Nos flashcards, Espaço mostra a resposta e as teclas 1 a 4 dão a nota."
    }, {
        tela: "questoes",
        alvo: ".page-head .right",
        titulo: "Questões e caderno de erros",
        texto: U.txt("tour.questoes", "Registre questões à mão ou em lote (só feitas e acertos). As questões erradas que você registrar viram flashcards.")
    }, {
        tela: "pastas",
        alvo: ".page-head .right",
        titulo: "Pastas",
        texto: U.txt("tour.pastas", "Organize as questões em pastas. Gere as pastas a partir do edital ou cole uma lista. Arraste uma pasta sobre outra para mover.")
    }, {
        tela: "estatisticas",
        alvo: ".kpis",
        titulo: "Estatísticas",
        texto: "Tempo por matéria e por tipo de estudo, presença no ano e acerto por semana. No fim da tela, compare o peso de cada matéria na prova com o tempo que você deu a ela."
    }, {
        tela: "sons",
        alvo: ".sons-player",
        titulo: "Sons de foco",
        texto: "Lofi hip hop, jazz lofi, abafador, chuva fraca, fogueira e ventilador. Ligue um ou vários ao mesmo tempo, cada um com o seu volume, ou use uma combinação pronta. Dá para parar sozinho depois de um tempo e para tocar junto com o cronômetro."
    }, {
        tela: null,
        alvo: ".topbar .search",
        titulo: "Busca rápida",
        texto: "Aperte a tecla / em qualquer tela para achar um assunto, uma matéria, uma questão ou uma pasta."
    }, {
        tela: "painel",
        alvo: ".topbar .btn-tutorial",
        titulo: "Pronto",
        texto: "Este tour fica sempre aqui, no botão Tutorial. O Guia, no menu, explica cada tela com calma" + U.txt("tour.prontoExtra", "") + ". Em Ajustes ficam metas, tema e backup.",
        dica: "Comece pelo Edital: marque o que você já estudou."
    } ];
    let i = 0, ativo = false, els = null, voltarPara = null, gen = 0;
    const visivel = el => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
    };
    const telaAtual = () => location.hash.replace(/^#\/?/, "").split("?")[0] || "painel";
    function montar() {
        const luz = h("div", {
            class: "tour-luz centro",
            "aria-hidden": "true"
        });
        const bloq = h("div", {
            class: "tour-bloq",
            "aria-hidden": "true"
        });
        const card = h("div", {
            class: "tour-card",
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "tour-t",
            tabindex: "-1"
        });
        document.body.append(bloq, luz, card);
        return {
            luz: luz,
            bloq: bloq,
            card: card
        };
    }
    function posicionar() {
        if (!ativo || !els) return;
        const p = PASSOS[i], {luz: luz, card: card} = els;
        const alvo = p.alvo ? document.querySelector(p.alvo) : null;
        const cw = card.offsetWidth || 380, ch = card.offsetHeight || 220, M = 16, W = innerWidth, H = innerHeight;
        if (!alvo || !visivel(alvo)) {
            luz.classList.add("centro");
            luz.style.left = W / 2 + "px";
            luz.style.top = H / 2 + "px";
            card.style.left = Math.max(M, (W - cw) / 2) + "px";
            card.style.top = Math.max(M, (H - ch) / 2) + "px";
            return;
        }
        const r = alvo.getBoundingClientRect(), pad = 6;
        const tb = document.querySelector(".topbar"), topo = alvo.closest(".topbar") || !tb ? 4 : Math.max(4, tb.getBoundingClientRect().bottom + 4);
        const t0 = Math.max(topo, r.top - pad), alto = Math.min(r.bottom + pad, H - 4) - t0;
        const cabeAoLado = Math.max(4, r.left - pad) + Math.min(W - 8, r.width + pad * 2) + M + cw <= W - M;
        const maxH = cabeAoLado ? Math.round(H * .55) : Math.max(96, Math.min(Math.round(H * .55), H - ch - 3 * M - t0));
        const box = {
            l: Math.max(4, r.left - pad),
            t: t0,
            w: Math.min(W - 8, r.width + pad * 2),
            h: Math.max(24, Math.min(alto, maxH))
        };
        luz.classList.remove("centro");
        Object.assign(luz.style, {
            left: box.l + "px",
            top: box.t + "px",
            width: box.w + "px",
            height: box.h + "px"
        });
        let x, y;
        if (box.l + box.w + M + cw <= W - M) {
            x = box.l + box.w + M;
            y = box.t;
        } else if (box.t + box.h + M + ch <= H - M) {
            x = box.l;
            y = box.t + box.h + M;
        } else if (box.t - M - ch >= M) {
            x = box.l;
            y = box.t - M - ch;
        } else if (box.l - M - cw >= M) {
            x = box.l - M - cw;
            y = box.t;
        } else {
            x = (W - cw) / 2;
            y = H - ch - M;
        }
        card.style.left = Math.min(Math.max(M, x), W - cw - M) + "px";
        card.style.top = Math.min(Math.max(M, y), H - ch - M) + "px";
    }
    function desenharCard() {
        const p = PASSOS[i], {card: card} = els, ultimo = i === PASSOS.length - 1;
        U.clear(card);
        U.add(card, [ h("div", {
            class: "passo"
        }, i + 1 + " de " + PASSOS.length, h("i", null, h("b", {
            style: {
                width: (i + 1) / PASSOS.length * 100 + "%"
            }
        }))), h("h3", {
            id: "tour-t"
        }, p.titulo), h("p", null, p.texto), p.dica ? h("div", {
            class: "dica"
        }, p.dica) : null, h("div", {
            class: "acts"
        }, h("button", {
            class: "btn ghost sm",
            onclick: fechar
        }, ultimo ? "Fechar" : "Sair do tour"), h("span", {
            class: "right"
        }), i > 0 ? h("button", {
            class: "btn sm",
            "aria-label": "Passo anterior",
            onclick: () => ir(i - 1)
        }, icon("arrowLeft", "sm")) : null, h("button", {
            class: "btn primary sm",
            onclick: () => ultimo ? fechar() : ir(i + 1)
        }, ultimo ? "Concluir" : "Próximo", ultimo ? null : icon("arrowRight", "sm"))) ]);
        card.style.animation = "none";
        void card.offsetWidth;
        card.style.animation = "";
    }
    function ir(n) {
        if (n < 0 || n >= PASSOS.length) return;
        i = n;
        const p = PASSOS[i], minha = ++gen;
        desenharCard();
        if (p.tela && telaAtual() !== p.tela) App.nav(p.tela);
        let tent = 0;
        const esperar = () => {
            if (minha !== gen || !ativo) return;
            const el = p.alvo ? document.querySelector(p.alvo) : null;
            if (p.alvo && !el && tent++ < 25) return setTimeout(esperar, 60);
            if (el && visivel(el)) {
                const r = el.getBoundingClientRect();
                const tb = document.querySelector(".topbar"), topo = (tb ? tb.getBoundingClientRect().bottom : 0) + 14, alt = Math.min(r.height, innerHeight * .55);
                if (r.top < topo || r.top + alt > innerHeight - 20) scrollBy(0, r.top - Math.max(topo, (innerHeight - alt) / 2 - 40));
            }
            requestAnimationFrame((() => {
                if (!ativo || !els) return;
                posicionar();
                els.card.focus({
                    preventScroll: true
                });
            }));
            [ 350, 800 ].forEach((ms => setTimeout((() => {
                if (minha === gen && ativo) posicionar();
            }), ms)));
        };
        setTimeout(esperar, p.tela && telaAtual() !== p.tela ? 120 : 0);
    }
    function tecla(e) {
        if (!ativo) return;
        if (e.key === "Tab") {
            const fs = [ ...els.card.querySelectorAll("button") ];
            if (!fs.length) return;
            const a = fs[0], z = fs[fs.length - 1];
            if (e.shiftKey && document.activeElement === a) {
                e.preventDefault();
                z.focus();
            } else if (!e.shiftKey && document.activeElement === z) {
                e.preventDefault();
                a.focus();
            } else if (!els.card.contains(document.activeElement)) {
                e.preventDefault();
                a.focus();
            }
            return;
        }
        const k = e.key;
        if (k === "Escape") fechar(); else if (k === "ArrowRight" || k === "Enter" && document.activeElement === els.card) i === PASSOS.length - 1 ? fechar() : ir(i + 1); else if (k === "ArrowLeft") ir(i - 1); else if (k === "Enter" || k === " ") return; else {
            e.stopImmediatePropagation();
            return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
    }
    const repos = () => requestAnimationFrame(posicionar);
    function iniciar(n) {
        if (ativo) return ir(n || 0);
        document.querySelectorAll(".overlay").forEach((o => o.remove()));
        const sb = document.querySelector(".sidebar.open");
        if (sb) {
            sb.classList.remove("open");
            const sc = document.querySelector(".scrim");
            sc && sc.classList.remove("on");
        }
        voltarPara = document.activeElement;
        ativo = true;
        els = montar();
        document.addEventListener("keydown", tecla, true);
        addEventListener("resize", repos);
        addEventListener("scroll", repos, true);
        Store.mut((s => {
            s.config.tourVisto = true;
        }), true);
        const comecar = () => {
            if (ativo) ir(n || 0);
        };
        if (window.Demo) Demo.entrar().then(comecar, comecar); else comecar();
    }
    function fechar() {
        if (!ativo) return;
        ativo = false;
        gen++;
        document.removeEventListener("keydown", tecla, true);
        removeEventListener("resize", repos);
        removeEventListener("scroll", repos, true);
        Object.values(els).forEach((x => x.remove()));
        els = null;
        try {
            voltarPara && voltarPara.isConnected && voltarPara.focus();
        } catch (e) {}
        if (window.Demo) Demo.sair();
    }
    window.Tour = {
        iniciar: iniciar,
        fechar: fechar,
        get ativo() {
            return ativo;
        },
        total: PASSOS.length
    };
})();