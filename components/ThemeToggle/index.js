import styles from './ThemeToggle.module.css';
import { useTranslation } from '../../lib/i18n';

export default function ThemeToggle({ isDark, onToggle }) {
  const { t } = useTranslation();
  
  return (
    <button 
      className={`${styles.toggle} ${isDark ? styles.dark : ''}`}
      onClick={onToggle}
      title={isDark ? t('switchToLight') : t('switchToDark')}
      aria-label={t('toggleTheme')}
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
