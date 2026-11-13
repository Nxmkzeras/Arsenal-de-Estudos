(function() {
    "use strict";
    const cv = document.getElementById("tela"), cx = cv.getContext("2d"), barra = document.getElementById("barra"), aviso = document.getElementById("aviso"), entrada = document.getElementById("entrada");
    const api = window.desenhoApi || {
        esconder() {},
        mouse() {},
        capturar: async () => ({
            ok: false,
            erro: "sem casca"
        }),
        abrirPasta() {},
        aoMostrar() {}
    };
    const COR = [ "#ef4444", "#f59e0b", "#facc15", "#22c55e", "#3b82f6", "#a855f7", "#111827", "#ffffff" ];
    const est = {
        ferr: "lapis",
        cor: "#ef4444",
        larg: 4,
        itens: [],
        hist: [],
        refaz: [],
        atual: null,
        passa: false
    };
    let DPR = 1;
    function ajusta() {
        DPR = window.devicePixelRatio || 1;
        cv.width = Math.round(innerWidth * DPR);
        cv.height = Math.round(innerHeight * DPR);
        cx.setTransform(DPR, 0, 0, DPR, 0, 0);
        redesenha();
    }
    window.addEventListener("resize", ajusta);
    function seta(c, a, b, larg) {
        c.beginPath();
        c.moveTo(a[0], a[1]);
        c.lineTo(b[0], b[1]);
        c.stroke();
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), t = Math.max(12, larg * 4);
        c.beginPath();
        c.moveTo(b[0], b[1]);
        c.lineTo(b[0] - t * Math.cos(ang - .45), b[1] - t * Math.sin(ang - .45));
        c.moveTo(b[0], b[1]);
        c.lineTo(b[0] - t * Math.cos(ang + .45), b[1] - t * Math.sin(ang + .45));
        c.stroke();
    }
    function desenha(c, it) {
        c.save();
        c.lineCap = "round";
        c.lineJoin = "round";
        c.strokeStyle = it.cor;
        c.fillStyle = it.cor;
        c.lineWidth = it.larg;
        if (it.t === "traco") {
            if (it.marca) {
                c.globalAlpha = .36;
                c.lineWidth = it.larg * 4;
                c.lineCap = "butt";
            }
            c.beginPath();
            it.pts.forEach(((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
            if (it.pts.length === 1) c.lineTo(it.pts[0][0] + .01, it.pts[0][1]);
            c.stroke();
        } else if (it.t === "forma") {
            const a = it.a, b = it.b;
            if (it.tipo === "linha") {
                c.beginPath();
                c.moveTo(a[0], a[1]);
                c.lineTo(b[0], b[1]);
                c.stroke();
            } else if (it.tipo === "seta") seta(c, a, b, it.larg); else if (it.tipo === "retangulo") c.strokeRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); else if (it.tipo === "circulo") {
                c.beginPath();
                c.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2, Math.abs(b[1] - a[1]) / 2, 0, 0, Math.PI * 2);
                c.stroke();
            }
        } else if (it.t === "texto") {
            c.font = "700 " + it.tam + 'px "Segoe UI", sans-serif';
            c.textBaseline = "top";
            it.texto.split("\n").forEach(((l, i) => {
                c.lineWidth = 4;
                c.strokeStyle = it.cor === "#ffffff" ? "#111827" : "#ffffff";
                c.strokeText(l, it.x, it.y + i * it.tam * 1.2);
                c.fillText(l, it.x, it.y + i * it.tam * 1.2);
            }));
        }
        c.restore();
    }
    function redesenha() {
        cx.clearRect(0, 0, innerWidth, innerHeight);
        est.itens.forEach((it => desenha(cx, it)));
        if (est.atual) desenha(cx, est.atual);
    }
    const dist = (p, a, b) => {
        const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
        let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
    };
    function acerta(it, p, r) {
        if (it.t === "traco") {
            const m = (it.marca ? it.larg * 2 : it.larg / 2) + r;
            for (let i = 0; i < it.pts.length; i++) {
                if (i && dist(p, it.pts[i - 1], it.pts[i]) <= m) return true;
                if (!i && Math.hypot(p[0] - it.pts[0][0], p[1] - it.pts[0][1]) <= m) return true;
            }
            return false;
        }
        if (it.t === "forma") {
            if (it.tipo === "linha" || it.tipo === "seta") return dist(p, it.a, it.b) <= it.larg + r;
            const x0 = Math.min(it.a[0], it.b[0]), x1 = Math.max(it.a[0], it.b[0]), y0 = Math.min(it.a[1], it.b[1]), y1 = Math.max(it.a[1], it.b[1]);
            if (it.tipo === "retangulo") return [ [ x0, y0, x1, y0 ], [ x1, y0, x1, y1 ], [ x1, y1, x0, y1 ], [ x0, y1, x0, y0 ] ].some((s => dist(p, [ s[0], s[1] ], [ s[2], s[3] ]) <= it.larg + r));
            const rx = (x1 - x0) / 2 || 1, ry = (y1 - y0) / 2 || 1, k = Math.hypot((p[0] - (x0 + rx)) / rx, (p[1] - (y0 + ry)) / ry);
            return Math.abs(k - 1) * Math.min(rx, ry) <= it.larg + r;
        }
        const linhas = it.texto.split("\n");
        cx.font = "700 " + it.tam + 'px "Segoe UI"';
        const w = Math.max.apply(null, linhas.map((l => cx.measureText(l).width)));
        return p[0] >= it.x - r && p[0] <= it.x + w + r && p[1] >= it.y - r && p[1] <= it.y + linhas.length * it.tam * 1.2 + r;
    }
    function apaga(p) {
        const caem = est.itens.filter((it => acerta(it, p, 10)));
        if (!caem.length) return;
        est.itens = est.itens.filter((it => caem.indexOf(it) < 0));
        est.hist.push({
            op: "del",
            itens: caem
        });
        est.refaz = [];
        redesenha();
    }
    const pos = e => [ e.clientX, e.clientY ];
    cv.addEventListener("pointerdown", (e => {
        if (e.button !== 0 || est.passa) return;
        try {
            cv.setPointerCapture(e.pointerId);
        } catch (er) {}
        const p = pos(e);
        if (est.ferr === "texto") {
            abreTexto(p);
            return;
        }
        if (est.ferr === "borracha") {
            est.apagando = true;
            apaga(p);
            return;
        }
        if (est.ferr === "lapis" || est.ferr === "marca") est.atual = {
            t: "traco",
            cor: est.cor,
            larg: est.larg,
            marca: est.ferr === "marca",
            pts: [ p ]
        }; else est.atual = {
            t: "forma",
            tipo: est.ferr,
            cor: est.cor,
            larg: est.larg,
            a: p,
            b: p
        };
        redesenha();
    }));
    cv.addEventListener("pointermove", (e => {
        const p = pos(e);
        if (est.apagando) {
            apaga(p);
            return;
        }
        if (!est.atual) return;
        if (est.atual.t === "traco") {
            const u = est.atual.pts[est.atual.pts.length - 1];
            if (Math.hypot(p[0] - u[0], p[1] - u[1]) >= 1.5) est.atual.pts.push(p);
        } else est.atual.b = p;
        redesenha();
    }));
    const solta = () => {
        est.apagando = false;
        if (!est.atual) return;
        const it = est.atual;
        est.atual = null;
        const vazio = it.t === "forma" && Math.hypot(it.b[0] - it.a[0], it.b[1] - it.a[1]) < 3;
        if (!vazio) {
            est.itens.push(it);
            est.hist.push({
                op: "add",
                item: it
            });
            est.refaz = [];
        }
        redesenha();
    };
    cv.addEventListener("pointerup", solta);
    cv.addEventListener("pointercancel", solta);
    let pendente = null;
    function abreTexto(p) {
        fechaTexto(true);
        pendente = p;
        entrada.style.display = "block";
        entrada.style.left = p[0] + "px";
        entrada.style.top = p[1] + "px";
        entrada.style.color = est.cor === "#ffffff" ? "#111827" : est.cor;
        entrada.style.fontSize = 14 + est.larg * 3 + "px";
        entrada.textContent = "";
        setTimeout((() => entrada.focus()), 20);
    }
    function fechaTexto(grava) {
        if (!pendente) {
            entrada.style.display = "none";
            return;
        }
        const t = entrada.innerText.replace(/\s+$/, "");
        if (grava && t) {
            const it = {
                t: "texto",
                cor: est.cor,
                x: pendente[0],
                y: pendente[1],
                tam: 14 + est.larg * 3,
                texto: t
            };
            est.itens.push(it);
            est.hist.push({
                op: "add",
                item: it
            });
            est.refaz = [];
            redesenha();
        }
        pendente = null;
        entrada.style.display = "none";
        entrada.textContent = "";
    }
    entrada.addEventListener("keydown", (e => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            fechaTexto(true);
        } else if (e.key === "Escape") {
            e.stopPropagation();
            fechaTexto(false);
        }
    }));
    entrada.addEventListener("blur", (() => fechaTexto(true)));
    function desfaz() {
        const o = est.hist.pop();
        if (!o) return;
        if (o.op === "add") est.itens = est.itens.filter((x => x !== o.item)); else est.itens = est.itens.concat(o.itens);
        est.refaz.push(o);
        redesenha();
    }
    function refazer() {
        const o = est.refaz.pop();
        if (!o) return;
        if (o.op === "add") est.itens.push(o.item); else est.itens = est.itens.filter((x => o.itens.indexOf(x) < 0));
        est.hist.push(o);
        redesenha();
    }
    function limpa() {
        if (!est.itens.length) return;
        est.hist.push({
            op: "del",
            itens: est.itens.slice()
        });
        est.itens = [];
        est.refaz = [];
        redesenha();
    }
    function dizer(txt, botao) {
        aviso.innerHTML = "";
        aviso.appendChild(document.createTextNode(txt));
        if (botao) {
            const b = document.createElement("button");
            b.textContent = botao.rot;
            b.onclick = botao.fn;
            aviso.appendChild(b);
        }
        aviso.style.display = "flex";
        clearTimeout(dizer.t);
        dizer.t = setTimeout((() => {
            aviso.style.display = "none";
        }), 6e3);
    }
    async function capturar() {
        fechaTexto(true);
        barra.style.visibility = "hidden";
        aviso.style.display = "none";
        document.getElementById("borda").style.visibility = "hidden";
        await new Promise((r => requestAnimationFrame((() => requestAnimationFrame(r)))));
        const r = await api.capturar();
        barra.style.visibility = "";
        document.getElementById("borda").style.visibility = "";
        if (r && r.ok) dizer("Imagem salva em Imagens › Arsenal de Estudos" + (r.copiado ? " e copiada (cole num flashcard com Ctrl+V)" : ""), {
            rot: "Abrir a pasta",
            fn: () => api.abrirPasta()
        }); else dizer("Não consegui capturar: " + (r && r.erro || "erro"));
        return r;
    }
    function passa(v) {
        est.passa = v;
        document.body.classList.toggle("passa", v);
        api.mouse(v);
        mostraBarra();
    }
    const IC = {
        lapis: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
        marca: '<path d="M9 11l-6 6v3h9l3-3"/><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
        linha: '<line x1="5" y1="19" x2="19" y2="5"/>',
        seta: '<line x1="5" y1="19" x2="19" y2="5"/><polyline points="9 5 19 5 19 15"/>',
        retangulo: '<rect x="4" y="6" width="16" height="12" rx="1"/>',
        circulo: '<circle cx="12" cy="12" r="8"/>',
        texto: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
        borracha: '<path d="M20 20H9l-5-5a2 2 0 0 1 0-2.8L13 3a2 2 0 0 1 2.8 0l5 5a2 2 0 0 1 0 2.8L11 20"/>',
        desfazer: '<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
        refazer: '<polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/>',
        limpar: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
        mouse: '<path d="M5 3l14 7-6 2-2 6z"/>',
        captura: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
        fechar: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
    };
    const svg = k => '<svg viewBox="0 0 24 24" aria-hidden="true">' + IC[k] + "</svg>";
    const NOMES = {
        lapis: "Lápis (P)",
        marca: "Marca-texto (H)",
        linha: "Linha (L)",
        seta: "Seta (A)",
        retangulo: "Retângulo (R)",
        circulo: "Círculo (O)",
        texto: "Texto (T)",
        borracha: "Borracha (E)"
    };
    function botao(k, titulo, fn, extra) {
        const b = document.createElement("button");
        b.type = "button";
        b.innerHTML = svg(k);
        b.title = titulo;
        b.setAttribute("aria-label", titulo);
        b.onclick = fn;
        if (extra) b.className = extra;
        return b;
    }
    const sep = () => {
        const s = document.createElement("i");
        s.className = "sep";
        return s;
    };
    function mostraBarra() {
        barra.innerHTML = "";
        Object.keys(NOMES).forEach((k => barra.appendChild(botao(k, NOMES[k], (() => {
            fechaTexto(true);
            est.ferr = k;
            if (est.passa) passa(false);
            mostraBarra();
        }), est.ferr === k && !est.passa ? "sel" : ""))));
        barra.appendChild(sep());
        COR.forEach((c => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "cor" + (est.cor === c ? " sel" : "");
            b.style.background = c;
            b.title = "Cor " + c;
            b.setAttribute("aria-label", "Cor " + c);
            b.onclick = () => {
                est.cor = c;
                mostraBarra();
            };
            barra.appendChild(b);
        }));
        [ [ 2, "fino" ], [ 4, "médio" ], [ 8, "grosso" ] ].forEach((([n, t]) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "tam" + (est.larg === n ? " sel" : "");
            b.title = "Traço " + t;
            b.setAttribute("aria-label", "Traço " + t);
            b.innerHTML = '<i style="width:' + (n + 4) + "px;height:" + (n + 4) + 'px"></i>';
            b.onclick = () => {
                est.larg = n;
                mostraBarra();
            };
            barra.appendChild(b);
        }));
        barra.appendChild(sep());
        barra.appendChild(botao("desfazer", "Desfazer (Ctrl+Z)", desfaz));
        barra.appendChild(botao("refazer", "Refazer (Ctrl+Y)", refazer));
        barra.appendChild(botao("limpar", "Limpar tudo", limpa));
        barra.appendChild(sep());
        barra.appendChild(botao("mouse", "Mouse: deixa clicar nos outros programas (os desenhos ficam)", (() => passa(!est.passa)), est.passa ? "sel" : ""));
        barra.appendChild(botao("captura", "Capturar a tela em PNG, com os desenhos", capturar));
        barra.appendChild(botao("fechar", "Esconder (Esc ou Alt+Shift+D); os desenhos ficam", (() => api.esconder())));
    }
    barra.addEventListener("pointerenter", (() => {
        if (est.passa) api.mouse(false);
    }));
    barra.addEventListener("pointerleave", (() => {
        if (est.passa) api.mouse(true);
    }));
    document.addEventListener("keydown", (e => {
        if (pendente) return;
        if (e.key === "Escape") {
            api.esconder();
            return;
        }
        if (e.ctrlKey && /^z$/i.test(e.key)) {
            e.preventDefault();
            desfaz();
            return;
        }
        if (e.ctrlKey && /^y$/i.test(e.key)) {
            e.preventDefault();
            refazer();
            return;
        }
        const m = {
            p: "lapis",
            h: "marca",
            l: "linha",
            a: "seta",
            r: "retangulo",
            o: "circulo",
            t: "texto",
            e: "borracha"
        }[e.key.toLowerCase()];
        if (m && !e.ctrlKey && !e.altKey) {
            est.ferr = m;
            if (est.passa) passa(false);
            mostraBarra();
        }
    }));
    api.aoMostrar((() => {
        mostraBarra();
        redesenha();
    }));
    ajusta();
    mostraBarra();
    window.__desenho = {
        est: est,
        redesenha: redesenha,
        desfaz: desfaz,
        refazer: refazer,
        limpa: limpa,
        capturar: capturar
    };
})();