import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom pinpoint marker icon with color coding based on project density
const createPinpointIcon = (projectCount, status) => {
  // Determine color based on project count (density)
  let densityColor;
  let densityLabel;
  
  if (projectCount >= 5) {
    densityColor = '#ef4444'; // Red - High density (More projects)
    densityLabel = 'High';
  } else if (projectCount >= 2) {
    densityColor = '#f59e0b'; // Orange - Medium density (Medium projects)
    densityLabel = 'Medium';
  } else {
    densityColor = '#10b981'; // Green - Low density (Less projects)
    densityLabel = 'Low';
  }

  return L.divIcon({
    className: 'custom-pinpoint-wrapper',
    html: `
      <div class="pinpoint-marker" style="background: ${densityColor};">
        <div class="pinpoint-inner">
          <div class="pinpoint-dot"></div>
          <div class="pinpoint-pulse" style="border-color: ${densityColor};"></div>
        </div>
        <div class="pinpoint-count">${projectCount}</div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

// Known geographic centers for Indian states — used as marker positions
// so markers don't overlap even when all projects share the same GPS point
const STATE_CENTERS = {
  'andhra pradesh':     { lat: 15.9129, lng: 79.7400 },
  'arunachal pradesh':  { lat: 28.2180, lng: 94.7278 },
  'assam':              { lat: 26.2006, lng: 92.9376 },
  'bihar':              { lat: 25.0961, lng: 85.3131 },
  'chhattisgarh':       { lat: 21.2787, lng: 81.8661 },
  'goa':                { lat: 15.2993, lng: 74.1240 },
  'gujarat':            { lat: 22.2587, lng: 71.1924 },
  'haryana':            { lat: 29.0588, lng: 76.0856 },
  'himachal pradesh':   { lat: 31.1048, lng: 77.1734 },
  'jharkhand':          { lat: 23.6102, lng: 85.2799 },
  'karnataka':          { lat: 15.3173, lng: 75.7139 },
  'kerala':             { lat: 10.8505, lng: 76.2711 },
  'madhya pradesh':     { lat: 22.9734, lng: 78.6569 },
  'maharashtra':        { lat: 19.7515, lng: 75.7139 },
  'manipur':            { lat: 24.6637, lng: 93.9063 },
  'meghalaya':          { lat: 25.4670, lng: 91.3662 },
  'mizoram':            { lat: 23.1645, lng: 92.9376 },
  'nagaland':           { lat: 26.1584, lng: 94.5624 },
  'odisha':             { lat: 20.9517, lng: 85.0985 },
  'punjab':             { lat: 31.1471, lng: 75.3412 },
  'rajasthan':          { lat: 27.0238, lng: 74.2179 },
  'sikkim':             { lat: 27.5330, lng: 88.5122 },
  'tamil nadu':         { lat: 11.1271, lng: 78.6569 },
  'telangana':          { lat: 18.1124, lng: 79.0193 },
  'tripura':            { lat: 23.9408, lng: 91.9882 },
  'uttar pradesh':      { lat: 26.8467, lng: 80.9462 },
  'uttarakhand':        { lat: 30.0668, lng: 79.0193 },
  'west bengal':        { lat: 22.9868, lng: 87.8550 },
  // Union Territories
  'delhi':              { lat: 28.7041, lng: 77.1025 },
  'jammu and kashmir':  { lat: 33.7782, lng: 76.5762 },
  'ladakh':             { lat: 34.1526, lng: 77.5770 },
  'puducherry':         { lat: 11.9416, lng: 79.8083 },
  'andaman and nicobar islands': { lat: 11.7401, lng: 92.6586 },
  'chandigarh':         { lat: 30.7333, lng: 76.7794 },
  'lakshadweep':        { lat: 10.5667, lng: 72.6417 },
};

// Group projects by STATE — one marker per state at the state's geographic center
const groupProjectsByLocation = (projects) => {
  console.log('🗺️ Grouping projects by state. Total projects:', projects.length);

  const stateMap = new Map();

  projects.forEach((project) => {
    const rawState = project.location?.state?.trim() || '';
    const key = rawState.toLowerCase() || 'unknown';

    if (!stateMap.has(key)) {
      stateMap.set(key, {
        state: rawState || 'Unknown State',
        projects: [],
        districts: new Map(),
      });
    }

    const group = stateMap.get(key);
    group.projects.push(project);

    // Track per-district counts
    const rawDistrict = project.location?.district?.trim() || 'Unknown District';
    const dKey = rawDistrict.toLowerCase();
    group.districts.set(dKey, {
      name: rawDistrict,
      count: (group.districts.get(dKey)?.count || 0) + 1,
    });
  });

  console.log(`📊 State grouping: ${projects.length} projects across ${stateMap.size} states`);

  const locationGroups = Array.from(stateMap.values())
    .map(group => {
      const stateKey = group.state.toLowerCase();
      const center = STATE_CENTERS[stateKey];

      if (!center) {
        console.warn(`⚠️ No known center for state: "${group.state}" — skipping marker`);
        return null;
      }

      const projectCount = group.projects.length;
      const color = projectCount >= 5 ? '🔴' : projectCount >= 2 ? '🟠' : '🟢';
      console.log(`${color} ${group.state}: ${projectCount} projects`);

      return {
        state: group.state,
        districts: Array.from(group.districts.values()),
        projects: group.projects,
        lat: center.lat,
        lng: center.lng,
      };
    })
    .filter(Boolean);

  console.log(`✅ ${locationGroups.length} state markers will be shown on map`);
  return locationGroups;
};

const IndiaMap = ({ projects, onProjectClick, selectedProject }) => {
  // India center coordinates
  const indiaCenter = [20.5937, 78.9629];
  const zoomLevel = 5;

  // Group projects by location for density-based markers
  const locationGroups = useMemo(() => {
    console.log('🗺️ IndiaMap received', projects?.length || 0, 'projects');
    if (!projects || projects.length === 0) return [];
    return groupProjectsByLocation(projects);
  }, [projects]);

  return (
    <MapContainer
      center={indiaCenter}
      zoom={zoomLevel}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
      zoomControl={true}
    >
      {/* Brighter tile layer for better visibility */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      {/* Render grouped location markers with density-based colors */}
      {locationGroups.map((group, index) => {
        const projectCount = group.projects.length;
        
        // Calculate statistics for this location
        const approvedCount = group.projects.filter(p => p.status === 'APPROVED' || p.status === 'MINTED').length;
        const pendingCount = group.projects.filter(p => p.status === 'SUBMITTED' || p.status === 'DRAFT' || p.status === 'UNDER_REVIEW' || p.status === 'REVIEW').length;
        const rejectedCount = group.projects.filter(p => p.status === 'REJECTED').length;
        
        const totalArea = group.projects.reduce((sum, p) => sum + (p.restoration?.areaHectares || 0), 0);
        const totalCarbon = group.projects.reduce((sum, p) => sum + (p.carbon?.estimatedCO2e || 0), 0);

        return (
          <Marker
            key={`${group.state}-${index}`}
            position={[group.lat, group.lng]}
            icon={createPinpointIcon(projectCount, group.projects[0]?.status)}
            eventHandlers={{
              click: () => {
                // If only one project, open it directly
                if (projectCount === 1) {
                  onProjectClick(group.projects[0]);
                }
              },
            }}
          >
            <Popup maxWidth={300}>
              <div style={{ minWidth: '260px', padding: '12px' }}>
                {/* State header + total count */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(0, 224, 184, 0.2)'
                }}>
                  <strong style={{ color: '#00E0B8', fontSize: '16px' }}>
                    {group.state}
                  </strong>
                  <div style={{
                    background: projectCount >= 5 ? '#ef4444' : projectCount >= 2 ? '#f59e0b' : '#10b981',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {projectCount} {projectCount === 1 ? 'Project' : 'Projects'}
                  </div>
                </div>

                {/* District breakdown */}
                {group.districts && group.districts.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '6px' }}>
                      <strong>Districts:</strong>
                    </div>
                    {group.districts.map(d => (
                      <div key={d.name} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        padding: '3px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <span style={{ color: '#ddd' }}>{d.name}</span>
                        <span style={{ color: '#00E0B8', fontWeight: '600' }}>{d.count} project{d.count > 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Status breakdown */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '6px' }}>
                    <strong>Status:</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {approvedCount > 0 && (
                      <span style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                        ✓ {approvedCount} Approved
                      </span>
                    )}
                    {pendingCount > 0 && (
                      <span style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                        ⏳ {pendingCount} Pending
                      </span>
                    )}
                    {rejectedCount > 0 && (
                      <span style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                        ✗ {rejectedCount} Rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Area + Carbon */}
                <div style={{ background: 'rgba(0,224,184,0.1)', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#999' }}>📏 Total Area:</span>
                    <strong style={{ color: '#00E0B8' }}>{totalArea.toFixed(2)} ha</strong>
                  </div>
                  <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#999' }}>🌱 CO₂ Sequestered:</span>
                    <strong style={{ color: '#00E0B8' }}>{totalCarbon.toFixed(1)} tons</strong>
                  </div>
                </div>

                {projectCount === 1 && (
                  <button
                    onClick={() => onProjectClick(group.projects[0])}
                    style={{ width: '100%', padding: '8px', background: '#00E0B8', color: '#0a1628', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    onMouseOver={(e) => e.target.style.background = '#00c9a7'}
                    onMouseOut={(e) => e.target.style.background = '#00E0B8'}
                  >
                    View Project Details
                  </button>
                )}
                {projectCount > 1 && (
                  <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', textAlign: 'center' }}>
                    Select a project from the table to view details
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default IndiaMap;
