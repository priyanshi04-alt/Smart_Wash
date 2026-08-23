import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, FileText, History, AlertOctagon, User, LogOut, 
  Plus, Calendar, CreditCard, Check, AlertCircle, ShoppingBag, ShieldAlert,
  WashingMachine
} from 'lucide-react';
import { API_URL } from '../config';

const CLOTHING_TYPES = ["Shirts", "Pants", "T-Shirts", "Towels", "Bedsheets", "Blankets", "Others"];

export default function StudentPortal({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [requests, setRequests] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [hostel, setHostel] = useState(null);
  const [clothesInput, setClothesInput] = useState(
    CLOTHING_TYPES.reduce((acc, type) => ({ ...acc, [type]: 0 }), {})
  );
  
  // Issue report form state
  const [issueType, setIssueType] = useState('Missing Clothes');
  const [issueDesc, setIssueDesc] = useState('');
  const [selectedRequestForIssue, setSelectedRequestForIssue] = useState('');
  const [issuesList, setIssuesList] = useState([]);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, [user.id]);

  const fetchStudentData = async () => {
    try {
      // 1. Fetch requests
      const reqRes = await fetch(`${API_URL}/api/requests/student/${user.id}`);
      const reqData = await reqRes.json();
      setRequests(reqData);

      // 2. Fetch hostel schedules
      const schedRes = await fetch(`${API_URL}/api/schedules`);
      const schedData = await schedRes.json();
      const mySched = schedData.find(s => s.hostelId === user.hostelId);
      setSchedule(mySched);

      // 3. Fetch hostels to get dynamic color/name
      const hostelRes = await fetch(`${API_URL}/api/hostels`);
      const hostelData = await hostelRes.json();
      const myHostel = hostelData.find(h => h.id === user.hostelId);
      setHostel(myHostel);

      // 4. Fetch student issues
      const issueRes = await fetch(`${API_URL}/api/issues`);
      const issueData = await issueRes.json();
      const myIssues = issueData.filter(iss => iss.studentId === user.id);
      setIssuesList(myIssues);

      // Apply hostel theme color dynamically to root css
      if (myHostel) {
        document.documentElement.style.setProperty('--hostel-color', myHostel.color);
        // compute light variant
        const hex = myHostel.color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        document.documentElement.style.setProperty('--hostel-color-light', `rgba(${r}, ${g}, ${b}, 0.12)`);
        document.documentElement.style.setProperty('--hostel-color-hover', `rgba(${r - 20}, ${g - 20}, ${b - 20}, 1)`);
      }
    } catch (err) {
      console.error("Failed to load student data", err);
    }
  };

  const handleQtyChange = (type, val) => {
    const qty = Math.max(0, parseInt(val) || 0);
    setClothesInput(prev => ({ ...prev, [type]: qty }));
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const totalCount = Object.values(clothesInput).reduce((a, b) => a + b, 0);
    if (totalCount === 0) {
      setError("Please select at least one item to wash!");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          clothes: clothesInput
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit request');
      }

      setSuccess("Laundry request submitted successfully!");
      // Reset form
      setClothesInput(CLOTHING_TYPES.reduce((acc, type) => ({ ...acc, [type]: 0 }), {}));
      fetchStudentData();
      setActiveTab('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReportIssue = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!issueDesc) {
      setError("Please write details about the issue.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          type: issueType,
          description: issueDesc,
          requestId: selectedRequestForIssue || null
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to file issue');

      setSuccess("Issue ticket created successfully! Laundry staff or Admin will resolve it.");
      setIssueDesc('');
      setSelectedRequestForIssue('');
      fetchStudentData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Get current active request (not delivered)
  const activeRequest = requests.find(r => r.status !== 'Delivered');

  // Timeline steps
  const TIMELINE_STEPS = [
    { key: "Waiting for Verification", label: "Verification Required", desc: "Show your tags at laundry counter" },
    { key: "Received", label: "Laundry Accepted", desc: "Bags verified and weight confirmed" },
    { key: "Washing", label: "Washing In Progress", desc: "Clothes inside washers" },
    { key: "Drying", label: "Drying & Ironing", desc: "Tumble dry and pressing" },
    { key: "Ready", label: "Ready for Pickup", desc: "Collect clothes using your tag scan" }
  ];

  const getTimelineStepIndex = (status) => {
    return TIMELINE_STEPS.findIndex(s => s.key === status);
  };

  const activeStepIndex = activeRequest ? getTimelineStepIndex(activeRequest.status) : -1;

  const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const isLaundryDay = schedule?.days.includes(todayDay);
  const isEmergencyAllowed = schedule?.emergencyEnabled;
  const canSubmit = isLaundryDay || isEmergencyAllowed;

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <WashingMachine size={28} style={{ color: 'var(--hostel-color)' }} />
          <span>SmartWash</span>
        </div>
        <nav className="sidebar-menu">
          <button 
            className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'submit' ? 'active' : ''}`}
            onClick={() => setActiveTab('submit')}
          >
            <Plus size={20} />
            Submit Request
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={20} />
            Laundry History
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'issues' ? 'active' : ''}`}
            onClick={() => setActiveTab('issues')}
          >
            <AlertOctagon size={20} />
            Report Issue
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={20} />
            My Profile
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
            <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.9rem' }}>
              {user.name.charAt(0)}
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Student</p>
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Student Portal</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {hostel?.name || 'Loading Hostel...'} • Room {user.room}
            </p>
          </div>
          
          <div className="header-user">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.85rem' }}>
              <span className="badge" style={{ backgroundColor: 'var(--hostel-color-light)', color: 'var(--hostel-color)', marginBottom: '2px' }}>
                {user.laundryId}
              </span>
            </div>
          </div>
        </header>

        <div className="page-container">
          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--status-ready-bg)', color: 'var(--status-ready)', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <Check size={20} />
              <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{success}</p>
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--status-issue-bg)', color: 'var(--status-issue)', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <AlertCircle size={20} />
              <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{error}</p>
            </div>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <>
              {/* Quick Info Grid */}
              <div className="dashboard-grid">
                <div className="glass-card stats-card">
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>My Laundry Day</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>
                      {schedule?.days.join(', ') || 'Loading...'}
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {isLaundryDay ? "🟢 Today is your laundry day!" : "🔴 Not scheduled today"}
                    </p>
                  </div>
                  <div className="stats-icon" style={{ backgroundColor: 'var(--hostel-color)' }}>
                    <Calendar size={24} />
                  </div>
                </div>

                <div className="glass-card stats-card">
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Active Tags Assigned</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>
                      {user.tags.filter(t => t.status === 'active').length} / {user.tags.length}
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Attach to laundry clothes
                    </p>
                  </div>
                  <div className="stats-icon" style={{ backgroundColor: 'var(--status-washing)' }}>
                    <CreditCard size={24} />
                  </div>
                </div>

                <div className="glass-card stats-card">
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Current Status</p>
                    <div style={{ marginTop: '0.25rem' }}>
                      {activeRequest ? (
                        <span className={`badge badge-${activeRequest.status.split(' ')[0].toLowerCase()}`}>
                          {activeRequest.status}
                        </span>
                      ) : (
                        <span className="badge badge-delivered">No Active Order</span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {activeRequest ? `${activeRequest.expectedTotal} Clothes submitted` : "Submit clothes at laundry desk"}
                    </p>
                  </div>
                  <div className="stats-icon" style={{ backgroundColor: activeRequest ? 'var(--status-ready)' : 'var(--text-muted)' }}>
                    <ShoppingBag size={24} />
                  </div>
                </div>
              </div>

              {/* Live Tracking Timeline */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Live Laundry Tracking</h3>
                {activeRequest ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                    <div className="timeline">
                      {TIMELINE_STEPS.map((step, idx) => {
                        const isCompleted = idx < activeStepIndex;
                        const isActive = idx === activeStepIndex;
                        return (
                          <div 
                            key={step.key} 
                            className={`timeline-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active animate-pulse' : ''}`}
                          >
                            <h4 className="timeline-title">{step.label}</h4>
                            <p className="timeline-desc">{step.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div style={{ background: 'var(--input-bg)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Order Details ({activeRequest.id})</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem', fontSize: '0.85rem' }}>
                        {Object.entries(activeRequest.clothes).map(([name, qty]) => qty > 0 && (
                          <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '0.4rem' }}>
                            <span>{name}:</span>
                            <span style={{ fontWeight: 600 }}>{qty}</span>
                          </div>
                        ))}
                      </div>
                      
                      {activeRequest.weight !== undefined && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Measured Weight:</span>
                            <span style={{ fontWeight: 600 }}>{activeRequest.weight} kg</span>
                          </div>
                          {activeRequest.overLimitCharge !== undefined && activeRequest.overLimitCharge > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-issue)', fontWeight: 600 }}>
                              <span>Over-Limit Charge:</span>
                              <span>₹{activeRequest.overLimitCharge}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {activeRequest.issue && (
                        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--status-issue-bg)', color: 'var(--status-issue)', padding: '0.75rem', borderRadius: '0.5rem', marginTop: '1rem', fontSize: '0.85rem' }}>
                          <ShieldAlert size={18} />
                          <div>
                            <p style={{ fontWeight: 600 }}>Flagged Mismatch / Issue</p>
                            <p>{activeRequest.issue.description}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                    <ShoppingBag size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                    <p style={{ fontWeight: 600 }}>You don't have any active laundry orders.</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Ready to wash clothes? Create a request below and drop them off.
                    </p>
                    <button 
                      onClick={() => setActiveTab('submit')} 
                      className="btn btn-primary"
                      style={{ marginTop: '1.25rem' }}
                    >
                      Create Laundry Request
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* SUBMIT REQUEST TAB */}
          {activeTab === 'submit' && (
            <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Submit Laundry Request</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Specify the count of each clothing item you want to hand over.
                </p>
                {schedule && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--hostel-color)', fontWeight: 600, marginTop: '0.5rem' }}>
                    ⚖️ Weight Limit: {schedule.maxWeight || 5.0} kg per bag. Extra weight will be charged at ₹{schedule.extraWeightRate || 20}/kg.
                  </p>
                )}
              </div>

              {!canSubmit && (
                <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem', background: 'var(--status-issue-bg)', color: 'var(--status-issue)', borderRadius: '0.75rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                  <AlertCircle size={20} />
                  <div>
                    <p style={{ fontWeight: 600 }}>Not Permitted Today</p>
                    <p>Hostel schedules laundry requests only on: {schedule?.days.join(', ')}. Today is {todayDay}.</p>
                  </div>
                </div>
              )}

              {activeRequest && (
                <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem', background: 'var(--status-pending-bg)', color: 'var(--status-pending)', borderRadius: '0.75rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                  <AlertCircle size={20} />
                  <div>
                    <p style={{ fontWeight: 600 }}>Active Request Pending</p>
                    <p>You cannot submit a new request until your current order ({activeRequest.id}) is Delivered.</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {CLOTHING_TYPES.map((type) => (
                    <div 
                      key={type} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '0.75rem 1rem', 
                        background: 'var(--input-bg)', 
                        borderRadius: '0.75rem',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{type}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button 
                          type="button" 
                          onClick={() => handleQtyChange(type, clothesInput[type] - 1)}
                          disabled={!canSubmit || !!activeRequest}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          -
                        </button>
                        <input 
                          type="number" 
                          min="0"
                          disabled={!canSubmit || !!activeRequest}
                          value={clothesInput[type]} 
                          onChange={(e) => handleQtyChange(type, e.target.value)}
                          style={{ width: '45px', textAlign: 'center', border: 'none', background: 'transparent', fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)' }}
                        />
                        <button 
                          type="button" 
                          onClick={() => handleQtyChange(type, clothesInput[type] + 1)}
                          disabled={!canSubmit || !!activeRequest}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Clothes Selected</p>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                      {Object.values(clothesInput).reduce((a, b) => a + b, 0)} Items
                    </h4>
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={!canSubmit || !!activeRequest || loading}
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>My Laundry History</h3>
              {requests.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No past laundry requests found.</p>
              ) : (
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Request ID</th>
                        <th>Date Submitted</th>
                        <th>Total Items</th>
                        <th>Weight / Fee</th>
                        <th>Clothes Breakdown</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600, color: 'var(--hostel-color)' }}>{r.id}</td>
                          <td>{new Date(r.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                          <td style={{ fontWeight: 600 }}>{r.expectedTotal}</td>
                          <td>
                            {r.weight !== undefined ? `${r.weight} kg` : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                            {r.overLimitCharge > 0 && (
                              <span style={{ display: 'block', color: 'var(--status-issue)', fontSize: '0.8rem', fontWeight: 600 }}>
                                ₹{r.overLimitCharge}
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {Object.entries(r.clothes).map(([name, qty]) => qty > 0 && `${name} (${qty})`).filter(Boolean).join(', ')}
                          </td>
                          <td>
                            <span className={`badge badge-${r.status.split(' ')[0].toLowerCase()}`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* REPORT ISSUE TAB */}
          {activeTab === 'issues' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Report a Laundry Issue</h3>
                <form onSubmit={handleReportIssue} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                      Issue Category
                    </label>
                    <select 
                      className="custom-input"
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                    >
                      <option value="Missing Clothes">Missing Clothes</option>
                      <option value="Damaged Clothes">Damaged Clothes</option>
                      <option value="Wrong Delivery">Wrong Delivery</option>
                      <option value="Lost Tag / Card">Lost Tag / QR Tag Damage</option>
                      <option value="Other Issue">Other Complaint</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                      Related Request ID (Optional)
                    </label>
                    <select 
                      className="custom-input"
                      value={selectedRequestForIssue}
                      onChange={(e) => setSelectedRequestForIssue(e.target.value)}
                    >
                      <option value="">-- Select Request --</option>
                      {requests.map(r => (
                        <option key={r.id} value={r.id}>{r.id} ({new Date(r.createdAt).toLocaleDateString()})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                      Detailed Description
                    </label>
                    <textarea 
                      className="custom-input"
                      rows="4"
                      placeholder="Please specify which item is missing/damaged or describe the tag issue..."
                      value={issueDesc}
                      onChange={(e) => setIssueDesc(e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                    Submit Ticket
                  </button>
                </form>
              </div>

              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>My Reported Issues</h3>
                {issuesList.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No issues filed yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {issuesList.map(issue => (
                      <div key={issue.id} style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{issue.type}</h4>
                          <span className={`badge ${issue.status === 'Resolved' ? 'badge-ready' : 'badge-pending'}`}>
                            {issue.status}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{issue.description}</p>
                        {issue.requestId && (
                          <span style={{ display: 'inline-block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                            Linked to request: <b>{issue.requestId}</b>
                          </span>
                        )}
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', textAlign: 'right' }}>
                          {new Date(issue.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Student Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.95rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Full Name:</span>
                    <span style={{ fontWeight: 600 }}>{user.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Roll Number:</span>
                    <span style={{ fontWeight: 600 }}>{user.rollNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Reg. Number:</span>
                    <span style={{ fontWeight: 600 }}>{user.regNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Hostel:</span>
                    <span style={{ fontWeight: 600 }}>{hostel?.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Room & Floor:</span>
                    <span style={{ fontWeight: 600 }}>Room {user.room}, Floor {user.floor}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Mobile:</span>
                    <span style={{ fontWeight: 600 }}>{user.mobile}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Email:</span>
                    <span style={{ fontWeight: 600 }}>{user.email}</span>
                  </div>
                </div>
              </div>

              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>My Reusable QR Tags</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  These tags must be attached to the clothes before giving them at the laundry counter.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' }}>
                  {user.tags.map((tag) => (
                    <div 
                      key={tag.serialNumber} 
                      style={{ 
                        padding: '0.5rem', 
                        borderRadius: '0.5rem', 
                        border: '1px solid var(--border-color)', 
                        background: tag.status === 'active' ? 'var(--bg-secondary)' : 'var(--status-issue-bg)',
                        textAlign: 'center' 
                      }}
                    >
                      <p style={{ fontSize: '0.85rem', fontWeight: 700, color: tag.status === 'active' ? 'var(--text-primary)' : 'var(--status-issue)' }}>
                        {tag.serialNumber}
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {tag.status}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
