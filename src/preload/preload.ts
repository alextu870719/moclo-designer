import { contextBridge, ipcRenderer } from 'electron';
import type { Plasmid, Folder } from '../types';

const api = {
  // File operations
  importPlasmidFile: () => ipcRenderer.invoke('import-plasmid-file'),
  importPlasmidFolder: () => ipcRenderer.invoke('import-plasmid-folder'),
  
  // Database operations
  addPlasmid: (plasmid: Plasmid) => ipcRenderer.invoke('add-plasmid', plasmid),
  getAllPlasmids: () => ipcRenderer.invoke('get-all-plasmids'),
  searchPlasmids: (query: string) => ipcRenderer.invoke('search-plasmids', query),
  getPlasmidById: (id: string) => ipcRenderer.invoke('get-plasmid-by-id', id),
  getPlasmidByName: (name: string) => ipcRenderer.invoke('get-plasmid-by-name', name),
  checkPlasmidExists: (name: string) => ipcRenderer.invoke('check-plasmid-exists', name),
  deletePlasmid: (id: string) => ipcRenderer.invoke('delete-plasmid', id),
  deletePlasmids: (ids: string[]) => ipcRenderer.invoke('delete-plasmids', ids),
  
  // Folder operations
  getAllFolders: () => ipcRenderer.invoke('get-all-folders'),
  createFolder: (folder: Omit<Folder, 'createdAt'>) => ipcRenderer.invoke('create-folder', folder),
  updateFolder: (folderId: string, updates: Partial<Omit<Folder, 'id' | 'createdAt'>>) => ipcRenderer.invoke('update-folder', folderId, updates),
  deleteFolder: (folderId: string, moveTo?: string) => ipcRenderer.invoke('delete-folder', folderId, moveTo),
  movePlasmidsToFolder: (plasmidIds: string[], folderId: string) => ipcRenderer.invoke('move-plasmids-to-folder', plasmidIds, folderId),
  getPlasmidsByFolder: (folderId?: string) => ipcRenderer.invoke('get-plasmids-by-folder', folderId),
  
  // Analysis operations
  analyzeT2S: (sequence: string) => ipcRenderer.invoke('analyze-t2s', sequence),
  validateMoCloOverhangs: (overhangs: string[]) => ipcRenderer.invoke('validate-moclo-overhangs', overhangs),
  
  // Golden Gate Design operations
  designGoldenGateStrategy: (plasmids: Plasmid[]) => ipcRenderer.invoke('design-golden-gate-strategy', plasmids),
  generateAssemblyReaction: (strategy: any, enzyme?: string) => ipcRenderer.invoke('generate-assembly-reaction', strategy, enzyme),
  suggestOptimalOverhangs: (partTypes: string[], level?: number) => ipcRenderer.invoke('suggest-optimal-overhangs', partTypes, level)
};

contextBridge.exposeInMainWorld('mocloAPI', api);

export type MoCloAPI = typeof api;
