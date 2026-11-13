(function() {
    "use strict";
    const {h: h, icon: icon} = U;
    const ex = () => window.arsenalExe || null;
    const P = {
        info: null,
        ocupado: false,
        timer: null,
        ouvindo: false
    };
    const limpa = t => String(t).replace(/\[(.*?)\]\(.*?\)/g, "$1").replace(/[*_`]/g, "");
    function botaoApoio() {
        const link = P.info && P.info.doacao;
        if (!link) return null;
        return h("button", {
            class: "apoio-pill",
            title: "Gostou do Arsenal? Apoie o projeto (abre o link de doação)",
            "aria-label": "Apoie o projeto: abre o link de doação",
            onclick: () => window.open(link, "_blank", "noopener")
        }, icon("heart", "sm"), h("span", null, "Apoie o projeto"));
    }
    function notasEl(txt) {
        const col = h("div", {
            class: "atu-notas"
        });
        String(txt || "").split(/\r?\n/).forEach((l => {
            const t = l.trim();
            if (!t) return;
            const t1 = t.match(/^#{1,4}\s+(.*)$/), li = t.match(/^[-*+]\s+(.*)$/);
            if (t1) col.appendChild(h("div", {
                class: "atu-t"
            }, limpa(t1[1]))); else if (li) col.appendChild(h("div", {
                class: "atu-li"
            }, "• " + limpa(li[1]))); else col.appendChild(h("div", null, limpa(t)));
        }));
        return col.childNodes.length ? col : h("div", {
            class: "small muted"
        }, "A versão não traz notas.");
    }
    function mostrar(info) {
        if (P.avisoAberto) return;
        P.avisoAberto = true;
        const estado = h("div", {
            class: "small",
            role: "status",
            "aria-live": "polite",
            style: {
                minHeight: "20px"
            }
        });
        const barra = h("div", {
            class: "bar",
            style: {
                display: "none",
                marginTop: "6px"
            }
        }, h("i", {
            style: {
                width: "0%"
            }
        }));
        const mb = info.tamanho ? " Download de " + (info.tamanho / 1048576).toFixed(0) + " MB." : "";
        U.modal({
            aoFechar: () => {
                P.avisoAberto = false;
            },
            titulo: "Nova versão " + info.nova + " do Arsenal",
            largo: true,
            corpo: h("div", {
                class: "col",
                style: {
                    gap: "10px"
                }
            }, h("p", {
                style: {
                    margin: 0
                }
            }, "Você está na versão " + info.atual + "." + mb), h("div", {
                class: "eyebrow"
            }, "O que mudou"), notasEl(info.notas), h("ol", {
                class: "small muted",
                style: {
                    margin: 0,
                    paddingLeft: "18px"
                }
            }, h("li", null, "O Arsenal grava uma cópia dos seus dados (backup) antes de qualquer troca."), h("li", null, "Baixa a versão nova e confere o arquivo (SHA-256)."), h("li", null, "Fecha, troca os arquivos e abre de novo. Seus dados não são tocados; se algo falhar, a versão antiga volta sozinha.")), estado, barra),
            botoes: [ {
                texto: "Depois"
            }, {
                texto: "Não avisar desta versão",
                fn: async () => {
                    try {
                        await ex().definirConfig({
                            versaoIgnorada: info.nova
                        });
                    } catch (e) {}
                }
            }, {
                texto: "Atualizar agora",
                tipo: "primary",
                fn: () => atualizar(info, estado, barra)
            } ]
        });
    }
    async function atualizar(info, estado, barra) {
        if (P.ocupado) return false;
        P.ocupado = true;
        const dize = (t, erro) => {
            estado.textContent = t;
            estado.style.color = erro ? "var(--bad-t, #b42318)" : "";
        };
        try {
            if (!info.podeAplicar) {
                dize("Este programa não está empacotado: a troca automática só funciona no aplicativo instalado.", true);
                return false;
            }
            dize("1/4 · Gravando o backup dos seus dados…");
            await Store.salvarAgora();
            const b = await ex().atualizacao.backup(JSON.stringify(Store.s), info.nova);
            if (!b || !b.ok) {
                dize("Não consegui gravar o backup" + (b && b.erro ? " (" + b.erro + ")" : "") + ". Por segurança, a atualização foi cancelada.", true);
                return false;
            }
            dize("1/4 · Backup gravado.");
            if (!P.ouvindo) {
                P.ouvindo = true;
                ex().atualizacao.aoProgresso((p => {
                    if (p && p.total) {
                        barra.style.display = "";
                        barra.firstChild.style.width = Math.min(100, Math.round(p.lido / p.total * 100)) + "%";
                        estado.textContent = "2/4 · Baixando a nova versão… " + Math.round(p.lido / 1048576) + " de " + Math.round(p.total / 1048576) + " MB";
                    }
                }));
            }
            dize("2/4 · Baixando a nova versão…");
            const d = await ex().atualizacao.baixar();
            if (!d || !d.ok) {
                dize(d && d.erro || "O download falhou. Nada foi alterado.", true);
                return false;
            }
            barra.style.display = "none";
            dize("3/4 · Arquivo conferido: o SHA-256 bate com o da Release.");
            await new Promise((r => setTimeout(r, 900)));
            dize("4/4 · Fechando para trocar os arquivos. O Arsenal abre sozinho já atualizado…");
            const a = await ex().atualizacao.aplicar();
            if (!a || !a.ok) {
                dize(a && a.erro || "Não consegui aplicar a atualização.", true);
                return false;
            }
            return false;
        } catch (e) {
            dize("Algo deu errado: " + (e && e.message || e) + ". Nada foi alterado.", true);
            return false;
        } finally {
            P.ocupado = false;
        }
    }
    async function verificar(manual) {
        if (!ex() || !ex().atualizacao || !P.info || !P.info.repo) return null;
        let info;
        try {
            info = await ex().atualizacao.verificar();
        } catch (e) {
            info = {
                erro: String(e)
            };
        }
        P.ultima = info;
        if (!info || !info.ativo) return info;
        if (info.erro) {
            if (manual) U.toast("Não consegui verificar agora (sem internet?). Tente de novo mais tarde.", "err");
            return info;
        }
        if (info.disponivel) {
            let cfg = {};
            try {
                cfg = await ex().config();
            } catch (e) {}
            if (manual || cfg.versaoIgnorada !== info.nova) mostrar(info);
        } else if (info.semAnexos) {
            if (manual) U.toast("A versão " + info.nova + " saiu, mas ainda está sem os arquivos de download. Tente mais tarde.", "");
        } else if (manual) U.toast("Você já está na versão mais recente (" + info.atual + ").", "ok");
        return info;
    }
    function cartaoAjustes() {
        if (!ex() || !ex().atualizacao || !P.info || !P.info.repo) return null;
        const ultima = P.ultima;
        const caixa = h("input", {
            type: "checkbox",
            "aria-label": "Verificar atualizações sozinho",
            onchange: async ev => {
                try {
                    await ex().definirConfig({
                        verificarAtualizacoes: ev.target.checked
                    });
                    P.agendar();
                } catch (e) {}
            }
        });
        ex().config().then((c => {
            caixa.checked = c.verificarAtualizacoes !== false;
        })).catch((() => {}));
        return h("div", {
            class: "card"
        }, h("h3", null, icon("download", "sm"), "Atualizações"), h("p", {
            style: {
                margin: "0 0 8px"
            }
        }, "Versão instalada: ", h("b", null, P.info.versao), ultima && ultima.disponivel ? " · há uma versão nova: " + ultima.nova : ""), h("label", {
            class: "row small",
            style: {
                gap: "8px",
                marginBottom: "10px"
            }
        }, caixa, "Verificar atualizações sozinho (ao abrir e a cada poucas horas, só consulta o GitHub; nada seu é enviado)"), h("div", {
            class: "row wrap"
        }, h("button", {
            class: "btn",
            onclick: () => verificar(true)
        }, icon("refresh", "sm"), "Verificar agora"), ultima && ultima.disponivel ? h("button", {
            class: "btn primary",
            onclick: () => mostrar(ultima)
        }, "Ver a versão " + ultima.nova) : null));
    }
    function cartaoFerramentas() {
        const e = ex();
        if (!e || !e.desenho || !e.mini) return null;
        const caixa = h("input", {
            type: "checkbox",
            "aria-label": "Atalho Alt+Shift+D para desenhar na tela",
            onchange: async ev => {
                try {
                    await e.definirConfig({
                        atalhoDesenho: ev.target.checked
                    });
                } catch (er) {}
            }
        });
        e.config().then((c => {
            caixa.checked = c.atalhoDesenho !== false;
        })).catch((() => {}));
        return h("div", {
            class: "card"
        }, h("h3", null, icon("edit", "sm"), "Na tela: desenhar e cronômetro fixo"), h("p", {
            class: "small muted",
            style: {
                margin: "0 0 10px"
            }
        }, "Grife, desenhe e escreva por cima de qualquer coisa que esteja na tela (um PDF, um vídeo, um site) e tire um PNG já com os desenhos. O cronômetro fixo é uma janelinha sempre à frente, no canto que você escolher."), h("div", {
            class: "row wrap"
        }, h("button", {
            class: "btn primary",
            onclick: () => e.desenho.abrir()
        }, icon("edit", "sm"), "Desenhar na tela"), h("button", {
            class: "btn",
            onclick: () => e.mini.abrir()
        }, icon("pin", "sm"), "Mostrar o cronômetro fixo"), h("button", {
            class: "btn ghost",
            onclick: () => e.desenho.abrirPasta()
        }, icon("folder", "sm"), "Abrir a pasta das capturas")), h("label", {
            class: "row small",
            style: {
                gap: "8px",
                marginTop: "10px"
            }
        }, caixa, "Atalho Alt+Shift+D mostra e esconde a camada de desenho (esconder não apaga: os desenhos ficam até você limpar)"), h("div", {
            class: "hint",
            style: {
                marginTop: "6px"
            }
        }, 'Dica: no botão "mouse" da barra, o mouse passa para os outros programas e os desenhos continuam visíveis. O clique direito no cronômetro fixo escolhe o canto.'));
    }
    async function resultado() {
        let r = null;
        try {
            r = await ex().atualizacao.resultado();
        } catch (e) {}
        if (!r) return;
        if (r.estado === "ok") U.modal({
            titulo: "Arsenal atualizado para a versão " + r.para,
            largo: true,
            corpo: h("div", {
                class: "col",
                style: {
                    gap: "8px"
                }
            }, h("p", {
                style: {
                    margin: 0
                }
            }, "Tudo certo: seus dados foram mantidos (e há uma cópia feita antes da troca)."), h("div", {
                class: "eyebrow"
            }, "O que mudou"), notasEl(r.notas)),
            botoes: [ {
                texto: "Entendi",
                tipo: "primary"
            } ]
        }); else U.modal({
            titulo: "A atualização não pôde ser aplicada",
            corpo: h("p", {
                style: {
                    margin: 0
                }
            }, "Não deu para trocar para a versão " + r.para + ". A versão antiga foi restaurada e seus dados estão intactos. Tente de novo mais tarde ou baixe a versão nova à mão."),
            botoes: [ {
                texto: "Fechar",
                tipo: "primary"
            } ]
        });
    }
    P.agendar = async function() {
        clearInterval(P.timer);
        P.timer = null;
        let cfg = {};
        try {
            cfg = await ex().config();
        } catch (e) {}
        if (cfg.verificarAtualizacoes === false) return;
        P.timer = setInterval((() => verificar(false)), 6 * 36e5);
    };
    async function iniciar() {
        if (!ex() || !ex().publicacao) return;
        try {
            P.info = await ex().publicacao();
        } catch (e) {
            return;
        }
        if (!P.info) return;
        window.Views && Views.refresh && Views.refresh();
        if (!P.info.repo || !ex().atualizacao) return;
        setTimeout(resultado, 1500);
        let cfg = {};
        try {
            cfg = await ex().config();
        } catch (e) {}
        if (cfg.verificarAtualizacoes !== false) {
            setTimeout((() => verificar(false)), 9e3);
            P.agendar();
        }
    }
    window.Publicacao = {
        iniciar: iniciar,
        botaoApoio: botaoApoio,
        cartaoAjustes: cartaoAjustes,
        cartaoFerramentas: cartaoFerramentas,
        verificar: verificar,
        _P: P
    };
})();