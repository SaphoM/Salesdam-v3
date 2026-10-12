import React from 'react';
import styles from './Button.module.css';

/**
 * Button Component
 *
 * A reusable, accessible button component with multiple variants and sizes.
 * Supports icons, loading states, and various semantic uses.
 *
 * @component
 * @example
 * // Primary button with icon
 * <Button variant="primary" icon={<SaveIcon />}>Save</Button>
 *
 * @example
 * // Secondary button with loading state
 * <Button variant="secondary" loading={isSaving}>Saving...</Button>
 *
 * @example
 * // Danger button for destructive actions
 * <Button variant="danger">Delete</Button>
 *
 * @param {React.ReactNode} children - Button label/text content
 * @param {string} [variant='primary'] - Button style variant:
 *   - 'primary': Main action button (blue background)
 *   - 'secondary': Alternative action button (white background with border)
 *   - 'ghost': Text-only button (transparent, blue text)
 *   - 'danger': Destructive action (red background)
 *   - 'danger-outline': Destructive text button (transparent with red text)
 *   - 'success': Affirmative action (green background)
 *   - 'link': Link-style button (underline on hover)
 *
 * @param {string} [size='md'] - Button size: 'xs', 'sm', 'md', 'lg'
 * @param {boolean} [disabled=false] - Disables the button
 * @param {boolean} [loading=false] - Shows loading spinner, disables interaction
 * @param {React.ReactNode} [icon] - Icon to display left of text
 * @param {React.ReactNode} [iconRight] - Icon to display right of text (hidden during loading)
 * @param {Function} [onClick] - Click handler
 * @param {string} [type='button'] - HTML button type: 'button', 'submit', 'reset'
 * @param {string} [className] - Additional CSS classes to apply
 * @param {boolean} [fullWidth=false] - Makes button 100% width
 * @param {...any} rest - Additional HTML button attributes
 *
 * @returns {React.ReactElement} A styled button element
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg'
  disabled,
  loading,
  icon,
  iconRight,
  onClick,
  type = 'button',
  className,
  fullWidth,
  ...rest
}) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={[
        styles.btn,
        styles[variant],
        styles[`size_${size}`],
        fullWidth ? styles.fullWidth : '',
        loading ? styles.loading : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : icon ? (
        <span className={styles.icon}>{icon}</span>
      ) : null}
      {children && <span className={styles.label}>{children}</span>}
      {iconRight && !loading && (
        <span className={styles.iconRight}>{iconRight}</span>
      )}
    </button>
  );
};

export default Button;
