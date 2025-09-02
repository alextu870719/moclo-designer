import React, { useState, useEffect } from 'react';
import type { Folder } from '../../types';

interface FolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folder: Omit<Folder, 'createdAt'>) => void;
  editingFolder?: Folder;
}

const PREDEFINED_COLORS = [
  '#007bff', // 藍色
  '#28a745', // 綠色
  '#dc3545', // 紅色
  '#ffc107', // 黃色
  '#17a2b8', // 青色
  '#6f42c1', // 紫色
  '#fd7e14', // 橙色
  '#20c997', // 蒂芙尼綠
  '#6c757d', // 灰色
  '#e83e8c', // 粉色
];

export const FolderDialog: React.FC<FolderDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  editingFolder
}) => {
  const [formData, setFormData] = useState<Omit<Folder, 'createdAt'>>({
    id: '',
    name: '',
    description: '',
    color: '#007bff'
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (isOpen) {
      if (editingFolder) {
        setFormData({
          id: editingFolder.id,
          name: editingFolder.name,
          description: editingFolder.description || '',
          color: editingFolder.color
        });
      } else {
        setFormData({
          id: '',
          name: '',
          description: '',
          color: '#007bff'
        });
      }
      setErrors({});
    }
  }, [isOpen, editingFolder]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = '資料夾名稱不能為空';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = '資料夾名稱不能超過50個字符';
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = '描述不能超過200個字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      const folderData = {
        ...formData,
        name: formData.name.trim(),
        description: (formData.description || '').trim()
      };
      
      // 如果是新建資料夾，生成ID
      if (!editingFolder) {
        folderData.id = `folder_${Date.now()}`;
      }
      
      onSave(folderData);
      onClose();
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除對應的錯誤信息
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

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
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }} onKeyDown={handleKeyDown}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px',
          borderBottom: '1px solid #e9ecef'
        }}>
          <h2 style={{
            margin: 0,
            color: '#333',
            fontSize: '18px',
            fontWeight: 600
          }}>{editingFolder ? '編輯資料夾' : '新增資料夾'}</h2>
          <button 
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#6c757d',
              padding: 0,
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'background-color 0.2s'
            }}
            onClick={onClose}
          >✕</button>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 500,
              color: '#333',
              fontSize: '14px'
            }}>資料夾名稱 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="輸入資料夾名稱..."
              maxLength={50}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.name ? '#dc3545' : '#ddd'}`,
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
            {errors.name && <div style={{
              color: '#dc3545',
              fontSize: '12px',
              marginTop: '4px'
            }}>{errors.name}</div>}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 500,
              color: '#333',
              fontSize: '14px'
            }}>描述</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="輸入資料夾描述..."
              maxLength={200}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.description ? '#dc3545' : '#ddd'}`,
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
            {errors.description && <div style={{
              color: '#dc3545',
              fontSize: '12px',
              marginTop: '4px'
            }}>{errors.description}</div>}
            <div style={{
              fontSize: '12px',
              color: '#6c757d',
              textAlign: 'right',
              marginTop: '4px'
            }}>
              {(formData.description || '').length}/200
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 500,
              color: '#333',
              fontSize: '14px'
            }}>顏色</label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '12px'
            }}>
              {PREDEFINED_COLORS.map(color => (
                <button
                  key={color}
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: color,
                    border: `2px solid ${formData.color === color ? '#333' : '#ddd'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    transform: formData.color === color ? 'scale(1.1)' : 'scale(1)'
                  }}
                  onClick={() => handleInputChange('color', color)}
                  title={color}
                >
                  {formData.color === color && (
                    <span style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      textShadow: '1px 1px 1px rgba(0, 0, 0, 0.5)'
                    }}>✓</span>
                  )}
                </button>
              ))}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px',
              background: '#f8f9fa',
              borderRadius: '4px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                backgroundColor: formData.color,
                borderRadius: '50%',
                border: '1px solid #ddd'
              }} />
              <span>預覽顏色: {formData.color}</span>
            </div>
          </div>

          {formData.name && (
            <div style={{
              background: '#f8f9fa',
              padding: '15px',
              borderRadius: '6px',
              marginTop: '10px'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#6c757d',
                marginBottom: '8px'
              }}>預覽:</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                background: 'white',
                borderRadius: '4px',
                minHeight: '40px',
                borderLeft: `4px solid ${formData.color}`
              }}>
                <span style={{
                  fontSize: '16px',
                  marginRight: '10px'
                }}>📂</span>
                <span style={{
                  flex: 1,
                  fontSize: '14px',
                  color: '#333'
                }}>{formData.name}</span>
                <span style={{
                  background: '#6c757d',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  fontSize: '11px',
                  fontWeight: 500
                }}>0</span>
              </div>
            </div>
          )}
        </div>

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
              backgroundColor: '#007bff',
              color: 'white'
            }}
            onClick={handleSave}
          >
            {editingFolder ? '更新' : '新增'}
          </button>
        </div>
      </div>
    </div>
  );
};
