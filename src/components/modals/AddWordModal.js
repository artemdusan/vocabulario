import React, { useState } from 'react';
import { Modal, Button, Input, Select } from '../ui';
import { PARTS_OF_SPEECH, POS_LABELS } from '../../constants';

const AddWordModal = ({ open, onClose, onAdd, loading }) => {
  const [word, setWord] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('noun');

  const handleSubmit = () => {
    if (word.trim()) {
      onAdd({ word: word.trim(), partOfSpeech });
      setWord('');
      setPartOfSpeech('noun');
    }
  };

  const handleClose = () => {
    setWord('');
    setPartOfSpeech('noun');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Dodaj słowo"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={!word.trim() || loading}>
            {loading ? '⏳ Generowanie...' : 'Dodaj'}
          </Button>
        </>
      }
    >
      <Input
        label="Słowo (po polsku)"
        value={word}
        onChange={e => setWord(e.target.value)}
        placeholder="np. dom"
        autoFocus
      />
      <Select
        label="Część mowy"
        value={partOfSpeech}
        onChange={e => setPartOfSpeech(e.target.value)}
        options={PARTS_OF_SPEECH.map(pos => ({ 
          value: pos, 
          label: POS_LABELS[pos] 
        }))}
      />
    </Modal>
  );
};

export default AddWordModal;
