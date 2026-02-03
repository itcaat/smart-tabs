import { useState, useEffect, useCallback } from 'react';
import styles from './QuickLinks.module.css';
import { useTranslation } from '../../lib/i18n';

const STORAGE_KEY = 'quickLinks';
const LINKS_PER_SIDE = 8;

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

function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    // Return array of fallback URLs to try
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
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

export default function QuickLinks({ side = 'left' }) {
  const { t } = useTranslation();
  const [allLinks, setAllLinks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [inputUrl, setInputUrl] = useState('');
  const [inputName, setInputName] = useState('');

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
  const startIndex = side === 'left' ? 0 : LINKS_PER_SIDE;
  const endIndex = startIndex + LINKS_PER_SIDE;
  
  // Get links for this side
  const sideLinks = [];
  for (let i = startIndex; i < endIndex; i++) {
    sideLinks.push(allLinks[i] || null);
  }

  const handleAddClick = (slotIndex) => {
    const globalIndex = startIndex + slotIndex;
    setEditingIndex(globalIndex);
    setInputUrl('');
    setInputName('');
    setIsModalOpen(true);
  };

  const handleEditClick = (e, slotIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const globalIndex = startIndex + slotIndex;
    const link = allLinks[globalIndex];
    if (link) {
      setEditingIndex(globalIndex);
      setInputUrl(link.url);
      setInputName(link.name || '');
      setIsModalOpen(true);
    }
  };

  const handleDeleteClick = (e, slotIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const globalIndex = startIndex + slotIndex;
    const newLinks = [...allLinks];
    // Set to null instead of removing to keep positions fixed
    newLinks[globalIndex] = null;
    saveQuickLinks(newLinks);
  };

  const handleSave = () => {
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
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsModalOpen(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {sideLinks.map((link, slotIndex) => (
          link ? (
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
          ) : (
            <div
              key={slotIndex}
              className={styles.emptySlot}
              onClick={() => handleAddClick(slotIndex)}
              title={t('addQuickLink')}
            >
              <span className={styles.plusIcon}>+</span>
            </div>
          )
        ))}
      </div>

      {/* Modal for adding/editing */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{t('addQuickLink')}</h3>
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
    </div>
  );
}
