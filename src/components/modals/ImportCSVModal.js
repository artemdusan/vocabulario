import React, { useState } from 'react';
import { Modal, Button, Badge } from '../ui';
import { parseCSV } from '../../utils/csv';
import { POS_LABELS } from '../../constants';

const ImportCSVModal = ({ open, onClose, onImport, existingWords }) => {
  const [csvData, setCsvData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [previewCount, setPreviewCount] = useState({ total: 0, new: 0, existing: 0 });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = parseCSV(text);
      setCsvData(rows);

      // Calculate preview stats
      const existingSet = new Set(existingWords.map(w => `${w.word}-${w.partOfSpeech}`));
      const newCount = rows.filter(r => !existingSet.has(`${r.word}-${r.partOfSpeech}`)).length;
      setPreviewCount({
        total: rows.length,
        new: newCount,
        existing: rows.length - newCount
      });
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (csvData.length > 0) {
      onImport(csvData);
    }
  };

  const handleClose = () => {
    setCsvData([]);
    setFileName('');
    setPreviewCount({ total: 0, new: 0, existing: 0 });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="📥 Import z CSV"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>Anuluj</Button>
          <Button onClick={handleImport} disabled={previewCount.new === 0}>
            Importuj {previewCount.new} słów
          </Button>
        </>
      }
    >
      <div className="csv-import-content">
        <div className="file-upload-area">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            id="csv-file-input"
            className="file-input-hidden"
          />
          <label htmlFor="csv-file-input" className="file-upload-label">
            {fileName ? (
              <>📄 {fileName}</>
            ) : (
              <>📁 Wybierz plik CSV</>
            )}
          </label>
        </div>

        {csvData.length > 0 && (
          <div className="csv-preview">
            <div className="preview-stats">
              <div className="stat-item">
                <span className="stat-value">{previewCount.total}</span>
                <span className="stat-label">Razem</span>
              </div>
              <div className="stat-item new">
                <span className="stat-value">{previewCount.new}</span>
                <span className="stat-label">Nowych</span>
              </div>
              <div className="stat-item existing">
                <span className="stat-value">{previewCount.existing}</span>
                <span className="stat-label">Istniejących</span>
              </div>
            </div>

            <div className="preview-list">
              <h4>Podgląd (pierwsze 10):</h4>
              {csvData.slice(0, 10).map((row, i) => (
                <div key={i} className="preview-item">
                  <span className="preview-word">{row.word}</span>
                  <Badge>{POS_LABELS[row.partOfSpeech]}</Badge>
                </div>
              ))}
              {csvData.length > 10 && (
                <p className="preview-more">...i {csvData.length - 10} więcej</p>
              )}
            </div>
          </div>
        )}

        <p className="csv-format-note">
          💡 Format CSV: kolumny <code>word</code> i <code>class</code> (noun/verb/adjective)
        </p>
      </div>
    </Modal>
  );
};

export default ImportCSVModal;
