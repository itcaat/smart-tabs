import { useState, useEffect, useRef, useMemo } from 'react';
import styles from './SpeedDial.module.css';
import TabGroup from '../TabGroup';

// Check if Chrome API is available (client-side only)
const isChromeAvailable = () => typeof chrome !== 'undefined' && typeof chrome.tabs !== 'undefined';

// Utility functions for pinned domains
function getPinnedDomains() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('pinnedDomains') || '[]');
  } catch {
    return [];
  }
}

function setPinnedDomains(domains) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('pinnedDomains', JSON.stringify(domains));
}

function groupTabsByDomain(tabs) {
  const groups = {};
  for (const tab of tabs) {
    try {
      const url = new URL(tab.url);
      const domain = url.hostname;
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(tab);
    } catch (e) {
      // skip invalid URLs
    }
  }
  return groups;
}

// Check if tab is "old" (not accessed for > 1 day)
// TODO: Change back to 7 days after testing
const ONE_DAY_MS = 1 * 24 * 60 * 60 * 1000;

function isTabOld(tab) {
  if (tab.active) return false;
  const now = Date.now();
  const lastAccessed = tab.lastAccessed || now;
  return (now - lastAccessed) > ONE_DAY_MS;
}

export default function SpeedDial({ tabs, searchQuery, onCloseTab, onCloseGroup, onActivateTab, forceKitty, onContainerRef, highlightOldTabs }) {
  const containerRef = useRef(null);
  
  // Share container ref with parent
  useEffect(() => {
    if (onContainerRef) {
      onContainerRef(containerRef);
    }
  }, [onContainerRef]);
  const [pinnedDomains, setPinnedDomainsState] = useState([]);

  useEffect(() => {
    setPinnedDomainsState(getPinnedDomains());
  }, []);

  const filteredGroups = useMemo(() => {
    const query = (searchQuery || '').trim().toLowerCase();
    const groups = groupTabsByDomain(tabs);
    const result = {};
    
    Object.entries(groups).forEach(([domain, domainTabs]) => {
      // Filter out newtab domains
      const lower = domain.toLowerCase();
      if (lower === 'newtab' || lower === 'chrome://newtab' || lower === 'chrome-extension://newtab') {
        return;
      }
      
      const matchDomain = domain.toLowerCase().includes(query);
      const filteredTabs = domainTabs
        .filter(tab =>
          (tab.title && tab.title.toLowerCase().includes(query)) ||
          (tab.url && tab.url.toLowerCase().includes(query)) ||
          matchDomain
        )
        .map(tab => ({
          ...tab,
          isOld: isTabOld(tab)
        }));
      
      if (filteredTabs.length > 0) {
        result[domain] = filteredTabs;
      }
    });
    
    return result;
  }, [tabs, searchQuery]);

  // Sort groups: pinned first
  const sortedGroups = useMemo(() => {
    return Object.entries(filteredGroups).sort(([a], [b]) => {
      const aPinned = pinnedDomains.includes(a);
      const bPinned = pinnedDomains.includes(b);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  }, [filteredGroups, pinnedDomains]);

  const togglePin = (domain) => {
    const pinned = getPinnedDomains();
    let newPinned;
    
    if (pinned.includes(domain)) {
      newPinned = pinned.filter(d => d !== domain);
    } else {
      newPinned = [...pinned, domain];
    }
    
    setPinnedDomains(newPinned);
    setPinnedDomainsState(newPinned);
  };

  // Masonry layout with responsive breakpoints
  useEffect(() => {
    if (!containerRef.current) return;
    
    const calculateLayout = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const groups = container.querySelectorAll('[data-group]:not([class*="removing"])');
      if (groups.length === 0) {
        container.style.height = '100px';
        return;
      }
      
      const containerWidth = container.clientWidth;
      
      // Responsive breakpoints
      let minTileWidth, maxTileWidth, gap;
      if (containerWidth <= 480) {
        // Mobile: single column or 2 columns
        minTileWidth = 140;
        maxTileWidth = 200;
        gap = 12;
      } else if (containerWidth <= 768) {
        // Tablet
        minTileWidth = 180;
        maxTileWidth = 260;
        gap = 16;
      } else {
        // Desktop
        minTileWidth = 220;
        maxTileWidth = 320;
        gap = 24;
      }
      
      let columns = Math.floor((containerWidth + gap) / (minTileWidth + gap));
      if (columns < 1) columns = 1;
      
      let tileWidth = Math.floor((containerWidth - gap * (columns - 1)) / columns);
      if (tileWidth > maxTileWidth) {
        tileWidth = maxTileWidth;
        columns = Math.floor((containerWidth + gap) / (tileWidth + gap));
        if (columns < 1) columns = 1;
        tileWidth = Math.floor((containerWidth - gap * (columns - 1)) / columns);
      }
      
      const colHeights = Array(columns).fill(0);
      
      groups.forEach((group) => {
        group.style.position = 'absolute';
        group.style.width = tileWidth + 'px';
        
        let minCol = 0;
        for (let c = 1; c < columns; ++c) {
          if (colHeights[c] < colHeights[minCol]) minCol = c;
        }
        
        const left = minCol * (tileWidth + gap);
        const top = colHeights[minCol];
        group.style.left = left + 'px';
        group.style.top = top + 'px';
        colHeights[minCol] += group.offsetHeight + gap;
      });
      
      container.style.height = Math.max(...colHeights) + 'px';
    };
    
    // Initial layout with small delay to ensure DOM is ready
    const initialTimeout = setTimeout(calculateLayout, 10);
    
    // Recalculate after a delay to handle animations
    const animationTimeout = setTimeout(calculateLayout, 300);
    
    // Recalculate on window resize
    window.addEventListener('resize', calculateLayout);
    
    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(animationTimeout);
      window.removeEventListener('resize', calculateLayout);
    };
  }, [sortedGroups]);

  if (typeof window !== 'undefined' && !isChromeAvailable()) {
    return <div className={styles.error}>chrome.tabs API is not available. Please run as an extension!</div>;
  }

  return (
    <div ref={containerRef} className={styles.speeddial}>
      {sortedGroups.map(([domain, domainTabs]) => (
        <TabGroup
          key={domain}
          domain={domain}
          tabs={domainTabs}
          isPinned={pinnedDomains.includes(domain)}
          onTogglePin={() => togglePin(domain)}
          onCloseTab={onCloseTab}
          onCloseGroup={() => onCloseGroup(domain)}
          onActivateTab={onActivateTab}
          highlightOldTabs={highlightOldTabs}
        />
      ))}
    </div>
  );
}
