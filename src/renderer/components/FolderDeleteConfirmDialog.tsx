import React, { useState, useEffect } from 'react';
import type { Folder } from '../../types';

interface FolderDeleteConfirmDialogProps {
  isOpen: boolean;
  folder: Folder | null;
  onClose: () => void;
  onConfirm: (folderId: string, moveTo?: string) => void;
  availableFolders: Folder[];
  plasmidCount: number;
}

export const FolderDeleteConfirmDialog: React.FC<FolderDeleteConfirmDialogProps> = ({
  isOpen,
  folder,
  onClose,
  onConfirm,
  availableFolders,
  plasmidCount
}) => {
  const [moveToFolderId, setMoveToFolderId] = useState<string>('default');

  useEffect(() => {
    if (isOpen && availableFolders.length > 0) {
      // 設定預設移動到的資料夾
      const defaultFolder = availableFolders.find(f => f.id === 'default');
      if (defaultFolder) {
        setMoveToFolderId('default');
      } else {
        setMoveToFolderId(availableFolders[0].id);
      }
    }
  }, [isOpen, availableFolders]);

  const handleConfirm = () => {
    if (folder) {
      onConfirm(folder.id, plasmidCount > 0 ? moveToFolderId : undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen || !folder) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        width: '90%',
        maxWidth: '450px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }} onKeyDown={handleKeyDown}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '20px',
          borderBottom: '1px solid #e9ecef'
        }}>
          <span style={{
            fontSize: '24px',
            color: '#dc3545',
            marginRight: '12px'
          }}>⚠️</span>
          <h2 style={{
            margin: 0,
            color: '#333',
            fontSize: '18px',
            fontWeight: 600
          }}>刪除資料夾</h2>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          <div style={{
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '6px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <p style={{
              margin: 0,
              color: '#721c24',
              fontSize: '14px',
              fontWeight: 500
            }}>
              您確定要刪除資料夾 <strong>"{folder.name}"</strong> 嗎？
            </p>
          </div>

          {/* Folder info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            background: '#f8f9fa',
            borderRadius: '6px',
            marginBottom: '20px',
            borderLeft: `4px solid ${folder.color}`
          }}>
            <span style={{
              fontSize: '18px',
              marginRight: '12px'
            }}>📂</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontWeight: 600,
                fontSize: '14px',
                color: '#333'
              }}>{folder.name}</div>
              {folder.description && (
                <div style={{
                  fontSize: '12px',
                  color: '#6c757d',
                  marginTop: '2px'
                }}>{folder.description}</div>
              )}
            </div>
            <span style={{
              background: '#6c757d',
              color: 'white',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: 500
            }}>
              {plasmidCount} 個質體
            </span>
          </div>

          {/* 如果資料夾內有質體，顯示移動選項 */}
          {plasmidCount > 0 && (
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '6px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <div style={{
                color: '#856404',
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '12px'
              }}>
                此資料夾包含 {plasmidCount} 個質體，請選擇要將它們移動到哪個資料夾：
              </div>
              
              <select
                value={moveToFolderId}
                onChange={(e) => setMoveToFolderId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                {availableFolders
                  .filter(f => f.id !== folder.id)
                  .map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                      {f.id === 'default' ? ' (預設)' : ''}
                    </option>
                  ))
                }
              </select>
            </div>
          )}

          {/* Warning */}
          <div style={{
            fontSize: '13px',
            color: '#6c757d',
            lineHeight: '1.4'
          }}>
            <strong>注意：</strong>這個操作無法撤銷。
            {plasmidCount > 0 
              ? '資料夾內的質體將被移動到選定的資料夾。'
              : '資料夾將被永久刪除。'
            }
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid #e9ecef',
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end'
        }}>
          <button 
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: '#6c757d',
              color: 'white'
            }}
            onClick={onClose}
          >
            取消
          </button>
          <button 
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: '#dc3545',
              color: 'white'
            }}
            onClick={handleConfirm}
          >
            {plasmidCount > 0 ? '移動並刪除' : '刪除'}
          </button>
        </div>
      </div>
    </div>
  );
};
