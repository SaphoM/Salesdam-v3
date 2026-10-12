import { useAuthContext } from '../context/AuthContext';

// Convenience re-export - keeps component imports clean
const useAuth = () => useAuthContext();

export { useAuth };
export default useAuth;
