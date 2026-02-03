import { useRef, useEffect } from 'react';
import styles from './Header.module.css';
import ThemeToggle from '../ThemeToggle';
import QuickLinks from '../QuickLinks';
import { useTranslation } from '../../lib/i18n';

export default function Header({ 
  theme, 
  onToggleTheme, 
  duplicateCount, 
  onRemoveDuplicates,
  searchValue,
  onSearchChange,
  onSearchSubmit
}) {
  const { t } = useTranslation();
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && inputRef.current) {
        inputRef.current.value = '';
        onSearchChange('');
        inputRef.current.blur();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSearchChange]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchSubmit(searchValue);
    }
  };

  return (
    <header className={styles.header}>
      <button 
        className={styles.button}
        onClick={onRemoveDuplicates}
      >
        {duplicateCount > 0 ? t('removeDuplicatesCount', { count: duplicateCount }) : t('removeDuplicates')}
      </button>
      
      <QuickLinks side="left" />
      
      <input
        ref={inputRef}
        type="text"
        className={styles.searchInput}
        placeholder={t('searchPlaceholder')}
        autoComplete="off"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      
      <QuickLinks side="right" />
      
      <ThemeToggle 
        isDark={theme === 'dark'}
        onToggle={onToggleTheme}
      />
    </header>
  );
}
