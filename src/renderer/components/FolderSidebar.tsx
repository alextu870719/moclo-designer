import React, { useState, useEffect } from 'react';
import type { Folder, Plasmid } from '../../types';
import './FolderSidebar.css';

interface FolderSidebarProps {
  folders: Folder[];
  selectedFolderId: string | undefined;
  onFolderSelect: (folderId: string | undefined) => void;
  onCreateFolder: () => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  plasmidCounts: { [folderId: string]: number };
  onMovePlasmids?: (plasmidIds: string[], targetFolderId: string) => void;
}

export const FolderSidebar: React.FC<FolderSidebarProps> = ({
  folders,
  selectedFolderId,
  onFolderSelect,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  plasmidCounts,
  onMovePlasmids
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [hoveredFolder, setHoveredFolder] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  // 拖拽處理函數
  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(folderId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
  };

  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
    
    try {
      const dragData = e.dataTransfer.getData('text/plain');
      const plasmidIds = JSON.parse(dragData);
      
      if (Array.isArray(plasmidIds) && plasmidIds.length > 0 && onMovePlasmids) {
        onMovePlasmids(plasmidIds, folderId);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  // 按照特定順序排序資料夾：預設資料夾在前，用戶創建的在後
  const sortedFolders = [...folders].sort((a, b) => {
    const defaultOrder = ['default', 'vectors', 'parts', 'assemblies'];
    const aIndex = defaultOrder.indexOf(a.id);
    const bIndex = defaultOrder.indexOf(b.id);
    
    // 如果都是預設資料夾，按預定義順序
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // 預設資料夾排在前面
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // 用戶創建的資料夾按名稱排序
    return a.name.localeCompare(b.name);
  });

  const handleFolderClick = (folderId: string | undefined) => {
    onFolderSelect(folderId);
  };

  const toggleFolderExpansion = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleActionClick = (action: () => void, e: React.MouseEvent) => {
    e.stopPropagation();
    action();
  };

  const getFolderIcon = (folderId: string) => {
    switch (folderId) {
      case 'default': return '📁';
      case 'vectors': return '🧬';
      case 'parts': return '🔧';
      case 'assemblies': return '🔗';
      default: return '📂';
    }
  };

  return (
    <div className="folder-sidebar-content">
      <div className="folder-sidebar-header">
        <h3>資料夾</h3>
        <button 
          className="btn btn-primary btn-sm"
          onClick={onCreateFolder}
          title="新增資料夾"
        >
          ➕
        </button>
      </div>
      
      <div className="folder-list">
        {/* 顯示所有質體選項 - 這是一個特殊的虛擬資料夾 */}
        <div 
          className={`folder-item ${selectedFolderId === 'all' ? 'selected' : ''} ${
            dragOverFolder === 'all' ? 'drag-over' : ''
          }`}
          onClick={() => handleFolderClick('all')}
          onDragOver={(e) => handleDragOver(e, 'all')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'all')}
          style={{
            borderLeft: '4px solid #007bff',
            backgroundColor: selectedFolderId === 'all' ? '#007bff20' : 
                          dragOverFolder === 'all' ? '#007bff10' : 'transparent'
          }}
        >
          <span className="folder-icon">📚</span>
          <span className="folder-name">All Plasmid</span>
          <span className="plasmid-count">
            {Object.values(plasmidCounts).reduce((sum, count) => sum + count, 0)}
          </span>
        </div>

        {/* 顯示資料夾列表 */}
        {sortedFolders.map(folder => (
          <div
            key={folder.id}
            className={`folder-item ${selectedFolderId === folder.id ? 'selected' : ''} ${
              dragOverFolder === folder.id ? 'drag-over' : ''
            }`}
            onClick={() => handleFolderClick(folder.id)}
            onMouseEnter={() => setHoveredFolder(folder.id)}
            onMouseLeave={() => setHoveredFolder(null)}
            onDragOver={(e) => handleDragOver(e, folder.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, folder.id)}
            style={{ 
              borderLeft: `4px solid ${folder.color}`,
              backgroundColor: selectedFolderId === folder.id ? `${folder.color}20` : 
                            dragOverFolder === folder.id ? `${folder.color}10` : 'transparent'
            }}
          >
            <span className="folder-icon">{getFolderIcon(folder.id)}</span>
            <span className="folder-name" title={folder.description}>
              {folder.name}
            </span>
            <span className="plasmid-count">
              {plasmidCounts[folder.id] || 0}
            </span>
            
            {hoveredFolder === folder.id && (
              <div className="folder-actions">
                <button
                  className="btn-icon"
                  onClick={(e) => handleActionClick(() => onEditFolder(folder), e)}
                  title="編輯資料夾"
                >
                  ✏️
                </button>
                {folder.id !== 'default' && (
                  <button
                    className="btn-icon"
                    onClick={(e) => handleActionClick(() => onDeleteFolder(folder), e)}
                    title="刪除資料夾"
                  >
                    🗑️
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
