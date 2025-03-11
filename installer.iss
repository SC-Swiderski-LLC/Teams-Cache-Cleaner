; Teams Cache Cleaner Application Installer
; Created with Inno Setup

#define MyAppName "Teams Cache Cleaner"
#define MyAppVersion "1.0.1"
#define MyAppPublisher "S.C. Swiderski, LLC"
#define MyAppURL "https://github.com/SC-Swiderski-LLC/Teams-Cache-Cleaner"
#define MyAppExeName "TeamsCacheCleaner.exe"
#define SourceDir "dist\win-unpacked"

[Setup]
; Application Information
AppId={{dcea8589-f44e-4f54-9d51-3a8834870f52}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
; Uncomment the following line to run in non administrative install mode (install for current user only.)
;PrivilegesRequired=lowest
OutputDir=installer
OutputBaseFilename=TeamsCacheCleaner_Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\{#MyAppExeName}
SetupIconFile=assets\icon.ico
ArchitecturesInstallIn64BitMode=x64
; Add this line to ensure the app runs after silent installation
DisableFinishedPage=no
CloseApplications=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce

[Files]
; Include all files from win-unpacked directory
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon


[UninstallRun]
Filename: "taskkill.exe"; Parameters: "/f /im ""{#MyAppExeName}"""; Flags: runhidden

[Code]
function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  // Check if the app is already running and close it before installation
  Exec('taskkill.exe', '/f /im "{#MyAppExeName}"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := True;
end;