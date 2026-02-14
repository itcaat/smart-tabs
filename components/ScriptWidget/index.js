import { useState, useEffect, useRef, useCallback } from 'react';
import { executeScript, initSandbox } from '../../lib/scriptRunner';
import styles from './ScriptWidget.module.css';

/**
 * ScriptWidget - renders the result of a user script in a compact slot.
 * 
 * Props:
 *   item: { type: 'script', name, script, icon, refreshInterval, lastResult }
 *   onResultCached: (value) => void  -- called to cache result in localStorage
 *   onEdit: (e) => void
 *   onDelete: (e) => void
 */
export default function ScriptWidget({ item, onResultCached, onEdit, onDelete }) {
  const [result, setResult] = useState(
    item.lastResult ? { value: item.lastResult } : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const runScript = useCallback(async () => {
    if (!item.script) return;
    setLoading(true);
    setError(null);

    try {
      await initSandbox();
      const res = await executeScript(item.script);
      if (mountedRef.current) {
        setResult(res);
        setLoading(false);
        if (onResultCached && res.value !== undefined) {
          onResultCached(String(res.value));
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || 'Error');
        setLoading(false);
      }
    }
  }, [item.script, onResultCached]);

  // Run on mount and set up refresh interval
  useEffect(() => {
    mountedRef.current = true;
    runScript();

    if (item.refreshInterval && item.refreshInterval > 0) {
      intervalRef.current = setInterval(runScript, item.refreshInterval * 1000);
    }

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [item.script, item.refreshInterval, runScript]);

  const displayValue = result?.value ?? item.lastResult ?? '—';
  const displayColor = result?.color || undefined;
  const tooltip = [
    item.name,
    result?.label,
    error ? `Error: ${error}` : null
  ].filter(Boolean).join(' | ');

  return (
    <div
      className={`${styles.widget} ${error ? styles.widgetError : ''}`}
      title={tooltip}
      onClick={() => runScript()}
    >
      {/* Icon / emoji */}
      {item.icon && (
        <span className={styles.icon}>{item.icon}</span>
      )}

      {/* Value */}
      <span
        className={styles.value}
        style={displayColor ? { color: displayColor } : undefined}
      >
        {loading && !result ? '...' : displayValue}
      </span>

      {/* Loading indicator */}
      {loading && result && (
        <span className={styles.loadingDot} />
      )}

      {/* Error indicator */}
      {error && !loading && (
        <span className={styles.errorDot} title={error} />
      )}

      {/* Edit button */}
      <button
        className={styles.editButton}
        onClick={(e) => { e.stopPropagation(); onEdit(e); }}
      >
        ✎
      </button>

      {/* Delete button */}
      <button
        className={styles.deleteButton}
        onClick={(e) => { e.stopPropagation(); onDelete(e); }}
      >
        ✕
      </button>
    </div>
  );
}
