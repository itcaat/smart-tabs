import styles from './ThemeToggle.module.css';

export default function ThemeToggle({ isDark, onToggle }) {
  return (
    <button 
      className={`${styles.toggle} ${isDark ? styles.dark : ''}`}
      onClick={onToggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      <div className={styles.track}>
        <div className={styles.stars}>
          <span className={styles.star}></span>
          <span className={styles.star}></span>
          <span className={styles.star}></span>
          <span className={styles.star}></span>
          <span className={styles.star}></span>
        </div>
        <div className={styles.clouds}>
          <span className={styles.cloud}></span>
          <span className={styles.cloud}></span>
        </div>
        <div className={styles.thumb}>
          <div className={styles.sun}></div>
          <div className={styles.moon}>
            <span className={styles.crater}></span>
            <span className={styles.crater}></span>
            <span className={styles.crater}></span>
          </div>
        </div>
      </div>
    </button>
  );
}
