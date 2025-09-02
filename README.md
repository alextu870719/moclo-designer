# MoClo Designer

A comprehensive Golden Gate cloning design tool focused on MoClo (Modular Cloning) standards.

## Features

### Core Functionality
- **Plasmid Database**: SQLite-based storage for all your plasmids with full metadata
- **T2S Enzyme Detection**: Automatic detection of BsaI, BbsI, BsmBI, and Esp3I sites
- **Overhang Analysis**: Calculate and validate 4-bp overhangs for Golden Gate assembly
- **Insert Extraction**: Identify and extract insert regions between T2S sites
- **MoClo Compatibility**: Check plasmids for MoClo standard compliance

### Analysis Tools
- Multi-enzyme scanning across entire plasmid sequences
- Overhang validation (no duplicates, no palindromes, balanced GC content)
- Insert region identification with flanking overhangs
- Part type classification (promoter, CDS, terminator, vector, etc.)

### User Interface
- Clean, modern desktop application built with Electron
- Sidebar plasmid browser with search functionality
- Detailed plasmid viewer with sequence statistics
- T2S site visualization grouped by enzyme
- Insert information with sequence previews

## Installation & Usage

### Development
```bash
npm install
npm run build
npm start
```

### Production Build
```bash
npm run dist
```

## File Format Support
- GenBank (.gb, .gbk, .genbank)
- FASTA (.fasta, .fa, .seq)

## MoClo Standards Support
- Level 0, 1, and 2 assemblies
- Standard overhang validation
- Part type classification
- Assembly compatibility checking

## Technical Architecture
- **Frontend**: React + TypeScript + Modern CSS
- **Backend**: Electron Main Process
- **Database**: SQLite3 with full schema for plasmids, features, sites, and inserts
- **Analysis**: Custom T2S analyzer with all major Golden Gate enzymes

## Database Schema
- `plasmids`: Core plasmid information
- `plasmid_features`: GenBank-style features
- `t2s_sites`: All Type IIS restriction sites
- `inserts`: Identified insert regions with overhangs

Built for molecular biologists who need robust, standards-compliant Golden Gate design tools.
