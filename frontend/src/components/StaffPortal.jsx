import React, { useState, useEffect } from 'react';
import { 
  WashingMachine, LayoutDashboard, ScanLine, ClipboardList, CheckSquare, 
  ShoppingBag, LogOut, Search, RefreshCw, Check, AlertTriangle, 
  Trash2, Play, Flame, Gift, ArrowRight, UserCheck, QrCode 
} from 'lucide-react';
import { API_URL } from '../config';

export default function StaffPortal({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('queue');
  const [requests, setRequests] = useState([]);
  const [hostel, setHostel] = useState(null);
  const [schedule, setSchedule] = useState(null);
  
  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Waiting for Verification');

  // Scanner States
  const [scanPayloadInput, setScanPayloadInput] = useState('');
  const [activeVerificationRequest, setActiveVerificationRequest] = useState(null);
  const [activeVerificationStudent, setActiveVerificationStudent] = useState(null);
  const [scannedTagsList, setScannedTagsList] = useState([]);
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState('');
  const [weightInput, setWeightInput] = useState('');

  // Report Issue
  const [issueType, setIssueType] = useState('Wrong Quantity');
  const [issueDesc, setIssueDesc] = useState('');
  const [selectedReqForIssue, setSelectedReqForIssue] = useState('');

  useEffect(() => {
    fetchStaffData();
  }, [user.hostelId]);

  const fetchStaffData = async () => {
    try {
      // 1. Fetch hostel info
      const hostelRes = await fetch(`${API_URL}/api/hostels`);
      const hostelData = await hostelRes.json();
      const myHostel = hostelData.find(h => h.id === user.hostelId);
      setHostel(myHostel);

      // 1.5 Fetch schedule
      const schedRes = await fetch(`${API_URL}/api/schedules`);
      const schedData = await schedRes.json();
      const mySched = schedData.find(s => s.hostelId === user.hostelId);
      setSchedule(mySched);

      // Apply hostel theme color
      if (myHostel) {
        document.documentElement.style.setProperty('--hostel-color', myHostel.color);
        const hex = myHostel.color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        document.documentElement.style.setProperty('--hostel-color-light', `rgba(${r}, ${g}, ${b}, 0.12)`);
        document.documentElement.style.setProperty('--hostel-color-hover', `rgba(${r - 20}, ${g - 20}, ${b - 20}, 1)`);
      }

      // 2. Fetch requests queue
      const reqRes = await fetch(`${API_URL}/api/requests/staff/${user.hostelId}`);
      const reqData = await reqRes.json();
      setRequests(reqData);
    } catch (err) {
      console.error("Failed to load staff data", err);
    }
  };

  const handleUpdateStatus = async (requestId, nextStatus, note = '', extraArgs = {}) => {
    try {
      const response = await fetch(`${API_URL}/api/requests/${requestId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, note, ...extraArgs })
      });
      if (!response.ok) throw new Error("Failed to update status");
      
      fetchStaffData();
      if (activeVerificationRequest?.id === requestId) {
        // Reset scanner screen if we completed verification
        setActiveVerificationRequest(null);
        setActiveVerificationStudent(null);
        setScannedTagsList([]);
        setScanPayloadInput('');
        setWeightInput('');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // QR Scanning Simulation Handler
  const handleSimulateScan = async (payloadOverride = '') => {
    setScanError('');
    setScanSuccess('');
    const scanText = (payloadOverride || scanPayloadInput).trim();

    if (!scanText) {
      setScanError("Please enter or select a QR tag payload to simulate scan.");
      return;
    }

    try {
      // Scenario A: First tag scan (No active request loaded yet)
      if (!activeVerificationRequest) {
        const response = await fetch(`${API_URL}/api/requests/scan-first`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: scanText })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Scan failed');

        setActiveVerificationRequest(data.request);
        setActiveVerificationStudent(data.student);
        setScannedTagsList(data.request.scannedTags || []);
        setScanSuccess(`Found request for student: ${data.student.name}. Loaded expected count: ${data.request.expectedTotal}`);
      } 
      // Scenario B: Subsequent tag scans (Already working on a request)
      else {
        const response = await fetch(`${API_URL}/api/requests/scan-tag`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: activeVerificationRequest.id,
            payload: scanText
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Tag verification failed');

        setActiveVerificationRequest(data.request);
        setScannedTagsList(data.request.scannedTags);
        setScanSuccess(`Tag ${scanText.split('|')[1] || scanText} verified successfully!`);
      }
    } catch (err) {
      setScanError(err.message);
    }
  };

  const handleSimulateDelivery = async (payload) => {
    setScanError('');
    setScanSuccess('');

    try {
      const response = await fetch(`${API_URL}/api/requests/scan-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Delivery scan failed');

      setScanSuccess(`Laundry delivered to ${data.request.studentName} successfully!`);
      fetchStaffData();
    } catch (err) {
      setScanError(err.message);
    }
  };

  const handleStaffReportIssue = async (e) => {
    e.preventDefault();
    if (!issueDesc || !selectedReqForIssue) {
      alert("Please select request and enter details.");
      return;
    }

    try {
      const dbReq = requests.find(r => r.id === selectedReqForIssue);
      const response = await fetch(`${API_URL}/api/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: dbReq.studentId,
          type: issueType,
          description: issueDesc,
          requestId: selectedReqForIssue
        })
      });
      if (!response.ok) throw new Error("Failed to report issue");

      alert("Issue ticket created. Request status updated.");
      setIssueDesc('');
      setSelectedReqForIssue('');
      fetchStaffData();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.laundryId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.room.includes(searchQuery);
    
    const matchesStatus = r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats for today
  const pendingCount = requests.filter(r => r.status === 'Waiting for Verification').length;
  const washingCount = requests.filter(r => r.status === 'Washing').length;
  const dryingCount = requests.filter(r => r.status === 'Drying').length;
  const readyCount = requests.filter(r => r.status === 'Ready').length;

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <WashingMachine size={28} style={{ color: 'var(--hostel-color)' }} />
          <span>SmartWash Staff</span>
        </div>
        <nav className="sidebar-menu">
          <button 
            className={`sidebar-item ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            <ClipboardList size={20} />
            Laundry Queue
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'scanner' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('scanner');
              setActiveVerificationRequest(null);
              setActiveVerificationStudent(null);
              setScannedTagsList([]);
              setScanError('');
              setScanSuccess('');
            }}
          >
            <ScanLine size={20} />
            QR Scanner
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'issues' ? 'active' : ''}`}
            onClick={() => setActiveTab('issues')}
          >
            <AlertTriangle size={20} />
            Flag Issues
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
            <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.9rem' }}>
              {user.name.charAt(0)}
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Staff • {user.counter}</p>
            </div>
          </div>
          <button onClick={onLogout} className="sidebar-item" style={{ color: 'var(--status-issue)', border: 'none', background: 'none', width: '100%', textAlign: 'left' }}>
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        <header className="main-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Laundry Desk Portal</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Assigned Hostel: <b>{hostel?.name || 'All Hostels'}</b>
            </p>
          </div>
          
          <button onClick={fetchStaffData} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem' }}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        <div className="page-container">
          {/* STATS ROW */}
          <div className="dashboard-grid">
            <div className="glass-card stats-card">
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Waiting Verification</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{pendingCount}</h3>
              </div>
              <div className="stats-icon" style={{ backgroundColor: 'var(--status-pending)' }}>
                <CheckSquare size={24} />
              </div>
            </div>

            <div className="glass-card stats-card">
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Currently Washing</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{washingCount}</h3>
              </div>
              <div className="stats-icon" style={{ backgroundColor: 'var(--status-washing)' }}>
                <WashingMachine size={24} />
              </div>
            </div>

            <div className="glass-card stats-card">
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>In Dryers</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{dryingCount}</h3>
              </div>
              <div className="stats-icon" style={{ backgroundColor: 'var(--status-drying)' }}>
                <Flame size={24} />
              </div>
            </div>

            <div className="glass-card stats-card">
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Ready for Delivery</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{readyCount}</h3>
              </div>
              <div className="stats-icon" style={{ backgroundColor: 'var(--status-ready)' }}>
                <ShoppingBag size={24} />
              </div>
            </div>
          </div>

          {/* QUEUE TAB */}
          {activeTab === 'queue' && (
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Laundry Desk Queue</h3>
                
                {/* Filters */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      className="custom-input"
                      placeholder="Search name, room..."
                      style={{ paddingLeft: '2.5rem', maxWidth: '200px' }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <select 
                    className="custom-input"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ width: 'auto' }}
                  >
                    <option value="Waiting for Verification">Pending Verification</option>
                    <option value="Received">Received</option>
                    <option value="Washing">Washing</option>
                    <option value="Drying">Drying</option>
                    <option value="Ready">Ready</option>
                  </select>
                </div>
              </div>

              {filteredRequests.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No laundry requests found in this category.</p>
              ) : (
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Req ID</th>
                        <th>Student Name</th>
                        <th>Laundry ID</th>
                        <th>Room</th>
                        <th>Total Items</th>
                        <th>Weight / Fee</th>
                        <th>Breakdown</th>
                        <th>Status / Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600, color: 'var(--hostel-color)' }}>{r.id}</td>
                          <td style={{ fontWeight: 600 }}>{r.studentName}</td>
                          <td>
                            <span className="badge" style={{ backgroundColor: 'var(--hostel-color-light)', color: 'var(--hostel-color)' }}>
                              {r.laundryId}
                            </span>
                          </td>
                          <td>Room {r.room}</td>
                          <td style={{ fontWeight: 700 }}>{r.expectedTotal}</td>
                          <td>
                            {r.weight !== undefined ? `${r.weight} kg` : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                            {r.overLimitCharge > 0 && (
                              <span style={{ display: 'block', color: 'var(--status-issue)', fontSize: '0.75rem', fontWeight: 600, marginTop: '0.1rem' }}>
                                ₹{r.overLimitCharge}
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {Object.entries(r.clothes).map(([name, qty]) => qty > 0 && `${name} (${qty})`).filter(Boolean).join(', ')}
                          </td>
                          <td>
                            {r.status === 'Waiting for Verification' && (
                              <button 
                                onClick={() => {
                                  setActiveTab('scanner');
                                  // Pre-load student for verification
                                  handleSimulateScan(`${r.laundryId}`);
                                }}
                                className="btn btn-primary"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                              >
                                <ScanLine size={14} /> Verify Tags
                              </button>
                            )}

                            {r.status === 'Received' && (
                              <button 
                                onClick={() => handleUpdateStatus(r.id, 'Washing', 'Washing started')}
                                className="btn btn-primary"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'var(--status-washing)' }}
                              >
                                <Play size={14} /> Start Washing
                              </button>
                            )}

                            {r.status === 'Washing' && (
                              <button 
                                onClick={() => handleUpdateStatus(r.id, 'Drying', 'Moved to dryer')}
                                className="btn btn-primary"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'var(--status-drying)' }}
                              >
                                <Flame size={14} /> Move to Dry
                              </button>
                            )}

                            {r.status === 'Drying' && (
                              <button 
                                onClick={() => handleUpdateStatus(r.id, 'Ready', 'Ironed and packed')}
                                className="btn btn-primary"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'var(--status-ready)' }}
                              >
                                <Check size={14} /> Mark Ready
                              </button>
                            )}

                            {r.status === 'Ready' && (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button 
                                  onClick={() => handleSimulateDelivery(`${r.laundryId}`)}
                                  className="btn btn-primary"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                >
                                  <UserCheck size={14} /> Deliver
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SCANNER WORKFLOW TAB */}
          {activeTab === 'scanner' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              {/* Simulator & Camera Panel */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Scan QR Tag</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Scan the student's ID or physical clothes QR buttons.
                </p>

                {/* Scan box animation */}
                <div className="scanner-outline">
                  <div className="scanner-laser"></div>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.15 }}>
                    <QrCode size={120} style={{ color: 'var(--hostel-color)' }} />
                  </div>
                </div>

                {/* Interactive Mock Scanning Panel */}
                <div style={{ background: 'var(--input-bg)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--hostel-color)' }}>🛠️</span> Mock Scanner Simulator
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Since there are no physical QR buttons, use these shortcuts to simulate scans.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {/* Quick select buttons */}
                    {!activeVerificationRequest ? (
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                          STEP 1: Select Student Card Scan
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {requests.filter(r => r.status === 'Waiting for Verification').map(r => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => {
                                setScanPayloadInput(`${r.laundryId}`);
                                handleSimulateScan(`${r.laundryId}`);
                              }}
                              className="btn btn-secondary"
                              style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                            >
                              Scan card for {r.studentName} ({r.laundryId})
                            </button>
                          ))}
                          {requests.filter(r => r.status === 'Waiting for Verification').length === 0 && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No students waiting in queue.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                          STEP 2: Scan Clothes QR Tags
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                          {activeVerificationStudent?.tags.map((tag) => {
                            const isScanned = scannedTagsList.includes(tag.serialNumber);
                            return (
                              <button
                                key={tag.serialNumber}
                                type="button"
                                disabled={tag.status !== 'active'}
                                onClick={() => {
                                  const payload = `${activeVerificationStudent.laundryId} | ${tag.serialNumber}`;
                                  setScanPayloadInput(payload);
                                  handleSimulateScan(payload);
                                }}
                                className="btn"
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.35rem 0.25rem',
                                  backgroundColor: isScanned ? 'var(--status-ready-bg)' : 'var(--bg-secondary)',
                                  color: isScanned ? 'var(--status-ready)' : 'var(--text-primary)',
                                  border: `1px solid ${isScanned ? 'var(--status-ready)' : 'var(--border-color)'}`
                                }}
                              >
                                {tag.serialNumber}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Delivery Quick Scans */}
                    {requests.filter(r => r.status === 'Ready').length > 0 && !activeVerificationRequest && (
                      <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                          DELIVERY: Scan Tag to Deliver Clothes
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {requests.filter(r => r.status === 'Ready').map(r => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => handleSimulateDelivery(`${r.laundryId} | T00000`)}
                              className="btn btn-secondary"
                              style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                            >
                              Scan tag of {r.studentName} (Deliver Order)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        className="custom-input" 
                        placeholder="Manual Payload (e.g. LID-1023 | T00001)"
                        value={scanPayloadInput}
                        onChange={(e) => setScanPayloadInput(e.target.value)}
                        style={{ fontSize: '0.8rem' }}
                      />
                      <button 
                        onClick={() => handleSimulateScan()}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem' }}
                      >
                        Scan
                      </button>
                    </div>
                  </div>
                </div>

                {scanSuccess && (
                  <p style={{ color: 'var(--status-ready)', fontSize: '0.85rem', fontWeight: 600 }}>{scanSuccess}</p>
                )}
                {scanError && (
                  <p style={{ color: 'var(--status-issue)', fontSize: '0.85rem', fontWeight: 600 }}>❌ {scanError}</p>
                )}
              </div>

              {/* Verification Process Panel */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>Verification Details</h3>
                
                {activeVerificationRequest ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Student Card Info */}
                    <div style={{ display: 'flex', gap: '0.75rem', background: 'var(--input-bg)', padding: '1rem', borderRadius: '0.75rem' }}>
                      <div className="user-avatar" style={{ width: '48px', height: '48px' }}>
                        {activeVerificationStudent?.name.charAt(0)}
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 700 }}>{activeVerificationStudent?.name}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Laundry ID: <b>{activeVerificationRequest.laundryId}</b> • Room: <b>{activeVerificationRequest.room}</b>
                        </p>
                      </div>
                    </div>

                    {/* Clothing Checklist */}
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Clothes Declared</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {Object.entries(activeVerificationRequest.clothes).map(([name, qty]) => qty > 0 && (
                          <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                            <span>{name}</span>
                            <span style={{ fontWeight: 700 }}>{qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Verification Counter */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--input-bg)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Scanned / Total Expected</p>
                      <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.25rem 0', color: scannedTagsList.length === activeVerificationRequest.expectedTotal ? 'var(--status-ready)' : 'var(--hostel-color)' }}>
                        {scannedTagsList.length} / {activeVerificationRequest.expectedTotal}
                      </h2>
                      
                      {scannedTagsList.length === activeVerificationRequest.expectedTotal ? (
                        <p style={{ color: 'var(--status-ready)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          🟢 Count matches! Ready to accept.
                        </p>
                      ) : (
                        <p style={{ color: 'var(--status-pending)', fontSize: '0.8rem', fontWeight: 600 }}>
                          ⚠️ Count Mismatch! Scan all {activeVerificationRequest.expectedTotal} clothes tags.
                        </p>
                      )}
                    </div>

                    {/* Scanned Tag list */}
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Scanned Tags <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>(Click to deselect)</span>
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {scannedTagsList.map(tag => (
                          <span 
                            key={tag} 
                            onClick={() => handleSimulateScan(`${activeVerificationStudent?.laundryId} | ${tag}`)}
                            className="badge badge-received" 
                            style={{ 
                              fontSize: '0.75rem', 
                              cursor: 'pointer', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.25rem',
                              transition: 'all 0.2s'
                            }}
                            title="Click to deselect tag"
                          >
                            {tag} <span style={{ fontSize: '0.95rem', marginLeft: '1px', opacity: 0.8 }}>&times;</span>
                          </span>
                        ))}
                        {scannedTagsList.length === 0 && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No tags scanned yet.</span>}
                      </div>
                    </div>

                    {/* Weight Measurement Input */}
                    {(() => {
                      const maxW = schedule?.maxWeight !== undefined ? schedule.maxWeight : 5.0;
                      const rateW = schedule?.extraWeightRate !== undefined ? schedule.extraWeightRate : 20.0;
                      const measuredW = parseFloat(weightInput) || 0;
                      const isOverLimit = measuredW > maxW;
                      const extraWeight = isOverLimit ? Number((measuredW - maxW).toFixed(1)) : 0;
                      const overLimitFee = isOverLimit ? Number((extraWeight * rateW).toFixed(1)) : 0;

                      return (
                        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Measured Weight (kg) <span style={{ color: 'var(--status-issue)' }}>*</span>
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              placeholder="e.g. 4.8"
                              className="custom-input"
                              style={{ maxWidth: '110px' }}
                              value={weightInput}
                              onChange={(e) => setWeightInput(e.target.value)}
                            />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              Limit: <b>{maxW} kg</b> (₹{rateW}/kg extra)
                            </span>
                          </div>
                          
                          {measuredW > 0 && (
                            <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                              {isOverLimit ? (
                                <p style={{ color: 'var(--status-issue)', fontWeight: 600 }}>
                                  ⚠️ +{extraWeight} kg over limit! Fee: ₹{overLimitFee}
                                </p>
                              ) : (
                                <p style={{ color: 'var(--status-washing)', fontWeight: 600 }}>
                                  🟢 Within limit ({measuredW} kg). No extra fee.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Accept Action */}
                    {(() => {
                      const maxW = schedule?.maxWeight !== undefined ? schedule.maxWeight : 5.0;
                      const rateW = schedule?.extraWeightRate !== undefined ? schedule.extraWeightRate : 20.0;
                      const measuredW = parseFloat(weightInput) || 0;
                      const isOverLimit = measuredW > maxW;
                      const extraWeight = isOverLimit ? Number((measuredW - maxW).toFixed(1)) : 0;
                      const overLimitFee = isOverLimit ? Number((extraWeight * rateW).toFixed(1)) : 0;

                      return (
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                          <button
                            onClick={() => handleUpdateStatus(
                              activeVerificationRequest.id, 
                              'Received', 
                              `Received and verified ${scannedTagsList.length} tags. Weight: ${measuredW} kg.`,
                              { weight: measuredW, overLimitCharge: overLimitFee }
                            )}
                            disabled={scannedTagsList.length !== activeVerificationRequest.expectedTotal || measuredW <= 0}
                            className="btn btn-primary"
                            style={{ flex: 1 }}
                          >
                            ✔ Accept Laundry
                          </button>
                          <button
                            onClick={() => {
                              setActiveVerificationRequest(null);
                              setActiveVerificationStudent(null);
                              setScannedTagsList([]);
                              setScanPayloadInput('');
                              setScanError('');
                              setScanSuccess('');
                              setWeightInput('');
                            }}
                            className="btn btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                    <ScanLine size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                    <p>No active scan session.</p>
                    <p style={{ fontSize: '0.8rem' }}>Please select a student's card scan from the simulator shortcuts on the left to start verification.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FLAG ISSUES TAB */}
          {activeTab === 'issues' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Report Order Issue</h3>
                <form onSubmit={handleStaffReportIssue} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                      Select Pending Request
                    </label>
                    <select
                      className="custom-input"
                      value={selectedReqForIssue}
                      onChange={(e) => setSelectedReqForIssue(e.target.value)}
                    >
                      <option value="">-- Select Active Request --</option>
                      {requests.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.id} - {r.studentName} ({r.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                      Issue Type
                    </label>
                    <select
                      className="custom-input"
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                    >
                      <option value="Wrong Quantity">Wrong Quantity / Mismatch</option>
                      <option value="Damaged Clothes">Damaged Clothes</option>
                      <option value="Missing Clothes">Missing Clothes</option>
                      <option value="Student Didn't Collect">Student Didn't Collect</option>
                      <option value="Lost Tag">Lost Tag / QR Damage</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                      Detailed Log Description
                    </label>
                    <textarea
                      className="custom-input"
                      rows="4"
                      placeholder="Write exact details..."
                      value={issueDesc}
                      onChange={(e) => setIssueDesc(e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                    Submit Ticket & Flag
                  </button>
                </form>
              </div>

              {/* Flags list */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Active Flagged Requests</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {requests.filter(r => r.issue).map(r => (
                    <div key={r.id} style={{ padding: '1rem', background: 'var(--status-issue-bg)', color: 'var(--text-primary)', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Request {r.id}</h4>
                        <span className="badge badge-issue">{r.issue.type}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Student: <b>{r.studentName}</b> ({r.laundryId})</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{r.issue.description}</p>
                    </div>
                  ))}
                  {requests.filter(r => r.issue).length === 0 && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No current orders have flagged issues.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
