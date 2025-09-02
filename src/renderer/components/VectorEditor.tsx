import React, { useEffect, useRef } from 'react';
import { Editor } from '@teselagen/ove';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { vectorEditorReducer, vectorEditorMiddleware } from '@teselagen/ove';
import type { Plasmid } from '../../types';

// 創建 Redux store
const createVectorEditorStore = () => {
  const reducer = combineReducers({
    VectorEditor: vectorEditorReducer
  });
  
  return createStore(
    reducer,
    applyMiddleware(vectorEditorMiddleware)
  );
};

interface Props {
  plasmid: Plasmid;
  onSequenceChange?: (sequenceData: any) => void;
  readOnly?: boolean;
  height?: string;
}

export const VectorEditor: React.FC<Props> = ({ 
  plasmid, 
  onSequenceChange,
  readOnly = false,
  height = '600px'
}) => {
  const storeRef = useRef(createVectorEditorStore());

  // 將 plasmid 數據轉換為 OVE 格式
  const sequenceData = React.useMemo(() => {
    return {
      id: plasmid.id,
      name: plasmid.name,
      description: plasmid.description,
      sequence: plasmid.sequence,
      circular: true, // 質體通常是環形的
      size: plasmid.size,
      features: plasmid.features?.map((feature, index) => ({
        id: `feature_${index}`,
        name: feature.name,
        start: feature.start,
        end: feature.end,
        forward: feature.strand === '+',
        type: feature.type || 'misc_feature',
        color: feature.color || '#b3b3b3',
        notes: ''
      })) || [],
      // 將 T2S 切點轉換為 cutsites
      cutsites: plasmid.t2sSites?.map((site, index) => ({
        id: `t2s_${index}`,
        name: site.enzyme,
        position: site.position,
        restrictionEnzyme: {
          name: site.enzyme,
          recognitionSite: site.recognitionSite,
          topSnipOffset: site.cutPositionTop - site.position,
          bottomSnipOffset: site.cutPositionBottom - site.position
        }
      })) || []
    };
  }, [plasmid]);

  // 處理序列變更
  const handleSave = React.useCallback((event: any, sequenceDataToSave: any, editorState: any, onSuccessCallback: () => void) => {
    console.log('序列已變更:', sequenceDataToSave);
    
    if (onSequenceChange) {
      // 將 OVE 格式轉換回 Plasmid 格式
      const updatedPlasmid: Partial<Plasmid> = {
        ...plasmid,
        name: sequenceDataToSave.name,
        description: sequenceDataToSave.description,
        sequence: sequenceDataToSave.sequence,
        size: sequenceDataToSave.sequence?.length || plasmid.size,
        features: sequenceDataToSave.features?.map((feature: any) => ({
          name: feature.name,
          start: feature.start,
          end: feature.end,
          strand: feature.forward ? '+' : '-' as '+' | '-',
          type: feature.type,
          color: feature.color
        })) || []
      };
      
      onSequenceChange(updatedPlasmid);
    }
    
    // 告知 OVE 保存成功
    onSuccessCallback();
  }, [plasmid, onSequenceChange]);

  return (
    <div style={{ height, border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
      <Provider store={storeRef.current}>
        <Editor
          editorName="vectorEditor"
          showReadOnly={true}
          readOnly={readOnly}
          onSave={handleSave}
          sequenceData={sequenceData}
          // 工具欄配置
          ToolBarProps={{
            toolList: [
              'saveTool',
              'downloadTool',
              'importTool',
              'undoTool',
              'redoTool',
              'cutsiteTool',
              'featureTool',
              'orfTool',
              'editTool',
              'findTool',
              'visibilityTool'
            ]
          }}
          // 屬性面板配置
          PropertiesProps={{
            propertiesList: [
              'general',
              'features',
              'parts',
              'primers',
              'translations',
              'cutsites',
              'orfs'
            ]
          }}
          // 狀態欄配置
          StatusBarProps={{
            showCircularity: true,
            showReadOnly: true,
            showAvailability: false
          }}
          // 面板顯示配置
          panelsShown={[
            [
              {
                id: 'sequence',
                name: 'Sequence Map',
                active: true
              }
            ],
            [
              {
                id: 'circular',
                name: 'Circular Map',
                active: true
              },
              {
                id: 'rail',
                name: 'Linear Map',
                active: false
              },
              {
                id: 'properties',
                name: 'Properties',
                active: false
              }
            ]
          ]}
          // 註釋可見性
          annotationVisibility={{
            features: true,
            parts: true,
            cutsites: true,
            primers: false,
            translations: false,
            orfs: false
          }}
          // 註釋標籤可見性
          annotationLabelVisibility={{
            features: true,
            parts: true,
            cutsites: true,
            primers: false
          }}
        />
      </Provider>
    </div>
  );
};

export default VectorEditor;
