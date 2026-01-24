import { useState } from 'react';
import styles from './TabGroup.module.css';
import TabItem from '../TabItem';
import { useTranslation } from '../../lib/i18n';

function createFaviconUrl(url) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=32`;
}

function domainColor(domain) {
  let hash = 0;
  for (let i = 0; i < domain.length; ++i) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 56%, 92%)`;
}

export default function TabGroup({ 
  domain, 
  tabs, 
  isPinned, 
  onTogglePin, 
  onCloseTab, 
  onCloseGroup,
  onActivateTab 
}) {
  const { t } = useTranslation();
  const [isRemoving, setIsRemoving] = useState(false);

  const handlePin = (e) => {
    e.stopPropagation();
    onTogglePin();
  };

  const handleCloseAll = (e) => {
    e.stopPropagation();
    onCloseGroup();
  };

  const backgroundColor = domainColor(domain);

  return (
    <div 
      data-group
      className={`${styles.group} ${isPinned ? styles.pinned : ''} ${isRemoving ? styles.removing : ''}`}
      style={{ background: backgroundColor }}
    >
      <div className={styles.header}>
        <img 
          src={createFaviconUrl('https://' + domain)} 
          alt="" 
          className={styles.favicon}
        />
        <span className={styles.domain}>{domain}</span>
        <button 
          className={styles.pinButton}
          onClick={handlePin}
          title={isPinned ? t('unpinGroup') : t('pinGroup')}
        >
          {isPinned ? '📌' : '📍'}
        </button>
        <button 
          className={styles.closeAllButton}
          onClick={handleCloseAll}
          title={t('closeAllInGroup')}
        >
          ✖
        </button>
      </div>
      <ul className={styles.tabs}>
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            onClose={() => onCloseTab(tab.id)}
            onActivate={() => onActivateTab(tab)}
          />
        ))}
      </ul>
    </div>
  );
}
