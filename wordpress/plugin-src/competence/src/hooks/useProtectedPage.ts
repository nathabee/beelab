// hooks/useProtectedPage.ts
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken } from '@utils/jwt';

export const useProtectedPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);
};
