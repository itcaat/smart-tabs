import { useState, useEffect } from 'react';
import styles from './OnboardingTip.module.css';

const STORAGE_KEY = 'smarttabs_onboarding_seen';

export default function OnboardingTip() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // In development mode, always show for testing
    const isDev = process.env.NODE_ENV === 'development';
    
    // Check if user has seen the onboarding
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (isDev || !hasSeen) {
      // Show after a small delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={handleDismiss}>
      <div className={styles.tipContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.tip}>
          <div className={styles.arrow}></div>
          <div className={styles.content}>
            <p className={styles.description}>
              Хочешь быстрый доступ к Smart Tabs?
            </p>
            <div className={styles.steps}>
              <span>Нажми на</span>
              <span className={styles.icon}>🧩</span>
              <span>и затем на</span>
              <span className={styles.pinIcon}>📌</span>
              <span>рядом со Smart Tabs</span>
            </div>
          </div>
          <button className={styles.button} onClick={handleDismiss}>
            Понятно!
          </button>
        </div>
      </div>
    </div>
  );
}
