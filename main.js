const { app, BrowserWindow, protocol, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const os = require('os');
const Database = require('better-sqlite3');

// Setup SQLite DB for usage analytics (grades)
let db;
function initDatabase() {
  // Store the database in the user's Documents folder (cross-platform)
  const documentsPath = path.join(os.homedir(), 'Documents');
  const dbPath = path.join(documentsPath, 'usage_data.db');
  console.log('Database path:', dbPath);
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  // Create a table for grades if it doesn't exist
  db.prepare(`CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    essay_id TEXT,
    criterion_id TEXT,
    user_grade REAL,
    assessment_text TEXT,
    revised_assessment_text TEXT,
    old_ai_grade REAL,
    new_ai_grade REAL,
    time_spent_seconds REAL,
    extra_data TEXT
  )`).run();
}

// IPC handler to record a grade
function setupIpcHandlers() {
  ipcMain.handle('record-grade', (event, gradeData) => {
    // gradeData: { essay_id, criterion_id, assessment_text, revised_assessment_text, old_ai_grade, new_ai_grade, user_grade, time_spent_seconds, extra_data }
    const stmt = db.prepare(`INSERT INTO grades (
      essay_id, criterion_id, assessment_text, revised_assessment_text, old_ai_grade, new_ai_grade, user_grade, time_spent_seconds, extra_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
      gradeData.essay_id || null,
      gradeData.criterion_id || null,
      gradeData.assessment_text ?? null,
      gradeData.revised_assessment_text ?? null,
      gradeData.old_ai_grade ?? null,
      gradeData.new_ai_grade ?? null,
      gradeData.user_grade ?? null,
      gradeData.time_spent_seconds ?? null,
      gradeData.extra_data ? JSON.stringify(gradeData.extra_data) : null
    );
    return { success: true };
  });
}

// Set environment for production
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Copy PDF.js worker file to build directory during startup
function copyPdfWorker() {
  try {
    // Try multiple possible locations for the PDF.js worker file
    const possibleSourcePaths = [
      path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js'),
      path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.js'),
      path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js'),
      path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.js')
    ];
    
    const targetWorkerPath = path.join(__dirname, 'build', 'pdf.worker.min.js');
    
    // Create build directory if it doesn't exist
    const buildDir = path.join(__dirname, 'build');
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
      console.log('Created build directory');
    }
    
    // Try each possible source path
    let copied = false;
    for (const sourcePath of possibleSourcePaths) {
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetWorkerPath);
        console.log(`PDF.js worker file copied from ${sourcePath} to ${targetWorkerPath}`);
        copied = true;
        break;
      }
    }
    
    if (!copied) {
      console.error('Could not find PDF.js worker file in any of the expected locations');
    }
  } catch (error) {
    console.error('Error copying PDF.js worker file:', error);
  }
}

// Register a protocol for serving PDF files
function registerLocalResourceProtocol() {
  protocol.registerFileProtocol('local-resource', (request, callback) => {
    const url = request.url.replace(/^local-resource:\/\//, '');
    // Decode URL to prevent issues with special characters
    const decodedUrl = decodeURI(url);
    try {
      return callback({ path: path.normalize(`${__dirname}/${decodedUrl}`) });
    } catch (error) {
      console.error('Failed to register protocol', error);
      return callback({ error: -2 /* FAILED */ });
    }
  });
}

function createWindow() {
  // Create the browser window
  // Set app icon based on platform (use assets/icon.ico for Windows/Linux, assets/icon.icns for Mac)
  let iconPath = null;
  if (process.platform === 'darwin') {
    iconPath = path.join(__dirname, 'assets', 'icon.icns');
  } else {
    iconPath = path.join(__dirname, 'assets', 'icon.ico');
  }

  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;
  const win = new BrowserWindow({
    width: Math.floor(workArea.width),
    height: Math.floor(workArea.height),
    x: Math.floor(workArea.x + workArea.width),
    y: Math.floor(workArea.y + workArea.height),
    fullscreen: false,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
  });

  // Log the current directory and build path for debugging
  console.log('Current directory:', __dirname);
  console.log('Build path:', path.join(__dirname, 'build'));
  console.log('ELECTRON VERSION:', process.versions.electron);
  console.log('NODE VERSION:', process.versions.node);
  console.log('CHROME VERSION:', process.versions.chrome);
  
  // Ensure the window is maximized and visually full screen (but not true fullscreen)
  win.setMenuBarVisibility(false);
  win.maximize();
  // Do not set full screen, so the window chrome is visible and resizable

  
  // Check if we're in development or production
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    // In development, load the React dev server
    win.loadURL('http://localhost:3000');
    // Open DevTools
    win.webContents.openDevTools();
  } else {
    // In production, load from the build directory
    const indexPath = path.join(__dirname, 'build', 'index.html');
    
    // Check if the file exists
    if (fs.existsSync(indexPath)) {
      console.log('Found index.html at:', indexPath);
      win.loadFile(indexPath);
    } else {
      console.error('Could not find index.html at:', indexPath);
      // Try alternative paths
      const altPath = path.join(__dirname, '../build', 'index.html');
      if (fs.existsSync(altPath)) {
        console.log('Found index.html at alternative path:', altPath);
        win.loadFile(altPath);
      } else {
        console.error('Could not find index.html at alternative path either');
        win.loadFile(path.join(__dirname, 'error.html'));
      }
    }
  }
}

app.on('ready', () => {
  copyPdfWorker();
  registerLocalResourceProtocol();
  initDatabase();
  setupIpcHandlers();
  createWindow();
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
