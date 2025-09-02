import type { T2SSite, Plasmid } from '../../types';

export interface GoldenGateStrategy {
  level: number;
  parts: GoldenGatePart[];
  backbone: GoldenGatePart;
  assemblyOrder: string[];
  warnings: string[];
  conflicts: string[];
  efficiency: 'high' | 'medium' | 'low';
}

export interface GoldenGatePart {
  id: string;
  name: string;
  partType: 'promoter' | 'cds' | 'terminator' | 'backbone' | 'connector' | 'other';
  level: number;
  leftOverhang: string;
  rightOverhang: string;
  sequence?: string;
  compatible: boolean;
  position?: number;
}

export interface AssemblyReaction {
  enzyme: string;
  parts: GoldenGatePart[];
  expectedProduct: {
    size: number;
    overhangs: string[];
    circularized: boolean;
  };
  efficiency: number;
  warnings: string[];
}

export class GoldenGateDesigner {
  // Standard MoClo Level 0 overhangs (4 bp)
  private static readonly LEVEL0_OVERHANGS = {
    // Entry vectors
    'GGAG': 'promoter_start',
    'TACT': 'promoter_end_cds_start', 
    'AATG': 'cds_start',
    'GCTT': 'cds_end_terminator_start',
    'CGCT': 'terminator_end'
  };

  // Standard MoClo Level 1 overhangs
  private static readonly LEVEL1_OVERHANGS = {
    'GCCA': 'level1_start',
    'CCGA': 'level1_connector_1',
    'TCCA': 'level1_connector_2', 
    'GCCG': 'level1_connector_3',
    'TCCG': 'level1_end'
  };

  // Common problematic overhang combinations
  private static readonly PROBLEMATIC_COMBINATIONS = [
    ['AAAA', 'TTTT'], // A-T rich
    ['CCCC', 'GGGG'], // C-G rich
    ['AGCT', 'TCGA'], // Palindromes
    ['GATC', 'CTAG']  // Palindromes
  ];

  analyzePartCompatibility(parts: Plasmid[]): GoldenGateStrategy {
    const strategy: GoldenGateStrategy = {
      level: this.determineBestLevel(parts),
      parts: [],
      backbone: this.findBestBackbone(parts),
      assemblyOrder: [],
      warnings: [],
      conflicts: [],
      efficiency: 'medium'
    };

    // Convert plasmids to GoldenGate parts
    strategy.parts = parts.map(plasmid => this.convertToGoldenGatePart(plasmid));
    
    // Analyze overhang compatibility
    const compatibility = this.analyzeOverhangCompatibility(strategy.parts);
    strategy.conflicts = compatibility.conflicts;
    strategy.warnings = compatibility.warnings;
    
    // Determine assembly order
    strategy.assemblyOrder = this.determineAssemblyOrder(strategy.parts);
    
    // Calculate efficiency
    strategy.efficiency = this.calculateAssemblyEfficiency(strategy);

    return strategy;
  }

  private determineBestLevel(parts: Plasmid[]): number {
    // Analyze parts to determine if this is Level 0, Level 1, or higher
    const hasBasicParts = parts.some(p => p.partType === 'promoter' || p.partType === 'cds' || p.partType === 'terminator');
    const hasTranscriptionalUnits = parts.some(p => p.partType === 'transcription_unit');
    
    if (hasBasicParts && !hasTranscriptionalUnits) {
      return 0; // Level 0 - basic parts assembly
    } else if (hasTranscriptionalUnits) {
      return 1; // Level 1 - transcriptional units assembly
    } else {
      return 2; // Level 2 - higher order assembly
    }
  }

  private findBestBackbone(parts: Plasmid[]): GoldenGatePart {
    // Find a suitable backbone vector
    const backbones = parts.filter(p => 
      p.partType === 'backbone' || 
      p.resistance || 
      p.origin ||
      p.name.toLowerCase().includes('vector') ||
      p.name.toLowerCase().includes('backbone')
    );

    if (backbones.length > 0) {
      return this.convertToGoldenGatePart(backbones[0]);
    }

    // Return a default backbone if none found
    return {
      id: 'default_backbone',
      name: 'Default Backbone',
      partType: 'backbone',
      level: 0,
      leftOverhang: 'CGCT',
      rightOverhang: 'GGAG',
      compatible: true
    };
  }

  private convertToGoldenGatePart(plasmid: Plasmid): GoldenGatePart {
    const overhangs = this.extractOverhangs(plasmid.t2sSites);
    
    return {
      id: plasmid.id,
      name: plasmid.name,
      partType: this.mapPartType(plasmid.partType),
      level: plasmid.level,
      leftOverhang: overhangs.left,
      rightOverhang: overhangs.right,
      sequence: plasmid.sequence,
      compatible: overhangs.left !== overhangs.right && overhangs.left.length === 4,
      position: 0
    };
  }

  private mapPartType(originalType: string): GoldenGatePart['partType'] {
    const typeMap: { [key: string]: GoldenGatePart['partType'] } = {
      'promoter': 'promoter',
      'cds': 'cds', 
      'coding_sequence': 'cds',
      'terminator': 'terminator',
      'backbone': 'backbone',
      'vector': 'backbone',
      'connector': 'connector'
    };
    
    return typeMap[originalType.toLowerCase()] || 'other';
  }

  private extractOverhangs(t2sSites: T2SSite[]): { left: string; right: string } {
    if (t2sSites.length < 2) {
      return { left: 'NNNN', right: 'NNNN' };
    }

    // Sort sites by position
    const sortedSites = t2sSites.sort((a, b) => a.position - b.position);
    
    return {
      left: sortedSites[0].overhangSequence,
      right: sortedSites[sortedSites.length - 1].overhangSequence
    };
  }

  private analyzeOverhangCompatibility(parts: GoldenGatePart[]): { conflicts: string[]; warnings: string[] } {
    const conflicts: string[] = [];
    const warnings: string[] = [];
    const overhangCounts: { [overhang: string]: number } = {};

    // Count overhang usage
    parts.forEach(part => {
      overhangCounts[part.leftOverhang] = (overhangCounts[part.leftOverhang] || 0) + 1;
      overhangCounts[part.rightOverhang] = (overhangCounts[part.rightOverhang] || 0) + 1;
    });

    // Check for duplicate overhangs
    Object.entries(overhangCounts).forEach(([overhang, count]) => {
      if (count > 2) {
        conflicts.push(`Overhang ${overhang} used ${count} times - will cause assembly conflicts`);
      } else if (count === 2) {
        // Check if it's used correctly (one as left, one as right)
        const leftUsage = parts.filter(p => p.leftOverhang === overhang).length;
        const rightUsage = parts.filter(p => p.rightOverhang === overhang).length;
        
        if (leftUsage === 2 || rightUsage === 2) {
          conflicts.push(`Overhang ${overhang} used twice on the same side`);
        }
      }
    });

    // Check for palindromic overhangs
    Object.keys(overhangCounts).forEach(overhang => {
      if (this.isPalindromic(overhang)) {
        warnings.push(`Overhang ${overhang} is palindromic - may reduce assembly efficiency`);
      }
    });

    // Check for problematic combinations
    GoldenGateDesigner.PROBLEMATIC_COMBINATIONS.forEach(([oh1, oh2]) => {
      if (overhangCounts[oh1] && overhangCounts[oh2]) {
        warnings.push(`Overhangs ${oh1} and ${oh2} may have reduced ligation efficiency`);
      }
    });

    return { conflicts, warnings };
  }

  private isPalindromic(sequence: string): boolean {
    const reverseComplement = sequence.split('').reverse().map(base => {
      const complement: { [key: string]: string } = { 'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G' };
      return complement[base] || base;
    }).join('');
    
    return sequence === reverseComplement;
  }

  private determineAssemblyOrder(parts: GoldenGatePart[]): string[] {
    // Simple approach: order by part type priority
    const typePriority = {
      'backbone': 0,
      'promoter': 1, 
      'cds': 2,
      'terminator': 3,
      'connector': 4,
      'other': 5
    };

    const sortedParts = [...parts].sort((a, b) => {
      const priorityA = typePriority[a.partType] || 999;
      const priorityB = typePriority[b.partType] || 999;
      return priorityA - priorityB;
    });

    return sortedParts.map(part => part.id);
  }

  private calculateAssemblyEfficiency(strategy: GoldenGateStrategy): 'high' | 'medium' | 'low' {
    let score = 100;

    // Penalize conflicts heavily
    score -= strategy.conflicts.length * 30;
    
    // Penalize warnings moderately  
    score -= strategy.warnings.length * 10;

    // Bonus for standard overhangs
    const standardOverhangs = [...Object.keys(GoldenGateDesigner.LEVEL0_OVERHANGS), ...Object.keys(GoldenGateDesigner.LEVEL1_OVERHANGS)];
    const standardCount = strategy.parts.filter(part => 
      standardOverhangs.includes(part.leftOverhang) || 
      standardOverhangs.includes(part.rightOverhang)
    ).length;
    score += standardCount * 5;

    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  generateAssemblyReaction(strategy: GoldenGateStrategy, enzyme: string = 'BsaI'): AssemblyReaction {
    const totalSize = strategy.parts.reduce((sum, part) => sum + (part.sequence?.length || 0), 0);
    const allOverhangs = strategy.parts.flatMap(part => [part.leftOverhang, part.rightOverhang]);
    
    return {
      enzyme,
      parts: strategy.parts,
      expectedProduct: {
        size: totalSize,
        overhangs: [...new Set(allOverhangs)],
        circularized: true
      },
      efficiency: strategy.efficiency === 'high' ? 0.9 : strategy.efficiency === 'medium' ? 0.7 : 0.4,
      warnings: strategy.warnings
    };
  }

  suggestOptimalOverhangs(partTypes: string[], level: number = 0): { [partType: string]: { left: string; right: string } } {
    const suggestions: { [partType: string]: { left: string; right: string } } = {};

    if (level === 0) {
      // Level 0 suggestions based on MoClo standard
      suggestions['promoter'] = { left: 'GGAG', right: 'TACT' };
      suggestions['cds'] = { left: 'AATG', right: 'GCTT' };
      suggestions['terminator'] = { left: 'GCTT', right: 'CGCT' };
      suggestions['backbone'] = { left: 'CGCT', right: 'GGAG' };
    } else if (level === 1) {
      // Level 1 suggestions
      suggestions['transcription_unit'] = { left: 'GCCA', right: 'CCGA' };
      suggestions['backbone'] = { left: 'TCCG', right: 'GCCA' };
    }

    return suggestions;
  }
}
