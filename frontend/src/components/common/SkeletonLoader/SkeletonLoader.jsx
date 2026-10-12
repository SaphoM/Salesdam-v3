import styles from './SkeletonLoader.module.css';

const SkeletonLoader = ({
  width = '100%',
  height = '20px',
  borderRadius = '4px',
  className = '',
  count = 1,
  inline = false
}) => {
  const loaders = Array.from({ length: count }).map((_, i) => (
    <div
      key={i}
      className={`${styles.skeleton} ${className}`}
      style={{
        width,
        height,
        borderRadius,
        marginBottom: inline ? '0' : i < count - 1 ? '12px' : '0',
        display: inline ? 'inline-block' : 'block',
        marginRight: inline ? '8px' : '0',
      }}
    />
  ));

  return inline ? <div style={{ display: 'flex', alignItems: 'center' }}>{loaders}</div> : <>{loaders}</>;
};

export default SkeletonLoader;
