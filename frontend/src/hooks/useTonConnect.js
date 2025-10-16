/**
 * Custom hook for TonConnect wallet management.
 * Implements proper authentication flow with challenge generation and proof verification.
 */

import { useTonAddress, useTonWallet, useIsConnectionRestored, useTonConnectUI } from '@tonconnect/ui-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getChallenge } from '../services/apiService';

/**
 * Custom hook that manages TonConnect wallet state and provides simplified interface.
 * @returns {Object} Wallet state and utility functions
 */
export const useTonConnect = () => {
  const walletAddress = useTonAddress();
  const wallet = useTonWallet();
  const connectionRestored = useIsConnectionRestored();
  const [tonConnectUI] = useTonConnectUI();
  
  const [isConnected, setIsConnected] = useState(false);
  const [hasTonProof, setHasTonProof] = useState(false);
  const [clientId, setClientId] = useState(null);
  const firstProofLoading = useRef(true);

  // Update connection state when wallet address changes
  useEffect(() => {
    setIsConnected(!!walletAddress);
  }, [walletAddress]);

  /**
   * Generate challenge and set up TonConnect parameters
   */
  const recreateProofPayload = useCallback(async () => {
    if (firstProofLoading.current) {
      tonConnectUI.setConnectRequestParameters({ state: 'loading' });
      firstProofLoading.current = false;
    }
    
    try {
      const challengeData = await getChallenge(walletAddress || 'unknown');
      setClientId(challengeData.clientId);
      
      if (challengeData.challenge) {
        tonConnectUI.setConnectRequestParameters({
          state: 'ready',
          value: { tonProof: challengeData.challenge },
        });
        console.log('✅ Challenge generated and set for TonConnect');
      } else {
        tonConnectUI.setConnectRequestParameters(null);
      }
    } catch (e) {
      console.error('❌ Failed to generate challenge:', e);
      tonConnectUI.setConnectRequestParameters(null);
    }
  }, [tonConnectUI, walletAddress]);

  // Initialize challenge on mount
  useEffect(() => {
    if (firstProofLoading.current) {
      recreateProofPayload();
    }
  }, [recreateProofPayload]);

  // Handle wallet status changes
  useEffect(() => {
    const unsubscribe = tonConnectUI.onStatusChange(async (wallet) => {
      if (!wallet) {
        console.log('Wallet disconnected, resetting state');
        setHasTonProof(false);
        setIsConnected(false);
        setClientId(null);
        setTimeout(() => tonConnectUI.setConnectRequestParameters(null), 100);
        return;
      }

      // Case 1: We received a proof. This happens after user signs.
      if (wallet.connectItems?.tonProof && 'proof' in wallet.connectItems.tonProof) {
        console.log('✅ TON Proof received:', wallet.connectItems.tonProof);
        setHasTonProof(true);
        setIsConnected(true);
      } else {
        // Case 2: Wallet is connected, but no proof is present.
        // This can happen on page load with a pre-connected wallet.
        console.log('Wallet is connected, but no proof. Requesting new proof payload.');
        setHasTonProof(false);
        setIsConnected(true);
        // If we aren't authenticated with our backend yet, we need a proof.
        if (!hasTonProof) {
          recreateProofPayload();
        }
      }
    });

    return () => unsubscribe();
  }, [tonConnectUI, hasTonProof, recreateProofPayload]);

  return {
    walletAddress,
    wallet,
    isConnected,
    hasTonProof,
    connectionRestored,
    clientId,
    setHasTonProof,
    recreateProofPayload
  };
};
