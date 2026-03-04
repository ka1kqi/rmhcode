; rmhcode Inno Setup Installer Script
; Requires: Inno Setup 6.x (https://jrsoftware.org/isinfo.php)
;
; This installer:
;   1. Checks for Node.js >= 18 prerequisite
;   2. Installs rmhcode files to Program Files
;   3. Runs npm install to patch the CLI
;   4. Adds to system PATH
;   5. Creates Start Menu shortcuts
;   6. Registers in Add/Remove Programs
;   7. Full uninstaller

#define MyAppName "rmhcode"
#define MyAppVersion "1.1.1"
#define MyAppPublisher "RMH Studios"
#define MyAppURL "https://rmhstudios.com"
#define MyAppExeName "rmhcode.cmd"

[Setup]
AppId={{B8A7C3D1-5E2F-4A9B-8C6D-1F3E5A7B9C2D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL=https://github.com/ka1kqi/rmhcode/issues
DefaultDirName={userappdata}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
LicenseFile=..\LICENSE
OutputDir=..\dist
OutputBaseFilename=rmhcode-{#MyAppVersion}-setup-x64
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
ChangesEnvironment=yes
MinVersion=10.0

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
WelcomeLabel2=This will install [name/ver] on your computer.%n%nrmhcode is a rebranded Claude Code CLI with custom theming and RMH Builds integration.%n%nPrerequisites: Node.js >= 18 and npm must be installed.

[Files]
; Core project files
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package-lock.json"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\bin\rmhcode.mjs"; DestDir: "{app}\bin"; Flags: ignoreversion
Source: "..\src\**"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\scripts\**"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\prompts\**"; DestDir: "{app}\prompts"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
Source: "..\assets\**"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
Source: "icon.ico"; DestDir: "{app}"; Flags: ignoreversion
; Wrapper scripts are generated post-install

[Icons]
Name: "{group}\rmhcode Terminal"; Filename: "cmd.exe"; Parameters: "/k rmhcode"; WorkingDir: "{userdocs}"; IconFilename: "{app}\icon.ico"; Comment: "Launch rmhcode CLI"
Name: "{group}\Uninstall rmhcode"; Filename: "{uninstallexe}"
Name: "{userdesktop}\rmhcode"; Filename: "cmd.exe"; Parameters: "/k rmhcode"; WorkingDir: "{userdocs}"; IconFilename: "{app}\icon.ico"; Comment: "Launch rmhcode CLI"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"
Name: "addtopath"; Description: "Add rmhcode to PATH"; GroupDescription: "System integration:"; Flags: checkedonce

[Run]
; Post-install: npm install to fetch dependencies and patch CLI
Filename: "cmd.exe"; Parameters: "/c npm install 2>&1"; WorkingDir: "{app}"; StatusMsg: "Installing dependencies and patching CLI..."; Flags: runhidden waituntilterminated
; Create wrapper scripts
Filename: "cmd.exe"; Parameters: "/c echo @echo off> ""{app}\bin\rmhcode.cmd"" && echo node ""%~dp0rmhcode.mjs"" %*>> ""{app}\bin\rmhcode.cmd"""; StatusMsg: "Creating launcher scripts..."; Flags: runhidden waituntilterminated
; Optional: launch after install
Filename: "cmd.exe"; Parameters: "/k rmhcode --version"; WorkingDir: "{userdocs}"; Description: "Launch rmhcode"; Flags: postinstall nowait skipifsilent shellexec

[UninstallDelete]
Type: filesandirs; Name: "{app}\node_modules"
Type: filesandirs; Name: "{app}\patched"
Type: dirifempty; Name: "{app}"

[Code]
const
  EnvironmentKey = 'Environment';

// Check Node.js is installed and >= 18
function CheckNodeJS(): Boolean;
var
  ResultCode: Integer;
  Output: AnsiString;
  NodeMajor: Integer;
  TmpFile: String;
begin
  Result := False;

  // Check if node exists
  if not RegQueryStringValue(HKLM, 'SOFTWARE\Node.js', 'InstallPath', TmpFile) then
  begin
    // Try running node directly (might be in PATH)
    if not Exec('cmd.exe', '/c node --version > nul 2>&1', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    begin
      Exit;
    end;
    if ResultCode <> 0 then
      Exit;
  end;

  // Get Node.js version
  TmpFile := ExpandConstant('{tmp}\nodeversion.txt');
  Exec('cmd.exe', '/c node -e "console.log(process.versions.node.split(''.'')[0])" > "' + TmpFile + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

  if ResultCode = 0 then
  begin
    if LoadStringFromFile(TmpFile, Output) then
    begin
      Output := Trim(String(Output));
      NodeMajor := StrToIntDef(Output, 0);
      Result := NodeMajor >= 18;
    end;
  end;
end;

function InitializeSetup(): Boolean;
begin
  Result := True;

  if not CheckNodeJS() then
  begin
    MsgBox('rmhcode requires Node.js >= 18.' + #13#10 + #13#10 +
           'Please install Node.js from https://nodejs.org and try again.',
           mbError, MB_OK);
    Result := False;
  end;
end;

// Add/remove from user PATH
procedure AddToUserPath(Dir: String);
var
  CurrentPath: String;
begin
  if not RegQueryStringValue(HKCU, EnvironmentKey, 'Path', CurrentPath) then
    CurrentPath := '';

  // Check if already in path
  if Pos(Uppercase(Dir), Uppercase(CurrentPath)) > 0 then
    Exit;

  if CurrentPath <> '' then
    CurrentPath := CurrentPath + ';';
  CurrentPath := CurrentPath + Dir;

  RegWriteStringValue(HKCU, EnvironmentKey, 'Path', CurrentPath);
end;

procedure RemoveFromUserPath(Dir: String);
var
  CurrentPath: String;
  P: Integer;
begin
  if not RegQueryStringValue(HKCU, EnvironmentKey, 'Path', CurrentPath) then
    Exit;

  P := Pos(Uppercase(Dir), Uppercase(CurrentPath));
  if P = 0 then
    Exit;

  Delete(CurrentPath, P, Length(Dir));
  // Clean up leftover semicolons
  StringChangeEx(CurrentPath, ';;', ';', True);
  if (Length(CurrentPath) > 0) and (CurrentPath[1] = ';') then
    Delete(CurrentPath, 1, 1);
  if (Length(CurrentPath) > 0) and (CurrentPath[Length(CurrentPath)] = ';') then
    Delete(CurrentPath, Length(CurrentPath), 1);

  RegWriteStringValue(HKCU, EnvironmentKey, 'Path', CurrentPath);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    if IsTaskSelected('addtopath') then
      AddToUserPath(ExpandConstant('{app}\bin'));
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    RemoveFromUserPath(ExpandConstant('{app}\bin'));

    // Ask about keeping config data
    if MsgBox('Do you want to remove your rmhcode configuration and cached data?' + #13#10 +
              '(stored in ' + ExpandConstant('{userappdata}\rmhcode') + ')',
              mbConfirmation, MB_YESNO) = IDYES then
    begin
      DelTree(ExpandConstant('{userappdata}\rmhcode'), True, True, True);
    end;
  end;
end;