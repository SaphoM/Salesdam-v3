import styles from './GaugeChart.module.css';
import React, { useState, useEffect } from 'react';
import useCurrency from '../../hooks/useCurrency';
import Confetti from '../common/Confetti/Confetti';

const NEEDLE_COLOR = '#464A4F';
const GAP_DEG = 4;
const SEG_DEG = (180 - 2 * GAP_DEG) / 3;

const ARCS = [
  { color: '#ef4444', start: 180, end: 180 - SEG_DEG },
  {
    color: '#f97316',
    start: 180 - SEG_DEG - GAP_DEG,
    end: 180 - 2 * SEG_DEG - GAP_DEG,
  },
  { color: '#22c55e', start: 180 - 2 * SEG_DEG - 2 * GAP_DEG, end: 0 },
];

function arcPath(cx, cy, ir, or, startDeg, endDeg, cr) {
  const rad = (d) => (d * Math.PI) / 180;
  const pt = (r, d) => [cx + r * Math.cos(rad(d)), cy - r * Math.sin(rad(d))];
  const lg = startDeg - endDeg > 180 ? 1 : 0;

  const [ox2, oy2] = pt(or, endDeg);
  const [ix1, iy1] = pt(ir, startDeg);

  // Corner radius: inset start/end angles slightly so rounded caps stay within arc
  const capDeg = (cr / ((or + ir) / 2)) * (180 / Math.PI);
  const [cox1, coy1] = pt(or, startDeg - capDeg);
  const [cox2, coy2] = pt(or, endDeg + capDeg);
  const [cix2, ciy2] = pt(ir, endDeg + capDeg);
  const [cix1, ciy1] = pt(ir, startDeg - capDeg);

  return [
    `M ${cox1.toFixed(2)} ${coy1.toFixed(2)}`,
    `A ${or} ${or} 0 ${lg} 1 ${cox2.toFixed(2)} ${coy2.toFixed(2)}`,
    `Q ${ox2.toFixed(2)} ${oy2.toFixed(2)} ${cix2.toFixed(2)} ${ciy2.toFixed(2)}`,
    `A ${ir} ${ir} 0 ${lg} 0 ${cix1.toFixed(2)} ${ciy1.toFixed(2)}`,
    `Q ${ix1.toFixed(2)} ${iy1.toFixed(2)} ${cox1.toFixed(2)} ${coy1.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function needlePath(cx, cy, pct, ir) {
  const angle = Math.PI * (1 - pct);
  const tipLen = ir - 4;
  const baseHalf = 5;

  const tipX = cx + tipLen * Math.cos(angle);
  const tipY = cy - tipLen * Math.sin(angle);
  const b1x = cx + baseHalf * Math.cos(angle + Math.PI / 2);
  const b1y = cy - baseHalf * Math.sin(angle + Math.PI / 2);
  const b2x = cx + baseHalf * Math.cos(angle - Math.PI / 2);
  const b2y = cy - baseHalf * Math.sin(angle - Math.PI / 2);

  return [
    `M ${tipX.toFixed(2)} ${tipY.toFixed(2)}`,
    `L ${b1x.toFixed(2)} ${b1y.toFixed(2)}`,
    `L ${b2x.toFixed(2)} ${b2y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

const GaugeChart = ({
  percent = 0,
  value,
  target,
  title,
  range,
  width = 240,
}) => {
  const { symbol } = useCurrency();
  const [showConfetti, setShowConfetti] = useState(false);
  const [previousPercent, setPreviousPercent] = useState(0);

  // Trigger confetti when reaching 100%
  useEffect(() => {
    if (percent >= 100 && previousPercent < 100) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
    setPreviousPercent(percent);
  }, [percent, previousPercent]);

  const fmtVal = (n) => {
    if (n == null) return '—';
    if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${symbol}${(n / 1_000).toFixed(0)}K`;
    return `${symbol}${Number(n).toLocaleString('en-ZA')}`;
  };

  // Allow percentages above 100 in display, but cap needle at 100% visually
  const displayPercent = Math.round(percent || 0);
  // Needle stays at 100% max so it points right; display shows actual percentage
  const needlePercent = Math.min(100, Math.max(0, displayPercent));
  const cx = width / 2;
  const cy = Math.round(width * 0.52);
  const or = Math.round(width * 0.46);
  const ir = Math.round(width * 0.3);
  const cornerRadius = 6;
  const h = cy + 32;

  return (
    <div className={styles.wrap}>
      <Confetti isActive={showConfetti} duration={3000} />

      {title && <h3 className={styles.title}>{title}</h3>}
      {range && <div className={styles.range}>{range}</div>}

      <div className={styles.chartWrap} style={{ width, height: h }}>
        <svg width={width} height={h} className={styles.gaugeSvg}>
          {ARCS.map((arc, i) => (
            <path
              key={i}
              d={arcPath(cx, cy, ir, or, arc.start, arc.end, cornerRadius)}
              fill={arc.color}
            />
          ))}

          <path d={needlePath(cx, cy, needlePercent / 100, ir)} fill={NEEDLE_COLOR} />
          <circle cx={cx} cy={cy} r={10} fill={NEEDLE_COLOR} />
          <circle cx={cx} cy={cy} r={5} fill="white" />
        </svg>

        <div className={`${styles.pct} ${displayPercent >= 100 ? styles.exceeded : ''}`} style={{ bottom: 4 }}>
          {displayPercent}%
        </div>
      </div>

      {(value != null || target != null) && (
        <div className={styles.vals}>
          <span className={styles.actual}>{fmtVal(value)}</span>
          <span className={styles.sep}>/</span>
          <span className={styles.tgt}>{fmtVal(target)}</span>
        </div>
      )}
    </div>
  );
};

export default GaugeChart;
