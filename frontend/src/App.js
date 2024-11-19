import React from 'react';
import { TonConnectUIProvider, useTonAddress, TonConnectButton } from '@tonconnect/ui-react';
import Dashboard from './pages/Dashboard';

const App = () => {
  //const walletAddress = useTonAddress(); // Получаем адрес кошелька
  //console.log(`Wallet address: ${walletAddress}`);

  return (
    <TonConnectUIProvider manifestUrl="https://caller.ruble.website/manifest.json">
      <div>
        <TonConnectButton />
        {/* <Dashboard walletAddress={walletAddress} />  */}
      </div>
    </TonConnectUIProvider>
  );
};

export default App;
