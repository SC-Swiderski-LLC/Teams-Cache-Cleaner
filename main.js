const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const os = require('os');

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
    icon: path.join(__dirname, 'assets/icon.ico')
  });

  mainWindow.loadFile('index.html');
  // Uncomment to open DevTools for debugging
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

// Handle IPC messages from renderer
ipcMain.on('close-teams', (event) => {
  const commands = [
    'taskkill /F /IM Teams.exe',
    'taskkill /F /IM Microsoft.Teams.exe'
  ];
  
  // Execute each command in sequence
  let commandsCompleted = 0;
  commands.forEach(cmd => {
    exec(cmd, (error, stdout, stderr) => {
      event.reply('log-message', `Executing: ${cmd}`);
      event.reply('log-message', stdout || stderr || 'No output');
      
      commandsCompleted++;
      if (commandsCompleted === commands.length) {
        // Check if Teams is still running
        exec('tasklist /FI "IMAGENAME eq *teams*" /FO CSV', (error, stdout, stderr) => {
          if (stdout.split('\n').length > 2) {
            event.reply('log-message', 'Warning: Teams processes may still be running');
            event.reply('teams-closed', false);
          } else {
            event.reply('log-message', 'All Teams processes have been closed');
            event.reply('teams-closed', true);
          }
        });
      }
    });
  });
});

ipcMain.on('clear-cache', (event) => {
  // Teams cache path
  const teamsCachePath = path.join(os.homedir(), 'AppData', 'Local', 'Packages', 'MSTeams_8wekyb3d8bbwe');
  
  // Check if path exists
  if (!fs.existsSync(teamsCachePath)) {
    event.reply('log-message', 'Teams installation not found');
    event.reply('cache-cleared', false);
    return;
  }
  
  // Calculate initial size
  let initialSize = 0;
  try {
    const getDirectorySize = (dirPath) => {
      let size = 0;
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          size += getDirectorySize(filePath);
        } else {
          size += stats.size;
        }
      }
      return size;
    };
    
    initialSize = getDirectorySize(teamsCachePath) / (1024 * 1024); // MB
    event.reply('log-message', `Initial Teams folder size: ${initialSize.toFixed(2)} MB`);
  } catch (err) {
    event.reply('log-message', `Error calculating initial size: ${err.message}`);
  }
  
  // List subdirectories
  try {
    const subdirs = fs.readdirSync(teamsCachePath)
      .filter(item => fs.statSync(path.join(teamsCachePath, item)).isDirectory());
    event.reply('log-message', `Found subdirectories: ${subdirs.join(', ')}`);
  } catch (err) {
    event.reply('log-message', `Error listing subdirectories: ${err.message}`);
  }
  
  // Delete and recreate subdirectories
  let success = true;
  try {
    fs.readdirSync(teamsCachePath).forEach(item => {
      const itemPath = path.join(teamsCachePath, item);
      try {
        if (fs.statSync(itemPath).isDirectory()) {
          event.reply('log-message', `Removing directory: ${item}`);
          fs.rmSync(itemPath, { recursive: true, force: true });
          fs.mkdirSync(itemPath, { recursive: true });
        } else {
          event.reply('log-message', `Removing file: ${item}`);
          fs.unlinkSync(itemPath);
        }
      } catch (err) {
        event.reply('log-message', `Error removing ${item}: ${err.message}`);
        success = false;
      }
    });
    
    // Calculate final size
    let finalSize = 0;
    try {
      const getDirectorySize = (dirPath) => {
        let size = 0;
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          if (stats.isDirectory()) {
            size += getDirectorySize(filePath);
          } else {
            size += stats.size;
          }
        }
        return size;
      };
      
      finalSize = getDirectorySize(teamsCachePath) / (1024 * 1024); // MB
      event.reply('log-message', `Final Teams folder size: ${finalSize.toFixed(2)} MB`);
      event.reply('log-message', `Space cleared: ${Math.max(0, initialSize - finalSize).toFixed(2)} MB`);
    } catch (err) {
      event.reply('log-message', `Error calculating final size: ${err.message}`);
    }
    
    event.reply('cache-cleared', success);
  } catch (err) {
    event.reply('log-message', `Error clearing Teams directory: ${err.message}`);
    event.reply('cache-cleared', false);
  }
});