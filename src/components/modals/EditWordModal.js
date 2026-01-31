import React, { useState, useEffect } from 'react';
import { Modal, Button, Select } from '../ui';
import { TENSE_LABELS, PERSONS } from '../../constants';
import { getDisplayTranslation } from '../../utils';

const EditWordModal = ({ word, onClose, onSave, onDelete }) => {
  const [level, setLevel] = useState(0);
  const [inLearning, setInLearning] = useState(false);
  const [formStates, setFormStates] = useState({});

  useEffect(() => {
    if (word) {
      setLevel(word.level || 0);
      setInLearning(word.in_learning || false);
      
      if (word.forms) {
        const states = {};
        word.forms.forEach(f => {
          const key = `${f.tense}_${f.person}`;
          states[key] = { level: f.level || 0, in_learning: f.in_learning || false };
        });
        setFormStates(states);
      }
    }
  }, [word]);

  if (!word) return null;

  const handleSave = () => {
    const updated = { ...word, level, in_learning: inLearning };
    
    if (word.forms) {
      updated.forms = word.forms.map(f => {
        const key = `${f.tense}_${f.person}`;
        return {
          ...f,
          level: formStates[key]?.level ?? f.level,
          in_learning: formStates[key]?.in_learning ?? f.in_learning
        };
      });
    }
    
    onSave(updated);
  };

  const updateFormState = (tense, person, field, value) => {
    const key = `${tense}_${person}`;
    setFormStates(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const toggleAllForms = (value) => {
    if (word.forms) {
      const states = {};
      word.forms.forEach(f => {
        const key = `${f.tense}_${f.person}`;
        states[key] = { ...formStates[key], in_learning: value };
      });
      setFormStates(states);
    }
  };

  return (
    <Modal
      open={!!word}
      onClose={onClose}
      title={`Edytuj: ${word.word}`}
      footer={
        <>
          <Button variant="danger" onClick={() => onDelete(word)}>Usuń</Button>
          <Button variant="ghost" onClick={onClose}>Anuluj</Button>
          <Button onClick={handleSave}>Zapisz</Button>
        </>
      }
    >
      <div className="edit-word-content">
        <div className="word-info-row">
          <span className="label">Tłumaczenie:</span>
          <span className="value">{getDisplayTranslation(word)}</span>
        </div>

        {word.partOfSpeech !== 'verb' && (
          <>
            <Select
              label="Poziom"
              value={level}
              onChange={e => setLevel(Number(e.target.value))}
              options={[0, 1, 2, 3, 4, 5].map(n => ({ value: n, label: `Poziom ${n}` }))}
            />
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={inLearning}
                  onChange={e => setInLearning(e.target.checked)}
                />
                W nauce
              </label>
            </div>
          </>
        )}

        {word.partOfSpeech === 'verb' && word.forms && (
          <div className="verb-forms-edit">
            <div className="forms-header">
              <h4>Formy czasownika</h4>
              <div className="bulk-actions">
                <Button size="sm" variant="ghost" onClick={() => toggleAllForms(true)}>
                  Zaznacz wszystkie
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleAllForms(false)}>
                  Odznacz wszystkie
                </Button>
              </div>
            </div>
            
            <table className="forms-edit-table">
              <thead>
                <tr>
                  <th></th>
                  {Object.keys(TENSE_LABELS).map(t => (
                    <th key={t}>{TENSE_LABELS[t]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERSONS.map((person, idx) => (
                  <tr key={person}>
                    <td className="person">{person}</td>
                    {['present', 'past', 'future'].map(tense => {
                      const form = word.forms.find(f => f.tense === tense && f.person === idx + 1);
                      const key = `${tense}_${idx + 1}`;
                      const state = formStates[key] || {};
                      
                      return (
                        <td key={tense}>
                          <div className="form-edit-cell">
                            <span className="form-text">{form?.form}</span>
                            <label className="form-checkbox">
                              <input
                                type="checkbox"
                                checked={state.in_learning || false}
                                onChange={e => updateFormState(tense, idx + 1, 'in_learning', e.target.checked)}
                              />
                              <span>W nauce</span>
                            </label>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EditWordModal;
