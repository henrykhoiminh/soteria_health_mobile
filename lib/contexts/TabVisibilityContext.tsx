import React, { createContext, useContext } from 'react';

const CurrentTabContext = createContext<number>(0);
const OwnTabIndexContext = createContext<number>(0);

export const CurrentTabProvider = CurrentTabContext.Provider;
export const OwnTabIndexProvider = OwnTabIndexContext.Provider;

/**
 * Returns true if the calling component's tab is currently visible.
 * Works automatically — no need to pass a tab index.
 */
export function useIsTabVisible(): boolean {
  const currentTab = useContext(CurrentTabContext);
  const ownIndex = useContext(OwnTabIndexContext);
  return currentTab === ownIndex;
}
