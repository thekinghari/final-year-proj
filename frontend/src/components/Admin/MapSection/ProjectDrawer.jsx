import React from 'react';
import { FiX, FiMapPin, FiUsers, FiActivity, FiCalendar, FiZap, FiCheckCircle } from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import MintCreditsModal from '../MintCreditsModal';
import './ProjectDrawerImproved.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CAPABILITY_COLOR = {
  'low':       '#ffa726',
  'medium':    '#42a5f5',
  'high':      '#66bb6a',
  'very high': '#00bfa5',
  'very-high': '#00bfa5',
};

// Aggregate AI analysis across all photos of a project
const getAISummary = (photos) => {
  if (!photos?.length) return null;
  const analysed = photos.filter(p => p.aiAnalysis?.carbonCapability);
  if (!analysed.length) return null;

  const avgPct = Math.round(
    analysed.reduce((s, p) => s + (p.aiAnalysis.sequestrationPercentage || 0), 0) / analysed.length
  );
  const avgConf = Math.round(
    analysed.reduce((s, p) => s + (p.aiAnalysis.confidence || 0), 0) / analysed.length
  );

  // Pick the most common capability
  const caps = analysed.map(p => p.aiAnalysis.carbonCapability);
  const capability = caps.sort((a, b) =>
    caps.filter(v => v === b).length - caps.filter(v => v === a).length
  )[0];

  // Collect unique plant names
  const plants = [...new Set(analysed.map(p => p.aiAnalysis.plantName).filter(Boolean))];

  // Collect all reasons (deduplicated)
  const reasons = [...new Set(
    analysed.flatMap(p => p.aiAnalysis.reasons || [])
  )].slice(0, 3);

  const isMock = analysed.every(p => p.aiAnalysis.mock);

  return { capability, avgPct, avgConf, plants, reasons, isMock, photoCount: analysed.length };
};

const ProjectDrawer = ({ project, onClose, onActionComplete }) => {
  const [updating, setUpdating] = React.useState(false);
  const [showMintModal, setShowMintModal] = React.useState(false);

  const handleApprove = async () => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('bcr_token');
      await axios.post(
        `${API_BASE}/admin/projects/${project._id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`✓ Project ${project.projectId} approved successfully!`);
      
      // Trigger dashboard refresh
      if (onActionComplete) {
        onActionComplete();
      }
      
      setTimeout(onClose, 1000);
    } catch (error) {
      console.error('Approve error:', error);
      toast.error(error.response?.data?.message || 'Failed to approve project');
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('bcr_token');
      await axios.post(
        `${API_BASE}/admin/projects/${project._id}/reject`,
        { reason: 'Rejected by admin' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`✗ Project ${project.projectId} rejected`);
      
      // Trigger dashboard refresh
      if (onActionComplete) {
        onActionComplete();
      }
      
      setTimeout(onClose, 1000);
    } catch (error) {
      console.error('Reject error:', error);
      toast.error(error.response?.data?.message || 'Failed to reject project');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="project-drawer">
        <div className="drawer-header">
          <h3>Project Details</h3>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="drawer-content">
          <div className="drawer-section">
            <div className="section-label">Project ID</div>
            <div className="section-value" style={{ color: '#00E0B8', fontFamily: 'monospace' }}>
              {project.projectId || 'N/A'}
            </div>
          </div>

          <div className="drawer-section">
            <div className="section-label">
              <FiMapPin /> Location
            </div>
            <div className="section-value">
              {project.location?.village && `${project.location.village}, `}
              {project.location?.district && `${project.location.district}, `}
              {project.location?.state || 'N/A'}
            </div>
          </div>

          <div className="drawer-section">
            <div className="section-label">
              <FiActivity /> Restoration Area
            </div>
            <div className="section-value">
              {project.restoration?.areaHectares?.toFixed(2) || 0} hectares
            </div>
          </div>

          <div className="drawer-section">
            <div className="section-label">
              <FiActivity /> CO₂ Impact
            </div>
            <div className="section-value">
              {project.carbon?.estimatedCO2e?.toFixed(1) || 0} tons CO₂e sequestered
            </div>
          </div>

          <div className="drawer-section">
            <div className="section-label">
              <FiUsers /> Submitted By
            </div>
            <div className="section-value">
              {project.submittedBy?.name || 'N/A'}
              <br />
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                {project.submittedBy?.email || ''}
              </span>
            </div>
          </div>

          <div className="drawer-section">
            <div className="section-label">Status</div>
            <div className="section-value">
              <span className={`status-pill ${project.status.toLowerCase()}`}>
                {project.status}
              </span>
            </div>
          </div>

          <div className="drawer-section">
            <div className="section-label">
              <FiCalendar /> Submitted Date
            </div>
            <div className="section-value">
              {new Date(project.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>

          {/* AI Analysis Summary */}
          {(() => {
            const ai = getAISummary(project.photos);
            if (!ai) return (
              <div className="drawer-section">
                <div className="section-label">🤖 AI Plant Analysis</div>
                <div className="section-value" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>
                  No AI analysis available — photos were uploaded before AI feature was enabled.
                </div>
              </div>
            );

            const capKey = ai.capability?.toLowerCase().replace(' ', '-');
            const color = CAPABILITY_COLOR[capKey] || '#66bb6a';

            return (
              <div className="drawer-section ai-summary-section">
                <div className="section-label">🤖 AI Plant Analysis</div>
                {ai.isMock && (
                  <div className="ai-mock-notice">⚡ Estimated — add GEMINI_API_KEY for live AI</div>
                )}
                <div className="ai-summary-header">
                  <div>
                    <div className="ai-plant-name">{ai.plants.join(', ') || 'Vegetation'}</div>
                    <div className="ai-photo-count">{ai.photoCount} photo{ai.photoCount > 1 ? 's' : ''} analysed · {ai.avgConf}% confidence</div>
                  </div>
                  <div className="ai-pct-badge" style={{ color, borderColor: color, background: `${color}18` }}>
                    {ai.avgPct}%
                  </div>
                </div>

                <div className="ai-capability-row">
                  <span className="ai-cap-pill" style={{ color, borderColor: color, background: `${color}18` }}>
                    {ai.capability} Carbon Reduction
                  </span>
                </div>

                <div className="ai-pct-bar-wrap">
                  <div className="ai-pct-bar" style={{ width: `${Math.min(ai.avgPct, 100)}%`, background: color }} />
                </div>
                <div className="ai-pct-label">Sequestration vs. average vegetation</div>

                {ai.reasons.length > 0 && (
                  <div className="ai-reasons">
                    {ai.reasons.map((r, i) => (
                      <div key={i} className="ai-reason-item">
                        <FiCheckCircle size={11} style={{ color, flexShrink: 0 }} />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        <div className="drawer-actions">
          <button
            className="action-btn approve"
            onClick={handleApprove}
            disabled={updating || project.status === 'APPROVED' || project.status === 'MINTED'}
          >
            ✓ Approve
          </button>
          <button
            className="action-btn reject"
            onClick={handleReject}
            disabled={updating || project.status === 'REJECTED' || project.status === 'MINTED'}
          >
            ✗ Reject
          </button>
          {project.status === 'APPROVED' && (
            <button
              className="action-btn mint"
              onClick={() => setShowMintModal(true)}
              disabled={updating}
            >
              <FiZap /> Mint Credits
            </button>
          )}
          {project.status === 'MINTED' && (
            <div className="minted-badge">
              🪙 {project.blockchain?.creditsMinted || 0} BCC Minted
            </div>
          )}
        </div>
      </div>

      {showMintModal && (
        <MintCreditsModal
          project={project}
          onClose={() => setShowMintModal(false)}
          onMintComplete={() => {
            setShowMintModal(false);
            if (onActionComplete) onActionComplete();
            setTimeout(onClose, 800);
          }}
        />
      )}
    </>
  );
};

export default ProjectDrawer;
