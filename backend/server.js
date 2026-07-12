import express from 'express';
import cors from 'cors';
import { readDb, writeDb } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

// --- AUTHENTICATION ---
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  
  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  
  let profile = { ...user };
  if (user.role === 'student') {
    const student = db.students.find(s => s.id === user.studentId);
    profile = { ...profile, ...student };
  } else if (user.role === 'staff') {
    // Attach hostel details
    const hostel = db.hostels.find(h => h.id === user.hostelId);
    profile = { ...profile, hostelName: hostel ? hostel.name : 'Unknown Hostel' };
  }
  
  res.json({ token: `token-${user.id}`, user: profile });
});

// --- DASHBOARD & ANALYTICS ---
app.get('/api/dashboard/admin', (req, res) => {
  const db = readDb();
  
  const totalHostels = db.hostels.length;
  const totalStudents = db.students.length;
  const totalStaff = db.users.filter(u => u.role === 'staff').length;
  
  const today = new Date().toISOString().split('T')[0];
  const todayRequests = db.requests.filter(r => r.createdAt.startsWith(today));
  
  const pendingRequests = db.requests.filter(r => r.status !== 'Delivered').length;
  const completedRequests = db.requests.filter(r => r.status === 'Delivered').length;
  
  // Calculate hostel stats (request distribution)
  const hostelStats = db.hostels.map(h => {
    const count = db.requests.filter(r => r.hostelId === h.id).length;
    return { name: h.name, count, color: h.color };
  });

  // Daily laundry count (mock for last 7 days)
  const dailyCounts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = db.requests.filter(r => r.createdAt.startsWith(dateStr)).length;
    
    // Label as Mon, Tue, etc.
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    dailyCounts.push({ label, count, date: dateStr });
  }

  // Recent activity logs
  const recentActivities = [];
  const allHistory = db.requests.flatMap(r => {
    return r.history.map(h => ({
      studentName: r.studentName,
      laundryId: r.laundryId,
      status: h.status,
      timestamp: h.timestamp,
      note: h.note
    }));
  });
  
  allHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const recent = allHistory.slice(0, 8);

  res.json({
    totalHostels,
    totalStudents,
    totalStaff,
    todayRequestsCount: todayRequests.length,
    pendingRequests,
    completedRequests,
    hostelStats,
    dailyCounts,
    recentActivities: recent
  });
});

// --- HOSTELS ---
app.get('/api/hostels', (req, res) => {
  const db = readDb();
  res.json(db.hostels);
});

app.post('/api/hostels', (req, res) => {
  const { name, color, rooms } = req.body;
  const db = readDb();
  
  const id = 'h' + (db.hostels.length + 1);
  const newHostel = { id, name, color };
  db.hostels.push(newHostel);
  
  // Add rooms if specified
  db.rooms[id] = rooms || ["101", "102", "103"];
  
  // Initialize schedule
  db.schedules.push({
    hostelId: id,
    days: ["Monday"],
    pickup: "08:00",
    delivery: "18:00",
    emergencyEnabled: false
  });

  writeDb(db);
  res.status(201).json(newHostel);
});

app.put('/api/hostels/:id', (req, res) => {
  const { id } = req.params;
  const { name, color, rooms } = req.body;
  const db = readDb();
  
  const idx = db.hostels.findIndex(h => h.id === id);
  if (idx === -1) return res.status(404).json({ message: "Hostel not found" });
  
  db.hostels[idx] = { ...db.hostels[idx], name, color };
  if (rooms) {
    db.rooms[id] = rooms;
  }
  
  writeDb(db);
  res.json(db.hostels[idx]);
});

app.delete('/api/hostels/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  
  db.hostels = db.hostels.filter(h => h.id !== id);
  delete db.rooms[id];
  db.schedules = db.schedules.filter(s => s.hostelId !== id);
  
  writeDb(db);
  res.json({ message: "Hostel deleted successfully" });
});

// Get rooms of a hostel
app.get('/api/hostels/:id/rooms', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  res.json(db.rooms[id] || []);
});

// --- STUDENTS ---
app.get('/api/students', (req, res) => {
  const db = readDb();
  
  // Map hostel names
  const students = db.students.map(s => {
    const hostel = db.hostels.find(h => h.id === s.hostelId);
    return { ...s, hostelName: hostel ? hostel.name : 'Unknown', hostelColor: hostel ? hostel.color : '#6b7280' };
  });
  
  res.json(students);
});

app.post('/api/students', (req, res) => {
  const studentData = req.body; // name, rollNumber, regNumber, email, mobile, hostelId, floor, room
  const db = readDb();
  
  // Check if roll number or email exists
  const exists = db.students.some(s => s.rollNumber === studentData.rollNumber || s.email === studentData.email);
  if (exists) {
    return res.status(400).json({ message: "Student with this Roll Number or Email already exists" });
  }
  
  const id = 's' + (db.students.length + 1);
  const laundryId = `LID-${Math.floor(1000 + Math.random() * 9000)}`;
  
  // Generate 20 unique tags
  const startTagNum = (db.students.flatMap(s => s.tags).length * 2) + 1; // simple offset to make Txxxx unique
  const tags = Array.from({ length: 20 }, (_, i) => ({
    serialNumber: `T${String(10000 + startTagNum + i).slice(1)}`,
    status: "active"
  }));
  
  const newStudent = {
    id,
    ...studentData,
    laundryId,
    tags,
    status: "active"
  };
  
  db.students.push(newStudent);
  
  // Create student user account
  db.users.push({
    id: generateId(),
    email: studentData.email,
    password: studentData.rollNumber, // default password is rollNumber
    role: "student",
    studentId: id
  });
  
  writeDb(db);
  res.status(201).json(newStudent);
});

app.put('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const db = readDb();
  
  const idx = db.students.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ message: "Student not found" });
  
  db.students[idx] = { ...db.students[idx], ...data };
  writeDb(db);
  res.json(db.students[idx]);
});

app.post('/api/students/:id/toggle-status', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  
  const idx = db.students.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ message: "Student not found" });
  
  db.students[idx].status = db.students[idx].status === 'active' ? 'inactive' : 'active';
  writeDb(db);
  res.json(db.students[idx]);
});

// --- LAUNDRY ID & TAG MANAGEMENT ---
app.post('/api/students/:id/replace-tag', (req, res) => {
  const { id } = req.params;
  const { oldTagSerial, reason } = req.body; // reason: "lost" or "damaged"
  const db = readDb();
  
  const studentIdx = db.students.findIndex(s => s.id === id);
  if (studentIdx === -1) return res.status(404).json({ message: "Student not found" });
  
  const student = db.students[studentIdx];
  const tagIdx = student.tags.findIndex(t => t.serialNumber === oldTagSerial);
  if (tagIdx === -1) return res.status(404).json({ message: "Tag not found for this student" });
  
  // Disable old tag
  student.tags[tagIdx].status = reason;
  
  // Issue new tag
  const allTags = db.students.flatMap(s => s.tags);
  const nextTagNum = allTags.length + 10001; // Ensure unique serial
  const newTagSerial = `T${String(nextTagNum).slice(1)}`;
  
  student.tags.push({
    serialNumber: newTagSerial,
    status: "active"
  });
  
  // Log issue if needed
  db.issues.push({
    id: generateId(),
    type: "Tag Replaced",
    studentId: id,
    studentName: student.name,
    laundryId: student.laundryId,
    description: `Tag ${oldTagSerial} marked as ${reason}. Replaced with ${newTagSerial}.`,
    status: "Resolved",
    createdAt: new Date().toISOString()
  });

  writeDb(db);
  res.json({ message: "Tag replaced successfully", newTag: newTagSerial, tags: student.tags });
});

app.post('/api/students/:id/disable-tag', (req, res) => {
  const { id } = req.params;
  const { tagSerial } = req.body;
  const db = readDb();
  
  const studentIdx = db.students.findIndex(s => s.id === id);
  if (studentIdx === -1) return res.status(404).json({ message: "Student not found" });
  
  const student = db.students[studentIdx];
  const tagIdx = student.tags.findIndex(t => t.serialNumber === tagSerial);
  if (tagIdx === -1) return res.status(404).json({ message: "Tag not found" });
  
  // Toggle status between active and disabled
  const currentStatus = student.tags[tagIdx].status;
  student.tags[tagIdx].status = currentStatus === 'active' ? 'disabled' : 'active';
  
  writeDb(db);
  res.json({ message: `Tag status updated to ${student.tags[tagIdx].status}`, tags: student.tags });
});

// --- STAFF ---
app.get('/api/staff', (req, res) => {
  const db = readDb();
  const staff = db.users.filter(u => u.role === 'staff').map(s => {
    const hostel = db.hostels.find(h => h.id === s.hostelId);
    return {
      ...s,
      hostelName: hostel ? hostel.name : 'All Hostels',
      hostelColor: hostel ? hostel.color : '#4b5563'
    };
  });
  res.json(staff);
});

app.post('/api/staff', (req, res) => {
  const { name, email, password, hostelId, counter } = req.body;
  const db = readDb();
  
  if (db.users.some(u => u.email === email)) {
    return res.status(400).json({ message: "User with this email already exists" });
  }
  
  const newStaff = {
    id: generateId(),
    name,
    email,
    password,
    role: "staff",
    hostelId,
    counter: counter || "Main Counter"
  };
  
  db.users.push(newStaff);
  writeDb(db);
  res.status(201).json(newStaff);
});

app.put('/api/staff/:id', (req, res) => {
  const { id } = req.params;
  const { name, hostelId, counter, password } = req.body;
  const db = readDb();
  
  const idx = db.users.findIndex(u => u.id === id && u.role === 'staff');
  if (idx === -1) return res.status(404).json({ message: "Staff not found" });
  
  db.users[idx] = { ...db.users[idx], name, hostelId, counter };
  if (password) {
    db.users[idx].password = password;
  }
  
  writeDb(db);
  res.json(db.users[idx]);
});

app.delete('/api/staff/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  
  db.users = db.users.filter(u => u.id !== id);
  writeDb(db);
  res.json({ message: "Staff member deleted successfully" });
});

// --- SCHEDULES ---
app.get('/api/schedules', (req, res) => {
  const db = readDb();
  res.json(db.schedules);
});

app.post('/api/schedules', (req, res) => {
  const { hostelId, days, pickup, delivery, emergencyEnabled } = req.body;
  const db = readDb();
  
  const idx = db.schedules.findIndex(s => s.hostelId === hostelId);
  if (idx !== -1) {
    db.schedules[idx] = { hostelId, days, pickup, delivery, emergencyEnabled };
  } else {
    db.schedules.push({ hostelId, days, pickup, delivery, emergencyEnabled });
  }
  
  writeDb(db);
  res.json({ message: "Schedule updated successfully" });
});

// --- LAUNDRY REQUESTS PIPELINE ---

// Submit a new request (Student)
app.post('/api/requests', (req, res) => {
  const { studentId, clothes } = req.body; // clothes: { Shirts: 3, Pants: 2... }
  const db = readDb();
  
  const student = db.students.find(s => s.id === studentId);
  if (!student) return res.status(404).json({ message: "Student not found" });
  
  // Check if there is already an active pending request (not delivered)
  const activeRequest = db.requests.find(r => r.studentId === studentId && r.status !== 'Delivered');
  if (activeRequest) {
    return res.status(400).json({ message: "You already have a pending laundry request in progress." });
  }
  
  // Check schedule validation
  const schedule = db.schedules.find(s => s.hostelId === student.hostelId);
  const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  
  if (schedule && !schedule.days.includes(todayDay) && !schedule.emergencyEnabled) {
    return res.status(400).json({ message: `Today is not your hostel's scheduled laundry day (${schedule.days.join(', ')}).` });
  }

  const expectedTotal = Object.values(clothes).reduce((a, b) => a + Number(b), 0);
  if (expectedTotal <= 0) {
    return res.status(400).json({ message: "Please select at least 1 item to submit." });
  }
  
  const newRequest = {
    id: 'r' + (db.requests.length + 1),
    studentId,
    studentName: student.name,
    laundryId: student.laundryId,
    hostelId: student.hostelId,
    room: student.room,
    clothes,
    expectedTotal,
    scannedTags: [],
    status: "Waiting for Verification",
    issue: null,
    createdAt: new Date().toISOString(),
    history: [
      { status: "Waiting for Verification", timestamp: new Date().toISOString(), note: "Request submitted by student" }
    ]
  };
  
  db.requests.push(newRequest);
  writeDb(db);
  res.status(201).json(newRequest);
});

// Get request tracking by student id
app.get('/api/requests/student/:studentId', (req, res) => {
  const { studentId } = req.params;
  const db = readDb();
  
  const requests = db.requests.filter(r => r.studentId === studentId);
  // Sort descending by date
  requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(requests);
});

// Get all requests for staff queue (filtered by staff hostel assignment)
app.get('/api/requests/staff/:hostelId', (req, res) => {
  const { hostelId } = req.params;
  const db = readDb();
  
  // Show all requests for that hostel that are not delivered
  const queue = db.requests.filter(r => r.hostelId === hostelId && r.status !== 'Delivered');
  res.json(queue);
});

// Get all requests (for Admin dashboard / monitoring)
app.get('/api/requests', (req, res) => {
  const db = readDb();
  
  // Map names/colors for display
  const requests = db.requests.map(r => {
    const hostel = db.hostels.find(h => h.id === r.hostelId);
    return {
      ...r,
      hostelName: hostel ? hostel.name : 'Unknown',
      hostelColor: hostel ? hostel.color : '#9ca3af'
    };
  });
  
  requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(requests);
});

// --- SCANNING WORKFLOW ---

// 1. Scan First Tag: open request
app.post('/api/requests/scan-first', (req, res) => {
  const { payload } = req.body; // Format: "LID-1023 | T00001" or just "LID-1023"
  const db = readDb();
  
  if (!payload) return res.status(400).json({ message: "Invalid scan payload" });
  
  const parts = payload.split('|').map(p => p.trim());
  const laundryId = parts[0];
  const tagSerial = parts[1]; // might be undefined if student just scanned card
  
  // Find student by laundryId
  const student = db.students.find(s => s.laundryId === laundryId);
  if (!student) {
    return res.status(404).json({ message: `No student found with Laundry ID: ${laundryId}` });
  }
  
  // Check if student is active
  if (student.status !== 'active') {
    return res.status(400).json({ message: `Student status is deactivated.` });
  }
  
  // Find current request in "Waiting for Verification"
  const request = db.requests.find(r => r.studentId === student.id && r.status === 'Waiting for Verification');
  if (!request) {
    return res.status(404).json({ message: `No pending 'Waiting for Verification' laundry request found for student ${student.name} (${laundryId}).` });
  }
  
  // If a tag serial was in the payload, perform the verification for it
  if (tagSerial) {
    // Check if tag belongs to student
    const tag = student.tags.find(t => t.serialNumber === tagSerial);
    if (!tag) {
      return res.status(400).json({ message: `Scanned tag ${tagSerial} does not belong to student ${student.name} (${laundryId}).` });
    }
    
    // Check if tag is active
    if (tag.status !== 'active') {
      return res.status(400).json({ message: `This tag (${tagSerial}) is marked as ${tag.status}. Cannot use.` });
    }
    
    // Add tag if not already scanned
    if (!request.scannedTags.includes(tagSerial)) {
      request.scannedTags.push(tagSerial);
      writeDb(db);
    }
  }
  
  res.json({ request, student });
});

// 2. Scan remaining tags
app.post('/api/requests/scan-tag', (req, res) => {
  const { requestId, payload } = req.body; // payload: "LID-1023 | T00002"
  const db = readDb();
  
  const requestIdx = db.requests.findIndex(r => r.id === requestId);
  if (requestIdx === -1) {
    return res.status(404).json({ message: "Laundry request not found" });
  }
  const request = db.requests[requestIdx];
  
  if (!payload || !payload.includes('|')) {
    return res.status(400).json({ message: "Invalid QR tag format. Expected 'LaundryID | TagSerial'" });
  }
  
  const [laundryId, tagSerial] = payload.split('|').map(p => p.trim());
  
  // Verify student Laundry ID matches request
  if (request.laundryId !== laundryId) {
    return res.status(400).json({
      message: `Tag Mismatch! This tag belongs to Laundry ID ${laundryId}, but the open request is for ${request.laundryId}.`
    });
  }
  
  // Verify tag belongs to student and is active
  const student = db.students.find(s => s.id === request.studentId);
  const studentTag = student?.tags.find(t => t.serialNumber === tagSerial);
  
  if (!studentTag) {
    return res.status(400).json({ message: `Tag ${tagSerial} is not registered to this student.` });
  }
  
  if (studentTag.status !== 'active') {
    return res.status(400).json({ message: `Tag ${tagSerial} is marked as ${studentTag.status} and cannot be scanned.` });
  }
  
  // Toggle tag logic: If already scanned, deselect it (remove from scannedTags)
  if (request.scannedTags.includes(tagSerial)) {
    request.scannedTags = request.scannedTags.filter(t => t !== tagSerial);
    writeDb(db);
    return res.json({ request, message: `Tag ${tagSerial} deselected.` });
  }
  
  // Otherwise, add tag (select it)
  request.scannedTags.push(tagSerial);
  writeDb(db);
  
  res.json({ request, message: `Tag ${tagSerial} selected.` });
});

// 3. Scan tag for delivery (opens order and marks delivered)
app.post('/api/requests/scan-delivery', (req, res) => {
  const { payload } = req.body;
  const db = readDb();
  
  if (!payload) return res.status(400).json({ message: "Scan payload is empty" });
  
  const [laundryId, tagSerial] = payload.split('|').map(p => p.trim());
  
  // Find student by laundryId or tagSerial
  let student = db.students.find(s => s.laundryId === laundryId);
  if (!student && tagSerial) {
    student = db.students.find(s => s.tags.some(t => t.serialNumber === tagSerial));
  }
  
  if (!student) {
    return res.status(404).json({ message: `No student found for this scan.` });
  }
  
  // Find request in "Ready" status
  const request = db.requests.find(r => r.studentId === student.id && r.status === 'Ready');
  if (!request) {
    return res.status(404).json({ message: `No laundry request in 'Ready' status found for student ${student.name}.` });
  }
  
  // Update status to Delivered
  request.status = "Delivered";
  request.history.push({
    status: "Delivered",
    timestamp: new Date().toISOString(),
    note: "Laundry collected. Verified via tag scan."
  });
  
  writeDb(db);
  res.json({ message: "Laundry successfully delivered!", request });
});

// Update Request Status (Standard flow: Received -> Washing -> Drying -> Ready -> Delivered)
app.post('/api/requests/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;
  const db = readDb();
  
  const idx = db.requests.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ message: "Laundry request not found" });
  
  const request = db.requests[idx];
  request.status = status;
  request.history.push({
    status,
    timestamp: new Date().toISOString(),
    note: note || `Status updated to ${status}`
  });
  
  writeDb(db);
  res.json(request);
});

// --- ISSUES / REPORT TICKETS ---
app.get('/api/issues', (req, res) => {
  const db = readDb();
  res.json(db.issues);
});

app.post('/api/issues', (req, res) => {
  const { studentId, type, description, requestId } = req.body;
  const db = readDb();
  
  const student = db.students.find(s => s.id === studentId);
  if (!student) return res.status(404).json({ message: "Student not found" });
  
  const newIssue = {
    id: 'iss' + (db.issues.length + 1),
    type,
    studentId,
    studentName: student.name,
    laundryId: student.laundryId,
    requestId: requestId || null,
    description,
    status: "Pending", // Pending, Resolved
    createdAt: new Date().toISOString()
  };
  
  db.issues.push(newIssue);
  
  // If related to request, log inside request issues too
  if (requestId) {
    const reqIdx = db.requests.findIndex(r => r.id === requestId);
    if (reqIdx !== -1) {
      db.requests[reqIdx].issue = { type, description };
      db.requests[reqIdx].history.push({
        status: db.requests[reqIdx].status,
        timestamp: new Date().toISOString(),
        note: `Issue reported: ${type} - ${description}`
      });
    }
  }

  writeDb(db);
  res.status(201).json(newIssue);
});

app.post('/api/issues/:id/resolve', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  
  const idx = db.issues.findIndex(iss => iss.id === id);
  if (idx === -1) return res.status(404).json({ message: "Issue not found" });
  
  db.issues[idx].status = "Resolved";
  
  // Resolve in request too if attached
  const reqId = db.issues[idx].requestId;
  if (reqId) {
    const reqIdx = db.requests.findIndex(r => r.id === reqId);
    if (reqIdx !== -1) {
      db.requests[reqIdx].issue = null;
    }
  }
  
  writeDb(db);
  res.json(db.issues[idx]);
});

// --- NOTIFICATIONS ---
app.get('/api/notifications', (req, res) => {
  const db = readDb();
  res.json(db.notifications);
});

app.post('/api/notifications', (req, res) => {
  const { targetType, hostelId, message } = req.body; // targetType: "all", "hostel", "individual"
  const db = readDb();
  
  const newNotif = {
    id: 'n' + (db.notifications.length + 1),
    targetType,
    hostelId: hostelId || null,
    message,
    createdAt: new Date().toISOString()
  };
  
  db.notifications.push(newNotif);
  writeDb(db);
  res.status(201).json(newNotif);
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
