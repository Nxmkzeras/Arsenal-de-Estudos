(function(raiz) {
    "use strict";
    const MAI = "A-ZÀ-ÖØ-Þ";
    const PEQ = new Set([ "de", "da", "do", "das", "dos", "e", "em", "a", "o", "as", "os", "à", "ao", "para", "com", "no", "na", "nos", "nas", "por", "ou" ]);
    const ROMANO = "(?:I{1,3}|IV|V|VI{0,3}|IX|X)";
    const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const limpa = t => String(t).replace(/\s+/g, " ").trim();
    const ACRONIMOS = new Set([ "esg", "sus", "lgpd", "clt", "ti", "tic", "tics", "sst", "cipa", "ldb", "eca", "ia", "abnt", "nr", "df", "pm", "pc", "cf", "cnh", "ctb", "cpp", "cpc", "oab", "inss", "fgts", "ibge", "oms", "uti", "sae", "epi", "epc", "stf", "stj", "tst", "tse", "tcu", "cnj", "prf", "ctb", "mbft", "bb" ]);
    function bonito(t) {
        t = limpa(t);
        if (t !== t.toUpperCase()) return t;
        return t.toLowerCase().split(" ").map(((w, i) => i && PEQ.has(w) ? w : /^(i{1,3}|iv|v|vi{0,3}|ix|x)$/.test(w) ? w.toUpperCase() : ACRONIMOS.has(w.replace(/[^a-zà-ÿ]/g, "")) ? w.toUpperCase() : w.replace(/(^|[\/(–-])([a-zà-ÿ])/g, ((x, a, b) => a + b.toUpperCase())))).join(" ");
    }
    function curto(nome) {
        let n = limpa(nome).replace(/\s+e\s+legisla[çc][ãa]o\s+(?:complementar|correlata|espec[íi]fica)$/i, "").replace(/\s*\([^)]*\)\s*$/, "");
        if (n.length > 30) {
            const k = n.search(/\s+e\s+|,\s+|\s+[-–]\s+/);
            if (k >= 8) n = n.slice(0, k);
        }
        return n.length > 34 ? n.slice(0, 33).trim() + "…" : n;
    }
    const NAO_ITEM = /(?:^|[\s(])(?:n[ºo°]\.?|art\.?|arts\.?|artigos?|lei|leis|decreto|resolu[çc][ãa]o|resolu[çc][õo]es|itens?|cap[íi]tulos?|t[íi]tulos?|§|incisos?|s[úu]mulas?|anexos?|p[áa]ginas?|e|a|ao|de|at[ée]|ou|do|da|dos|das|nr|nrs|nbr|nbrs|iso|cf|tt|tb|pec|adi|adpf|adc|re|resp|hc|rhc|ms|pl|plp|mp|tema|enunciado|enunciados|ec|lc|dl|ldb|cp|cpp|cpc|cc|clt|ctb|ctn|cdc|eca|lgpd|sus|cid|cif|cnh|mes)$/i;
    function esperados(u) {
        if (!u) return [ "1" ];
        const r = [ u.concat(1).join(".") ];
        for (let k = u.length; k >= 1; k--) r.push(u.slice(0, k - 1).concat(u[k - 1] + 1).join("."));
        return r;
    }
    function candidatos(corpo) {
        const re = /(^|[\s(;])(\d{1,2}(?:\.\d{1,2}){0,3})(?:[.)](?=[A-Za-zÀ-ÿ\"“(])|[.)]?(?=\s))/g, r = [];
        let m;
        while (m = re.exec(corpo)) {
            const ini = m.index + m[1].length;
            let fim = re.lastIndex;
            while (/\s/.test(corpo.charAt(fim))) fim++;
            const prox = corpo.charAt(fim), antes = corpo.slice(Math.max(0, ini - 14), ini).trim();
            if (!/[A-Za-zÀ-ÿ"“(]/.test(prox)) continue;
            if (NAO_ITEM.test(antes)) continue;
            r.push({
                num: m[2],
                partes: m[2].split(".").map(Number),
                ini: ini,
                fim: fim
            });
        }
        return r;
    }
    function itensDe(corpo) {
        const cs = candidatos(corpo), marcas = [], avisos = [];
        let ult = null;
        for (let i = 0; i < cs.length; i++) {
            const c = cs[i], esp = esperados(ult);
            if (esp.includes(c.num)) {
                marcas.push(c);
                ult = c.partes;
                continue;
            }
            if (!ult || marcas.length < 3) continue;
            const igual = c.num === ult.join(".");
            let pulo = false;
            for (let k = ult.length; k >= 1 && !pulo; k--) {
                const base = ult.slice(0, k - 1);
                if (c.partes.length === k && base.every(((v, j) => v === c.partes[j])) && c.partes[k - 1] > ult[k - 1] + 1 && c.partes[k - 1] <= ult[k - 1] + 2) pulo = true;
            }
            if (!igual && !pulo) continue;
            const prox = cs[i + 1];
            const ok = !prox ? false : esperados(c.partes).includes(prox.num);
            if (!ok) continue;
            avisos.push(igual ? "número repetido no edital: " + c.num : "o edital pula a numeração depois de " + ult.join(".") + " → " + c.num);
            marcas.push(Object.assign({
                aviso: true
            }, c));
            ult = c.partes;
        }
        const itens = marcas.map(((k, i) => {
            let t = limpa(corpo.slice(k.fim, i + 1 < marcas.length ? marcas[i + 1].ini : corpo.length));
            let tag = null;
            const mt = t.match(/\s+(NOVO|ATUALIZADO)$/i);
            if (mt) {
                tag = mt[1].toLowerCase();
                t = t.slice(0, -mt[0].length).trim();
            }
            t = t.replace(/[.;]\s*$/, "");
            return {
                num: k.num,
                texto: t,
                tag: tag,
                aviso: !!k.aviso,
                pos: k.ini
            };
        })).filter((x => x.texto));
        return {
            itens: itens,
            avisos: avisos
        };
    }
    function lerA(linhas) {
        const t = limpa(linhas.join(" "));
        const re = new RegExp("(?<=^|[.;:)]\\s)()([" + MAI + "][" + MAI + "0-9 ,/\\-–()]{3,190}?)\\s*:\\s+(?=(?:" + ROMANO + "\\s+[" + MAI + "]{3}[" + MAI + ' ,/\\-–]*:|1(?:[.)]\\s*|\\s+)[A-Za-zÀ-ÿ"“(]))', "g");
        const hs = [];
        let m;
        while (m = re.exec(t)) {
            const nome = limpa(m[2]), ini = m.index + m[1].length;
            const rb = nome.match(new RegExp("^(" + ROMANO + ")\\s+(.+)$"));
            hs.push({
                nome: rb ? rb[2] : nome,
                rom: rb ? rb[1] : null,
                ini: ini,
                corpo: re.lastIndex
            });
        }
        const mats = [];
        hs.forEach(((h, i) => {
            let fim = i + 1 < hs.length ? hs[i + 1].ini : t.length, texto = t.slice(h.corpo, fim);
            if (i + 1 === hs.length) {
                const k = texto.search(/[.;]\s+(?=ANEXO\b|[A-ZÀ-Ý]{2,}(?:\s+[A-ZÀ-Ý.]{2,}){1,5}(?:\s|$))/);
                if (k >= 0) texto = texto.slice(0, k + 1);
            }
            const r = itensDe(texto);
            if (h.rom) {
                const ult = mats[mats.length - 1];
                if (ult) {
                    ult.blocos.push({
                        rom: h.rom,
                        nome: bonito(h.nome),
                        itens: r.itens,
                        avisos: r.avisos
                    });
                    return;
                }
            }
            mats.push({
                nome: bonito(h.nome),
                blocos: [ {
                    rom: null,
                    nome: null,
                    itens: r.itens,
                    avisos: r.avisos
                } ]
            });
        }));
        const lista = mats.map((mt => {
            mt.blocos = mt.blocos.filter((b => b.itens.length));
            return mt;
        })).filter((mt => mt.blocos.length));
        return {
            estilo: "dois-pontos",
            materias: lista
        };
    }
    const desespaca = l => /^(?:\S ){5,}\S(?: \S+)*$/.test(l) && /^[^a-z]*$/.test(l.slice(0, 12).replace(/ /g, "")) ? l.replace(/ (?=\S( |$))/g, "").replace(/\s{2,}/g, " ") : l;
    const TEM_CONTAGEM = /^(.+?)\s+(\d+)\s+(?:assuntos?|t[óo]picos?|itens?)(?:\s+(\d+)\s+itens?\s+na\s+proje[çc][ãa]o)?(?:\s+[A-Za-zÀ-ÿ ]{1,30})?\s*$/i;
    function ehKicker(l) {
        return /^(?:\S ){5,}\S/.test(l) && !/[a-zà-ÿ]{2}/.test(l);
    }
    function acharTitulo(L, ini, piso) {
        for (let i = ini - 1; i >= piso; i--) {
            const l = L[i];
            if (!l || ehKicker(l)) continue;
            const c = l.match(TEM_CONTAGEM);
            if (c && c[1].length <= 90 && !/^\d/.test(c[1])) return {
                titulo: c[1],
                declarado: +c[2],
                peso: c[3] != null ? +c[3] : null,
                idx: i
            };
        }
        for (let i = ini - 1; i >= piso; i--) {
            const l = L[i];
            if (!l || ehKicker(l)) continue;
            if (l.length > 100 || /^\d/.test(l) || /[.;,]$/.test(l) || l.split(" ").length > 12) continue;
            return {
                titulo: l.replace(/:$/, ""),
                declarado: null,
                peso: null,
                idx: i
            };
        }
        return null;
    }
    const SO_TAG = /^(?:NOVO|ATUALIZADO)$/i;
    function corpoAparado(ls) {
        const corpo = ls.join(" "), r = itensDe(corpo);
        if (!r.itens.length) return corpo;
        const pos = r.itens[r.itens.length - 1].pos;
        let k = 0, acc = 0;
        for (let i = 0; i < ls.length; i++) {
            if (acc + ls[i].length + 1 > pos) {
                k = i;
                break;
            }
            acc += ls[i].length + 1;
        }
        for (let i = k; i < ls.length - 1; i++) {
            if (!/[.;]$/.test(ls[i])) continue;
            let j = i;
            if (SO_TAG.test(ls[j + 1] || "")) j++;
            if (j + 1 < ls.length) return ls.slice(0, j + 1).join(" ");
        }
        return corpo;
    }
    function lerB(linhas) {
        let L = linhas.map((l => limpa(l)));
        const chave = l => norm(l).replace(/\d+/g, "#"), cont = new Map;
        L.forEach((l => cont.set(chave(l), (cont.get(chave(l)) || 0) + 1)));
        const maiusc = l => {
            const x = l.replace(/[^A-Za-zÀ-ÿ]/g, "");
            return x.length >= 6 && x === x.toUpperCase();
        };
        L = L.filter((l => ehKicker(l) || !(cont.get(chave(l)) >= 2 && l.length < 90 && (maiusc(l) || /[·|]|www\./i.test(l)))));
        const inicios = [];
        L.forEach(((l, i) => {
            if (/^1(?:[.)]\s*|\s+)[A-Za-zÀ-ÿ"“(]/.test(l)) inicios.push(i);
        }));
        const grupos = [], semRomano = t => bonito(t.replace(new RegExp("^" + ROMANO + "\\s+"), ""));
        L.forEach(((l, i) => {
            const prox = L[i + 1] || "";
            if (ehKicker(l) && /^BLOCO(?:I{1,3}|IV|V|\d)$/i.test(l.replace(/ /g, ""))) {
                if (prox && prox.length < 80 && !TEM_CONTAGEM.test(prox) && !ehKicker(prox)) grupos.push({
                    i: i,
                    nome: semRomano(prox)
                });
            } else if (/^\+\s+\S/.test(l) && l.length < 80) grupos.push({
                i: i,
                nome: bonito(l.replace(/^\+\s+/, ""))
            });
        }));
        const corpoDe = (i, f) => corpoAparado(L.slice(i, f).filter((l => !ehKicker(l))));
        const validos = [];
        inicios.forEach(((ini, k) => {
            const piso = Math.max(0, ini - 14, validos.length ? validos[validos.length - 1].ini + 1 : 0);
            const t = acharTitulo(L, ini, piso);
            if (!t) return;
            const lim = k + 1 < inicios.length ? inicios[k + 1] : L.length;
            if (itensDe(corpoDe(ini, lim)).itens.length < 3) return;
            validos.push({
                ini: ini,
                t: t
            });
        }));
        const mats = [];
        validos.forEach(((v, k) => {
            const fim = k + 1 < validos.length ? validos[k + 1].t.idx : L.length;
            const r = itensDe(corpoDe(v.ini, fim));
            const grupo = grupos.filter((g => g.i < v.t.idx)).pop();
            const rb = v.t.titulo.match(new RegExp("^(" + ROMANO + ")\\s+(.+)$"));
            const bloco = {
                rom: rb ? rb[1] : null,
                nome: rb ? bonito(rb[2]) : null,
                itens: r.itens,
                avisos: r.avisos
            };
            if (rb && mats.length) {
                mats[mats.length - 1].blocos.push(bloco);
                return;
            }
            mats.push({
                nome: bonito(v.t.titulo),
                grupo: grupo ? grupo.nome : null,
                declarado: v.t.declarado,
                peso: v.t.peso,
                blocos: [ Object.assign(bloco, {
                    rom: null,
                    nome: null
                }) ]
            });
        }));
        return {
            estilo: "titulos",
            materias: mats
        };
    }
    const MAIUSC = l => {
        const x = String(l).replace(/\([^)]*\)/g, "").replace(/[^A-Za-zÀ-ÿ]/g, "");
        return x.length >= 4 && x === x.toUpperCase();
    };
    const CLAUSULA = /^(\d+(?:\.\d+)*)\.?\s+(?=\S)/;
    const RE_CP = /^(?:ANEXO\s+[IVXLC0-9]+\s*[-–—:.]*\s*|[IVXLC]{1,5}\s*[-–—:.]\s*)?(?:\d+(?:\.\d+)*\.?\s*)?(?:D[OAE]S?\s+)?(?:CONTE[ÚU]DOS?\s+PROGRAM[ÁA]TICOS?|PROGRAMA\s+(?:D[AO]S?\s+)?PROVAS?|OBJETOS?\s+DE\s+AVALIA[ÇC][ÃA]O|CONTE[ÚU]DOS?\s+D[AEO]S?\s+PROVAS?)\b/i;
    const RE_NIVEL = /^(?:[A-Z]\)\s*)?(?:\d+(?:\.\d+)*[.)-]?\s*)?(?:(?:CARGOS?\s+(?:DE\s+)?)?N[ÍI]VEL|ENSINO)\s+(?:(?:DE\s+)?(ALFABETIZADO|FUNDAMENTAL|M[ÉE]DIO|SUPERIOR|T[ÉE]CNICO)|COMPLETO)\b[^:]{0,45}:?$/i;
    const RE_GRUPO = /^(?:\d+(?:\.\d+)*[.)-]?\s*)?(?:PROVA\s+(?:OBJETIVA\s+)?DE\s+)?(?:M[ÓO]DULO\s+[IVX\d]+\s*[-–:]?\s*)?(?:CONHECIMENTOS?\s+(B[ÁA]SICOS?|GERAIS|COMPLEMENTARES|PEDAG[ÓO]GICOS?|ESPEC[ÍI]FICOS?|DO\s+CARGO)\b|PARTE\s+(?:COMUM|ESPEC[ÍI]FICA))(.*)$/i;
    const RE_CARGO = /^(?:\d+(?:\.\d+)*\.?\s+)?(?:[•·●▪-]\s*)?(?:(?:CARGO|EMPREGO|PERFIL|FUN[ÇC][ÃA]O|OCUPA[ÇC][ÃA]O)\s+(?:N[º°.]*\s*)?\d+\s*[:.–-]\s*|PARA\s+O\s+(?:CARGO|EMPREGO)\s+DE\s*:\s*|(?:CARGO|EMPREGO|PERFIL)S?\s*:\s*|PARA\s+OS?\s+(?:CARGOS?|EMPREGOS?)\s+DE\s*:\s*)(.+)$/i;
    const RE_CP2 = /^ANEXO\s+[IVXLC0-9]+\s*[-–—:.]*\s*PROGRAMAS?\b/i;
    const RE_AREA = /^[ÁA]rea\s+de\s+conhecimento\s*:\s*(.+)$/i;
    const NAO_TITULO = /^(?:observa[çc][ãa]o|observa[çc][õo]es|obs|nota|aten[çc][ãa]o|importante|exemplo|exemplos|lei|leis|decreto|decretos|resolu[çc][ãa]o|portaria|art|arts|s[úu]mulas?|medida|c[óo]digo|emenda|instru[çc][ãa]o|norma|nbr|nr|http|https|fonte|disponível|dispon[íi]vel|bibliografia|refer[êe]ncias?|ver|vide|obs\.|inciso|cap[íi]tulo|t[íi]tulo|livro|se[çc][ãa]o)\b/i;
    const GENERICO = /^(?:HABILIDADES|CONHECIMENTOS|CONHECIMENTO|OBJETOS? DE AVALIA[ÇC][ÃA]O|DISPOSI[ÇC][ÕO]ES.*|DAS? PROVAS?.*|INSTRU[ÇC][ÕO]ES.*|CRIT[ÉE]RIOS.*|OBSERVA[ÇC][ÕO]ES?)$/i;
    const PALAVRA_MATERIA = /^(?:l[íi]ngua|portugu[êe]s|ingl[êe]s|espanhol|franc[êe]s|matem[áa]tica|racioc[íi]nio|l[óo]gica|inform[áa]tica|direito|direitos|legisla[çc][ãa]o|no[çc][õo]es|atualidades|[ée]tica|administra[çc][ãa]o|contabilidade|economia|estat[íi]stica|geografia|hist[óo]ria|biologia|qu[íi]mica|f[íi]sica|sa[úu]de|pol[íi]tica|pol[íi]ticas|seguran[çc]a|arquivologia|biblioteconomia|reda[çc][ãa]o|literatura|filosofia|sociologia|pedagogia|did[áa]tica|educa[çc][ãa]o|enfermagem|medicina|farm[áa]cia|psicologia|engenharia|gest[ãa]o|finan[çc]as|auditoria|or[çc]amento|licita[çc][õo]es|tecnologia|banco|programa[çc][ãa]o|redes|sistemas|criminologia|medicina|fisioterapia|nutri[çc][ãa]o|odontologia|veterin[áa]ria|agronomia|geologia|topografia|desenho|eletr[ôo]nica|mec[âa]nica|metrologia|qualidade|processo|processos|procedimentos|princ[íi]pios|fundamentos|t[ée]cnicas?|teoria|an[áa]lise|cuidados|assist[êe]ncia|vigil[âa]ncia|epidemiologia|farmacologia|anatomia|fisiologia|patologia|bioqu[íi]mica|cirurgia|cl[íi]nica|pediatria|obstetr[íi]cia|urg[êe]ncia|primeiros|meio|ambiental|ci[êe]ncias?|cidadania|cultura|artes?|m[úu]sica|educa[çc][ãa]o|libras|crimes|inqu[ée]rito|investiga[çc][ãa]o|per[íi]cia|armamento|tiro|opera[çc][õo]es|ordem|disciplina|regulamento|estatuto|c[óo]digo)\b/i;
    const NOME_CONHECIMENTOS = /^conhecimentos?\s+(?:gerais|espec[íi]ficos?|b[áa]sicos?|do\s+cargo|da\s+[áa]rea)(?:\s+(?:para|do|da)\s+.*)?$/i;
    const FIM_FRASE = /[.;)!?]$/;
    const MATERIA_FORTE = /^(?:direito|direitos|no[çc][õo]es|l[íi]ngua|legisla[çc][ãa]o|matem[áa]tica|racioc[íi]nio|conhecimentos|probabilidade|estat[íi]stica|inform[áa]tica|atualidades|vendas|[ée]tica|contabilidade|economia|portugu[êe]s|ingl[êe]s|tecnologia\s+da\s+informa[çc][ãa]o|criminologia|medicina\s+legal|hist[óo]ria|geografia|reda[çc][ãa]o|administra[çc][ãa]o\s+(?:p[úu]blica|geral|financeira))\b/i;
    const PARECE_CARGO = /^(?:analista|t[ée]cnico|agente|auxiliar|assistente|professor|m[ée]dico|enfermeiro|engenheiro|advogado|procurador|auditor|fiscal|escritur[áa]rio|oficial|soldado|delegado|perito|inspetor|escriv[ãa]o|investigador|guarda|motorista|operador|contador|especialista|pesquisador|cargo|emprego|[áa]rea)\b/i;
    const materiaForte = n => MATERIA_FORTE.test(limpa(n)) && !PARECE_CARGO.test(limpa(n));
    const ABREV = /(?:\b(?:art|arts|n|nº|no|inc|incs|cap|cf|ex|etc|obs|dec|p[áa]g|p|vol|s|v|resp|rel|min|dr|dra|sr|sra|prof|av|al|par|§|ss|seg)\.?)$/i;
    const nivelDe = t => {
        const x = norm(t);
        return /fundamental|alfabetizado/.test(x) ? "Fundamental" : /medio/.test(x) ? "Médio" : /superior/.test(x) ? "Superior" : /tecnico/.test(x) ? "Técnico" : null;
    };
    const chaveCargo = n => {
        const m = limpa(n).match(/^([A-Z]{1,4}\d{0,3})\s*[–-]\s*\S/);
        return norm(m ? m[1] : n).replace(/[^a-z0-9]+/g, " ").trim();
    };
    function achaRegioes(L) {
        const cand = [];
        L.forEach(((l, i) => {
            if (l.length > 130 || /[·|]|www\./i.test(l) || /[;,.]$/.test(l) || /[ ,;](?:e|ou)$/.test(l) || !/^[A-ZÀ-Ý0-9]/.test(l)) return;
            let ok = RE_CP.test(l) || RE_CP2.test(l);
            if (!ok && /^ANEXO\s+[IVXLC0-9]+\s*$/i.test(l) && L[i + 1] && RE_CP.test(L[i + 1]) && L[i + 1].length < 100) ok = true;
            if (ok) cand.push(i);
        }));
        return cand.map((i => {
            const l = L[i], num = l.match(/^(\d{1,2})(?:\.\d+)*\.?\s*D/);
            let fim = L.length;
            for (let j = i + 2; j < L.length; j++) {
                if (/^ANEXO\s+[IVXLC0-9]+\b/i.test(L[j]) && !RE_CP.test(L[j]) && !RE_CP2.test(L[j]) && !(L[j + 1] && RE_CP.test(L[j + 1]))) {
                    fim = j;
                    break;
                }
                if (num) {
                    const m = L[j].match(/^(\d{1,2})\.?\s*D[OAE]S?\s+[A-ZÀ-Ý]{3}/);
                    if (m && +m[1] > +num[1]) {
                        fim = j;
                        break;
                    }
                }
            }
            return {
                ini: i + 1 + (RE_CP.test(L[i + 1] || "") && /^ANEXO\s+[IVXLC0-9]+\s*$/i.test(l) ? 1 : 0),
                fim: fim
            };
        }));
    }
    function topicosDeProsa(texto) {
        const t = limpa(texto), out = [];
        let ini = 0;
        for (let i = 0; i < t.length; i++) {
            const c = t[i];
            if ((c === "." || c === ";") && (i + 1 === t.length || /\s/.test(t[i + 1]))) {
                const antes = t.slice(ini, i + 1);
                if (c === "." && (ABREV.test(antes.slice(0, -1)) || /\b\d+[º°]?$/.test(antes.slice(0, -1)) && /\b(?:art|arts|n|nº|lei|decreto)\b[^.;]*$/i.test(antes.slice(0, -1)))) continue;
                if (c === "." && !/^\s*[A-ZÀ-Ý0-9“"(]/.test(t.slice(i + 1, i + 4)) && i + 1 < t.length) continue;
                out.push(antes.trim());
                ini = i + 1;
            }
        }
        if (ini < t.length) out.push(t.slice(ini).trim());
        const r = [];
        out.forEach((x => {
            const y = x.replace(/[.;]\s*$/, "").trim();
            if (!y) return;
            if (r.length && y.length < 14) r[r.length - 1] += "; " + y; else r.push(y);
        }));
        return r;
    }
    function itensDoCorpo(texto) {
        texto = texto.replace(/([a-zà-ÿ)])\.(\d{1,2}\.\s)/g, "$1. $2");
        const num = itensDe(texto);
        if (num.itens.length >= 2) return {
            itens: detalhar(num.itens),
            avisos: num.avisos,
            sintetico: false
        };
        const t = limpa(texto).replace(/^1\s*[.)\-–]?\s+(?=[A-Za-zÀ-ÿ"“(])/, "");
        if (num.itens.length === 1 && t.length <= 300) return {
            itens: [ {
                num: "1",
                texto: t.replace(/[.;]\s*$/, ""),
                tag: null,
                aviso: false
            } ],
            avisos: [],
            sintetico: false
        };
        return {
            itens: detalhar(topicosDeProsa(t).map(((x, i) => ({
                num: String(i + 1),
                texto: x,
                tag: null,
                aviso: false
            })))),
            avisos: [],
            sintetico: true
        };
    }
    const LONGO = 260;
    function detalhar(itens) {
        const out = [];
        itens.forEach(((it, k) => {
            const temFilhos = itens.some((x => x !== it && x.num.startsWith(it.num + ".")));
            if (temFilhos || it.texto.length < LONGO) {
                out.push(it);
                return;
            }
            const mt = it.texto.match(/^([^:;.]{3,90}?):\s+(.+)$/);
            let titulo, resto;
            if (mt && !/\b(?:arts?|lei|n[ºo°]|decreto)\s*$/i.test(mt[1])) {
                titulo = mt[1].trim();
                resto = mt[2];
            } else {
                const ps = topicosDeProsa(it.texto);
                if (ps.length < 3) {
                    out.push(it);
                    return;
                }
                titulo = ps[0];
                resto = ps.slice(1).join(". ");
            }
            let partes = topicosDeProsa(resto);
            if (partes.length < 2) partes = resto.split(/,\s+(?=[a-zà-ÿA-ZÀ-Ý])/).map((x => x.trim())).filter((x => x.length >= 4));
            if (partes.length < 2) {
                out.push(it);
                return;
            }
            out.push(Object.assign({}, it, {
                texto: titulo
            }));
            partes.forEach(((p, j) => out.push({
                num: it.num + "." + (j + 1),
                texto: p.charAt(0).toUpperCase() + p.slice(1),
                tag: null,
                aviso: false,
                derivado: true
            })));
        }));
        return out;
    }
    function blocosDoCorpo(texto) {
        const re = new RegExp(String.raw`(^|(?<=[.;)]\s))(` + ROMANO + String.raw`)\s+([` + MAI + String.raw`][` + MAI + String.raw`0-9 ,/\-–()]{3,190}?)\s*:\s+(?=\d)`, "g");
        const hs = [];
        let m, esperado = "I";
        const ordem = [ "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X" ];
        while (m = re.exec(texto)) {
            if (m[2] !== esperado) continue;
            hs.push({
                rom: m[2],
                nome: bonito(m[3]),
                ini: m.index + m[1].length,
                corpo: re.lastIndex
            });
            esperado = ordem[ordem.indexOf(esperado) + 1] || "zz";
        }
        if (!hs.length || hs[0].ini > 3) {
            const r = itensDoCorpo(texto);
            return [ {
                rom: null,
                nome: null,
                itens: r.itens,
                avisos: r.avisos,
                sintetico: r.sintetico
            } ];
        }
        return hs.map(((h, k) => {
            const r = itensDoCorpo(texto.slice(h.corpo, k + 1 < hs.length ? hs[k + 1].ini : texto.length));
            return {
                rom: h.rom,
                nome: h.nome,
                itens: r.itens,
                avisos: r.avisos,
                sintetico: r.sintetico
            };
        })).filter((b => b.itens.length));
    }
    function semAssinatura(R) {
        for (let j = Math.max(1, R.length - 8); j < R.length; j++) if (/^(?:Presidente|Presidenta|Diretor|Diretora|Secret[áa]ri[oa]|Coordenador|Coordenadora|Reitor|Reitora|Superintendente|Gerente)\b/.test(R[j]) && R[j - 1].length < 70 && !/[.;:]$/.test(R[j - 1])) return R.slice(0, j - 1);
        const u = R.length - 1;
        if (u > 1 && MAIUSC(R[u]) && R[u].length <= 45 && R[u].split(/\s+/).length <= 5 && !/[.;:,\d]/.test(R[u]) && /[.;)]$/.test(R[u - 1])) return R.slice(0, u);
        return R;
    }
    function juntaParenteses(R) {
        const out = [];
        for (let i = 0; i < R.length; i++) {
            let l = R[i];
            const abreTitulo = () => /^(?:\d+(?:\.\d+)*\.?\s+)?[A-ZÀ-Ý][A-ZÀ-Ý0-9 ,/–-]{3,}\(/.test(l);
            let k = 0;
            while (abreTitulo() && (l.match(/\(/g) || []).length > (l.match(/\)/g) || []).length && R[i + 1] && k < 3) {
                l += " " + R[++i];
                k++;
            }
            out.push(l);
        }
        return out;
    }
    function filtroDoNome(nome) {
        const f = {
            nome: nome,
            somente: null,
            exceto: null
        };
        f.nome = nome.replace(/\s*\(\s*(EXCETO|SOMENTE|APENAS)\s+(?:PARA\s+)?(?:O|OS|A|AS)?\s*(?:CARGOS?|EMPREGOS?|FUN[ÇC][ÕO]ES|FUN[ÇC][ÃA]O|PERFIS|PERFIL)\s+(?:DE\s+)?([^)]+)\)/i, ((x, tipo, quem) => {
            const lista = quem.split(/,\s+|\s+E\s+|\s+e\s+(?=[A-ZÀ-Ý])/).map((y => y.trim())).filter(Boolean);
            if (/exceto/i.test(tipo)) f.exceto = lista; else f.somente = lista;
            return "";
        })).replace(/\s*\(\s*para\s+todos\s+os\s+(?:cargos|empregos)\s*\)/i, "").trim();
        return f;
    }
    function filtroDaLinha(t) {
        const x = limpa(t).replace(/[.;:]$/, "");
        if (/^TOD[OA]S\b/i.test(x) && !/EXCETO/i.test(x)) return {
            somente: null,
            exceto: null
        };
        let m = x.match(/EXCETO\s+(?:O|OS|A|AS)?\s*(?:CARGOS?|EMPREGOS?)?\s*(?:DE\s+)?(.+)$/i);
        if (m) return {
            somente: null,
            exceto: [ m[1] ]
        };
        m = x.match(/^(?:APENAS|SOMENTE)\s+(?:O|OS|A|AS)?\s*(?:CARGOS?|EMPREGOS?)?\s*(?:DE\s+)?(.+)$/i);
        if (m) return {
            somente: [ m[1] ],
            exceto: null
        };
        return null;
    }
    function refCasa(ref, cargoNome) {
        const fora = /^(?:cargo|cargos|emprego|empregos|para|apenas|somente|exceto|todos|todas|area|areas|nivel|especialidade|perfil|de|da|do|das|dos|e)$/;
        const toks = t => norm(t).replace(/[^a-z0-9 ]+/g, " ").split(" ").filter((w => w.length >= 4 && !fora.test(w)));
        const a = toks(ref), b = toks(cargoNome);
        const casa = (w, x) => w === x || w.length >= 5 && x.length >= 5 && w.slice(0, 6) === x.slice(0, 6);
        return a.length > 0 && a.every((w => b.some((x => casa(w, x)))));
    }
    const grupoEhMateria = resto => {
        const x = String(resto || "").match(/^\s+(?:D[EAO]S?|EM)\s+([^:]+?)\s*:?\s*$/i);
        return !!x && !/n[íi]vel|ensino|cargo|emprego|[áa]rea|todos|prova/i.test(x[1]) && /\b(?:inform[áa]tica|direito|matem[áa]tica|l[íi]ngua|portugu[êe]s|ingl[êe]s|legisla[çc][ãa]o|administra[çc][ãa]o|contabilidade|economia|estat[íi]stica|geografia|hist[óo]ria|atualidades|sa[úu]de|tr[âa]nsito|seguran[çc]a)\b/i.test(x[1]);
    };
    function lerRegiao(R) {
        R = juntaParenteses(semAssinatura(R));
        const proprios = R.filter(((l, i) => MAIUSC(l) && l.length <= 95 && !/[.;,:]$/.test(l) && !/:/.test(l.slice(0, 60)) && !RE_NIVEL.test(l) && !RE_GRUPO.test(l) && !RE_CARGO.test(l) && l.replace(/[^A-Za-zÀ-ÿ]/g, "").length >= 8 && (i === 0 || FIM_FRASE.test(R[i - 1]) || MAIUSC(R[i - 1]) || RE_GRUPO.test(R[i - 1])))).length;
        const dpTitulo = R.filter(((l, i) => {
            const m = l.match(/^(?:\d+(?:\.\d+)*\.?\s+)?([A-ZÀ-Ý][^:.;]{2,60}?):\s*\S/);
            return m && !MAIUSC(m[1]) && i > 0 && FIM_FRASE.test(R[i - 1]) && m[1].split(" ").length <= 8 && !NAO_TITULO.test(m[1]);
        })).length;
        const modoLinha = proprios >= 3 && proprios >= dpTitulo * .5;
        const ctx = {
            nivel: null,
            grupo: null,
            kind: null,
            cargo: null,
            cargoModo: null,
            estilo: null,
            lista: null,
            multi: null
        };
        const mats = [], cargos = new Map, ignoradas = [];
        let cur = null;
        const registra = nome => {
            nome = bonito(limpa(nome).replace(/^\d{1,3}\s*:\s*/, "").replace(/[:.;\s]+$/, ""));
            const k = chaveCargo(nome);
            if (!cargos.has(k)) {
                const ja = mesmoCargo(k);
                if (ja) return ja;
                cargos.set(k, {
                    nome: nome,
                    key: k,
                    nivel: ctx.nivel
                });
            }
            return cargos.get(k);
        };
        const palavrasDe = t => t.split(" ").filter((w => w.length >= 3));
        const casa = (a, b) => a === b || a.length >= 6 && b.length >= 6 && a.slice(0, 7) === b.slice(0, 7);
        const mesmoCargo = k => {
            const pk = palavrasDe(k);
            if (!pk.length) return null;
            let melhor = null, nota = 0;
            for (const c of cargos.values()) {
                if (!c.daLista || c.nivel && ctx.nivel && c.nivel !== ctx.nivel) continue;
                const pc = palavrasDe(c.key), [menor, maior] = pk.length <= pc.length ? [ pk, pc ] : [ pc, pk ];
                if (menor.every((w => maior.some((x => casa(w, x)))))) {
                    const n = menor.length / maior.length;
                    if (n > nota) {
                        nota = n;
                        melhor = c;
                    }
                }
            }
            return melhor;
        };
        const setCargo = nome => {
            nome = bonito(limpa(nome).replace(/[:.;\s]+$/, "").replace(/^\d{1,3}\s*:\s*/, "")).replace(/^([A-Za-z]{1,4}\d{0,3})(\s*[–-])/, ((x, a, b) => a.toUpperCase() + b));
            const k = chaveCargo(nome);
            const ja = !cargos.has(k) && mesmoCargo(k);
            if (!cargos.has(k) && !ja) cargos.set(k, {
                nome: nome,
                key: k,
                nivel: ctx.nivel
            });
            ctx.cargo = ja || cargos.get(k);
            ctx.estilo = null;
            ctx.multi = null;
            cur = null;
        };
        const abre = (nome, corpo, viaDoisPontos) => {
            const fl = filtroDoNome(nome);
            nome = fl.nome;
            cur = {
                viaDoisPontos: !!viaDoisPontos,
                somente: fl.somente,
                exceto: fl.exceto,
                maiusc: MAIUSC(nome),
                nome: bonito(nome),
                nivel: ctx.nivel,
                grupo: ctx.grupo,
                kind: ctx.kind,
                cargo: ctx.cargo ? ctx.cargo.nome : null,
                cargos: ctx.multi && ctx.multi.length ? ctx.multi.map((c => c.nome)) : null,
                corpo: corpo ? [ corpo ] : []
            };
            mats.push(cur);
        };
        for (let i = 0; i < R.length; i++) {
            const l = R[i], prev = R[i - 1] || "", next = R[i + 1] || "";
            let m;
            if (next && l.length >= 50 && MAIUSC(l) && !/[:.;,]$/.test(l) && !/:/.test(l) && /^[A-ZÀ-Ý][A-ZÀ-Ý0-9 ,/\-–()]{2,100}:(?:\s|$)/.test(next) && !RE_GRUPO.test(l) && !RE_NIVEL.test(l) && !RE_CARGO.test(l)) {
                R[i + 1] = l + " " + next;
                continue;
            }
            if (m = l.match(/^PROGRAMA\s*:\s*(.*)$/i)) {
                if (cur && !cur.corpo.length) {
                    if (m[1].trim()) cur.corpo.push(m[1]);
                    continue;
                }
                if (m[1].trim()) {
                    R[i] = m[1];
                    i--;
                }
                continue;
            }
            if (ctx.lista) {
                if (m = l.match(/^(\d{1,3}):\s*(\S.*)$/)) {
                    ctx.lista.push(registra(m[2]));
                    continue;
                }
                ctx.multi = ctx.lista;
                ctx.lista = null;
                ctx.estilo = null;
            }
            if (RE_NIVEL.test(l) && l.length < 90) {
                ctx.nivel = nivelDe(l);
                ctx.grupo = null;
                ctx.kind = null;
                ctx.cargo = null;
                ctx.cargoModo = null;
                ctx.estilo = null;
                cur = null;
                continue;
            }
            if (m = l.match(/^CONHECIMENTOS?\s+ESPEC[ÍI]FICOS?\s+PARA\s+O\s+CARGO\s+\d+\s*:\s*(\S.*)$/i)) {
                let nome = m[1];
                while (R[i + 1] && !/[A-Z]{1,3}\.[A-Z]{1,3}\.\d+$/.test(nome) && R[i + 1].length <= 60 && !/:/.test(R[i + 1]) && !/[.;]$/.test(R[i + 1])) nome += " " + R[++i];
                ctx.kind = "especifico";
                ctx.grupo = "Conhecimentos Específicos";
                ctx.cargoModo = "explicito";
                ctx.multi = null;
                setCargo(nome);
                continue;
            }
            if (RE_GRUPO.test(l) && /^(?:CARGOS?\s*:\s*(?:TOD|APENAS|SOMENTE|EXCETO)|PROGRAMA\s*:)/i.test(next) && !/:/.test(l)) {
                abre(l.replace(CLAUSULA, ""), "");
                ctx.estilo = "linha";
                continue;
            }
            if ((m = l.match(RE_GRUPO)) && !grupoEhMateria(m[2]) && /^(?:\s*$|\s*[-–(:—]|\s+(?:PARA|APENAS|DA|DO|DE|EM|NA|NO)\b)/i.test(m[2] || "") && !(/:\s*\S/.test(m[2] || "") && !/^\s*[-–(]/.test(m[2] || "") && !/:\s*$/.test(l)) && l.length < 160 && !/:\s*[A-Za-z0-9À-ÿ]/.test(l.replace(/PARA\s+O\s+CARGO[^:]*:/i, ""))) {
                const tipo = (m[1] || "").toLowerCase();
                ctx.kind = /espec|cargo|parte espec/.test(tipo + " " + l.toLowerCase().slice(0, 40)) && !/b[áa]sic|gerais|comum|complement|pedag/i.test(tipo) ? "especifico" : "basico";
                ctx.grupo = m[1] ? bonito("CONHECIMENTOS " + m[1].toUpperCase()) : bonito(l.replace(CLAUSULA, "").replace(/^M[ÓO]DULO\s+[IVX\d]+\s*[-–:]?\s*/i, "").replace(/\s*[-–].*$/, "").replace(/:\s*$/, ""));
                ctx.cargo = null;
                ctx.cargoModo = null;
                ctx.estilo = null;
                ctx.multi = null;
                cur = null;
                if (/PARA\s+OS\s+CARGOS\s*:?\s*$/i.test(l)) {
                    ctx.lista = [];
                    ctx.kind = "especifico";
                }
                const ec = l.match(/PARA\s+O\s+CARGO\s+(?!\d+\s*:?\s*$)(.+)$/i);
                if (ec) {
                    ctx.cargoModo = "explicito";
                    setCargo(ec[1]);
                }
                const nv = /\b(?:ENSINO|N[ÍI]VEL)\s+(?:FUNDAMENTAL|M[ÉE]DIO|SUPERIOR|T[ÉE]CNICO)/i.exec(l);
                if (nv) ctx.nivel = nivelDe(nv[0]);
                continue;
            }
            if (m = l.match(RE_AREA)) {
                ctx.grupo = bonito(m[1]);
                ctx.kind = "basico";
                ctx.cargoModo = ctx.cargoModo;
                cur = null;
                continue;
            }
            if ((m = l.match(RE_CARGO)) && filtroDaLinha(m[1])) {
                const fl = filtroDaLinha(m[1]);
                if (cur && !cur.corpo.length) {
                    cur.somente = fl.somente;
                    cur.exceto = fl.exceto;
                }
                continue;
            }
            if (m = l.match(RE_CARGO)) {
                let nome = m[1];
                while (R[i + 1] && (/PARA\s+OS?\s+CARGOS?\s+DE/i.test(l) && MAIUSC(R[i + 1]) && !/[.;]$/.test(nome) && !/:/.test(R[i + 1]) && !RE_GRUPO.test(R[i + 1]) && !RE_NIVEL.test(R[i + 1]) || /(?:,|\s(?:E|DE|DO|DA|–|-))$/i.test(nome) && MAIUSC(R[i + 1]) && !/:/.test(R[i + 1]) && !RE_GRUPO.test(R[i + 1]) && !RE_NIVEL.test(R[i + 1]) || /[–-]$/.test(nome) && R[i + 1].length <= 90 || /^[ÁA]REA\s*:/i.test(R[i + 1]) || l.length >= 70 && MAIUSC(R[i + 1]) && R[i + 1].length <= 45 && !/:/.test(R[i + 1]) && !RE_GRUPO.test(R[i + 1]) || l.length >= 60 && /^[–-]\s*[A-ZÀ-Ý]/.test(R[i + 1]) && R[i + 1].length <= 70)) {
                    nome += " " + R[++i];
                }
                const varios = nome.replace(/[.;]\s*$/, "").split(/,\s+(?:e\s+)?(?=[A-ZÀ-Ý])|\s+E\s+(?=[A-ZÀ-Ý]{2,}[^,]*\s[–-]\s)/).map((x => x.trim())).filter(Boolean);
                if (varios.length >= 2 && varios.every((x => x.length <= 80)) && /PARA\s+OS?\s+(?:CARGOS?|EMPREGOS?)\s+DE/i.test(l)) {
                    ctx.cargo = null;
                    ctx.cargoModo = "explicito";
                    ctx.multi = varios.map((x => Object.assign(registra(x), {
                        daLista: true
                    })));
                    ctx.estilo = null;
                    cur = null;
                    continue;
                }
                ctx.cargoModo = "explicito";
                setCargo(nome);
                continue;
            }
            if (ctx.kind === "especifico" && /^[A-Z]{1,4}\d{0,3}\s*[–-]\s*[A-ZÀ-Ý]/.test(l) && MAIUSC(l) && l.length < 100 && !/:/.test(l)) {
                ctx.cargoModo = "explicito";
                setCargo(l);
                continue;
            }
            m = l.match(/^(?:(\d+(?:\.\d+)+)\.?\s+)?(?:[•·●▪-]\s*)?([A-ZÀ-Ý0-9][^:]{2,190}?)\s*:\s*(.*)$/);
            if (m && !/^\d+(?:\.\d+)*\.?$/.test(m[2]) && !(/^\d/.test(m[2]) && !m[1]) && m[2].split(/\s+/).length <= (MAIUSC(m[2]) ? 24 : 12) && !GENERICO.test(m[2]) && !/[.;]\s*\S/.test(m[2].replace(/\bn[ºo°]\s*[\d.]+/gi, "").replace(/\([^)]*\)/g, "")) && !NAO_TITULO.test(m[2]) && !/^(?:https?)$/i.test(m[2]) && /[A-Za-zÀ-ÿ]{3}/.test(m[2])) {
                const caps = MAIUSC(m[2]), okPrev = !/(?:^|[\s.;)])\d{1,2}(?:\.\d+)*\.?$/.test(prev) && (i === 0 || /^\d{1,3}:\s/.test(prev) || FIM_FRASE.test(prev) || MAIUSC(prev) || !!RE_GRUPO.test(prev) || !!RE_CARGO.test(prev) || !!RE_NIVEL.test(prev) || !!RE_AREA.test(prev) || !!CLAUSULA.test(prev) && MAIUSC(prev.replace(CLAUSULA, "")));
                const permitido = caps ? okPrev && ctx.estilo !== "linha" || !!m[1] : !modoLinha && okPrev && !m[1] && ctx.estilo !== "caps" && (PALAVRA_MATERIA.test(m[2]) || NOME_CONHECIMENTOS.test(m[2]) || !mats.length);
                if (permitido) {
                    const nome = m[2], resto = m[3];
                    if (ctx.kind === "especifico" && ctx.cargo == null && !ctx.cargoModo && !ctx.multi) ctx.cargoModo = materiaForte(nome) ? "materias" : "titulo";
                    const antes = mats.length;
                    if (ctx.kind === "especifico" && ctx.cargoModo === "titulo") {
                        setCargo(nome);
                        abre("Conhecimentos Específicos", resto);
                    } else abre(nome, resto, caps);
                    if (mats.length > antes && !(ctx.kind === "especifico" && ctx.cargoModo === "titulo")) ctx.estilo = caps ? "caps" : "title";
                    continue;
                }
            }
            const cl = l.match(CLAUSULA), semCl = cl ? l.replace(CLAUSULA, "") : l;
            const proprio = !/[.;,:]$/.test(l) && !/:/.test(semCl) && l.length <= 95 && semCl.split(/\s+/).length <= 14 && semCl.length >= 4 && (!!cl || !/^\d/.test(l));
            const continuacao = MAIUSC(prev) && prev.length >= 60 && !/[.;]$/.test(prev) && !RE_GRUPO.test(prev) && !RE_NIVEL.test(prev) && !RE_CARGO.test(prev);
            if (proprio && !continuacao && MAIUSC(semCl) && !GENERICO.test(semCl) && semCl.replace(/[^A-Za-zÀ-ÿ]/g, "").length >= 6 && (i === 0 || PALAVRA_MATERIA.test(semCl) && semCl.length <= 60 || FIM_FRASE.test(prev) || MAIUSC(prev) || !!RE_GRUPO.test(prev) || !!RE_NIVEL.test(prev) || !!RE_CARGO.test(prev) || !!CLAUSULA.test(prev)) && next && !/^\s*$/.test(next)) {
                if (ctx.kind === "especifico" && ctx.cargo == null && !ctx.cargoModo && !ctx.multi && materiaForte(semCl)) ctx.cargoModo = "materias";
                if (ctx.kind === "especifico" && ctx.cargoModo !== "materias" && (cl ? cl[1].split(".").length >= 3 : modoLinha || true)) {
                    ctx.cargoModo = "explicito";
                    setCargo(semCl);
                    abre("Conhecimentos Específicos", "");
                    continue;
                }
                abre(semCl, "");
                ctx.estilo = "linha";
                continue;
            }
            if (proprio && !continuacao && !MAIUSC(semCl) && /^[A-ZÀ-Ý]/.test(semCl) && semCl.length <= 70 && semCl.split(/\s+/).length <= 9 && (PALAVRA_MATERIA.test(semCl) || NOME_CONHECIMENTOS.test(semCl)) && (i === 0 || FIM_FRASE.test(prev) || MAIUSC(prev) || !!RE_GRUPO.test(prev) || !!RE_NIVEL.test(prev) || !!RE_CARGO.test(prev)) && next && /^[A-ZÀ-Ý0-9"“(]/.test(next) && !(ctx.estilo === "caps" && cur && cur.corpo.length)) {
                abre(semCl, "");
                ctx.estilo = "linha";
                continue;
            }
            if (ctx.kind === "especifico" && (ctx.cargo == null || cargos.size && mesmoCargo(chaveCargo(l)) && mesmoCargo(chaveCargo(l)) !== ctx.cargo) && !/[.;,:]$/.test(l) && l.length <= 60 && l.split(/\s+/).length <= 8 && !/^\d/.test(l) && /^[A-ZÀ-Ý]/.test(l) && (i === 0 || FIM_FRASE.test(prev) || RE_GRUPO.test(prev)) && next && !MAIUSC(next) && /^[A-ZÀ-Ý]/.test(next) && !modoLinha) {
                ctx.cargoModo = "explicito";
                setCargo(l);
                continue;
            }
            if (!cur && ctx.cargo && ctx.kind === "especifico") abre("Conhecimentos Específicos", "");
            if (cur) cur.corpo.push(l); else if (mats.length) ignoradas.push(l);
        }
        const RE_INLINE = /(^|[.;]\s+)((?:[A-ZÀ-Ý][A-ZÀ-Ý0-9,/()–-]*\s+){0,15}[A-ZÀ-Ý][A-ZÀ-Ý0-9()/–-]{2,}):\s+(?=[A-Za-zÀ-ÿ0-9"“(])/g;
        const expandidas = [];
        mats.forEach((mt => {
            const texto = mt.corpo.join(" ").replace(/\s+/g, " ").replace(/\s*\(\*\)[\s\S]*$/, "");
            if (!mt.viaDoisPontos && mt.nome !== "Conhecimentos Específicos") {
                expandidas.push(Object.assign(mt, {
                    texto: texto
                }));
                return;
            }
            const cortes = [];
            let mm;
            RE_INLINE.lastIndex = 0;
            while (mm = RE_INLINE.exec(texto)) {
                const nome = mm[2].trim(), ini = mm.index + mm[1].length;
                if (!MAIUSC(nome) || nome.replace(/[^A-Za-zÀ-ÿ]/g, "").length < 6 || new RegExp("^" + ROMANO + "\\s").test(nome) || NAO_TITULO.test(nome) || GENERICO.test(nome)) continue;
                if (/\d+(?:\.\d+)*\.?\s*$/.test(texto.slice(Math.max(0, ini - 8), ini))) continue;
                cortes.push({
                    nome: nome,
                    ini: ini,
                    corpo: RE_INLINE.lastIndex
                });
            }
            if (!cortes.length) {
                expandidas.push(Object.assign(mt, {
                    texto: texto
                }));
                return;
            }
            const antes = texto.slice(0, cortes[0].ini).trim();
            if (antes.length > 20) expandidas.push(Object.assign({}, mt, {
                texto: antes
            }));
            cortes.forEach(((c, k) => expandidas.push(Object.assign({}, mt, filtroDoNome(c.nome), {
                maiusc: true,
                nome: bonito(filtroDoNome(c.nome).nome),
                texto: texto.slice(c.corpo, k + 1 < cortes.length ? cortes[k + 1].ini : texto.length)
            }))));
        }));
        const materias = [];
        expandidas.forEach((mt => {
            const blocos = blocosDoCorpo(mt.texto).filter((b => b.itens.length));
            if (!blocos.length) return;
            materias.push({
                maiusc: mt.maiusc,
                nome: mt.nome,
                grupo: mt.grupo,
                nivel: mt.nivel,
                cargo: mt.cargo,
                cargos: mt.cargos,
                somente: mt.somente || null,
                exceto: mt.exceto || null,
                sintetico: blocos.every((b => b.sintetico)),
                blocos: blocos
            });
        }));
        return {
            estilo: modoLinha ? "regiao-linhas" : "regiao-dois-pontos",
            materias: materias,
            cargos: [ ...cargos.values() ],
            ignoradas: ignoradas
        };
    }
    function lerC(linhas) {
        let L = linhas.map((l => limpa(l))).filter(Boolean);
        const chave = l => norm(l).replace(/\d+/g, "#"), cont = new Map;
        L.forEach((l => cont.set(chave(l), (cont.get(chave(l)) || 0) + 1)));
        L = L.filter((l => !(l.length < 140 && (/\bCEP:?\s*\d{2}\.?\d{3}-?\d{3}\b/.test(l) || cont.get(chave(l)) >= 2 && /^(?:Executora|Execu[çc][ãa]o|Realiza[çc][ãa]o|Organiza[çc][ãa]o)\s*:/i.test(l)))));
        L = L.filter((l => !(cont.get(chave(l)) >= 3 && l.length < 110 && (/\b0800\b|\(\d{2}\)\s*\d{4}|\b\d{4}-\d{4}\b|@|\bsite\b|\bfones?\b|\bCEP\b/i.test(l) || /[·|]|www\.|^p[áa]gina\s+\d+/i.test(l) || MAIUSC(l) && /\d/.test(l) && cont.get(chave(l)) >= 5 && !RE_CARGO.test(l)) && !RE_NIVEL.test(l) && !RE_GRUPO.test(l) && !RE_CP.test(l))));
        let melhor = null;
        achaRegioes(L).forEach((rg => {
            const r = lerRegiao(L.slice(rg.ini, rg.fim));
            const conhecidas = new Set(r.materias.filter((m => PALAVRA_MATERIA.test(m.nome))).map((m => norm(m.nome))));
            const n = r.materias.reduce(((a, m) => a + m.blocos.reduce(((b, x) => b + x.itens.length), 0) * (PALAVRA_MATERIA.test(m.nome) || NOME_CONHECIMENTOS.test(m.nome) ? 1 : m.maiusc ? .8 : m.cargo ? .6 : .3)), 0) + conhecidas.size * 25;
            if (!melhor || n > melhor.n) melhor = {
                r: r,
                n: n,
                rg: rg
            };
        }));
        if (!melhor) {
            const r = lerRegiao(L), conhecidas = new Set(r.materias.filter((m => PALAVRA_MATERIA.test(m.nome))).map((m => norm(m.nome))));
            if (conhecidas.size >= 3) return Object.assign(r, {
                inteiro: true
            });
            return {
                estilo: "regiao",
                materias: [],
                cargos: [],
                semRegiao: true
            };
        }
        return melhor.r;
    }
    const RE_MARCADOR = /^(?:[•●▪■◦○‣∙·➢➤►▸▶✓✔☐□❑❏*]\s*|[–—-]\s+)(?=\S)/;
    const RE_NUM_TITULO = /^\d{1,2}\s*[.)–-]?\s+(?=[A-ZÀ-Ý])/;
    const RE_PARTE = /^(?:PARTE|BLOCO|M[ÓO]DULO|EIXO|UNIDADE)\s+(?:[IVX]{1,4}|\d{1,2})\b\s*[-–—:.]?\s*(.*)$/i;
    const RE_PARADA = /^(?:ANEXOS?|AP[ÊE]NDICES?|REFER[ÊE]NCIAS|BIBLIOGRAFIA|FONTES|GLOSS[ÁA]RIO|CRONOGRAMA|CHECKLIST)\b/i;
    const RE_APOIO = /^(?:refer[êe]ncias?|fontes?|bibliografia|leituras?|dicas?|observa[çc]|obs\b|foco|m[ée]todo|como\s|aten[çc][ãa]o|importante|links?|materiais?|legenda|regra\s+de\s+ouro|aviso)/i;
    const CONHECIDA = /\b(?:direitos?|legisla[çc][ãa]o|legisla[çc][õo]es|no[çc][õo]es|conhecimentos|l[íi]ngua|portugu[êe]s|ingl[êe]s|espanhol|matem[áa]tica|racioc[íi]nio|l[óo]gic[ao]|inform[áa]tica|atualidades|[ée]tica|administra[çc][ãa]o|contabilidade|economia|estat[íi]stica|probabilidade|geografia|geopol[íi]tica|hist[óo]ria|biologia|qu[íi]mica|f[íi]sica|criminologia|criminal[íi]stica|medicina|enfermagem|arquivologia|reda[çc][ãa]o|discursiva|s[úu]mulas|jurisprud[êe]ncia|auditoria|finan[çc]as|financeira|or[çc]amento|banc[áa]rios?|vendas|negocia[çc][ãa]o|atendimento|tecnologia|programa[çc][ãa]o|seguran[çc]a|tr[âa]nsito|pedagogia|did[áa]tica|educa[çc][ãa]o|psicologia|sociologia|filosofia|sa[úu]de|engenharia|gest[ãa]o|regimento|estatuto|realidade)\b/i;
    const conhecida = nome => PALAVRA_MATERIA.test(nome) || NOME_CONHECIMENTOS.test(nome) || CONHECIDA.test(nome);
    const RE_LIXO = /^(?:anexos?\b|ap[êe]ndices?\b|(?:parte|cap[íi]tulo|se[çc][ãa]o|bloco|m[óo]dulo|item)\s+(?:[ivx]{1,4}|\d+)\b|edital\b|cronogram?a\b|apresenta[çc][ãa]o\b|sum[áa]rio\b|[íi]ndice\b|introdu[çc][ãa]o$|quadro\b|tabela\b|notas?\b|fontes?\b|refer[êe]ncias?\b|bibliografia\b|checklist\b|documento\b|estrutura\s+d[oa]s?\s+(?:item|edital|documento|prova)|d[ao]s?\s|disposi[çc][õo]es\b|inscri[çc][õo]es\b|observa[çc]|avisos?\b|aten[çc][ãa]o\b|importante\b|como\s|m[ée]todo\b|data\s|uf\s|consolidado\b|mapa\s+do\b|legenda\b|vice-presid|presid[êe]ncia\b|diretoria\b|segue\b)/i;
    const RE_UF = /(?:^|[\s,])-\s?(?:ac|al|ap|am|ba|ce|df|es|go|ma|mt|ms|mg|pa|pb|pr|pe|pi|rj|rn|rs|ro|rr|sc|sp|se|to)\b/i;
    function suspeitaDe(nome, nItens, total) {
        const n = limpa(nome);
        if (/[\[\]]/.test(n)) return {
            nivel: 2,
            motivo: "é uma etiqueta, não um título"
        };
        if (/^[-–—•]/.test(n)) return {
            nivel: 2,
            motivo: "é um item de lista ou de capítulo do edital"
        };
        if (RE_UF.test(n) && !conhecida(n.replace(RE_UF, ""))) return {
            nivel: 2,
            motivo: "parece lista de cidades"
        };
        if (RE_LIXO.test(n)) return {
            nivel: 2,
            motivo: "parece parte do documento, não uma matéria"
        };
        const sabe = conhecida(n);
        if (!sabe && /^[a-zà-ÿ]/.test(n)) return {
            nivel: 2,
            motivo: "não parece título de matéria"
        };
        if (!sabe && nItens <= 1 && total >= 5) return {
            nivel: 2,
            motivo: "tem só um assunto e o nome não parece de matéria"
        };
        if (/\s(?:de|da|do|das|dos|e|ou|a|o|em|para|com|até|por|no|na|ao)$/i.test(n)) return {
            nivel: 1,
            motivo: "o título parece cortado"
        };
        if (!sabe && (n.length > 80 || n.split(" ").length > 11 || (n.match(/,/g) || []).length >= 3)) return {
            nivel: 1,
            motivo: "o título é comprido demais para uma matéria"
        };
        if (!sabe && /\d{2,}/.test(n)) return {
            nivel: 1,
            motivo: "o título tem números"
        };
        if (!sabe && nItens <= 2) return {
            nivel: 1,
            motivo: "tem poucos assuntos"
        };
        return null;
    }
    function porteiro(res) {
        const total = res.materias.length, ficam = [], fora = [];
        res.materias.forEach((m => {
            const n = m.blocos.reduce(((a, b) => a + b.itens.length), 0);
            const s = suspeitaDe(m.nome, n, total);
            m.suspeita = s;
            (s && s.nivel === 2 ? fora : ficam).push(m);
        }));
        res.materias = ficam;
        res.descartadas = fora;
        return res;
    }
    function semEtiquetas(texto) {
        return String(texto).replace(/[\uF0B7\uF0A7\uF0D8\uF0FC\uF076\uF0A8]/g, "•").replace(/[\uE000-\uF8FF\u200B-\u200F\u2060\uFEFF\u00AD]/g, "").replace(/\[[^\]\[a-zà-ÿ]{2,90}\]/g, (x => {
            if (!/[A-ZÀ-Ý]{3}/.test(x)) return x;
            const mt = x.match(/^\[\s*(NOVO|ATUALIZADO)\s*\]$/);
            return mt ? " " + mt[1] : /\n/.test(x) ? "\n" : " ";
        }));
    }
    function lerD(linhas) {
        const L = linhas.map((l => limpa(l))).filter(Boolean);
        const eB = l => RE_MARCADOR.test(l);
        const forte = l => !eB(l) && l.length <= 100 && !/[.;,]$/.test(l) && (RE_PARTE.test(l) || RE_PARADA.test(l) || MAIUSC(l.replace(RE_NUM_TITULO, "")) && l.replace(/[^A-Za-zÀ-ÿ]/g, "").length >= 4);
        let simples = 0, pont = 0;
        L.forEach(((l, i) => {
            if (eB(l) && L[i + 1] && eB(L[i + 1])) {
                simples++;
                if (/[.;]$/.test(l)) pont++;
            }
        }));
        const pontuado = simples >= 4 && pont >= simples * .6;
        const toks = [];
        let aberto = null;
        L.forEach((l => {
            if (eB(l)) {
                aberto = {
                    b: true,
                    t: l.replace(RE_MARCADOR, "")
                };
                toks.push(aberto);
                return;
            }
            if (aberto && !/[.;!?]$/.test(aberto.t) && !forte(l) && (/^[a-zà-ÿ(]/.test(l) || pontuado)) {
                aberto.t += " " + l;
                return;
            }
            aberto = null;
            toks.push({
                b: false,
                t: l
            });
        }));
        const titulavel = t => t.length <= 110 && t.split(" ").length <= 16 && !/[.;,!?]$/.test(t) && /[A-Za-zÀ-ÿ]{3}/.test(t) && !/^[a-zà-ÿ]/.test(t);
        const forma = t => {
            const num = RE_NUM_TITULO.test(t), resto = t.replace(RE_NUM_TITULO, "");
            return (num ? "num" : "") + (MAIUSC(resto) ? "caps" : "titulo");
        };
        const nomeDe = t => bonito(t.replace(RE_NUM_TITULO, "").replace(/\s*:\s*$/, ""));
        const hs = [];
        toks.forEach(((tk, k) => {
            if (tk.b || !toks[k + 1]) return;
            let alvo = -1;
            if (toks[k + 1].b && titulavel(tk.t)) alvo = k; else if (forte(tk.t) && !RE_PARTE.test(tk.t)) {
                for (let j = k + 1; j <= k + 4 && j < toks.length; j++) {
                    if (toks[j].b) {
                        alvo = k;
                        break;
                    }
                    if (forte(toks[j].t)) break;
                }
            }
            if (alvo < 0 || RE_PARTE.test(tk.t) || RE_PARADA.test(tk.t)) return;
            hs.push({
                k: k,
                forma: forma(tk.t),
                nome: nomeDe(tk.t)
            });
        }));
        const ordem = [ "numcaps", "caps", "numtitulo", "titulo" ], nota = {};
        hs.forEach((h => {
            if (conhecida(h.nome) && !RE_LIXO.test(h.nome) && !RE_APOIO.test(h.nome)) nota[h.forma] = (nota[h.forma] || 0) + 1;
        }));
        const melhor = ordem.slice().sort(((a, b) => (nota[b] || 0) - (nota[a] || 0)))[0];
        if (!melhor || (nota[melhor] || 0) < 2) return {
            estilo: "marcadores",
            materias: []
        };
        const eMateria = new Map;
        hs.forEach((h => {
            if (h.forma === melhor) eMateria.set(h.k, h);
        }));
        const eSub = new Map;
        hs.forEach((h => {
            if (h.forma !== melhor && toks[h.k + 1] && toks[h.k + 1].b) eSub.set(h.k, h);
        }));
        const mats = [];
        let cur = null, grupo = null, pai = null, pula = false, n = 0;
        const item = (num, texto) => ({
            num: num,
            texto: texto.replace(/[.;:]\s*$/, ""),
            tag: null,
            aviso: false
        });
        toks.forEach(((tk, k) => {
            if (!tk.b) {
                const p = tk.t.match(RE_PARTE);
                if (p && forte(tk.t)) {
                    grupo = p[1] ? bonito(p[1]) : null;
                    cur = null;
                    return;
                }
                if (RE_PARADA.test(tk.t) && forte(tk.t)) {
                    cur = null;
                    grupo = null;
                    return;
                }
                if (eMateria.has(k)) {
                    cur = {
                        nome: eMateria.get(k).nome,
                        grupo: grupo,
                        blocos: [ {
                            rom: null,
                            nome: null,
                            itens: [],
                            avisos: []
                        } ]
                    };
                    mats.push(cur);
                    pai = null;
                    pula = false;
                    n = 0;
                    return;
                }
                if (cur && eSub.has(k)) {
                    const nome = eSub.get(k).nome;
                    pula = RE_APOIO.test(nome);
                    if (pula) {
                        pai = null;
                        return;
                    }
                    pai = {
                        num: String(++n),
                        sub: 0
                    };
                    cur.blocos[0].itens.push(item(pai.num, nome));
                    return;
                }
                if (cur && pai && !pula) pai = null;
                return;
            }
            if (!cur || pula || tk.t.length < 3) return;
            const its = cur.blocos[0].itens;
            if (pai) its.push(item(pai.num + "." + ++pai.sub, tk.t)); else its.push(item(String(++n), tk.t));
        }));
        return {
            estilo: "marcadores",
            materias: mats.filter((m => m.blocos[0].itens.length))
        };
    }
    function paraCargo(res, chave) {
        const c = (res.cargos || []).find((x => x.key === chave));
        const pai = nome => {
            const m = String(nome).match(/^(?:.*?\s+-\s+)?(.+?)\s+-\s+para\s+todas\s+as\s+especialidades$/i);
            return m ? norm(m[1]).replace(/[^a-z0-9]+/g, " ").trim() : null;
        };
        const meu = c ? norm(c.nome).replace(/[^a-z0-9]+/g, " ").trim() : "";
        const materias = res.materias.filter((m => {
            if (c && m.somente && !m.somente.some((r => refCasa(r, c.nome)))) return false;
            if (c && m.exceto && m.exceto.some((r => refCasa(r, c.nome)))) return false;
            if (!m.cargo && !(m.cargos && m.cargos.length)) return !m.nivel || !c || !c.nivel || m.nivel === c.nivel;
            if (m.cargos && m.cargos.some((n => chaveCargo(n) === chave))) return true;
            if (m.cargo && chaveCargo(m.cargo) === chave) return true;
            const p = m.cargo ? pai(m.cargo) : null;
            return !!(p && meu && (meu === p || meu.startsWith(p + " ")));
        }));
        return Object.assign({}, res, {
            materias: materias,
            cargoEscolhido: c || null
        });
    }
    function resumir(res) {
        const av = [];
        let nMat = 0, nBlocos = 0, nItens = 0, nTags = 0;
        res.materias.forEach((m => {
            nMat++;
            let tot = 0;
            m.blocos.forEach((b => {
                if (b.rom) nBlocos++;
                tot += b.itens.length;
                b.itens.forEach((x => {
                    if (x.tag) nTags++;
                }));
                b.avisos.forEach((a => av.push(m.nome + ": " + a)));
            }));
            m.lidos = tot;
            nItens += tot;
            m.curto = curto(m.nome);
            if (m.declarado != null && m.declarado !== tot) av.push(m.nome + ": o edital diz " + m.declarado + " assuntos e li " + tot + ".");
        }));
        res.relatorio = {
            estilo: res.estilo,
            materias: nMat,
            blocos: nBlocos,
            itens: nItens,
            marcados: nTags,
            avisos: av
        };
        return res;
    }
    function ler(entrada) {
        const linhas = semEtiquetas(Array.isArray(entrada) ? entrada.join("\n") : String(entrada)).split(/\r?\n/).filter((l => l.trim()));
        const r = lerSemPorteiro(linhas), d = resumir(lerD(linhas));
        const sint = r.materias.reduce(((n, m) => n + (m.sintetico ? m.blocos.reduce(((x, b) => x + b.itens.length), 0) : 0)), 0);
        const usaD = d.materias.length >= 2 && d.relatorio.itens >= 15 && (!r.relatorio.itens || sint >= r.relatorio.itens * .6 && d.relatorio.itens >= r.relatorio.itens * .3);
        const fim = usaD ? Object.assign(d, {
            cargos: [],
            semRegiao: false
        }) : r;
        porteiro(fim);
        const avisos = fim.relatorio.avisos;
        resumir(fim);
        fim.relatorio.avisos = usaD ? [] : avisos.filter((a => !fim.descartadas.some((m => a.startsWith(m.nome + ": ")))));
        if (fim.descartadas.length) {
            fim.relatorio.avisos = fim.relatorio.avisos.filter((a => !/^Achei poucas matérias|^Não achei matérias com itens/.test(a)));
            fim.relatorio.avisos.unshift("Deixei de fora " + (fim.descartadas.length === 1 ? "1 trecho que não parecia matéria" : fim.descartadas.length + " trechos que não pareciam matéria") + " (dá para incluir de volta na lista abaixo).");
            if (!fim.materias.length) fim.relatorio.avisos.push("Não sobrou nenhuma matéria confiável. Confira os trechos deixados de fora ou cole o conteúdo programático em texto.");
        }
        return fim;
    }
    function lerSemPorteiro(linhas) {
        const a = resumir(lerA(linhas)), b = resumir(lerB(linhas)), c = resumir(lerC(linhas));
        const sa = a.relatorio.itens, sb = b.relatorio.itens;
        const ruimDe = x => {
            const its = x.materias.reduce(((acc, m) => acc.concat(...m.blocos.map((bl => bl.itens)))), []), media = its.reduce(((acc, y) => acc + y.texto.length), 0) / Math.max(1, its.length);
            return x.materias.length < 4 || media > 180 || x.materias.some((m => /^(?:edital|dos?|das?|anexo|abertura|a$)/i.test(m.nome)));
        };
        const antigo = a.relatorio.materias >= 3 && sa >= 30 ? a : sb > 0 ? b : a;
        const usaC = !c.semRegiao && c.relatorio.materias >= 2 && c.relatorio.itens >= 20 && (!c.inteiro || ruimDe(antigo));
        const r = usaC ? c : antigo;
        r.alternativa = (r === a ? b : r === b ? a : a).relatorio;
        r.semRegiao = !!c.semRegiao || !!c.inteiro && !usaC;
        r.cargos = r.cargos || [];
        if (r.semRegiao && !usaC) {
            const its = r.materias.reduce(((a, m) => a.concat(...m.blocos.map((bl => bl.itens)))), []), media = its.reduce(((a, x) => a + x.texto.length), 0) / Math.max(1, its.length);
            const ruim = r.materias.length < 4 || media > 180 || r.materias.some((m => /^(?:edital|dos?|das?|anexo|abertura|a$)/i.test(m.nome)));
            if (ruim && media > 180) r.materias = [];
            if (ruim) {
                r.materias = r.materias.filter((m => !/^(?:edital|dos?|das?|anexo|abertura|a$)/i.test(m.nome)));
                resumir(r);
            }
            if (ruim) r.relatorio.avisos.unshift('Não achei o trecho "Conteúdo programático" neste arquivo. Se o edital traz o conteúdo em um anexo separado (muitas bancas fazem isso), abra o arquivo desse anexo.');
        }
        if (!r.materias.length) r.relatorio.avisos.push('Não achei matérias com itens numerados. Se o edital não numera os assuntos, coloque "# Nome da matéria" e os itens à mão.'); else if (r.materias.length < 4) r.relatorio.avisos.push("Achei poucas matérias (" + r.materias.length + "). Confira se o PDF tem o conteúdo programático completo.");
        return r;
    }
    function paraTexto(res) {
        const out = [];
        res.materias.forEach((m => {
            out.push("# " + m.nome + (m.peso ? " | peso " + m.peso : "") + (m.grupo ? " | grupo " + m.grupo : ""));
            m.blocos.forEach((b => {
                if (b.rom) out.push("## " + b.rom + " " + b.nome);
                b.itens.forEach((x => out.push(x.num + " " + x.texto + (x.tag ? " " + x.tag.toUpperCase() : ""))));
            }));
            out.push("");
        }));
        return out.join("\n").trim();
    }
    const api = {
        ler: ler,
        paraTexto: paraTexto,
        itensDe: itensDe,
        curto: curto,
        bonito: bonito,
        lerA: lerA,
        lerB: lerB,
        lerC: lerC,
        lerD: lerD,
        suspeitaDe: suspeitaDe,
        conhecida: conhecida,
        paraCargo: paraCargo,
        norm: norm
    };
    if (typeof module !== "undefined" && module.exports) module.exports = api; else raiz.EditalEngine = api;
})(typeof window !== "undefined" ? window : globalThis);