import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'data', 'db.json');

const defaultData = {
  hostels: [
    { id: "h1", name: "Boys Hostel A", color: "#3b82f6" }, // Blue
    { id: "h2", name: "Girls Hostel A", color: "#a855f7" }, // Purple
    { id: "h3", name: "Girls Hostel B", color: "#ec4899" }, // Pink
    { id: "h4", name: "Boys Hostel B", color: "#10b981" }  // Green
  ],
  rooms: {
    "h1": ["101", "102", "103", "201", "202", "203"],
    "h2": ["101", "102", "103", "201", "202", "203"],
    "h3": ["101", "102", "201", "202"],
    "h4": ["101", "102", "201", "202"]
  },
  users: [
    { id: "u1", email: "admin@univ.edu", password: "admin123", role: "admin", name: "System Admin" },
    { id: "u2", email: "staff@univ.edu", password: "staff123", role: "staff", name: "Ramesh Kumar", hostelId: "h1", counter: "Main Counter A" },
    { id: "u3", email: "staff2@univ.edu", password: "staff123", role: "staff", name: "Sunita Devi", hostelId: "h2", counter: "Main Counter B" },
    { id: "u4", email: "aarav@univ.edu", password: "aarav123", role: "student", studentId: "s1" },
    { id: "u5", email: "priya@univ.edu", password: "priya123", role: "student", studentId: "s2" }
  ],
  students: [
    {
      id: "s1",
      name: "Aarav Sharma",
      rollNumber: "2026CS101",
      regNumber: "REG99831",
      email: "aarav@univ.edu",
      mobile: "9876543210",
      hostelId: "h1",
      floor: 1,
      room: "102",
      laundryId: "LID-1023",
      tags: Array.from({ length: 20 }, (_, i) => ({
        serialNumber: `T${String(1000 + i + 1).slice(1)}`, // T00001 - T00020
        status: "active" // active, lost, damaged, disabled
      })),
      status: "active"
    },
    {
      id: "s2",
      name: "Priya Patel",
      rollNumber: "2026EC204",
      regNumber: "REG99832",
      email: "priya@univ.edu",
      mobile: "9876543211",
      hostelId: "h2",
      floor: 2,
      room: "203",
      laundryId: "LID-1024",
      tags: Array.from({ length: 20 }, (_, i) => ({
        serialNumber: `T${String(1000 + i + 21).slice(1)}`, // T00021 - T00040
        status: "active"
      })),
      status: "active"
    }
  ],
  schedules: [
    { hostelId: "h1", days: ["Monday", "Thursday"], pickup: "08:00", delivery: "18:00", emergencyEnabled: true },
    { hostelId: "h2", days: ["Tuesday", "Friday"], pickup: "08:00", delivery: "18:00", emergencyEnabled: true },
    { hostelId: "h3", days: ["Wednesday", "Saturday"], pickup: "09:00", delivery: "17:00", emergencyEnabled: false },
    { hostelId: "h4", days: ["Wednesday", "Saturday"], pickup: "09:00", delivery: "17:00", emergencyEnabled: false }
  ],
  requests: [
    {
      id: "r1",
      studentId: "s1",
      studentName: "Aarav Sharma",
      laundryId: "LID-1023",
      hostelId: "h1",
      room: "102",
      clothes: { "Shirts": 3, "Pants": 2, "T-Shirts": 2 },
      expectedTotal: 7,
      scannedTags: [],
      status: "Waiting for Verification",
      issue: null,
      createdAt: "2026-07-11T10:00:00.000Z",
      history: [
        { status: "Waiting for Verification", timestamp: "2026-07-11T10:00:00.000Z", note: "Request submitted by student" }
      ]
    },
    {
      id: "r2",
      studentId: "s2",
      studentName: "Priya Patel",
      laundryId: "LID-1024",
      hostelId: "h2",
      room: "203",
      clothes: { "Bedsheets": 1, "Towels": 2, "Others": 3 },
      expectedTotal: 6,
      scannedTags: ["T00021", "T00022", "T00023", "T00024", "T00025", "T00026"],
      status: "Ready",
      issue: null,
      createdAt: "2026-07-10T09:30:00.000Z",
      history: [
        { status: "Waiting for Verification", timestamp: "2026-07-10T09:30:00.000Z", note: "Request submitted by student" },
        { status: "Received", timestamp: "2026-07-10T10:00:00.000Z", note: "Laundry verified and received by Sunita Devi" },
        { status: "Washing", timestamp: "2026-07-10T11:00:00.000Z", note: "Moved to washing" },
        { status: "Drying", timestamp: "2026-07-10T13:30:00.000Z", note: "Moved to drying" },
        { status: "Ready", timestamp: "2026-07-10T16:00:00.000Z", note: "Laundry ironed and ready for pickup" }
      ]
    }
  ],
  notifications: [
    { id: "n1", targetType: "all", message: "Hostel Laundry System is now active! Please collect your tags from the warden.", createdAt: "2026-07-11T09:00:00.000Z" }
  ],
  issues: []
};

// Ensure data folder exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database file, resetting to default:", err);
    return defaultData;
  }
}

export function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error("Error writing to database:", err);
    return false;
  }
}
