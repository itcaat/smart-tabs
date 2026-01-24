import '../styles/globals.css';
import { TranslationProvider } from '../lib/i18n';

export default function App({ Component, pageProps }) {
  return (
    <TranslationProvider>
      <Component {...pageProps} />
    </TranslationProvider>
  );
}
