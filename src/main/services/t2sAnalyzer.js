"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.T2SAnalyzer = exports.MOCLO_ENZYMES = void 0;
// MoClo standard Type IIS enzymes
exports.MOCLO_ENZYMES = [
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
    }
];
class T2SAnalyzer {
    reverseComplement(seq) {
        const complement = {
            'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G',
            'a': 't', 't': 'a', 'g': 'c', 'c': 'g'
        };
        return seq.split('').reverse().map(base => complement[base] || base).join('');
    }
    findT2SSites(sequence, enzyme) {
        const sites = [];
        const seq = sequence.toUpperCase();
        const site = enzyme.recognitionSite.toUpperCase();
        // Find forward sites
        let pos = 0;
        while ((pos = seq.indexOf(site, pos)) !== -1) {
            const cutTop = pos + enzyme.cutOffsetForward;
            const cutBottom = pos + enzyme.cutOffsetReverse;
            let overhangSeq = '';
            let overhangType;
            if (cutTop < cutBottom) {
                // 5' overhang
                overhangSeq = seq.substring(cutTop, cutBottom);
                overhangType = '5prime';
            }
            else {
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
        // Find reverse sites
        const rcSeq = this.reverseComplement(seq);
        pos = 0;
        while ((pos = rcSeq.indexOf(site, pos)) !== -1) {
            const actualPos = seq.length - pos - site.length;
            const cutTop = actualPos + (site.length - enzyme.cutOffsetReverse);
            const cutBottom = actualPos + (site.length - enzyme.cutOffsetForward);
            let overhangSeq = '';
            let overhangType;
            if (cutTop < cutBottom) {
                overhangSeq = seq.substring(cutTop, cutBottom);
                overhangType = '5prime';
            }
            else {
                overhangSeq = seq.substring(cutBottom, cutTop);
                overhangType = '3prime';
            }
            sites.push({
                enzyme: enzyme.name,
                position: actualPos,
                strand: '-',
                recognitionSite: site,
                cutPositionTop: cutTop,
                cutPositionBottom: cutBottom,
                overhangSequence: overhangSeq,
                overhangType
            });
            pos++;
        }
        return sites.sort((a, b) => a.position - b.position);
    }
    analyzeAllEnzymes(sequence) {
        const results = {};
        for (const enzyme of exports.MOCLO_ENZYMES) {
            results[enzyme.name] = this.findT2SSites(sequence, enzyme);
        }
        return results;
    }
    findInsertRegions(sequence, enzyme) {
        const sites = this.findT2SSites(sequence, enzyme);
        const inserts = [];
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
    validateMoCloOverhangs(overhangs) {
        const conflicts = [];
        const warnings = [];
        // Check for duplicate overhangs
        const seen = new Set();
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
exports.T2SAnalyzer = T2SAnalyzer;
