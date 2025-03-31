import { useEffect, useState } from 'react';
import { TermsAndConditionsModal } from '@/components/ui/terms-modal';

export const useTermsModal = () => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  if (!mounted) return null;
  
  return <TermsAndConditionsModal />;
};
