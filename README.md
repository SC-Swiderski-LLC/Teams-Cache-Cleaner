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

1. Download and run the TeamsCacheCleaner.exe file
2. Click the "Clean Teams Cache" button
3. Wait for the process to complete
4. Restart Microsoft Teams

## Building from Source

### Prerequisites
- Node.js 14.x or higher
- npm package manager

### Steps to Build

1. Clone or download this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the application in development mode:
   ```
   npm start
   ```
4. Build the executable:
   ```
   npm run build
   ```
5. The executable will be created in the `dist` directory

## Deployment Options

### Option 1: Direct Distribution
- Share the executable with users who can run it from their desktop

### Option 2: Add to Company Portal
- Package the executable for deployment through Microsoft Intune
- Make it available in the Company Portal for users to install when needed

### Option 3: Network Share
- Place the executable on a network share accessible to all users
- Create a shortcut for easy access

### Option 4: Use the Installer
- Run the provided installer (TeamsCacheCleaner_Setup.exe)
- The installer will create start menu shortcuts and registry entries for detection

## Notes

- This application only clears the cache for the new Microsoft Teams app (Teams 2.0)
- The cache location is: `C:\Users\{username}\AppData\Local\Packages\MSTeams_8wekyb3d8bbwe`
- The application must be run with user privileges (not elevated/admin)

## Development

This application is built with Electron.js, which allows for cross-platform desktop applications using web technologies.

### Project Structure
- `main.js` - Main process responsible for creating windows and handling file system operations
- `index.html` - User interface
- `package.json` - Project configuration and dependencies
- `installer.iss` - Inno Setup script for creating Windows installer

## License

MIT

## Attributions

<a href="https://www.flaticon.com/free-icons/data-cleaning" title="data-cleaning icons">Data-cleaning icons created by Freepik - Flaticon</a>