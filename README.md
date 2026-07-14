# SmartWash - Smart Hostel Laundry Management System

SmartWash is a commercial-grade, full-stack SaaS platform designed specifically for hostels, PG accommodations, and residential campuses to digitize and manage the entire laundry booking, verification, processing, and collection lifecycle.

The system is designed with a role-based access control architecture, providing dedicated portals for **Administrators**, **Laundry Desk Staff**, and **Students**.

---

## Key Features

### 1. Student Portal
- **Dashboard Tracking Timeline**: Real-time visualization of the laundry request progress: `Waiting for Verification` ➔ `Received` ➔ `Washing` ➔ `Drying` ➔ `Ready` ➔ `Delivered`.
- **Request Submission**: Submit laundry bags indicating the quantities of different clothing items (Shirts, Pants, Towels, Bedsheets, etc.).
- **Schedule Check**: Restricts submissions to the hostel's allocated laundry days (with admin emergency bypass toggle).
- **Complaints & Issues**: Report missing or damaged clothes directly to the helpdesk.
- **My QR Tags**: View unique QR tag serial numbers (20 active tags allocated to each student).

### 2. Laundry Desk Staff Portal
- **Hostel Queue Management**: Manage incoming, verified, washing, drying, and ready requests for the assigned hostel.
- **QR Scanner Simulator**: A fully integrated simulator to mock swiping student cards or scanning physical QR clothing tags for easy browser-based testing.
- **Verification Workflow**: Scans student card to load requests, counts items one-by-one by scanning individual tags, and highlights count mismatches. Locks "Accept Laundry" action until quantities match.
- **Delivery Flow**: Scan tags on ready orders to quickly mark them as delivered.
- **Issue Logger**: File tickets for wrong quantities, damaged items, or uncollected laundry.

### 3. Administrator Portal
- **Operational Metrics**: High-level dashboards showing total hostels, active students, pending orders, and recent activity logs.
- **SVG Charts**: Interactive, responsive charts showing daily laundry volumes and hostel distribution.
- **Hostel Configurator**: Register new hostels, map floors, configure rooms, and assign unique theme colors.
- **Student Mapping**: Register new students, automatically generate unique Laundry IDs, and allocate 20 tag serials.
- **Laundry Scheduler**: Setup pickup days, times, and emergency bypass policies per hostel.
- **Credential Manager**: Create and delete staff accounts and desk counters.
- **Issues Desk**: View and resolve reported student tickets.

---

## Tech Stack

- **Frontend**: React.js, Vite, Vanilla CSS Variables (supporting custom hostel theme colors, glassmorphism, responsive sidebar, and dark/light modes).
- **Icons**: Lucide React
- **Backend**: Node.js, Express.js, CORS
- **Database**: Zero-dependency JSON file database (`backend/data/db.json`) for seamless cross-platform execution.

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (Node Package Manager)

### Setup & Installation

1. **Clone the Repository**
   ```bash
   git clone <your-repository-url>
   cd laundry-system
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   node server.js
   ```
   The backend API will start running on `http://localhost:5000`.

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
   The development server will start on `http://localhost:5173`. Open this URL in your web browser.

---

## Deployment

You can deploy the entire application (both frontend and backend) as a single service on Render.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/priyanshi04-alt/Smart_Wash)

### Steps:
1. Click the **Deploy to Render** button above.
2. Sign in to your Render account.
3. Click **Apply** to automatically build and run the service using the `render.yaml` configuration.

---

## Demo Test Credentials

To test the role-based portals, log in with any of the following pre-configured credentials:

### 1. Administrator Account
- **Email**: `admin@univ.edu`
- **Password**: `admin123`

### 2. Laundry Desk Staff (Boys Hostel A Counter)
- **Email**: `staff@univ.edu`
- **Password**: `staff123`

### 3. Student Accounts
- **Aarav Sharma (Boys Hostel A)**:
  - **Email**: `aarav@univ.edu`
  - **Password**: `aarav123`
- **Priya Patel (Girls Hostel A)**:
  - **Email**: `priya@univ.edu`
  - **Password**: `priya123`
