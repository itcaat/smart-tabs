import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './QuickLinks.module.css';
import { useTranslation } from '../../lib/i18n';
import ScriptWidget from '../ScriptWidget';
import EmojiPicker from '../EmojiPicker';
import { executeScript, initSandbox } from '../../lib/scriptRunner';

const STORAGE_KEY = 'quickLinks';
const LINKS_PER_SIDE = 8;
const BOTTOM_LINKS_COUNT = 15;
const BOTTOM_CENTER_INDEX = 7; // 0-based, center of 15

function getQuickLinks() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQuickLinks(links) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  // Dispatch custom event to sync between components
  window.dispatchEvent(new CustomEvent('quickLinksUpdated'));
}

// Local icons for specific sites
// Note: specific subdomains should be listed before their parent domains
const SITE_ICONS = {
  'studio.youtube.com': '/site-icons/youtube-studio.png',
  'youtube.com': '/site-icons/youtube.png',
  'mail.google.com': '/site-icons/gmail.png',
  'gmail.com': '/site-icons/gmail.png',
  'calendar.google.com': '/site-icons/calendar.png',
  'atlassian.net': '/site-icons/jira.png',
  'jira.com': '/site-icons/jira.png',
  'confluence.com': '/site-icons/confluence.png',
  'trello.com': '/site-icons/trello.png',
};

// Path-based icons (checked before domain icons)
const PATH_ICONS = [
  { hostPattern: 'atlassian.net', pathPrefix: '/wiki/', icon: '/site-icons/confluence.png' },
];

function getLocalIcon(hostname, pathname = '') {
  // Check path-based icons first
  for (const rule of PATH_ICONS) {
    if ((hostname === rule.hostPattern || hostname.endsWith('.' + rule.hostPattern)) 
        && pathname.startsWith(rule.pathPrefix)) {
      return rule.icon;
    }
  }
  
  // Check exact match
  if (SITE_ICONS[hostname]) {
    return SITE_ICONS[hostname];
  }
  // Check if it's a subdomain of any known site
  for (const domain of Object.keys(SITE_ICONS)) {
    if (hostname.endsWith('.' + domain)) {
      return SITE_ICONS[domain];
    }
  }
  return null;
}

function getFaviconUrl(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    const pathname = urlObj.pathname;
    
    // Check for local icon first
    const localIcon = getLocalIcon(hostname, pathname);
    if (localIcon) {
      return localIcon;
    }
    
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return null;
  }
}

function getFallbackFaviconUrl(url) {
  try {
    const urlObj = new URL(url);
    // Try direct favicon from site
    return `${urlObj.origin}/favicon.ico`;
  } catch {
    return null;
  }
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

const REFRESH_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 300, label: '5m' },
  { value: 900, label: '15m' },
];

const WIDGET_CODE_EXAMPLE = `// Weather in your city (open-meteo.com, no API key)
const res = await fetchData(
  'https://api.open-meteo.com/v1/forecast?latitude=55.75&longitude=37.62&current=temperature_2m'
);
const data = JSON.parse(res);
const temp = Math.round(data.current.temperature_2m);
return { value: temp + '°', label: 'Moscow', color: temp > 0 ? '#f59e0b' : '#3b82f6' };`;

// Helper: check if item is a widget (supports both 'widget' and legacy 'script' type)
function isWidgetItem(item) {
  return item && (item.type === 'widget' || item.type === 'script');
}

// Donate URL logic (language-based)
function getDonateUrl(language) {
  return language === 'ru'
    ? 'https://pay.cloudtips.ru/p/ca4ff0b0'
    : 'https://nowpayments.io/donation/itcaat';
}

export default function QuickLinks({ side = 'left' }) {
  const { t, language } = useTranslation();
  const [allLinks, setAllLinks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState(null);

  // Modal tab: 'link' or 'widget'
  const [modalTab, setModalTab] = useState('link');

  // Link fields
  const [inputUrl, setInputUrl] = useState('');
  const [inputName, setInputName] = useState('');

  // Widget fields
  const [widgetName, setWidgetName] = useState('');
  const [widgetIcon, setWidgetIcon] = useState('');
  const [widgetCode, setWidgetCode] = useState('');
  const [widgetUrl, setWidgetUrl] = useState('');
  const [widgetRefreshInterval, setWidgetRefreshInterval] = useState(0);

  // Test result
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState(null);

  const loadLinks = useCallback(() => {
    setAllLinks(getQuickLinks());
  }, []);

  useEffect(() => {
    loadLinks();
    
    // Listen for updates from other QuickLinks instances
    const handleUpdate = () => loadLinks();
    window.addEventListener('quickLinksUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    
    return () => {
      window.removeEventListener('quickLinksUpdated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadLinks]);

  // Calculate which slots this side manages
  const isBottom = side === 'bottom';
  const slotCount = isBottom ? BOTTOM_LINKS_COUNT : LINKS_PER_SIDE;
  const startIndex = side === 'left' ? 0 : side === 'right' ? LINKS_PER_SIDE : LINKS_PER_SIDE * 2;
  const endIndex = startIndex + slotCount;
  
  // Get links for this side
  const sideLinks = [];
  for (let i = startIndex; i < endIndex; i++) {
    sideLinks.push(allLinks[i] || null);
  }

  const resetModalState = () => {
    setModalTab('link');
    setInputUrl('');
    setInputName('');
    setWidgetName('');
    setWidgetIcon('');
    setWidgetCode('');
    setWidgetUrl('');
    setWidgetRefreshInterval(0);
    setTestResult(null);
    setTestLoading(false);
    setTestError(null);
  };

  const handleAddClick = (slotIndex) => {
    const globalIndex = startIndex + slotIndex;
    setEditingIndex(globalIndex);
    resetModalState();
    setIsModalOpen(true);
  };

  const handleEditClick = (e, slotIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const globalIndex = startIndex + slotIndex;
    const link = allLinks[globalIndex];
    if (link) {
      setEditingIndex(globalIndex);
      setTestResult(null);
      setTestLoading(false);
      setTestError(null);

      if (isWidgetItem(link)) {
        setModalTab('widget');
        setWidgetName(link.name || '');
        setWidgetIcon(link.icon || '');
        setWidgetCode(link.script || '');
        setWidgetUrl(link.url || '');
        setWidgetRefreshInterval(link.refreshInterval || 0);
        // Clear link fields
        setInputUrl('');
        setInputName('');
      } else {
        setModalTab('link');
        setInputUrl(link.url || '');
        setInputName(link.name || '');
        // Clear widget fields
        setWidgetName('');
        setWidgetIcon('');
        setWidgetCode('');
        setWidgetUrl('');
        setWidgetRefreshInterval(0);
      }
      setIsModalOpen(true);
    }
  };

  const handleDeleteClick = (e, slotIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmIndex(slotIndex);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmIndex === null) return;
    const globalIndex = startIndex + deleteConfirmIndex;
    const newLinks = [...allLinks];
    // Set to null instead of removing to keep positions fixed
    newLinks[globalIndex] = null;
    saveQuickLinks(newLinks);
    setDeleteConfirmIndex(null);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmIndex(null);
  };

  const handleSave = () => {
    if (modalTab === 'widget') {
      handleSaveWidget();
    } else {
      handleSaveLink();
    }
  };

  const handleSaveLink = () => {
    let url = inputUrl.trim();
    if (!url) {
      setIsModalOpen(false);
      return;
    }

    // Add https:// if no protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const newLink = {
      type: 'link',
      url,
      name: inputName.trim() || getDomain(url),
      favicon: getFaviconUrl(url),
      faviconFallback: getFallbackFaviconUrl(url),
    };

    const newLinks = [...allLinks];
    
    // Ensure array is long enough
    while (newLinks.length <= editingIndex) {
      newLinks.push(null);
    }
    
    newLinks[editingIndex] = newLink;

    saveQuickLinks(newLinks);
    setIsModalOpen(false);
    setEditingIndex(null);
  };

  const handleSaveWidget = () => {
    const code = widgetCode.trim();
    const name = widgetName.trim();
    if (!code) {
      setIsModalOpen(false);
      return;
    }

    let url = widgetUrl.trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const newItem = {
      type: 'widget',
      name: name || '',
      script: code,
      icon: widgetIcon.trim() || '',
      url: url || '',
      refreshInterval: widgetRefreshInterval,
      lastResult: testResult?.value ?? null,
    };

    const newLinks = [...allLinks];
    
    while (newLinks.length <= editingIndex) {
      newLinks.push(null);
    }
    
    newLinks[editingIndex] = newItem;

    saveQuickLinks(newLinks);
    setIsModalOpen(false);
    setEditingIndex(null);
  };

  const handleTestWidget = async () => {
    const code = widgetCode.trim();
    if (!code) return;

    setTestLoading(true);
    setTestResult(null);
    setTestError(null);

    try {
      await initSandbox();
      const res = await executeScript(code);
      setTestResult(res);
    } catch (err) {
      setTestError(err.message || 'Error');
    } finally {
      setTestLoading(false);
    }
  };

  const handleResultCached = useCallback((slotIndex, value) => {
    const globalIndex = startIndex + slotIndex;
    const links = getQuickLinks();
    if (links[globalIndex] && isWidgetItem(links[globalIndex])) {
      links[globalIndex].lastResult = value;
      // Save silently without triggering re-render loop
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
      }
    }
  }, [startIndex]);

  const handleLinkClick = (url) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url }, () => {
        window.close();
      });
    } else {
      window.open(url, '_blank');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && modalTab === 'link') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsModalOpen(false);
    }
  };

  const renderLinkItem = (link, slotIndex) => (
    <div
      key={slotIndex}
      className={styles.linkItem}
      onClick={() => handleLinkClick(link.url)}
      title={link.url}
    >
      <div className={styles.iconWrapper}>
        {link.favicon ? (
          <img 
            src={link.favicon} 
            alt="" 
            className={styles.favicon}
            onError={(e) => {
              // Try fallback favicon URL
              if (link.faviconFallback && e.target.src !== link.faviconFallback) {
                e.target.src = link.faviconFallback;
              } else {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }
            }}
          />
        ) : null}
        <div className={styles.fallbackIcon} style={{ display: link.favicon ? 'none' : 'flex' }}>
          {(link.name || 'S')[0].toUpperCase()}
        </div>
      </div>
      <button 
        className={styles.editButton}
        onClick={(e) => handleEditClick(e, slotIndex)}
        title={t('edit')}
      >
        ✎
      </button>
      <button 
        className={styles.deleteButton}
        onClick={(e) => handleDeleteClick(e, slotIndex)}
        title={t('delete')}
      >
        ✕
      </button>
    </div>
  );

  const renderWidgetItem = (item, slotIndex) => (
    <ScriptWidget
      key={slotIndex}
      item={item}
      onResultCached={(value) => handleResultCached(slotIndex, value)}
      onEdit={(e) => handleEditClick(e, slotIndex)}
      onDelete={(e) => handleDeleteClick(e, slotIndex)}
      popupPosition={isBottom ? 'top' : 'bottom'}
    />
  );

  const renderCoffeeItem = () => (
    <div
      key="coffee"
      className={styles.coffeeItem}
      onClick={() => handleLinkClick(getDonateUrl(language))}
    >
      <span className={styles.coffeePopup}>{t('donate')}</span>
      <span className={styles.coffeeIcon}>☕</span>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={`${styles.grid} ${isBottom ? styles.gridBottom : ''}`}>
        {sideLinks.map((link, slotIndex) => {
          // Fixed center coffee item for bottom row
          if (isBottom && slotIndex === BOTTOM_CENTER_INDEX) {
            return renderCoffeeItem();
          }

          if (!link) {
            return (
              <div
                key={slotIndex}
                className={styles.emptySlot}
                onClick={() => handleAddClick(slotIndex)}
                title={t('addQuickLink')}
              >
                <span className={styles.plusIcon}>+</span>
              </div>
            );
          }

          if (isWidgetItem(link)) {
            return renderWidgetItem(link, slotIndex);
          }

          // Default: link type (backward compatible with items without type field)
          return renderLinkItem(link, slotIndex);
        })}
      </div>

      {/* Modal for adding/editing */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{t('addQuickLink')}</h3>

            {/* Tab switcher */}
            <div className={styles.tabSwitcher}>
              <button
                className={`${styles.tab} ${modalTab === 'link' ? styles.tabActive : ''}`}
                onClick={() => setModalTab('link')}
              >
                Link
              </button>
              <button
                className={`${styles.tab} ${modalTab === 'widget' ? styles.tabActive : ''}`}
                onClick={() => setModalTab('widget')}
              >
                Widget
              </button>
            </div>

            {/* Link tab */}
            {modalTab === 'link' && (
              <>
                <input
                  type="text"
                  className={styles.input}
                  placeholder={t('enterUrl')}
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <input
                  type="text"
                  className={styles.input}
                  placeholder={t('enterName')}
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </>
            )}

            {/* Widget tab */}
            {modalTab === 'widget' && (
              <>
                <div className={styles.scriptRow}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder={t('widgetName') || 'Name (e.g. CPU Usage)'}
                    value={widgetName}
                    onChange={(e) => setWidgetName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  <EmojiPicker
                    value={widgetIcon}
                    onChange={(emoji) => setWidgetIcon(emoji)}
                  />
                </div>

                <input
                  type="text"
                  className={styles.input}
                  placeholder={t('widgetUrl') || 'Link URL (optional, opens on click)'}
                  value={widgetUrl}
                  onChange={(e) => setWidgetUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                />

                <textarea
                  className={styles.codeEditor}
                  placeholder={WIDGET_CODE_EXAMPLE}
                  value={widgetCode}
                  onChange={(e) => setWidgetCode(e.target.value)}
                  onKeyDown={(e) => {
                    // Allow Tab key in textarea
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const start = e.target.selectionStart;
                      const end = e.target.selectionEnd;
                      const val = e.target.value;
                      e.target.value = val.substring(0, start) + '  ' + val.substring(end);
                      e.target.selectionStart = e.target.selectionEnd = start + 2;
                      setWidgetCode(e.target.value);
                    } else if (e.key === 'Escape') {
                      setIsModalOpen(false);
                    }
                  }}
                  spellCheck={false}
                  rows={8}
                />

                <div className={styles.scriptOptions}>
                  <div className={styles.refreshRow}>
                    <span className={styles.refreshLabel}>
                      {t('refreshInterval') || 'Refresh'}
                    </span>
                    <div className={styles.refreshButtons}>
                      {REFRESH_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          className={`${styles.refreshOption} ${widgetRefreshInterval === opt.value ? styles.refreshOptionActive : ''}`}
                          onClick={() => setWidgetRefreshInterval(opt.value)}
                          type="button"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Test button + result */}
                  <button
                    className={styles.testButton}
                    onClick={handleTestWidget}
                    disabled={testLoading || !widgetCode.trim()}
                    type="button"
                  >
                    {testLoading ? '...' : (t('testWidget') || 'Test')}
                  </button>

                  {testResult && (
                    <div className={styles.testResult}>
                      <span
                        className={styles.testValue}
                        style={testResult.color ? { color: testResult.color } : undefined}
                      >
                        {testResult.value}
                      </span>
                      {testResult.label && (
                        <span className={styles.testLabel}>{testResult.label}</span>
                      )}
                    </div>
                  )}

                  {testError && (
                    <div className={styles.testErrorMsg}>{testError}</div>
                  )}
                </div>

                <p className={styles.scriptHint}>
                  {t('widgetHint') || 'Use fetchData(url) for HTTP requests. Return { value, label?, color? }.'}
                </p>
              </>
            )}

            <div className={styles.modalButtons}>
              <button 
                className={styles.cancelButton}
                onClick={() => setIsModalOpen(false)}
              >
                {t('cancel')}
              </button>
              <button 
                className={styles.saveButton}
                onClick={handleSave}
              >
                {t('ok')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmIndex !== null && (
        <div className={styles.modalOverlay} onClick={handleDeleteCancel}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{t('delete')}</h3>
            <p className={styles.deleteMessage}>
              {t('deleteQuickLinkConfirm') || 'Delete this shortcut?'}
            </p>
            <div className={styles.modalButtons}>
              <button
                className={styles.cancelButton}
                onClick={handleDeleteCancel}
              >
                {t('cancel')}
              </button>
              <button
                className={styles.deleteConfirmButton}
                onClick={handleDeleteConfirm}
              >
                {t('yesDoIt') || 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
