export interface RelayerConfig {
  // TON Network
  relayerPrivateKey: string;
  relayerWalletAddress: string;
  subscriptionContractAddress: string;
  jettonMasterAddress: string;

  // Processing
  pollIntervalMs: number;
  maxRetries: number;
  gasForCallback: string; // in nanotons

  // Database
  processDbPath?: string; // For fallback file storage

  // Monitoring
  enableMetrics: boolean;
  logLevel: string;
}

export const getRelayerConfig = () => ({
  relayer: getRelayerConfigData(),
});

export const getRelayerConfigData = (): RelayerConfig => {
  // Validate required environment variables
  const requiredVars = [
    "RELAYER_PRIV_KEY",
    "RELAYER_WALLET_ADDR",
    "SUBSCRIPTION_CONTRACT_ADDR",
    "JETTON_MASTER_ADDR",
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`,
    );
  }

  return {
    relayerPrivateKey: process.env.RELAYER_PRIV_KEY!,
    relayerWalletAddress: process.env.RELAYER_WALLET_ADDR!,
    subscriptionContractAddress: process.env.SUBSCRIPTION_CONTRACT_ADDR!,
    jettonMasterAddress: process.env.JETTON_MASTER_ADDR!,

    pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 5000),
    maxRetries: Number(process.env.MAX_RETRIES || 3),
    gasForCallback: process.env.GAS_FOR_CALLBACK || "10000000", // 0.01 TON

    processDbPath: process.env.PROCESS_DB || "./relayer_state.json",

    enableMetrics: process.env.ENABLE_METRICS === "true",
    logLevel: process.env.LOG_LEVEL || "info",
  };
};
