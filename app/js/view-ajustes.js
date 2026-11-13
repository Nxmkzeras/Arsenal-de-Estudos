(function() {
    "use strict";
    const {h: h, icon: icon, ymd: ymd, norm: norm} = U;
    const V = window.Views = window.Views || {};
    V.ajustes = function(root) {
        const s = Store.s, c = s.config;
        const num = (v, k, min, max, step, rotulo) => h("input", {
            type: "number",
            "aria-label": rotulo,
            min: min,
            max: max,
            step: step || 1,
            value: v,
            style: {
                width: "100%"
            },
            onchange: ev => {
                const x = +ev.target.value;
                const ok = ev.target.value !== "" && !isNaN(x), novo = Math.min(max, Math.max(min, ok ? x : v));
                if (k === "metaDiariaMin") D.definirMetaDia(novo); else Store.mut((st => {
                    st.config[k] = novo;
                    if (k === "sessaoPadraoMin" && st.cron.status === "parado") st.cron.alvoMin = novo;
                }), true);
                ev.target.value = Store.s.config[k];
                U.toast("Salvo", "ok");
            }
        });
        const dv = Object.assign({
            teoria: 50,
            questoes: 30,
            revisao: 20
        }, c.divisao);
        const soma = dv.teoria + dv.questoes + dv.revisao;
        const divIn = (k, rot) => h("label", {
            class: "f"
        }, rot + " (%)", h("input", {
            type: "number",
            min: 0,
            max: 100,
            value: dv[k],
            style: {
                width: "100%"
            },
            onchange: ev => {
                Store.mut((st => {
                    st.config.divisao = Object.assign({}, dv, {
                        [k]: Math.max(0, Math.min(100, Math.round(+ev.target.value) || 0))
                    });
                }));
            }
        }));
        const rev = h("input", {
            type: "text",
            "aria-label": "Intervalos das revisões em dias",
            value: c.revisaoDias.join(", "),
            style: {
                width: "100%"
            },
            onchange: ev => {
                const a = ev.target.value.split(/[,;\s]+/).map(Number).filter((n => n > 0 && n < 400));
                if (a.length) {
                    const ord = [ ...new Set(a) ].sort(((x, y) => x - y));
                    Store.mut((st => {
                        st.config.revisaoDias = ord;
                    }), true);
                    ev.target.value = ord.join(", ");
                    U.toast("Intervalos salvos. Valem para as próximas revisões.", "ok");
                } else {
                    ev.target.value = c.revisaoDias.join(", ");
                    U.toast("Use números de dias, ex.: 1, 7, 30, 60", "err");
                }
            }
        });
        const prova = h("input", {
            type: "date",
            "aria-label": "Data da prova",
            value: c.provaData || "",
            style: {
                width: "100%"
            },
            onchange: ev => {
                Store.mut((st => {
                    st.config.provaData = ev.target.value || "";
                }));
            }
        });
        const tema = h("select", {
            "aria-label": "Tema",
            onchange: ev => App.tema(ev.target.value)
        }, [ [ "auto", "Automático (igual ao sistema)" ], [ "claro", "Claro" ], [ "escuro", "Escuro" ] ].map((([v, t]) => h("option", {
            value: v,
            selected: (c.tema || "auto") === v
        }, t))));
        const ed = D.edital(), todas = D.carreiras();
        const diasSemBackup = c.ultimoBackupEm ? Math.floor((Date.now() - c.ultimoBackupEm) / 864e5) : null;
        const temDados = s.sessoes.length || s.questoes.length || Object.keys(s.progresso).length;
        root.appendChild(h("div", {
            class: "page"
        }, h("div", {
            class: "page-head"
        }, h("div", null, h("h1", null, "Ajustes"), h("div", {
            class: "sub"
        }, "Metas, edital, aparência e backup." + U.txt("ajustes.subExtra", "")))), h("div", {
            class: "grid g2 topo"
        }, h("div", {
            class: "card"
        }, h("h3", null, icon("target", "sm"), "Perfil e metas"), h("div", {
            class: "col"
        }, h("label", {
            class: "f"
        }, "Seu nome", h("input", {
            type: "text",
            maxLength: 40,
            value: s.perfil.nome,
            style: {
                width: "100%"
            },
            onchange: ev => Store.mut((st => {
                st.perfil.nome = ev.target.value.trim() || "Concurseiro";
            }))
        })), h("div", {
            class: "grid g2"
        }, h("label", {
            class: "f"
        }, "Meta diária (min)", num(c.metaDiariaMin, "metaDiariaMin", 15, 1440, 5, "Meta diária em minutos")), h("label", {
            class: "f"
        }, "Contagem regressiva padrão (min)", num(c.sessaoPadraoMin, "sessaoPadraoMin", 5, 240, 5, "Sessão padrão em minutos"))), h("div", {
            class: "grid g2"
        }, h("label", {
            class: "f"
        }, c.metaSemanalManual ? "Meta semanal (min)" : "Meta semanal (min) · automática", h("input", {
            type: "number",
            "aria-label": "Meta semanal em minutos",
            min: 0,
            max: 10080,
            step: 30,
            value: D.metaSemana(),
            style: {
                width: "100%"
            },
            title: "Sem mexer, é a meta diária × " + D.diasSemana() + " dias. Digite outro valor para fixar.",
            onchange: ev => {
                D.definirMetaSemana(Math.min(10080, +ev.target.value || 0));
                U.toast(Store.s.config.metaSemanalManual ? "Meta semanal fixada." : "Meta semanal automática (meta diária × " + D.diasSemana() + " dias).", "ok");
            }
        })), h("label", {
            class: "f"
        }, "Data da prova", prova)), h("div", null, h("div", {
            style: {
                fontWeight: 700,
                marginBottom: "6px"
            }
        }, "Divisão da sessão do dia"), h("div", {
            class: "grid g3"
        }, divIn("teoria", "Teoria"), divIn("questoes", "Questões"), divIn("revisao", "Revisão")), soma !== 100 ? h("div", {
            class: "hint",
            style: {
                color: "var(--warn-t)",
                marginTop: "6px"
            }
        }, "Soma atual: " + soma + "%. O ideal é 100%.") : null), h("label", {
            class: "f"
        }, "Intervalos das revisões (dias, separados por vírgula)", rev))), h("div", {
            class: "card"
        }, h("h3", null, icon("book", "sm"), "Carreira / edital"), h("div", {
            class: "col"
        }, h("div", {
            class: "callout"
        }, h("b", null, ed.ed.nome), " · " + (ed.ed.banca || "—"), h("div", {
            class: "small",
            style: {
                marginTop: "4px"
            }
        }, ed.ed.base), h("div", {
            class: "small muted"
        }, ed.discs.length + " matérias · " + U.plural(ed.discs.reduce(((a, d) => a + (ed.folhas[d.id] || []).length), 0), "assunto", "assuntos") + " (os mesmos que o Painel e o Edital contam) · fonte: " + (ed.ed.fonte || "—"))), Object.keys(todas).length > 1 ? h("label", {
            class: "f"
        }, "Edital ativo", h("select", {
            onchange: ev => {
                D.trocarEdital(ev.target.value);
                V.refresh();
            }
        }, Object.values(todas).map((x => h("option", {
            value: x.id,
            selected: x.id === s.carreiraId
        }, x.nome))))) : null, h("div", {
            class: "hint"
        }, "O Arsenal vem com o edital do Banco do Brasil (Escriturário, 2022) como exemplo. Vai prestar outro concurso, ou saiu edital novo? Abra o PDF: o Arsenal lê as matérias e os assuntos, mostra o que mudou e, se você quiser, leva o seu progresso para o edital novo."), h("div", {
            class: "row wrap"
        }, h("button", {
            class: "btn primary",
            onclick: () => EditalPDF.abrir()
        }, icon("upload", "sm"), "Carregar edital em PDF"), h("button", {
            class: "btn",
            onclick: importarEdital
        }, "Importar em texto"), Object.keys(s.editaisCustom).length ? h("button", {
            class: "btn danger",
            onclick: removerImportados
        }, "Remover importados") : null)))), h("div", {
            class: "grid g2"
        }, h("div", {
            class: "card"
        }, h("h3", null, icon("settings", "sm"), "Aparência e avisos"), h("div", {
            class: "col"
        }, h("label", {
            class: "f"
        }, "Tema", tema), h("label", {
            class: "row"
        }, h("span", {
            class: "switch"
        }, h("input", {
            type: "checkbox",
            checked: c.som,
            onchange: ev => Store.mut((st => {
                st.config.som = ev.target.checked;
            }), true)
        }), h("span")), "Tocar som ao fim da sessão"), h("label", {
            class: "row"
        }, h("span", {
            class: "switch"
        }, h("input", {
            type: "checkbox",
            checked: c.notificar,
            onchange: ev => {
                Store.mut((st => {
                    st.config.notificar = ev.target.checked;
                }), true);
                if (ev.target.checked && window.Notification && Notification.permission === "default") Notification.requestPermission();
                if (ev.target.checked && window.Notification && Notification.permission === "denied") U.toast("O navegador bloqueou notificações para este site. Libere nas permissões do site.", "err");
            }
        }), h("span")), "Notificação do sistema ao fim da sessão"))), h("div", {
            class: "card"
        }, h("h3", null, icon("download", "sm"), "Backup manual (arquivo)"), window.Backup && Backup.configurado ? null : !c.ultimoBackupEm && temDados ? h("div", {
            class: "callout warn",
            role: "status"
        }, window.arsenalExe ? "Você ainda não fez nenhum backup. Os dados ficam só neste computador: se ele for formatado ou der defeito, tudo se perde." : "Você ainda não fez nenhum backup. Os dados ficam só neste navegador: limpar os dados do navegador apaga tudo.") : diasSemBackup != null && diasSemBackup >= 14 && temDados ? h("div", {
            class: "callout warn",
            role: "status"
        }, "Seu último backup foi há " + diasSemBackup + " dias. Vale exportar um novo.") : null, h("p", {
            class: "hint",
            style: {
                marginTop: 0
            }
        }, (window.arsenalExe ? "Tudo fica guardado neste computador, sem internet. " : "Tudo fica guardado neste navegador, neste computador. ") + (diasSemBackup != null ? "Último backup: " + (diasSemBackup === 0 ? "hoje" : "há " + U.plural(diasSemBackup, "dia", "dias")) + "." : "Nenhum backup feito ainda.")), h("div", {
            class: "row wrap"
        }, h("button", {
            class: "btn primary",
            onclick: () => {
                U.download("arsenal-backup-" + ymd() + ".json", Store.exportar());
                V.refresh();
            }
        }, icon("download", "sm"), "Exportar backup (.json)"), h("button", {
            class: "btn",
            onclick: () => restaurar("mesclar")
        }, icon("upload", "sm"), "Importar e mesclar"), h("button", {
            class: "btn",
            onclick: () => restaurar("substituir")
        }, icon("upload", "sm"), "Importar e substituir tudo"), h("button", {
            class: "btn danger right",
            onclick: apagar
        }, icon("trash", "sm"), "Apagar todos os dados")))), programaCard(), window.Publicacao ? Publicacao.cartaoFerramentas() : null, window.Publicacao ? Publicacao.cartaoAjustes() : null, Encaixe.todos("ajustes.cartoes"), window.Backup ? Backup.cartao() : null));
    };
    function programaCard() {
        const ex = window.arsenalExe;
        if (!ex || !ex.config) return null;
        const corpo = h("div", {
            class: "col"
        }, h("div", {
            class: "hint"
        }, "Carregando…"));
        const interruptor = (ligado, aoMudar, texto, dica, desligado) => h("label", {
            class: "row",
            style: {
                alignItems: "flex-start",
                opacity: desligado ? .55 : 1
            }
        }, h("span", {
            class: "switch"
        }, h("input", {
            type: "checkbox",
            checked: !!ligado,
            disabled: !!desligado,
            onchange: ev => aoMudar(ev.target.checked)
        }), h("span")), h("span", null, h("span", {
            style: {
                fontWeight: 600
            }
        }, texto), dica ? h("span", {
            class: "small muted",
            style: {
                display: "block"
            }
        }, dica) : null));
        const desenha = cf => {
            U.clear(corpo);
            const muda = p => ex.definirConfig(p).then((n => {
                desenha(n);
                U.toast("Salvo", "ok");
            }));
            corpo.appendChild(interruptor(cf.segundoPlano, (v => muda({
                segundoPlano: v
            })), "Continuar em segundo plano ao fechar a janela", "O X da janela só esconde o programa: ele segue rodando (" + U.txt("ajustes.segundoPlanoLista", "cronômetro, sons e backup") + ") com um ícone perto do relógio. Para fechar de vez: botão direito no ícone › Sair."));
            corpo.appendChild(interruptor(cf.iniciarComWindows, (v => muda({
                iniciarComWindows: v
            })), "Iniciar junto com o Windows", cf.podeIniciarComWindows ? "O Arsenal liga sozinho quando você entra no computador." : "Disponível só no programa instalado (.exe), não neste modo de teste.", !cf.podeIniciarComWindows));
            corpo.appendChild(interruptor(cf.iniciarMinimizado, (v => muda({
                iniciarMinimizado: v
            })), "Ao iniciar com o Windows, abrir só no ícone (sem janela)", "Fica quietinho na bandeja até você clicar nele.", !cf.podeIniciarComWindows || !cf.iniciarComWindows));
            corpo.appendChild(h("div", {
                class: "row wrap",
                style: {
                    marginTop: "4px"
                }
            }, h("button", {
                class: "btn ghost sm",
                onclick: () => ex.espelhoAbrirPasta && ex.espelhoAbrirPasta()
            }, icon("folder", "sm"), "Abrir a pasta da cópia de segurança dos dados"), h("button", {
                class: "btn ghost sm",
                onclick: async () => {
                    if (await U.confirmar("Fechar o Arsenal de vez? O cronômetro e os sons param" + U.txt("ajustes.sairExtra", "") + ".", "Fechar o programa")) ex.sair();
                }
            }, "Fechar o programa de vez")));
        };
        ex.config().then(desenha).catch((() => {
            U.clear(corpo);
            corpo.appendChild(h("div", {
                class: "hint"
            }, "Não consegui ler as configurações do programa."));
        }));
        return h("div", {
            class: "card"
        }, h("h3", null, icon("settings", "sm"), "Programa no computador"), corpo);
    }
    function importarEdital() {
        EditalPDF.conferir("", "Meu concurso", null);
    }
    async function removerImportados() {
        if (!await U.confirmar("Remover os editais importados? Pastas, revisões e questões ligadas aos assuntos deles perdem o vínculo (nada é apagado). O progresso do edital de exemplo (Banco do Brasil) não muda.", "Remover")) return;
        Store.mut((st => {
            st.editaisCustom = {};
        }));
        D.trocarEdital("bb");
        Store.mut((st => {
            st.pastas.forEach((p => {
                if (p.topicoId && !D.topicoExiste(p.topicoId)) {
                    p.topicoId = null;
                    if (p.discId && !D.edital().disc[p.discId]) p.discId = null;
                }
            }));
            st.questoes.forEach((q => {
                if (q.topicoId && !D.topicoExiste(q.topicoId)) q.topicoId = null;
                if (q.discId && !D.edital().disc[q.discId]) q.discId = null;
            }));
            st.sessoes.forEach((x => {
                if (x.topicoId && !D.topicoExiste(x.topicoId)) x.topicoId = null;
                if (x.discId && !D.edital().disc[x.discId]) x.discId = null;
            }));
            st.revisoes = st.revisoes.filter((r => r.tipo !== "topico" || D.topicoExiste(r.refId)));
        }));
        V.refresh();
    }
    async function restaurar(modo) {
        const f = await U.pickFile(".json");
        if (!f) return;
        if (modo === "substituir" && !await U.confirmar("Isso substitui TODOS os dados atuais pelos do arquivo. Exporte um backup antes se tiver dúvida. Continuar?", "Substituir")) return;
        try {
            Store.importar(f.texto, modo);
            D.invalidarEdital();
            U.toast(modo === "substituir" ? "Backup restaurado." : "Backup mesclado com os dados atuais.", "ok");
            V.refresh();
        } catch (e) {
            U.toast(e.message, "err");
        }
    }
    async function apagar() {
        if (!await U.confirmar("Apagar TODOS os dados (progresso, sessões, questões, pastas)? Não dá para desfazer. Faça um backup antes.", "Apagar tudo")) return;
        await Store.zerar();
        location.reload();
    }
})();