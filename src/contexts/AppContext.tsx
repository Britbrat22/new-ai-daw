import React, { createContext, useContext, useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
// import { toast } from '@/components/ui/use-toast'; // ← unused, delete or keep for later

interface AppContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const AppContext = createContext<AppContextType>({
  sidebarOpen: false,
  toggleSidebar: () => {},
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const value = useMemo(
    () => ({ sidebarOpen, toggleSidebar }),
    [sidebarOpen]
  );

  return (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  );
};
