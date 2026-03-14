import React from 'react';
import { FiZap } from 'react-icons/fi';

const CarbonCard = ({ totalCarbon = 0, totalCredits = 0, confirmedCredits = 0, estimatedCredits = 0, mintedProjectsCount = 0, loading }) => {
  return (
    <div className={`stat-card ${loading ? 'loading' : ''}`}>
      <div className="stat-card-header">
        <span className="stat-card-title">Carbon Credits</span>
        <div className="stat-card-icon" style={{ background: 'rgba(0, 224, 184, 0.1)', color: '#00E0B8' }}>
          <FiZap />
        </div>
      </div>

      <div className="stat-card-value" style={{ color: '#00E0B8' }}>
        {totalCredits.toLocaleString()}
      </div>

      <div className="stat-card-subtitle">BCC tokens total</div>

      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {confirmedCredits > 0 && (
          <span style={{ fontSize: '11px', color: '#00E0B8' }}>
            ✓ {confirmedCredits} confirmed ({mintedProjectsCount} minted)
          </span>
        )}
        {estimatedCredits > 0 && (
          <span style={{ fontSize: '11px', color: 'rgba(255,193,7,0.8)' }}>
            ⏳ {estimatedCredits} pending mint
          </span>
        )}
        {totalCredits === 0 && !loading && (
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            Credits appear after approval
          </span>
        )}
      </div>
    </div>
  );
};

export default CarbonCard;
