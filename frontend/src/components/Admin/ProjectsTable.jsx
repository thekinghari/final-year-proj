import React from 'react';
import { FiEye } from 'react-icons/fi';
import './ProjectsTableImproved.css';

const ProjectsTable = ({ projects, loading, onProjectSelect, data }) => {
  if (loading) {
    return (
      <div className="projects-table glass-card">
        <h3 className="table-title">All Projects</h3>
        <div className="table-loading">
          <div className="spinner"></div>
          <p>Loading projects...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="projects-table glass-card">
        <h3 className="table-title">All Projects</h3>
        <div className="table-empty">
          <p>No Projects Available</p>
          <span>Data will appear after IPFS sync.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="projects-table glass-card fade-in">
      <h3 className="table-title">All Projects ({projects.length})</h3>
      
      {/* Status Legend */}
      <div className="status-legend">
        <div className="legend-item">
          <div className="legend-dot submitted"></div>
          <span>Submitted</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot pending"></div>
          <span>Pending Review</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot approved"></div>
          <span>Approved</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot rejected"></div>
          <span>Rejected</span>
        </div>
      </div>
      
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Project ID</th>
              <th>State</th>
              <th>Area (ha)</th>
              <th>CO₂ (tons)</th>
              <th>Name</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project, index) => (
              <tr key={project._id} style={{ animationDelay: `${index * 0.05}s` }}>
                <td className="project-id">{project.projectId || 'N/A'}</td>
                <td>{project.location?.state || 'N/A'}</td>
                <td>{project.restoration?.areaHectares?.toFixed(2) || '0.00'}</td>
                <td>{project.carbon?.estimatedCO2e?.toFixed(1) || '0.0'}</td>
                <td>{project.submittedBy?.name || 'N/A'}</td>
                <td>{new Date(project.createdAt).toLocaleDateString()}</td>
                <td>
                  <span className={`status-pill ${project.status.toLowerCase()}`}>
                    {project.status === 'MINTED' ? '🪙 MINTED' : project.status}
                  </span>
                </td>
                <td>
                  <button
                    className="view-btn"
                    onClick={() => onProjectSelect(project)}
                    title="View Details"
                  >
                    <FiEye /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectsTable;
