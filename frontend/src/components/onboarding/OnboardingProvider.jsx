import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const OnboardingContext = createContext(null);

/**
 * Owns the first-login welcome modal and the guided tour.
 * Progress lives on the user's own preferences
 * (PATCH /users/me/profile -> user.preferences.onboarding), so there is no
 * schema change and "replay" is just the tour flag again.
 */
export const OnboardingProvider = ({ children }) => {
  const { user, updateUser } = useAuth();
  const [tourOpen, setTourOpen] = useState(false);

  // Derived rather than an effect: after the PATCH the stored flag is already
  // set, and if the PATCH fails the welcome is simply offered again later.
  const welcomeOpen =
    Boolean(user) &&
    !tourOpen &&
    !user.preferences?.onboarding?.welcomeSeenAt;

  const save = useCallback(
    (patch) => {
      if (!user) return;
      const preferences = {
        ...(user.preferences || {}),
        onboarding: { ...(user.preferences?.onboarding || {}), ...patch },
      };
      updateUser({ preferences });
      api.patch('/users/me/profile', { preferences }).catch(() => {});
    },
    [user, updateUser],
  );

  const startTour = useCallback(() => {
    save({ welcomeSeenAt: new Date().toISOString(), tourStatus: 'in_progress' });
    setTourOpen(true);
  }, [save]);

  const exploreOnMyOwn = useCallback(() => {
    save({ welcomeSeenAt: new Date().toISOString(), tourStatus: 'skipped' });
  }, [save]);

  const finishTour = useCallback(
    (status) => {
      setTourOpen(false);
      save({ tourStatus: status === 'completed' ? 'completed' : 'dismissed' });
    },
    [save],
  );

  const value = useMemo(
    () => ({
      welcomeOpen,
      tourOpen,
      startTour,
      exploreOnMyOwn,
      finishTour,
      replayTour: startTour,
    }),
    [welcomeOpen, tourOpen, startTour, exploreOnMyOwn, finishTour],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
};

export default OnboardingContext;
