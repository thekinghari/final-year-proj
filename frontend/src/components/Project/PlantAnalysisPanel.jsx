import { useState } from 'react';
import axios from 'axios';
import { FiZap, FiLoader, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import './PlantAnalysis.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CAPABILITY_COLOR = {
  'Low':       '#ffa726',
  'Medium':    '#42a5f5',
  'High':      '#66bb6a',
  'Very High': '#00bfa5',
};

/**
 * Converts an image URL (local /uploads/ or IPFS gateway) to base64
 * by drawing it on a canvas — avoids CORS issues with a proxy approach
 */
const urlToBase64 = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // result is "data:image/jpeg;base64,XXXX" — strip the prefix
      const base64 = reader.result.split(',')[1];
      resolve({ base64, mimeType: blob.type || 'image/jpeg' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const PlantAnalysisPanel = ({ photo, projectName }) => {
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const imageUrl = photo.ipfsUrl?.startsWith('http')
    ? photo.ipfsUrl
    : `http://localhost:5000${photo.ipfsUrl}`;

  const handleAnalyze = async () => {
    setState('loading');
    setError('');
    try {
      const { base64, mimeType } = await urlToBase64(imageUrl);
      const token = localStorage.getItem('bcr_token');
      const res = await axios.post(
        `${API_BASE}/analyze/plant`,
        { imageBase64: base64, mimeType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult({ ...res.data.data, isMock: res.data.mock, sequestrationPercentage: Math.min(res.data.data.sequestrationPercentage ?? 0, 100) });
      setState('done');
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
      setState('error');
    }
  };

  const capabilityColor = result ? (CAPABILITY_COLOR[result.carbonCapability] || '#66bb6a') : '#66bb6a';

  return (
    <div className="plant-analysis-panel">
      {/* Photo preview */}
      <div className="analysis-photo-wrap">
        <img
          src={imageUrl}
          alt={photo.originalName || 'Project photo'}
          className="analysis-photo"
          crossOrigin="anonymous"
        />
        {state === 'idle' && (
          <button className="analyze-btn" onClick={handleAnalyze}>
            <FiZap /> Analyse with AI
          </button>
        )}
        {state === 'loading' && (
          <div className="analyze-overlay">
            <FiLoader className="spin" />
            <span>Analysing plant...</span>
          </div>
        )}
      </div>

      {/* Error */}
      {state === 'error' && (
        <div className="analysis-error">
          <FiAlertCircle /> {error}
          <button onClick={handleAnalyze} className="retry-btn">Retry</button>
        </div>
      )}

      {/* Results */}
      {state === 'done' && result && (
        <div className="analysis-result fade-in">

          {result.isMock && (
            <div className="mock-notice">
              ⚠️ AI quota exceeded — showing estimated data. Results vary by species type.
            </div>
          )}

          <div className="result-header">
            <div>
              <div className="plant-name">{result.plantName}</div>
              <div className="plant-type">{result.plantType}</div>
            </div>
            <div className="confidence-badge">
              {result.confidence}% confident
            </div>
          </div>

          {/* Carbon capability + percentage */}
          <div className="carbon-capability-row">
            <div className="capability-pill" style={{ background: `${capabilityColor}20`, color: capabilityColor, borderColor: capabilityColor }}>
              {result.carbonCapability} Carbon Reduction
            </div>
            <div className="sequestration-pct" style={{ color: capabilityColor }}>
              {result.sequestrationPercentage}%
            </div>
          </div>

          {/* Progress bar with range markers */}
          <div className="pct-bar-wrap">
            <div
              className="pct-bar"
              style={{ width: `${result.sequestrationPercentage}%`, background: capabilityColor }}
            />
          </div>
          <div className="pct-bar-markers">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
            <span>Very High</span>
          </div>
          <div className="pct-label">Carbon sequestration effectiveness (0–100%)</div>

          {/* Reasons */}
          <div className="reasons-list">
            {result.reasons?.map((r, i) => (
              <div key={i} className="reason-item">
                <FiCheckCircle style={{ color: capabilityColor, flexShrink: 0 }} />
                <span>{r}</span>
              </div>
            ))}
          </div>

          {result.ecosystemBenefit && (
            <div className="ecosystem-benefit">
              🌊 {result.ecosystemBenefit}
            </div>
          )}

          <button className="re-analyze-btn" onClick={handleAnalyze}>
            <FiZap size={12} /> Re-analyse
          </button>
        </div>
      )}
    </div>
  );
};

export default PlantAnalysisPanel;
