export interface Enzyme {
  name: string;
  recognitionSite: string;
  cutOffsetForward: number;
  cutOffsetReverse: number;
  overhangLength: number;
}

export interface Overhang {
  sequence: string;
  type: '5prime' | '3prime';
  position: number;
}

export interface T2SSite {
  enzyme: string;
  position: number;
  strand: '+' | '-';
  recognitionSite: string;
  cutPositionTop: number;
  cutPositionBottom: number;
  overhangSequence: string;
  overhangType: '5prime' | '3prime';
}

export interface Insert {
  id: string;
  sequence: string;
  start: number;
  end: number;
  leftOverhang?: string;
  rightOverhang?: string;
  mocloLevel: 0 | 1 | 2;
  partType: 'promoter' | 'cds' | 'terminator' | 'vector' | 'linker' | 'other';
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: Date;
}

export interface Plasmid {
  id: string;
  name: string;
  sequence: string;
  description?: string;
  size: number;
  t2sSites: T2SSite[];
  inserts: Insert[];
  mocloCompatible: boolean;
  level: 0 | 1 | 2;
  partType: string;
  resistance?: string;
  origin?: string;
  features?: PlasmidFeature[];
  folderId?: string;
  addedAt: Date;
}

export interface PlasmidFeature {
  name: string;
  type: string;
  start: number;
  end: number;
  strand: '+' | '-';
  color?: string;
}

export interface MoCloStandard {
  level0: {
    vector: string[];
    promoter: string[];
    cds: string[];
    terminator: string[];
  };
  level1: {
    vector: string[];
    transcriptionalUnits: string[];
  };
  level2: {
    vector: string[];
    multigeneConstructs: string[];
  };
}

export interface AssemblyReaction {
  id: string;
  name: string;
  enzyme: string;
  parts: Plasmid[];
  vector: Plasmid;
  expectedProduct: {
    sequence: string;
    size: number;
    features: PlasmidFeature[];
  };
  validated: boolean;
}
