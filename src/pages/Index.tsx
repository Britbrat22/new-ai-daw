import { memo } from 'react';
import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';

export const Index = memo(function Index() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
});

export default Index;
