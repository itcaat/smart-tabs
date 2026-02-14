import { useState, useRef, useEffect } from 'react';
import styles from './EmojiPicker.module.css';

const EMOJI_CATEGORIES = [
  {
    id: 'finance',
    label: '💰',
    title: 'Finance & Crypto',
    emojis: [
      '₿', 'Ξ', '💰', '💵', '💴', '💶', '💷', '💸', '🪙',
      '📈', '📉', '📊', '💹', '🏦', '💳', '🏧',
      '🤑', '💎', '⛏️', '🔗', '🦊',
    ],
  },
  {
    id: 'weather',
    label: '🌤️',
    title: 'Weather',
    emojis: [
      '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️',
      '🌨️', '❄️', '🌬️', '🌡️', '🔥', '💧', '🌊',
      '🌈', '🌪️', '☔', '⚡', '🌫️',
    ],
  },
  {
    id: 'tech',
    label: '🖥️',
    title: 'Tech & Monitoring',
    emojis: [
      '🖥️', '💻', '📱', '⌨️', '🖱️', '🔌', '💾', '💿',
      '📡', '🛰️', '🔧', '🔩', '⚙️', '🛠️',
      '🐛', '🧪', '🔬', '🤖', '🧠', '📶', '🔋',
    ],
  },
  {
    id: 'status',
    label: '✅',
    title: 'Status & Indicators',
    emojis: [
      '✅', '❌', '⚠️', '❗', '❓', '⛔', '🚫',
      '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚪', '⚫',
      '🔔', '🔕', '🔒', '🔓', '🔑', '🛡️',
    ],
  },
  {
    id: 'charts',
    label: '📊',
    title: 'Data & Charts',
    emojis: [
      '📊', '📈', '📉', '🗂️', '📋', '📝', '📄', '📑',
      '🗃️', '🗄️', '📁', '📂', '🔍', '🔎',
      '⏱️', '⏰', '🕐', '📅', '📆', '⏳', '⌛',
    ],
  },
  {
    id: 'objects',
    label: '🚀',
    title: 'Objects & Symbols',
    emojis: [
      '🚀', '✨', '⭐', '🌟', '💫', '🎯', '🏆', '🥇',
      '🎉', '🎊', '🎁', '🧲', '💡', '🔮', '🎲',
      '🌍', '🌎', '🌏', '🏠', '🏢', '🏭',
    ],
  },
  {
    id: 'arrows',
    label: '➡️',
    title: 'Arrows & Math',
    emojis: [
      '⬆️', '⬇️', '⬅️', '➡️', '↗️', '↘️', '↙️', '↖️',
      '↕️', '↔️', '🔄', '🔃', '🔀', '🔁', '🔂',
      '➕', '➖', '✖️', '➗', '♾️', '‼️',
    ],
  },
  {
    id: 'food',
    label: '🍕',
    title: 'Food & Drink',
    emojis: [
      '☕', '🍵', '🧋', '🥤', '🍺', '🍷', '🍸', '🧃',
      '🍕', '🍔', '🍟', '🌮', '🍣', '🍩', '🎂', '🍫',
      '🍎', '🍊', '🍋', '🍌', '🍉', '🥑',
    ],
  },
];

export default function EmojiPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id);
  const [search, setSearch] = useState('');
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

  // Close picker on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (emoji) => {
    onChange(emoji);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeCategory);

  // Filter emojis by search across all categories
  const filteredEmojis = search.trim()
    ? EMOJI_CATEGORIES.flatMap((cat) => cat.emojis)
        .filter((emoji, index, self) => self.indexOf(emoji) === index) // dedupe
    : currentCategory?.emojis || [];

  return (
    <div className={styles.wrapper}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        title="Choose icon"
      >
        {value ? (
          <span className={styles.triggerEmoji}>{value}</span>
        ) : (
          <span className={styles.triggerPlaceholder}>Icon</span>
        )}
      </button>

      {isOpen && (
        <div ref={pickerRef} className={styles.picker}>
          {/* Category tabs */}
          <div className={styles.categories}>
            {EMOJI_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`${styles.categoryTab} ${activeCategory === cat.id ? styles.categoryTabActive : ''}`}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSearch('');
                }}
                title={cat.title}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className={styles.grid}>
            {filteredEmojis.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                type="button"
                className={styles.emojiButton}
                onClick={() => handleSelect(emoji)}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Clear button */}
          {value && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={handleClear}
            >
              Clear icon
            </button>
          )}
        </div>
      )}
    </div>
  );
}
