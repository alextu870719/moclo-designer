import React, { useState, useEffect } from 'react';
import type { Plasmid, T2SSite, Folder } from '../types';
import '../types/api';
import { PlasmidList } from './components/PlasmidList';
import { PlasmidDetails } from './components/PlasmidDetails';
import { ImportButton } from './components/ImportButton';
import { GoldenGateDesigner } from './components/GoldenGateDesigner';
import { DuplicateConfirmDialog } from './components/DuplicateConfirmDialog';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { FolderSidebar } from './components/FolderSidebar';
import { FolderDialog } from './components/FolderDialog';
import { FolderDeleteConfirmDialog } from './components/FolderDeleteConfirmDialog';

const App: React.FC = () => {
  const [plasmids, setPlasmids] = useState<Plasmid[]>([]);
  const [allPlasmids, setAllPlasmids] = useState<Plasmid[]>([]); // 存儲所有質體，用於計算資料夾計數
  const [selectedPlasmid, setSelectedPlasmid] = useState<Plasmid | null>(null);
  const [selectedPlasmids, setSelectedPlasmids] = useState<Plasmid[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importingFolder, setImportingFolder] = useState(false);
  const [currentView, setCurrentView] = useState<'plasmids' | 'designer'>('plasmids');
  
  // 資料夾相關狀態
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>('all');
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | undefined>(undefined);
  const [showFolderDeleteDialog, setShowFolderDeleteDialog] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isFolderSidebarVisible, setIsFolderSidebarVisible] = useState<boolean>(true);
  
  // 重複確認對話框狀態
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    existing: Plasmid;
    new: Plasmid;
    onResolve: (action: 'replace' | 'skip' | 'rename') => void;
  } | null>(null);

  // 刪除確認對話框狀態
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [plasmidsToDelete, setPlasmidsToDelete] = useState<Plasmid[]>([]);

    // Enhanced helper function to extract sequence from various file formats
  const extractSequence = (content: string, filename: string) => {
    try {
      console.log(`正在解析檔案: ${filename}`);
      const cleanContent = content.trim();
      
      if (!cleanContent) {
        console.warn(`檔案 ${filename} 內容為空`);
        return { sequence: '', description: `空檔案: ${filename}` };
      }
      
      // FASTA format detection
      if (cleanContent.startsWith('>') || filename.toLowerCase().match(/\.(fasta|fa|fas)$/)) {
        console.log(`檢測為 FASTA 格式: ${filename}`);
        const lines = cleanContent.split('\n');
        let description = '';
        let sequenceLines: string[] = [];
        
        if (lines[0].startsWith('>')) {
          description = lines[0].substring(1).trim();
          sequenceLines = lines.slice(1);
        } else {
          // Even if filename suggests FASTA but no '>', treat as sequence data
          sequenceLines = lines;
          description = `序列來自 ${filename}`;
        }
        
        const sequence = sequenceLines
        .join('')
        .replace(/[^ATCGRYSWKMBDHVN]/gi, '')  // Allow degenerate bases
        .toUpperCase();
        
      if (sequence.length > 0) {
        return { sequence, description: description || `FASTA 序列來自 ${filename}` };
      }
    }
    
    // GenBank format detection (comprehensive)
    if (cleanContent.includes('LOCUS') || 
        cleanContent.includes('ORIGIN') || 
        cleanContent.includes('FEATURES') ||
        filename.toLowerCase().match(/\.(gb|gbk|genbank|ape|dna)$/)) {
      
      let description = '';
      let sequence = '';
      
      // Extract LOCUS line for description
      const locusMatch = cleanContent.match(/LOCUS\s+([^\n]+)/);
      if (locusMatch) {
        description = `GenBank: ${locusMatch[1].trim()}`;
      }
      
      // Try to find DEFINITION line for better description
      const definitionMatch = cleanContent.match(/DEFINITION\s+([^\n]+(?:\n\s+[^\n]+)*)/);
      if (definitionMatch) {
        description = definitionMatch[1].replace(/\n\s+/g, ' ').trim();
      }
      
      // Extract sequence from ORIGIN section
      const originIndex = cleanContent.indexOf('ORIGIN');
      if (originIndex !== -1) {
        const sequenceSection = cleanContent.substring(originIndex);
        const endMatch = sequenceSection.match(/\/\//);
        const sequenceText = endMatch ? 
          sequenceSection.substring(0, endMatch.index) : 
          sequenceSection;
          
        sequence = sequenceText
          .replace(/ORIGIN/g, '')
          .replace(/\d+/g, '')           // Remove numbers
          .replace(/\s+/g, '')           // Remove whitespace
          .replace(/[^ATCGRYSWKMBDHVN]/gi, '')  // Keep only valid bases
          .toUpperCase();
      }
      
      if (sequence.length > 0) {
        return { 
          sequence, 
          description: description || `GenBank 序列來自 ${filename}` 
        };
      }
    }
    
    // Plain text sequence (fallback)
    const plainSequence = cleanContent
      .replace(/[^ATCGRYSWKMBDHVN]/gi, '')
      .toUpperCase();
      
    if (plainSequence.length > 10) { // Minimum reasonable sequence length
      return { 
        sequence: plainSequence, 
        description: `純文字序列來自 ${filename}` 
      };
    }
    
    // If all else fails, try to find any DNA-like content line by line
    const lines = cleanContent.split('\n');
    let longestSequenceLine = '';
    
    for (const line of lines) {
      const cleanLine = line.replace(/[^ATCGRYSWKMBDHVN]/gi, '').toUpperCase();
      if (cleanLine.length > longestSequenceLine.length && cleanLine.length > 20) {
        longestSequenceLine = cleanLine;
      }
    }
    
    if (longestSequenceLine.length > 20) {
      console.log(`成功提取序列從 ${filename}, 長度: ${longestSequenceLine.length}`);
      return {
        sequence: longestSequenceLine,
        description: `從 ${filename} 提取的序列`
      };
    }
    
    console.warn(`無法從檔案 ${filename} 中找到有效序列`);
    return { sequence: '', description: `無法解析: ${filename}` };
    
    } catch (error) {
      console.error(`解析檔案 ${filename} 時發生錯誤:`, error);
      return { sequence: '', description: `錯誤: ${filename}` };
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 處理重複質體名稱確認的幫助函數
  const handleDuplicateCheck = async (plasmid: Plasmid): Promise<boolean> => {
    const existingPlasmid = await window.mocloAPI.getPlasmidByName(plasmid.name);
    
    if (!existingPlasmid) {
      // 沒有重複，直接添加
      return await window.mocloAPI.addPlasmid(plasmid);
    }

    // 有重複，顯示確認對話框
    return new Promise((resolve) => {
      setDuplicateInfo({
        existing: existingPlasmid,
        new: plasmid,
        onResolve: async (action: 'replace' | 'skip' | 'rename') => {
          setShowDuplicateDialog(false);
          setDuplicateInfo(null);
          
          switch (action) {
            case 'skip':
              console.log(`跳過導入重複質體: ${plasmid.name}`);
              resolve(false);
              break;
              
            case 'replace':
              console.log(`覆蓋現有質體: ${plasmid.name}`);
              // 保持原有ID以便覆蓋
              plasmid.id = existingPlasmid.id;
              const replaceSuccess = await window.mocloAPI.addPlasmid(plasmid);
              resolve(replaceSuccess);
              break;
              
            case 'rename':
              // 生成新名稱
              let newName = plasmid.name;
              let counter = 1;
              
              while (await window.mocloAPI.checkPlasmidExists(newName)) {
                newName = `${plasmid.name}_${counter}`;
                counter++;
              }
              
              console.log(`重新命名質體: ${plasmid.name} -> ${newName}`);
              plasmid.name = newName;
              const renameSuccess = await window.mocloAPI.addPlasmid(plasmid);
              resolve(renameSuccess);
              break;
              
            default:
              resolve(false);
          }
        }
      });
      setShowDuplicateDialog(true);
    });
  };

  const loadPlasmids = async () => {
    try {
      setLoading(true);
      const fetchedPlasmids = await window.mocloAPI.getAllPlasmids();
      setPlasmids(fetchedPlasmids);
      setAllPlasmids(fetchedPlasmids); // 同時更新所有質體狀態
    } catch (error) {
      console.error('Error loading plasmids:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const allFolders = await window.mocloAPI.getAllFolders();
      
      // 一次性清理：過濾掉任何名稱包含 "All" 和 "plasmid" 的實際資料夾
      // 因為我們使用虛擬資料夾來實現這個功能
      const filteredFolders = allFolders.filter(folder => {
        const name = folder.name.toLowerCase();
        const isAllPlasmidVariant = (name.includes('all') && name.includes('plasmid'));
        if (isAllPlasmidVariant) {
          console.log(`過濾掉重複的 All Plasmid 資料夾: ${folder.name}`);
          // 可選：也從資料庫中刪除這個資料夾
          window.mocloAPI.deleteFolder(folder.id, 'default').catch(err => 
            console.error('Error deleting duplicate folder:', err)
          );
        }
        return !isAllPlasmidVariant;
      });
      
      setFolders(filteredFolders);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const loadData = async () => {
    await Promise.all([loadPlasmids(), loadFolders()]);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    try {
      if (query.trim() === '') {
        // 如果搜索為空，根據當前選中的資料夾載入質體
        if (selectedFolderId === 'all') {
          await loadPlasmids();  // 顯示所有質體
        } else {
          const folderPlasmids = await window.mocloAPI.getPlasmidsByFolder(selectedFolderId);
          setPlasmids(folderPlasmids);
        }
      } else {
        // 搜索所有質體
        const results = await window.mocloAPI.searchPlasmids(query);
        
        // 如果選中的是 'all'，顯示所有搜索結果
        if (selectedFolderId === 'all') {
          setPlasmids(results);
        } else if (selectedFolderId !== undefined) {
          const filteredResults = results.filter(plasmid => 
            (plasmid.folderId || 'default') === selectedFolderId
          );
          setPlasmids(filteredResults);
        } else {
          setPlasmids(results);
        }
      }
    } catch (error) {
      console.error('Error searching plasmids:', error);
    }
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      const fileData = await window.mocloAPI.importPlasmidFile();
      
      if (fileData) {
        // Extract sequence and description from the file content
        const { sequence, description } = extractSequence(fileData.content, fileData.filename);
        
        // Analyze T2S sites for the sequence
        const analysisResult = await window.mocloAPI.analyzeT2S(sequence);
        console.log('T2S Analysis result:', analysisResult);
        
        // Extract the t2sSites from the analysis result
        const t2sSitesData = analysisResult.t2sSites || analysisResult; // Handle both formats
        
        // Flatten all T2S sites into a single array
        const allT2SSites = Object.values(t2sSitesData).flat();
        console.log('Flattened T2S sites:', allT2SSites);
        
        // Validate T2S sites before creating plasmid - check if items are actually T2SSite objects
        const validT2SSites = allT2SSites.filter(site => {
          // Check if it's actually a T2SSite object with required properties
          if (typeof site === 'object' && site !== null && 'enzyme' in site && 'position' in site) {
            if (!site.enzyme) {
              console.error('Invalid T2S site found (missing enzyme):', site);
              return false;
            }
            return true;
          } else {
            console.error('Invalid T2S site found (not a site object):', site);
            return false;
          }
        });
        
        console.log('Valid T2S sites after filtering:', validT2SSites);
        
        // Create a plasmid object from the file data
        const plasmid: Plasmid = {
          id: fileData.filename.replace(/\.[^/.]+$/, ''), // Remove extension for ID
          name: fileData.filename.replace(/\.[^/.]+$/, ''),
          sequence: sequence,
          description: description || `Imported from ${fileData.filename}`,
          size: sequence.length,
          t2sSites: validT2SSites,
          inserts: [], // Will be populated by analysis if needed
          mocloCompatible: validT2SSites.length > 0, // Has T2S sites
          level: 0,
          partType: 'unknown',
          features: [],
          addedAt: new Date(),
          folderId: selectedFolderId || 'default' // 使用當前選中的資料夾或預設資料夾
        };
        
        await window.mocloAPI.addPlasmid(plasmid);
        await loadPlasmids();
        setSelectedPlasmid(plasmid);
      }
    } catch (error) {
      console.error('Error importing plasmid:', error);
      alert('Error importing plasmid file. Please check the file format.');
    } finally {
      setImporting(false);
    }
  };

  const handleFolderImport = async () => {
    try {
      setImportingFolder(true);
      const folderData = await window.mocloAPI.importPlasmidFolder();
      
      if (!folderData) {
        return; // User cancelled
      }

      let successCount = 0;
      let errorCount = 0;
      
      for (const fileData of folderData.files) {
        try {
          console.log(`正在處理檔案: ${fileData.filename}, 大小: ${fileData.content.length} 字符`);
          const { sequence, description } = extractSequence(fileData.content, fileData.filename);
          
          if (sequence.length < 10) {
            console.warn(`檔案 ${fileData.filename} 序列過短 (${sequence.length} bp)，跳過導入`);
            errorCount++;
            continue;
          }

          console.log(`成功解析序列: ${fileData.filename}, 長度: ${sequence.length} bp`);

          // Analyze T2S sites
          const t2sAnalysis = await window.mocloAPI.analyzeT2S(sequence);
          const t2sSites: T2SSite[] = [];
          
          console.log(`T2S分析結果 for ${fileData.filename}:`, t2sAnalysis);
          
          // 處理T2S分析結果 - 確保我們只處理酶的位點數據
          if (t2sAnalysis && t2sAnalysis.t2sSites) {
            // 如果結果有 t2sSites 屬性（新格式）
            Object.entries(t2sAnalysis.t2sSites).forEach(([enzyme, sites]) => {
              console.log(`處理酶 ${enzyme}:`, sites);
              
              // 確保 sites 是數組
              if (Array.isArray(sites)) {
                sites.forEach((site: any) => {
                  // 驗證位點數據的有效性
                  if (typeof site.position === 'number' && site.position >= 0) {
                    t2sSites.push({
                      enzyme: enzyme,
                      position: site.position,
                      strand: site.strand || '+',
                      recognitionSite: site.recognitionSite || enzyme,
                      cutPositionTop: site.cutPositionTop || site.position,
                      cutPositionBottom: site.cutPositionBottom || site.position,
                      overhangSequence: site.overhang || site.overhangSequence || '',
                      overhangType: site.overhangType || '5prime'
                    });
                  } else {
                    console.warn(`無效的位點數據 ${enzyme}:`, site);
                  }
                });
              } else {
                console.warn(`${enzyme} 的位點數據不是數組:`, sites);
              }
            });
          } else {
            // 處理直接的酶數據格式（舊格式）
            Object.entries(t2sAnalysis).forEach(([key, value]) => {
              // 跳過非酶數據（如'inserts', 'validation'等）
              if (key === 'inserts' || key === 'features' || key === 'metadata' || key === 'validation') {
                console.log(`跳過非酶數據: ${key}`);
                return;
              }
              
              // 確保 value 是數組
              if (Array.isArray(value)) {
                value.forEach((site: any) => {
                  // 驗證位點數據的有效性
                  if (typeof site.position === 'number' && site.position >= 0) {
                    t2sSites.push({
                      enzyme: key,
                      position: site.position,
                      strand: site.strand || '+',
                      recognitionSite: site.recognitionSite || key,
                      cutPositionTop: site.cutPositionTop || site.position,
                      cutPositionBottom: site.cutPositionBottom || site.position,
                      overhangSequence: site.overhang || site.overhangSequence || '',
                      overhangType: site.overhangType || '5prime'
                    });
                  } else {
                    console.warn(`無效的位點數據 ${key}:`, site);
                  }
                });
              } else {
                console.warn(`${key} 的數據不是數組:`, value);
              }
            });
          }

          const newPlasmid: Plasmid = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: fileData.filename.replace(/\.(fasta|fa|fas|gb|gbk|genbank|ape|dna|txt)$/i, ''),
            sequence: sequence,
            size: sequence.length,
            description: description || `導入自 ${fileData.filename}`,
            t2sSites: t2sSites,
            inserts: [],
            mocloCompatible: t2sSites.length > 0,
            level: 0,
            partType: 'other',
            features: [],
            addedAt: new Date(),
            folderId: selectedFolderId || 'default' // 使用當前選中的資料夾或預設資料夾
          };

          console.log(`正在添加質體到資料庫: ${newPlasmid.name}, ID: ${newPlasmid.id}`);
          const success = await handleDuplicateCheck(newPlasmid);
          if (success) {
            console.log(`成功添加質體: ${fileData.filename}`);
            successCount++;
          } else {
            console.log(`跳過或失敗添加質體: ${fileData.filename}`);
            errorCount++;
          }

        } catch (fileError) {
          console.error(`處理檔案 ${fileData.filename} 時發生錯誤:`, fileError);
          errorCount++;
        }
      }

      // Refresh plasmid list
      await loadPlasmids();
      
      // Show result summary
      const totalFiles = folderData.files.length;
      if (successCount > 0) {
        alert(`資料夾導入完成！\n成功導入: ${successCount} 個檔案\n失敗: ${errorCount} 個檔案\n總共處理: ${totalFiles} 個檔案`);
      } else {
        alert(`無法導入任何檔案。請檢查資料夾中是否包含有效的序列檔案。\n處理檔案數: ${totalFiles}`);
      }

    } catch (error) {
      console.error('Error importing folder:', error);
      alert('導入資料夾時發生錯誤，請檢查資料夾內容。');
    } finally {
      setImportingFolder(false);
    }
  };

  const handleSelectPlasmid = (plasmid: Plasmid) => {
    console.log('選擇質體:', plasmid.name, '(ID:', plasmid.id, ')');
    setSelectedPlasmid(plasmid);
  };

  const handleTogglePlasmidSelection = (plasmid: Plasmid) => {
    setSelectedPlasmids(prev => {
      const isSelected = prev.find(p => p.id === plasmid.id);
      if (isSelected) {
        return prev.filter(p => p.id !== plasmid.id);
      } else {
        return [...prev, plasmid];
      }
    });
  };

  const handleSelectAll = () => {
    // 獲取當前顯示的質體（考慮搜索過濾）
    const visiblePlasmids = plasmids;
    const visibleSelected = selectedPlasmids.filter(p => visiblePlasmids.find(vp => vp.id === p.id));
    
    if (visibleSelected.length === visiblePlasmids.length && visiblePlasmids.length > 0) {
      // 如果當前顯示的質體已全選，則取消選擇這些質體
      setSelectedPlasmids(prev => prev.filter(p => !visiblePlasmids.find(vp => vp.id === p.id)));
    } else {
      // 否則選擇當前顯示的所有質體（保持其他已選擇的質體）
      const newSelections = visiblePlasmids.filter(p => !selectedPlasmids.find(sp => sp.id === p.id));
      setSelectedPlasmids(prev => [...prev, ...newSelections]);
    }
  };

  // 計算選擇狀態（基於當前顯示的質體）
  const visiblePlasmids = plasmids;
  const visibleSelected = selectedPlasmids.filter(p => visiblePlasmids.find(vp => vp.id === p.id));
  const isAllSelected = visiblePlasmids.length > 0 && visibleSelected.length === visiblePlasmids.length;
  const isPartialSelected = visibleSelected.length > 0 && visibleSelected.length < visiblePlasmids.length;

  const handleDesignGoldenGate = () => {
    if (selectedPlasmids.length < 2) {
      alert('請選擇至少 2 個質體來設計 Golden Gate 策略');
      return;
    }
    setCurrentView('designer');
  };

  const handleDeleteSelected = () => {
    if (selectedPlasmids.length === 0) {
      alert('請選擇要刪除的質體');
      return;
    }
    setPlasmidsToDelete(selectedPlasmids);
    setShowDeleteDialog(true);
  };

  const handleDeleteSingle = (plasmid: Plasmid) => {
    setPlasmidsToDelete([plasmid]);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      const ids = plasmidsToDelete.map(p => p.id);
      const result = await window.mocloAPI.deletePlasmids(ids);
      
      if (result.success > 0) {
        // 刷新質體列表
        await loadPlasmids();
        
        // 清除選擇的質體
        setSelectedPlasmids([]);
        
        // 如果刪除的質體是當前選中的，清除選中狀態
        if (selectedPlasmid && ids.includes(selectedPlasmid.id)) {
          setSelectedPlasmid(null);
        }
        
        const message = plasmidsToDelete.length === 1 
          ? `成功刪除質體: ${plasmidsToDelete[0].name}`
          : `成功刪除 ${result.success} 個質體`;
        
        if (result.failed > 0) {
          alert(`${message}\n失敗: ${result.failed} 個質體`);
        } else {
          alert(message);
        }
      } else {
        alert('刪除失敗，請檢查控制台日誌');
      }
    } catch (error) {
      console.error('Error deleting plasmids:', error);
      alert('刪除時發生錯誤，請檢查控制台日誌');
    } finally {
      setShowDeleteDialog(false);
      setPlasmidsToDelete([]);
    }
  };

  // 資料夾管理處理函數
  const handleFolderSelect = async (folderId: string | undefined) => {
    setSelectedFolderId(folderId);
    try {
      if (folderId === undefined) {
        // 顯示所有質體 - 重新載入所有質體
        await loadPlasmids();
      } else {
        // 顯示特定資料夾的質體 - 只更新顯示的質體，保持 allPlasmids 不變
        const folderPlasmids = await window.mocloAPI.getPlasmidsByFolder(folderId);
        setPlasmids(folderPlasmids);
        // 保持 allPlasmids 不變，這樣資料夾計數就不會受影響
      }
    } catch (error) {
      console.error('Error loading folder plasmids:', error);
    }
  };

  const handleCreateFolder = () => {
    setEditingFolder(undefined);
    setShowFolderDialog(true);
  };

  const handleEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setShowFolderDialog(true);
  };

  const handleDeleteFolder = (folder: Folder) => {
    setFolderToDelete(folder);
    setShowFolderDeleteDialog(true);
  };

  const handleMovePlasmids = async (plasmidIds: string[], targetFolderId: string) => {
    try {
      const success = await window.mocloAPI.movePlasmidsToFolder(plasmidIds, targetFolderId);
      if (success) {
        await loadPlasmids(); // 這會同時更新 plasmids 和 allPlasmids
        await loadFolders();
        console.log(`Moved ${plasmidIds.length} plasmid(s) to folder ${targetFolderId}`);
      } else {
        alert('移動質體失敗');
      }
    } catch (error) {
      console.error('Error moving plasmids:', error);
      alert('移動質體時發生錯誤');
    }
  };

  const handleSaveFolder = async (folderData: Omit<Folder, 'createdAt'>) => {
    try {
      if (editingFolder) {
        // 更新資料夾
        const success = await window.mocloAPI.updateFolder(editingFolder.id, {
          name: folderData.name,
          description: folderData.description,
          color: folderData.color
        });
        if (success) {
          await loadFolders();
          alert('資料夾更新成功');
        } else {
          alert('資料夾更新失敗');
        }
      } else {
        // 創建新資料夾
        const success = await window.mocloAPI.createFolder(folderData);
        if (success) {
          await loadFolders();
          alert('資料夾創建成功');
        } else {
          alert('資料夾創建失敗');
        }
      }
    } catch (error) {
      console.error('Error saving folder:', error);
      alert('保存資料夾時發生錯誤');
    }
  };

  const handleConfirmDeleteFolder = async (folderId: string, moveTo?: string) => {
    try {
      const success = await window.mocloAPI.deleteFolder(folderId, moveTo);
      if (success) {
        await Promise.all([loadFolders(), loadPlasmids()]);
        
        // 如果刪除的是當前選中的資料夾，切換到 All Plasmid
        if (selectedFolderId === folderId) {
          setSelectedFolderId('all');
        }
        
        alert('資料夾刪除成功');
      } else {
        alert('資料夾刪除失敗');
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('刪除資料夾時發生錯誤');
    } finally {
      setShowFolderDeleteDialog(false);
      setFolderToDelete(null);
    }
  };

  // 計算每個資料夾的質體數量
  const getPlasmidCounts = () => {
    const counts: { [folderId: string]: number } = {};
    
    // 初始化所有資料夾的計數為0
    folders.forEach(folder => {
      counts[folder.id] = 0;
    });
    
    // 統計每個資料夾的質體數量 - 使用 allPlasmids 而不是 plasmids
    allPlasmids.forEach(plasmid => {
      const folderId = plasmid.folderId || 'default';
      counts[folderId] = (counts[folderId] || 0) + 1;
    });
    
    return counts;
  };

  return (
    <div className="app">
      {/* 資料夾側邊欄 - 始終渲染但使用CSS控制可見性 */}
      <div className={`folder-sidebar ${isFolderSidebarVisible ? 'visible' : 'hidden'}`}>
        <FolderSidebar
          folders={folders}
          selectedFolderId={selectedFolderId}
          onFolderSelect={handleFolderSelect}
          onCreateFolder={handleCreateFolder}
          onEditFolder={handleEditFolder}
          onDeleteFolder={handleDeleteFolder}
          plasmidCounts={getPlasmidCounts()}
          onMovePlasmids={handleMovePlasmids}
        />
      </div>
      
      <div className={`sidebar ${!isFolderSidebarVisible ? 'full-width' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
              Plasmid Database
            </h2>
            <button
              onClick={() => setIsFolderSidebarVisible(!isFolderSidebarVisible)}
              className="folder-toggle-btn"
              style={{
                padding: '8px 14px',
                background: isFolderSidebarVisible 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '500',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s ease',
                transform: 'translateY(0)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
              }}
            >
              <span style={{ 
                fontSize: '16px', 
                transition: 'transform 0.2s ease',
                transform: isFolderSidebarVisible ? 'rotate(0deg)' : 'rotate(180deg)',
                display: 'inline-block'
              }}>
                {isFolderSidebarVisible ? '📁' : '📂'}
              </span>
              <span style={{ 
                fontSize: '13px', 
                letterSpacing: '0.3px'
              }}>
                {isFolderSidebarVisible ? '隱藏資料夾' : '顯示資料夾'}
              </span>
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
            <ImportButton onImport={handleImport} importing={importing} />
            <button 
              onClick={handleFolderImport}
              disabled={importingFolder}
              style={{
                padding: '8px 12px',
                background: importingFolder ? '#94a3b8' : '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: importingFolder ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              {importingFolder ? '導入中...' : '📁 導入資料夾'}
            </button>
            {selectedPlasmids.length >= 2 && (
              <button 
                onClick={handleDesignGoldenGate}
                style={{
                  padding: '8px 12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                設計 ({selectedPlasmids.length})
              </button>
            )}
            {selectedPlasmids.length > 0 && (
              <button 
                onClick={handleDeleteSelected}
                style={{
                  padding: '8px 12px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                🗑️ 刪除 ({selectedPlasmids.length})
              </button>
            )}
            
            {plasmids.length > 0 && (
              <button 
                onClick={handleSelectAll}
                style={{
                  padding: '8px 12px',
                  background: isAllSelected ? '#059669' : (isPartialSelected ? '#0891b2' : '#6b7280'),
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {isAllSelected ? '✓ 全部已選' : (isPartialSelected ? '◐ 部分選擇' : '☐ 全選')}
                {plasmids.length > 0 && ` (${plasmids.length})`}
              </button>
            )}
          </div>
        </div>
        <div className="sidebar-content">
          <input
            type="text"
            placeholder="Search plasmids..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-box"
          />
          
          {/* 選擇狀態欄 */}
          {plasmids.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              backgroundColor: selectedPlasmids.length > 0 ? '#f0f9ff' : '#f8fafc',
              border: `1px solid ${selectedPlasmids.length > 0 ? '#0284c7' : '#e2e8f0'}`,
              borderRadius: '6px',
              fontSize: '13px',
              margin: '8px 0'
            }}>
              <span style={{ color: '#64748b' }}>
                {selectedPlasmids.length > 0 
                  ? `已選擇 ${selectedPlasmids.length} 個質體`
                  : `總共 ${plasmids.length} 個質體`
                }
              </span>
              
              <button
                onClick={handleSelectAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isAllSelected ? '#059669' : '#6b7280',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {isAllSelected ? '✓ 全選' : (isPartialSelected ? '◐ 部分' : '☐ 全選')}
              </button>
            </div>
          )}
          
          <PlasmidList
            plasmids={plasmids}
            selectedPlasmid={selectedPlasmid}
            selectedPlasmids={selectedPlasmids}
            onSelectPlasmid={handleSelectPlasmid}
            onToggleSelection={handleTogglePlasmidSelection}
            loading={loading}
          />
        </div>
      </div>
      
      <div className="main-content">
        <div className="header">
          <h1>MoClo Designer</h1>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            {plasmids.length} plasmid{plasmids.length !== 1 ? 's' : ''} in database
          </div>
        </div>
        
        <div className="content">
          {currentView === 'designer' ? (
            <GoldenGateDesigner 
              plasmids={selectedPlasmids}
              onStrategyUpdate={(strategy) => {
                console.log('Strategy updated:', strategy);
              }}
            />
          ) : selectedPlasmid ? (
            <PlasmidDetails 
              plasmid={selectedPlasmid}
              onPlasmidUpdate={(updatedPlasmid) => {
                // Update the plasmid in the list
                setPlasmids(prev => prev.map(p => 
                  p.id === updatedPlasmid.id ? updatedPlasmid : p
                ));
                setSelectedPlasmid(updatedPlasmid);
              }}
              onDelete={handleDeleteSingle}
            />
          ) : (
            <div className="empty-state">
              <h3>Welcome to MoClo Designer</h3>
              <p>Select a plasmid from the sidebar to view details and analyze T2S sites.</p>
              <p>Select multiple plasmids (checkbox) and click "設計" to create Golden Gate assembly strategies.</p>
              <p>Import new plasmid files using the Import button above.</p>
            </div>
          )}
        </div>
      </div>

      {/* 重複名稱確認對話框 */}
      {duplicateInfo && (
        <DuplicateConfirmDialog
          existingPlasmid={duplicateInfo.existing}
          newPlasmid={duplicateInfo.new}
          onConfirm={duplicateInfo.onResolve}
          onCancel={() => {
            setShowDuplicateDialog(false);
            setDuplicateInfo(null);
            duplicateInfo.onResolve('skip');
          }}
          isVisible={showDuplicateDialog}
        />
      )}

      {/* 刪除確認對話框 */}
      <DeleteConfirmDialog
        plasmids={plasmidsToDelete}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setPlasmidsToDelete([]);
        }}
        isVisible={showDeleteDialog}
      />

      {/* 資料夾管理對話框 */}
      <FolderDialog
        isOpen={showFolderDialog}
        onClose={() => {
          setShowFolderDialog(false);
          setEditingFolder(undefined);
        }}
        onSave={handleSaveFolder}
        editingFolder={editingFolder}
      />

      {/* 資料夾刪除確認對話框 */}
      <FolderDeleteConfirmDialog
        isOpen={showFolderDeleteDialog}
        folder={folderToDelete}
        onClose={() => {
          setShowFolderDeleteDialog(false);
          setFolderToDelete(null);
        }}
        onConfirm={handleConfirmDeleteFolder}
        availableFolders={folders.filter(f => f.id !== folderToDelete?.id)}
        plasmidCount={folderToDelete ? (getPlasmidCounts()[folderToDelete.id] || 0) : 0}
      />
    </div>
  );
};

export default App;
