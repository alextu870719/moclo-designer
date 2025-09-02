import type { Plasmid, T2SSite, Folder } from './index';
import type { GoldenGateStrategy, AssemblyReaction } from '../main/services/goldenGateDesigner';

export interface MocloAPI {
  importPlasmidFile: () => Promise<{ filename: string; content: string; path: string } | null>;
  importPlasmidFolder: () => Promise<{
    folderPath: string;
    files: Array<{ filename: string; content: string; path: string }>;
    totalFiles: number;
    successfulFiles: number;
  } | null>;
  addPlasmid: (plasmid: Plasmid) => Promise<boolean>;
  getAllPlasmids: () => Promise<Plasmid[]>;
  searchPlasmids: (query: string) => Promise<Plasmid[]>;
  getPlasmidById: (id: string) => Promise<Plasmid | null>;
  getPlasmidByName: (name: string) => Promise<Plasmid | null>;
  checkPlasmidExists: (name: string) => Promise<boolean>;
  deletePlasmid: (id: string) => Promise<boolean>;
  deletePlasmids: (ids: string[]) => Promise<{success: number, failed: number}>;
  
  // 資料夾管理
  getAllFolders: () => Promise<Folder[]>;
  createFolder: (folder: Omit<Folder, 'createdAt'>) => Promise<boolean>;
  updateFolder: (folderId: string, updates: Partial<Omit<Folder, 'id' | 'createdAt'>>) => Promise<boolean>;
  deleteFolder: (folderId: string, moveTo?: string) => Promise<boolean>;
  movePlasmidsToFolder: (plasmidIds: string[], folderId: string) => Promise<boolean>;
  getPlasmidsByFolder: (folderId?: string) => Promise<Plasmid[]>;
  
  analyzeT2S: (sequence: string) => Promise<{ [enzyme: string]: T2SSite[] }>;
  validateMoCloOverhangs: (overhangs: string[]) => Promise<any>;
  designGoldenGateStrategy: (plasmids: Plasmid[]) => Promise<GoldenGateStrategy>;
  generateAssemblyReaction: (strategy: GoldenGateStrategy, enzyme?: string) => Promise<AssemblyReaction>;
  suggestOptimalOverhangs: (partTypes: string[], level?: number) => Promise<{ [partType: string]: { left: string; right: string } }>;
}

declare global {
  interface Window {
    mocloAPI: MocloAPI;
  }
}
