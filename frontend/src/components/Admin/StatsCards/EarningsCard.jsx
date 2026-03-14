import React from 'react';
import { FiDollarSign } from 'react-icons/fi';

const TOKEN_PRICE_INR = 200;

const EarningsCard = ({ totalEarnings = 0, totalCredits = 0, confirmedCredits = 0, estimatedCredits = 0, statesCount = 0, loading }) => {
  // Always recompute from credits so it's never stale
  const earnings = totalCredits * TOKEN_PRICE_INR;
  const confirmedEarnings = confirmedCredits * TOKEN_PRICE_INR;
  const estimatedEarnings = estimatedCredits * TOKEN_PRICE_INR;

  const formatINR = (amount) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000)   return `₹${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000)     return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className={`stat-card ${loading ? 'loading' : ''}`}>
      <div className="stat-card-header">
        <span className="stat-card-title">Total Earnings</span>
        <div className="stat-card-icon" style={{ background: 'rgba(255, 193, 7, 0.1)', color: '#FFC107' }}>
          <FiDollarSign />
        </div>
      </div>

      <div className="stat-card-value" style={{ color: '#FFC107' }}>
        {formatINR(earnings)}
      </div>

      <div className="stat-card-subtitle">
        {totalCredits > 0
          ? `${totalCredits} credits × ₹${TOKEN_PRICE_INR.toLocaleString()}`
          : `Across ${statesCount || 0} ${statesCount === 1 ? 'State' : 'States'}`}
      </div>

      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {confirmedEarnings > 0 && (
          <span style={{ fontSize: '11px', color: '#FFC107' }}>
            ✓ {formatINR(confirmedEarnings)} confirmed
          </span>
        )}
        {estimatedEarnings > 0 && (
          <span style={{ fontSize: '11px', color: 'rgba(255,193,7,0.5)' }}>
            ⏳ {formatINR(estimatedEarnings)} pending
          </span>
        )}
        {earnings === 0 && !loading && (
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            Earnings appear after approval
          </span>
        )}
      </div>
    </div>
  );
};

export default EarningsCard;
