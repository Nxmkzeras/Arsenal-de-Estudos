(function() {
    "use strict";
    const {h: h, tooltip: tooltip, fmtMin: fmtMin} = U;
    const NS = "http://www.w3.org/2000/svg";
    function s(tag, attrs, ...kids) {
        const e = document.createElementNS(NS, tag);
        for (const k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
        for (const c of kids.flat()) if (c != null) e.appendChild(c instanceof Node ? c : document.createTextNode(c));
        return e;
    }
    const arcPath = (cx, cy, r0, r1, a0, a1) => {
        const p = (r, a) => [ cx + r * Math.cos(a), cy + r * Math.sin(a) ];
        const large = a1 - a0 > Math.PI ? 1 : 0;
        const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1), [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0);
        return `M${x0} ${y0} A${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`;
    };
    function rosca(dados, o) {
        o = Object.assign({
            tam: 190,
            furo: .62,
            centro: null,
            sub: null,
            fmt: fmtMin
        }, o);
        const total = dados.reduce(((a, d) => a + d.valor), 0);
        const c = o.tam / 2, r1 = c - 4, r0 = r1 * o.furo;
        const svg = s("svg", {
            viewBox: `0 0 ${o.tam} ${o.tam}`,
            width: o.tam,
            height: o.tam,
            class: "chart",
            role: "img",
            "aria-label": "Gráfico de rosca: " + (total > 0 ? dados.filter((d => d.valor > 0)).slice(0, 8).map((d => d.rotulo + " " + Math.round(d.valor / total * 100) + "%")).join(", ") : "sem dados")
        });
        if (total <= 0) {
            svg.appendChild(s("circle", {
                cx: c,
                cy: c,
                r: (r0 + r1) / 2,
                fill: "none",
                stroke: "var(--surface-3)",
                "stroke-width": r1 - r0
            }));
        } else {
            let a = -Math.PI / 2;
            const vis = dados.filter((d => d.valor > 0));
            for (const d of vis) {
                const ang = d.valor / total * Math.PI * 2;
                const full = vis.length === 1;
                const p = full ? s("circle", {
                    cx: c,
                    cy: c,
                    r: (r0 + r1) / 2,
                    fill: "none",
                    stroke: d.cor,
                    "stroke-width": r1 - r0
                }) : s("path", {
                    d: arcPath(c, c, r0, r1, a, a + ang),
                    fill: d.cor,
                    stroke: "var(--surface)",
                    "stroke-width": 1.5
                });
                tooltip(p, (() => `${d.rotulo}: ${o.fmt(d.valor)} (${Math.round(d.valor / total * 100)}%)`));
                p.style.cursor = "pointer";
                svg.appendChild(p);
                a += ang;
            }
        }
        const txt = o.centro != null ? o.centro : o.fmt(total);
        svg.appendChild(s("text", {
            class: "ch-big",
            x: c,
            y: c + (o.sub ? 3 : 7),
            "text-anchor": "middle",
            style: "font-size:22px"
        }, txt));
        if (o.sub) svg.appendChild(s("text", {
            x: c,
            y: c + 20,
            "text-anchor": "middle",
            style: "font-size:12px"
        }, o.sub));
        return svg;
    }
    function anel(p, o) {
        o = Object.assign({
            tam: 120,
            esp: 10,
            cor: "var(--data)",
            texto: null,
            sub: null
        }, o);
        const c = o.tam / 2, r = c - o.esp / 2 - 1, L = 2 * Math.PI * r;
        const pp = Math.max(0, Math.min(1, p));
        const svg = s("svg", {
            viewBox: `0 0 ${o.tam} ${o.tam}`,
            width: o.tam,
            height: o.tam,
            class: "chart",
            role: "img",
            "aria-label": (o.rotulo ? o.rotulo + ": " : "Progresso: ") + Math.round(pp * 100) + "%"
        });
        svg.appendChild(s("circle", {
            cx: c,
            cy: c,
            r: r,
            fill: "none",
            stroke: "var(--surface-3)",
            "stroke-width": o.esp
        }));
        if (pp > .002) svg.appendChild(s("circle", {
            class: "arco",
            cx: c,
            cy: c,
            r: r,
            fill: "none",
            stroke: o.cor,
            "stroke-width": o.esp,
            "stroke-linecap": "butt",
            "stroke-dasharray": `${L * pp} ${L}`,
            transform: `rotate(-90 ${c} ${c})`,
            style: "transition:stroke-dasharray .5s"
        }));
        const t = o.texto != null ? o.texto : Math.round(pp * 100) + "%";
        if (t !== "") svg.appendChild(s("text", {
            class: "ch-big",
            x: c,
            y: c + (o.sub ? 3 : o.tam / 14),
            "text-anchor": "middle",
            style: `font-size:${o.tam / 5}px`
        }, t));
        if (o.sub) svg.appendChild(s("text", {
            x: c,
            y: c + o.tam / 6 + 2,
            "text-anchor": "middle",
            style: "font-size:12px"
        }, o.sub));
        return svg;
    }
    function barras(dados, o) {
        o = Object.assign({
            w: 560,
            h: 200,
            cor: "var(--data)",
            fmt: v => String(Math.round(v)),
            meta: null,
            rotEvery: 1,
            destacarUltimo: false
        }, o);
        let max = Math.max(1, ...dados.map((d => d.valor)), o.meta || 0);
        max = niceMax(max);
        const rotY = [ 0, 1, 2, 3, 4 ].map((i => String(o.fmt(max * i / 4))));
        const m = {
            t: 14,
            r: 8,
            b: 24,
            l: Math.max(34, Math.ceil(Math.max(...rotY.map((t => t.length))) * 7) + 10)
        };
        const iw = o.w - m.l - m.r, ih = o.h - m.t - m.b;
        const svg = s("svg", {
            viewBox: `0 0 ${o.w} ${o.h}`,
            class: "chart",
            role: "img",
            "aria-label": o.rotulo || "Gráfico de barras: " + dados.slice(-7).map((d => d.dica || d.rotulo + " " + o.fmt(d.valor))).join("; "),
            style: "width:100%;height:auto;max-height:" + o.h * 1.4 + "px"
        });
        for (let i = 0; i <= 4; i++) {
            const y = m.t + ih - ih * i / 4;
            svg.appendChild(s("line", {
                x1: m.l,
                x2: o.w - m.r,
                y1: y,
                y2: y,
                stroke: "var(--line)",
                "stroke-dasharray": i ? "3 4" : ""
            }));
            svg.appendChild(s("text", {
                x: m.l - 6,
                y: y + 3,
                "text-anchor": "end"
            }, rotY[i]));
        }
        const bw = iw / dados.length;
        dados.forEach(((d, i) => {
            const bh = d.valor / max * ih, x = m.l + i * bw + bw * .2, w = bw * .6, y = m.t + ih - bh;
            const r = Math.min(2, w / 2, bh);
            const cor = d.cor || (o.destacarUltimo && i === dados.length - 1 ? "var(--amber-bar)" : o.cor);
            const rect = bh > 0 ? s("path", {
                class: "coluna",
                style: "--i:" + i,
                d: `M${x} ${y + bh} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + bh}Z`,
                fill: cor
            }) : null;
            const hit = s("rect", {
                x: m.l + i * bw,
                y: m.t,
                width: bw,
                height: ih,
                fill: "transparent"
            });
            tooltip(hit, (() => d.dica || `${d.rotulo}: ${o.fmt(d.valor)}`));
            if (rect) svg.appendChild(rect);
            svg.appendChild(hit);
            if (i % o.rotEvery === 0) svg.appendChild(s("text", {
                x: m.l + i * bw + bw / 2,
                y: o.h - 7,
                "text-anchor": "middle"
            }, d.rotulo));
        }));
        if (o.meta) {
            const y = m.t + ih - o.meta / max * ih;
            svg.appendChild(s("line", {
                x1: m.l,
                x2: o.w - m.r,
                y1: y,
                y2: y,
                stroke: "var(--text)",
                "stroke-width": 1.25,
                "stroke-dasharray": "6 4"
            }));
            svg.appendChild(s("text", {
                x: o.w - m.r,
                y: y - 5,
                "text-anchor": "end",
                style: "fill:var(--text);font-weight:700;letter-spacing:.06em"
            }, "META"));
        }
        return svg;
    }
    function fmtEixoHoras(v) {
        const min = Math.round(v * 60);
        if (min % 60 === 0) return min / 60 + "h";
        return min < 60 ? min + "min" : Math.floor(min / 60) + "h" + String(min % 60).padStart(2, "0");
    }
    function niceMax(v) {
        const raw = v / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
        const passo = [ 1, 2, 2.5, 5, 10 ].find((x => x >= n - 1e-9));
        return passo * p * 4;
    }
    function linha(valores, rotulos, o) {
        o = Object.assign({
            w: 460,
            h: 150,
            cor: "var(--data)",
            fmt: v => String(Math.round(v)),
            max: null
        }, o);
        const m = {
            t: 18,
            r: 18,
            b: 22,
            l: 8
        };
        const iw = o.w - m.l - m.r, ih = o.h - m.t - m.b;
        const max = o.max || niceMax(Math.max(1, ...valores));
        const pts = valores.map(((v, i) => [ m.l + (valores.length === 1 ? iw / 2 : i * iw / (valores.length - 1)), m.t + ih - v / max * ih ]));
        const svg = s("svg", {
            viewBox: `0 0 ${o.w} ${o.h}`,
            class: "chart",
            role: "img",
            "aria-label": o.rotulo || "Gráfico de linha: " + valores.length + " pontos, de " + o.fmt(Math.min(...valores)) + " a " + o.fmt(Math.max(...valores)) + ", último valor " + o.fmt(valores[valores.length - 1]),
            style: "width:100%;height:auto"
        });
        for (let i = 0; i <= 3; i++) {
            const y = m.t + ih - ih * i / 3;
            svg.appendChild(s("line", {
                x1: m.l,
                x2: o.w - m.r,
                y1: y,
                y2: y,
                stroke: "var(--line)",
                "stroke-dasharray": i ? "2 4" : ""
            }));
        }
        if (pts.length > 1) {
            const d = smooth(pts);
            svg.appendChild(s("path", {
                d: d + ` L${pts[pts.length - 1][0]} ${m.t + ih} L${pts[0][0]} ${m.t + ih}Z`,
                fill: o.cor,
                "fill-opacity": .07
            }));
            svg.appendChild(s("path", {
                class: "linha",
                pathLength: 1,
                d: d,
                fill: "none",
                stroke: o.cor,
                "stroke-width": 2,
                "stroke-linejoin": "round"
            }));
        }
        pts.forEach(((p, i) => {
            const last = i === pts.length - 1;
            const c = s("circle", {
                cx: p[0],
                cy: p[1],
                r: last ? 5 : 3,
                fill: last ? "var(--amber-bar)" : "var(--surface)",
                stroke: last ? "var(--surface)" : o.cor,
                "stroke-width": last ? 2 : 1.5,
                opacity: last || valores.length <= 16 ? 1 : 0
            });
            tooltip(c, (() => `${rotulos[i]}: ${o.fmt(valores[i])}`));
            c.style.cursor = "pointer";
            svg.appendChild(c);
        }));
        const step = Math.ceil(rotulos.length / 8);
        rotulos.forEach(((r, i) => {
            if (i % step === 0 || i === rotulos.length - 1) svg.appendChild(s("text", {
                x: pts[i][0],
                y: o.h - 5,
                "text-anchor": "middle"
            }, r));
        }));
        return svg;
    }
    function smooth(p) {
        let d = `M${p[0][0]} ${p[0][1]}`;
        for (let i = 0; i < p.length - 1; i++) {
            const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
            const t = .18;
            d += ` C${p1[0] + (p2[0] - p0[0]) * t} ${p1[1] + (p2[1] - p0[1]) * t}, ${p2[0] - (p3[0] - p1[0]) * t} ${p2[1] - (p3[1] - p1[1]) * t}, ${p2[0]} ${p2[1]}`;
        }
        return d;
    }
    const NIVEIS = [ "var(--surface-3)", "color-mix(in srgb, var(--c-verde) 30%, var(--surface-3))", "color-mix(in srgb, var(--c-verde) 55%, var(--surface-3))", "color-mix(in srgb, var(--c-verde) 80%, var(--surface-3))", "var(--c-verde)" ];
    function presenca(dias, o) {
        o = Object.assign({
            semanas: 26,
            meta: 60,
            hoje: U.ymd(),
            cel: 15,
            gap: 4
        }, o);
        const {cel: cel, gap: gap} = o;
        const hoje = U.parseYmd(o.hoje);
        const dow = (hoje.getDay() + 6) % 7;
        const ini = new Date(hoje);
        ini.setDate(hoje.getDate() - dow - (o.semanas - 1) * 7);
        const W = 30 + o.semanas * (cel + gap), H = 18 + 7 * (cel + gap) + 22;
        const svg = s("svg", {
            viewBox: `0 0 ${W} ${H}`,
            class: "chart",
            role: "img",
            "aria-label": "Mapa de presença: " + Object.values(dias).filter((m => m > 0)).length + " dias com estudo nas últimas " + o.semanas + " semanas",
            style: `width:100%;height:auto;max-width:${W * 1.4}px`
        });
        [ "seg", "", "qua", "", "sex", "", "dom" ].forEach(((t, i) => t && svg.appendChild(s("text", {
            x: 0,
            y: 18 + i * (cel + gap) + cel - 3
        }, t))));
        let lastMes = -1;
        for (let w = 0; w < o.semanas; w++) {
            for (let d = 0; d < 7; d++) {
                const dt = new Date(ini);
                dt.setDate(ini.getDate() + w * 7 + d);
                if (dt > hoje) continue;
                const k = U.ymd(dt), min = dias[k] || 0;
                const x = 30 + w * (cel + gap), y = 18 + d * (cel + gap);
                const nivel = min <= 0 ? 0 : min < o.meta * .5 ? 1 : min < o.meta ? 2 : min < o.meta * 1.5 ? 3 : 4;
                const r = s("rect", {
                    x: x,
                    y: y,
                    width: cel,
                    height: cel,
                    rx: 4,
                    fill: NIVEIS[nivel]
                });
                tooltip(r, (() => `${U.fmtDataLonga(k)} — ${min ? fmtMin(min) : "sem estudo"}`));
                svg.appendChild(r);
                if (d === 0 && dt.getMonth() !== lastMes) {
                    lastMes = dt.getMonth();
                    svg.appendChild(s("text", {
                        x: x,
                        y: 10
                    }, U.MESES[lastMes]));
                }
            }
        }
        const ly = 18 + 7 * (cel + gap) + 6;
        svg.appendChild(s("text", {
            x: W - 5 * 15 - 34,
            y: ly + 11,
            "text-anchor": "end"
        }, "menos"));
        NIVEIS.forEach(((f, i) => svg.appendChild(s("rect", {
            x: W - 5 * 15 - 28 + i * 15,
            y: ly,
            width: 12,
            height: 12,
            rx: 2,
            fill: f
        }))));
        svg.appendChild(s("text", {
            x: W - 24,
            y: ly + 11
        }, "mais"));
        return svg;
    }
    function hbarras(dados, o) {
        o = Object.assign({
            fmt: v => v + "%",
            max: 100
        }, o);
        return h("div", {
            class: "col",
            style: {
                gap: "9px"
            }
        }, dados.map((d => {
            const el = h("div", {
                class: "hbar"
            }, h("div", {
                class: "nm",
                title: d.rotulo
            }, d.cor ? h("span", {
                class: "dot-c",
                style: {
                    background: d.cor,
                    marginRight: "7px"
                }
            }) : null, d.rotulo), h("div", {
                class: "bar",
                role: "progressbar",
                "aria-label": d.rotulo,
                "aria-valuenow": Math.round(d.valor),
                "aria-valuemin": 0,
                "aria-valuemax": o.max
            }, h("i", {
                style: {
                    width: Math.min(100, d.valor / o.max * 100) + "%",
                    background: d.cor || "var(--data)"
                }
            })), h("div", {
                class: "small num",
                style: {
                    textAlign: "right"
                }
            }, d.texto != null ? d.texto : o.fmt(d.valor)));
            if (d.dica) tooltip(el, d.dica);
            return el;
        })));
    }
    function legenda(dados, fmt) {
        fmt = fmt || fmtMin;
        return h("div", {
            class: "legend"
        }, dados.map((d => h("div", {
            class: "li"
        }, h("span", {
            class: "dot-c",
            style: {
                background: d.cor
            }
        }), h("span", {
            class: "ellipsis"
        }, d.rotulo), h("b", null, fmt(d.valor))))));
    }
    function miniBarras(valores, cor, o) {
        o = Object.assign({
            w: 64,
            h: 28,
            corUltimo: null
        }, o);
        const w = o.w, hh = o.h, n = valores.length, max = Math.max(1, ...valores);
        const svg = s("svg", {
            viewBox: `0 0 ${w} ${hh}`,
            width: w,
            height: hh,
            "aria-hidden": "true"
        });
        const folga = Math.min(3, w / n / 3);
        valores.forEach(((v, i) => {
            const bh = Math.max(2, v / max * hh);
            svg.appendChild(s("rect", {
                x: i * (w / n) + folga / 2,
                y: hh - bh,
                width: w / n - folga,
                height: bh,
                rx: 2,
                fill: o.corUltimo && i === n - 1 ? o.corUltimo : cor,
                opacity: v > 0 ? 1 : .35
            }));
        }));
        return svg;
    }
    window.Charts = {
        rosca: rosca,
        anel: anel,
        barras: barras,
        linha: linha,
        presenca: presenca,
        hbarras: hbarras,
        legenda: legenda,
        miniBarras: miniBarras,
        fmtEixoHoras: fmtEixoHoras,
        svg: s
    };
})();