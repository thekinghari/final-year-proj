import React, { useState, useEffect } from 'react';
import { FiX, FiZap, FiCheckCircle, FiAlertCircle, FiExternalLink } from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  isMetaMaskInstalled,
  connectWallet,
  getConnectedWallet,
  mintCarbonCredits,
} from '../../services/blockchainService';
import './MintCreditsModal.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const MintCreditsModal = ({ project, onClose, onMintComplete }) => {
  const [step, setStep] = useState('confirm'); // confirm | connecting | minting | success | error
  const [walletAddress, setWalletAddress] = useState('');
  const [recipientWallet, setRecipientWallet] = useState(project?.submittedBy?.walletAddress || '');
  const [txResult, setTxResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const tokenAmount = Math.round((project?.carbon?.estimatedCO2e || 0) / 0.1);
  const hasMetaMask = isMetaMaskInstalled();

  useEffect(() => {
    getConnectedWallet().then((addr) => {
      if (addr) setWalletAddress(addr);
    });
  }, []);

  const handleConnect = async () => {
    try {
      setStep('connecting');
      const addr = await connectWallet();
      setWalletAddress(addr);
      setStep('confirm');
      toast.success('Wallet connected');
    } catch (err) {
      setErrorMsg(err.message);
      setStep('error');
    }
  };

  const handleMint = async () => {
    if (!recipientWallet || !recipientWallet.startsWith('0x')) {
      toast.error('Enter a valid recipient wallet address (0x...)');
      return;
    }
    if (tokenAmount <= 0) {
      toast.error('No carbon credits to mint for this project');
      return;
    }

    try {
      setStep('minting');

      // Trigger MetaMask transaction
      const result = await mintCarbonCredits(recipientWallet, tokenAmount, project.projectId);

      // Record mint in backend
      const token = localStorage.getItem('bcr_token');
      await axios.post(
        `${API_BASE}/admin/projects/${project._id}/mint`,
        {
          txHash: result.txHash,
          tokenAmount: result.tokenAmount,
          blockNumber: result.blockNumber,
          contractAddress: result.contractAddress,
          recipientWallet,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTxResult(result);
      setStep('success');

      if (onMintComplete) onMintComplete();
    } catch (err) {
      console.error('Mint error:', err);
      setErrorMsg(err.message || 'Minting failed');
      setStep('error');
    }
  };

  const explorerUrl = txResult?.txHash && !txResult.simulated
    ? `https://amoy.polygonscan.com/tx/${txResult.txHash}`
    : null;

  return (
    <div className="mint-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mint-modal">
        <button className="mint-modal-close" onClick={onClose}>
          <FiX />
        </button>

        <div className="mint-modal-header">
          <div className="mint-icon">🪙</div>
          <h2>Mint Carbon Credits</h2>
          <p className="mint-project-id">{project.projectId}</p>
        </div>

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div className="mint-step">
            <div className="mint-summary">
              <div className="mint-summary-row">
                <span>Project</span>
                <strong>{project.projectName}</strong>
              </div>
              <div className="mint-summary-row">
                <span>Area</span>
                <strong>{project.restoration?.areaHectares} ha</strong>
              </div>
              <div className="mint-summary-row">
                <span>CO₂e Sequestered</span>
                <strong>{project.carbon?.estimatedCO2e} tons</strong>
              </div>
              <div className="mint-summary-row highlight">
                <span>Credits to Mint</span>
                <strong>{tokenAmount} BCC tokens</strong>
              </div>
              <div className="mint-summary-row">
                <span>Formula</span>
                <strong>{project.carbon?.estimatedCO2e} tons × 10 = {tokenAmount} BCC</strong>
              </div>
              <div className="mint-summary-row">
                <span>Earnings Value</span>
                <strong>₹{(tokenAmount * 200).toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="mint-wallet-section">
              <label>Admin Wallet (MetaMask)</label>
              {walletAddress ? (
                <div className="wallet-connected">
                  <FiCheckCircle className="check-icon" />
                  <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                </div>
              ) : (
                <button
                  className="btn-connect-wallet"
                  onClick={handleConnect}
                  disabled={!hasMetaMask}
                >
                  {hasMetaMask ? '🦊 Connect MetaMask' : '⚠️ MetaMask Not Installed'}
                </button>
              )}
              {!hasMetaMask && (
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noreferrer"
                  className="metamask-link"
                >
                  Install MetaMask <FiExternalLink />
                </a>
              )}
            </div>

            <div className="mint-wallet-section">
              <label>Recipient Wallet Address</label>
              <input
                type="text"
                placeholder="0x... (user's wallet address)"
                value={recipientWallet}
                onChange={(e) => setRecipientWallet(e.target.value)}
                className="wallet-input"
              />
              <small>The user's Ethereum/Polygon wallet to receive BCC tokens</small>
            </div>

            {!hasMetaMask && (
              <div className="demo-notice">
                ⚡ No MetaMask detected — will run in simulation mode (demo)
              </div>
            )}

            <div className="mint-actions">
              <button className="btn-cancel" onClick={onClose}>Cancel</button>
              <button
                className="btn-mint"
                onClick={handleMint}
                disabled={!recipientWallet}
              >
                <FiZap /> Mint {tokenAmount} Credits
              </button>
            </div>
          </div>
        )}

        {/* Step: Connecting */}
        {step === 'connecting' && (
          <div className="mint-step centered">
            <div className="spinner large"></div>
            <p>Connecting to MetaMask...</p>
          </div>
        )}

        {/* Step: Minting */}
        {step === 'minting' && (
          <div className="mint-step centered">
            <div className="spinner large"></div>
            <p>Confirm the transaction in MetaMask...</p>
            <small>Minting {tokenAmount} BCC tokens on Polygon Amoy</small>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && txResult && (
          <div className="mint-step centered">
            <div className="success-icon">✅</div>
            <h3>Credits Minted Successfully!</h3>
            <div className="tx-details">
              <div className="tx-row">
                <span>Tokens Minted</span>
                <strong>{txResult.tokenAmount} BCC</strong>
              </div>
              <div className="tx-row">
                <span>Tx Hash</span>
                <span className="tx-hash">{txResult.txHash.slice(0, 20)}...</span>
              </div>
              {txResult.simulated && (
                <div className="tx-row">
                  <span>Mode</span>
                  <span className="sim-badge">Simulation</span>
                </div>
              )}
            </div>
            {explorerUrl && (
              <a href={explorerUrl} target="_blank" rel="noreferrer" className="explorer-link">
                View on PolygonScan <FiExternalLink />
              </a>
            )}
            <button className="btn-mint" onClick={onClose}>Done</button>
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div className="mint-step centered">
            <FiAlertCircle className="error-icon" />
            <h3>Minting Failed</h3>
            <p className="error-msg">{errorMsg}</p>
            <div className="mint-actions">
              <button className="btn-cancel" onClick={onClose}>Close</button>
              <button className="btn-mint" onClick={() => setStep('confirm')}>Try Again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MintCreditsModal;
