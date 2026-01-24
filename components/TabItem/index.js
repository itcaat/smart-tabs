import { useState } from 'react';
import styles from './TabItem.module.css';
import { useTranslation } from '../../lib/i18n';

function createFaviconUrl(url) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=32`;
}

export default function TabItem({ tab, onClose, onActivate }) {
  const { t } = useTranslation();
  const [isRemoving, setIsRemoving] = useState(false);

  const handleClose = (e) => {
    e.stopPropagation();
    setIsRemoving(true);
    setTimeout(() => {
      onClose();
    }, 320);
  };

  return (
    <li 
      className={`${styles.tab} ${isRemoving ? styles.removing : ''}`}
      title={tab.title}
      onClick={onActivate}
    >
      <img 
        src={createFaviconUrl(tab.url)} 
        alt="" 
        className={styles.favicon}
      />
      <span className={styles.title}>
        {tab.title || tab.url}
      </span>
      <button 
        className={styles.closeButton}
        onClick={handleClose}
        title={t('closeTab')}
      >
        ✕
      </button>
    </li>
  );
}
