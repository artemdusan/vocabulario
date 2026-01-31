import React, { useState, useRef } from 'react';
import { Modal, Button } from '../ui';

const DataManagementModal = ({ open, onClose, onExport, onImport, onClear, wordCount }) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [clearOnImport, setClearOnImport] = useState(false);
  const fileInputRef = useRef(null);

  const handleClose = () => {
    setConfirmClear(false);
    setImportFile(null);
    setClearOnImport(false);
    onClose();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/json') {
      setImportFile(file);
    }
  };

  const handleImport = () => {
    if (importFile) {
      onImport(importFile, clearOnImport);
      setImportFile(null);
      setClearOnImport(false);
    }
  };

  const handleClearConfirm = () => {
    if (confirmClear) {
      onClear();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="💾 Zarządzanie bazą danych"
      footer={
        <Button variant="ghost" onClick={handleClose}>Zamknij</Button>
      }
    >
      <div className="data-management-content">
        {/* Export section */}
        <div className="data-section">
          <h4>📤 Eksport do JSON</h4>
          <p className="data-hint">
            Eksportuj wszystkie słowa ({wordCount} wpisów) do pliku JSON. 
            Zawiera wszystkie dane włącznie z ID dla przyszłej synchronizacji.
          </p>
          <Button onClick={onExport}>
            Eksportuj bazę danych
          </Button>
        </div>

        {/* Import section */}
        <div className="data-section">
          <h4>📥 Import z JSON</h4>
          <p className="data-hint">
            Importuj słowa z wcześniej wyeksportowanego pliku JSON.
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <div className="import-controls">
            <Button 
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              {importFile ? `📄 ${importFile.name}` : 'Wybierz plik JSON'}
            </Button>
            
            {importFile && (
              <>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={clearOnImport}
                    onChange={e => setClearOnImport(e.target.checked)}
                  />
                  Wyczyść bazę przed importem
                </label>
                <Button onClick={handleImport}>
                  Importuj
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Clear section */}
        <div className="data-section danger-section">
          <h4>🗑️ Wyczyść bazę danych</h4>
          <p className="data-hint danger-text">
            Usuwa wszystkie słowa z bazy danych. Ta operacja jest nieodwracalna!
          </p>
          
          {confirmClear ? (
            <div className="confirm-clear">
              <p className="confirm-text">Czy na pewno chcesz usunąć wszystkie dane?</p>
              <div className="confirm-buttons">
                <Button variant="ghost" onClick={() => setConfirmClear(false)}>
                  Anuluj
                </Button>
                <Button variant="danger" onClick={handleClearConfirm}>
                  Tak, usuń wszystko
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" onClick={handleClearConfirm}>
              Wyczyść bazę danych
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default DataManagementModal;
