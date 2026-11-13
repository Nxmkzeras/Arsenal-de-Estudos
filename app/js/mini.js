(function() {
    "use strict";
    const api = window.miniApi;
    if (!api) return;
    const $ = id => document.getElementById(id);
    const PLAY = '<polygon points="7 4 20 12 7 20"/>', PAUSA = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    function aplica(st) {
        if (!st) return;
        $("txt").textContent = st.txt || "00:00";
        $("disc").textContent = st.disc || (st.modo === "regressivo" ? "contagem regressiva" : "cronômetro livre");
        $("cartao").className = st.status || "parado";
        $("ic").innerHTML = st.status === "rodando" ? PAUSA : PLAY;
        $("alterna").title = st.status === "rodando" ? "Pausar" : st.status === "pausado" ? "Continuar" : "Iniciar";
    }
    api.aoMudar(aplica);
    api.ler().then(aplica).catch((() => {}));
    $("alterna").onclick = () => api.comando("alternar");
    $("menu").onclick = () => api.menu();
    $("fecha").onclick = () => api.fechar();
    $("txt").ondblclick = () => api.comando("abrir");
})();