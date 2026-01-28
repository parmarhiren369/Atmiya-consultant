import { useAuth } from '../context/AuthContext';

export const useUserInfo = () => {
  const { user } = useAuth();
  
  return {
    userId: user?.userId,
    userDisplayName: user?.displayName,
    user
  };
};
