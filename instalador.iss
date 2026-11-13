; Instalador do Arsenal de Estudos (Inno Setup 6). Quem compila é o fluxo do GitHub (.github/workflows/release.yml),
; que passa Versao, Origem, Leia, Icone e Saida. Para compilar à mão:
;   ISCC /DVersao=1.0.0 /DOrigem=<pasta do programa> /DLeia=<LEIA-ME.txt> /DIcone=icone.ico /DSaida=. instalador.iss
; Instala só para o usuário atual (sem pedir administrador) em %LOCALAPPDATA%\Programs\Arsenal de Estudos: a atualização
; automática do programa troca arquivos dentro da própria pasta, então ela precisa ser gravável sem permissão especial.
; Os dados de estudo ficam em %APPDATA%\Arsenal de Estudos - Publico e NUNCA são apagados pelo instalador nem pelo desinstalador.

#define Nome "Arsenal de Estudos"
#define Exe "Arsenal de Estudos.exe"

[Setup]
AppId={{6C1E5B7A-3D44-4F0B-9A52-0A5E4A1D2B77}
AppName={#Nome}
AppVersion={#Versao}
AppVerName={#Nome} {#Versao}
AppPublisher={#Nome}
DefaultDirName={autopf}\{#Nome}
DefaultGroupName={#Nome}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
SetupIconFile={#Icone}
UninstallDisplayIcon={app}\{#Exe}
UninstallDisplayName={#Nome}
OutputDir={#Saida}
OutputBaseFilename=Arsenal-de-Estudos-Instalador-v{#Versao}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no
VersionInfoVersion={#Versao}
VersionInfoProductName={#Nome}
VersionInfoDescription=Instalador do {#Nome}

[Languages]
Name: "ptbr"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "Criar um atalho na Área de Trabalho"; GroupDescription: "Atalhos:"; Flags: unchecked

[Files]
Source: "{#Origem}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "{#Leia}"; DestDir: "{app}"; DestName: "LEIA-ME.txt"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#Nome}"; Filename: "{app}\{#Exe}"
Name: "{autodesktop}\{#Nome}"; Filename: "{app}\{#Exe}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#Exe}"; Description: "Abrir o {#Nome} agora"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; arquivos que a atualização automática deixou dentro da pasta do programa
Type: filesandordirs; Name: "{app}"
