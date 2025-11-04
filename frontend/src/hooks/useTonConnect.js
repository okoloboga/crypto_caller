import { useTonAddress, useTonWallet, useIsConnectionRestored, useTonConnectUI } from '@tonconnect/ui-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getChallenge, verifyProof } from '../services/apiService';
import { telegramAnalytics } from '../index';
export const useTonConnect = () => {
  const walletAddress = useTonAddress();
  const wallet = useTonWallet();
  const connectionRestored = useIsConnectionRestored();
  const [tonConnectUI] = useTonConnectUI();
  
  const [isConnected, setIsConnected] = useState(false);
  const [hasTonProof, setHasTonProof] = useState(false);
  const [clientId, setClientId] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
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
  // Track if we've already requested proof for current wallet connection
  const proofRequestedRef = useRef(false);
  const currentWalletAddressRef = useRef(null);
  const reconnectInProgressRef = useRef(false);

  useEffect(() => {
    const unsubscribe = tonConnectUI.onStatusChange(async (wallet) => {
      if (!wallet) {
        console.log('Wallet disconnected, resetting state');
        setHasTonProof(false);
        setIsConnected(false);
        setClientId(null);
        setIsVerifying(false);
        proofRequestedRef.current = false;
        currentWalletAddressRef.current = null;
        reconnectInProgressRef.current = false;
        setTimeout(() => tonConnectUI.setConnectRequestParameters(null), 100);
        return;
      }

      // Проверяем, есть ли информация об аккаунте
      if (!wallet.account) {
        console.log('Wallet connected but no account info yet');
        setIsConnected(true);
        setHasTonProof(false);
        return;
      }

      const walletAddress = wallet.account.address;

      // Reset proof request flag if wallet address changed
      if (currentWalletAddressRef.current !== walletAddress) {
        proofRequestedRef.current = false;
        reconnectInProgressRef.current = false;
        currentWalletAddressRef.current = walletAddress;
      }

      if (wallet.connectItems?.tonProof && 'proof' in wallet.connectItems.tonProof) {
        console.log('✅ TON Proof received, starting verification...');
        setIsVerifying(true);
        setHasTonProof(true);
        setIsConnected(true);
        proofRequestedRef.current = false; // Reset flag after receiving proof
        reconnectInProgressRef.current = false; // Reset reconnect flag
        
        if (!clientId) {
          console.error('Client ID not available for proof verification.');
          setIsVerifying(false);
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
            setHasTonProof(true);
            
            // Track wallet connected event
            try {
              if (telegramAnalytics && typeof telegramAnalytics.trackEvent === 'function') {
                telegramAnalytics.trackEvent('wallet_connected', {
                  walletAddress: wallet.account.address || 'unknown',
                });
                console.log('✅ Wallet connected event tracked');
              }
            } catch (error) {
              console.error('Error tracking wallet_connected event:', error);
            }
          } else {
            console.error('❌ Proof verification failed');
            setHasTonProof(false);
            tonConnectUI.disconnect();
          }
        } catch (e) {
          console.error('TonProof verification failed:', e);
          setHasTonProof(false);
          tonConnectUI.disconnect();
        } finally {
          setIsVerifying(false);
        }
      } else {
        // Wallet is connected but no proof
        console.log('Wallet is connected, but no proof. Requesting new proof.');
        setHasTonProof(false);
        setIsConnected(true);
        setIsVerifying(false);
        
        // Only request proof once per wallet connection and not during reconnect
        if (!proofRequestedRef.current && !reconnectInProgressRef.current) {
          proofRequestedRef.current = true;
          
          // First, set up the challenge
          await recreateProofPayload();
          
          // Then, request connection with proof by reconnecting
          // Disconnect and reconnect to get fresh proof
          try {
            reconnectInProgressRef.current = true;
            
            // Small delay to ensure challenge is set
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Temporarily disconnect to allow reconnection with proof
            // This ensures we get a fresh proof when reconnecting
            tonConnectUI.disconnect();
            
            // Small delay before reconnecting
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Request new connection with proof
            // This will prompt the user to sign the proof in their wallet
            tonConnectUI.connectWallet();
          } catch (error) {
            console.error('Error requesting proof connection:', error);
            proofRequestedRef.current = false; // Reset on error
            reconnectInProgressRef.current = false;
          }
        }
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
    isVerifying,
    setHasTonProof,
    recreateProofPayload
  };
};
