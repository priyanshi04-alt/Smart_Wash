// Automated verification script for SmartWash Laundry API
import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log("🚀 Starting API Verification Tests...");

  try {
    // 1. Auth Test
    console.log("🔑 Testing Admin Login...");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@univ.edu', password: 'admin123' })
    });
    assert.strictEqual(loginRes.status, 200, "Admin login should succeed");
    const loginData = await loginRes.json();
    assert.strictEqual(loginData.user.role, 'admin');
    console.log("✅ Admin login successful!");

    // 2. Fetch Hostels
    console.log("🏢 Fetching Hostels...");
    const hostelsRes = await fetch(`${BASE_URL}/hostels`);
    const hostels = await hostelsRes.json();
    assert.ok(hostels.length >= 4, "Should load default 4 hostels");
    console.log("✅ Hostels fetched:", hostels.map(h => h.name).join(', '));

    // 3. Create Student Mapping
    console.log("👤 Creating a test student...");
    const rand = Math.floor(Math.random() * 100000);
    const newStudentRes = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Test Vikram ${rand}`,
        rollNumber: `2026TEST${rand}`,
        regNumber: `REG${rand}`,
        email: `vikram.test.${rand}@univ.edu`,
        mobile: '9999999999',
        hostelId: 'h1', // Boys Hostel A
        floor: 3,
        room: '302'
      })
    });
    assert.strictEqual(newStudentRes.status, 201, "Should successfully create student");
    const testStudent = await newStudentRes.json();
    assert.strictEqual(testStudent.tags.length, 20, "Should auto-assign 20 tags");
    assert.ok(testStudent.laundryId.startsWith('LID-'), "Should generate laundry ID");
    console.log(`✅ Student created. LaundryID: ${testStudent.laundryId}, Room: ${testStudent.room}`);

    // 4. Submit Laundry Request (Forced on schedule day or emergency)
    // We update schedule for Boys Hostel A (h1) to include current weekday, or enable emergency
    console.log("📅 Overriding schedule to enable emergency laundry for Test Hostel h1...");
    await fetch(`${BASE_URL}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostelId: 'h1',
        days: ["Monday", "Thursday"],
        pickup: '08:00',
        delivery: '18:00',
        emergencyEnabled: true // enable emergency to guarantee submission passes schedule check
      })
    });

    console.log("📦 Submitting laundry request...");
    const reqRes = await fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: testStudent.id,
        clothes: { Shirts: 2, Pants: 1 } // Total 3
      })
    });
    assert.strictEqual(reqRes.status, 201, "Request submission should succeed");
    let request = await reqRes.json();
    assert.strictEqual(request.expectedTotal, 3, "Total clothes count should be 3");
    assert.strictEqual(request.status, 'Waiting for Verification', "Initial status should be Waiting for Verification");
    console.log(`✅ Request submitted successfully. Request ID: ${request.id}`);

    // 5. Scan QR Tags (Simulate scanning workflow)
    const tag1 = testStudent.tags[0].serialNumber;
    const tag2 = testStudent.tags[1].serialNumber;
    const tag3 = testStudent.tags[2].serialNumber;

    console.log("📷 Simulating first QR scan (Student Card / Tag 1)...");
    const scan1Res = await fetch(`${BASE_URL}/requests/scan-first`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: `${testStudent.laundryId} | ${tag1}` })
    });
    assert.strictEqual(scan1Res.status, 200, "First tag scan should succeed");
    const scan1Data = await scan1Res.json();
    assert.strictEqual(scan1Data.request.id, request.id);
    assert.deepStrictEqual(scan1Data.request.scannedTags, [tag1], "First tag should be added to scanned list");
    console.log("✅ First scan successful, verified request open!");

    // 6. Test Toggle Scan Logic (Deselect duplicate scan)
    console.log("🔄 Simulating duplicate scan of Tag 1 to deselect...");
    const dupRes = await fetch(`${BASE_URL}/requests/scan-tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: request.id, payload: `${testStudent.laundryId} | ${tag1}` })
    });
    assert.strictEqual(dupRes.status, 200, "Duplicate scan should toggle off and return 200 OK");
    const dupData = await dupRes.json();
    assert.deepStrictEqual(dupData.request.scannedTags, [], "Tag 1 should be removed from scanned list (deselected)");
    console.log("✅ Tag 1 correctly deselected via repeat scan!");

    console.log("📷 Re-scanning Tag 1 to select it again...");
    await fetch(`${BASE_URL}/requests/scan-tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: request.id, payload: `${testStudent.laundryId} | ${tag1}` })
    });

    // 7. Test Mismatch Scan (Wrong student ID)
    console.log("⚠️ Simulating tag scan from different student...");
    const wrongRes = await fetch(`${BASE_URL}/requests/scan-tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: request.id, payload: `LID-X999 | T99999` })
    });
    assert.strictEqual(wrongRes.status, 400, "Scanning wrong student tag should fail with 400");
    console.log("✅ Tag mismatch correctly blocked!");

    // 8. Complete Verification Scans (Scan Tag 2 and Tag 3)
    console.log("📷 Scanning Tag 2...");
    await fetch(`${BASE_URL}/requests/scan-tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: request.id, payload: `${testStudent.laundryId} | ${tag2}` })
    });

    console.log("📷 Scanning Tag 3...");
    const scan3Res = await fetch(`${BASE_URL}/requests/scan-tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: request.id, payload: `${testStudent.laundryId} | ${tag3}` })
    });
    const scan3Data = await scan3Res.json();
    assert.strictEqual(scan3Data.request.scannedTags.length, 3, "All 3 tags should be scanned");
    console.log("✅ All tags scanned successfully. Received: 3/3");

    // 9. Move status to Received -> Washing -> Drying -> Ready -> Delivered
    console.log("🔄 Updating status to Received...");
    const recRes = await fetch(`${BASE_URL}/requests/${request.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Received', note: 'Staff verified and received' })
    });
    assert.strictEqual((await recRes.json()).status, 'Received');

    console.log("🔄 Updating status to Washing...");
    const washRes = await fetch(`${BASE_URL}/requests/${request.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Washing' })
    });
    assert.strictEqual((await washRes.json()).status, 'Washing');

    console.log("🔄 Updating status to Ready...");
    const readyRes = await fetch(`${BASE_URL}/requests/${request.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Ready' })
    });
    assert.strictEqual((await readyRes.json()).status, 'Ready');
    console.log("✅ Pipeline status changes completed successfully!");

    // 10. Deliver order via tag scan
    console.log("🚚 Delivering clothes via Tag Scan...");
    const delRes = await fetch(`${BASE_URL}/requests/scan-delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: `${testStudent.laundryId} | ${tag1}` })
    });
    assert.strictEqual(delRes.status, 200, "Delivery scan should succeed");
    const delData = await delRes.json();
    assert.strictEqual(delData.request.status, 'Delivered', "Order should be marked Delivered");
    console.log("✅ Delivery scan completed and verified!");

    console.log("\n⭐️ ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ⭐️");
  } catch (err) {
    console.error("❌ TEST FAILURE:", err);
    process.exit(1);
  }
}

runTests();
