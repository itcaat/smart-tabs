import { useState, useEffect, useCallback, useRef } from 'react';
import styles from '../../styles/Pages.module.css';
import Header from '../Header';
import SpeedDial from '../SpeedDial';
import Footer from '../Footer';
import Modal from '../Modal';
import Kitty from '../Kitty';

// Check if Chrome API is available (client-side only)
const isChromeAvailable = () => typeof chrome !== 'undefined' && typeof chrome.tabs !== 'undefined';

// Preference keys for "don't ask again"
const PREF_SKIP_CLOSE_GROUP = 'skipCloseGroupConfirm';
const PREF_SKIP_REMOVE_DUPLICATES = 'skipRemoveDuplicatesConfirm';

export default function Index() {
  const [tabs, setTabs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState('light');
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [forceKitty, setForceKitty] = useState(false);
  const [speedDialRef, setSpeedDialRef] = useState(null);
  
  // Callback to receive SpeedDial container ref
  const handleContainerRef = useCallback((ref) => {
    setSpeedDialRef(ref);
  }, []);
  
  // Handle kitty click to wake it up
  const handleKittyClick = useCallback(() => {
    setForceKitty(true);
  }, []);
  
  // Modal state
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {},
    showDontAskAgain: false,
    prefKey: null,
  });

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  // Handle "don't ask again" preference save
  const handleDontAskAgainChange = (checked) => {
    if (checked && modalConfig.prefKey && typeof window !== 'undefined') {
      localStorage.setItem(modalConfig.prefKey, 'true');
    }
  };

  // Check if we should skip confirmation
  const shouldSkipConfirm = (prefKey) => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(prefKey) === 'true';
  };

  // Load tabs
  const loadTabs = useCallback(() => {
    if (!isChromeAvailable()) {
      console.error('chrome.tabs API is not available');
      return;
    }
    chrome.tabs.query({}, (allTabs) => {
      setTabs(allTabs);
    });
  }, []);

  // Calculate duplicate count
  const calculateDuplicateCount = useCallback(() => {
    if (!isChromeAvailable()) return;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (currentTabs) => {
      const currentTabId = currentTabs && currentTabs.length > 0 ? currentTabs[0].id : null;
      const urlToTab = {};
      let count = 0;
      
      for (const tab of tabs) {
        if (!tab.url) continue;
        
        try {
          const url = new URL(tab.url);
          if (url.protocol === 'chrome-extension:' || 
              url.href === 'chrome://newtab/' ||
              url.href.includes('chrome-extension://newtab')) {
            continue;
          }
        } catch (e) {
          continue;
        }
        
        if (urlToTab[tab.url]) {
          if (tab.id !== currentTabId) {
            count++;
          }
        } else {
          urlToTab[tab.url] = tab.id;
        }
      }
      
      setDuplicateCount(count);
    });
  }, [tabs]);

  // Initialize theme
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('theme');
    if (saved) {
      setTheme(saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  // Apply theme to body
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Load tabs on mount
  useEffect(() => {
    loadTabs();
  }, [loadTabs]);

  // Update duplicate count when tabs change
  useEffect(() => {
    calculateDuplicateCount();
  }, [tabs, calculateDuplicateCount]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleRemoveDuplicates = () => {
    if (!isChromeAvailable()) return;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (currentTabs) => {
      const currentTabId = currentTabs && currentTabs.length > 0 ? currentTabs[0].id : null;
      const urlToTab = {};
      const duplicateTabIds = [];
      
      for (const tab of tabs) {
        if (!tab.url) continue;
        
        try {
          const url = new URL(tab.url);
          if (url.protocol === 'chrome-extension:' || 
              url.href === 'chrome://newtab/' ||
              url.href.includes('chrome-extension://newtab')) {
            continue;
          }
        } catch (e) {
          continue;
        }
        
        if (urlToTab[tab.url]) {
          if (tab.id !== currentTabId) {
            duplicateTabIds.push(tab.id);
          }
        } else {
          urlToTab[tab.url] = tab.id;
        }
      }
      
      if (duplicateTabIds.length === 0) {
        setModalConfig({
          isOpen: true,
          title: 'No Duplicates',
          message: 'No duplicate tabs found.',
          type: 'info',
          onConfirm: closeModal,
          showDontAskAgain: false,
          prefKey: null,
        });
        return;
      }
      
      const doRemove = () => {
        chrome.tabs.remove(duplicateTabIds, () => {
          setTabs(tabs.filter(tab => !duplicateTabIds.includes(tab.id)));
        });
      };

      // Skip confirmation if user chose "don't ask again"
      if (shouldSkipConfirm(PREF_SKIP_REMOVE_DUPLICATES)) {
        doRemove();
        return;
      }
      
      setModalConfig({
        isOpen: true,
        title: 'Remove Duplicates',
        message: `Remove ${duplicateTabIds.length} duplicate tab(s)?`,
        type: 'danger',
        onConfirm: () => {
          doRemove();
          closeModal();
        },
        showDontAskAgain: true,
        prefKey: PREF_SKIP_REMOVE_DUPLICATES,
      });
    });
  };

  const handleCloseTab = (tabId) => {
    if (isChromeAvailable()) {
      chrome.tabs.remove(tabId);
      setTabs(tabs.filter(t => t.id !== tabId));
    }
  };

  const handleCloseGroup = (domain) => {
    if (!isChromeAvailable()) return;
    
    const tabsToClose = tabs.filter(t => {
      try {
        const url = new URL(t.url);
        return url.hostname === domain;
      } catch {
        return false;
      }
    });
    
    const doClose = () => {
      tabsToClose.forEach(tab => {
        chrome.tabs.remove(tab.id);
      });
      
      setTabs(tabs.filter(t => {
        try {
          const url = new URL(t.url);
          return url.hostname !== domain;
        } catch {
          return true;
        }
      }));
    };

    // Skip confirmation if user chose "don't ask again"
    if (shouldSkipConfirm(PREF_SKIP_CLOSE_GROUP)) {
      doClose();
      return;
    }
    
    setModalConfig({
      isOpen: true,
      title: 'Close All Tabs',
      message: `Close ALL ${tabsToClose.length} tab(s) for ${domain}?`,
      type: 'danger',
      onConfirm: () => {
        doClose();
        closeModal();
      },
      showDontAskAgain: true,
      prefKey: PREF_SKIP_CLOSE_GROUP,
    });
  };

  const handleActivateTab = (tab) => {
    if (isChromeAvailable() && typeof chrome.windows !== 'undefined') {
      chrome.tabs.update(tab.id, { active: true }, () => {
        if (tab.windowId !== undefined) {
          chrome.windows.update(tab.windowId, { focused: true });
        }
        window.close();
      });
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleSearchSubmit = (query) => {
    if (query && isChromeAvailable()) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      chrome.tabs.create({ url: searchUrl }, () => {
        window.close();
      });
    }
  };

  return (
    <div className={styles.container}>
      <Header 
        theme={theme}
        onToggleTheme={toggleTheme}
        duplicateCount={duplicateCount}
        onRemoveDuplicates={handleRemoveDuplicates}
        searchValue={searchQuery}
        onSearchChange={handleSearch}
        onSearchSubmit={handleSearchSubmit}
      />
      <main className={styles.main}>
        <SpeedDial 
          tabs={tabs}
          searchQuery={searchQuery}
          onCloseTab={handleCloseTab}
          onCloseGroup={handleCloseGroup}
          onActivateTab={handleActivateTab}
          onContainerRef={handleContainerRef}
        />
      </main>
      <Footer />
      
      <Modal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        onCancel={closeModal}
        confirmText={modalConfig.type === 'info' ? 'OK' : 'Yes, do it'}
        cancelText="Cancel"
        showDontAskAgain={modalConfig.showDontAskAgain}
        onDontAskAgainChange={handleDontAskAgainChange}
      />
      
      <Kitty 
        tabCount={tabs.length} 
        containerRef={speedDialRef} 
        forceShow={forceKitty}
        onWakeUp={handleKittyClick}
      />
    </div>
  );
}
