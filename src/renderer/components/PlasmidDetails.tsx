import React, { useState, useEffect } from 'react';
import type { Plasmid, T2SSite } from '../../types';
import '../../types/api';

interface Props {
  plasmid: Plasmid;
  onPlasmidUpdate?: (plasmid: Plasmid) => void;
  onDelete?: (plasmid: Plasmid) => void;
}

export const PlasmidDetails: React.FC<Props> = ({ plasmid, onPlasmidUpdate, onDelete }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [currentPlasmid, setCurrentPlasmid] = useState(plasmid);

  // Update internal state when the prop changes
  useEffect(() => {
    console.log('PlasmidDetails 接收到新質體:', plasmid.name, '(ID:', plasmid.id, ')');
    setCurrentPlasmid(plasmid);
  }, [plasmid]);

  const handleAnalyzeT2S = async () => {
    try {
      setAnalyzing(true);
      const analysisResult = await window.mocloAPI.analyzeT2S(currentPlasmid.sequence);
      
      // Extract the t2sSites from the analysis result
      const t2sSitesData = analysisResult.t2sSites || analysisResult; // Handle both formats
      const allT2SSites = Object.values(t2sSitesData).flat();
      
      const updatedPlasmid = {
        ...currentPlasmid,
        t2sSites: allT2SSites,
        mocloCompatible: allT2SSites.length > 0
      };
      
      setCurrentPlasmid(updatedPlasmid);
      if (onPlasmidUpdate) {
        onPlasmidUpdate(updatedPlasmid);
      }
      
      // Update in database
      await window.mocloAPI.addPlasmid(updatedPlasmid);
      
    } catch (error) {
      console.error('Error analyzing T2S sites:', error);
      alert('Error analyzing T2S sites. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const groupedSites = currentPlasmid.t2sSites.reduce((acc, site) => {
    if (!acc[site.enzyme]) {
      acc[site.enzyme] = [];
    }
    acc[site.enzyme].push(site);
    return acc;
  }, {} as { [enzyme: string]: T2SSite[] });

  return (
    <div className="plasmid-details">
      {/* Basic Info */}
      <div className="detail-section">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: 0 }}>Plasmid Information</h3>
          {onDelete && (
            <button
              onClick={() => onDelete(currentPlasmid)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              🗑️ 刪除質體
            </button>
          )}
        </div>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">{currentPlasmid.size}</div>
            <div className="stat-label">Base Pairs</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{currentPlasmid.t2sSites.length}</div>
            <div className="stat-label">T2S Sites</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{currentPlasmid.inserts.length}</div>
            <div className="stat-label">Inserts</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{
              color: currentPlasmid.mocloCompatible ? '#10b981' : '#ef4444'
            }}>
              {currentPlasmid.mocloCompatible ? '✓' : '✗'}
            </div>
            <div className="stat-label">MoClo Compatible</div>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
          <div>
            <strong>Name:</strong> {currentPlasmid.name}
          </div>
          <div>
            <strong>Part Type:</strong> {currentPlasmid.partType}
          </div>
          {currentPlasmid.resistance && (
            <div>
              <strong>Resistance:</strong> {currentPlasmid.resistance}
            </div>
          )}
          {currentPlasmid.origin && (
            <div>
              <strong>Origin:</strong> {currentPlasmid.origin}
            </div>
          )}
          <div>
            <strong>Level:</strong> {currentPlasmid.level}
          </div>
          <div>
            <strong>Added:</strong> {currentPlasmid.addedAt.toLocaleDateString()}
          </div>
        </div>
        
        {currentPlasmid.description && (
          <div style={{ marginTop: '16px' }}>
            <strong>Description:</strong><br />
            <div style={{ marginTop: '4px', color: '#64748b' }}>
              {currentPlasmid.description}
            </div>
          </div>
        )}
      </div>

      {/* T2S Sites */}
      <div className="detail-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>Type IIS Restriction Sites</h3>
          <button 
            onClick={handleAnalyzeT2S}
            disabled={analyzing}
            style={{
              padding: '6px 12px',
              background: analyzing ? '#e5e7eb' : '#3b82f6',
              color: analyzing ? '#6b7280' : 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: analyzing ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {analyzing ? 'Analyzing...' : 'Analyze T2S'}
          </button>
        </div>
        
        {/* Show supported enzymes */}
        <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '14px' }}>
          <strong>Supported Type IIS Enzymes:</strong><br />
          <span style={{ color: '#64748b' }}>
            BsaI (GGTCTC), BbsI (GAAGAC), BsmBI (CGTCTC), Esp3I (CGTCTC), SapI (GCTCTTC), BpiI (GAAGAC), AarI (CACCTGC), BtsI (GCAGTG)
          </span>
        </div>
        
        {Object.keys(groupedSites).length === 0 ? (
          <p style={{ color: '#64748b' }}>No Type IIS sites found.</p>
        ) : (
          <div className="t2s-sites">
            {Object.entries(groupedSites).map(([enzyme, sites]) => (
              <div key={enzyme} className="enzyme-section">
                <div className="enzyme-header">
                  <span className="enzyme-name">{enzyme}</span>
                  <span className="enzyme-count">{sites.length} sites</span>
                </div>
                <div className="site-list">
                  {sites.map((site, index) => (
                    <div key={index} className="site-item">
                      <div>
                        Position: {site.position} ({site.strand})
                      </div>
                      <div>
                        Cuts: {site.cutPositionTop} / {site.cutPositionBottom}
                      </div>
                      <div>
                        Overhang: <span className="overhang">{site.overhangSequence}</span> ({site.overhangType})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inserts */}
      <div className="detail-section">
        <h3>Potential Inserts</h3>
        {currentPlasmid.inserts.length === 0 ? (
          <p style={{ color: '#64748b' }}>No inserts identified between T2S sites.</p>
        ) : (
          <div className="insert-list">
            {currentPlasmid.inserts.map((insert, index) => (
              <div key={insert.id} className="insert-item">
                <div className="insert-header">
                  <span className="insert-type">{insert.partType}</span>
                  <span className="insert-size">
                    {insert.end - insert.start} bp ({insert.start}-{insert.end})
                  </span>
                </div>
                <div className="insert-overhangs">
                  {insert.leftOverhang && (
                    <div>
                      <strong>Left:</strong> <span className="overhang">{insert.leftOverhang}</span>
                    </div>
                  )}
                  {insert.rightOverhang && (
                    <div>
                      <strong>Right:</strong> <span className="overhang">{insert.rightOverhang}</span>
                    </div>
                  )}
                </div>
                <div style={{ 
                  marginTop: '8px', 
                  padding: '8px', 
                  background: '#f1f5f9', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  maxHeight: '60px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {insert.sequence.substring(0, 100)}
                  {insert.sequence.length > 100 && '...'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
