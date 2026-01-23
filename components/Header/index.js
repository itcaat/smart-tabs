import styles from './Header.module.css';

export default function Header({ theme, onToggleTheme, duplicateCount, onRemoveDuplicates }) {
  return (
    <header className={styles.header}>
      <button 
        className={styles.button}
        onClick={onRemoveDuplicates}
      >
        {duplicateCount > 0 ? `Remove duplicates(${duplicateCount})` : 'Remove duplicates'}
      </button>
      <button 
        className={styles.button}
        onClick={onToggleTheme}
      >
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>
    </header>
  );
}
