import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, X } from 'lucide-react';
import { TOUR_STEPS } from './tourSteps';
import { useOnboarding } from './OnboardingProvider';
import styles from './Onboarding.module.css';

const TOOLTIP_WIDTH = 340;
const TOOLTIP_HEIGHT = 220;
const GAP = 14;
const MAX_GROUP_ATTEMPTS = 3;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const positionFor = (rect, placement) => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!rect) {
    return {
      top: vh / 2 - TOOLTIP_HEIGHT / 2,
      left: vw / 2 - TOOLTIP_WIDTH / 2,
    };
  }

  let top;
  let left;
  if (placement === 'right') {
    top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
    left = rect.right + GAP;
  } else if (placement === 'left') {
    top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
    left = rect.left - TOOLTIP_WIDTH - GAP;
  } else if (placement === 'top') {
    top = rect.top - TOOLTIP_HEIGHT - GAP;
    left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  } else {
    top = rect.bottom + GAP;
    left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  }

  return {
    top: clamp(top, 12, vh - TOOLTIP_HEIGHT - 12),
    left: clamp(left, 12, vw - TOOLTIP_WIDTH - 12),
  };
};

/**
 * The running tour. Mounted only while open, so every run (first time or
 * replay) starts at step 1 with no reset plumbing.
 */
const Tour = () => {
  const { finishTour } = useOnboarding();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const navigatedFor = useRef(-1);

  const step = TOUR_STEPS[index];

  // Find the target and let the browser settle before measuring. Targets can
  // change the layout as we go (a collapsed accordion opens), so this is a
  // loop with a small budget rather than a single lookup. A target that never
  // appears is skipped, which makes the tour adapt to permissions for free.
  useEffect(() => {
    if (!step) return undefined;

    // The tour walks the real app: a step that lives on another page is only
    // meaningful once that page has rendered. Once per step, so a route the
    // user cannot reach (a Guard redirect) can't bounce us back and forth.
    if (step.path && pathname !== step.path && navigatedFor.current !== index) {
      navigatedFor.current = index;
      navigate(step.path);
      return undefined;
    }

    let cancelled = false;
    let attempts = 0;

    const place = () => {
      if (cancelled) return;

      const el = document.querySelector(step.selector);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
        setRect(el.getBoundingClientRect());
        return;
      }

      const toggle = step.group
        ? document.querySelector(`[data-tour-group="${step.group}"]`)
        : null;
      if (
        toggle?.getAttribute('aria-expanded') === 'false' &&
        attempts < MAX_GROUP_ATTEMPTS
      ) {
        attempts += 1;
        toggle.click();
        setTimeout(place, 80);
        return;
      }

      setRect(null);
      if (index < TOUR_STEPS.length - 1) setIndex(index + 1);
      else finishTour('completed');
    };

    const id = setTimeout(place, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [step, index, finishTour, navigate, pathname]);

  // Keep the spotlight on its target while the window moves.
  useEffect(() => {
    if (!step) return undefined;

    const onMove = () => {
      const el = document.querySelector(step.selector);
      if (el) setRect(el.getBoundingClientRect());
    };

    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [step]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') finishTour('dismissed');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [finishTour]);

  if (!step) return null;

  const isLast = index === TOUR_STEPS.length - 1;
  const pos = positionFor(rect, step.placement);

  return (
    <div
      className={styles.tourRoot}
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
    >
      {rect && (
        <div
          className={styles.spotlight}
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}

      <div
        className={styles.tooltip}
        style={{ top: pos.top, left: pos.left, width: TOOLTIP_WIDTH }}
      >
        <button
          type="button"
          className={styles.tourClose}
          onClick={() => finishTour('dismissed')}
          aria-label="Skip tour"
        >
          <X size={16} />
        </button>

        <span className={styles.tourCount}>
          Step {index + 1} of {TOUR_STEPS.length}
        </span>
        <h3 className={styles.tourTitle}>{step.title}</h3>
        <p className={styles.tourBody}>{step.body}</p>

        <div className={styles.tourActions}>
          <button
            type="button"
            className={styles.tourSkip}
            onClick={() => finishTour('dismissed')}
          >
            Skip tour
          </button>

          <div className={styles.tourNav}>
            {index > 0 && (
              <button
                type="button"
                className={styles.tourBack}
                onClick={() => setIndex((i) => i - 1)}
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <button
              type="button"
              className={styles.tourNext}
              onClick={() =>
                isLast ? finishTour('completed') : setIndex((i) => i + 1)
              }
            >
              {isLast ? 'Finish' : 'Next'}
              {!isLast && <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TourOverlay = () => {
  const { tourOpen } = useOnboarding();

  return tourOpen ? <Tour /> : null;
};

export default TourOverlay;
