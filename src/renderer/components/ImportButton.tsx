import React from 'react';

interface Props {
  onImport: () => void;
  importing: boolean;
}

export const ImportButton: React.FC<Props> = ({ onImport, importing }) => {
  return (
    <button 
      onClick={onImport} 
      disabled={importing}
      className="btn btn-primary"
      style={{ width: '100%' }}
    >
      {importing ? (
        <>
          <span className="loading-spinner" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
          Importing...
        </>
      ) : (
        'Import Plasmid'
      )}
    </button>
  );
};
