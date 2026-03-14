import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FiPlus, FiTrendingUp, FiMapPin, FiCheckCircle, FiClock, FiList, FiZap, FiDollarSign } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { projectAPI, offlineQueue } from '../../services/api';
import ProjectList from '../Project/ProjectList';
import './Dashboard.css';

const TOKEN_PRICE_INR = 200;

const Dashboard = () => {
  const { user } = useAuth();

  if (user?.role === 'admin') return <Navigate to="/admin" replace />;

  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    approved: 0,
    totalCO2: 0,
    totalArea: 0,
    confirmedCredits: 0,
    estimatedCredits: 0,
    totalCredits: 0,
    mintedProjects: 0,
    approvedProjects: 0,
  });
  const [loading, setLoading] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    fetchStats();
    setOfflineCount(offlineQueue.count());
  }, []);

  const fetchStats = async () => {
    try {
      const [projectsRes, creditsRes] = await Promise.allSettled([
        projectAPI.getAll({ limit: 100 }),
        projectAPI.getMyCredits(),
      ]);

      const projects = projectsRes.status === 'fulfilled'
        ? projectsRes.value.data.data.projects : [];

      const creditsData = creditsRes.status === 'fulfilled'
        ? creditsRes.value.data.data
        : { confirmedCredits: 0, estimatedCredits: 0, totalCredits: 0, mintedProjectsCount: 0, approvedProjectsCount: 0 };

      setStats({
        total: projects.length,
        submitted: projects.filter(p => p.status === 'SUBMITTED').length,
        approved: projects.filter(p => ['APPROVED', 'MINTED'].includes(p.status)).length,
        totalCO2: projects.reduce((sum, p) => sum + (p.carbon?.estimatedCO2e || 0), 0).toFixed(1),
        totalArea: projects.reduce((sum, p) => sum + (p.restoration?.areaHectares || 0), 0).toFixed(2),
        confirmedCredits: creditsData.confirmedCredits || 0,
        estimatedCredits: creditsData.estimatedCredits || 0,
        totalCredits: creditsData.totalCredits || 0,
        mintedProjects: creditsData.mintedProjectsCount || 0,
        approvedProjects: creditsData.approvedProjectsCount || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalEarnings = stats.totalCredits * TOKEN_PRICE_INR;

  const formatINR = (amount) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000)   return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="dashboard page-wrapper">
      {/* Welcome Header */}
      <div className="welcome-section slide-up">
        <div className="welcome-text">
          <h1>Welcome, {user?.name}! 👋</h1>
          <p>
            {user?.role === 'community'
              ? 'Submit and track your coastal restoration projects'
              : `Manage projects as ${user?.role}`}
          </p>
        </div>
        <Link to="/submit" className="quick-submit-btn">
          <FiPlus /> New Project
        </Link>
      </div>

      {/* Stats Grid — 4 project cards */}
      <div className="stats-grid fade-in">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(66,165,245,0.1)', color: '#42a5f5' }}>
            <FiList />
          </div>
          <div className="stat-content">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total Projects</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255,167,38,0.1)', color: '#ffa726' }}>
            <FiClock />
          </div>
          <div className="stat-content">
            <span className="stat-number">{stats.submitted}</span>
            <span className="stat-label">Under Review</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(102,187,106,0.1)', color: '#66bb6a' }}>
            <FiCheckCircle />
          </div>
          <div className="stat-content">
            <span className="stat-number">{stats.approved}</span>
            <span className="stat-label">Approved</span>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-icon" style={{ background: 'rgba(0,191,165,0.1)', color: '#00bfa5' }}>
            <FiTrendingUp />
          </div>
          <div className="stat-content">
            <span className="stat-number">{stats.totalCO2}</span>
            <span className="stat-label">CO₂e (tons)</span>
          </div>
        </div>
      </div>

      {/* Carbon Credits Cards — always visible */}
      <div className="credits-cards-grid fade-in">
        {/* Credits earned card */}
        <div className="credit-stat-card">
          <div className="credit-stat-header">
            <div className="credit-stat-icon">🪙</div>
            <span className="credit-stat-title">Carbon Credits</span>
          </div>
          <div className="credit-stat-value">{stats.totalCredits.toLocaleString()}</div>
          <div className="credit-stat-label">BCC Tokens Earned</div>
          <div className="credit-stat-breakdown">
            {stats.confirmedCredits > 0 && (
              <span className="credit-confirmed">
                <FiZap size={10} /> {stats.confirmedCredits} on blockchain
              </span>
            )}
            {stats.estimatedCredits > 0 && (
              <span className="credit-pending">
                ⏳ {stats.estimatedCredits} pending mint
              </span>
            )}
            {stats.totalCredits === 0 && (
              <span className="credit-empty">Credits appear after approval</span>
            )}
          </div>
        </div>

        {/* Earnings card */}
        <div className="credit-stat-card earnings">
          <div className="credit-stat-header">
            <div className="credit-stat-icon">💰</div>
            <span className="credit-stat-title">Estimated Earnings</span>
          </div>
          <div className="credit-stat-value earnings-value">
            {totalEarnings > 0 ? formatINR(totalEarnings) : '₹0'}
          </div>
          <div className="credit-stat-label">
            {stats.totalCredits > 0
              ? `${stats.totalCredits} credits × ₹${TOKEN_PRICE_INR}`
              : 'Based on ₹200 per BCC token'}
          </div>
          <div className="credit-stat-breakdown">
            {stats.confirmedCredits > 0 && (
              <span className="credit-confirmed">
                ✓ {formatINR(stats.confirmedCredits * TOKEN_PRICE_INR)} confirmed
              </span>
            )}
            {stats.estimatedCredits > 0 && (
              <span className="credit-pending">
                ⏳ {formatINR(stats.estimatedCredits * TOKEN_PRICE_INR)} pending
              </span>
            )}
            {totalEarnings === 0 && (
              <span className="credit-empty">Earnings appear after approval</span>
            )}
          </div>
        </div>
      </div>

      {/* Area stat */}
      <div className="area-banner fade-in">
        <FiMapPin />
        <span>Total Restoration Area: <strong>{stats.totalArea} hectares</strong></span>
        {offlineCount > 0 && (
          <span className="offline-badge">📴 {offlineCount} queued offline</span>
        )}
      </div>

      {/* Projects List */}
      <div className="dashboard-projects">
        <ProjectList />
      </div>
    </div>
  );
};

export default Dashboard;
