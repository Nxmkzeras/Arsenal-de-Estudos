(function() {
    "use strict";
    // Tela "Enviar feedback": a pessoa escreve a sugestão, o problema ou o elogio e o app abre a página de "nova issue" do
    // repositório no GitHub já preenchida. Nada é enviado sozinho: a pessoa confere e publica no navegador. O dono do
    // repositório recebe o aviso do GitHub (e-mail e sino de notificações) a cada feedback novo.
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
        if (String(st.contato || "").trim()) linhas.push("", "**Contato:** " + String(st.contato).trim());
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
            texto: "",
            contato: ""
        }, lerRascunho());
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
        const contato = h("input", {
            type: "text",
            maxlength: 120,
            placeholder: "opcional: e-mail, @ do Instagram…",
            style: {
                width: "100%"
            },
            oninput: ev => {
                st.contato = ev.target.value;
                salva();
            }
        });
        contato.value = st.contato;
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
        const copiar = async () => {
            if (!pronto()) return;
            await U.copiar(titulo(st) + "\n\n" + montarTexto(st, tecnico));
        };
        const limpar = () => {
            st.texto = "";
            st.contato = "";
            txt.value = "";
            contato.value = "";
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
            class: "f"
        }, "Como falar com você (opcional)", contato), h("label", {
            class: "row small"
        }, h("span", {
            class: "switch"
        }, caixaVersao, h("span")), "Incluir a versão do app e do Windows (ajuda a achar problemas)"), h("div", {
            class: "row wrap"
        }, h("button", {
            class: "btn primary",
            onclick: enviar
        }, icon("ext", "sm"), "Enviar pelo GitHub"), h("button", {
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
        }, h("li", null, "Escreva aqui. O texto fica guardado neste computador até você enviar ou limpar."), h("li", null, "“Enviar pelo GitHub” abre o navegador na página de feedback do Arsenal, já preenchida."), h("li", null, "Lá, confira e clique em “Create”. É preciso uma conta gratuita no GitHub."), h("li", null, "Sem conta? Use “Copiar texto” e mande por onde preferir.")), h("p", {
            class: "hint",
            style: {
                marginBottom: 0
            }
        }, "O app não envia nada sozinho. O que você publicar no GitHub fica visível para qualquer pessoa: não coloque senhas nem dados pessoais."))));
    };
    Encaixe.add("menu.rodape", (() => [ [ "feedback", "Enviar feedback", "note" ] ]));
})();
