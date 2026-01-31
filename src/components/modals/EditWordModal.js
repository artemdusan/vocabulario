import React, { useState, useEffect } from 'react';
import { Modal, Button, Select } from '../ui';
import { TENSE_LABELS, PERSONS } from '../../constants';
import { getDisplayTranslation, getVerbForms } from '../../utils';
import { db } from '../../services/db';

const EditWordModal = ({ word, allWords, onClose, onSave, onDelete }) => {
  const [level, setLevel] = useState(0);
  const [inLearning, setInLearning] = useState(false);
  const [formStates, setFormStates] = useState({});

  const isVerb = word?.type === 'verb';
  const verbForms = isVerb ? getVerbForms(allWords, word?.id) : [];

  useEffect(() => {
    if (word) {
      setLevel(word.level || 0);
      setInLearning(word.in_learning || false);
      
      if (isVerb && verbForms.length > 0) {
        const states = {};
        verbForms.forEach(f => {
          states[f.id] = { 
            level: f.level || 0, 
            in_learning: f.in_learning || false 
          };
        });
        setFormStates(states);
      }
    }
  }, [word, isVerb, verbForms]);

  if (!word) return null;

  const handleSave = async () => {
    // Save the main word
    const updated = { ...word, level, in_learning: inLearning };
    await onSave(updated);
    
    // If it's a verb, also save all form states
    if (isVerb && verbForms.length > 0) {
      for (const form of verbForms) {
        const state = formStates[form.id];
        if (state) {
          await db.words.put({
            ...form,
            level: state.level ?? form.level,
            in_learning: state.in_learning ?? form.in_learning,
          });
        }
      }
    }
  };

  const updateFormState = (formId, field, value) => {
    setFormStates(prev => ({
      ...prev,
      [formId]: { ...prev[formId], [field]: value }
    }));
  };

  const toggleAllForms = (value) => {
    const states = {};
    verbForms.forEach(f => {
      states[f.id] = { ...formStates[f.id], in_learning: value };
    });
    setFormStates(states);
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

        {!isVerb && (
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

        {isVerb && verbForms.length > 0 && (
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
                      const form = verbForms.find(
                        f => f.tense === tense && f.person === idx + 1
                      );
                      
                      if (!form) return <td key={tense}>-</td>;
                      
                      const state = formStates[form.id] || {};
                      
                      return (
                        <td key={tense}>
                          <div className="form-edit-cell">
                            <span className="form-text">{form.form}</span>
                            <label className="form-checkbox">
                              <input
                                type="checkbox"
                                checked={state.in_learning || false}
                                onChange={e => updateFormState(form.id, 'in_learning', e.target.checked)}
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
