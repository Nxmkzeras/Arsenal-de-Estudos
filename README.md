# Arsenal de Estudos

Aplicativo **gratuito** para Windows para organizar o estudo para concursos: edital (matérias e assuntos), ciclo de estudos, cronômetro, plano do dia, revisões espaçadas, caderno de erros e flashcards, pastas de questões, estatísticas, sons de foco, caneta e marca-texto por cima da tela e cronômetro fixo no canto.

Funciona offline, sem conta e sem servidor. Seus dados ficam só no seu computador.

## Baixar

Vá em **[Releases](https://github.com/Nxmkzeras/Arsenal-de-Estudos/releases/latest)** e escolha um dos dois:

- **Instalador** (`Arsenal-de-Estudos-Instalador-vX.Y.Z.exe`) — o caminho mais fácil: instala só para você, sem pedir senha de administrador,
  cria atalho no Menu Iniciar e aparece em "Aplicativos instalados" para desinstalar quando quiser.
- **Pasta compactada** (`Arsenal-de-Estudos-vX.Y.Z.zip`) — se você prefere não instalar nada: extraia numa pasta sua (como Documentos)
  e abra `Programa/Arsenal de Estudos.exe`.

Seus dados ficam na sua pasta de usuário e **não** são apagados ao atualizar ou desinstalar.

O programa avisa sozinho quando sai versão nova, mostra o que mudou, faz backup dos seus dados e atualiza se você aceitar.

## É seguro? Como conferir

Você não precisa confiar em mim: dá para conferir.

1. **O código está todo aqui**, para qualquer pessoa ler. Não há nada escondido.
2. **O `.zip` é compilado pelo próprio GitHub** (veja a aba *Actions*), a partir deste código, e não enviado por mim. Cada versão traz o arquivo `SHA256SUMS.txt`.
3. **Confira o arquivo baixado** no PowerShell (o resultado tem de ser igual ao do `SHA256SUMS.txt`):

   ```powershell
   Get-FileHash .\Arsenal-de-Estudos-vX.Y.Z.zip -Algorithm SHA256
   ```

4. Se tiver o GitHub CLI, dá para conferir a origem do arquivo: `gh attestation verify Arsenal-de-Estudos-vX.Y.Z.zip -R Nxmkzeras/Arsenal-de-Estudos`.
5. Você pode enviar o `.zip` ao [VirusTotal](https://www.virustotal.com) e comparar.

> ## ⚠️ O Windows VAI mostrar "O Windows protegeu o computador" na primeira vez
>
> **É normal e não é vírus.** O programa é gratuito e não tem a assinatura digital paga (centenas de dólares por ano).
> Para abrir: clique em **Mais informações** e depois em **Executar assim mesmo**. Só acontece na primeira vez.
>
> Quer ter certeza? Envie o `.zip` ao **[VirusTotal](https://www.virustotal.com)** (grátis) antes de abrir.

## Privacidade

- Nada seu é enviado para a internet.
- A única conexão é uma consulta pública ao GitHub para saber se há versão nova (dá para desligar em Ajustes).
- Os dados ficam em `%APPDATA%\Arsenal de Estudos - Publico`, com uma cópia de segurança em disco. Faça também o backup em Ajustes.

## Apoie o projeto

O Arsenal é gratuito e continua assim. Se ele ajudou nos seus estudos, dá para apoiar: [https://link.mercadopago.com.br/arsenaldeestudos](https://link.mercadopago.com.br/arsenaldeestudos).

## Licença

Código sob a **PolyForm Noncommercial License 1.0.0**: pode usar, estudar e modificar para fins não comerciais; não pode vender nem usar comercialmente. Veja [LICENSE](LICENSE) e [AVISOS-DE-TERCEIROS.md](AVISOS-DE-TERCEIROS.md).

## Compilar você mesmo

```powershell
npm install --no-save @electron/packager@20.3.0
npx electron-packager . "Arsenal de Estudos" --platform=win32 --arch=x64 --electron-version=45.2.3 --asar --icon=icone.ico --prune=false --ignore="/node_modules" --ignore="/\.github"
```

O fluxo completo (zip, hash e publicação) está em `.github/workflows/release.yml`.
