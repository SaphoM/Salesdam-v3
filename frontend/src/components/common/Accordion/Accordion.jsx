import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Accordion.module.css';

export const AccordionItem = ({ id, title, icon: Icon, isOpen, onToggle, children }) => (
  <div className={styles.item}>
    <button
      className={`${styles.header} ${isOpen ? styles.open : ''}`}
      onClick={() => onToggle(id)}
      aria-expanded={isOpen}
    >
      <div className={styles.headerLeft}>
        {Icon && <Icon size={20} className={styles.headerIcon} />}
        <span className={styles.headerTitle}>{title}</span>
      </div>
      <ChevronDown
        size={18}
        className={`${styles.chevron} ${isOpen ? styles.rotated : ''}`}
      />
    </button>
    {isOpen && <div className={styles.content}>{children}</div>}
  </div>
);

export default function Accordion({ items = [], expandAll = true }) {
  const [openIds, setOpenIds] = useState(
    expandAll && items.length > 0 ? items.map((item) => item.id) : [],
  );

  const handleToggle = (id) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((openId) => openId !== id) : [...prev, id],
    );
  };

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className={styles.accordion}>
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          id={item.id}
          title={item.title}
          icon={item.icon}
          isOpen={openIds.includes(item.id)}
          onToggle={handleToggle}
        >
          {item.content}
        </AccordionItem>
      ))}
    </div>
  );
}
