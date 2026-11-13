(function() {
    "use strict";
    const S = Charts.svg, TAU = Math.PI * 2;
    const pt = (c, r, a) => [ c + r * Math.cos(a), c + r * Math.sin(a) ];
    const f2 = n => Math.round(n * 100) / 100;
    function arco(c, r, a0, a1) {
        if (a1 - a0 >= TAU - .002) a1 = a0 + TAU - .002;
        const [x0, y0] = pt(c, r, a0), [x1, y1] = pt(c, r, a1);
        return `M${f2(x0)} ${f2(y0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${f2(x1)} ${f2(y1)}`;
    }
    function fatia(c, r0, r1, a0, a1) {
        if (a1 - a0 >= TAU - .002) a1 = a0 + TAU - .002;
        const g = a1 - a0 > Math.PI ? 1 : 0;
        const [x0, y0] = pt(c, r1, a0), [x1, y1] = pt(c, r1, a1), [x2, y2] = pt(c, r0, a1), [x3, y3] = pt(c, r0, a0);
        return `M${f2(x0)} ${f2(y0)} A${r1} ${r1} 0 ${g} 1 ${f2(x1)} ${f2(y1)} L${f2(x2)} ${f2(y2)} A${r0} ${r0} 0 ${g} 0 ${f2(x3)} ${f2(y3)}Z`;
    }
    function animar(ms, passo, fim) {
        if (U.reduzMov() || document.hidden) {
            passo(1);
            fim && fim();
            return;
        }
        const t0 = Date.now();
        const id = setInterval((() => {
            const k = Math.min(1, (Date.now() - t0) / ms);
            passo(1 - Math.pow(1 - k, 3));
            if (k >= 1) {
                clearInterval(id);
                fim && fim();
            }
        }), 16);
    }
    let memoria = null;
    function anelDia(o) {
        const T = 360, c = T / 2, R = 148, ESP = 28;
        const svg = S("svg", {
            viewBox: `0 0 ${T} ${T}`,
            class: "chart anel-dia",
            role: "group",
            "aria-label": "Plano de hoje por matéria"
        });
        svg.appendChild(S("circle", {
            class: "ad-base",
            cx: c,
            cy: c,
            r: R,
            fill: "none",
            "stroke-width": ESP
        }));
        const marcas = S("g", {
            class: "ad-marcas",
            "aria-hidden": "true"
        });
        for (let i = 0; i < 48; i++) {
            const a = i / 48 * TAU, [x1, y1] = pt(c, R - ESP / 2 - 7, a), [x2, y2] = pt(c, R - ESP / 2 - (i % 4 ? 10 : 13), a);
            marcas.appendChild(S("line", {
                x1: f2(x1),
                y1: f2(y1),
                x2: f2(x2),
                y2: f2(y2)
            }));
        }
        svg.appendChild(marcas);
        const g = S("g", null);
        svg.appendChild(g);
        const cabeca = S("circle", {
            class: "ad-cabeca",
            r: 5,
            cx: c,
            cy: c - R
        });
        cabeca.style.display = "none";
        svg.appendChild(cabeca);
        const nos = new Map;
        let ultimo = null, k = 1;
        function cria(sg) {
            const cor = o.cor(sg.discId);
            const trilho = S("path", {
                class: "ad-trilho",
                fill: "none",
                stroke: cor,
                "stroke-width": ESP
            });
            const cheio = S("path", {
                class: "ad-cheio",
                fill: "none",
                stroke: cor,
                "stroke-width": ESP
            });
            const no = S("g", {
                class: "ad-seg",
                tabindex: 0,
                role: "button"
            }, trilho, cheio);
            no.addEventListener("mouseenter", (() => {
                destacar(no.__sg.id);
                o.aoEntrar && o.aoEntrar(no.__sg);
            }));
            no.addEventListener("mouseleave", (() => {
                destacar(null);
                o.aoSair && o.aoSair(no.__sg);
            }));
            no.addEventListener("focus", (() => {
                destacar(no.__sg.id);
            }));
            no.addEventListener("blur", (() => {
                destacar(null);
            }));
            no.addEventListener("click", (() => o.aoClicar && o.aoClicar(no.__sg)));
            no.addEventListener("keydown", (ev => {
                if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    o.aoClicar && o.aoClicar(no.__sg);
                }
            }));
            g.appendChild(no);
            const r = {
                no: no,
                trilho: trilho,
                cheio: cheio
            };
            nos.set(sg.id, r);
            return r;
        }
        function destacar(id) {
            svg.classList.toggle("tem-foco", id != null);
            nos.forEach(((r, kk) => r.no.classList.toggle("foco", kk === id)));
        }
        function calcular(est) {
            const segs = est.segs, total = est.total || 1, vao = segs.length > 1 ? .034 : 0, G = new Map;
            let a = -Math.PI / 2;
            segs.forEach((sg => {
                const span = sg.tam / total * TAU * k;
                const a0 = a + vao / 2, a1 = Math.max(a0, a + span - vao / 2);
                a += span;
                const frac = sg.tam > 0 ? Math.min(1, sg.feito / sg.tam) : 0;
                G.set(sg.id, {
                    a0: a0,
                    a1: a1,
                    af: a0 + (a1 - a0) * frac
                });
            }));
            return G;
        }
        function aplicar(est, G) {
            const vivos = new Set(est.segs.map((x => x.id)));
            nos.forEach(((r, id) => {
                if (!vivos.has(id)) {
                    r.no.remove();
                    nos.delete(id);
                }
            }));
            svg.classList.toggle("vazio", !est.segs.length);
            let cab = null;
            est.segs.forEach((sg => {
                const r = nos.get(sg.id) || cria(sg), gm = G.get(sg.id);
                const cor = o.cor(sg.discId);
                if (r.trilho.getAttribute("stroke") !== cor) {
                    r.trilho.setAttribute("stroke", cor);
                    r.cheio.setAttribute("stroke", cor);
                }
                r.no.__sg = sg;
                if (!gm || gm.a1 - gm.a0 < .004) {
                    r.no.style.display = "none";
                    return;
                }
                r.no.style.display = "";
                r.trilho.setAttribute("d", arco(c, R, gm.a0, gm.a1));
                if (gm.af - gm.a0 > .004) {
                    r.cheio.setAttribute("d", arco(c, R, gm.a0, gm.af));
                    r.cheio.style.display = "";
                } else r.cheio.style.display = "none";
                r.no.classList.toggle("ativo", est.ativo === sg.id);
                r.no.classList.toggle("extra", !!sg.extra);
                r.no.setAttribute("aria-label", o.nome(sg.discId) + ": " + U.fmtMin(sg.feito) + (sg.extra ? " além do plano" : " de " + U.fmtMin(sg.min)));
                if (est.ativo === sg.id && est.status === "rodando") cab = gm.af;
            }));
            if (cab != null && k >= 1) {
                const [x, y] = pt(c, R, cab);
                cabeca.setAttribute("cx", f2(x));
                cabeca.setAttribute("cy", f2(y));
                cabeca.style.display = "";
            } else cabeca.style.display = "none";
            geo = G;
            if (k >= 1) memoria = G;
        }
        const mudouMuito = (A, B) => {
            if (A.size !== B.size) return true;
            for (const [id, g] of B) {
                const x = A.get(id);
                if (!x || Math.abs(x.a0 - g.a0) > .01 || Math.abs(x.a1 - g.a1) > .01 || Math.abs(x.af - g.af) > .03) return true;
            }
            return false;
        };
        let geo = null, tween = null;
        function atualizar(est) {
            ultimo = est;
            const alvo = calcular(est);
            const de = geo || memoria;
            if (k < 1 || !de || U.reduzMov() || document.hidden || !mudouMuito(de, alvo)) {
                if (!tween) aplicar(est, alvo); else alvoTween = {
                    est: est,
                    alvo: alvo
                };
                return;
            }
            clearInterval(tween);
            const t0 = Date.now(), ms = 520;
            alvoTween = {
                est: est,
                alvo: alvo
            };
            const passo = () => {
                if (!svg.isConnected && Date.now() - t0 > 100) {
                    clearInterval(tween);
                    tween = null;
                    return;
                }
                const kk = Math.min(1, (Date.now() - t0) / ms), e = 1 - Math.pow(1 - kk, 3), fim = alvoTween.alvo, mid = new Map;
                fim.forEach(((g, id) => {
                    const x = de.get(id) || {
                        a0: g.a0,
                        a1: g.a0,
                        af: g.a0
                    };
                    mid.set(id, {
                        a0: x.a0 + (g.a0 - x.a0) * e,
                        a1: x.a1 + (g.a1 - x.a1) * e,
                        af: x.af + (g.af - x.af) * e
                    });
                }));
                aplicar(alvoTween.est, kk >= 1 ? fim : mid);
                if (kk >= 1) {
                    clearInterval(tween);
                    tween = null;
                }
            };
            tween = setInterval(passo, 16);
            passo();
        }
        let alvoTween = null;
        function entrar() {
            clearInterval(tween);
            tween = null;
            k = 0;
            animar(900, (v => {
                k = Math.max(1e-4, v);
                if (ultimo) atualizar(ultimo);
            }));
        }
        return {
            el: svg,
            atualizar: atualizar,
            destacar: destacar,
            entrar: entrar
        };
    }
    function rosa(dados, o) {
        o = o || {};
        const T = 320, c = T / 2, R0 = 54, R1 = 150;
        const svg = S("svg", {
            viewBox: `0 0 ${T} ${T}`,
            class: "chart rosa",
            role: "group",
            "aria-label": "Desempenho em questões por matéria"
        });
        const total = dados.reduce(((a, d) => a + d.feitas), 0);
        [ .5, 1 ].forEach((p => svg.appendChild(S("circle", {
            class: "rosa-guia",
            cx: c,
            cy: c,
            r: R0 + (R1 - R0) * p,
            fill: "none"
        }))));
        if (total > 0) {
            const minimo = total * .045, soma = dados.reduce(((a, d) => a + Math.max(d.feitas, minimo)), 0);
            let a = -Math.PI / 2;
            dados.forEach(((d, i) => {
                const span = Math.max(d.feitas, minimo) / soma * TAU, a0 = a + (dados.length > 1 ? .016 : 0), a1 = a + span - (dados.length > 1 ? .016 : 0);
                a += span;
                const fundo = S("path", {
                    class: "rosa-fundo",
                    d: fatia(c, R0, R1, a0, a1),
                    fill: d.cor
                });
                const cheia = S("path", {
                    class: "rosa-cheia",
                    d: fatia(c, R0, R0 + (R1 - R0) * Math.max(.03, d.pct / 100), a0, a1),
                    fill: d.cor
                });
                const no = S("g", {
                    class: "rosa-seg",
                    tabindex: 0,
                    role: "button",
                    style: "--i:" + i,
                    "aria-label": d.rotulo + ": " + d.pct + "% de acerto em " + d.feitas + " questões"
                }, fundo, cheia);
                const foco = on => {
                    svg.classList.toggle("tem-foco", on);
                    no.classList.toggle("foco", on);
                };
                no.addEventListener("mouseenter", (() => {
                    foco(true);
                    o.aoEntrar && o.aoEntrar(d);
                }));
                no.addEventListener("mouseleave", (() => {
                    foco(false);
                    o.aoSair && o.aoSair(d);
                }));
                no.addEventListener("focus", (() => foco(true)));
                no.addEventListener("blur", (() => foco(false)));
                no.addEventListener("click", (() => o.aoClicar && o.aoClicar(d)));
                no.addEventListener("keydown", (ev => {
                    if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        o.aoClicar && o.aoClicar(d);
                    }
                }));
                svg.appendChild(no);
            }));
        }
        svg.appendChild(S("text", {
            class: "ch-big",
            x: c,
            y: c + 6,
            "text-anchor": "middle",
            style: "font-size:26px"
        }, o.centro != null ? o.centro : ""));
        if (o.sub) svg.appendChild(S("text", {
            x: c,
            y: c + 24,
            "text-anchor": "middle",
            style: "font-size:11.5px"
        }, o.sub));
        return svg;
    }
    Charts.anelDia = anelDia;
    Charts.rosa = rosa;
    Charts.animar = animar;
})();