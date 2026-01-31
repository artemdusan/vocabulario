import React from 'react';
import { Modal, Button } from '../ui';

const DeleteConfirmModal = ({ word, onClose, onConfirm }) => {
  if (!word) return null;

  return (
    <Modal
      open={!!word}
      onClose={onClose}
      title="Potwierdź usunięcie"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Anuluj</Button>
          <Button variant="danger" onClick={() => onConfirm(word)}>
            Usuń
          </Button>
        </>
      }
    >
      <p>Czy na pewno chcesz usunąć słowo <strong>"{word.word}"</strong>?</p>
      <p className="delete-warning">Ta operacja jest nieodwracalna.</p>
    </Modal>
  );
};

export default DeleteConfirmModal;
