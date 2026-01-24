import styles from './Footer.module.css';
import { useTranslation } from '../../lib/i18n';

// Check if Chrome API is available (client-side only)
const isChromeAvailable = () => typeof chrome !== 'undefined' && typeof chrome.tabs !== 'undefined';

export default function Footer() {
  const { t } = useTranslation();
  const handleRateClick = (e) => {
    e.preventDefault();
    const storeUrl = 'https://chrome.google.com/webstore/detail/inogfehnhcebnnojoifmabiccedlllpl';
    if (isChromeAvailable()) {
      chrome.tabs.create({ url: storeUrl });
    }
  };

  const handleDonateClick = (e) => {
    e.preventDefault();
    const donateUrl = 'https://tbank.ru/cf/oR5OW5IIUn';
    if (isChromeAvailable()) {
      chrome.tabs.create({ url: donateUrl });
    }
  };

  return (
    <footer className={styles.footer}>
      <a href="#" onClick={handleRateClick}>
        {t('rateExtension')}
      </a>
      <span className={styles.separator}>|</span>
      <a href="#" onClick={handleDonateClick}>
        {t('donate')}
      </a>
    </footer>
  );
}
