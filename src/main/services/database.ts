import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import type { Plasmid, PlasmidFeature, T2SSite, Insert, Folder } from '../../types';

export class PlasmidDatabase {
  private db: sqlite3.Database;

  constructor(dbPath?: string) {
    const defaultPath = path.join(__dirname, '../../database/moclo.db');
    this.db = new sqlite3.Database(dbPath || defaultPath);
    this.initializeTables();
    this.initializeDefaultFolders();
  }

  private initializeDefaultFolders(): void {
    // 創建默認資料夾 - 用戶可以選擇使用這些分類
    const defaultFolders = [
      { id: 'default', name: '未分類', description: '未分類的質體', color: '#6b7280' },
      { id: 'vectors', name: '載體', description: '載體質體', color: '#3b82f6' },
      { id: 'parts', name: '元件', description: '生物元件', color: '#10b981' },
      { id: 'assemblies', name: '組裝體', description: '組裝完成的構建體', color: '#8b5cf6' }
    ];

    defaultFolders.forEach(folder => {
      this.db.run(`
        INSERT OR IGNORE INTO folders (id, name, description, color, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [folder.id, folder.name, folder.description, folder.color, new Date().toISOString()]);
    });
  }

  private initializeTables(): void {
    const tables = [
      `CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        color TEXT DEFAULT '#6b7280',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS plasmids (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sequence TEXT NOT NULL,
        description TEXT,
        size INTEGER NOT NULL,
        moclo_compatible BOOLEAN DEFAULT 0,
        level INTEGER DEFAULT 0,
        part_type TEXT,
        resistance TEXT,
        origin TEXT,
        folder_id TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS plasmid_features (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plasmid_id TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        start_pos INTEGER NOT NULL,
        end_pos INTEGER NOT NULL,
        strand TEXT CHECK(strand IN ('+', '-')),
        color TEXT,
        FOREIGN KEY (plasmid_id) REFERENCES plasmids(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS t2s_sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plasmid_id TEXT,
        enzyme TEXT NOT NULL,
        position INTEGER NOT NULL,
        strand TEXT CHECK(strand IN ('+', '-')),
        recognition_site TEXT NOT NULL,
        cut_position_top INTEGER NOT NULL,
        cut_position_bottom INTEGER NOT NULL,
        overhang_sequence TEXT NOT NULL,
        overhang_type TEXT CHECK(overhang_type IN ('5prime', '3prime')),
        FOREIGN KEY (plasmid_id) REFERENCES plasmids(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS inserts (
        id TEXT PRIMARY KEY,
        plasmid_id TEXT,
        sequence TEXT NOT NULL,
        start_pos INTEGER NOT NULL,
        end_pos INTEGER NOT NULL,
        left_overhang TEXT,
        right_overhang TEXT,
        moclo_level INTEGER DEFAULT 0,
        part_type TEXT NOT NULL,
        FOREIGN KEY (plasmid_id) REFERENCES plasmids(id)
      )`
    ];

    tables.forEach(sql => {
      this.db.exec(sql, (err) => {
        if (err) console.error('Error creating table:', err);
      });
    });

    // 創建預設資料夾
    this.createDefaultFolders();
    
    // 清理可能重複的 All Plasmid 實際資料夾
    this.cleanupDuplicateAllPlasmidFolder();
  }

  private cleanupDuplicateAllPlasmidFolder(): void {
    // 刪除任何名為 "All plasmid" 或 "All Plasmid" 的實際資料夾
    // 因為我們使用虛擬資料夾來實現這個功能
    
    // 使用 LIKE 模式來匹配各種可能的命名
    this.db.run(`DELETE FROM folders WHERE name LIKE '%All%plasmid%' OR name LIKE '%All%Plasmid%'`, [], (err) => {
      if (err) {
        console.error('Error removing duplicate All Plasmid folders:', err);
      } else {
        console.log('Cleaned up any duplicate All Plasmid folders');
      }
    });
    
    // 也檢查特定的可能名稱
    const duplicateNames = ['All plasmid', 'All Plasmid', 'all plasmid', 'ALL PLASMID'];
    
    duplicateNames.forEach(name => {
      this.db.run(`DELETE FROM folders WHERE name = ?`, [name], (err) => {
        if (err) {
          console.error(`Error removing duplicate folder ${name}:`, err);
        }
      });
    });
  }

  private createDefaultFolders(): void {
    const defaultFolders = [
      { id: 'default', name: '未分類', description: '未分類的質體', color: '#6b7280' },
      { id: 'vectors', name: '載體', description: '載體質體', color: '#3b82f6' },
      { id: 'parts', name: '元件', description: '生物元件', color: '#10b981' },
      { id: 'assemblies', name: '組裝體', description: '組裝完成的構建體', color: '#8b5cf6' }
    ];

    defaultFolders.forEach(folder => {
      const sql = `INSERT OR IGNORE INTO folders (id, name, description, color) VALUES (?, ?, ?, ?)`;
      this.db.run(sql, [folder.id, folder.name, folder.description, folder.color], (err) => {
        if (err) {
          console.error(`Error creating default folder ${folder.name}:`, err);
        }
      });
    });
  }

  async addPlasmid(plasmid: Plasmid): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO plasmids 
        (id, name, sequence, description, size, moclo_compatible, level, part_type, resistance, origin, folder_id, added_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        plasmid.id,
        plasmid.name,
        plasmid.sequence,
        plasmid.description || null,
        plasmid.size,
        plasmid.mocloCompatible ? 1 : 0,
        plasmid.level,
        plasmid.partType,
        plasmid.resistance || null,
        plasmid.origin || null,
        plasmid.folderId || 'default',
        plasmid.addedAt.toISOString()
      ], (err) => {
        if (err) {
          console.error('Database error adding plasmid:', err);
          return resolve(false);
        }

        // Add features
        if (plasmid.features) {
          this.addFeatures(plasmid.id, plasmid.features);
        }

        // Add T2S sites
        if (plasmid.t2sSites) {
          this.addT2SSites(plasmid.id, plasmid.t2sSites);
        }

        // Add inserts
        if (plasmid.inserts) {
          this.addInserts(plasmid.id, plasmid.inserts);
        }

        resolve(true);
      });
    });
  }

  private addFeatures(plasmidId: string, features: PlasmidFeature[]): void {
    const sql = `
      INSERT INTO plasmid_features (plasmid_id, name, type, start_pos, end_pos, strand, color)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    features.forEach(feature => {
      this.db.run(sql, [
        plasmidId,
        feature.name,
        feature.type,
        feature.start,
        feature.end,
        feature.strand,
        feature.color || null
      ]);
    });
  }

  private addT2SSites(plasmidId: string, sites: T2SSite[]): void {
    const sql = `
      INSERT INTO t2s_sites 
      (plasmid_id, enzyme, position, strand, recognition_site, cut_position_top, cut_position_bottom, overhang_sequence, overhang_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    sites.forEach(site => {
      // Validate the site object before insertion
      if (!site.enzyme) {
        console.error('Missing enzyme name for T2S site:', site);
        return;
      }
      
      this.db.run(sql, [
        plasmidId,
        site.enzyme,
        site.position,
        site.strand,
        site.recognitionSite,
        site.cutPositionTop,
        site.cutPositionBottom,
        site.overhangSequence,
        site.overhangType
      ], (err) => {
        if (err) {
          console.error('Error inserting T2S site:', err);
          console.error('Site data:', site);
        }
      });
    });
  }

  private addInserts(plasmidId: string, inserts: Insert[]): void {
    const sql = `
      INSERT INTO inserts 
      (id, plasmid_id, sequence, start_pos, end_pos, left_overhang, right_overhang, moclo_level, part_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    inserts.forEach(insert => {
      this.db.run(sql, [
        insert.id,
        plasmidId,
        insert.sequence,
        insert.start,
        insert.end,
        insert.leftOverhang || null,
        insert.rightOverhang || null,
        insert.mocloLevel,
        insert.partType
      ]);
    });
  }

  async getAllPlasmids(): Promise<Plasmid[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM plasmids 
        ORDER BY added_at DESC
      `;

      this.db.all(sql, async (err, rows: any[]) => {
        if (err) return reject(err);

        const plasmids: Plasmid[] = [];
        for (const row of rows) {
          const features = await this.getFeatures(row.id);
          const t2sSites = await this.getT2SSites(row.id);
          const inserts = await this.getInserts(row.id);

          plasmids.push({
            id: row.id,
            name: row.name,
            sequence: row.sequence,
            description: row.description,
            size: row.size,
            t2sSites,
            inserts,
            mocloCompatible: row.moclo_compatible === 1,
            level: row.level,
            partType: row.part_type,
            resistance: row.resistance,
            origin: row.origin,
            features,
            folderId: row.folder_id,
            addedAt: new Date(row.added_at)
          });
        }

        resolve(plasmids);
      });
    });
  }

  async getPlasmidById(id: string): Promise<Plasmid | null> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM plasmids WHERE id = ?`;

      this.db.get(sql, [id], async (err, row: any) => {
        if (err) return reject(err);
        if (!row) return resolve(null);

        const features = await this.getFeatures(row.id);
        const t2sSites = await this.getT2SSites(row.id);
        const inserts = await this.getInserts(row.id);

        resolve({
          id: row.id,
          name: row.name,
          sequence: row.sequence,
          description: row.description,
          size: row.size,
          t2sSites,
          inserts,
          mocloCompatible: row.moclo_compatible === 1,
          level: row.level,
          partType: row.part_type,
          resistance: row.resistance,
          origin: row.origin,
          features,
          folderId: row.folder_id,
          addedAt: new Date(row.added_at)
        });
      });
    });
  }

  async checkPlasmidExists(name: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT COUNT(*) as count FROM plasmids WHERE name = ?`;
      
      this.db.get(sql, [name], (err, row: any) => {
        if (err) return reject(err);
        resolve(row.count > 0);
      });
    });
  }

  async getPlasmidByName(name: string): Promise<Plasmid | null> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM plasmids WHERE name = ?`;

      this.db.get(sql, [name], async (err, row: any) => {
        if (err) return reject(err);
        if (!row) return resolve(null);

        const features = await this.getFeatures(row.id);
        const t2sSites = await this.getT2SSites(row.id);
        const inserts = await this.getInserts(row.id);

        resolve({
          id: row.id,
          name: row.name,
          sequence: row.sequence,
          description: row.description,
          size: row.size,
          t2sSites,
          inserts,
          mocloCompatible: row.moclo_compatible === 1,
          level: row.level,
          partType: row.part_type,
          resistance: row.resistance,
          origin: row.origin,
          features,
          folderId: row.folder_id,
          addedAt: new Date(row.added_at)
        });
      });
    });
  }

  async deletePlasmid(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // 開始交易以確保數據一致性
      this.db.serialize(() => {
        this.db.run("BEGIN TRANSACTION");
        
        let hasError = false;

        // 刪除相關的特徵
        this.db.run(`DELETE FROM plasmid_features WHERE plasmid_id = ?`, [id], (err) => {
          if (err) {
            console.error('Error deleting plasmid features:', err);
            hasError = true;
          }
        });

        // 刪除相關的T2S位點
        this.db.run(`DELETE FROM t2s_sites WHERE plasmid_id = ?`, [id], (err) => {
          if (err) {
            console.error('Error deleting T2S sites:', err);
            hasError = true;
          }
        });

        // 刪除相關的插入片段
        this.db.run(`DELETE FROM inserts WHERE plasmid_id = ?`, [id], (err) => {
          if (err) {
            console.error('Error deleting inserts:', err);
            hasError = true;
          }
        });

        // 刪除質體本身
        this.db.run(`DELETE FROM plasmids WHERE id = ?`, [id], (err) => {
          if (err) {
            console.error('Error deleting plasmid:', err);
            hasError = true;
          }
        });

        // 提交或回滾交易
        if (hasError) {
          this.db.run("ROLLBACK", () => {
            resolve(false);
          });
        } else {
          this.db.run("COMMIT", (err) => {
            if (err) {
              console.error('Error committing transaction:', err);
              resolve(false);
            } else {
              console.log(`Successfully deleted plasmid with ID: ${id}`);
              resolve(true);
            }
          });
        }
      });
    });
  }

  async deletePlasmids(ids: string[]): Promise<{success: number, failed: number}> {
    let successCount = 0;
    let failedCount = 0;

    for (const id of ids) {
      try {
        const success = await this.deletePlasmid(id);
        if (success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error(`Error deleting plasmid ${id}:`, error);
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount };
  }

  // 資料夾管理方法
  async getAllFolders(): Promise<Folder[]> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM folders ORDER BY name ASC`;

      this.db.all(sql, [], (err, rows: any[]) => {
        if (err) return reject(err);

        const folders: Folder[] = rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          color: row.color,
          createdAt: new Date(row.created_at)
        }));

        resolve(folders);
      });
    });
  }

  async createFolder(folder: Omit<Folder, 'createdAt'>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO folders (id, name, description, color, created_at)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        folder.id,
        folder.name,
        folder.description || null,
        folder.color,
        new Date().toISOString()
      ], (err) => {
        if (err) {
          console.error('Database error creating folder:', err);
          return resolve(false);
        }
        resolve(true);
      });
    });
  }

  async updateFolder(folderId: string, updates: Partial<Omit<Folder, 'id' | 'createdAt'>>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
      }
      if (updates.color !== undefined) {
        fields.push('color = ?');
        values.push(updates.color);
      }

      if (fields.length === 0) {
        return resolve(true);
      }

      values.push(folderId);
      const sql = `UPDATE folders SET ${fields.join(', ')} WHERE id = ?`;
      
      this.db.run(sql, values, (err) => {
        if (err) {
          console.error('Database error updating folder:', err);
          return resolve(false);
        }
        resolve(true);
      });
    });
  }

  async deleteFolder(folderId: string, moveTo: string = 'default'): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run("BEGIN TRANSACTION");
        
        let hasError = false;

        // 移動該資料夾中的質體到指定資料夾
        this.db.run(`UPDATE plasmids SET folder_id = ? WHERE folder_id = ?`, [moveTo, folderId], (err) => {
          if (err) {
            console.error('Error moving plasmids:', err);
            hasError = true;
          }
        });

        // 刪除資料夾
        this.db.run(`DELETE FROM folders WHERE id = ?`, [folderId], (err) => {
          if (err) {
            console.error('Error deleting folder:', err);
            hasError = true;
          }
        });

        // 提交或回滾
        if (hasError) {
          this.db.run("ROLLBACK", () => {
            resolve(false);
          });
        } else {
          this.db.run("COMMIT", (err) => {
            if (err) {
              console.error('Error committing transaction:', err);
              resolve(false);
            } else {
              resolve(true);
            }
          });
        }
      });
    });
  }

  async movePlasmidsToFolder(plasmidIds: string[], folderId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE plasmids SET folder_id = ? WHERE id = ?`;
      
      let completed = 0;
      let hasError = false;

      if (plasmidIds.length === 0) {
        return resolve(true);
      }

      plasmidIds.forEach(id => {
        this.db.run(sql, [folderId, id], (err) => {
          if (err) {
            console.error('Error moving plasmid to folder:', err);
            hasError = true;
          }
          
          completed++;
          if (completed === plasmidIds.length) {
            resolve(!hasError);
          }
        });
      });
    });
  }

  async getPlasmidsByFolder(folderId?: string): Promise<Plasmid[]> {
    return new Promise((resolve, reject) => {
      let sql: string;
      let params: string[];
      
      if (folderId === undefined) {
        // 獲取所有質體
        sql = `SELECT * FROM plasmids ORDER BY added_at DESC`;
        params = [];
      } else if (folderId === null) {
        // 獲取未分類質體（folder_id 為 null）
        sql = `SELECT * FROM plasmids WHERE folder_id IS NULL ORDER BY added_at DESC`;
        params = [];
      } else {
        // 獲取指定資料夾的質體
        sql = `SELECT * FROM plasmids WHERE folder_id = ? ORDER BY added_at DESC`;
        params = [folderId];
      }

      this.db.all(sql, params, async (err, rows: any[]) => {
        if (err) return reject(err);

        const plasmids: Plasmid[] = [];
        for (const row of rows) {
          const features = await this.getFeatures(row.id);
          const t2sSites = await this.getT2SSites(row.id);
          const inserts = await this.getInserts(row.id);

          plasmids.push({
            id: row.id,
            name: row.name,
            sequence: row.sequence,
            description: row.description,
            size: row.size,
            t2sSites,
            inserts,
            mocloCompatible: row.moclo_compatible === 1,
            level: row.level,
            partType: row.part_type,
            resistance: row.resistance,
            origin: row.origin,
            features,
            folderId: row.folder_id,
            addedAt: new Date(row.added_at)
          });
        }

        resolve(plasmids);
      });
    });
  }

  async searchPlasmids(query: string): Promise<Plasmid[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM plasmids 
        WHERE name LIKE ? OR description LIKE ? OR part_type LIKE ?
        ORDER BY added_at DESC
      `;

      const searchTerm = `%${query}%`;
      this.db.all(sql, [searchTerm, searchTerm, searchTerm], async (err, rows: any[]) => {
        if (err) return reject(err);

        const plasmids: Plasmid[] = [];
        for (const row of rows) {
          const features = await this.getFeatures(row.id);
          const t2sSites = await this.getT2SSites(row.id);
          const inserts = await this.getInserts(row.id);

          plasmids.push({
            id: row.id,
            name: row.name,
            sequence: row.sequence,
            description: row.description,
            size: row.size,
            t2sSites,
            inserts,
            mocloCompatible: row.moclo_compatible === 1,
            level: row.level,
            partType: row.part_type,
            resistance: row.resistance,
            origin: row.origin,
            features,
            addedAt: new Date(row.added_at)
          });
        }

        resolve(plasmids);
      });
    });
  }

  private async getFeatures(plasmidId: string): Promise<PlasmidFeature[]> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM plasmid_features WHERE plasmid_id = ?`;

      this.db.all(sql, [plasmidId], (err, rows: any[]) => {
        if (err) return reject(err);

        const features: PlasmidFeature[] = rows.map(row => ({
          name: row.name,
          type: row.type,
          start: row.start_pos,
          end: row.end_pos,
          strand: row.strand,
          color: row.color
        }));

        resolve(features);
      });
    });
  }

  private async getT2SSites(plasmidId: string): Promise<T2SSite[]> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM t2s_sites WHERE plasmid_id = ?`;

      this.db.all(sql, [plasmidId], (err, rows: any[]) => {
        if (err) return reject(err);

        const sites: T2SSite[] = rows.map(row => ({
          enzyme: row.enzyme,
          position: row.position,
          strand: row.strand,
          recognitionSite: row.recognition_site,
          cutPositionTop: row.cut_position_top,
          cutPositionBottom: row.cut_position_bottom,
          overhangSequence: row.overhang_sequence,
          overhangType: row.overhang_type
        }));

        resolve(sites);
      });
    });
  }

  private async getInserts(plasmidId: string): Promise<Insert[]> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM inserts WHERE plasmid_id = ?`;

      this.db.all(sql, [plasmidId], (err, rows: any[]) => {
        if (err) return reject(err);

        const inserts: Insert[] = rows.map(row => ({
          id: row.id,
          sequence: row.sequence,
          start: row.start_pos,
          end: row.end_pos,
          leftOverhang: row.left_overhang,
          rightOverhang: row.right_overhang,
          mocloLevel: row.moclo_level,
          partType: row.part_type
        }));

        resolve(inserts);
      });
    });
  }

  close(): void {
    this.db.close();
  }
}
