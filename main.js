const {app: app, net: net, globalShortcut: globalShortcut, screen: screen, desktopCapturer: desktopCapturer, BrowserWindow: BrowserWindow, Menu: Menu, Tray: Tray, Notification: Notification, nativeImage: nativeImage, shell: shell, ipcMain: ipcMain, clipboard: clipboard, dialog: dialog} = require("electron");

const path = require("path");

const fs = require("fs");

const fsp = fs.promises;

const crypto = require("crypto");

const cp = require("child_process");

app.setName("Arsenal de Estudos");

const EDICAO_PUBLICA = !fs.existsSync(path.join(__dirname, "casca-pessoal.js"));

if (EDICAO_PUBLICA) app.setPath("userData", path.join(app.getPath("appData"), "Arsenal de Estudos - Publico"));

app.commandLine.appendSwitch("lang", "pt-BR");

app.commandLine.appendSwitch("js-flags", "--expose-gc");

app.commandLine.appendSwitch("disable-features", "AudioServiceOutOfProcess");

app.commandLine.appendSwitch("enable-features", "NetworkServiceInProcess2");

app.setAppUserModelId(EDICAO_PUBLICA ? "app.arsenal.estudos.publico" : "app.arsenal.estudos");

const temTrava = app.requestSingleInstanceLock();

if (!temTrava) app.quit();

let janela = null, bandeja = null;

let saindo = false;

const iniciouOculto = process.argv.includes("--oculto");

const dadosDir = () => app.getPath("userData");

const arqConfig = () => path.join(dadosDir(), "config-exe.json");

const pastaEspelho = () => path.join(dadosDir(), "dados-copia");

const PADRAO = {
    segundoPlano: true,
    iniciarMinimizado: true,
    iniciarComWindows: false,
    avisoSegundoPlano: false,
    backupPasta: "",
    verificarAtualizacoes: true,
    versaoIgnorada: "",
    atalhoDesenho: true,
    miniAtivo: false,
    miniPos: null
};

let cfg = Object.assign({}, PADRAO);

function lerConfig() {
    try {
        cfg = Object.assign({}, PADRAO, JSON.parse(fs.readFileSync(arqConfig(), "utf8")));
    } catch (e) {
        cfg = Object.assign({}, PADRAO);
    }
}

function gravarConfig() {
    try {
        fs.mkdirSync(dadosDir(), {
            recursive: true
        });
        escreveAtomico(arqConfig(), JSON.stringify(cfg, null, 1));
    } catch (e) {
        console.error("config", e);
    }
}

function escreveAtomico(arq, texto) {
    const tmp = arq + ".tmp";
    fs.writeFileSync(tmp, texto, "utf8");
    fs.renameSync(tmp, arq);
}

const NOME_LOGIN = EDICAO_PUBLICA ? "Arsenal de Estudos (publico)" : "Arsenal de Estudos";

const argsLogin = () => cfg.iniciarMinimizado ? [ "--oculto" ] : [];

const podeIniciarComWindows = () => app.isPackaged && process.platform === "win32";

const iniciaComWindows = () => podeIniciarComWindows() && !!cfg.iniciarComWindows;

function gravaLogin() {
    try {
        app.setLoginItemSettings({
            openAtLogin: !!cfg.iniciarComWindows,
            name: NOME_LOGIN,
            path: process.execPath,
            args: argsLogin()
        });
        return true;
    } catch (e) {
        console.error("iniciar com windows", e);
        return false;
    }
}

function aplicaIniciarComWindows(ligar) {
    if (!podeIniciarComWindows()) return false;
    cfg.iniciarComWindows = !!ligar;
    gravarConfig();
    return gravaLogin();
}

let pessoal = null;

try {
    pessoal = require("./casca-pessoal.js");
} catch (e) {
    pessoal = null;
}

const ctxPessoal = () => ({
    app: app,
    ipcMain: ipcMain,
    shell: shell,
    dadosDir: dadosDir,
    escreveAtomico: escreveAtomico,
    mostrar: hash => mostrar(hash)
});

if (pessoal) pessoal.registrar(ctxPessoal());

ipcMain.on("casca:pessoal", (ev => {
    ev.returnValue = !!pessoal;
}));

ipcMain.handle("app:info", (() => Object.assign({
    versao: app.getVersion(),
    dados: dadosDir()
}, pessoal && pessoal.info ? pessoal.info() : {})));

const estadoConfig = () => ({
    atalhoDesenho: cfg.atalhoDesenho !== false,
    miniAtivo: !!(mini && !mini.isDestroyed()),
    verificarAtualizacoes: cfg.verificarAtualizacoes !== false,
    versaoIgnorada: String(cfg.versaoIgnorada || ""),
    segundoPlano: !!cfg.segundoPlano,
    iniciarMinimizado: !!cfg.iniciarMinimizado,
    iniciarComWindows: iniciaComWindows(),
    podeIniciarComWindows: podeIniciarComWindows()
});

ipcMain.handle("exe:config:ler", (() => estadoConfig()));

ipcMain.handle("exe:config:definir", ((ev, p) => {
    p = p || {};
    if (typeof p.segundoPlano === "boolean") cfg.segundoPlano = p.segundoPlano;
    if (typeof p.iniciarMinimizado === "boolean") cfg.iniciarMinimizado = p.iniciarMinimizado;
    if (typeof p.verificarAtualizacoes === "boolean") cfg.verificarAtualizacoes = p.verificarAtualizacoes;
    if (typeof p.versaoIgnorada === "string") cfg.versaoIgnorada = p.versaoIgnorada.slice(0, 30);
    if (typeof p.atalhoDesenho === "boolean") {
        cfg.atalhoDesenho = p.atalhoDesenho;
        registraAtalhos();
    }
    gravarConfig();
    if (typeof p.iniciarComWindows === "boolean") aplicaIniciarComWindows(p.iniciarComWindows); else if (typeof p.iniciarMinimizado === "boolean" && iniciaComWindows()) gravaLogin();
    montaMenuBandeja();
    return estadoConfig();
}));

const ymdLocal = d => {
    d = d || new Date;
    const p = n => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
};

ipcMain.handle("espelho:gravar", (async (ev, texto, rotulo) => {
    try {
        if (typeof texto !== "string" || texto.length < 20 || texto.length > 6e7) return {
            ok: false
        };
        await fsp.mkdir(pastaEspelho(), {
            recursive: true
        });
        if (rotulo) {
            if (!/^[a-z0-9-]{1,40}$/.test(String(rotulo))) return {
                ok: false
            };
            const f = path.join(pastaEspelho(), "estado-" + rotulo + ".json");
            if (!fs.existsSync(f)) escreveAtomico(f, texto);
            return {
                ok: true
            };
        }
        escreveAtomico(path.join(pastaEspelho(), "estado.json"), texto);
        const dia = path.join(pastaEspelho(), "estado-" + ymdLocal() + ".json");
        let velho = true;
        try {
            velho = Date.now() - fs.statSync(dia).mtimeMs > 30 * 6e4;
        } catch (e) {}
        if (velho) {
            escreveAtomico(dia, texto);
            const antigos = (await fsp.readdir(pastaEspelho())).filter((n => /^estado-\d{4}-\d\d-\d\d\.json$/.test(n))).sort();
            for (const n of antigos.slice(0, Math.max(0, antigos.length - 10))) await fsp.unlink(path.join(pastaEspelho(), n)).catch((() => {}));
        }
        return {
            ok: true
        };
    } catch (e) {
        return {
            ok: false,
            erro: String(e && e.message || e)
        };
    }
}));

ipcMain.handle("espelho:ler", (async () => {
    try {
        const f = path.join(pastaEspelho(), "estado.json");
        const texto = await fsp.readFile(f, "utf8");
        return {
            texto: texto,
            em: fs.statSync(f).mtimeMs
        };
    } catch (e) {
        return null;
    }
}));

ipcMain.handle("espelho:abrirPasta", (async () => {
    try {
        await fsp.mkdir(pastaEspelho(), {
            recursive: true
        });
        const r = await shell.openPath(pastaEspelho());
        return {
            ok: !r,
            pasta: pastaEspelho()
        };
    } catch (e) {
        return {
            ok: false
        };
    }
}));

const ARQ_BACKUP = "arsenal-backup.json", RE_DIA = /^arsenal-backup-\d{4}-\d\d-\d\d\.json$/;

const espera = ms => new Promise((r => setTimeout(r, ms)));

async function escreveComTentativas(arq, texto) {
    let ultimo;
    for (let i = 0; i < 4; i++) {
        try {
            const tmp = arq + ".tmp";
            await fsp.writeFile(tmp, texto, "utf8");
            await fsp.rename(tmp, arq);
            return;
        } catch (e) {
            ultimo = e;
            await espera(400 * (i + 1));
        }
    }
    throw ultimo;
}

const traduzErro = e => {
    const c = e && e.code;
    if (c === "ENOENT") return "A pasta não foi encontrada (foi movida, apagada ou o OneDrive ainda não carregou).";
    if (c === "EACCES" || c === "EPERM") return "O Windows não deixou gravar nessa pasta (sem permissão ou arquivo em uso).";
    if (c === "ENOSPC") return "Sem espaço no disco.";
    return String(e && e.message || e);
};

ipcMain.handle("backup:estado", (async () => {
    if (!cfg.backupPasta) return {
        pasta: "",
        ok: false,
        erro: ""
    };
    try {
        await fsp.access(cfg.backupPasta, fs.constants.W_OK);
        return {
            pasta: cfg.backupPasta,
            ok: true
        };
    } catch (e) {
        return {
            pasta: cfg.backupPasta,
            ok: false,
            erro: traduzErro(e)
        };
    }
}));

ipcMain.handle("backup:escolher", (async () => {
    const r = await dialog.showOpenDialog(janela || undefined, {
        title: "Escolha a pasta do backup (por exemplo, uma pasta dentro do OneDrive)",
        properties: [ "openDirectory", "createDirectory" ],
        defaultPath: process.env.OneDrive || process.env.OneDriveConsumer || app.getPath("documents")
    });
    if (r.canceled || !r.filePaths[0]) return {
        cancelado: true
    };
    const pasta = r.filePaths[0];
    let existente = null;
    try {
        existente = await fsp.readFile(path.join(pasta, ARQ_BACKUP), "utf8");
    } catch (e) {}
    return {
        pasta: pasta,
        existente: existente
    };
}));

ipcMain.handle("backup:usar", (async (ev, pasta) => {
    if (typeof pasta !== "string" || !pasta) return {
        ok: false
    };
    try {
        await fsp.access(pasta, fs.constants.W_OK);
    } catch (e) {
        return {
            ok: false,
            erro: traduzErro(e)
        };
    }
    cfg.backupPasta = pasta;
    gravarConfig();
    return {
        ok: true,
        pasta: pasta
    };
}));

ipcMain.handle("backup:gravar", (async (ev, texto) => {
    if (!cfg.backupPasta) return {
        ok: false,
        erro: "Nenhuma pasta escolhida."
    };
    if (typeof texto !== "string" || texto.length < 20) return {
        ok: false,
        erro: "Dados inválidos."
    };
    try {
        await escreveComTentativas(path.join(cfg.backupPasta, ARQ_BACKUP), texto);
        await escreveComTentativas(path.join(cfg.backupPasta, "arsenal-backup-" + ymdLocal() + ".json"), texto);
        try {
            const nomes = (await fsp.readdir(cfg.backupPasta)).filter((n => RE_DIA.test(n))).sort();
            for (const n of nomes.slice(0, Math.max(0, nomes.length - 7))) await fsp.unlink(path.join(cfg.backupPasta, n));
        } catch (e) {}
        return {
            ok: true
        };
    } catch (e) {
        return {
            ok: false,
            erro: traduzErro(e)
        };
    }
}));

ipcMain.handle("backup:ler", (async () => {
    try {
        return {
            texto: await fsp.readFile(path.join(cfg.backupPasta, ARQ_BACKUP), "utf8")
        };
    } catch (e) {
        return {
            texto: null,
            erro: traduzErro(e)
        };
    }
}));

ipcMain.handle("backup:desligar", (() => {
    cfg.backupPasta = "";
    gravarConfig();
    return true;
}));

ipcMain.handle("backup:abrirPasta", (async () => {
    if (!cfg.backupPasta) return {
        ok: false
    };
    const r = await shell.openPath(cfg.backupPasta);
    return {
        ok: !r
    };
}));

ipcMain.handle("backup:descobrir", (async (ev, nome) => {
    if (typeof nome !== "string" || !nome || /[\\/]/.test(nome)) return null;
    const raizes = [ process.env.OneDrive, process.env.OneDriveConsumer, process.env.OneDriveCommercial, path.join(process.env.USERPROFILE || "", "OneDrive"), app.getPath("documents"), app.getPath("desktop") ].filter(Boolean);
    const vistos = new Set;
    async function busca(dir, nivel) {
        if (nivel > 3 || vistos.has(dir)) return null;
        vistos.add(dir);
        let itens;
        try {
            itens = await fsp.readdir(dir, {
                withFileTypes: true
            });
        } catch (e) {
            return null;
        }
        for (const it of itens) {
            if (!it.isDirectory() || it.name.startsWith(".") || /^(node_modules|AppData)$/i.test(it.name)) continue;
            const p = path.join(dir, it.name);
            if (it.name.toLowerCase() === nome.toLowerCase() && fs.existsSync(path.join(p, ARQ_BACKUP))) return p;
        }
        for (const it of itens) {
            if (it.isDirectory() && !it.name.startsWith(".") && !/^(node_modules|AppData)$/i.test(it.name)) {
                const r = await busca(path.join(dir, it.name), nivel + 1);
                if (r) return r;
            }
        }
        return null;
    }
    for (const r of raizes) {
        const achou = await busca(r, 0);
        if (achou) return achou;
    }
    return null;
}));

const PUB = (() => {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, "publicacao.json"), "utf8"));
    } catch (e) {
        return {};
    }
})();

const REPO_OK = /^[\w.-]+\/[\w.-]+$/;

const HOSTS_OK = /^(api\.github\.com|github\.com|objects\.githubusercontent\.com|release-assets\.githubusercontent\.com)$/;

const TESTE_ATU = !app.isPackaged && process.env.ARSENAL_ATU_TESTE ? process.env.ARSENAL_ATU_TESTE : "";

const hostOk = u => {
    try {
        const x = new URL(u);
        if (TESTE_ATU && x.hostname === "127.0.0.1") return true;
        return x.protocol === "https:" && HOSTS_OK.test(x.hostname);
    } catch (e) {
        return false;
    }
};

const linkDoacao = () => {
    try {
        const x = new URL(String(PUB.doacao || ""));
        return x.protocol === "https:" ? x.href : "";
    } catch (e) {
        return "";
    }
};

const pastaAtu = () => path.join(dadosDir(), "atualizacao");

const arqPendente = () => path.join(dadosDir(), "atualizacao-pendente.json");

const verNum = v => {
    const m = String(v || "").match(/(\d+)\.(\d+)\.(\d+)/);
    return m ? [ +m[1], +m[2], +m[3] ] : null;
};

const ehMaior = (a, b) => {
    for (let i = 0; i < 3; i++) {
        if (a[i] !== b[i]) return a[i] > b[i];
    }
    return false;
};

function pega(url, headers) {
    return new Promise(((ok, er) => {
        if (!hostOk(url)) return er(new Error("endereço não permitido"));
        const req = net.request({
            url: url,
            redirect: "manual"
        });
        const cab = Object.assign({
            "User-Agent": "Arsenal-de-Estudos",
            Accept: "application/vnd.github+json"
        }, headers || {});
        for (const k of Object.keys(cab)) req.setHeader(k, cab[k]);
        let saltos = 0;
        req.on("redirect", ((st, metodo, novo) => {
            if (++saltos > 5 || !hostOk(novo)) {
                req.abort();
                er(new Error("redirecionamento não permitido"));
            } else req.followRedirect();
        }));
        req.on("error", er);
        req.on("response", (res => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                res.on("data", (() => {}));
                er(new Error("HTTP " + res.statusCode));
                return;
            }
            let sorvedouro = null, fim = false, falha = null;
            const guardado = [];
            let terminou = null;
            res.on("data", (c => {
                if (sorvedouro) sorvedouro(c); else guardado.push(c);
            }));
            res.on("end", (() => {
                fim = true;
                if (terminou) terminou.ok();
            }));
            res.on("error", (e => {
                falha = e;
                if (terminou) terminou.er(e);
            }));
            const cabecalho = k => {
                const v = res.headers[String(k).toLowerCase()];
                return Array.isArray(v) ? v[0] : v == null ? null : v;
            };
            const consome = fn => new Promise(((ok2, er2) => {
                sorvedouro = fn;
                for (const c of guardado.splice(0)) fn(c);
                if (falha) return er2(falha);
                if (fim) return ok2();
                terminou = {
                    ok: ok2,
                    er: er2
                };
            }));
            ok({
                cabecalho: cabecalho,
                consome: consome,
                texto: async () => {
                    const p = [];
                    await consome((c => p.push(c)));
                    return Buffer.concat(p).toString("utf8");
                }
            });
        }));
        req.end();
    }));
}

let achada = null;

let preparada = null;

ipcMain.handle("pub:info", (() => ({
    repo: REPO_OK.test(String(PUB.repo || "")) ? PUB.repo : "",
    doacao: linkDoacao(),
    empacotado: app.isPackaged,
    versao: app.getVersion()
})));

ipcMain.handle("atu:verificar", (async () => {
    if (!REPO_OK.test(String(PUB.repo || ""))) return {
        ativo: false
    };
    try {
        const j = JSON.parse(await (await pega(TESTE_ATU || "https://api.github.com/repos/" + PUB.repo + "/releases/latest")).texto());
        const nova = verNum(j.tag_name), atual = verNum(app.getVersion());
        const zip = (j.assets || []).find((a => /\.zip$/i.test(a.name))), sums = (j.assets || []).find((a => /^SHA256SUMS\.txt$/i.test(a.name)));
        const maior = !!(nova && atual && ehMaior(nova, atual));
        achada = maior && zip && sums ? {
            j: j,
            zip: zip,
            sums: sums
        } : null;
        return {
            ativo: true,
            atual: app.getVersion(),
            nova: String(j.tag_name || "").replace(/^v/i, ""),
            disponivel: !!achada,
            semAnexos: maior && !achada,
            nome: String(j.name || j.tag_name || ""),
            notas: String(j.body || "").slice(0, 1e4),
            publicadoEm: j.published_at || "",
            tamanho: zip ? zip.size : 0,
            podeAplicar: app.isPackaged
        };
    } catch (e) {
        return {
            ativo: true,
            erro: String(e && e.message || e)
        };
    }
}));

const procuraExe = async (dir, nome, nivel) => {
    if (nivel > 4) return null;
    let itens;
    try {
        itens = await fsp.readdir(dir, {
            withFileTypes: true
        });
    } catch (e) {
        return null;
    }
    if (itens.some((i => i.isFile() && i.name.toLowerCase() === nome.toLowerCase()))) return dir;
    for (const i of itens) {
        if (i.isDirectory()) {
            const r = await procuraExe(path.join(dir, i.name), nome, nivel + 1);
            if (r) return r;
        }
    }
    return null;
};

ipcMain.handle("atu:baixar", (async () => {
    try {
        if (!achada) throw new Error("Verifique as atualizações primeiro.");
        const {j: j, zip: zip, sums: sums} = achada;
        await fsp.rm(pastaAtu(), {
            recursive: true,
            force: true
        });
        await fsp.mkdir(pastaAtu(), {
            recursive: true
        });
        const arq = path.join(pastaAtu(), "nova-versao.zip");
        const r = await pega(zip.browser_download_url, {
            Accept: "application/octet-stream"
        });
        const total = zip.size || +r.cabecalho("content-length") || 0;
        let lido = 0, ultimo = 0;
        const hash = crypto.createHash("sha256");
        const saida = fs.createWriteStream(arq);
        await r.consome((value => {
            hash.update(value);
            lido += value.length;
            saida.write(value);
            if (Date.now() - ultimo > 250 && janela && !janela.isDestroyed()) {
                ultimo = Date.now();
                janela.webContents.send("atu:progresso", {
                    lido: lido,
                    total: total
                });
            }
        }));
        await new Promise(((ok, er) => saida.end((e => e ? er(e) : ok()))));
        const calculado = hash.digest("hex");
        const txt = await (await pega(sums.browser_download_url, {
            Accept: "application/octet-stream"
        })).texto();
        const linha = txt.split(/\r?\n/).map((l => l.trim().match(/^([a-f0-9]{64})\s+\*?(.+)$/i))).find((m => m && m[2] === zip.name));
        if (!linha || linha[1].toLowerCase() !== calculado) {
            await fsp.rm(arq, {
                force: true
            });
            throw new Error("A conferência do arquivo baixado falhou (o SHA-256 não bate). Nada foi alterado.");
        }
        const destino = path.join(pastaAtu(), "nova");
        await fsp.mkdir(destino, {
            recursive: true
        });
        await new Promise(((ok, er) => cp.execFile(path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe"), [ "-xf", arq, "-C", destino ], {
            windowsHide: true
        }, (e => e ? er(new Error("Não consegui abrir o arquivo baixado.")) : ok()))));
        const pasta = await procuraExe(destino, path.basename(process.execPath), 0);
        if (!pasta) throw new Error("O arquivo baixado não tem o programa dentro.");
        preparada = {
            pasta: pasta,
            versao: String(j.tag_name || "").replace(/^v/i, ""),
            notas: String(j.body || "").slice(0, 1e4)
        };
        return {
            ok: true
        };
    } catch (e) {
        return {
            ok: false,
            erro: String(e && e.message || e)
        };
    }
}));

ipcMain.handle("atu:backup", (async (ev, texto, versao) => {
    try {
        if (typeof texto !== "string" || texto.length < 20 || texto.length > 6e7) return {
            ok: false,
            erro: "Dados inválidos."
        };
        const dir = path.join(dadosDir(), "backups-atualizacao");
        await fsp.mkdir(dir, {
            recursive: true
        });
        const d = new Date, p2 = n => String(n).padStart(2, "0");
        const nome = "dados-antes-da-v" + String(versao || "").replace(/[^\w.-]/g, "") + "-" + ymdLocal(d) + "-" + p2(d.getHours()) + p2(d.getMinutes()) + ".json";
        escreveAtomico(path.join(dir, nome), texto);
        const todos = (await fsp.readdir(dir)).filter((n => /^dados-antes-da-v.*\.json$/.test(n))).sort();
        for (const n of todos.slice(0, Math.max(0, todos.length - 5))) await fsp.unlink(path.join(dir, n)).catch((() => {}));
        return {
            ok: true,
            arquivo: path.join(dir, nome)
        };
    } catch (e) {
        return {
            ok: false,
            erro: traduzErro(e)
        };
    }
}));

ipcMain.handle("atu:aplicar", (() => {
    try {
        let dest = path.dirname(process.execPath), exe = path.basename(process.execPath), pidEspera = process.pid;
        const teste = !!(TESTE_ATU && process.env.ARSENAL_ATU_DESTINO);
        if (teste) {
            dest = process.env.ARSENAL_ATU_DESTINO;
            exe = "teste.exe";
            pidEspera = 999999;
        }
        if (!app.isPackaged && !teste) return {
            ok: false,
            erro: "A troca automática só funciona no programa empacotado."
        };
        if (!preparada) return {
            ok: false,
            erro: "Baixe a atualização primeiro."
        };
        try {
            const t = path.join(dest, ".teste-escrita");
            fs.writeFileSync(t, "x");
            fs.unlinkSync(t);
        } catch (e) {
            return {
                ok: false,
                erro: "A pasta do programa está protegida (sem permissão para gravar). Mova o Arsenal para uma pasta sua, como Documentos, ou atualize à mão."
            };
        }
        const bak = path.join(pastaAtu(), "versao-anterior"), falha = path.join(pastaAtu(), "FALHA.txt");
        const q = x => '"' + x.replace(/[\\\/]+$/, "") + '"';
        const linhas = [ "@echo off", "chcp 65001 >nul", "setlocal", "set N=" + pidEspera, ":espera", "set VIVO=", 'for /f "tokens=2" %%a in (\'tasklist /FI "PID eq %N%" /NH 2^>nul\') do if "%%a"=="%N%" set VIVO=1', "if defined VIVO ( ping -n 2 127.0.0.1 >nul & goto espera )", "rd /s /q " + q(bak) + " 2>nul", "robocopy " + q(dest) + " " + q(bak) + " /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP >nul", "robocopy " + q(preparada.pasta) + " " + q(dest) + " /E /R:3 /W:1 /NFL /NDL /NJH /NJS /NP >nul", "if errorlevel 8 ( robocopy " + q(bak) + " " + q(dest) + " /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP >nul & echo falhou> " + q(falha) + " )", 'start "" ' + q(path.join(dest, exe)) ];
        const script = path.join(pastaAtu(), "aplicar.cmd");
        fs.writeFileSync(script, linhas.join("\r\n") + "\r\n", "utf8");
        fs.writeFileSync(arqPendente(), JSON.stringify({
            de: app.getVersion(),
            para: preparada.versao,
            notas: preparada.notas
        }), "utf8");
        const registro = fs.openSync(path.join(pastaAtu(), "aplicar.log"), "w");
        cp.spawn("cmd.exe", [ "/c", script ], {
            detached: true,
            stdio: [ "ignore", registro, registro ],
            windowsHide: true
        }).unref();
        if (!teste) setTimeout((() => sair()), 500);
        return {
            ok: true,
            script: teste ? script : undefined
        };
    } catch (e) {
        return {
            ok: false,
            erro: String(e && e.message || e)
        };
    }
}));

ipcMain.handle("atu:resultado", (() => {
    try {
        const pend = JSON.parse(fs.readFileSync(arqPendente(), "utf8"));
        const deuErro = fs.existsSync(path.join(pastaAtu(), "FALHA.txt"));
        fs.unlinkSync(arqPendente());
        if (deuErro) {
            fs.rmSync(path.join(pastaAtu(), "FALHA.txt"), {
                force: true
            });
            return {
                estado: "falhou",
                de: pend.de,
                para: pend.para
            };
        }
        if (pend.para === app.getVersion()) {
            fs.rm(pastaAtu(), {
                recursive: true,
                force: true
            }, (() => {}));
            return {
                estado: "ok",
                de: pend.de,
                para: pend.para,
                notas: pend.notas
            };
        }
        return {
            estado: "falhou",
            de: pend.de,
            para: pend.para
        };
    } catch (e) {
        return null;
    }
}));

let desenho = null, desenhoDisplay = null;

const pastaPrints = () => path.join(app.getPath("pictures"), "Arsenal de Estudos");

function criaDesenho() {
    const b = desenhoDisplay.bounds;
    desenho = new BrowserWindow({
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        transparent: true,
        frame: false,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        skipTaskbar: true,
        hasShadow: false,
        alwaysOnTop: true,
        show: false,
        fullscreenable: false,
        backgroundColor: "#00000000",
        webPreferences: {
            preload: path.join(__dirname, "preload-desenho.js"),
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
            backgroundThrottling: false
        }
    });
    desenho.setAlwaysOnTop(true, "screen-saver");
    desenho.loadFile(path.join(__dirname, "app", "overlay.html"));
    desenho.on("closed", (() => {
        desenho = null;
    }));
    return new Promise((ok => desenho.webContents.once("did-finish-load", ok)));
}

async function alternarDesenho() {
    if (desenho && !desenho.isDestroyed() && desenho.isVisible()) {
        desenho.hide();
        return;
    }
    const disp = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    if (desenho && !desenho.isDestroyed() && desenhoDisplay && desenhoDisplay.id !== disp.id) {
        desenho.destroy();
        desenho = null;
    }
    desenhoDisplay = disp;
    if (!desenho || desenho.isDestroyed()) await criaDesenho();
    desenho.setBounds(disp.bounds);
    desenho.setAlwaysOnTop(true, "screen-saver");
    desenho.show();
    desenho.focus();
    desenho.webContents.send("desenho:mostrou");
}

ipcMain.handle("desenho:abrir", (() => {
    alternarDesenho();
    return true;
}));

ipcMain.handle("desenho:esconder", (() => {
    if (desenho && !desenho.isDestroyed()) desenho.hide();
    return true;
}));

ipcMain.handle("desenho:mouse", ((ev, passa) => {
    if (desenho && !desenho.isDestroyed()) desenho.setIgnoreMouseEvents(!!passa, {
        forward: true
    });
    return true;
}));

ipcMain.handle("desenho:capturar", (async () => {
    try {
        if (!desenho || desenho.isDestroyed() || !desenhoDisplay) return {
            ok: false,
            erro: "A camada de desenho não está aberta."
        };
        const d = desenhoDisplay, f = d.scaleFactor || 1;
        await espera(180);
        const fontes = await desktopCapturer.getSources({
            types: [ "screen" ],
            thumbnailSize: {
                width: Math.round(d.bounds.width * f),
                height: Math.round(d.bounds.height * f)
            }
        });
        const fonte = fontes.find((x => String(x.display_id) === String(d.id))) || fontes[0];
        if (!fonte) return {
            ok: false,
            erro: "Não consegui capturar a tela."
        };
        await fsp.mkdir(pastaPrints(), {
            recursive: true
        });
        const dt = new Date, p2 = n => String(n).padStart(2, "0");
        const arq = path.join(pastaPrints(), "arsenal-" + ymdLocal(dt).replace(/-/g, "") + "-" + p2(dt.getHours()) + p2(dt.getMinutes()) + p2(dt.getSeconds()) + ".png");
        await fsp.writeFile(arq, fonte.thumbnail.toPNG());
        let copiado = false;
        try {
            clipboard.writeImage(fonte.thumbnail);
            copiado = true;
        } catch (e) {}
        return {
            ok: true,
            arquivo: arq,
            copiado: copiado
        };
    } catch (e) {
        return {
            ok: false,
            erro: String(e && e.message || e)
        };
    }
}));

ipcMain.handle("relatorio:pdf", (async (ev, html, nome) => {
    let w = null;
    try {
        if (typeof html !== "string" || html.length < 20 || html.length > 8e6) return {
            ok: false,
            erro: "Relatório inválido."
        };
        w = new BrowserWindow({
            show: false,
            width: 900,
            height: 1200,
            webPreferences: {
                sandbox: true,
                contextIsolation: true,
                nodeIntegration: false,
                javascript: false
            }
        });
        await w.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
        const pdf = await w.webContents.printToPDF({
            printBackground: true,
            pageSize: "A4",
            margins: {
                marginType: "default"
            }
        });
        const dir = path.join(app.getPath("documents"), "Arsenal de Estudos");
        await fsp.mkdir(dir, {
            recursive: true
        });
        const base = String(nome || "relatorio-arsenal").replace(/[^\w.-]/g, "").slice(0, 60) || "relatorio-arsenal";
        const arq = path.join(dir, base + ".pdf");
        await fsp.writeFile(arq, pdf);
        shell.showItemInFolder(arq);
        return {
            ok: true,
            arquivo: arq
        };
    } catch (e) {
        return {
            ok: false,
            erro: String(e && e.message || e)
        };
    } finally {
        try {
            if (w && !w.isDestroyed()) w.destroy();
        } catch (e) {}
    }
}));

ipcMain.handle("desenho:abrirPasta", (async () => {
    try {
        await fsp.mkdir(pastaPrints(), {
            recursive: true
        });
        const r = await shell.openPath(pastaPrints());
        return {
            ok: !r
        };
    } catch (e) {
        return {
            ok: false
        };
    }
}));

function registraAtalhos() {
    try {
        globalShortcut.unregisterAll();
    } catch (e) {}
    if (cfg.atalhoDesenho === false) return;
    try {
        if (!globalShortcut.register("Alt+Shift+D", (() => {
            alternarDesenho();
        }))) console.warn("atalho Alt+Shift+D já está em uso");
    } catch (e) {
        console.warn("atalho", e);
    }
}

let mini = null, estadoMini = {
    txt: "00:00",
    status: "parado",
    modo: "livre",
    disc: ""
};

const miniAberta = () => !!(mini && !mini.isDestroyed());

const avisaMini = () => {
    if (janela && !janela.isDestroyed()) janela.webContents.send("mini:aberto", miniAberta());
};

function posicaoMini(W, H) {
    const wa = screen.getPrimaryDisplay().workArea, canto = cfg.miniCanto || "baixo-direita", m = 16;
    const x = /esquerda/.test(canto) ? wa.x + m : wa.x + wa.width - W - m, y = /^cima/.test(canto) ? wa.y + m : wa.y + wa.height - H - m;
    return {
        x: x,
        y: y
    };
}

function abrirMini() {
    if (miniAberta()) {
        mini.showInactive();
        return;
    }
    const W = 218, H = 78;
    let pos = posicaoMini(W, H);
    const p0 = cfg.miniPos;
    if (p0 && typeof p0.x === "number" && screen.getAllDisplays().some((d => p0.x >= d.workArea.x - 20 && p0.x + W <= d.workArea.x + d.workArea.width + 20 && p0.y >= d.workArea.y - 20 && p0.y + H <= d.workArea.y + d.workArea.height + 20))) pos = p0;
    mini = new BrowserWindow({
        x: pos.x,
        y: pos.y,
        width: W,
        height: H,
        frame: false,
        transparent: true,
        resizable: false,
        maximizable: false,
        minimizable: false,
        skipTaskbar: true,
        hasShadow: false,
        alwaysOnTop: true,
        show: false,
        backgroundColor: "#00000000",
        webPreferences: {
            preload: path.join(__dirname, "preload-mini.js"),
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
            backgroundThrottling: false
        }
    });
    mini.setAlwaysOnTop(true, "screen-saver");
    mini.loadFile(path.join(__dirname, "app", "mini.html"));
    mini.once("ready-to-show", (() => {
        mini.showInactive();
        mini.webContents.send("mini:estado", estadoMini);
    }));
    mini.on("moved", (() => {
        const b = mini.getBounds();
        cfg.miniPos = {
            x: b.x,
            y: b.y
        };
        gravarConfig();
    }));
    mini.on("closed", (() => {
        mini = null;
        avisaMini();
        montaMenuBandeja();
    }));
    cfg.miniAtivo = true;
    gravarConfig();
    avisaMini();
    montaMenuBandeja();
}

function fecharMini(lembrar) {
    if (miniAberta()) mini.close();
    if (lembrar !== false) {
        cfg.miniAtivo = false;
        gravarConfig();
    }
}

ipcMain.handle("mini:abrir", (() => {
    abrirMini();
    return true;
}));

ipcMain.handle("mini:fechar", (() => {
    fecharMini();
    return true;
}));

ipcMain.handle("mini:ler", (() => estadoMini));

ipcMain.on("mini:estado", ((ev, st) => {
    if (st && typeof st === "object") {
        estadoMini = {
            txt: String(st.txt || "").slice(0, 12),
            status: String(st.status || ""),
            modo: String(st.modo || ""),
            disc: String(st.disc || "").slice(0, 60)
        };
        if (miniAberta()) mini.webContents.send("mini:estado", estadoMini);
    }
}));

ipcMain.on("mini:cmd", ((ev, c) => {
    if (janela && !janela.isDestroyed() && /^(alternar|abrir)$/.test(String(c))) {
        if (c === "abrir") mostrar("#/painel?ir=cronometro&n=" + Date.now() % 1e6); else janela.webContents.send("mini:cmd", c);
    }
}));

ipcMain.on("mini:menu", (() => {
    if (!miniAberta()) return;
    const canto = (id, rot) => ({
        label: rot,
        type: "radio",
        checked: (cfg.miniCanto || "baixo-direita") === id,
        click: () => {
            cfg.miniCanto = id;
            cfg.miniPos = null;
            gravarConfig();
            const b = mini.getBounds(), p = posicaoMini(b.width, b.height);
            mini.setPosition(p.x, p.y);
        }
    });
    Menu.buildFromTemplate([ canto("cima-esquerda", "Canto: cima, esquerda"), canto("cima-direita", "Canto: cima, direita"), canto("baixo-esquerda", "Canto: baixo, esquerda"), canto("baixo-direita", "Canto: baixo, direita"), {
        type: "separator"
    }, {
        label: "Abrir o Arsenal",
        click: () => mostrar("#/painel?ir=cronometro&n=" + Date.now() % 1e6)
    }, {
        label: "Fechar o cronômetro fixo",
        click: () => fecharMini()
    } ]).popup({
        window: mini
    });
}));

function mostrar(hash) {
    if (!janela || janela.isDestroyed()) criarJanela(false);
    if (janela.isMinimized()) janela.restore();
    janela.show();
    janela.focus();
    if (hash) janela.webContents.send("app:navegar", hash);
}

ipcMain.handle("app:sair", (() => {
    sair();
    return true;
}));

ipcMain.handle("app:chamar", (() => {
    if (!janela || janela.isDestroyed()) return false;
    if (!janela.isVisible()) janela.showInactive();
    janela.flashFrame(true);
    setTimeout((() => {
        try {
            janela.flashFrame(false);
        } catch (e) {}
    }), 6e3);
    return true;
}));

function criarJanela(oculta) {
    janela = new BrowserWindow({
        width: 1360,
        height: 880,
        minWidth: 900,
        minHeight: 600,
        title: "Arsenal de Estudos",
        icon: path.join(__dirname, "icone.ico"),
        backgroundColor: "#f2f1ec",
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
            spellcheck: false,
            backgroundThrottling: false,
            autoplayPolicy: "no-user-gesture-required"
        }
    });
    janela.once("ready-to-show", (() => {
        if (!oculta) janela.show();
    }));
    janela.loadFile(path.join(__dirname, "app", "index.html"));
    janela.webContents.setWindowOpenHandler((({url: url}) => {
        if (/^https?:\/\//i.test(url)) shell.openExternal(url);
        return {
            action: "deny"
        };
    }));
    janela.webContents.on("will-navigate", ((ev, url) => {
        const semHash = u => String(u || "").split("#")[0];
        if (semHash(url) === semHash(janela.webContents.getURL())) return;
        ev.preventDefault();
        if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }));
    janela.on("close", (ev => {
        if (saindo || !cfg.segundoPlano || !bandeja) return;
        ev.preventDefault();
        janela.hide();
        if (!cfg.avisoSegundoPlano) {
            cfg.avisoSegundoPlano = true;
            gravarConfig();
            try {
                new Notification({
                    title: "O Arsenal continua em segundo plano",
                    body: "Clique no ícone perto do relógio para abrir. Para fechar de vez: botão direito no ícone › Sair.",
                    silent: true
                }).show();
            } catch (e) {}
        }
    }));
    janela.on("session-end", (() => {
        saindo = true;
    }));
    janela.on("closed", (() => {
        janela = null;
    }));
}

function montaMenuBandeja() {
    if (!bandeja) return;
    bandeja.setContextMenu(Menu.buildFromTemplate([ {
        label: "Abrir o Arsenal",
        click: () => mostrar()
    }, {
        label: "Ir ao cronômetro",
        click: () => mostrar("#/painel?ir=cronometro&n=" + Date.now() % 1e6)
    }, {
        label: "Cronômetro fixo na tela",
        type: "checkbox",
        checked: miniAberta(),
        click: it => {
            if (it.checked) abrirMini(); else fecharMini();
        }
    }, {
        label: "Desenhar na tela (Alt+Shift+D)",
        click: () => {
            alternarDesenho();
        }
    }, {
        type: "separator"
    }, {
        label: "Iniciar com o Windows",
        type: "checkbox",
        checked: iniciaComWindows(),
        enabled: podeIniciarComWindows(),
        click: it => {
            aplicaIniciarComWindows(it.checked);
            montaMenuBandeja();
            if (janela && !janela.isDestroyed()) janela.webContents.send("app:config-mudou");
        }
    }, {
        label: "Continuar em segundo plano ao fechar a janela",
        type: "checkbox",
        checked: !!cfg.segundoPlano,
        click: it => {
            cfg.segundoPlano = it.checked;
            gravarConfig();
            if (janela && !janela.isDestroyed()) janela.webContents.send("app:config-mudou");
        }
    }, {
        type: "separator"
    }, {
        label: "Sair do Arsenal",
        click: () => sair()
    } ]));
}

function criarBandeja() {
    try {
        bandeja = new Tray(nativeImage.createFromPath(path.join(__dirname, "icone.ico")));
        bandeja.setToolTip("Arsenal de Estudos");
        bandeja.on("click", (() => mostrar()));
        montaMenuBandeja();
    } catch (e) {
        console.error("bandeja", e);
        bandeja = null;
    }
}

let saindoJa = false;

function sair() {
    if (saindoJa) return;
    saindoJa = true;
    saindo = true;
    const fecha = () => {
        try {
            if (bandeja) bandeja.destroy();
        } catch (e) {}
        app.quit();
    };
    if (!janela || janela.isDestroyed()) return fecha();
    let feito = false;
    const fim = () => {
        if (!feito) {
            feito = true;
            fecha();
        }
    };
    ipcMain.once("app:salvo", fim);
    try {
        janela.webContents.send("app:salvar");
    } catch (e) {
        return fim();
    }
    setTimeout(fim, 2500);
}

function menu() {
    Menu.setApplicationMenu(Menu.buildFromTemplate([ {
        label: "Arsenal",
        submenu: [ {
            role: "reload",
            label: "Recarregar"
        }, {
            role: "togglefullscreen",
            label: "Tela cheia"
        }, {
            type: "separator"
        }, {
            label: "Esconder na bandeja",
            click: () => {
                if (janela) janela.close();
            }
        }, {
            label: "Sair",
            click: () => sair()
        } ]
    }, {
        label: "Zoom",
        submenu: [ {
            role: "zoomIn",
            label: "Aumentar"
        }, {
            role: "zoomOut",
            label: "Diminuir"
        }, {
            role: "resetZoom",
            label: "Tamanho normal"
        } ]
    }, {
        label: "Editar",
        submenu: [ {
            role: "undo",
            label: "Desfazer"
        }, {
            role: "redo",
            label: "Refazer"
        }, {
            type: "separator"
        }, {
            role: "cut",
            label: "Recortar"
        }, {
            role: "copy",
            label: "Copiar"
        }, {
            role: "paste",
            label: "Colar"
        }, {
            role: "selectAll",
            label: "Selecionar tudo"
        } ]
    } ]));
}

app.on("second-instance", (() => mostrar()));

app.on("before-quit", (() => {
    saindo = true;
}));

app.on("will-quit", (() => {
    try {
        globalShortcut.unregisterAll();
    } catch (e) {}
}));

app.on("window-all-closed", (() => {
    if (saindo || !cfg.segundoPlano || !bandeja) app.quit();
}));

if (temTrava) {
    app.whenReady().then((() => {
        lerConfig();
        if (iniciaComWindows()) gravaLogin();
        menu();
        if (pessoal) pessoal.iniciar(ctxPessoal());
        criarBandeja();
        registraAtalhos();
        if (cfg.miniAtivo) setTimeout(abrirMini, 1200);
        criarJanela(iniciouOculto && !!bandeja && cfg.segundoPlano);
    }));
}