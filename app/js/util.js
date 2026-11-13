(function() {
    "use strict";
    function h(tag, attrs, ...kids) {
        const el = document.createElement(tag);
        if (attrs) {
            for (const k of Object.keys(attrs)) {
                const v = attrs[k];
                if (v == null || v === false) continue;
                if (k === "class") el.className = v; else if (k === "style" && typeof v === "object") Object.assign(el.style, v); else if (k === "dataset") Object.assign(el.dataset, v); else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v); else if (k === "value") el.value = v; else if (k === "checked" || k === "disabled" || k === "selected" || k === "open") el[k] = !!v; else el.setAttribute(k, v === true ? "" : v);
            }
        }
        if (attrs && typeof attrs.onclick === "function" && !/^(button|a|input|select|textarea|label|summary)$/.test(tag)) {
            if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
            if (!el.hasAttribute("role")) el.setAttribute("role", "button");
            el.addEventListener("keydown", (e => {
                if (e.target !== el || e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                el.click();
            }));
        }
        add(el, kids);
        return el;
    }
    function add(el, kids) {
        for (const k of kids.flat(Infinity)) {
            if (k == null || k === false) continue;
            el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
        }
        return el;
    }
    function clear(el) {
        while (el.firstChild) el.removeChild(el.firstChild);
        return el;
    }
    const $ = (s, r) => (r || document).querySelector(s);
    const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
    const IC = {
        home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
        book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
        folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
        folderPlus: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>',
        refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
        clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
        check: '<polyline points="20 6 9 17 4 12"/>',
        checkSq: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
        chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
        search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
        bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
        plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
        x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
        right: '<polyline points="9 18 15 12 9 6"/>',
        left: '<polyline points="15 18 9 12 15 6"/>',
        arrowRight: '<line x1="4" y1="12" x2="20" y2="12"/><polyline points="13 5 20 12 13 19"/>',
        arrowLeft: '<line x1="20" y1="12" x2="4" y2="12"/><polyline points="11 5 4 12 11 19"/>',
        map: '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>',
        compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
        down: '<polyline points="6 9 12 15 18 9"/>',
        up: '<polyline points="18 15 12 9 6 15"/>',
        play: '<polygon points="6 3 20 12 6 21 6 3"/>',
        pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
        stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
        heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.7-7.7 1.1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
        trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/>',
        edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/>',
        download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
        upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
        link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
        target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
        flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
        layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
        zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
        star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
        list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
        cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
        help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        award: '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
        moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
        sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
        menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
        filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
        inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
        ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
        copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
        pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
        note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
        cards: '<rect x="2" y="6" width="16" height="14" rx="2"/><path d="M6 6V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2"/>',
        skip: '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>',
        lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
        pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
        book2: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
        scale: '<line x1="12" y1="3" x2="12" y2="21"/><path d="M5 7l-3 8a4 4 0 0 0 6 0z"/><path d="M19 7l-3 8a4 4 0 0 0 6 0z"/><line x1="4" y1="7" x2="20" y2="7"/>',
        shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
        volumeOff: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>',
        music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
        headphones: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
        keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6.01" y2="10"/><line x1="10" y1="10" x2="10.01" y2="10"/><line x1="14" y1="10" x2="14.01" y2="10"/><line x1="18" y1="10" x2="18.01" y2="10"/><line x1="7" y1="14" x2="17" y2="14"/>',
        puzzle: '<path d="M20 12h-1.5a2 2 0 1 0 0 4H20v3a1 1 0 0 1-1 1h-3v-1.5a2 2 0 1 0-4 0V20H8a1 1 0 0 1-1-1v-3H5.5a2 2 0 1 1 0-4H7V9a1 1 0 0 1 1-1h3V6.5a2 2 0 1 1 4 0V8h3a1 1 0 0 1 1 1z"/>',
        trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>',
        undo: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>'
    };
    function icon(name, cls) {
        const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        s.setAttribute("viewBox", "0 0 24 24");
        s.setAttribute("class", "ic" + (cls ? " " + cls : ""));
        s.setAttribute("aria-hidden", "true");
        s.innerHTML = IC[name] || "";
        return s;
    }
    const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    const pad = n => String(n).padStart(2, "0");
    function ymd(d) {
        d = d || new Date;
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    }
    function parseYmd(s) {
        const [a, b, c] = s.split("-").map(Number);
        return new Date(a, b - 1, c);
    }
    function addDays(s, n) {
        const d = parseYmd(s);
        d.setDate(d.getDate() + n);
        return ymd(d);
    }
    function diffDays(a, b) {
        return Math.round((parseYmd(a) - parseYmd(b)) / 864e5);
    }
    const MESES = [ "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez" ];
    const DIAS = [ "dom", "seg", "ter", "qua", "qui", "sex", "sáb" ];
    function fmtData(s) {
        if (!s) return "";
        const d = parseYmd(s);
        return pad(d.getDate()) + " " + MESES[d.getMonth()];
    }
    function fmtDataLonga(s) {
        const d = parseYmd(s);
        return DIAS[d.getDay()] + ", " + pad(d.getDate()) + " " + MESES[d.getMonth()] + " " + d.getFullYear();
    }
    function fmtMin(m) {
        m = Math.round(m || 0);
        const hh = Math.floor(m / 60), mm = m % 60;
        return hh ? hh + "h" + pad(mm) : mm + "min";
    }
    function fmtHoras(m) {
        return ((m || 0) / 60).toFixed(1).replace(".", ",") + "h";
    }
    function fmtClock(sec) {
        sec = Math.max(0, Math.floor(sec));
        const hh = Math.floor(sec / 3600), mm = Math.floor(sec % 3600 / 60), ss = sec % 60;
        return (hh ? hh + ":" : "") + pad(mm) + ":" + pad(ss);
    }
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    function debounce(fn, ms) {
        let t;
        return (...a) => {
            clearTimeout(t);
            t = setTimeout((() => fn(...a)), ms);
        };
    }
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;
    function download(nome, conteudo, tipo) {
        const blob = new Blob([ conteudo ], {
            type: tipo || "application/json"
        });
        const a = h("a", {
            href: URL.createObjectURL(blob),
            download: nome
        });
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout((() => URL.revokeObjectURL(a.href)), 4e3);
    }
    function pickFile(accept) {
        return new Promise((res => {
            const i = h("input", {
                type: "file",
                accept: accept || ".json"
            });
            i.addEventListener("change", (() => {
                const f = i.files[0];
                if (!f) return res(null);
                const r = new FileReader;
                r.onload = () => res({
                    nome: f.name,
                    texto: String(r.result)
                });
                r.readAsText(f);
            }));
            i.click();
        }));
    }
    const reduzMov = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    function sair(el, depois) {
        if (el.classList.contains("saindo")) return;
        el.classList.add("saindo");
        let feito = false;
        const fim = e => {
            if (feito || e && e.target !== el) return;
            feito = true;
            el.remove();
            depois && depois();
        };
        el.addEventListener("animationend", fim);
        setTimeout(fim, 260);
    }
    function toast(msg, tipo, extra) {
        let box = $("#toasts");
        if (!box) {
            box = h("div", {
                id: "toasts",
                role: "status",
                "aria-live": "polite"
            });
            document.body.appendChild(box);
        }
        const t = h("div", {
            class: "toast " + (tipo || "")
        }, h("span", null, msg));
        if (extra && extra.acao) t.appendChild(h("button", {
            class: "btn sm",
            onclick: () => {
                try {
                    extra.fn && extra.fn();
                } finally {
                    sair(t);
                }
            }
        }, extra.acao));
        box.appendChild(t);
        setTimeout((() => sair(t)), extra && extra.acao ? 7e3 : tipo === "err" ? 6e3 : 3200);
    }
    function modal(o) {
        const ov = h("div", {
            class: "overlay"
        });
        const voltarPara = document.activeElement;
        let fechado = false;
        const close = () => {
            if (fechado) return;
            fechado = true;
            document.removeEventListener("keydown", esc, true);
            sair(ov, (() => {
                try {
                    voltarPara && voltarPara.isConnected && voltarPara.focus && voltarPara.focus();
                } catch (e) {}
            }));
            o.aoFechar && o.aoFechar();
        };
        const esc = e => {
            if (e.key === "Escape") {
                e.stopPropagation();
                close();
                return;
            }
            if (e.key === "Tab") {
                const fs = $$('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])', ov).filter((x => !x.disabled && x.offsetParent !== null));
                if (!fs.length) return;
                const a = fs[0], z = fs[fs.length - 1];
                if (!ov.contains(document.activeElement)) {
                    e.preventDefault();
                    a.focus();
                } else if (e.shiftKey && document.activeElement === a) {
                    e.preventDefault();
                    z.focus();
                } else if (!e.shiftKey && document.activeElement === z) {
                    e.preventDefault();
                    a.focus();
                }
            }
        };
        document.addEventListener("keydown", esc, true);
        ov.addEventListener("mousedown", (e => {
            if (e.target === ov) close();
        }));
        const foot = h("div", {
            class: "modal-f"
        });
        for (const b of o.botoes || []) {
            foot.appendChild(h("button", {
                class: "btn " + (b.tipo || ""),
                onclick: async () => {
                    const r = b.fn ? await b.fn(close) : undefined;
                    if (r !== false && !b.manter) close();
                }
            }, b.texto));
        }
        const tid = "mt" + uid();
        const m = h("div", {
            class: "modal" + (o.largo ? " wide" : ""),
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": tid
        }, h("div", {
            class: "modal-h",
            id: tid
        }, o.titulo, h("button", {
            class: "btn ghost sm right",
            "aria-label": "Fechar",
            onclick: close
        }, icon("x"))), h("div", {
            class: "modal-b"
        }, o.corpo), o.botoes && o.botoes.length ? foot : null);
        ov.appendChild(m);
        document.body.appendChild(ov);
        const first = $("input,textarea,select", m) || (o.botoes && o.botoes.length ? $(".modal-f .btn.primary", m) : null);
        if (!o.semFoco) setTimeout((() => (first || $(".modal-h button", m)).focus()), 30);
        return {
            close: close,
            el: m
        };
    }
    function confirmar(texto, okTexto) {
        return new Promise((res => {
            let ok = false;
            modal({
                titulo: "Confirmar",
                corpo: h("p", {
                    style: {
                        margin: 0
                    }
                }, texto),
                botoes: [ {
                    texto: "Cancelar",
                    fn: () => {}
                }, {
                    texto: okTexto || "Confirmar",
                    tipo: "primary",
                    fn: () => {
                        ok = true;
                    }
                } ],
                aoFechar: () => res(ok)
            });
        }));
    }
    function perguntar(titulo, rotulo, valor, tipo) {
        return new Promise((res => {
            let v = null;
            const inp = h("input", {
                type: tipo || "text",
                value: valor || "",
                style: {
                    width: "100%"
                }
            });
            modal({
                titulo: titulo,
                corpo: h("label", {
                    class: "f"
                }, rotulo, inp),
                botoes: [ {
                    texto: "Cancelar",
                    fn: () => {}
                }, {
                    texto: "OK",
                    tipo: "primary",
                    fn: () => {
                        v = inp.value;
                    }
                } ],
                aoFechar: () => res(v)
            });
            inp.addEventListener("keydown", (e => {
                if (e.key === "Enter") {
                    const b = document.querySelector(".overlay:not(.saindo) .modal-f .btn.primary");
                    b && b.click();
                }
            }));
        }));
    }
    let tip;
    const tiraTip = () => {
        document.querySelectorAll(".tooltip").forEach((t => t.remove()));
        tip = null;
    };
    function tooltip(el, texto) {
        el.addEventListener("mouseenter", (() => {
            tip = tip || h("div", {
                class: "tooltip"
            });
            tip.textContent = typeof texto === "function" ? texto() : texto;
            document.body.appendChild(tip);
        }));
        el.addEventListener("mousemove", (e => {
            if (tip) {
                tip.style.left = Math.min(e.clientX + 12, innerWidth - 180) + "px";
                tip.style.top = e.clientY + 14 + "px";
            }
        }));
        el.addEventListener("mouseleave", (() => tip && tip.remove()));
    }
    function contar(el, alvo, ms) {
        if (reduzMov() || !isFinite(alvo)) return;
        ms = ms || 600;
        const t0 = performance.now();
        const sufixo = el.dataset.sufixo || "";
        const passo = t => {
            const k = Math.min(1, (t - t0) / ms);
            el.textContent = Math.round(alvo * (1 - Math.pow(1 - k, 3))) + sufixo;
            if (k < 1 && el.isConnected) requestAnimationFrame(passo);
        };
        requestAnimationFrame(passo);
    }
    const plural = (n, um, varios) => n + " " + (n === 1 ? um : varios);
    const linkSeguro = u => /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";
    async function copiar(texto) {
        try {
            await navigator.clipboard.writeText(texto);
            return true;
        } catch (e) {
            const t = h("textarea", {
                style: {
                    position: "fixed",
                    opacity: 0
                }
            });
            t.value = texto;
            document.body.appendChild(t);
            t.select();
            let ok = false;
            try {
                ok = document.execCommand("copy");
            } catch (er) {}
            t.remove();
            return ok;
        }
    }
    const ENCAIXES = {}, TEXTOS = {};
    const Encaixe = {
        add(nome, fn) {
            (ENCAIXES[nome] || (ENCAIXES[nome] = [])).push(fn);
        },
        todos(nome, ...a) {
            const r = [];
            (ENCAIXES[nome] || []).forEach((f => {
                try {
                    const x = f(...a);
                    if (x != null && x !== false) r.push(x);
                } catch (e) {
                    console.error("encaixe " + nome, e);
                }
            }));
            return r;
        },
        um(nome, ...a) {
            for (const f of ENCAIXES[nome] || []) {
                try {
                    const x = f(...a);
                    if (x != null) return x;
                } catch (e) {
                    console.error("encaixe " + nome, e);
                }
            }
            return undefined;
        },
        tem: nome => !!(ENCAIXES[nome] && ENCAIXES[nome].length),
        textos(o) {
            Object.assign(TEXTOS, o);
        }
    };
    const txt = (chave, padrao) => Object.prototype.hasOwnProperty.call(TEXTOS, chave) ? TEXTOS[chave] : padrao;
    window.Encaixe = Encaixe;
    window.U = {
        h: h,
        add: add,
        clear: clear,
        $: $,
        $$: $$,
        icon: icon,
        norm: norm,
        pad: pad,
        ymd: ymd,
        parseYmd: parseYmd,
        addDays: addDays,
        diffDays: diffDays,
        fmtData: fmtData,
        fmtDataLonga: fmtDataLonga,
        fmtMin: fmtMin,
        fmtHoras: fmtHoras,
        fmtClock: fmtClock,
        uid: uid,
        debounce: debounce,
        clamp: clamp,
        pct: pct,
        download: download,
        pickFile: pickFile,
        toast: toast,
        modal: modal,
        confirmar: confirmar,
        perguntar: perguntar,
        tooltip: tooltip,
        tiraTip: tiraTip,
        contar: contar,
        reduzMov: reduzMov,
        plural: plural,
        linkSeguro: linkSeguro,
        copiar: copiar,
        txt: txt,
        MESES: MESES,
        DIAS: DIAS
    };
})();