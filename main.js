const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const os = require('os');
const currentUser = os.userInfo().username;
const teamsCachePath = path.join(os.homedir(), 'AppData', 'Local', 'Packages', 'MSTeams_8wekyb3d8bbwe');

let mainWindow;

// In your main.js, modify the createWindow function:
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 710,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // Add this to ensure paths resolve correctly
      additionalArguments: [`--app-path=${app.getAppPath()}`]
    },
    icon: path.join(app.getAppPath(), 'assets/icon.ico')
  });

  mainWindow.loadFile(path.join(app.getAppPath(), 'index.html'));
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

// Add at the top of your main.js file
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    
    // Create a log file in the user's temp directory
    const logPath = path.join(os.tmpdir(), 'teamscachecleaner-error.log');
    fs.writeFileSync(logPath, `${new Date().toISOString()}\n${error.stack}`, { flag: 'a' });
    
    // Show error to user
    if (mainWindow) {
      mainWindow.webContents.send('log-message', `ERROR: ${error.message}`);
      mainWindow.webContents.send('cache-cleared', false);
    }
  });

ipcMain.on('close-teams', (event) => {
    event.reply('log-message', `Running as user: ${currentUser}`);
    event.reply('log-message', `Teams cache path: ${teamsCachePath}`);
  
    // Use wmic to get process information with user context
    const wmicCmd = 'wmic process where "name like \'%teams%\'" get name,processid,executablepath /format:csv';
    
    exec(wmicCmd, (error, stdout) => {
      if (error) {
        event.reply('log-message', `Error listing Teams processes: ${error.message}`);
        event.reply('teams-closed', false);
        return;
      }
  
      event.reply('log-message', 'Found these Teams processes:');
      
      // Parse the CSV output from WMIC
      const lines = stdout.trim().split('\n');
      const processes = [];
      
      // Skip the first line which is the header
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 3) {
          const node = parts[0]; // Usually the computer name
          const execPath = parts[1];
          const name = parts[2];
          const pid = parts[3];
          
          if (name && name.toLowerCase().includes('teams') && pid) {
            processes.push({ name, pid });
            event.reply('log-message', `${name} (PID: ${pid})`);
          }
        }
      }
      
      if (processes.length === 0) {
        event.reply('log-message', 'No Teams processes found running');
        event.reply('teams-closed', true);
        return;
      }
      
      // Terminate each process using taskkill
      event.reply('log-message', 'Terminating Teams processes...');
      
      let terminatedCount = 0;
      
      processes.forEach(proc => {
        const { name, pid } = proc;
        const killCmd = `taskkill /F /PID ${pid}`;
        
        exec(killCmd, (error, stdout, stderr) => {
          if (error) {
            event.reply('log-message', `Error terminating ${name} (PID: ${pid}): ${stderr}`);
          } else {
            event.reply('log-message', `Successfully terminated ${name} (PID: ${pid})`);
            terminatedCount++;
          }
          
          // If all termination attempts are complete
          if (terminatedCount === processes.length) {
            // Double-check no Teams processes are still running
            setTimeout(() => {
              exec('wmic process where "name like \'%teams%\'" get name', (error, stdout) => {
                if (stdout.toLowerCase().includes('teams')) {
                  event.reply('log-message', 'Warning: Some Teams processes are still running');
                  event.reply('log-message', stdout);
                  event.reply('teams-closed', false);
                } else {
                  event.reply('log-message', 'All Teams processes have been terminated');
                  event.reply('teams-closed', true);
                }
              });
            }, 2000); // Wait 2 seconds before checking
          }
        });
      });
    });
  });
  
  ipcMain.on('clear-cache', (event) => {
    // Check if path exists
    if (!fs.existsSync(teamsCachePath)) {
      event.reply('log-message', `Teams installation not found at ${teamsCachePath}`);
      
      // Check alternative path for desktop version
      const altPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Teams');
      if (fs.existsSync(altPath)) {
        event.reply('log-message', `Found alternative Teams installation at ${altPath}`);
        // Handle desktop version if needed
      } else {
        event.reply('cache-cleared', false);
        return;
      }
    }
    
    // Wait 3 seconds to make sure all file handles are released
    event.reply('log-message', 'Waiting for file handles to be released...');
    setTimeout(() => {
      clearTeamsCache(event);
    }, 3000);
  });
  
  function clearTeamsCache(event) {
    event.reply('log-message', `Clearing Teams cache at: ${teamsCachePath}`);
    
    // Define specific cache directories to target
    const cacheDirs = [
      path.join(teamsCachePath, 'LocalCache', 'Microsoft', 'MSTeams', 'Cache'),
      path.join(teamsCachePath, 'LocalCache', 'Microsoft', 'MSTeams', 'EBWebView', 'Default', 'Cache'),
      path.join(teamsCachePath, 'LocalCache', 'Microsoft', 'MSTeams', 'EBWebView', 'Default', 'Code Cache'),
      path.join(teamsCachePath, 'LocalCache', 'Microsoft', 'MSTeams', 'EBWebView', 'Default', 'GPUCache'),
      path.join(teamsCachePath, 'LocalCache', 'Microsoft', 'MSTeams', 'Service Worker', 'CacheStorage'),
      path.join(teamsCachePath, 'LocalCache', 'Microsoft', 'MSTeams', 'Application Cache', 'Cache'),
      path.join(teamsCachePath, 'LocalCache', 'Microsoft', 'MSTeams', 'Logs')
    ];
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each cache directory
    cacheDirs.forEach(dir => {
      try {
        if (fs.existsSync(dir)) {
          event.reply('log-message', `Processing directory: ${dir}`);
          
          // Clear directory contents
          const contents = fs.readdirSync(dir);
          
          contents.forEach(item => {
            const itemPath = path.join(dir, item);
            try {
              const stats = fs.statSync(itemPath);
              
              if (stats.isDirectory()) {
                // For directories, use rmSync with recursive option
                fs.rmSync(itemPath, { recursive: true, force: true });
                event.reply('log-message', `Removed directory: ${item}`);
              } else {
                // For files, use unlinkSync
                fs.unlinkSync(itemPath);
                event.reply('log-message', `Removed file: ${item}`);
              }
              successCount++;
            } catch (err) {
              errorCount++;
              event.reply('log-message', `Error removing ${item}: ${err.message}`);
            }
          });
        } else {
          event.reply('log-message', `Directory does not exist: ${dir}`);
        }
      } catch (err) {
        errorCount++;
        event.reply('log-message', `Error processing directory ${dir}: ${err.message}`);
      }
    });
    
    // Try an alternative approach using native commands if needed
    if (errorCount > 0 && successCount === 0) {
      event.reply('log-message', 'Trying alternative method using Windows commands...');
      
      // Use RD command to remove directories
      cacheDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
          const rdCmd = `rd /s /q "${dir}"`;
          exec(rdCmd, (error, stdout, stderr) => {
            if (error) {
              event.reply('log-message', `Command failed: ${rdCmd}`);
              event.reply('log-message', stderr);
            } else {
              event.reply('log-message', `Successfully executed: ${rdCmd}`);
              
              // Recreate the directory
              try {
                fs.mkdirSync(dir, { recursive: true });
                event.reply('log-message', `Recreated directory: ${dir}`);
                successCount++;
              } catch (err) {
                event.reply('log-message', `Error recreating directory: ${err.message}`);
              }
            }
          });
        }
      });
    }
    
    // Report results
    setTimeout(() => {
      event.reply('log-message', `Cache clearing completed with ${successCount} successes and ${errorCount} errors`);
      event.reply('cache-cleared', successCount > 0);
    }, 2000);
  }