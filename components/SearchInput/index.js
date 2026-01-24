import { useEffect, useRef } from 'react';
import styles from './SearchInput.module.css';

export default function SearchInput({ value, onChange, onSubmit }) {
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && inputRef.current) {
        inputRef.current.value = '';
        onChange('');
        inputRef.current.blur();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onChange]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(value);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      className={styles.input}
      placeholder="Search tabs or domains...press enter for googling"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  );
}
