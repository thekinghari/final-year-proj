import React, { useState, useEffect } from 'react';
import { FiEye, FiClock, FiCheckCircle, FiXCircle, FiMapPin, FiTrendingUp } from 'react-icons/fi';
import { projectAPI } from '../../services/api';
import PlantAnalysisPanel from './PlantAnalysisPanel';
import './Project.css';

const STATUS_MAP = {
  DRAFT: { label: 'Draft', color: '#78909c', icon: '📝' },
  SUBMITTED: { label: 'Submitted', color: '#42a5f5', icon: '📤' },
  UNDER_REVIEW: { label: 'Under Review', color: '#ffa726', icon: '🔍' },
  APPROVED: { label: 'Approved', color: '#66bb6a', icon: '✅' },
  REJECTED: { label: 'Rejected', color: '#ef5350', icon: '❌' },
  MINTED: { label: 'Credits Minted', color: '#ab47bc', icon: '🪙' },
};

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await projectAPI.getAll();
      setProjects(res.data.data.projects);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <span className="spinner large"></span>
        <p>Loading your projects...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🌊</div>
        <h3>No Projects Yet</h3>
        <p>Submit your first restoration project to start earning carbon credits!</p>
      </div>
    );
  }

  return (
    <div className="project-list">
      <h3 className="list-title">📂 Your Projects ({projects.length})</h3>

      <div className="projects-grid">
        {projects.map((project) => {
          const status = STATUS_MAP[project.status] || STATUS_MAP.DRAFT;
          return (
            <div
              key={project._id}
              className="project-card fade-in"
              onClick={() => setSelectedProject(selectedProject?._id === project._id ? null : project)}
            >
              <div className="card-header">
                <span className="project-id">{project.projectId}</span>
                <span className="status-badge" style={{ background: `${status.color}20`, color: status.color, borderColor: status.color }}>
                  {status.icon} {status.label}
                </span>
              </div>

              <h4 className="project-name">{project.projectName}</h4>

              <div className="card-stats">
                <div className="stat">
                  <FiMapPin />
                  <span>{project.location?.latitude?.toFixed(4)}°, {project.location?.longitude?.toFixed(4)}°</span>
                </div>
                <div className="stat">
                  <FiTrendingUp />
                  <span>{project.carbon?.estimatedCO2e || 0} tons CO₂e</span>
                </div>
                <div className="stat">
                  <FiClock />
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="card-footer">
                <span className="area-badge">
                  📐 {project.restoration?.areaHectares || 0} ha
                </span>
                <span className="eco-badge">
                  {project.restoration?.ecosystemType || 'mangrove'}
                </span>
                <span className="photo-badge">
                  📸 {project.photos?.length || 0} photos
                </span>
              </div>

              {/* Expanded view */}
              {selectedProject?._id === project._id && (
                <div className="card-expanded fade-in">
                  <div className="expanded-section">
                    <h5>📝 Description</h5>
                    <p>{project.description || 'No description provided'}</p>
                  </div>

                  {/* Blockchain / Credits info for MINTED projects */}
                  {project.status === 'MINTED' && project.blockchain && (
                    <div className="expanded-section blockchain-section">
                      <h5>🪙 Carbon Credits</h5>
                      <div className="blockchain-info">
                        <div className="bc-row">
                          <span>Credits Minted</span>
                          <strong style={{ color: '#00E0B8' }}>
                            {project.blockchain.creditsMinted} BCC tokens
                          </strong>
                        </div>
                        <div className="bc-row">
                          <span>Tx Hash</span>
                          <span className="bc-hash" title={project.blockchain.txHash}>
                            {project.blockchain.txHash?.slice(0, 18)}...
                          </span>
                        </div>
                        <div className="bc-row">
                          <span>Minted At</span>
                          <span>{new Date(project.blockchain.mintedAt).toLocaleDateString()}</span>
                        </div>
                        {project.blockchain.txHash && !project.blockchain.contractAddress?.includes('SIMULATION') && (
                          <a
                            href={`https://amoy.polygonscan.com/tx/${project.blockchain.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="explorer-link-small"
                          >
                            View on PolygonScan ↗
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {project.photos?.length > 0 && (
                    <div className="expanded-section">
                      <h5>📸 Photos & AI Plant Analysis</h5>
                      <div className="photo-analysis-grid">
                        {project.photos.map((photo, i) => (
                          <PlantAnalysisPanel
                            key={i}
                            photo={photo}
                            projectName={project.projectName}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {project.restoration?.species?.length > 0 && (
                    <div className="expanded-section">
                      <h5>🌱 Species</h5>
                      <div className="species-tags">
                        {project.restoration.species.map((sp, i) => (
                          <span key={i} className="species-tag">
                            {sp.name} {sp.count ? `(${sp.count})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="expanded-section">
                    <h5>📊 Status History</h5>
                    <div className="status-history">
                      {project.statusHistory?.map((sh, i) => (
                        <div key={i} className="history-item">
                          <span className="history-status">{STATUS_MAP[sh.status]?.icon} {sh.status}</span>
                          <span className="history-date">{new Date(sh.changedAt).toLocaleString()}</span>
                          {sh.remarks && <span className="history-remark">{sh.remarks}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectList;
