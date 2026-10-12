import Modal from '../../common/Modal/Modal';
import Button from '../../common/Button/Button';
import { AlertCircle } from 'lucide-react';
import styles from './ValidationErrorModal.module.css';

const ValidationErrorModal = ({ isOpen, onClose, errors = [], documentType = 'Quote' }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cannot Generate ${documentType}`}
      size="md"
      footer={
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={onClose}
          >
            OK
          </Button>
        </div>
      }
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <AlertCircle size={20} className={styles.icon} />
          <p className={styles.message}>
            The following issues must be resolved before generating a {documentType.toLowerCase()}:
          </p>
        </div>
        <ul className={styles.errorList}>
          {errors.map((error, index) => (
            <li key={index} className={styles.errorItem}>
              {error}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
};

export default ValidationErrorModal;
