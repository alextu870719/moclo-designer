import React, { useState, useEffect } from 'react';
import type { Plasmid } from '../../types';
import '../../types/api';

// Import types - we'll define these inline for now to avoid path issues
interface GoldenGateStrategy {
  level: number;
  parts: GoldenGatePart[];
  backbone: GoldenGatePart;
  assemblyOrder: string[];
  warnings: string[];
  conflicts: string[];
  efficiency: 'high' | 'medium' | 'low';
}

interface GoldenGatePart {
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

interface AssemblyReaction {
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

interface Props {
  plasmids: Plasmid[];
  onStrategyUpdate?: (strategy: GoldenGateStrategy) => void;
}

export const GoldenGateDesigner: React.FC<Props> = ({ plasmids, onStrategyUpdate }) => {
  const [strategy, setStrategy] = useState<GoldenGateStrategy | null>(null);
  const [assemblyReaction, setAssemblyReaction] = useState<AssemblyReaction | null>(null);
  const [selectedEnzyme, setSelectedEnzyme] = useState<string>('BsaI');
  const [designing, setDesigning] = useState(false);
  const [showOptimization, setShowOptimization] = useState(false);
  const [customOrder, setCustomOrder] = useState<GoldenGatePart[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const enzymes = ['BsaI', 'BbsI', 'BsmBI', 'Esp3I', 'SapI'];

  const handleDesignStrategy = async () => {
    if (plasmids.length < 2) {
      alert('需要至少 2 個質體來設計 Golden Gate 組裝策略');
      return;
    }

    try {
      setDesigning(true);
      const newStrategy = await window.mocloAPI.designGoldenGateStrategy(plasmids);
      setStrategy(newStrategy);
      setCustomOrder(newStrategy.parts); // Initialize custom order with suggested order
      
      if (onStrategyUpdate) {
        onStrategyUpdate(newStrategy);
      }

      // Generate assembly reaction
      const reaction = await window.mocloAPI.generateAssemblyReaction(newStrategy, selectedEnzyme);
      setAssemblyReaction(reaction);
    } catch (error) {
      console.error('Error designing strategy:', error);
      alert('設計策略時發生錯誤');
    } finally {
      setDesigning(false);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
    
    // Create custom drag image with better visual
    const dragElement = e.currentTarget as HTMLElement;
    const rect = dragElement.getBoundingClientRect();
    const clone = dragElement.cloneNode(true) as HTMLElement;
    
    // Style the drag preview
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.transform = 'rotate(-3deg) scale(1.1)';
    clone.style.opacity = '0.9';
    clone.style.boxShadow = '0 15px 30px rgba(0,0,0,0.3)';
    clone.style.borderRadius = '12px';
    clone.style.zIndex = '9999';
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    clone.style.border = '3px solid #4f46e5';
    clone.style.color = 'white';
    
    document.body.appendChild(clone);
    e.dataTransfer.setDragImage(clone, rect.width / 2, rect.height / 2);
    
    // Clean up after drag image is set
    setTimeout(() => {
      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Get the target element and its index
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const draggedElement = target.closest('[data-drag-index]');
    if (draggedElement) {
      const targetIndex = parseInt(draggedElement.getAttribute('data-drag-index') || '0');
      setDragOverIndex(targetIndex);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only clear dragOverIndex if we're leaving the entire drag area
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setIsDragging(false);
      return;
    }

    const newOrder = [...customOrder];
    const draggedItem = newOrder[draggedIndex];
    
    // Remove dragged item
    newOrder.splice(draggedIndex, 1);
    
    // Insert at new position
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newOrder.splice(insertIndex, 0, draggedItem);
    
    setCustomOrder(newOrder);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
    
    // Update strategy with new order
    if (strategy) {
      const updatedStrategy = {
        ...strategy,
        parts: newOrder,
        assemblyOrder: newOrder.map(part => part.id)
      };
      setStrategy(updatedStrategy);
      
      // Regenerate assembly reaction with new order
      if (selectedEnzyme) {
        handleEnzymeChange(selectedEnzyme);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  const resetToOriginalOrder = () => {
    if (strategy) {
      setCustomOrder(strategy.parts);
    }
  };

  const handleEnzymeChange = async (enzyme: string) => {
    setSelectedEnzyme(enzyme);
    if (strategy) {
      const reaction = await window.mocloAPI.generateAssemblyReaction(strategy, enzyme);
      setAssemblyReaction(reaction);
    }
  };

  const getEfficiencyColor = (efficiency: string) => {
    switch (efficiency) {
      case 'high': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'low': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPartTypeIcon = (partType: string) => {
    switch (partType) {
      case 'promoter': return '🚀';
      case 'cds': return '🧬';
      case 'terminator': return '🛑';
      case 'backbone': return '⚡';
      case 'connector': return '🔗';
      default: return '📄';
    }
  };

  return (
    <div className="golden-gate-designer">
      <div className="designer-header">
        <h2>Golden Gate 克隆策略設計</h2>
        <div className="designer-controls">
          <select 
            value={selectedEnzyme} 
            onChange={(e) => handleEnzymeChange(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              marginRight: '12px'
            }}
          >
            {enzymes.map(enzyme => (
              <option key={enzyme} value={enzyme}>{enzyme}</option>
            ))}
          </select>
          
          <button 
            onClick={handleDesignStrategy}
            disabled={designing || plasmids.length < 2}
            style={{
              padding: '8px 16px',
              background: designing ? '#e5e7eb' : '#3b82f6',
              color: designing ? '#6b7280' : 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: designing || plasmids.length < 2 ? 'not-allowed' : 'pointer',
              marginRight: '8px'
            }}
          >
            {designing ? '設計中...' : '設計策略'}
          </button>

          <button 
            onClick={() => setShowOptimization(!showOptimization)}
            style={{
              padding: '8px 16px',
              background: showOptimization ? '#10b981' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {showOptimization ? '隱藏優化' : '顯示優化'}
          </button>
        </div>
      </div>

      {/* Input Plasmids Summary */}
      <div className="input-summary" style={{ 
        background: '#f8fafc', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '20px' 
      }}>
        <h3>輸入質體 ({plasmids.length})</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
          {plasmids.map(plasmid => (
            <div key={plasmid.id} style={{
              background: 'white',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontWeight: 'bold' }}>{plasmid.name}</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {plasmid.partType} • {plasmid.size} bp • {plasmid.t2sSites.length} T2S 位點
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                兼容性: {plasmid.mocloCompatible ? '✅' : '❌'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {strategy && (
        <>
          {/* Strategy Overview */}
          <div className="strategy-overview" style={{ marginBottom: '24px' }}>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3>策略概覽</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
                <div className="stat-card">
                  <div className="stat-value">Level {strategy.level}</div>
                  <div className="stat-label">MoClo 層級</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: getEfficiencyColor(strategy.efficiency) }}>
                    {strategy.efficiency.toUpperCase()}
                  </div>
                  <div className="stat-label">組裝效率</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{strategy.parts.length}</div>
                  <div className="stat-label">部件數量</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: strategy.conflicts.length > 0 ? '#ef4444' : '#10b981' }}>
                    {strategy.conflicts.length}
                  </div>
                  <div className="stat-label">衝突數量</div>
                </div>
              </div>
            </div>
          </div>

          {/* Assembly Order */}
          <div className="assembly-order" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3>組裝順序</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={resetToOriginalOrder}
                  style={{
                    padding: '6px 12px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  重置順序
                </button>
                <div style={{ fontSize: '12px', color: '#6b7280', alignSelf: 'center' }}>
                  📍 拖拽來重新排列
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: isDragging ? '#f8fafc' : 'white',
              padding: '20px',
              borderRadius: '8px',
              border: isDragging ? '2px dashed #3b82f6' : '1px solid #e5e7eb',
              overflowX: 'auto',
              minHeight: '120px',
              transition: 'all 0.3s ease'
            }}>
              {customOrder.map((part, index) => {
                const isDraggedItem = draggedIndex === index;
                const isDropTarget = dragOverIndex === index && draggedIndex !== index;
                
                return (
                  <div key={part.id} style={{ display: 'flex', alignItems: 'center' }}>
                    <div 
                      draggable
                      data-drag-index={index}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      style={{
                        position: 'relative',
                        minWidth: '150px',
                        textAlign: 'center',
                        padding: '12px',
                        background: isDraggedItem 
                          ? '#ddd6fe' 
                          : isDropTarget 
                            ? '#e0f2fe' 
                            : part.compatible 
                              ? '#ecfdf5' 
                              : '#fef2f2',
                        borderRadius: '12px',
                        border: isDraggedItem 
                          ? '3px solid #8b5cf6' 
                          : isDropTarget 
                            ? '3px dashed #0ea5e9' 
                            : `2px solid ${part.compatible ? '#10b981' : '#ef4444'}`,
                        cursor: isDraggedItem ? 'grabbing' : 'grab',
                        userSelect: 'none',
                        transition: isDraggedItem ? 'none' : 'all 0.3s ease',
                        transform: isDraggedItem 
                          ? 'scale(1.1) rotate(-2deg)' 
                          : isDropTarget 
                            ? 'scale(1.05)' 
                            : 'scale(1)',
                        opacity: isDraggedItem ? 0.7 : 1,
                        boxShadow: isDraggedItem 
                          ? '0 20px 40px rgba(139, 92, 246, 0.3)' 
                          : isDropTarget 
                            ? '0 10px 25px rgba(14, 165, 233, 0.2)' 
                            : '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ 
                        fontSize: '18px', 
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span>{getPartTypeIcon(part.partType)}</span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>#{index + 1}</span>
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                        {part.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                        {part.partType}
                      </div>
                      <div style={{ fontSize: '12px' }}>
                        <span style={{ 
                          background: '#f3f4f6', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          marginRight: '4px',
                          fontFamily: 'monospace',
                          fontSize: '10px'
                        }}>
                          {part.leftOverhang}
                        </span>
                        <span style={{ 
                          background: '#f3f4f6', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontSize: '10px'
                        }}>
                          {part.rightOverhang}
                        </span>
                      </div>
                      
                      {/* Drag handle */}
                      <div style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        fontSize: '12px',
                        color: isDraggedItem ? '#8b5cf6' : isDropTarget ? '#0ea5e9' : '#9ca3af'
                      }}>
                        {isDraggedItem ? '🎯' : isDropTarget ? '📍' : '⋮⋮'}
                      </div>
                    </div>
                    
                    {index < customOrder.length - 1 && (
                      <div style={{ 
                        margin: '0 12px', 
                        fontSize: '20px', 
                        color: '#6b7280',
                        userSelect: 'none'
                      }}>
                        →
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Order validation */}
            <div style={{ marginTop: '12px', fontSize: '14px' }}>
              {customOrder.length > 1 && (
                <div>
                  <strong>連接驗證:</strong>
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {customOrder.slice(0, -1).map((part, index) => {
                      const nextPart = customOrder[index + 1];
                      const isCompatible = part.rightOverhang === nextPart.leftOverhang;
                      
                      return (
                        <div 
                          key={`${part.id}-${nextPart.id}`}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: isCompatible ? '#ecfdf5' : '#fef2f2',
                            border: `1px solid ${isCompatible ? '#10b981' : '#ef4444'}`,
                            fontSize: '12px'
                          }}
                        >
                          {part.name} → {nextPart.name}
                          <div style={{ 
                            fontFamily: 'monospace', 
                            fontSize: '10px',
                            color: isCompatible ? '#065f46' : '#7f1d1d'
                          }}>
                            {part.rightOverhang} ≡ {nextPart.leftOverhang} {isCompatible ? '✓' : '✗'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Issues and Warnings */}
          {(strategy.conflicts.length > 0 || strategy.warnings.length > 0) && (
            <div className="issues-warnings" style={{ marginBottom: '24px' }}>
              {strategy.conflicts.length > 0 && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '12px'
                }}>
                  <h4 style={{ color: '#dc2626', marginBottom: '8px' }}>⚠️ 衝突問題</h4>
                  {strategy.conflicts.map((conflict, index) => (
                    <div key={index} style={{ color: '#7f1d1d', fontSize: '14px', marginBottom: '4px' }}>
                      • {conflict}
                    </div>
                  ))}
                </div>
              )}

              {strategy.warnings.length > 0 && (
                <div style={{
                  background: '#fffbeb',
                  border: '1px solid #fed7aa',
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <h4 style={{ color: '#d97706', marginBottom: '8px' }}>⚡ 注意事項</h4>
                  {strategy.warnings.map((warning, index) => (
                    <div key={index} style={{ color: '#92400e', fontSize: '14px', marginBottom: '4px' }}>
                      • {warning}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Assembly Reaction Details */}
          {assemblyReaction && (
            <div className="assembly-reaction" style={{ marginBottom: '24px' }}>
              <h3>組裝反應詳情</h3>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <strong>使用酶:</strong> {assemblyReaction.enzyme}
                  </div>
                  <div>
                    <strong>預期產物大小:</strong> {assemblyReaction.expectedProduct.size.toLocaleString()} bp
                  </div>
                  <div>
                    <strong>組裝效率:</strong> 
                    <span style={{ color: getEfficiencyColor(strategy.efficiency), marginLeft: '8px' }}>
                      {(assemblyReaction.efficiency * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <strong>環化:</strong> {assemblyReaction.expectedProduct.circularized ? '✅' : '❌'}
                  </div>
                </div>
                
                <div style={{ marginTop: '16px' }}>
                  <strong>涉及的黏端序列:</strong>
                  <div style={{ marginTop: '8px' }}>
                    {assemblyReaction.expectedProduct.overhangs.map(overhang => (
                      <span key={overhang} style={{
                        background: '#f3f4f6',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        marginRight: '8px',
                        marginBottom: '4px',
                        display: 'inline-block',
                        fontFamily: 'monospace'
                      }}>
                        {overhang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Optimization Suggestions */}
      {showOptimization && strategy && (
        <div className="optimization-suggestions">
          <h3>優化建議</h3>
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <h4 style={{ color: '#0c4a6e', marginBottom: '12px' }}>💡 改進策略</h4>
            
            {strategy.efficiency === 'low' && (
              <div style={{ marginBottom: '8px', color: '#164e63' }}>
                • 考慮重新設計黏端序列以減少衝突
              </div>
            )}
            
            {strategy.conflicts.length > 0 && (
              <div style={{ marginBottom: '8px', color: '#164e63' }}>
                • 使用不同的限制酶或修改部件設計來解決黏端衝突
              </div>
            )}
            
            <div style={{ marginBottom: '8px', color: '#164e63' }}>
              • 建議使用標準 MoClo 黏端序列以獲得最佳相容性
            </div>
            
            <div style={{ marginBottom: '8px', color: '#164e63' }}>
              • 考慮添加適當的連接器部件以改善組裝順序
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
