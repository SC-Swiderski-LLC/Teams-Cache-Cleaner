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

  // Use tasklist to get process information - more reliable than wmic
  const tasklistCmd = 'tasklist /FI "IMAGENAME eq Teams.exe" /FI "IMAGENAME eq ms-teams.exe" /FO CSV';
  
  exec(tasklistCmd, (error, stdout) => {
    if (error) {
      event.reply('log-message', `Error listing Teams processes: ${error.message}`);
      event.reply('teams-closed', false);
      return;
    }

    // Check if any Teams processes were found
    if (!stdout.toLowerCase().includes('teams')) {
      event.reply('log-message', 'No Teams processes found running');
      event.reply('teams-closed', true);
      return;
    }
    
    event.reply('log-message', 'Found Teams processes running. Attempting to terminate...');
    
    // Kill all Teams processes
    const killCmd = 'taskkill /F /IM Teams.exe /IM ms-teams.exe';
    exec(killCmd, (error, stdout, stderr) => {
      if (error) {
        event.reply('log-message', `Error terminating Teams: ${stderr || error.message}`);
        event.reply('teams-closed', false);
      } else {
        event.reply('log-message', 'Teams processes terminated successfully');
        
        // Double-check to make sure they're gone
        setTimeout(() => {
          exec(tasklistCmd, (error, stdout) => {
            if (stdout.toLowerCase().includes('teams')) {
              event.reply('log-message', 'Warning: Some Teams processes are still running');
              event.reply('teams-closed', false);
            } else {
              event.reply('log-message', 'All Teams processes have been terminated');
              event.reply('teams-closed', true);
            }
          });
        }, 1000);
      }
    });
  });
});

ipcMain.on('clear-cache', (event) => {
  // Check if path exists
  if (!fs.existsSync(teamsCachePath)) {
    event.reply('log-message', `Teams installation not found at ${teamsCachePath}`);
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
    const success = deleteFolderRecursive(teamsCachePath);
    
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