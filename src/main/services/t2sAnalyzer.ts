import type { Enzyme, T2SSite, Overhang } from '../../types';

// MoClo standard Type IIS enzymes
export const MOCLO_ENZYMES: Enzyme[] = [
  {
    name: 'BsaI',
    recognitionSite: 'GGTCTC',
    cutOffsetForward: 1,
    cutOffsetReverse: 5,
    overhangLength: 4
  },
  {
    name: 'BbsI',
    recognitionSite: 'GAAGAC',
    cutOffsetForward: 2,
    cutOffsetReverse: 6,
    overhangLength: 4
  },
  {
    name: 'BsmBI',
    recognitionSite: 'CGTCTC',
    cutOffsetForward: 1,
    cutOffsetReverse: 5,
    overhangLength: 4
  },
  {
    name: 'Esp3I',
    recognitionSite: 'CGTCTC',
    cutOffsetForward: 1,
    cutOffsetReverse: 5,
    overhangLength: 4
  },
  {
    name: 'SapI',
    recognitionSite: 'GCTCTTC',
    cutOffsetForward: 1,
    cutOffsetReverse: 4,
    overhangLength: 3
  },
  {
    name: 'BpiI',
    recognitionSite: 'GAAGAC',
    cutOffsetForward: 2,
    cutOffsetReverse: 6,
    overhangLength: 4
  },
  {
    name: 'AarI',
    recognitionSite: 'CACCTGC',
    cutOffsetForward: 4,
    cutOffsetReverse: 8,
    overhangLength: 4
  },
  {
    name: 'BtsI',
    recognitionSite: 'GCAGTG',
    cutOffsetForward: 2,
    cutOffsetReverse: 8,
    overhangLength: 6
  }
];

export class T2SAnalyzer {
  private reverseComplement(seq: string): string {
    const complement: { [key: string]: string } = {
      'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G',
      'a': 't', 't': 'a', 'g': 'c', 'c': 'g'
    };
    return seq.split('').reverse().map(base => complement[base] || base).join('');
  }

  findT2SSites(sequence: string, enzyme: Enzyme): T2SSite[] {
    const sites: T2SSite[] = [];
    const seq = sequence.toUpperCase();
    const site = enzyme.recognitionSite.toUpperCase();
    const rcSite = this.reverseComplement(site);
    
    // Find forward strand sites
    let pos = 0;
    while ((pos = seq.indexOf(site, pos)) !== -1) {
      const cutTop = pos + enzyme.cutOffsetForward;
      const cutBottom = pos + enzyme.cutOffsetReverse;
      
      let overhangSeq = '';
      let overhangType: '5prime' | '3prime';
      
      if (cutTop < cutBottom) {
        // 5' overhang
        overhangSeq = seq.substring(cutTop, cutBottom);
        overhangType = '5prime';
      } else {
        // 3' overhang  
        overhangSeq = seq.substring(cutBottom, cutTop);
        overhangType = '3prime';
      }
      
      sites.push({
        enzyme: enzyme.name,
        position: pos,
        strand: '+',
        recognitionSite: site,
        cutPositionTop: cutTop,
        cutPositionBottom: cutBottom,
        overhangSequence: overhangSeq,
        overhangType
      });
      
      pos++;
    }
    
    // Find reverse strand sites by searching for reverse complement
    pos = 0;
    while ((pos = seq.indexOf(rcSite, pos)) !== -1) {
      // For reverse strand, the cut positions are different
      const cutTop = pos + rcSite.length - enzyme.cutOffsetReverse;
      const cutBottom = pos + rcSite.length - enzyme.cutOffsetForward;
      
      let overhangSeq = '';
      let overhangType: '5prime' | '3prime';
      
      if (cutTop < cutBottom) {
        overhangSeq = seq.substring(cutTop, cutBottom);
        overhangType = '5prime';
      } else {
        overhangSeq = seq.substring(cutBottom, cutTop);
        overhangType = '3prime';
      }
      
      // For reverse strand, we need to reverse complement the overhang
      overhangSeq = this.reverseComplement(overhangSeq);
      
      sites.push({
        enzyme: enzyme.name,
        position: pos,
        strand: '-',
        recognitionSite: rcSite,
        cutPositionTop: cutTop,
        cutPositionBottom: cutBottom,
        overhangSequence: overhangSeq,
        overhangType
      });
      
      pos++;
    }
    
    return sites.sort((a, b) => a.position - b.position);
  }

  analyzeAllEnzymes(sequence: string): { [enzyme: string]: T2SSite[] } {
    const results: { [enzyme: string]: T2SSite[] } = {};
    
    for (const enzyme of MOCLO_ENZYMES) {
      const sites = this.findT2SSites(sequence, enzyme);
      results[enzyme.name] = sites;
      
      // Debug logging
      if (sites.length > 0) {
        console.log(`Found ${sites.length} ${enzyme.name} sites:`, sites.map(s => `${s.position}(${s.strand})`));
      }
    }
    
    // Also check for simple pattern matches for debugging
    const seq = sequence.toUpperCase();
    console.log('Sequence length:', seq.length);
    console.log('Checking for common patterns:');
    console.log('GGTCTC (BsaI):', (seq.match(/GGTCTC/g) || []).length + (seq.match(/GAGACC/g) || []).length);
    console.log('GAAGAC (BbsI):', (seq.match(/GAAGAC/g) || []).length + (seq.match(/GTCTTC/g) || []).length);
    console.log('CGTCTC (BsmBI/Esp3I):', (seq.match(/CGTCTC/g) || []).length + (seq.match(/GAGACG/g) || []).length);
    
    return results;
  }

  findInsertRegions(sequence: string, enzyme: Enzyme): { start: number; end: number; leftOverhang: string; rightOverhang: string }[] {
    const sites = this.findT2SSites(sequence, enzyme);
    const inserts: { start: number; end: number; leftOverhang: string; rightOverhang: string }[] = [];
    
    // Find regions between T2S sites that could be inserts
    for (let i = 0; i < sites.length - 1; i++) {
      const leftSite = sites[i];
      const rightSite = sites[i + 1];
      
      // Calculate insert boundaries
      const start = Math.max(leftSite.cutPositionTop, leftSite.cutPositionBottom);
      const end = Math.min(rightSite.cutPositionTop, rightSite.cutPositionBottom);
      
      if (end > start) {
        inserts.push({
          start,
          end,
          leftOverhang: leftSite.overhangSequence,
          rightOverhang: rightSite.overhangSequence
        });
      }
    }
    
    return inserts;
  }

  validateMoCloOverhangs(overhangs: string[]): { valid: boolean; conflicts: string[]; warnings: string[] } {
    const conflicts: string[] = [];
    const warnings: string[] = [];
    
    // Check for duplicate overhangs
    const seen = new Set<string>();
    for (const oh of overhangs) {
      if (seen.has(oh)) {
        conflicts.push(`Duplicate overhang: ${oh}`);
      }
      seen.add(oh);
    }
    
    // Check for palindromic overhangs
    for (const oh of overhangs) {
      if (oh === this.reverseComplement(oh)) {
        warnings.push(`Palindromic overhang: ${oh} (may cause multiple assembly products)`);
      }
    }
    
    // Check GC content
    for (const oh of overhangs) {
      const gc = (oh.match(/[GC]/g) || []).length / oh.length;
      if (gc < 0.25 || gc > 0.75) {
        warnings.push(`Overhang ${oh} has extreme GC content (${(gc * 100).toFixed(1)}%)`);
      }
    }
    
    return {
      valid: conflicts.length === 0,
      conflicts,
      warnings
    };
  }
}
