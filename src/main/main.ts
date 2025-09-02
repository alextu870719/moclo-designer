import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PlasmidDatabase } from './services/database';
import { T2SAnalyzer } from './services/t2sAnalyzer';
import { GoldenGateDesigner } from './services/goldenGateDesigner';
import type { Plasmid } from '../types';

let mainWindow: BrowserWindow;
let database: PlasmidDatabase;
let t2sAnalyzer: T2SAnalyzer;
let goldenGateDesigner: GoldenGateDesigner;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

async function initializeServices(): Promise<void> {
  try {
    const dbPath = path.join(app.getPath('userData'), 'moclo-designer.db');
    database = new PlasmidDatabase(dbPath);
    
    t2sAnalyzer = new T2SAnalyzer();
    goldenGateDesigner = new GoldenGateDesigner();
    console.log('Services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }
}

app.whenReady().then(async () => {
  await initializeServices();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers for database operations
ipcMain.handle('get-all-plasmids', async () => {
  try {
    return await database.getAllPlasmids();
  } catch (error) {
    console.error('Error getting plasmids:', error);
    throw error;
  }
});

ipcMain.handle('add-plasmid', async (event, plasmidData: Plasmid) => {
  try {
    return await database.addPlasmid(plasmidData);
  } catch (error) {
    console.error('Error adding plasmid:', error);
    throw error;
  }
});

ipcMain.handle('search-plasmids', async (event, query: string) => {
  try {
    return await database.searchPlasmids(query);
  } catch (error) {
    console.error('Error searching plasmids:', error);
    throw error;
  }
});

ipcMain.handle('get-plasmid-by-id', async (event, id: string) => {
  try {
    return await database.getPlasmidById(id);
  } catch (error) {
    console.error('Error getting plasmid by ID:', error);
    throw error;
  }
});

ipcMain.handle('get-plasmid-by-name', async (event, name: string) => {
  try {
    return await database.getPlasmidByName(name);
  } catch (error) {
    console.error('Error getting plasmid by name:', error);
    throw error;
  }
});

ipcMain.handle('check-plasmid-exists', async (event, name: string) => {
  try {
    return await database.checkPlasmidExists(name);
  } catch (error) {
    console.error('Error checking plasmid exists:', error);
    throw error;
  }
});

ipcMain.handle('delete-plasmid', async (event, id: string) => {
  try {
    return await database.deletePlasmid(id);
  } catch (error) {
    console.error('Error deleting plasmid:', error);
    throw error;
  }
});

ipcMain.handle('delete-plasmids', async (event, ids: string[]) => {
  try {
    return await database.deletePlasmids(ids);
  } catch (error) {
    console.error('Error deleting plasmids:', error);
    throw error;
  }
});

// IPC handlers for folder management
ipcMain.handle('get-all-folders', async (event) => {
  try {
    return await database.getAllFolders();
  } catch (error) {
    console.error('Error getting all folders:', error);
    throw error;
  }
});

ipcMain.handle('create-folder', async (event, folder: any) => {
  try {
    return await database.createFolder(folder);
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
});

ipcMain.handle('update-folder', async (event, folderId: string, updates: any) => {
  try {
    return await database.updateFolder(folderId, updates);
  } catch (error) {
    console.error('Error updating folder:', error);
    throw error;
  }
});

ipcMain.handle('delete-folder', async (event, folderId: string, moveTo?: string) => {
  try {
    return await database.deleteFolder(folderId, moveTo);
  } catch (error) {
    console.error('Error deleting folder:', error);
    throw error;
  }
});

ipcMain.handle('move-plasmids-to-folder', async (event, plasmidIds: string[], folderId: string) => {
  try {
    return await database.movePlasmidsToFolder(plasmidIds, folderId);
  } catch (error) {
    console.error('Error moving plasmids to folder:', error);
    throw error;
  }
});

ipcMain.handle('get-plasmids-by-folder', async (event, folderId?: string) => {
  try {
    return await database.getPlasmidsByFolder(folderId);
  } catch (error) {
    console.error('Error getting plasmids by folder:', error);
    throw error;
  }
});

// IPC handlers for T2S analysis
ipcMain.handle('analyze-t2s', async (event, sequence: string) => {
  try {
    const allSites = t2sAnalyzer.analyzeAllEnzymes(sequence);
    // For simplicity, use BsaI enzyme for insert regions
    const bsaiEnzyme = { name: 'BsaI', recognitionSite: 'GGTCTC', cutOffsetForward: 1, cutOffsetReverse: 5, overhangLength: 4 };
    const inserts = t2sAnalyzer.findInsertRegions(sequence, bsaiEnzyme);
    
    // Extract all overhangs for validation
    const allOverhangs: string[] = [];
    Object.values(allSites).forEach(sites => {
      sites.forEach(site => allOverhangs.push(site.overhangSequence));
    });
    const validation = t2sAnalyzer.validateMoCloOverhangs(allOverhangs);
    
    return {
      t2sSites: allSites,
      inserts: inserts,
      validation: validation
    };
  } catch (error) {
    console.error('Error analyzing sequence:', error);
    throw error;
  }
});

ipcMain.handle('validate-moclo-overhangs', async (event, overhangs: string[]) => {
  try {
    return t2sAnalyzer.validateMoCloOverhangs(overhangs);
  } catch (error) {
    console.error('Error validating overhangs:', error);
    throw error;
  }
});

// IPC handler for file import
ipcMain.handle('import-plasmid-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Common Sequence Files', extensions: ['fasta', 'fa', 'seq', 'txt', 'gb', 'gbk', 'genbank', 'ape', 'dna'] }
      ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const fs = await import('fs');
      const filePath = result.filePaths[0];
      const filename = path.basename(filePath);
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      
      return {
        filename: filename,
        content: fileContent,
        path: filePath
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error importing plasmid:', error);
    throw error;
  }
});

// IPC handler for folder import
ipcMain.handle('import-plasmid-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '選擇包含序列文件的資料夾'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const fs = await import('fs');
      const folderPath = result.filePaths[0];
      const files = await fs.promises.readdir(folderPath);
      
      // Filter for potential sequence files (but allow all files as per user's request)
      const sequenceFiles = files.filter(file => {
        // Skip hidden files and system files
        if (file.startsWith('.') || file.startsWith('~')) return false;
        
        // Check if it's a file (not directory)
        const filePath = path.join(folderPath, file);
        try {
          const stats = require('fs').statSync(filePath);
          return stats.isFile();
        } catch {
          return false;
        }
      });
      
      // Read all files
      const fileResults: Array<{filename: string; content: string; path: string}> = [];
      for (const file of sequenceFiles) {
        try {
          const filePath = path.join(folderPath, file);
          const fileContent = await fs.promises.readFile(filePath, 'utf-8');
          
          fileResults.push({
            filename: file,
            content: fileContent,
            path: filePath
          });
        } catch (error) {
          console.warn(`無法讀取文件 ${file}:`, error instanceof Error ? error.message : String(error));
          // Continue with other files even if one fails
        }
      }
      
      return {
        folderPath,
        files: fileResults,
        totalFiles: sequenceFiles.length,
        successfulFiles: fileResults.length
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error importing folder:', error);
    throw error;
  }
});

// IPC handler for sample data loading
ipcMain.handle('load-sample-data', async () => {
  try {
    const samplePlasmids: Plasmid[] = [
      {
        id: 'pICH41021',
        name: 'pICH41021',
        sequence: 'GGTCTCAAGCCGTAGCTCTCAGGAATTCGATATCAAGCTTATCGATACCGTCGACCTCGAGGCATGCAAGCTTGGTACCGAGCTCGGATCCCACTAGTGACGTCGACAGCGGCCGCAAATTAAAGCCTTCGAGCGTCCCAAAACCTTCTCAAG',
        description: 'MoClo Level 0 Entry Vector',
        size: 147,
        t2sSites: [],
        inserts: [],
        mocloCompatible: true,
        level: 0,
        partType: 'entry_vector',
        features: [
          { name: 'BsaI site', start: 7, end: 12, type: 'restriction_site', strand: '+' },
          { name: 'BsaI site', start: 140, end: 145, type: 'restriction_site', strand: '+' }
        ],
        addedAt: new Date()
      },
      {
        id: 'pICH41308',
        name: 'pICH41308',
        sequence: 'GGTCTCAGGAGGTAGAAAATGAAACAAATCAGCGAAATGCAGATTCAATTAGCGTCTCAGTGACGTCAGCGGCCGCAAATTAAAGCCTTCGAGCGTCCCAAAACCTTCTCAAGAGATCCCTATAGACTAGTGTAGTATATCGACCGGATCC',
        description: 'MoClo Level 1 Acceptor Vector',
        size: 147,
        t2sSites: [],
        inserts: [],
        mocloCompatible: true,
        level: 1,
        partType: 'acceptor_vector',
        features: [
          { name: 'BsaI site', start: 7, end: 12, type: 'restriction_site', strand: '+' },
          { name: 'BsaI site', start: 135, end: 140, type: 'restriction_site', strand: '+' }
        ],
        addedAt: new Date()
      }
    ];

    for (const plasmid of samplePlasmids) {
      await database.addPlasmid(plasmid);
    }
    
    console.log('Sample data loaded successfully');
    return { success: true, count: samplePlasmids.length };
  } catch (error) {
    console.error('Error loading sample data:', error);
    throw error;
  }
});

// Golden Gate Design handlers
ipcMain.handle('design-golden-gate-strategy', async (event, plasmids: Plasmid[]) => {
  try {
    return goldenGateDesigner.analyzePartCompatibility(plasmids);
  } catch (error) {
    console.error('Error designing Golden Gate strategy:', error);
    throw error;
  }
});

ipcMain.handle('generate-assembly-reaction', async (event, strategy: any, enzyme: string = 'BsaI') => {
  try {
    return goldenGateDesigner.generateAssemblyReaction(strategy, enzyme);
  } catch (error) {
    console.error('Error generating assembly reaction:', error);
    throw error;
  }
});

ipcMain.handle('suggest-optimal-overhangs', async (event, partTypes: string[], level: number = 0) => {
  try {
    return goldenGateDesigner.suggestOptimalOverhangs(partTypes, level);
  } catch (error) {
    console.error('Error suggesting optimal overhangs:', error);
    throw error;
  }
});
