import React from 'react';
import type { Plasmid } from '../../types';

interface DuplicateConfirmDialogProps {
  existingPlasmid: Plasmid;
  newPlasmid: Plasmid;
  onConfirm: (action: 'replace' | 'skip' | 'rename') => void;
  onCancel: () => void;
  isVisible: boolean;
}

export const DuplicateConfirmDialog: React.FC<DuplicateConfirmDialogProps> = ({
  existingPlasmid,
  newPlasmid,
  onConfirm,
  onCancel,
  isVisible
}) => {
  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
      }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          color: '#dc2626',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          重複的質體名稱
        </h3>
        
        <p style={{ 
          margin: '0 0 20px 0', 
          color: '#374151',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          質體名稱 "<strong>{newPlasmid.name}</strong>" 已經存在。請選擇如何處理：
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            padding: '12px'
          }}>
            <h4 style={{ 
              margin: '0 0 8px 0', 
              color: '#059669',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              現有質體
            </h4>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              <p style={{ margin: '0 0 4px 0' }}><strong>名稱:</strong> {existingPlasmid.name}</p>
              <p style={{ margin: '0 0 4px 0' }}><strong>大小:</strong> {existingPlasmid.size} bp</p>
              <p style={{ margin: '0 0 4px 0' }}>
                <strong>添加時間:</strong> {existingPlasmid.addedAt.toLocaleDateString()}
              </p>
              <p style={{ margin: '0' }}>
                <strong>描述:</strong> {existingPlasmid.description || '無描述'}
              </p>
            </div>
          </div>

          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            padding: '12px'
          }}>
            <h4 style={{ 
              margin: '0 0 8px 0', 
              color: '#dc2626',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              新質體
            </h4>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              <p style={{ margin: '0 0 4px 0' }}><strong>名稱:</strong> {newPlasmid.name}</p>
              <p style={{ margin: '0 0 4px 0' }}><strong>大小:</strong> {newPlasmid.size} bp</p>
              <p style={{ margin: '0 0 4px 0' }}>
                <strong>來源:</strong> 新匯入檔案
              </p>
              <p style={{ margin: '0' }}>
                <strong>描述:</strong> {newPlasmid.description || '無描述'}
              </p>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={() => onConfirm('skip')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            跳過匯入
          </button>
          
          <button
            onClick={() => onConfirm('rename')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            重新命名
          </button>
          
          <button
            onClick={() => onConfirm('replace')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            覆蓋現有
          </button>
          
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};
