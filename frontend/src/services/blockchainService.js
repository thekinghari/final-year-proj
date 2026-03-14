/**
 * blockchainService.js
 * Handles MetaMask wallet connection and carbon credit minting
 * Uses ethers.js v6 via CDN-compatible import or window.ethereum directly
 *
 * Contract: CarbonCreditToken on Polygon Amoy testnet (chainId: 80002)
 * Set VITE_CONTRACT_ADDRESS in frontend/.env after deploying the contract
 */

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';
const CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '0x13882'; // Polygon Amoy = 80002 = 0x13882

// Minimal ABI — only what we need
const CONTRACT_ABI = [
  'function mintCredits(address recipient, uint256 amount, string calldata projectId) external',
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function mintRecords(string) view returns (string projectId, address recipient, uint256 amount, uint256 timestamp, bool exists)',
  'event CreditsMinted(string indexed projectId, address indexed recipient, uint256 amount, uint256 timestamp)',
];

/**
 * Check if MetaMask is installed
 */
export const isMetaMaskInstalled = () => {
  return typeof window !== 'undefined' && Boolean(window.ethereum?.isMetaMask);
};

/**
 * Connect MetaMask wallet — returns connected address
 */
export const connectWallet = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed. Please install it from metamask.io');
  }

  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found. Please unlock MetaMask.');
  }

  // Switch to correct network
  await switchToCorrectNetwork();

  return accounts[0];
};

/**
 * Get currently connected wallet address (no prompt)
 */
export const getConnectedWallet = async () => {
  if (!isMetaMaskInstalled()) return null;
  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts?.[0] || null;
  } catch {
    return null;
  }
};

/**
 * Switch MetaMask to Polygon Amoy testnet
 */
export const switchToCorrectNetwork = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_ID }],
    });
  } catch (switchError) {
    // Chain not added yet — add it
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: CHAIN_ID,
            chainName: 'Polygon Amoy Testnet',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            rpcUrls: ['https://rpc-amoy.polygon.technology/'],
            blockExplorerUrls: ['https://amoy.polygonscan.com/'],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
};

/**
 * Get current chain ID
 */
export const getCurrentChainId = async () => {
  if (!isMetaMaskInstalled()) return null;
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  return chainId;
};

/**
 * Mint carbon credits on-chain via MetaMask
 * Admin wallet must be the contract owner
 *
 * @param {string} recipientAddress - User's wallet address
 * @param {number} tonsCO2e - Amount of CO2e tons (= number of tokens to mint)
 * @param {string} projectId - Project identifier (e.g. BCR-00001-XYZ)
 * @returns {{ txHash, tokenAmount, blockNumber }}
 */
export const mintCarbonCredits = async (recipientAddress, tonsCO2e, projectId) => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask not installed');
  }

  if (!CONTRACT_ADDRESS) {
    // Dev/demo mode: simulate a transaction
    console.warn('⚠️ No contract address set. Running in simulation mode.');
    return simulateMint(recipientAddress, tonsCO2e, projectId);
  }

  await switchToCorrectNetwork();

  // Use window.ethereum directly (no ethers dependency needed)
  const accounts = await window.ethereum.request({ method: 'eth_accounts' });
  if (!accounts?.length) throw new Error('Wallet not connected');

  const adminAddress = accounts[0];

  // Encode the mintCredits(address, uint256, string) call
  const tokenAmount = Math.round(tonsCO2e / 0.1); // 0.1 tons = 1 token
  const amountHex = '0x' + (BigInt(tokenAmount) * BigInt('1000000000000000000')).toString(16); // 18 decimals

  // ABI encode: mintCredits(address recipient, uint256 amount, string projectId)
  const data = encodeMintCredits(recipientAddress, amountHex, projectId);

  const txParams = {
    from: adminAddress,
    to: CONTRACT_ADDRESS,
    data,
    gas: '0x' + (200000).toString(16),
  };

  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [txParams],
  });

  // Wait for receipt
  const receipt = await waitForTransaction(txHash);

  return {
    txHash,
    tokenAmount,
    blockNumber: receipt?.blockNumber,
    contractAddress: CONTRACT_ADDRESS,
  };
};

/**
 * Simulate a mint transaction for dev/demo mode (no real contract)
 */
const simulateMint = async (recipientAddress, tonsCO2e, projectId) => {
  // Simulate MetaMask confirmation delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const fakeTxHash = '0x' + Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');

  return {
    txHash: fakeTxHash,
    tokenAmount: Math.round(tonsCO2e / 0.1),
    blockNumber: Math.floor(Math.random() * 1000000) + 40000000,
    contractAddress: 'SIMULATION_MODE',
    simulated: true,
  };
};

/**
 * Poll for transaction receipt
 */
const waitForTransaction = async (txHash, maxAttempts = 30) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await window.ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      });
      if (receipt) return receipt;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
};

/**
 * Get token balance for an address (raw call)
 */
export const getTokenBalance = async (address) => {
  if (!CONTRACT_ADDRESS || !isMetaMaskInstalled()) return 0;
  try {
    // balanceOf(address) selector = 0x70a08231
    const paddedAddr = address.replace('0x', '').padStart(64, '0');
    const result = await window.ethereum.request({
      method: 'eth_call',
      params: [{ to: CONTRACT_ADDRESS, data: '0x70a08231' + paddedAddr }, 'latest'],
    });
    const raw = BigInt(result || '0x0');
    return Number(raw / BigInt('1000000000000000000')); // convert from 18 decimals
  } catch {
    return 0;
  }
};

/**
 * Minimal ABI encoder for mintCredits(address, uint256, string)
 * Avoids needing ethers.js as a dependency
 */
function encodeMintCredits(recipient, amountHex, projectId) {
  // Function selector: keccak256("mintCredits(address,uint256,string)") first 4 bytes
  // Pre-computed: 0x8a4068dd
  const selector = '8a4068dd';

  const addr = recipient.replace('0x', '').padStart(64, '0');
  const amt = amountHex.replace('0x', '').padStart(64, '0');

  // String offset (points to position 0x60 = 96 bytes from start of params)
  const strOffset = '0000000000000000000000000000000000000000000000000000000000000060';

  // String length
  const strBytes = new TextEncoder().encode(projectId);
  const strLen = strBytes.length.toString(16).padStart(64, '0');

  // String data padded to 32-byte boundary
  let strData = '';
  for (const b of strBytes) strData += b.toString(16).padStart(2, '0');
  const padded = Math.ceil(strBytes.length / 32) * 32;
  strData = strData.padEnd(padded * 2, '0');

  return '0x' + selector + addr + amt + strOffset + strLen + strData;
}
