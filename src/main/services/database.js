"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlasmidDatabase = void 0;
const sqlite3 = __importStar(require("sqlite3"));
const path = __importStar(require("path"));
class PlasmidDatabase {
    constructor(dbPath) {
        const defaultPath = path.join(__dirname, '../../database/moclo.db');
        this.db = new sqlite3.Database(dbPath || defaultPath);
        this.initializeTables();
    }
    initializeTables() {
        const tables = [
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
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
                if (err)
                    console.error('Error creating table:', err);
            });
        });
    }
    async addPlasmid(plasmid) {
        return new Promise((resolve, reject) => {
            const sql = `
        INSERT OR REPLACE INTO plasmids 
        (id, name, sequence, description, size, moclo_compatible, level, part_type, resistance, origin, added_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                plasmid.addedAt.toISOString()
            ], (err) => {
                if (err)
                    return reject(err);
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
                resolve();
            });
        });
    }
    addFeatures(plasmidId, features) {
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
    addT2SSites(plasmidId, sites) {
        const sql = `
      INSERT INTO t2s_sites 
      (plasmid_id, enzyme, position, strand, recognition_site, cut_position_top, cut_position_bottom, overhang_sequence, overhang_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        sites.forEach(site => {
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
            ]);
        });
    }
    addInserts(plasmidId, inserts) {
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
    async getAllPlasmids() {
        return new Promise((resolve, reject) => {
            const sql = `
        SELECT * FROM plasmids 
        ORDER BY added_at DESC
      `;
            this.db.all(sql, async (err, rows) => {
                if (err)
                    return reject(err);
                const plasmids = [];
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
    async getPlasmidById(id) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM plasmids WHERE id = ?`;
            this.db.get(sql, [id], async (err, row) => {
                if (err)
                    return reject(err);
                if (!row)
                    return resolve(null);
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
                    addedAt: new Date(row.added_at)
                });
            });
        });
    }
    async searchPlasmids(query) {
        return new Promise((resolve, reject) => {
            const sql = `
        SELECT * FROM plasmids 
        WHERE name LIKE ? OR description LIKE ? OR part_type LIKE ?
        ORDER BY added_at DESC
      `;
            const searchTerm = `%${query}%`;
            this.db.all(sql, [searchTerm, searchTerm, searchTerm], async (err, rows) => {
                if (err)
                    return reject(err);
                const plasmids = [];
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
    async getFeatures(plasmidId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM plasmid_features WHERE plasmid_id = ?`;
            this.db.all(sql, [plasmidId], (err, rows) => {
                if (err)
                    return reject(err);
                const features = rows.map(row => ({
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
    async getT2SSites(plasmidId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM t2s_sites WHERE plasmid_id = ?`;
            this.db.all(sql, [plasmidId], (err, rows) => {
                if (err)
                    return reject(err);
                const sites = rows.map(row => ({
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
    async getInserts(plasmidId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM inserts WHERE plasmid_id = ?`;
            this.db.all(sql, [plasmidId], (err, rows) => {
                if (err)
                    return reject(err);
                const inserts = rows.map(row => ({
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
    close() {
        this.db.close();
    }
}
exports.PlasmidDatabase = PlasmidDatabase;
