import React from 'react';
import { Modal, Button, Badge } from '../ui';
import { TYPE_LABELS, TENSE_LABELS, PERSONS } from '../../constants';
import { getDisplayTranslation, getVerbForms } from '../../utils';

const ViewWordModal = ({ word, allWords, onClose, onEdit }) => {
  if (!word) return null;

  const isVerbForm = word.type === 'verbForm';
  const isVerb = word.type === 'verb';
  
  // Get verb forms if this is a verb
  const verbForms = isVerb ? getVerbForms(allWords, word.id) : [];
  
  // Get parent verb if this is a verb form
  const parentVerb = isVerbForm 
    ? allWords.find(w => w.id === word.verbId) 
    : null;

  return (
    <Modal
      open={!!word}
      onClose={onClose}
      title={word.word}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Zamknij</Button>
          <Button onClick={() => onEdit(word)}>Edytuj</Button>
        </>
      }
    >
      <div className="view-word-content">
        <div className="word-info-row">
          <span className="label">Tłumaczenie:</span>
          <span className="value">{getDisplayTranslation(word)}</span>
        </div>
        <div className="word-info-row">
          <span className="label">Typ:</span>
          <Badge>{TYPE_LABELS[word.type]}</Badge>
        </div>
        
        {isVerbForm && (
          <>
            <div className="word-info-row">
              <span className="label">Czas:</span>
              <span className="value">{TENSE_LABELS[word.tense]}</span>
            </div>
            <div className="word-info-row">
              <span className="label">Osoba:</span>
              <span className="value">{PERSONS[word.person - 1]}</span>
            </div>
            <div className="word-info-row">
              <span className="label">Forma (PL):</span>
              <span className="value">{word.form_pl}</span>
            </div>
            {parentVerb && (
              <div className="word-info-row">
                <span className="label">Bezokolicznik:</span>
                <span className="value">{parentVerb.translation}</span>
              </div>
            )}
          </>
        )}
        
        <div className="word-info-row">
          <span className="label">Poziom:</span>
          <Badge variant={word.level >= 4 ? 'success' : 'default'}>
            {word.level || 0}
          </Badge>
        </div>
        
        {word.example && (
          <div className="word-example">
            <p className="example-es">{word.example}</p>
            <p className="example-pl">{word.example_pl}</p>
          </div>
        )}

        {isVerb && verbForms.length > 0 && (
          <div className="verb-forms-table">
            <h4>Odmiana</h4>
            <table>
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
                      return (
                        <td key={tense} className={form?.in_learning ? 'in-learning' : ''}>
                          {form?.form}
                          {form && <span className="form-level">Lv.{form.level || 0}</span>}
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

export default ViewWordModal;
