import styles from './Footer.module.css';
import QuickLinks from '../QuickLinks';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <QuickLinks side="bottom" />
    </footer>
  );
}
