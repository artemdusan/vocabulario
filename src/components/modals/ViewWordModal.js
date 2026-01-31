import React from 'react';
import { Modal, Button, Badge } from '../ui';
import { POS_LABELS, TENSE_LABELS, PERSONS } from '../../constants';
import { getDisplayTranslation } from '../../utils';

const ViewWordModal = ({ word, onClose, onEdit }) => {
  if (!word) return null;

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
          <span className="label">Część mowy:</span>
          <Badge>{POS_LABELS[word.partOfSpeech]}</Badge>
        </div>
        <div className="word-info-row">
          <span className="label">Poziom:</span>
          <Badge variant={word.level >= 4 ? 'success' : 'default'}>
            {word.level || 0}/5
          </Badge>
        </div>
        
        {word.example && (
          <div className="word-example">
            <p className="example-es">{word.example}</p>
            <p className="example-pl">{word.example_pl}</p>
          </div>
        )}

        {word.partOfSpeech === 'verb' && word.forms && (
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
                      const form = word.forms.find(f => f.tense === tense && f.person === idx + 1);
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
