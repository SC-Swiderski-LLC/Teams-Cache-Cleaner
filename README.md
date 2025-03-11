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
- Python 3.7 or higher
- Required packages: `cx_Freeze` (for building the executable)

### Steps to Build

1. Clone or download this repository
2. Install required packages:
   ```
   pip install psutil
   ```
3. Run the build command:
   ```
   pyinstaller --clean --onefile --windowed --icon=data-cleaning.ico --name="TeamsCacheCleaner" --add-data="data-cleaning.ico;." --hidden-import "psutil" teams_cache_cleaner.py
   ```
4. The executable will be created in the `build` directory

## Deployment Options

### Option 1: Direct Distribution
- Share the executable with users who can run it from their desktop

### Option 2: Add to Company Portal
- Package the executable for deployment through Microsoft Intune
- Make it available in the Company Portal for users to install when needed

### Option 3: Network Share
- Place the executable on a network share accessible to all users
- Create a shortcut for easy access

## Notes

- This application only clears the cache for the new Microsoft Teams app (Teams 2.0)
- The cache location is: `C:\Users\{username}\AppData\Local\Packages\MSTeams_8wekyb3d8bbwe`
- The application must be run with user privileges (not elevated/admin)

## Attributions

<a href="https://www.flaticon.com/free-icons/data-cleaning" title="data-cleaning icons">Data-cleaning icons created by Freepik - Flaticon</a>