import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  FiMapPin, FiCamera, FiUpload, FiTrash2, FiPlus,
  FiNavigation, FiCheck, FiAlertCircle, FiWifiOff, FiSend, FiZap
} from 'react-icons/fi';
import axios from 'axios';
import { projectAPI, offlineQueue } from '../../services/api';
import './Project.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Mangrove species common in India
const COMMON_SPECIES = [
  'Avicennia marina',
  'Rhizophora mucronata',
  'Sonneratia alba',
  'Bruguiera gymnorrhiza',
  'Ceriops tagal',
  'Excoecaria agallocha',
  'Aegiceras corniculatum',
  'Kandelia candel',
];

const ECOSYSTEM_TYPES = [
  { value: 'mangrove', label: '🌿 Mangrove', rate: 15 },
  { value: 'seagrass', label: '🌊 Seagrass', rate: 8 },
  { value: 'salt_marsh', label: '🏖️ Salt Marsh', rate: 10 },
  { value: 'coastal_wetland', label: '💧 Coastal Wetland', rate: 12 },
  { value: 'other', label: '🌱 Other', rate: 10 },
];

const ProjectSubmission = ({ onSubmitSuccess }) => {
  const fileInputRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    latitude: '',
    longitude: '',
    accuracy: '',
    state: '',
    district: '',
    village: '',
    coastalZone: '',
    areaHectares: '',
    ecosystemType: 'mangrove',
    plantingDate: '',
    sequestrationRate: 15,
    species: [{ name: '', count: '' }],
  });

  const [photos, setPhotos] = useState([]); // {file, preview, type, aiAnalysis, aiLoading}
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | loading | success | error
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [estimatedCO2, setEstimatedCO2] = useState(0);

  // Monitor online/offline
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); toast.success('Back online!'); };
    const handleOffline = () => { setIsOnline(false); toast('You are offline. Data will be queued.', { icon: '📴' }); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Calculate estimated CO2e
  useEffect(() => {
    const area = parseFloat(formData.areaHectares) || 0;
    const rate = parseFloat(formData.sequestrationRate) || 15;
    setEstimatedCO2((area * rate).toFixed(2));
  }, [formData.areaHectares, formData.sequestrationRate]);

  // Update rate when ecosystem type changes
  useEffect(() => {
    const eco = ECOSYSTEM_TYPES.find((e) => e.value === formData.ecosystemType);
    if (eco) {
      setFormData((prev) => ({ ...prev, sequestrationRate: eco.rate }));
    }
  }, [formData.ecosystemType]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ── GPS Capture ──
  const captureGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setGpsStatus('error');
      return;
    }

    setGpsLoading(true);
    setGpsStatus('loading');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          accuracy: position.coords.accuracy.toFixed(1),
        }));
        setGpsLoading(false);
        setGpsStatus('success');
        toast.success(`GPS captured! Accuracy: ${position.coords.accuracy.toFixed(1)}m`);
      },
      (error) => {
        setGpsLoading(false);
        setGpsStatus('error');
        let message = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable GPS.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location unavailable. Check GPS settings.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Try again.';
            break;
        }
        toast.error(message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // ── AI Analysis ──
  const analyzePhoto = async (file, index) => {
    try {
      // Convert file to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const token = localStorage.getItem('bcr_token');
      const res = await axios.post(
        `${API_BASE}/analyze/plant`,
        { imageBase64: base64, mimeType: file.type || 'image/jpeg' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPhotos(prev => prev.map((p, i) =>
        i === index ? { ...p, aiAnalysis: res.data.data, aiLoading: false } : p
      ));
    } catch {
      setPhotos(prev => prev.map((p, i) =>
        i === index ? { ...p, aiLoading: false } : p
      ));
    }
  };

  // ── Photo Handling ──
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 5) {
      toast.error('Maximum 5 photos allowed');
      return;
    }

    const startIndex = photos.length;
    const newPhotos = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: 'plantation',
      aiAnalysis: null,
      aiLoading: true, // start loading immediately
    }));

    setPhotos((prev) => [...prev, ...newPhotos]);
    toast.success(`${files.length} photo(s) added — analysing with AI...`);

    // Kick off AI analysis for each new photo
    newPhotos.forEach((_, i) => {
      analyzePhoto(files[i], startIndex + i);
    });
  };

  const removePhoto = (index) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ── Species Handling ──
  const addSpecies = () => {
    setFormData((prev) => ({
      ...prev,
      species: [...prev.species, { name: '', count: '' }],
    }));
  };

  const removeSpecies = (index) => {
    setFormData((prev) => ({
      ...prev,
      species: prev.species.filter((_, i) => i !== index),
    }));
  };

  const updateSpecies = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.species];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, species: updated };
    });
  };

  // ── Form Submission ──
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.projectName.trim()) { toast.error('Project name is required'); return; }
    if (!formData.latitude || !formData.longitude) { toast.error('Please capture GPS location'); return; }
    if (!formData.areaHectares || parseFloat(formData.areaHectares) <= 0) { toast.error('Area in hectares is required'); return; }
    if (photos.length === 0) { toast.error('Please add at least one photo'); return; }

    setSubmitting(true);

    // If offline, queue the submission
    if (!isOnline) {
      const offlineData = {
        ...formData,
        species: JSON.stringify(formData.species.filter((s) => s.name)),
        photoCount: photos.length,
      };
      offlineQueue.add(offlineData);
      toast.success('Saved offline! Will sync when connected.', { icon: '📴' });
      resetForm();
      setSubmitting(false);
      return;
    }

    try {
      // Build FormData for multipart upload
      const submitData = new FormData();
      submitData.append('projectName', formData.projectName);
      submitData.append('description', formData.description);
      submitData.append('latitude', formData.latitude);
      submitData.append('longitude', formData.longitude);
      submitData.append('accuracy', formData.accuracy);
      submitData.append('state', formData.state);
      submitData.append('district', formData.district);
      submitData.append('village', formData.village);
      submitData.append('coastalZone', formData.coastalZone);
      submitData.append('areaHectares', formData.areaHectares);
      submitData.append('ecosystemType', formData.ecosystemType);
      submitData.append('sequestrationRate', formData.sequestrationRate);
      if (formData.plantingDate) submitData.append('plantingDate', formData.plantingDate);

      // Species as JSON
      const validSpecies = formData.species.filter((s) => s.name.trim());
      if (validSpecies.length > 0) {
        submitData.append('species', JSON.stringify(validSpecies));
      }

      // Append photos
      photos.forEach((photo) => {
        submitData.append('photos', photo.file);
      });

      // Bundle AI analysis results (keyed by photo index)
      const aiResults = {};
      photos.forEach((photo, i) => {
        if (photo.aiAnalysis) {
          aiResults[i] = { ...photo.aiAnalysis, analyzedAt: new Date().toISOString() };
        }
      });
      if (Object.keys(aiResults).length > 0) {
        submitData.append('aiAnalysis', JSON.stringify(aiResults));
      }

      const response = await projectAPI.submit(submitData);
      toast.success(response.data.message || 'Project submitted successfully!');
      resetForm();
      if (onSubmitSuccess) onSubmitSuccess(response.data.data.project);
    } catch (error) {
      const message = error.response?.data?.message || 'Submission failed. Please try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      projectName: '', description: '',
      latitude: '', longitude: '', accuracy: '',
      state: '', district: '', village: '', coastalZone: '',
      areaHectares: '', ecosystemType: 'mangrove',
      plantingDate: '', sequestrationRate: 15,
      species: [{ name: '', count: '' }],
    });
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    setGpsStatus('idle');
  };

  return (
    <div className="project-submission slide-up">
      <div className="submission-header">
        <h2>📋 Submit Restoration Project</h2>
        <p>Fill in the project details, capture GPS location, and upload photos</p>
        {!isOnline && (
          <div className="offline-banner">
            <FiWifiOff /> You are offline. Data will be saved locally and synced later.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="submission-form">
        {/* ── Section 1: Project Info ── */}
        <div className="form-section">
          <h3 className="section-title">🌿 Project Information</h3>

          <div className="input-group">
            <label htmlFor="projectName">Project Name *</label>
            <input
              type="text"
              id="projectName"
              name="projectName"
              placeholder='e.g., "Mangrove Restoration - Pichavaram Phase 1"'
              value={formData.projectName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Describe the restoration project, goals, and methodology..."
              value={formData.description}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div className="input-row-3">
            <div className="input-group">
              <label htmlFor="ecosystemType">Ecosystem Type *</label>
              <select
                id="ecosystemType"
                name="ecosystemType"
                value={formData.ecosystemType}
                onChange={handleChange}
              >
                {ECOSYSTEM_TYPES.map((eco) => (
                  <option key={eco.value} value={eco.value}>{eco.label}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="areaHectares">Area (Hectares) *</label>
              <input
                type="number"
                id="areaHectares"
                name="areaHectares"
                placeholder="e.g., 2.5"
                value={formData.areaHectares}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="plantingDate">Planting Date</label>
              <input
                type="date"
                id="plantingDate"
                name="plantingDate"
                value={formData.plantingDate}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* CO2 Estimate Card */}
          <div className="co2-card">
            <div className="co2-icon">🌍</div>
            <div className="co2-info">
              <span className="co2-label">Estimated Carbon Sequestration</span>
              <span className="co2-value">{estimatedCO2} tons CO₂e</span>
              <span className="co2-detail">
                {formData.areaHectares || '0'} ha × {formData.sequestrationRate} tons/ha/year
              </span>
            </div>
          </div>
        </div>

        {/* ── Section 2: GPS Location ── */}
        <div className="form-section">
          <h3 className="section-title">📍 Location Data</h3>

          <div className="gps-capture">
            <button
              type="button"
              className={`gps-btn ${gpsStatus}`}
              onClick={captureGPS}
              disabled={gpsLoading}
            >
              {gpsLoading ? (
                <>
                  <span className="spinner small"></span>
                  Capturing GPS...
                </>
              ) : gpsStatus === 'success' ? (
                <>
                  <FiCheck /> GPS Captured ✓
                </>
              ) : (
                <>
                  <FiNavigation /> Capture GPS Location
                </>
              )}
            </button>

            {gpsStatus === 'success' && (
              <div className="gps-result fade-in">
                <div className="gps-coord">
                  <FiMapPin />
                  <span>Lat: {formData.latitude}°</span>
                  <span>Lng: {formData.longitude}°</span>
                  {formData.accuracy && <span className="gps-accuracy">±{formData.accuracy}m</span>}
                </div>
              </div>
            )}

            {gpsStatus === 'error' && (
              <div className="gps-error fade-in">
                <FiAlertCircle /> GPS failed. You can enter coordinates manually below.
              </div>
            )}
          </div>

          <div className="input-row">
            <div className="input-group">
              <label htmlFor="latitude">Latitude *</label>
              <input
                type="number"
                id="latitude"
                name="latitude"
                placeholder="e.g., 11.4292"
                value={formData.latitude}
                onChange={handleChange}
                step="0.000001"
                min="-90"
                max="90"
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="longitude">Longitude *</label>
              <input
                type="number"
                id="longitude"
                name="longitude"
                placeholder="e.g., 79.7714"
                value={formData.longitude}
                onChange={handleChange}
                step="0.000001"
                min="-180"
                max="180"
                required
              />
            </div>
          </div>

          <div className="input-row-3">
            <div className="input-group">
              <label htmlFor="state">State</label>
              <input
                type="text"
                id="state"
                name="state"
                placeholder="e.g., Tamil Nadu"
                value={formData.state}
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <label htmlFor="district">District</label>
              <input
                type="text"
                id="district"
                name="district"
                placeholder="e.g., Cuddalore"
                value={formData.district}
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <label htmlFor="village">Village / Area</label>
              <input
                type="text"
                id="village"
                name="village"
                placeholder="e.g., Pichavaram"
                value={formData.village}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* ── Section 3: Species ── */}
        <div className="form-section">
          <h3 className="section-title">🌱 Species Planted</h3>

          {formData.species.map((sp, index) => (
            <div key={index} className="species-row">
              <div className="input-group species-name">
                <label>Species Name</label>
                <input
                  type="text"
                  list="species-list"
                  placeholder="Select or type species"
                  value={sp.name}
                  onChange={(e) => updateSpecies(index, 'name', e.target.value)}
                />
                <datalist id="species-list">
                  {COMMON_SPECIES.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div className="input-group species-count">
                <label>Count</label>
                <input
                  type="number"
                  placeholder="e.g., 500"
                  value={sp.count}
                  onChange={(e) => updateSpecies(index, 'count', e.target.value)}
                  min="0"
                />
              </div>
              {formData.species.length > 1 && (
                <button
                  type="button"
                  className="species-remove"
                  onClick={() => removeSpecies(index)}
                >
                  <FiTrash2 />
                </button>
              )}
            </div>
          ))}

          <button type="button" className="add-species-btn" onClick={addSpecies}>
            <FiPlus /> Add Another Species
          </button>
        </div>

        {/* ── Section 4: Photo Upload ── */}
        <div className="form-section">
          <h3 className="section-title">📸 Photo Evidence *</h3>
          <p className="section-subtitle">Upload photos of the restoration site (max 5 photos, 10MB each)</p>

          <div className="photo-upload-area" onClick={() => fileInputRef.current?.click()}>
            <FiCamera className="upload-icon" />
            <span className="upload-text">
              Click to browse or take photos
            </span>
            <span className="upload-hint">JPEG, PNG, WebP — max 10MB each</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
          </div>

          {photos.length > 0 && (
            <div className="photo-grid">
              {photos.map((photo, index) => (
                <div key={index} className="photo-item fade-in">
                  <img src={photo.preview} alt={`Site photo ${index + 1}`} />
                  <div className="photo-overlay">
                    <span className="photo-name">{photo.file.name}</span>
                    <button
                      type="button"
                      className="photo-remove"
                      onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                  {/* AI Analysis badge */}
                  {photo.aiLoading && (
                    <div className="ai-badge loading">
                      <span className="spinner small" /> Analysing...
                    </div>
                  )}
                  {!photo.aiLoading && photo.aiAnalysis && (
                    <div className={`ai-badge done cap-${photo.aiAnalysis.carbonCapability?.toLowerCase().replace(' ', '-')}`}>
                      <FiZap size={10} />
                      {photo.aiAnalysis.carbonCapability} · {photo.aiAnalysis.sequestrationPercentage}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Submit ── */}
        <div className="submit-section">
          <div className="submit-summary">
            <div className="summary-item">
              <span>📍 Location:</span>
              <span>{formData.latitude ? `${formData.latitude}°, ${formData.longitude}°` : 'Not captured'}</span>
            </div>
            <div className="summary-item">
              <span>📐 Area:</span>
              <span>{formData.areaHectares || '0'} hectares</span>
            </div>
            <div className="summary-item">
              <span>🌍 Est. CO₂e:</span>
              <span className="co2-highlight">{estimatedCO2} tons</span>
            </div>
            <div className="summary-item">
              <span>📸 Photos:</span>
              <span>{photos.length} / 5</span>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? (
              <span className="btn-loading">
                <span className="spinner"></span>
                {isOnline ? 'Submitting to Registry...' : 'Saving Offline...'}
              </span>
            ) : (
              <span className="btn-content">
                <FiSend />
                {isOnline ? 'Submit Project' : 'Save Offline'}
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectSubmission;
