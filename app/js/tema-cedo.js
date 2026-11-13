(function() {
    try {
        var t = localStorage.getItem("arsenal.tema") || "claro";
        var escuro = t === "escuro" || t === "auto" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.dataset.tema = escuro ? "escuro" : "claro";
    } catch (e) {}
})();