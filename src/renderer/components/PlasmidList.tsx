import React from 'react';
import type { Plasmid } from '../../types';

interface Props {
  plasmids: Plasmid[];
  selectedPlasmid: Plasmid | null;
  selectedPlasmids?: Plasmid[];
  onSelectPlasmid: (plasmid: Plasmid) => void;
  onToggleSelection?: (plasmid: Plasmid) => void;
  loading: boolean;
}

export const PlasmidList: React.FC<Props> = ({ 
  plasmids, 
  selectedPlasmid, 
  selectedPlasmids = [],
  onSelectPlasmid, 
  onToggleSelection,
  loading 
}) => {
  // 拖拽處理函數
  const handleDragStart = (e: React.DragEvent, plasmid: Plasmid) => {
    const isMultiSelected = selectedPlasmids.find(p => p.id === plasmid.id);
    
    // 如果當前質體是多選中的一個，拖拽所有選中的質體
    // 否則只拖拽當前質體
    const plasmidIds = isMultiSelected && selectedPlasmids.length > 0 
      ? selectedPlasmids.map(p => p.id)
      : [plasmid.id];
    
    e.dataTransfer.setData('text/plain', JSON.stringify(plasmidIds));
    e.dataTransfer.effectAllowed = 'move';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '32px' }}>
        <div className="loading-spinner" />
        <p style={{ marginTop: '8px', fontSize: '14px', color: '#64748b' }}>
          Loading plasmids...
        </p>
      </div>
    );
  }

  if (plasmids.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
        <p>No plasmids found.</p>
        <p style={{ fontSize: '12px' }}>Import a plasmid file to get started.</p>
      </div>
    );
  }

  return (
    <div className="plasmid-list">
      {plasmids.map((plasmid) => {
        const isSelected = selectedPlasmid?.id === plasmid.id;
        const isMultiSelected = selectedPlasmids.find(p => p.id === plasmid.id);
        
        return (
          <div
            key={plasmid.id}
            className={`plasmid-item ${isSelected ? 'selected' : ''} ${isMultiSelected ? 'multi-selected' : ''}`}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, plasmid)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('點擊質體項目:', plasmid.name);
              onSelectPlasmid(plasmid);
            }}
            style={{ cursor: 'pointer' }}
          >
            {onToggleSelection && (
              <div 
                className="selection-checkbox"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelection(plasmid);
                }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '16px',
                  height: '16px',
                  border: '2px solid #d1d5db',
                  borderRadius: '3px',
                  background: isMultiSelected ? '#3b82f6' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isMultiSelected && (
                  <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                )}
              </div>
            )}
            
            <div className="plasmid-name">{plasmid.name}</div>
            <div className="plasmid-info">
              <span>{plasmid.size} bp</span>
              <span>{plasmid.t2sSites.length} T2S sites</span>
            </div>
            <div className="plasmid-info">
              <span style={{
                background: plasmid.mocloCompatible ? '#10b981' : '#ef4444',
                color: 'white',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '8px'
              }}>
                {plasmid.mocloCompatible ? 'MoClo Ready' : 'Not Compatible'}
              </span>
              <span>{plasmid.partType}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
