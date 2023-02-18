const { app, BrowserWindow, Menu, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const url = require('url');

let mainWindow;
let terminalWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences:{
            nodeIntegration: true
        }    
    });
    mainWindow.loadFile(path.join(__dirname,'index.html'));

    mainWindow.on('closed',function() {
        mainWindow = null;
    });
}

function createTerminalWindow() {
    terminalWindow = new BrowserWindow({
        width: 800,
        height: 200,
        webPreferences:{
            nodeIntegration: true
        }
    });

    terminalWindow.loadURL('data:text/html,' + encodeURIComponent(`
        <html>
            <body>
                <textarea id="terminal"></textarea>
            </body>
            <script>
                const { ipcRenderer } = require('electron');
                const term = new Terminal();
                term.open(document.getElementById('terminal'));
                ipcRenderer.on('terminal-data', (event, data) => {
                    term.write(data);
                });
            </script>
        </html>
    `));
    terminalWindow.on('closed', function() {
        terminalWindow = null;
    });
}

function openFile() {
    dialog.showOpenDialog(mainWindow, {
        properties: ['openFile']
    }).then(result => {
        if (!result.canceled) {
            const filePath = result.filePaths[0];
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    console.error(err);
                } else {
                    mainWindow.webContents.send('file-opened', filePath, data.toString());
                }
            });
        }
    });
}

function saveFile(content) {
    dialog.showSaveDialog(mainWindow, {
        properties: ['createDirectory', 'showOverwriteConfirmation'],
        filters: [{ name: 'Text Files', extensions: ['txt']}]
    }).then(result => {
        if (!result.canceled) {
            const filePath = result.filePath;
            fs.writeFile(filePath, content, err => {
                if (err) {
                    console.error(err);
                } else {
                    mainWindow.webContents.send('file-saved', filePath);
                }
            });
        }
    });
}
app.on('ready', function(){
    createMainWindow();
    const mainMenu = Menu.buildFromTemplate([
        {
            label: 'File',
            submenu: [
                {
                    label: 'New File',
                    accelerator: 'CmdOrCtrl+N',
                    click() {
                        mainWindow.webContents.send('new-file');
                    }
                },
                {
                    label: 'Open File',
                    accelerator: 'CmdOrCtrl+O',
                    click() {
                    mainWindow.webContents.send('open-file');
                    }
                },
                {
                    label: 'Save File',
                    accelerator: 'CmdOrCtrl+S',
                    click() {
                      mainWindow.webContents.send('save-file');
                    }                    
                },
                {
                    label: 'Save As...',
                    click() {
                        const content = mainWindow.webContents.executeJavaScript('editor.getValue()');
                        saveFile(content);
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Quit',
                    accelerator: 'CmdOrCtrl+Q',
                    click() {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Toggle Developer Tools',
                    accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
                    click(item,focusedWindow) {
                        focusedWindow.toggleDevTools();
                    }
                },
                {
                    label: 'Toggle Terminal',
                    accelerator: 'CmdOrCtrl+T',
                    click() {
                        if (terminalWindow) {
                            terminalWindow.show();
                        } else {
                            createTerminalWindow();
                        }
                    }
                },
                {
                    label: 'Toggle Sidebar',
                    accelerator: 'CmdOrCtrl+B',
                    click() {
                        mainWindow.webContents.send('toggle-sidebar');
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu:[
                {
                    label: 'About'
                }
            ]
        }
    ]);
    Menu.setApplicationMenu(mainMenu);
});

app.on('window-all-closed', function() {
    if(process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function() {
    if (mainWindow === null) {
        createMainWindow();
    }
});

const { ipcMain } = require('electron');

ipcMain.on('terminal-data', (event, data) => {
    if (terminalWindow) {
        terminalWindow.webContents.send('terminal-data', data);
    }
});