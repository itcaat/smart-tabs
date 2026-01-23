import { useState, useEffect, useCallback } from 'react';
import styles from './Modal.module.css';

export default function Modal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
  type = 'warning', // 'warning', 'danger', 'info'
  showDontAskAgain = false,
  onDontAskAgainChange,
  hint
}) {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // Reset checkbox when modal opens
  useEffect(() => {
    if (isOpen) {
      setDontAskAgain(false);
    }
  }, [isOpen]);

  // Handle escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter') {
      if (showDontAskAgain && onDontAskAgainChange) {
        onDontAskAgainChange(dontAskAgain);
      }
      onConfirm();
    }
  }, [onCancel, onConfirm, showDontAskAgain, onDontAskAgainChange, dontAskAgain]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  const handleConfirm = () => {
    if (showDontAskAgain && onDontAskAgainChange) {
      onDontAskAgainChange(dontAskAgain);
    }
    onConfirm();
  };

  const handleCheckboxChange = (e) => {
    setDontAskAgain(e.target.checked);
  };

  if (!isOpen) return null;

  // Detect OS for keyboard shortcut hint
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const undoShortcut = isMac ? '⌘+Shift+T' : 'Ctrl+Shift+T';

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div 
        className={styles.modal} 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <span className={`${styles.icon} ${styles[type]}`}>
            {type === 'danger' && '⚠️'}
            {type === 'warning' && '⚠️'}
            {type === 'info' && 'ℹ️'}
          </span>
          <h2 className={styles.title}>{title}</h2>
        </div>
        
        <p className={styles.message}>{message}</p>
        
        {hint && (
          <p className={styles.hint}>
            💡 {hint || `Tip: Use ${undoShortcut} to reopen closed tabs`}
          </p>
        )}

        {type !== 'info' && (
          <p className={styles.hint}>
            💡 Tip: Use <kbd className={styles.kbd}>{undoShortcut}</kbd> to reopen closed tabs
          </p>
        )}
        
        {showDontAskAgain && (
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={handleCheckboxChange}
              className={styles.checkbox}
            />
            <span>Don't ask me again</span>
          </label>
        )}
        
        <div className={styles.buttons}>
          {type !== 'info' && (
            <button 
              className={styles.cancelButton}
              onClick={onCancel}
            >
              {cancelText}
            </button>
          )}
          <button 
            className={`${styles.confirmButton} ${styles[type]}`}
            onClick={handleConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
