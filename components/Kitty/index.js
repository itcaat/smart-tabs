import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './Kitty.module.css';
import { useTranslation } from '../../lib/i18n';

const KITTY_SIZE = 24;
const JUMP_DURATION = 500;
const WALK_SPEED = 1.2;
const FALL_DURATION = 600;
const STUNNED_DURATION = 5000;
const BED_X = 20;
const BED_Y_OFFSET = 60; // From bottom

const OLD_TABS_HINT_DURATION = 10000; // 10 seconds
const OLD_TABS_HINT_DISMISSED_KEY = 'oldTabsHintDismissed';

export default function Kitty({ tabCount, containerRef, forceShow = false, onWakeUp, oldTabsCount = 0 }) {
  const { t } = useTranslation();
  const [position, setPosition] = useState({ x: BED_X, y: -100 });
  const [state, setState] = useState('sleeping'); // sleeping, entering, walking, jumping, falling, stunned, returning, hidden
  const [direction, setDirection] = useState(1);
  const [currentTileIndex, setCurrentTileIndex] = useState(-1);
  const [targetTile, setTargetTile] = useState(null);
  const [phrase, setPhrase] = useState('');
  const [showOldTabsHint, setShowOldTabsHint] = useState(false);
  const animationRef = useRef(null);
  const walkPauseRef = useRef(0);
  const currentTileElementRef = useRef(null);
  const lastTileCountRef = useRef(0);
  const isActiveRef = useRef(false);
  const hintTimerRef = useRef(null);

  // Get bed Y position
  const getBedY = useCallback(() => {
    return window.innerHeight - KITTY_SIZE - BED_Y_OFFSET;
  }, []);

  // Get tile positions in viewport coordinates
  const getTiles = useCallback(() => {
    if (!containerRef?.current) return [];
    const tiles = containerRef.current.querySelectorAll('[data-group]:not([class*="removing"])');
    return Array.from(tiles).map(tile => {
      const rect = tile.getBoundingClientRect();
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        element: tile
      };
    });
  }, [containerRef]);

  // Kitty only wakes up when clicked (forceShow)
  const shouldShow = forceShow;

  // Initialize position
  useEffect(() => {
    setPosition({ x: BED_X, y: getBedY() });
  }, [getBedY]);

  // Check if hint was dismissed
  const wasHintDismissed = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(OLD_TABS_HINT_DISMISSED_KEY) === 'true';
  };

  // Show old tabs hint with auto-hide timer
  useEffect(() => {
    if (oldTabsCount > 0 && state === 'sleeping' && !wasHintDismissed()) {
      setShowOldTabsHint(true);
      
      // Clear previous timer
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
      
      // Auto-hide after 10 seconds
      hintTimerRef.current = setTimeout(() => {
        setShowOldTabsHint(false);
      }, OLD_TABS_HINT_DURATION);
    } else {
      setShowOldTabsHint(false);
    }
    
    return () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
    };
  }, [oldTabsCount, state]);

  // Close hint manually and remember
  const handleCloseHint = (e) => {
    e.stopPropagation();
    setShowOldTabsHint(false);
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
    }
    // Remember that user dismissed the hint
    if (typeof window !== 'undefined') {
      localStorage.setItem(OLD_TABS_HINT_DISMISSED_KEY, 'true');
    }
  };

  // Handle show/hide transitions
  useEffect(() => {
    if (shouldShow && !isActiveRef.current && state === 'sleeping') {
      // Wake up and go!
      isActiveRef.current = true;
      setDirection(1);
      setState('entering');
    } else if (!shouldShow && isActiveRef.current && (state === 'walking' || state === 'idle')) {
      // Time to go back to bed
      isActiveRef.current = false;
      setState('returning');
    }
  }, [shouldShow, state]);

  // Check if current tile was removed
  useEffect(() => {
    if (state !== 'walking' && state !== 'idle') return;
    
    const checkTile = () => {
      const tiles = getTiles();
      
      if (tiles.length < lastTileCountRef.current) {
        if (currentTileElementRef.current) {
          const stillExists = tiles.some(t => t.element === currentTileElementRef.current);
          if (!stillExists) {
            setState('falling');
            currentTileElementRef.current = null;
            return;
          }
        }
      }
      
      lastTileCountRef.current = tiles.length;
      
      if (currentTileIndex >= tiles.length || currentTileIndex < 0) {
        setState('falling');
        currentTileElementRef.current = null;
      }
    };
    
    const interval = setInterval(checkTile, 100);
    return () => clearInterval(interval);
  }, [state, currentTileIndex, getTiles]);

  // Main animation loop
  useEffect(() => {
    if (state === 'sleeping' || state === 'hidden') return;

    const animate = () => {
      const tiles = getTiles();
      const bedY = getBedY();

      setPosition(prev => {
        let newX = prev.x;
        let newY = prev.y;

        if (state === 'entering') {
          // Walk from bed to first tile
          newX = prev.x + WALK_SPEED;
          newY = bedY;
          
          if (tiles.length > 0 && newX > 80) {
            const firstTile = tiles[0];
            setTargetTile(firstTile);
            currentTileElementRef.current = firstTile.element;
            lastTileCountRef.current = tiles.length;
            setState('jumping');
            setCurrentTileIndex(0);
            return prev;
          }
        } else if (state === 'walking') {
          const tile = tiles[currentTileIndex];
          if (tile) {
            newY = tile.y - KITTY_SIZE + 4;
            
            if (walkPauseRef.current > 0) {
              walkPauseRef.current--;
              return { x: prev.x, y: newY };
            }
            
            if (Math.random() < 0.01) {
              walkPauseRef.current = Math.floor(Math.random() * 60) + 20;
            }
            
            newX = prev.x + (WALK_SPEED * direction);
            
            const tileLeft = tile.x + 8;
            const tileRight = tile.x + tile.width - KITTY_SIZE - 8;
            
            if (newX >= tileRight) {
              setDirection(-1);
              newX = tileRight;
            } else if (newX <= tileLeft) {
              setDirection(1);
              newX = tileLeft;
            }
            
            if (Math.random() < 0.003 && tiles.length > 1) {
              const nearbyTiles = tiles.filter((t, i) => {
                if (i === currentTileIndex) return false;
                const distance = Math.abs(t.x - tile.x) + Math.abs(t.y - tile.y);
                return distance < 400;
              });
              
              if (nearbyTiles.length > 0) {
                const nextTile = nearbyTiles[Math.floor(Math.random() * nearbyTiles.length)];
                const newIndex = tiles.indexOf(nextTile);
                
                // Set direction BEFORE jumping - cat must face the jump direction
                const jumpDirection = (nextTile.x + nextTile.width / 2) > prev.x ? 1 : -1;
                setDirection(jumpDirection);
                
                setTargetTile(nextTile);
                currentTileElementRef.current = nextTile.element;
                setCurrentTileIndex(newIndex);
                setState('jumping');
                return prev;
              }
            }
          } else {
            setState('falling');
            currentTileElementRef.current = null;
            return prev;
          }
        } else if (state === 'returning') {
          // Walk back to bed
          newY = bedY;
          
          if (prev.x > BED_X + 5) {
            setDirection(-1);
            newX = prev.x - WALK_SPEED;
          } else {
            // Arrived at bed, go to sleep
            setState('sleeping');
            return { x: BED_X, y: bedY };
          }
        }

        return { x: newX, y: newY };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state, direction, currentTileIndex, getTiles, getBedY]);

  // Handle jumping
  useEffect(() => {
    if (state === 'jumping' && targetTile) {
      const startPos = { ...position };
      
      // Use current direction (already set before jumping)
      // Land on the side of the tile we're approaching from
      const endX = direction === 1 
        ? targetTile.x + 15  // Land on left side when jumping right
        : targetTile.x + targetTile.width - KITTY_SIZE - 15;  // Land on right side when jumping left
      const endY = targetTile.y - KITTY_SIZE + 4;
      const startTime = Date.now();
      
      const distance = Math.sqrt(
        Math.pow(endX - startPos.x, 2) + Math.pow(endY - startPos.y, 2)
      );
      const arcHeight = Math.min(80, Math.max(40, distance * 0.3));

      const jumpAnimate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / JUMP_DURATION, 1);
        
        const easeProgress = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        const arcProgress = Math.sin(progress * Math.PI);
        
        const newX = startPos.x + (endX - startPos.x) * easeProgress;
        const newY = startPos.y + (endY - startPos.y) * easeProgress - (arcHeight * arcProgress);
        
        setPosition({ x: newX, y: newY });

        if (progress < 1) {
          requestAnimationFrame(jumpAnimate);
        } else {
          setPosition({ x: endX, y: endY });
          setState('walking');
          setTargetTile(null);
        }
      };

      requestAnimationFrame(jumpAnimate);
    }
  }, [state, targetTile, direction]);

  // Handle falling
  useEffect(() => {
    if (state === 'falling') {
      const startPos = { ...position };
      const startTime = Date.now();
      const bedY = getBedY();

      const fallAnimate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / FALL_DURATION, 1);
        
        const easeProgress = progress * progress * progress;
        
        const newY = startPos.y + (bedY - startPos.y) * easeProgress;
        
        setPosition({ x: startPos.x, y: newY });

        if (progress < 1) {
          requestAnimationFrame(fallAnimate);
        } else {
          const phrases = t('kittyPhrases');
          const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
          setPhrase(randomPhrase);
          setState('stunned');
        }
      };

      requestAnimationFrame(fallAnimate);
    }
  }, [state, getBedY]);

  // Handle stunned state
  useEffect(() => {
    if (state === 'stunned') {
      const timer = setTimeout(() => {
        setPhrase('');
        setState('returning');
      }, STUNNED_DURATION);
      
      return () => clearTimeout(timer);
    }
  }, [state]);

  const isMoving = (state === 'walking' && walkPauseRef.current === 0) || state === 'entering' || state === 'returning';
  const isSleeping = state === 'sleeping';

  // The bed is always visible
  const bedElement = (
    <div 
      className={styles.catBed}
      style={{
        left: BED_X - 5,
        bottom: BED_Y_OFFSET - 5,
      }}
    >
      <div className={styles.bed}>
        <div className={styles.bedRim}></div>
        <div className={styles.bedCushion}></div>
      </div>
    </div>
  );

  // Handle click on sleeping cat
  const handleSleepingCatClick = () => {
    // Show Indiana Jones phrase when waking up with old tabs
    if (oldTabsCount > 0) {
      setShowOldTabsHint(false); // Hide the hint
      setPhrase(t('kittyIndianaJones'));
      
      // Wait for phrase to be read, then wake up
      setTimeout(() => {
        setPhrase('');
        if (onWakeUp) {
          onWakeUp();
        }
      }, 2500);
    } else {
      if (onWakeUp) {
        onWakeUp();
      }
    }
  };

  // Render sleeping cat in bed
  if (isSleeping) {
    return (
      <>
        {bedElement}
        <div 
          className={styles.kittyInBed}
          style={{
            left: BED_X,
            bottom: BED_Y_OFFSET + 5,
            pointerEvents: 'auto',
            cursor: 'pointer',
          }}
          onClick={handleSleepingCatClick}
          title={oldTabsCount > 0 ? t('wakeUpKittyOldTabs') : t('wakeUpKitty')}
        >
          {phrase && (
            <div className={`${styles.speechBubble} ${styles.oldTabsHint}`}>
              {phrase}
            </div>
          )}
          {!phrase && showOldTabsHint && (
            <div className={`${styles.speechBubble} ${styles.oldTabsHint}`}>
              <button 
                className={styles.hintClose}
                onClick={handleCloseHint}
                aria-label="Close"
              >
                ✕
              </button>
              {t('kittyOldTabsHint')}
            </div>
          )}
          {!phrase && <div className={styles.zzz}>zZz</div>}
          <div className={styles.sleepingCat}>
            <div className={styles.sleepingBody}></div>
            <div className={styles.sleepingHead}>
              <div className={styles.sleepingEar}></div>
            </div>
            <div className={styles.sleepingTail}></div>
          </div>
        </div>
      </>
    );
  }

  if (state === 'hidden') return null;

  return (
    <>
      {bedElement}
      <div 
        className={`${styles.kitty} ${styles[state]} ${direction === -1 ? styles.flipped : ''} ${isMoving ? styles.moving : ''}`}
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {phrase && (
          <div className={styles.speechBubble}>
            {phrase}
          </div>
        )}
        <div className={styles.body}>
          <div className={styles.head}>
            <div className={styles.ear}></div>
            <div className={styles.eye}></div>
            <div className={styles.nose}></div>
          </div>
          <div className={styles.torso}></div>
          <div className={styles.legFront}></div>
          <div className={styles.legBack}></div>
          <div className={styles.tail}></div>
        </div>
      </div>
    </>
  );
}
