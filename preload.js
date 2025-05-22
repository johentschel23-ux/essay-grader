// Preload script for Electron
const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  appInfo: {
    isPackaged: process.env.NODE_ENV === 'production',
    platform: process.platform
  },
  // Record a grade (AI/user) via IPC
  recordGrade: async (gradeData) => {
    return await ipcRenderer.invoke('record-grade', gradeData);
  },
  getPdfWorkerPath: (type = 'js') => {
    // type: 'js' or 'mjs'
    // In dev, they're served from public/build (or just /pdf.worker.min.js)
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      return type === 'mjs' ? '/pdf.worker.min.mjs' : '/pdf.worker.min.js';
    } else {
      // In production, return just the filename. Electron will resolve it from the unpacked directory.
      return type === 'mjs' ? 'pdf.worker.min.mjs' : 'pdf.worker.min.js';
    }
  }
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed in Electron environment');
});
