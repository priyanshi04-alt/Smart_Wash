import React, { useState, useEffect } from 'react';
import { 
  WashingMachine, LayoutDashboard, Home, Users, Key, Briefcase, 
  Calendar, ShieldAlert, FileText, Plus, Edit, Trash2, CheckCircle, 
  Search, RefreshCw, X, UserMinus, AlertTriangle, LogOut
} from 'lucide-react';
import { API_URL } from '../config';

export default function AdminPortal({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  
  // Data lists
  const [hostels, setHostels] = useState([]);
  const [students, setStudents] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [requests, setRequests] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [issuesList, setIssuesList] = useState([]);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal toggle & Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); // addHostel, addStudent, addStaff, replaceTag
  
  // New Hostel Form State
  const [newHostelName, setNewHostelName] = useState('');
  const [newHostelColor, setNewHostelColor] = useState('#3b82f6');
  const [newHostelRooms, setNewHostelRooms] = useState('101,102,103,201,202,203');

  // New Student Form State
  const [studentName, setStudentName] = useState('');
  const [studentRoll, setStudentRoll] = useState('');
  const [studentReg, setStudentReg] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentMobile, setStudentMobile] = useState('');
  const [studentHostelId, setStudentHostelId] = useState('');
  const [studentFloor, setStudentFloor] = useState('1');
  const [studentRoom, setStudentRoom] = useState('101');

  // New Staff Form State
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('staff123');
  const [staffHostelId, setStaffHostelId] = useState('');
  const [staffCounter, setStaffCounter] = useState('Counter A');

  // Replace Tag State
  const [selectedStudentForTag, setSelectedStudentForTag] = useState('');
  const [selectedTagToReplace, setSelectedTagToReplace] = useState('');
  const [tagReplaceReason, setTagReplaceReason] = useState('lost');

  // Schedule setup
  const [selectedSchedHostel, setSelectedSchedHostel] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [schedPickup, setSchedPickup] = useState('08:00');
  const [schedDelivery, setSchedDelivery] = useState('18:00');
  const [schedEmergency, setSchedEmergency] = useState(false);

  useEffect(() => {
    fetchAdminData();
    // Default blue theme for Admin
    document.documentElement.style.setProperty('--hostel-color', '#3b82f6');
    document.documentElement.style.setProperty('--hostel-color-light', 'rgba(59, 130, 246, 0.12)');
    document.documentElement.style.setProperty('--hostel-color-hover', '#2563eb');
  }, []);

  const fetchAdminData = async () => {
    try {
      // 1. Fetch dashboard stats
      const statsRes = await fetch(`${API_URL}/api/dashboard/admin`);
      const statsData = await statsRes.json();
      setStats(statsData);

      // 2. Fetch hostels
      const hostelRes = await fetch(`${API_URL}/api/hostels`);
      const hostelData = await hostelRes.json();
      setHostels(hostelData);
      if (hostelData.length > 0) {
        setStudentHostelId(hostelData[0].id);
        setStaffHostelId(hostelData[0].id);
        setSelectedSchedHostel(hostelData[0].id);
      }

      // 3. Fetch students
      const studRes = await fetch(`${API_URL}/api/students`);
      const studData = await studRes.json();
      setStudents(studData);

      // 4. Fetch staff
      const staffRes = await fetch(`${API_URL}/api/staff`);
      const staffData = await staffRes.json();
      setStaffList(staffData);

      // 5. Fetch schedules
      const schedRes = await fetch(`${API_URL}/api/schedules`);
      const schedData = await schedRes.json();
      setSchedules(schedData);

      // Load specific schedule state if schedule selection matches
      const currentSched = schedData.find(s => s.hostelId === (selectedSchedHostel || hostelData[0]?.id));
      if (currentSched) {
        setSelectedDays(currentSched.days);
        setSchedPickup(currentSched.pickup);
        setSchedDelivery(currentSched.delivery);
        setSchedEmergency(currentSched.emergencyEnabled);
      }

      // 6. Fetch requests
      const reqRes = await fetch(`${API_URL}/api/requests`);
      const reqData = await reqRes.json();
      setRequests(reqData);

      // 7. Fetch issues
      const issueRes = await fetch(`${API_URL}/api/issues`);
      const issueData = await issueRes.json();
      setIssuesList(issueData);

    } catch (err) {
      console.error("Failed to load admin data", err);
    }
  };

  const handleCreateHostel = async (e) => {
    e.preventDefault();
    try {
      const roomArr = newHostelRooms.split(',').map(r => r.trim());
      const response = await fetch(`${API_URL}/api/hostels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newHostelName,
          color: newHostelColor,
          rooms: roomArr
        })
      });
      if (!response.ok) throw new Error("Failed to create hostel");
      
      setNewHostelName('');
      setIsModalOpen(false);
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteHostel = async (id) => {
    if (!window.confirm("Are you sure you want to delete this hostel? This deletes all schedules too.")) return;
    try {
      const response = await fetch(`${API_URL}/api/hostels/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error("Failed to delete");
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studentName,
          rollNumber: studentRoll,
          regNumber: studentReg,
          email: studentEmail,
          mobile: studentMobile,
          hostelId: studentHostelId,
          floor: parseInt(studentFloor),
          room: studentRoom
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create student");

      // Reset
      setStudentName('');
      setStudentRoll('');
      setStudentReg('');
      setStudentEmail('');
      setStudentMobile('');
      setIsModalOpen(false);
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleStudent = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/students/${id}/toggle-status`, { method: 'POST' });
      if (!response.ok) throw new Error("Failed to toggle status");
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: staffName,
          email: staffEmail,
          password: staffPassword,
          hostelId: staffHostelId,
          counter: staffCounter
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create staff");

      setStaffName('');
      setStaffEmail('');
      setStaffPassword('staff123');
      setIsModalOpen(false);
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm("Delete this staff member?")) return;
    try {
      const response = await fetch(`${API_URL}/api/staff/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error("Failed to delete");
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReplaceTag = async (e) => {
    e.preventDefault();
    if (!selectedStudentForTag || !selectedTagToReplace) return;
    try {
      const response = await fetch(`${API_URL}/api/students/${selectedStudentForTag}/replace-tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldTagSerial: selectedTagToReplace,
          reason: tagReplaceReason
        })
      });
      if (!response.ok) throw new Error("Failed to replace tag");
      
      setIsModalOpen(false);
      setSelectedStudentForTag('');
      setSelectedTagToReplace('');
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleTagStatus = async (studentId, tagSerial) => {
    try {
      const response = await fetch(`${API_URL}/api/students/${studentId}/disable-tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagSerial })
      });
      if (!response.ok) throw new Error("Failed to update status");
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResolveIssue = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/issues/${id}/resolve`, { method: 'POST' });
      if (!response.ok) throw new Error("Failed to resolve issue");
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!selectedSchedHostel) return;
    try {
      const response = await fetch(`${API_URL}/api/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostelId: selectedSchedHostel,
          days: selectedDays,
          pickup: schedPickup,
          delivery: schedDelivery,
          emergencyEnabled: schedEmergency
        })
      });
      if (!response.ok) throw new Error("Failed to save schedule");
      
      alert("Hostel schedule saved successfully!");
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSchedHostelChange = (hostelId) => {
    setSelectedSchedHostel(hostelId);
    const sched = schedules.find(s => s.hostelId === hostelId);
    if (sched) {
      setSelectedDays(sched.days);
      setSchedPickup(sched.pickup);
      setSchedDelivery(sched.delivery);
      setSchedEmergency(sched.emergencyEnabled);
    } else {
      setSelectedDays([]);
      setSchedPickup('08:00');
      setSchedDelivery('18:00');
      setSchedEmergency(false);
    }
  };

  const handleDayCheckboxChange = (day) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // Get active student details for tag replacement modal
  const activeStudentForTag = students.find(s => s.id === selectedStudentForTag);

  // Filter students
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.laundryId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter requests
  const filteredRequests = requests.filter(r => 
    r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.laundryId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <WashingMachine size={28} style={{ color: 'var(--hostel-color)' }} />
          <span>SmartWash Admin</span>
        </div>
        <nav className="sidebar-menu">
          <button className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setSearchQuery(''); }}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button className={`sidebar-item ${activeTab === 'hostels' ? 'active' : ''}`} onClick={() => { setActiveTab('hostels'); setSearchQuery(''); }}>
            <Home size={20} /> Hostels
          </button>
          <button className={`sidebar-item ${activeTab === 'students' ? 'active' : ''}`} onClick={() => { setActiveTab('students'); setSearchQuery(''); }}>
            <Users size={20} /> Student Mapping
          </button>
          <button className={`sidebar-item ${activeTab === 'tags' ? 'active' : ''}`} onClick={() => { setActiveTab('tags'); setSearchQuery(''); }}>
            <Key size={20} /> Laundry ID & Tags
          </button>
          <button className={`sidebar-item ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => { setActiveTab('staff'); setSearchQuery(''); }}>
            <Briefcase size={20} /> Staff Accounts
          </button>
          <button className={`sidebar-item ${activeTab === 'schedules' ? 'active' : ''}`} onClick={() => { setActiveTab('schedules'); setSearchQuery(''); }}>
            <Calendar size={20} /> Scheduling
          </button>
          <button className={`sidebar-item ${activeTab === 'monitoring' ? 'active' : ''}`} onClick={() => { setActiveTab('monitoring'); setSearchQuery(''); }}>
            <FileText size={20} /> Monitoring
          </button>
          <button className={`sidebar-item ${activeTab === 'issues' ? 'active' : ''}`} onClick={() => { setActiveTab('issues'); setSearchQuery(''); }}>
            <ShieldAlert size={20} /> Issues & Complaints
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <p style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 0.5rem' }}>{user.name}</p>
          <button onClick={onLogout} className="sidebar-item" style={{ color: 'var(--status-issue)', border: 'none', background: 'none', width: '100%', textAlign: 'left' }}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="main-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>System Controller Portal</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Global Campus Dashboard</p>
          </div>
          <button onClick={fetchAdminData} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem' }}>
            <RefreshCw size={16} /> Refresh
          </button>
        </header>

        <div className="page-container">

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && stats && (
            <>
              {/* Metric Row */}
              <div className="dashboard-grid">
                <div className="glass-card stats-card">
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Total Hostels</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{stats.totalHostels}</h3>
                  </div>
                  <div className="stats-icon" style={{ backgroundColor: '#3b82f6' }}><Home size={24} /></div>
                </div>
                <div className="glass-card stats-card">
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Active Students</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{stats.totalStudents}</h3>
                  </div>
                  <div className="stats-icon" style={{ backgroundColor: '#a855f7' }}><Users size={24} /></div>
                </div>
                <div className="glass-card stats-card">
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Laundry Desk Staff</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{stats.totalStaff}</h3>
                  </div>
                  <div className="stats-icon" style={{ backgroundColor: '#10b981' }}><Briefcase size={24} /></div>
                </div>
                <div className="glass-card stats-card">
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Today's Orders</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{stats.todayRequestsCount}</h3>
                  </div>
                  <div className="stats-icon" style={{ backgroundColor: '#f59e0b' }}><WashingMachine size={24} /></div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                {/* SVG Daily chart */}
                <div className="glass-card">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Daily Request Volume (Last 7 Days)</h3>
                  <div style={{ height: '220px', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 1rem 2rem 1rem' }}>
                    {stats.dailyCounts.map((day) => {
                      const maxVal = Math.max(...stats.dailyCounts.map(d => d.count), 5);
                      const percentage = (day.count / maxVal) * 100;
                      return (
                        <div key={day.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{day.count}</span>
                          <div style={{ width: '32px', height: `${percentage * 1.5}px`, background: 'linear-gradient(to top, var(--hostel-color), var(--hostel-color-hover))', borderRadius: '4px' }}></div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{day.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Hostel-wise laundry share */}
                <div className="glass-card">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Hostel-wise Request Share</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {stats.hostelStats.map(h => (
                      <div key={h.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem', fontWeight: 600 }}>
                          <span>{h.name}</span>
                          <span>{h.count} orders</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--input-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min((h.count / Math.max(...stats.hostelStats.map(hs => hs.count), 1)) * 100, 100)}%`, height: '100%', backgroundColor: h.color }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent activity timeline */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Recent Laundry Activities</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {stats.recentActivities.map((act, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                      <div>
                        <span>Student <b>{act.studentName}</b> ({act.laundryId}) status moved to </span>
                        <span className={`badge badge-${act.status.split(' ')[0].toLowerCase()}`} style={{ marginLeft: '0.25rem' }}>{act.status}</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  {stats.recentActivities.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No recent activity logged.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* HOSTELS TAB */}
          {activeTab === 'hostels' && (
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Hostel Campus Configurations</h3>
                <button onClick={() => { setModalType('addHostel'); setIsModalOpen(true); }} className="btn btn-primary">
                  <Plus size={16} /> Add Hostel
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {hostels.map(h => (
                  <div key={h.id} className="glass-card" style={{ borderLeft: `6px solid ${h.color}`, display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', gap: '1rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{h.name}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        ID: <b>{h.id}</b> • Assigned Theme Color: 
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: h.color, marginLeft: '0.5rem' }}></span>
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem' }}>
                      <button onClick={() => handleDeleteHostel(h.id)} className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STUDENT MAPPING TAB */}
          {activeTab === 'students' && (
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Registered Students & Room Mapping</h3>
                
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      className="custom-input"
                      placeholder="Search students..."
                      style={{ paddingLeft: '2.5rem', maxWidth: '240px' }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button onClick={() => { setModalType('addStudent'); setIsModalOpen(true); }} className="btn btn-primary">
                    <Plus size={16} /> Register Student
                  </button>
                </div>
              </div>

              <div className="custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Roll Number</th>
                      <th>Hostel</th>
                      <th>Room & Floor</th>
                      <th>Laundry ID</th>
                      <th>Email / Phone</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td>{s.rollNumber}</td>
                        <td>
                          <span className="badge" style={{ backgroundColor: `${s.hostelColor}1e`, color: s.hostelColor }}>
                            {s.hostelName}
                          </span>
                        </td>
                        <td>Room {s.room} (Flr {s.floor})</td>
                        <td style={{ fontWeight: 700, color: 'var(--hostel-color)' }}>{s.laundryId}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {s.email} <br/> {s.mobile}
                        </td>
                        <td>
                          <button 
                            onClick={() => handleToggleStudent(s.id)}
                            className={`btn ${s.status === 'active' ? 'btn-secondary' : 'btn-danger'}`}
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            {s.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LAUNDRY ID & TAGS TAB */}
          {activeTab === 'tags' && (
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>QR Tag Allocation & Management</h3>
                <button onClick={() => { setModalType('replaceTag'); setIsModalOpen(true); }} className="btn btn-primary">
                  Replace Lost Tag
                </button>
              </div>

              <div className="custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Laundry ID</th>
                      <th>Tag Allocation & Statuses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id}>
                        <td>
                          <p style={{ fontWeight: 600 }}>{s.name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Room {s.room}, {s.email}</p>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--hostel-color)' }}>{s.laundryId}</td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {s.tags.map(t => (
                              <div 
                                key={t.serialNumber}
                                onClick={() => handleToggleTagStatus(s.id, t.serialNumber)}
                                title="Click to Toggle Active/Disabled status"
                                style={{ 
                                  padding: '0.2rem 0.4rem', 
                                  borderRadius: '0.25rem', 
                                  border: '1px solid var(--border-color)', 
                                  background: t.status === 'active' ? 'var(--input-bg)' : 'var(--status-issue-bg)',
                                  color: t.status === 'active' ? 'var(--text-primary)' : 'var(--status-issue)',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  fontWeight: '600'
                                }}
                              >
                                {t.serialNumber} ({t.status.charAt(0)})
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STAFF TAB */}
          {activeTab === 'staff' && (
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Laundry Staff Credentials</h3>
                <button onClick={() => { setModalType('addStaff'); setIsModalOpen(true); }} className="btn btn-primary">
                  <Plus size={16} /> Add Staff Account
                </button>
              </div>

              <div className="custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Staff Name</th>
                      <th>Email ID</th>
                      <th>Assigned Hostel</th>
                      <th>Assigned Counter</th>
                      <th>Security</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td>{s.email}</td>
                        <td>
                          <span className="badge" style={{ backgroundColor: `${s.hostelColor}1e`, color: s.hostelColor }}>
                            {s.hostelName}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{s.counter}</td>
                        <td style={{ fontFamily: 'monospace' }}>{s.password}</td>
                        <td>
                          <button onClick={() => handleDeleteStaff(s.id)} className="btn btn-danger" style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SCHEDULING TAB */}
          {activeTab === 'schedules' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Configure Hostel Schedule</h3>
                
                <form onSubmit={handleSaveSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                      Select Hostel
                    </label>
                    <select
                      className="custom-input"
                      value={selectedSchedHostel}
                      onChange={(e) => handleSchedHostelChange(e.target.value)}
                    >
                      {hostels.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                      Assigned Laundry Days
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                        <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedDays.includes(day)}
                            onChange={() => handleDayCheckboxChange(day)}
                          />
                          {day}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                        Pickup Start Time
                      </label>
                      <input 
                        type="time" 
                        className="custom-input"
                        value={schedPickup}
                        onChange={(e) => setSchedPickup(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                        Delivery Time
                      </label>
                      <input 
                        type="time" 
                        className="custom-input"
                        value={schedDelivery}
                        onChange={(e) => setSchedDelivery(e.target.value)}
                      />
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={schedEmergency}
                      onChange={(e) => setSchedEmergency(e.target.checked)}
                    />
                    Enable Emergency Laundry submissions (overrides schedule check)
                  </label>

                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                    Save Schedule config
                  </button>
                </form>
              </div>

              {/* Schedules list */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Hostel Calendars</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {schedules.map(s => {
                    const hostelDetails = hostels.find(h => h.id === s.hostelId);
                    return (
                      <div 
                        key={s.hostelId} 
                        style={{ 
                          padding: '1rem', 
                          background: 'var(--bg-secondary)', 
                          borderRadius: '0.75rem', 
                          border: '1px solid var(--border-color)',
                          borderLeft: `5px solid ${hostelDetails?.color || '#ccc'}`
                        }}
                      >
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{hostelDetails?.name}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Days: <b>{s.days.length > 0 ? s.days.join(', ') : 'None configured'}</b>
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Time: {s.pickup} to {s.delivery} • Emergency Allowed: {s.emergencyEnabled ? 'Yes 🟢' : 'No 🔴'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* MONITORING TAB */}
          {activeTab === 'monitoring' && (
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Laundry Requests Monitoring Panel</h3>
                
                <div style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="custom-input"
                    placeholder="Search requests..."
                    style={{ paddingLeft: '2.5rem', maxWidth: '240px' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Req ID</th>
                      <th>Student Name</th>
                      <th>Laundry ID</th>
                      <th>Hostel</th>
                      <th>Total Items</th>
                      <th>Scanned Tags</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600, color: 'var(--hostel-color)' }}>{r.id}</td>
                        <td style={{ fontWeight: 600 }}>{r.studentName}</td>
                        <td>
                          <span className="badge" style={{ backgroundColor: 'var(--hostel-color-light)', color: 'var(--hostel-color)' }}>
                            {r.laundryId}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{ backgroundColor: `${r.hostelColor}1e`, color: r.hostelColor }}>
                            {r.hostelName}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{r.expectedTotal}</td>
                        <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {r.scannedTags.length > 0 ? r.scannedTags.join(', ') : 'None'}
                        </td>
                        <td>
                          <span className={`badge badge-${r.status.split(' ')[0].toLowerCase()}`}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ISSUES TAB */}
          {activeTab === 'issues' && (
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Active Helpdesk complaints</h3>

              {issuesList.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No student issues reported.</p>
              ) : (
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Issue ID</th>
                        <th>Student Details</th>
                        <th>Category</th>
                        <th>Complaint Details</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issuesList.map(iss => (
                        <tr key={iss.id}>
                          <td style={{ fontWeight: 600, color: 'var(--status-issue)' }}>{iss.id}</td>
                          <td>
                            <p style={{ fontWeight: 600 }}>{iss.studentName}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>LID: {iss.laundryId}</p>
                          </td>
                          <td>
                            <span className="badge badge-issue">{iss.type}</span>
                          </td>
                          <td>
                            <p style={{ fontSize: '0.9rem' }}>{iss.description}</p>
                            {iss.requestId && (
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                Linked request: <b>{iss.requestId}</b>
                              </p>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${iss.status === 'Resolved' ? 'badge-ready' : 'badge-pending'}`}>
                              {iss.status}
                            </span>
                          </td>
                          <td>
                            {iss.status !== 'Resolved' ? (
                              <button 
                                onClick={() => handleResolveIssue(iss.id)}
                                className="btn btn-primary"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'var(--status-ready)' }}
                              >
                                Resolve
                              </button>
                            ) : (
                              <span style={{ color: 'var(--status-ready)', fontSize: '0.85rem', fontWeight: 600 }}>Closed</span>
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

        </div>
      </main>

      {/* POPUP MODALS PANEL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {modalType === 'addHostel' && 'Add Hostel Campus'}
                {modalType === 'addStudent' && 'Register New Student'}
                {modalType === 'addStaff' && 'Create Staff Account'}
                {modalType === 'replaceTag' && 'Replace Student Lost Tag'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            {/* ADD HOSTEL FORM */}
            {modalType === 'addHostel' && (
              <form onSubmit={handleCreateHostel} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Hostel Name</label>
                  <input type="text" required placeholder="Girls Hostel C" className="custom-input" value={newHostelName} onChange={(e) => setNewHostelName(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Theme Color</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="color" className="custom-input" style={{ width: '60px', padding: '0.2rem', height: '40px' }} value={newHostelColor} onChange={(e) => setNewHostelColor(e.target.value)} />
                    <span style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>{newHostelColor}</span>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Rooms list (comma separated)</label>
                  <input type="text" placeholder="101, 102, 103..." className="custom-input" value={newHostelRooms} onChange={(e) => setNewHostelRooms(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Create Hostel</button>
              </form>
            )}

            {/* ADD STUDENT FORM */}
            {modalType === 'addStudent' && (
              <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Full Name</label>
                    <input type="text" required placeholder="Rohan Das" className="custom-input" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Roll Number</label>
                    <input type="text" required placeholder="2026ME304" className="custom-input" value={studentRoll} onChange={(e) => setStudentRoll(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Reg. Number</label>
                    <input type="text" required placeholder="REG88410" className="custom-input" value={studentReg} onChange={(e) => setStudentReg(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Mobile</label>
                    <input type="text" required placeholder="9123456789" className="custom-input" value={studentMobile} onChange={(e) => setStudentMobile(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Email</label>
                  <input type="email" required placeholder="rohan@univ.edu" className="custom-input" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Hostel</label>
                    <select className="custom-input" value={studentHostelId} onChange={(e) => setStudentHostelId(e.target.value)}>
                      {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Floor</label>
                    <input type="number" required min="1" className="custom-input" value={studentFloor} onChange={(e) => setStudentFloor(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Room</label>
                    <input type="text" required placeholder="102" className="custom-input" value={studentRoom} onChange={(e) => setStudentRoom(e.target.value)} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Register Student & Allocate Tags</button>
              </form>
            )}

            {/* ADD STAFF FORM */}
            {modalType === 'addStaff' && (
              <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Staff Name</label>
                  <input type="text" required placeholder="Ramesh Prasad" className="custom-input" value={staffName} onChange={(e) => setStaffName(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Email Address</label>
                  <input type="email" required placeholder="ramesh@univ.edu" className="custom-input" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Password</label>
                    <input type="text" required placeholder="staff123" className="custom-input" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Desk Counter</label>
                    <input type="text" required placeholder="Counter B" className="custom-input" value={staffCounter} onChange={(e) => setStaffCounter(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Assign Hostel Assignment</label>
                  <select className="custom-input" value={staffHostelId} onChange={(e) => setStaffHostelId(e.target.value)}>
                    {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Create Account</button>
              </form>
            )}

            {/* REPLACE LOST TAG FORM */}
            {modalType === 'replaceTag' && (
              <form onSubmit={handleReplaceTag} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Select Student</label>
                  <select 
                    className="custom-input" 
                    value={selectedStudentForTag} 
                    required
                    onChange={(e) => {
                      setSelectedStudentForTag(e.target.value);
                      setSelectedTagToReplace('');
                    }}
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.laundryId})</option>)}
                  </select>
                </div>
                {selectedStudentForTag && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Select Tag to Replace</label>
                    <select 
                      className="custom-input" 
                      value={selectedTagToReplace} 
                      required
                      onChange={(e) => setSelectedTagToReplace(e.target.value)}
                    >
                      <option value="">-- Choose Tag Serial --</option>
                      {activeStudentForTag?.tags.filter(t => t.status === 'active').map(t => (
                        <option key={t.serialNumber} value={t.serialNumber}>{t.serialNumber}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Reason for Replacement</label>
                  <select className="custom-input" value={tagReplaceReason} onChange={(e) => setTagReplaceReason(e.target.value)}>
                    <option value="lost">Lost Tag</option>
                    <option value="damaged">Damaged Tag</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Deactivate Old & Issue Replacement</button>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
