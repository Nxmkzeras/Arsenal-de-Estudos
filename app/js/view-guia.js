(function() {
    "use strict";
    const {h: h, icon: icon} = U;
    const V = window.Views = window.Views || {};
    const k = (...t) => t.map(((x, i) => [ i ? " " : "", h("kbd", null, x) ]));
    const sec = (id, titulo, lead, ...corpo) => h("section", {
        class: "guia-sec col",
        id: "g-" + id,
        style: {
            gap: "0"
        }
    }, h("h2", null, titulo), lead ? h("p", {
        class: "lead"
    }, lead) : null, ...corpo);
    const ir = tela => ev => {
        ev && ev.preventDefault();
        const [t, ancora] = tela.split("#");
        if (t === "painel" && ancora === "sessao") App.cronometro(); else App.nav(t, null);
    };
    const TELAS = [ [ "painel", "home", "Painel", "Sua visão do dia.", [ 'O anel mostra o plano de hoje: cada fatia é um bloco de matéria, tirado do seu ciclo, com os minutos "por vez" que a matéria tem lá. O play no meio começa o cronômetro na fatia da vez.', "O plano acompanha o resto do app: mudou a ordem, os minutos ou as vezes na volta no Ciclo, ou a meta em Ajustes? Os blocos que você ainda não estudou se refazem sozinhos; o que já foi estudado fica.", 'Use − e + para mudar a carga do dia (é a mesma meta diária de Ajustes e do "Montar a semana" do Ciclo) e "Ajustar" para trocar matérias e tempos à mão; um plano mexido à mão fica como está até você usar "Refazer pelo ciclo". Estudou além do plano? O anel abre uma fatia nova.', "Abaixo: dias seguidos, horas da semana, questões, revisões, edital concluído, desempenho por assunto, ritmo (hoje em amarelo) e presença." ] ], [ "edital", "book", "Edital", "Todas as matérias e assuntos do edital.", [ "Clique no status de um assunto para avançar: Estudando, Teoria concluída, Revisado, Dominado. Shift + clique volta.", 'Ao marcar "Teoria concluída", as revisões de 1, 7, 30 e 60 dias são agendadas sozinhas.', 'O lápis abre anotações, revisão extra e "Estudar este assunto". Filtros: Pendentes, Novo, Atualizado, Em revisão.' ] ], [ "ciclo", "refresh", "Ciclo de estudos", "Quanto tempo dar a cada matéria e em que ordem.", [ '"Dividir o tempo entre as matérias" reparte as horas da volta (ex.: 6 h por dia, 7 dias) e você ajusta os minutos de cada matéria. "Vezes na volta" (1× a 3×) é seu: é quantas vezes a matéria aparece em cada volta. 1× é o normal; 2× e 3× fazem a matéria voltar mais vezes, espalhadas pela volta (nunca duas seguidas, nem na virada de uma volta para a outra). A tela mostra a sua volta na ordem, com as repetições.', "Setas mudam a ordem, o interruptor tira uma matéria da volta sem apagar, o alfinete escolhe a próxima.", 'Quando todas completam o tempo, começa uma nova volta. "Pular" passa a matéria da vez.' ] ], [ "painel#sessao", "clock", "Cronômetro (no Painel)", "Mede o estudo e alimenta todo o resto.", [ 'O relógio é o anel do Painel. Em "Sessão de estudo" você escolhe: livre ou contagem regressiva (15 a 120 min ou o tempo que quiser). Espaço inicia e pausa.', '"Seguir o ciclo" usa a matéria da vez; escolha outra e ligue "Manter esta matéria" para fixar.', "Ao finalizar: ajuste os minutos, marque o status do assunto e registre questões feitas e acertos." ] ], [ "revisoes", "layers", "Revisões e flashcards", "O que precisa ser revisto hoje.", [ 'Assuntos: "Revisei" conclui e agenda a próxima (com Desfazer, se clicar sem querer). "+1 dia" adia para amanhã.', "Flashcards: crie cartões de frente e verso, de lacuna (ótimo para lei seca) ou de Certo ou errado, um baralho por matéria. As questões erradas entram junto.", "Cada cartão volta pouco antes de você esquecer (FSRS, o método do Anki). Espaço mostra a resposta; 1 Errei, 2 Difícil, 3 Bom, 4 Fácil; Z desfaz.", "Cole imagens com Ctrl+V. Importe e exporte no formato do Anki para revisar também no celular." ] ], [ "questoes", "checkSq", "Questões e erros", "Seu caderno de erros.", [ '"Nova questão": cole enunciado e alternativas (A) … B) …); com gabarito e sua resposta o resultado sai sozinho.', '"Registrar lote": só quantas fez e quantas acertou, ' + U.txt("guia.loteQuando", "para lançar só os totais") + ".", "Filtre por matéria, resultado, fonte e pasta. Exporte em CSV (Excel) ou JSON." ] ], [ "pastas", "folder", "Pastas", U.txt("guia.pastasDesc", "Organização das suas questões em pastas."), [ '"Gerar a partir do edital" cria uma pasta por matéria (e assuntos, se quiser).', U.txt("guia.pastasImportar", 'Use "Colar lista" para criar várias pastas de uma vez (2 espaços = subpasta).'), "Arraste uma pasta sobre outra para mover. Arraste uma questão (ou marque várias) para uma pasta; filtre por resultado, matéria ou texto antes de selecionar." + U.txt("guia.vincular", ' "Vincular" liga a pasta a uma matéria e a um assunto.') ] ], [ "simulado", "target", "Simulado e foco guiado", "Treino de prova e estudo conduzido, com pausas.", [ '"Estudar agora" (no Painel) liga o cronômetro, o som e a contagem de uma rodada de foco (Pomodoro 25+5, 50+10 ou 90+15). Quando a rodada acaba, a sessão é salva sozinha, a pausa conta o tempo e a próxima rodada começa quando você quiser.', "Simulado: escolha quantas questões e quantos minutos por questão. O relógio mostra em que questão você deveria estar. No fim, informe acertos e erros: o tempo vira sessão e as questões entram nas estatísticas.", '"Sua semana" (no Painel) resume horas, dias de estudo, acerto, matérias esquecidas e o que fazer agora. O Relatório completo imprime ou salva em PDF.' ] ], [ "estatisticas", "chart", "Estatísticas", "Onde você está ganhando e perdendo pontos.", [ "Escolha 7, 30, 90 dias ou tudo. Horas por dia ou semana, tempo por tipo e por matéria.", "Acerto por semana e presença no último ano.", "Tabela final: compare o peso da matéria na prova com o tempo estudado. Exporte as sessões em CSV." ] ], [ "sons", "music", "Sons de foco", "Ruído, chuva, ventilador, abafador e lofi para estudar.", [ 'Ligue um som ou vários ao mesmo tempo: cada um tem o seu volume, e há um volume geral. As "Combinações prontas" ligam vários de uma vez (ex.: Lofi na garoa, Jazz na fogueira, Abafar o mundo, Para dormir).', 'São 19 sons: 7 lofi (lofi hip hop, 4 jazz: sax tenor, sax alto, jazz suave de café e Acústico da madrugada, e Tokyo Lofi Guitar e Tokyo Night Drive), o "Abafador" (corta os agudos, como protetor de ouvido), ruído branco, rosa e marrom, chuva fraca, fogueira, ondas do mar, rio, café, trem, relógio de parede e ventilador. Todos tocam sem parar, em loop. Nada usa internet.', 'O temporizador para os sons sozinho; "Tocar junto com o cronômetro" liga quando você começa a estudar e pausa quando você pausa.' ] ], [ "ajustes", "settings", "Ajustes", "Metas, aparência, edital, programa no computador e backup.", [ "Nome, meta diária e semanal (a semanal acompanha a diária até você digitar outro valor), tempo padrão da contagem regressiva, data da prova e intervalos das revisões.", "Tema claro, escuro ou automático; som e notificação no fim da sessão.", "Carregar o edital do seu concurso (PDF ou texto) e fazer backup dos seus dados.", "No aplicativo (.exe): continuar em segundo plano ao fechar a janela e iniciar junto com o Windows." ] ] ];
    const FAQ = [ [ "Onde ficam meus dados?", (window.arsenalExe ? "Neste computador" : "No próprio navegador, neste computador") + ". Nada vai para a internet: não existe conta nem servidor. Por isso o backup é importante (Ajustes › Backup)." ], [ "Como levo meus dados para outro computador?", "No computador antigo: Ajustes › Exportar backup. No novo: instale o Arsenal e use Ajustes › Importar e substituir tudo, escolhendo o arquivo .json." ], [ "Fechei a janela. O programa fechou?", "No aplicativo (.exe), não: o X só esconde a janela e o Arsenal continua rodando em segundo plano, com um ícone perto do relógio (" + U.txt("guia.segundoPlanoLista", "cronômetro, sons e backup") + " seguem funcionando). Clique no ícone para abrir. Para fechar de vez: botão direito no ícone › Sair. Dá para desligar isso e para iniciar o programa junto com o Windows em Ajustes › Programa no computador." ], [ "O backup automático fica pausando.", 'No aplicativo (.exe) isso não acontece mais: o próprio programa grava na pasta, sem depender de permissão do navegador. Se aparecer "erro", a pasta está indisponível (por exemplo, o OneDrive ainda não carregou): o app tenta de novo a cada minuto.' + U.txt("guia.backupExtra", "") ], [ "O cronômetro conta com o app fechado?", "Conta só o que você estudou de verdade. Enquanto o cronômetro roda, o app anota a hora a cada 15 segundos; se o programa fechar, travar ou o computador desligar com ele rodando, na próxima abertura o tempo é contado até essa última anotação e a sessão fica pausada para você continuar ou finalizar. Se o computador dormir com o app aberto, esse intervalo também não entra." ], [ "Como carrego o edital do meu concurso?", 'Em Ajustes › Carreira / edital, clique em "Carregar edital em PDF". O Arsenal lê as matérias e os assuntos do conteúdo programático, mostra o resultado para você conferir e, ao confirmar, monta o ciclo, as pastas e as estatísticas com esse edital. Se o edital tem vários cargos (Cebraspe, FGV, FCC, Vunesp, Quadrix, Consulplan…), ele pergunta qual é o seu e monta só as matérias comuns a todos e as do seu cargo. Editais que não numeram os assuntos (só texto corrido) são divididos em frases, para você conferir. Se o conteúdo programático estiver em um anexo separado, abra o arquivo do anexo. PDF escaneado como imagem não tem texto: nesse caso use "Importar em texto" e cole uma linha "# Nome da matéria | peso N" para cada matéria, com os assuntos numerados embaixo (1, 1.1, 2…). O edital de exemplo (Banco do Brasil) continua guardado, e dá para alternar entre os editais em Ajustes.' ], [ "Errei uma ação. Tem como voltar?", 'As ações que apagam ou concluem coisas mostram um aviso com "Desfazer" no canto da tela por alguns segundos. Apagar todos os dados e descartar uma sessão em andamento pedem confirmação antes.' ] ];
    V.guia = function(root) {
        const secoesExtra = [].concat(...Encaixe.todos("guia.secoes", {
            sec: sec,
            k: k,
            ir: ir
        }));
        const passosExtra = [].concat(...Encaixe.todos("guia.passos", {
            ir: ir
        }));
        const faq = FAQ.slice(0, 1).concat(...Encaixe.todos("guia.faq"), FAQ.slice(1));
        const NUM = [ "Zero", "Um", "Dois", "Três", "Quatro", "Cinco", "Seis", "Sete" ];
        root.appendChild(h("div", {
            class: "page"
        }, h("div", {
            class: "page-head"
        }, h("div", null, h("span", {
            class: "eyebrow"
        }, "Manual do Arsenal"), h("h1", null, "Guia e tutorial"), h("div", {
            class: "sub"
        }, "Tudo o que o app faz, tela por tela. Para ver na prática, faça o tour guiado.")), h("div", {
            class: "right row wrap"
        }, h("button", {
            class: "btn",
            onclick: () => window.print(),
            title: "Imprimir ou salvar este guia em PDF"
        }, icon("download", "sm"), "Salvar em PDF"), h("button", {
            class: "btn primary",
            onclick: () => Tour.iniciar()
        }, icon("compass", "sm"), "Fazer o tour guiado"))), h("div", {
            class: "guia"
        }, h("nav", {
            class: "guia-toc",
            "aria-label": "Seções do guia"
        }, [ [ "comece", "Comece aqui" ], [ "fluxo", "Como funciona" ], [ "telas", "Tela por tela" ] ].concat(secoesExtra.map((x => [ x.id, x.titulo ])), [ [ "atalhos", "Atalhos" ], [ "dados", "Seus dados" ], [ "duvidas", "Dúvidas frequentes" ] ]).map((([id, t]) => h("a", {
            href: "#g-" + id,
            onclick: ev => {
                ev.preventDefault();
                const el = document.getElementById("g-" + id);
                el && el.scrollIntoView({
                    behavior: U.reduzMov() ? "auto" : "smooth",
                    block: "start"
                });
            }
        }, t)))), h("div", {
            class: "col",
            style: {
                gap: "40px",
                minWidth: 0
            }
        }, sec("comece", "Comece aqui", (NUM[4 + passosExtra.length] || String(4 + passosExtra.length)) + " passos para deixar o Arsenal pronto. Leva uns cinco minutos e você só faz uma vez.", h("div", {
            class: "card"
        }, h("ol", {
            class: "steps"
        }, passosExtra, h("li", null, h("div", {
            class: "grow"
        }, h("div", {
            class: "titulo"
        }, "Defina a data da prova e as metas"), h("div", {
            class: "small muted"
        }, "Em Ajustes: meta diária (ex.: 60 min), meta da semana e a data da prova, se já saiu.")), h("button", {
            class: "btn sm",
            onclick: ir("ajustes")
        }, "Abrir Ajustes")), h("li", null, h("div", {
            class: "grow"
        }, h("div", {
            class: "titulo"
        }, "Marque no Edital o que você já estudou"), h("div", {
            class: "small muted"
        }, "Assim as revisões e o progresso começam do lugar certo. Não precisa ser perfeito.")), h("button", {
            class: "btn sm",
            onclick: ir("edital")
        }, "Abrir Edital")), h("li", null, h("div", {
            class: "grow"
        }, h("div", {
            class: "titulo"
        }, "Confira o ciclo de estudos"), h("div", {
            class: "small muted"
        }, "Ele já vem montado com 1 h por dia, o mesmo tempo para todas as matérias. Ajuste as horas e as vezes na volta (1× a 3×) de cada uma.")), h("button", {
            class: "btn sm",
            onclick: ir("ciclo")
        }, "Abrir Ciclo")), h("li", null, h("div", {
            class: "grow"
        }, h("div", {
            class: "titulo"
        }, "Estude com o cronômetro ligado"), h("div", {
            class: "small muted"
        }, "Todo o resto (metas, ciclo, estatísticas) se alimenta das sessões. Aperte Espaço para começar.")), h("button", {
            class: "btn sm",
            onclick: ir("painel#sessao")
        }, "Ir ao Painel"))))), sec("fluxo", "Como o Arsenal funciona", "Um caminho só, que se repete todo dia. Cada etapa alimenta a próxima.", h("div", {
            class: "fluxo"
        }, [ [ "Edital", "Você marca o que estudou em cada assunto." ], [ "Ciclo", "Decide a matéria da vez: cada uma aparece na volta tantas vezes quanto você marcar (1× a 3×)." ], [ "Cronômetro", "O anel do Painel mede o estudo e conta para a meta." ], [ "Revisões", "Voltam em 1, 7, 30 e 60 dias." ], [ "Flashcards", "Os erros e o que você precisa decorar voltam no dia certo." ], [ "Estatísticas", "Mostram onde você perde pontos." ] ].map((([t, d], n) => h("div", null, h("span", {
            class: "n"
        }, String(n + 1).padStart(2, "0")), h("b", null, t), h("p", null, d)))))), sec("telas", "Tela por tela", "O que cada tela faz e como usar. O botão leva direto para ela.", h("div", {
            class: "telas"
        }, TELAS.map((([id, ic, t, d, itens]) => h("div", {
            class: "card tela"
        }, h("h4", null, icon(ic), t), h("div", {
            class: "small muted"
        }, d), h("ul", null, itens.map((x => h("li", null, x)))), h("button", {
            class: "btn sm",
            onclick: ir(id)
        }, id === "painel#sessao" ? "Ir ao Painel" : "Abrir " + t, icon("arrowRight", "sm"))))))), secoesExtra.map((x => x.el)), sec("atalhos", "Atalhos de teclado", "Não precisa decorar: a tecla ? mostra a lista em qualquer tela.", h("div", {
            class: "grid g2"
        }, h("div", {
            class: "card"
        }, h("h3", null, "No app"), h("table", {
            class: "t"
        }, h("tbody", null, [ [ [ "/" ], "Buscar" ], [ [ "?" ], "Lista de atalhos" ], [ [ "Espaço" ], "Iniciar ou pausar (no Painel)" ], [ [ "G", "P" ], "Painel" ], [ [ "G", "E" ], "Edital" ], [ [ "G", "R" ], "Revisões" ], [ [ "G", "C" ], "Flashcards" ], [ [ "G", "Q" ], "Questões" ], [ [ "G", "G" ], "Este guia" ], [ [ "Esc" ], "Fechar janela ou busca" ] ].map((([t, d]) => h("tr", null, h("td", {
            style: {
                whiteSpace: "nowrap",
                width: "1%"
            }
        }, k(...t)), h("td", null, d))))))), h("div", {
            class: "card"
        }, h("h3", null, U.txt("guia.atalhosTitulo", "Flashcards")), h("table", {
            class: "t"
        }, h("tbody", null, [ [ [ "Espaço" ], "Mostrar a resposta" ], [ [ "1", "2", "3", "4" ], "Errei · Difícil · Bom · Fácil" ], [ [ "C", "E" ], "Responder Certo ou errado" ], [ [ "Z" ], "Desfazer a última nota" ], [ [ "Ctrl", "Enter" ], "Salvar o cartão (no editor)" ] ].concat(...Encaixe.todos("guia.atalhos")).map((([t, d]) => h("tr", null, h("td", {
            style: {
                whiteSpace: "nowrap",
                width: "1%"
            }
        }, k(...t)), h("td", null, d))))))))), sec("dados", "Seus dados e o backup", null, h("div", {
            class: "card col",
            style: {
                gap: "10px"
            }
        }, h("p", {
            style: {
                margin: 0
            }
        }, (window.arsenalExe ? "Tudo o que você registra fica guardado neste computador." : "Tudo o que você registra fica guardado neste navegador, neste computador.") + " O Arsenal não tem servidor, não pede conta e não envia nada para a internet."), h("p", {
            style: {
                margin: 0
            }
        }, h("b", null, "Faça um backup por semana: "), "Ajustes › Exportar backup gera um arquivo .json com tudo. Guarde no Google Drive, num pendrive ou mande para o seu e-mail. O app avisa quando o último backup ficou antigo."), h("div", {
            class: "row wrap"
        }, h("button", {
            class: "btn",
            onclick: ir("ajustes")
        }, icon("download", "sm"), "Ir para o backup")))), sec("duvidas", "Dúvidas frequentes", null, h("div", null, faq.map((([p, r]) => h("details", {
            class: "faq"
        }, h("summary", null, p), h("div", null, r))))))))));
    };
})();