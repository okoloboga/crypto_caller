/**
 * Custom hook for TonConnect wallet management.
 * Implements proper authentication flow with challenge generation and proof verification.
 */

import { useTonAddress, useTonWallet, useIsConnectionRestored, useTonConnectUI } from '@tonconnect/ui-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getChallenge, verifyProof } from '../services/apiService';

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
    try {
      // Генерируем challenge БЕЗ walletAddress (как в рабочем примере)
      const challengeData = await getChallenge();
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
  }, [tonConnectUI]);

  // Generate challenge when component mounts (like in working example)
  useEffect(() => {
    if (firstProofLoading.current) {
      tonConnectUI.setConnectRequestParameters({ state: 'loading' });
      firstProofLoading.current = false;
    }
    recreateProofPayload();
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
        
        // ВАЖНО: Отправляем tonProof на бэкенд для проверки
        if (!clientId) {
          console.error('Client ID not available for proof verification.');
          return;
        }
        
        try {
          const authResponse = await verifyProof(
            wallet.account,
            wallet.connectItems.tonProof,
            clientId
          );
          
          if (authResponse.valid) {
            console.log('✅ Proof verification successful');
            // Здесь можно сохранить токен или выполнить другие действия
          } else {
            console.error('❌ Proof verification failed');
            tonConnectUI.disconnect();
          }
        } catch (e) {
          console.error('TonProof verification failed:', e);
          tonConnectUI.disconnect();
        }
      } else {
        // Case 2: Wallet is connected, but no proof is present.
        // This can happen on page load with a pre-connected wallet.
        console.log('Wallet is connected, but no proof. Requesting new proof payload.');
        setHasTonProof(false);
        setIsConnected(true);
        // If we aren't authenticated with our backend yet, we need a proof.
        recreateProofPayload();
      }
    });

    return () => unsubscribe();
  }, [tonConnectUI, clientId, recreateProofPayload]);

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
