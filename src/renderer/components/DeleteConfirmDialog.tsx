import React from 'react';
import type { Plasmid } from '../../types';

interface DeleteConfirmDialogProps {
  plasmids: Plasmid[];
  onConfirm: () => void;
  onCancel: () => void;
  isVisible: boolean;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  plasmids,
  onConfirm,
  onCancel,
  isVisible
}) => {
  if (!isVisible) return null;

  const isSingle = plasmids.length === 1;

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
        maxWidth: '500px',
        width: '90%',
        maxHeight: '70vh',
        overflow: 'auto',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
      }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          color: '#dc2626',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          {isSingle ? '確認刪除質體' : '確認批量刪除'}
        </h3>
        
        <p style={{ 
          margin: '0 0 16px 0', 
          color: '#374151',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          {isSingle 
            ? '您確定要刪除以下質體嗎？此操作無法撤銷。'
            : `您確定要刪除以下 ${plasmids.length} 個質體嗎？此操作無法撤銷。`
          }
        </p>

        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '20px',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {plasmids.map((plasmid, index) => (
            <div key={plasmid.id} style={{
              padding: '8px 0',
              borderBottom: index < plasmids.length - 1 ? '1px solid #fee2e2' : 'none'
            }}>
              <div style={{
                fontWeight: '600',
                color: '#dc2626',
                fontSize: '13px',
                marginBottom: '4px'
              }}>
                {plasmid.name}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                display: 'flex',
                gap: '12px'
              }}>
                <span>大小: {plasmid.size} bp</span>
                <span>類型: {plasmid.partType}</span>
                {plasmid.addedAt && (
                  <span>添加: {plasmid.addedAt.toLocaleDateString()}</span>
                )}
              </div>
              {plasmid.description && (
                <div style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                  marginTop: '2px',
                  fontStyle: 'italic'
                }}>
                  {plasmid.description}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
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
          
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            {isSingle ? '刪除質體' : `刪除 ${plasmids.length} 個質體`}
          </button>
        </div>
      </div>
    </div>
  );
};
