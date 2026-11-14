(function() {
    "use strict";
    // Tela "Enviar feedback": a pessoa escreve a sugestão, o problema ou o elogio e o app abre o formulário do Google
    // ("formulario" no publicacao.json) já preenchido. Nada é enviado sozinho: a pessoa confere e clica em Enviar no navegador.
    // Não pede contato (decisão do dono, 2026-11-14). Sem formulário configurado, volta ao GitHub (página de nova issue).
    const {h: h, icon: icon} = U;
    const V = window.Views = window.Views || {};
    const TIPOS = [ [ "sugestao", "Sugestão", "Ideia para melhorar o app" ], [ "problema", "Problema", "Algo não funcionou como deveria" ], [ "elogio", "Elogio", "O que você gostou" ], [ "outro", "Outro", "Qualquer outro assunto" ] ];
    const RASCUNHO = "arsenal.feedback.rascunho";
    const repo = () => {
        try {
            const i = window.Publicacao && Publicacao._P && Publicacao._P.info;
            if (i && /^[\w.-]+\/[\w.-]+$/.test(i.repo || "")) return i.repo;
        } catch (e) {}
        return "Nxmkzeras/Arsenal-de-Estudos";
    };
    const versao = () => {
        try {
            const i = window.Publicacao && Publicacao._P && Publicacao._P.info;
            return i && (i.versao || i.version) || "";
        } catch (e) {
            return "";
        }
    };
    // Formulário do Google (sem conta). O link guardado é o "link pré-preenchido" do Forms com a palavra MENSAGEM no campo;
    // aqui ela é trocada pelo texto da pessoa. Sem essa palavra, o formulário abre vazio e o texto vai copiado.
    const formulario = () => {
        try {
            const i = window.Publicacao && Publicacao._P && Publicacao._P.info;
            return i && i.formulario || "";
        } catch (e) {
            return "";
        }
    };
    const LIMITE_LINK = 7500;
    // devolve o link e o texto final (o que vai copiado quando não cabe ou não há onde pôr)
    function linkFormulario(base, mensagem) {
        const u = new URL(base);
        let campoMsg = null;
        for (const [k, v] of [ ...u.searchParams ]) {
            if (/^entry\.\d+$/.test(k) && String(v).trim().toUpperCase() === "MENSAGEM") campoMsg = k;
        }
        if (!campoMsg) return { url: u.href, completo: false, texto: mensagem };
        u.searchParams.set(campoMsg, mensagem);
        if (u.href.length <= LIMITE_LINK) return { url: u.href, completo: true, texto: mensagem };
        // texto longo demais para caber no endereço: vai cortado, e o texto inteiro fica copiado para colar
        let n = mensagem.length;
        while (n > 200) {
            n = Math.floor(n * .85);
            u.searchParams.set(campoMsg, mensagem.slice(0, n) + " […]");
            if (u.href.length <= LIMITE_LINK) break;
        }
        return { url: u.href, completo: false, texto: mensagem };
    }
    const lerRascunho = () => {
        try {
            return JSON.parse(localStorage.getItem(RASCUNHO) || "{}") || {};
        } catch (e) {
            return {};
        }
    };
    const gravarRascunho = o => {
        try {
            localStorage.setItem(RASCUNHO, JSON.stringify(o));
        } catch (e) {}
    };
    function montarTexto(st, tecnico) {
        const tipo = (TIPOS.find((t => t[0] === st.tipo)) || TIPOS[0])[1];
        const linhas = [ "**Tipo:** " + tipo, "", String(st.texto || "").trim() ];
        if (tecnico) {
            const ua = navigator.userAgent || "", win = /Windows NT ([\d.]+)/.exec(ua);
            linhas.push("", "---", "Versão do app: " + (versao() || "?") + (win ? " · Windows NT " + win[1] : ""));
        }
        return linhas.join("\n");
    }
    function titulo(st) {
        const tipo = (TIPOS.find((t => t[0] === st.tipo)) || TIPOS[0])[1];
        const primeira = String(st.texto || "").trim().split(/\n/)[0].replace(/\s+/g, " ").slice(0, 70);
        return "[" + tipo + "] " + (primeira || "Feedback");
    }
    V.feedback = function(root) {
        const st = Object.assign({
            tipo: "sugestao",
            texto: ""
        }, lerRascunho());
        delete st.contato; // versões antigas guardavam um contato no rascunho; o feedback não pede mais contato
        let tecnico = true;
        const salva = () => gravarRascunho(st);
        const chips = h("div", {
            class: "pill-sel",
            role: "radiogroup",
            "aria-label": "Tipo de feedback"
        });
        const desenhaChips = () => {
            U.clear(chips);
            TIPOS.forEach((([id, nome, dica]) => chips.appendChild(h("button", {
                class: "chip" + (st.tipo === id ? " on" : ""),
                role: "radio",
                "aria-checked": st.tipo === id ? "true" : "false",
                title: dica,
                onclick: () => {
                    st.tipo = id;
                    salva();
                    desenhaChips();
                }
            }, nome))));
        };
        desenhaChips();
        const conta = h("span", {
            class: "tiny muted right"
        });
        const txt = h("textarea", {
            "aria-label": "Seu feedback",
            maxlength: 6e3,
            placeholder: "Conte com detalhes. Se for um problema: o que você fez, o que esperava e o que aconteceu.",
            style: {
                minHeight: "170px",
                width: "100%"
            },
            oninput: ev => {
                st.texto = ev.target.value;
                conta.textContent = st.texto.length + " / 6000";
                salva();
            }
        });
        txt.value = st.texto;
        conta.textContent = st.texto.length + " / 6000";
        const caixaVersao = h("input", {
            type: "checkbox",
            checked: true,
            onchange: ev => {
                tecnico = ev.target.checked;
            }
        });
        const pronto = () => {
            if (String(st.texto || "").trim().length < 5) {
                U.toast("Escreva o seu feedback antes de enviar.", "err");
                txt.focus();
                return false;
            }
            return true;
        };
        const enviar = () => {
            if (!pronto()) return;
            const url = "https://github.com/" + repo() + "/issues/new?labels=feedback&title=" + encodeURIComponent(titulo(st)) + "&body=" + encodeURIComponent(montarTexto(st, tecnico));
            window.open(url, "_blank", "noopener");
            U.toast("Abri o GitHub no navegador. Confira o texto e clique em “Create” para enviar.", "ok");
        };
        const enviarSemConta = async () => {
            if (!pronto()) return;
            const tipo = (TIPOS.find((t => t[0] === st.tipo)) || TIPOS[0])[1];
            const ua = navigator.userAgent || "", win = /Windows NT ([\d.]+)/.exec(ua);
            const mensagem = "[" + tipo + "] " + String(st.texto || "").trim() + (tecnico ? "\n\n— Versão do app: " + (versao() || "?") + (win ? " · Windows NT " + win[1] : "") : "");
            let r;
            try {
                r = linkFormulario(formulario(), mensagem);
            } catch (e) {
                return U.toast("Não consegui abrir o formulário de feedback.", "err");
            }
            if (!r.completo) await U.copiar(r.texto);
            window.open(r.url, "_blank", "noopener");
            U.toast(r.completo ? "Abri o formulário no navegador, já preenchido. Confira e clique em “Enviar”." : "Abri o formulário no navegador. Seu texto ficou copiado: cole no campo da mensagem (Ctrl+V) e clique em “Enviar”.", "ok");
        };
        const temForm = !!formulario();
        const copiar = async () => {
            if (!pronto()) return;
            await U.copiar(titulo(st) + "\n\n" + montarTexto(st, tecnico));
        };
        const limpar = () => {
            st.texto = "";
            txt.value = "";
            conta.textContent = "0 / 6000";
            salva();
        };
        const pagina = h("div", {
            class: "page"
        });
        root.appendChild(pagina);
        pagina.appendChild(h("div", {
            class: "page-head"
        }, h("div", null, h("h1", null, "Enviar feedback"), h("div", {
            class: "sub"
        }, "Sugestões, problemas e elogios ajudam a decidir o que vem na próxima versão. Tudo é lido."))));
        pagina.appendChild(h("div", {
            class: "grid g2",
            style: {
                alignItems: "start"
            }
        }, h("div", {
            class: "card"
        }, h("h3", null, icon("note", "sm"), "Seu feedback"), h("div", {
            class: "col"
        }, h("div", {
            class: "f"
        }, "Tipo", chips), h("label", {
            class: "f"
        }, h("span", {
            class: "row"
        }, "Mensagem", conta), txt), h("label", {
            class: "row small"
        }, h("span", {
            class: "switch"
        }, caixaVersao, h("span")), "Incluir a versão do app e do Windows (ajuda a achar problemas)"), h("div", {
            class: "row wrap"
        }, temForm ? h("button", {
            class: "btn primary",
            onclick: enviarSemConta
        }, icon("ext", "sm"), "Enviar") : null, temForm ? null : h("button", {
            class: "btn primary",
            onclick: enviar
        }, icon("ext", "sm"), "Enviar pelo GitHub"), temForm ? null : h("button", {
            class: "btn",
            onclick: copiar
        }, icon("copy", "sm"), "Copiar texto"), h("button", {
            class: "btn ghost",
            onclick: limpar
        }, "Limpar")))), h("div", {
            class: "card"
        }, h("h3", null, icon("help", "sm"), "Como funciona"), h("ol", {
            class: "small",
            style: {
                margin: 0,
                paddingLeft: "20px",
                display: "grid",
                gap: "8px"
            }
        }, h("li", null, "Escreva aqui. O texto fica guardado neste computador até você enviar ou limpar."), temForm ? h("li", null, "“Enviar” abre um formulário simples no navegador, já preenchido. Confira e clique em “Enviar” lá. Não precisa de conta em lugar nenhum; só quem faz o Arsenal lê.") : h("li", null, "“Enviar pelo GitHub” abre a página de feedback do Arsenal, já preenchida. Lá, confira e clique em “Create” (precisa de uma conta gratuita no GitHub)."), temForm ? null : h("li", null, "Sem conta? Use “Copiar texto” e mande por onde preferir.")), h("p", {
            class: "hint",
            style: {
                marginBottom: 0
            }
        }, "O app não envia nada sozinho. " + (temForm ? "A mensagem não é publicada: chega só para quem faz o Arsenal." : "O que você publicar no GitHub fica visível para qualquer pessoa:") + " Não coloque senhas nem dados pessoais."))));
    };
    Encaixe.add("menu.rodape", (() => [ [ "feedback", "Enviar feedback", "note" ] ]));
})();
