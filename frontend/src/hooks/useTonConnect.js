import { useTonAddress, useTonWallet, useIsConnectionRestored, useTonConnectUI } from '@tonconnect/ui-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getChallenge, verifyProof } from '../services/apiService';
export const useTonConnect = () => {
  const walletAddress = useTonAddress();
  const wallet = useTonWallet();
  const connectionRestored = useIsConnectionRestored();
  const [tonConnectUI] = useTonConnectUI();
  
  const [isConnected, setIsConnected] = useState(false);
  const [hasTonProof, setHasTonProof] = useState(false);
  const [clientId, setClientId] = useState(null);
  const firstProofLoading = useRef(true);

  useEffect(() => {
    setIsConnected(!!walletAddress);
  }, [walletAddress]);

  const recreateProofPayload = useCallback(async () => {
    try {
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

  useEffect(() => {
    if (firstProofLoading.current) {
      tonConnectUI.setConnectRequestParameters({ state: 'loading' });
      firstProofLoading.current = false;
    }
    recreateProofPayload();
  }, [recreateProofPayload]);
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

      if (wallet.connectItems?.tonProof && 'proof' in wallet.connectItems.tonProof) {
        console.log('✅ TON Proof received:', wallet.connectItems.tonProof);
        setHasTonProof(true);
        setIsConnected(true);
        
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
          } else {
            console.error('❌ Proof verification failed');
            tonConnectUI.disconnect();
          }
        } catch (e) {
          console.error('TonProof verification failed:', e);
          tonConnectUI.disconnect();
        }
      } else {
        console.log('Wallet is connected, but no proof. Requesting new proof payload.');
        setHasTonProof(false);
        setIsConnected(true);
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
