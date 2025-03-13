# Teams Cache Cleaner

A simple desktop utility that allows users to clear their Microsoft Teams cache when experiencing issues.

## About

The Teams Cache Cleaner is a lightweight application that helps resolve common Microsoft Teams issues by clearing cached data. Instead of automatically clearing the cache on every logon, this utility gives users control to clear the cache only when needed.

## Features

- User-friendly interface with progress indicators
- Automatically detects and closes running Teams processes
- Cleans all relevant cache folders for the new Microsoft Teams app (Teams 2.0)
- Provides clear feedback on the cleaning process
- Minimal dependencies and small footprint

## Common Issues Resolved

Clearing the Teams cache can help resolve:

- Sign-in problems
- Messages not sending
- Calls or meetings not connecting
- Interface display problems
- General performance issues

## Usage Instructions

1. Download and run the current provided installer from the releases page
2. Run the app and click the **Clean Teams Cache** button
3. Wait for the process to complete
4. Restart Microsoft Teams

## Installation Options

### Standard Installation
- Run the TeamsCacheCleaner_Setup.exe installer
- Follow the on-screen instructions

### Silent Installation via Command Line
Install Teams Cache Cleaner silently without any user interaction using the following command:

```
TeamsCacheCleaner_Setup.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART
```

Additional command line parameters:
- `/DIR="x:\dirname"` - Overrides the default installation directory
- `/NOICONS` - Prevents creation of Start Menu shortcuts
- `/TASKS="desktopicon"` - Creates a desktop shortcut (not created by default in silent mode)

Example with desktop icon:
```
TeamsCacheCleaner_Setup.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /TASKS="desktopicon"
```

### Microsoft Intune Deployment

#### Prerequisites
- Access to Microsoft Endpoint Manager admin center
- The TeamsCacheCleaner_Setup.exe installer file

#### Steps to Deploy via Intune

1. **Prepare the installer package**:
   - Upload the TeamsCacheCleaner_Setup.exe to a location accessible by Intune

2. **Create a new Win32 app**:
   - In Endpoint Manager, go to Apps > Windows > Add > Windows app (Win32)
   - Upload the installer file and provide required information

3. **Configure installation commands**:
   - Install command: `TeamsCacheCleaner_Setup.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART`
   - Uninstall command: `"{app}\unins000.exe" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART`

4. **Configure detection rules**:
   - Rule type: Registry
   - Key path: `HKEY_LOCAL_MACHINE\SOFTWARE\S.C. Swiderski\Teams Cache Cleaner`
   - Value name: `Version`
   - Detection method: String comparison
   - Operator: Equals
   - Value: `1.0.1` (or current version)

5. **Requirements and assignments**:
   - Set requirements (OS version, etc.)
   - Assign to users or devices as needed
   - Configure availability in Company Portal

## Notes

- This application only clears the cache for the new Teams app
- The cache location is: `C:\Users\{username}\AppData\Local\Packages\MSTeams_8wekyb3d8bbwe`
- The application must be run with user privileges (not elevated/admin)

## ⚠️ Important Disclaimer

This tool essentially resets Microsoft Teams back to default settings. After using it:
- You will need to sign in again
- Any custom/modified settings will be reset to default values
- Previously downloaded files and shared data will remain intact

## License

MIT

## Attributions

<a href="https://www.flaticon.com/free-icons/data-cleaning" title="data-cleaning icons">Data-cleaning icons created by Freepik - Flaticon</a>