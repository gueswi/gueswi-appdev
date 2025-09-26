import { createContext, useContext, useState, ReactNode } from 'react';
import { CallBar } from './call-bar';
import { CallPanel } from './call-panel';

interface SoftphoneContextType {
  isPanelOpen: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
}

const SoftphoneContext = createContext<SoftphoneContextType | undefined>(undefined);

export function useSoftphone() {
  const context = useContext(SoftphoneContext);
  if (context === undefined) {
    throw new Error('useSoftphone must be used within a SoftphoneProvider');
  }
  return context;
}

interface SoftphoneProviderProps {
  children: ReactNode;
}

export function SoftphoneProvider({ children }: SoftphoneProviderProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const togglePanel = () => setIsPanelOpen(!isPanelOpen);
  const openPanel = () => setIsPanelOpen(true);
  const closePanel = () => setIsPanelOpen(false);

  return (
    <SoftphoneContext.Provider value={{
      isPanelOpen,
      togglePanel,
      openPanel,
      closePanel
    }}>
      {children}
      <CallBar 
        onTogglePanel={togglePanel} 
        isPanelOpen={isPanelOpen} 
      />
      <CallPanel 
        isOpen={isPanelOpen} 
        onClose={closePanel} 
      />
    </SoftphoneContext.Provider>
  );
}