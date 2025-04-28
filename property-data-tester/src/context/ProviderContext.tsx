import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DATA_PROVIDERS } from '../constants/providers';

interface ProviderContextType {
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
}

const ProviderContext = createContext<ProviderContextType | undefined>(undefined);

export const useProvider = (): ProviderContextType => {
  const context = useContext(ProviderContext);
  if (!context) {
    throw new Error('useProvider must be used within a ProviderContextProvider');
  }
  return context;
};

interface ProviderContextProviderProps {
  children: ReactNode;
}

export const ProviderContextProvider: React.FC<ProviderContextProviderProps> = ({ children }) => {
  const [selectedProvider, setSelectedProvider] = useState<string>(() => {
    return localStorage.getItem('selectedProvider') || DATA_PROVIDERS[0].id;
  });

  useEffect(() => {
    localStorage.setItem('selectedProvider', selectedProvider);
  }, [selectedProvider]);

  return (
    <ProviderContext.Provider value={{ selectedProvider, setSelectedProvider }}>
      {children}
    </ProviderContext.Provider>
  );
};
