const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const os = require('os');
const currentUser = os.userInfo().username;
const teamsCachePath = path.join(os.homedir(), 'AppData', 'Local', 'Packages', 'MSTeams_8wekyb3d8bbwe');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 710,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets', 'icon.ico')
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  // Uncomment for debugging
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  try {
    // Create a log file in the user's temp directory
    const logPath = path.join(os.tmpdir(), 'teamscachecleaner-error.log');
    fs.writeFileSync(logPath, `${new Date().toISOString()}\n${error.stack}`, { flag: 'a' });
    
    // Show error to user if window exists
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('log-message', `ERROR: ${error.message}`);
      mainWindow.webContents.send('cache-cleared', false);
    }
  } catch (logError) {
    console.error('Error logging exception:', logError);
  }
});

ipcMain.on('close-teams', (event) => {
  event.reply('log-message', `Running as user: ${currentUser}`);
  event.reply('log-message', `Teams cache path: ${teamsCachePath}`);

  // First check for any Teams-related processes using a broader approach
  event.reply('log-message', 'Checking for Teams processes...');
  
  // Use a series of targeted commands to find all Teams-related processes
  const commands = [
    'tasklist /FI "IMAGENAME eq Teams.exe" /FO CSV',          // Traditional Teams client
    'tasklist /FI "IMAGENAME eq MSTeams.exe" /FO CSV',        // Store app Teams
    'tasklist /FI "IMAGENAME eq ms-teams.exe" /FO CSV',       // Possible alternative name
    'tasklist /FI "IMAGENAME eq msteams.exe" /FO CSV',        // Alternative casing
    'tasklist /FI "IMAGENAME eq msedgewebview2.exe" /FO CSV'  // Teams uses Edge WebView2
  ];
  
  let foundProcesses = [];
  let commandsCompleted = 0;
  
  commands.forEach(cmd => {
    exec(cmd, (error, stdout) => {
      commandsCompleted++;
      
      if (!error && stdout && stdout.toLowerCase().includes('exe')) {
        // Parse CSV output and extract process IDs
        const lines = stdout.trim().split('\n');
        
        // Skip header line if present
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',');
          if (parts.length >= 2) {
            const processName = parts[0].replace(/"/g, '');
            const pid = parts[1].replace(/"/g, '');
            
            if (pid && !isNaN(parseInt(pid))) {
              foundProcesses.push({ name: processName, pid: parseInt(pid) });
              event.reply('log-message', `Found process: ${processName} (PID: ${pid})`);
            }
          }
        }
      }
      
      // If all commands have completed, proceed to killing processes
      if (commandsCompleted === commands.length) {
        if (foundProcesses.length === 0) {
          event.reply('log-message', 'No Teams processes found running');
          event.reply('teams-closed', true);
          return;
        }
        
        terminateTeamsProcesses(event, foundProcesses);
      }
    });
  });
});

function terminateTeamsProcesses(event, processes) {
  event.reply('log-message', `Attempting to terminate ${processes.length} Teams-related processes...`);
  
  let terminatedCount = 0;
  let anyErrors = false;
  
  // Process each PID individually for better feedback
  processes.forEach(proc => {
    const killCmd = `taskkill /F /PID ${proc.pid}`;
    
    exec(killCmd, (error, stdout, stderr) => {
      terminatedCount++;
      
      if (error) {
        event.reply('log-message', `Failed to terminate ${proc.name} (PID: ${proc.pid}): ${stderr || error.message}`);
        anyErrors = true;
      } else {
        event.reply('log-message', `Successfully terminated ${proc.name} (PID: ${proc.pid})`);
      }
      
      // If all termination attempts complete, check if we need to retry or continue
      if (terminatedCount === processes.length) {
        if (anyErrors) {
          // If there were errors, try one more direct approach
          event.reply('log-message', 'Some processes could not be terminated, trying alternative method...');
          
          const finalKillCmd = 'taskkill /F /IM Teams.exe /IM MSTeams.exe /IM ms-teams.exe /IM msedgewebview2.exe';
          exec(finalKillCmd, (error, stdout, stderr) => {
            // Regardless of result, proceed to cache clearing
            setTimeout(() => {
              event.reply('log-message', 'Proceeding with cache clearing...');
              event.reply('teams-closed', true);
            }, 1000);
          });
        } else {
          // All processes terminated successfully
          event.reply('log-message', 'All Teams processes have been terminated');
          event.reply('teams-closed', true);
        }
      }
    });
  });
}

ipcMain.on('clear-cache', (event) => {
  // Check if path exists
  if (!fs.existsSync(teamsCachePath)) {
    event.reply('log-message', `Teams installation not found at ${teamsCachePath}`);
    event.reply('log-message', 'Checking alternative location...');
    
    // Try alternative location for Teams
    const altPath = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Teams');
    if (fs.existsSync(altPath)) {
      event.reply('log-message', `Found alternative Teams location at: ${altPath}`);
      // TODO: Handle clearing alternative location if needed
    }
    
    event.reply('cache-cleared', false);
    return;
  }
  
  // Wait a moment to make sure file handles are released
  event.reply('log-message', 'Waiting for file handles to be released...');
  setTimeout(() => {
    clearTeamsCache(event);
  }, 2000);
});

function clearTeamsCache(event) {
  event.reply('log-message', `Clearing Teams cache at: ${teamsCachePath}`);
  
  // Try with simple delete first
  try {
    // First try with direct command line delete
    event.reply('log-message', 'Attempting to clear cache with system command...');
    
    // Use rd command to forcefully remove directory contents
    const rdCmd = `rd /s /q "${teamsCachePath}"`;
    exec(rdCmd, (rdError, stdout, stderr) => {
      if (rdError) {
        event.reply('log-message', `Command failed: ${rdError.message}`);
        event.reply('log-message', 'Switching to detailed file-by-file deletion...');
        
        // Fall back to detailed recursive deletion
        deleteContentsRecursively(event, teamsCachePath);
      } else {
        event.reply('log-message', 'Successfully removed Teams cache directory');
        
        // Recreate the Teams directory
        try {
          fs.mkdirSync(teamsCachePath, { recursive: true });
          event.reply('log-message', 'Recreated Teams directory structure');
          event.reply('cache-cleared', true);
        } catch (mkdirErr) {
          event.reply('log-message', `Error recreating directory: ${mkdirErr.message}`);
          event.reply('cache-cleared', true); // Still consider success if deletion worked
        }
      }
    });
  } catch (error) {
    event.reply('log-message', `Error executing rd command: ${error.message}`);
    // Fall back to detailed recursive deletion
    deleteContentsRecursively(event, teamsCachePath);
  }
}

function deleteContentsRecursively(event, folderPath) {
  event.reply('log-message', `Using recursive file-by-file deletion for: ${folderPath}`);
  
  // Approach: Delete files and folders recursively
  const deleteFolderRecursive = function(folderPath) {
    let success = true;
    let filesProcessed = 0;
    
    try {
      if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach(function(file) {
          const curPath = path.join(folderPath, file);
          
          if (fs.lstatSync(curPath).isDirectory()) {
            // Recursively delete subdirectory
            if (!deleteFolderRecursive(curPath)) {
              success = false;
            }
          } else {
            // Delete file
            try {
              fs.unlinkSync(curPath);
              filesProcessed++;
              if (filesProcessed % 10 === 0) {
                event.reply('log-message', `Deleted ${filesProcessed} files...`);
              }
            } catch (err) {
              event.reply('log-message', `Could not delete file: ${curPath} - ${err.message}`);
              success = false;
            }
          }
        });
        
        // Delete the empty directory
        try {
          if (folderPath !== teamsCachePath) {
            fs.rmdirSync(folderPath);
          }
        } catch (err) {
          event.reply('log-message', `Could not delete folder: ${folderPath} - ${err.message}`);
          success = false;
        }
      }
    } catch (err) {
      event.reply('log-message', `Error accessing path: ${folderPath} - ${err.message}`);
      success = false;
    }
    
    return success;
  };
  
  try {
    // Clear contents but leave the base directory
    const success = deleteFolderRecursive(folderPath);
    
    if (success) {
      event.reply('log-message', 'Successfully cleared Teams cache');
      event.reply('cache-cleared', true);
    } else {
      event.reply('log-message', 'Cleared Teams cache with some errors');
      event.reply('cache-cleared', true); // Still consider it successful
    }
  } catch (err) {
    event.reply('log-message', `Error during cache clearing: ${err.message}`);
    event.reply('cache-cleared', false);
  }
}