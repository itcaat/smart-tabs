import { useState, useEffect } from 'react';
import styles from './TabGroup.module.css';
import TabItem from '../TabItem';
import { useTranslation } from '../../lib/i18n';

function createFaviconUrl(url) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=32`;
}

function domainColor(domain, isDark = false) {
  let hash = 0;
  for (let i = 0; i < domain.length; ++i) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  // Light mode: bright pastel, Dark mode: subtle muted tint
  if (isDark) {
    return `hsl(${hue}, 15%, 16%)`;
  }
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
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkTheme = () => {
      setIsDark(document.body.classList.contains('dark'));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handlePin = (e) => {
    e.stopPropagation();
    onTogglePin();
  };

  const handleCloseAll = (e) => {
    e.stopPropagation();
    onCloseGroup();
  };

  const backgroundColor = domainColor(domain, isDark);

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
