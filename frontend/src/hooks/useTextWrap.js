import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Clip-vs-wrap preference for table cells, kept in the URL so a list can be
 * shared or reloaded in the state you were reading it in.
 *
 * `?wrap=` is the source of truth when present. Without it the last choice made
 * anywhere in the app is used, which keeps the setting from resetting every time
 * you open a list from a fresh link.
 */

const PARAM = 'wrap';
const STORAGE_KEY = 'crm-list-text-wrap';

export const CLIP = 'clip';
export const WRAP = 'wrap';

const normalise = (value) => (value === WRAP ? WRAP : CLIP);

const readStored = () => {
  try {
    return normalise(localStorage.getItem(STORAGE_KEY));
  } catch {
    return CLIP;
  }
};

const writeStored = (mode) => {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private-mode / quota failures aren't worth surfacing.
  }
};

/**
 * @returns {[('clip'|'wrap'), (mode: 'clip'|'wrap') => void]}
 */
const useTextWrap = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromUrl = searchParams.get(PARAM);
  const textWrap = fromUrl ? normalise(fromUrl) : readStored();

  const setTextWrap = useCallback(
    (mode) => {
      const next = normalise(mode);
      // Written to both: the URL so this list keeps the choice, storage so the
      // next list opened without a `?wrap=` inherits it.
      writeStored(next);
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set(PARAM, next);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return [textWrap, setTextWrap];
};

export default useTextWrap;
