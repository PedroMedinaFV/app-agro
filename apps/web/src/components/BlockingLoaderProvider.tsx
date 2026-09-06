import { ReactNode, useEffect, useState } from 'react';
import { BackendActivityState, subscribeBackendActivity } from '../utils/backendActivity';
import { BlockingLoader } from './BlockingLoader';

interface BlockingLoaderProviderProps {
  children: ReactNode;
}

const initialState: BackendActivityState = {
  active: false,
  label: 'Procesando...',
};

export function BlockingLoaderProvider({ children }: BlockingLoaderProviderProps) {
  const [state, setState] = useState(initialState);

  useEffect(() => subscribeBackendActivity(setState), []);

  return (
    <>
      {children}
      <BlockingLoader visible={state.active} label={state.label} />
    </>
  );
}
