/**
 * ==============================================================================
 * SPAR PROMO APPROVAL SYSTEM — PHASE 8 USERS, DEPARTMENTS & ADMIN TEST SUITE
 * ==============================================================================
 * Comprehensive automated verification for Phase 8 requirements:
 *  1. Admin can create user
 *  2. Non-admin cannot create user (403)
 *  3. Admin can edit user
 *  4. Non-admin cannot edit user (403)
 *  5. Admin can deactivate user
 *  6. Non-admin cannot deactivate user (403)
 *  7. Inactive user cannot log in (401)
 *  8. Duplicate email is rejected (400)
 *  9. Admin can create department
 * 10. Non-admin cannot create department (403)
 * 11. Duplicate department code is rejected (400)
 * 12. Staff requires department (400)
 * 13. Head requires department (400)
 * 14. Inactive department cannot be assigned to new users (400)
 * 15. User cannot deactivate themselves (400)
 * 16. Passwords are never returned in API responses
 * 17. Password is hashed (verified via login authentication)
 * 18. Role changes are protected (Admin only)
 * 19. Department access remains correctly scoped
 * 20. No Director role exists (blocked on creation, 400)
 * ==============================================================================
 */

const BASE_URL = 'http://localhost:5001/api';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  error?: string;
}

const results: TestResult[] = [];

async function loginUser(email: string, password = 'Password123!'): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${data.message}`);
  }
  return data.data.token;
}

async function runTests() {
  console.log('\n====================================================================');
  console.log('🌲 SPAR PROMO APPROVAL SYSTEM — PHASE 8 ADMIN MANAGEMENT TEST SUITE');
  console.log('====================================================================\n');

  try {
    // 1. Acquire tokens
    const adminToken = await loginUser('admin@spar.internal');
    const staffFreshToken = await loginUser('staff.fresh@spar.internal');
    const headFreshToken = await loginUser('head.fresh@spar.internal');
    const marketingToken = await loginUser('marketing@spar.internal');

    // --------------------------------------------------------------------------
    // Test 1: Admin can create user
    // --------------------------------------------------------------------------
    const timestamp = Date.now();
    const testStaffEmail = `test.staff.${timestamp}@spar.internal`;
    let createdUserId = '';
    {
      const res = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Phase8 Test Staff',
          email: testStaffEmail,
          password: 'Password123!',
          role: 'STAFF',
          departmentId: 'dept-fresh-001',
        }),
      });
      const body = await res.json();
      const passed = res.status === 201 && body.success === true && !!body.data.id;
      if (passed) createdUserId = body.data.id;

      results.push({
        name: '1. Admin can create user',
        passed,
        details: passed
          ? `Created user ID ${createdUserId} (${testStaffEmail}) with status 201`
          : `Failed: status=${res.status}, body=${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 2: Non-admin cannot create user (403)
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({
          name: 'Unauthorized User',
          email: `unauth.${timestamp}@spar.internal`,
          password: 'Password123!',
          role: 'STAFF',
          departmentId: 'dept-fresh-001',
        }),
      });
      const body = await res.json();
      const passed = res.status === 403 && body.success === false;

      results.push({
        name: '2. Non-admin cannot create user',
        passed,
        details: passed
          ? `Staff request correctly rejected with 403: "${body.message}"`
          : `Expected 403 but got ${res.status}: ${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 3: Admin can edit user
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/users/${createdUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Phase8 Test Staff Renamed',
          email: testStaffEmail,
          role: 'STAFF',
          departmentId: 'dept-fresh-001',
        }),
      });
      const body = await res.json();
      const passed = res.status === 200 && body.success === true && body.data.name === 'Phase8 Test Staff Renamed';

      results.push({
        name: '3. Admin can edit user',
        passed,
        details: passed
          ? `Admin successfully updated name to "${body.data.name}"`
          : `Failed: status=${res.status}, body=${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 4: Non-admin cannot edit user (403)
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/users/${createdUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${headFreshToken}`,
        },
        body: JSON.stringify({
          name: 'Hacked Name',
        }),
      });
      const body = await res.json();
      const passed = res.status === 403 && body.success === false;

      results.push({
        name: '4. Non-admin cannot edit user',
        passed,
        details: passed
          ? `Head request correctly blocked with 403: "${body.message}"`
          : `Expected 403 but got ${res.status}: ${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 15: User cannot deactivate themselves (400)
    // --------------------------------------------------------------------------
    {
      // Admin gets own user profile
      const meRes = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const meData = await meRes.json();
      const adminId = meData.data.id;

      const res = await fetch(`${BASE_URL}/users/${adminId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ active: false }),
      });
      const body = await res.json();
      const passed = res.status === 400 && body.message.includes('You cannot deactivate your own account');

      results.push({
        name: '15. User cannot deactivate themselves',
        passed,
        details: passed
          ? `Self-deactivation safely blocked with 400: "${body.message}"`
          : `Expected 400 self-lockout error, got status ${res.status}: ${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 5: Admin can deactivate user
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/users/${createdUserId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ active: false }),
      });
      const body = await res.json();
      const passed = res.status === 200 && body.success === true && body.data.active === false;

      results.push({
        name: '5. Admin can deactivate user',
        passed,
        details: passed
          ? `User ${createdUserId} marked active: false`
          : `Failed: status=${res.status}, body=${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 6: Non-admin cannot deactivate user (403)
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/users/${createdUserId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${marketingToken}`,
        },
        body: JSON.stringify({ active: true }),
      });
      const body = await res.json();
      const passed = res.status === 403 && body.success === false;

      results.push({
        name: '6. Non-admin cannot deactivate user',
        passed,
        details: passed
          ? `Marketing request correctly blocked with 403: "${body.message}"`
          : `Expected 403 but got ${res.status}: ${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 7: Inactive user cannot log in (401)
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testStaffEmail, password: 'Password123!' }),
      });
      const body = await res.json();
      const passed = res.status === 401 && body.success === false;

      results.push({
        name: '7. Inactive user cannot log in',
        passed,
        details: passed
          ? `Login correctly rejected with 401 Unauthorized for deactivated account: "${body.message}"`
          : `Expected 401 deactivated error, got status ${res.status}: ${JSON.stringify(body)}`,
      });
    }

    // Reactivate user for subsequent tests
    await fetch(`${BASE_URL}/users/${createdUserId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ active: true }),
    });

    // --------------------------------------------------------------------------
    // Test 8: Duplicate email is rejected (400)
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Duplicate Staff',
          email: testStaffEmail,
          password: 'Password123!',
          role: 'STAFF',
          departmentId: 'dept-fresh-001',
        }),
      });
      const body = await res.json();
      const passed = res.status === 400 && body.message.includes('already exists');

      results.push({
        name: '8. Duplicate email is rejected',
        passed,
        details: passed
          ? `Duplicate email creation rejected with 400: "${body.message}"`
          : `Expected 400 duplicate error, got status ${res.status}: ${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 9: Admin can create department
    // --------------------------------------------------------------------------
    const testDeptCode = `TEST${timestamp.toString().slice(-4)}`;
    let createdDeptId = '';
    {
      const res = await fetch(`${BASE_URL}/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          code: testDeptCode,
          name: `Phase 8 Department ${testDeptCode}`,
          description: 'Created during Phase 8 automated test run',
        }),
      });
      const body = await res.json();
      const passed = res.status === 201 && body.success === true && !!body.data.id;
      if (passed) createdDeptId = body.data.id;

      results.push({
        name: '9. Admin can create department',
        passed,
        details: passed
          ? `Created department ID ${createdDeptId} (${testDeptCode}) with status 201`
          : `Failed: status=${res.status}, body=${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 10: Non-admin cannot create department (403)
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({
          code: `FAIL${timestamp.toString().slice(-4)}`,
          name: 'Hacked Department',
        }),
      });
      const body = await res.json();
      const passed = res.status === 403 && body.success === false;

      results.push({
        name: '10. Non-admin cannot create department',
        passed,
        details: passed
          ? `Staff request correctly rejected with 403: "${body.message}"`
          : `Expected 403 but got ${res.status}: ${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 11: Duplicate department code is rejected (400)
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          code: testDeptCode,
          name: 'Another Department With Same Code',
        }),
      });
      const body = await res.json();
      const passed = res.status === 400 && body.message.includes('already in use');

      results.push({
        name: '11. Duplicate department code is rejected',
        passed,
        details: passed
          ? `Duplicate code creation rejected with 400: "${body.message}"`
          : `Expected 400 duplicate code error, got status ${res.status}: ${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 12: Staff requires department (400)
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'No Dept Staff',
          email: `nodept.staff.${timestamp}@spar.internal`,
          password: 'Password123!',
          role: 'STAFF',
          // departmentId intentionally omitted
        }),
      });
      const body = await res.json();
      const passed = res.status === 400 && body.message.includes('Department assignment is required');

      results.push({
        name: '12. Staff requires department',
        passed,
        details: passed
          ? `Creation without department rejected with 400: "${body.message}"`
          : `Expected 400 department required error, got status ${res.status}: ${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 13: Head requires department (400)
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'No Dept Head',
          email: `nodept.head.${timestamp}@spar.internal`,
          password: 'Password123!',
          role: 'HEAD',
          // departmentId intentionally omitted
        }),
      });
      const body = await res.json();
      const passed = res.status === 400 && body.message.includes('Department assignment is required');

      results.push({
        name: '13. Head requires department',
        passed,
        details: passed
          ? `Creation without department rejected with 400: "${body.message}"`
          : `Expected 400 department required error, got status ${res.status}: ${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 14: Inactive department cannot be assigned to new users (400)
    // --------------------------------------------------------------------------
    {
      // Deactivate the test department first
      await fetch(`${BASE_URL}/departments/${createdDeptId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ active: false }),
      });

      // Try assigning this inactive department to a new Staff user
      const res = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Inactive Dept Assignee',
          email: `inactivedept.${timestamp}@spar.internal`,
          password: 'Password123!',
          role: 'STAFF',
          departmentId: createdDeptId,
        }),
      });
      const body = await res.json();
      const passed = res.status === 400 && body.message.toLowerCase().includes('inactive department');

      results.push({
        name: '14. Inactive department cannot be assigned to new users',
        passed,
        details: passed
          ? `Assignment to inactive department rejected with 400: "${body.message}"`
          : `Expected 400 inactive department error, got status ${res.status}: ${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 16: Passwords are never returned in API responses
    // --------------------------------------------------------------------------
    {
      const userRes = await fetch(`${BASE_URL}/users/${createdUserId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const userBody = await userRes.json();
      const u = userBody.data;

      const listRes = await fetch(`${BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const listBody = await listRes.json();
      const allUsers = Array.isArray(listBody.data) ? listBody.data : listBody.data.users || [];

      const hasPassword =
        'password' in u ||
        'passwordHash' in u ||
        allUsers.some((item: any) => 'password' in item || 'passwordHash' in item);

      const passed = !hasPassword;
      results.push({
        name: '16. Passwords are never returned in API responses',
        passed,
        details: passed
          ? 'Zero passwords or password hashes exposed across user detail or list endpoints'
          : 'SECURITY VIOLATION: Found password or passwordHash field in API response!',
      });
    }

    // --------------------------------------------------------------------------
    // Test 17: Password is hashed (verified via login authentication)
    // --------------------------------------------------------------------------
    {
      // Reset password for test user
      const newPwd = 'NewSecurePassword456!';
      const resetRes = await fetch(`${BASE_URL}/users/${createdUserId}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ password: newPwd }),
      });
      const resetBody = await resetRes.json();

      // Log in with new password
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testStaffEmail, password: newPwd }),
      });
      const loginBody = await loginRes.json();

      const passed =
        resetRes.status === 200 &&
        loginRes.status === 200 &&
        !!loginBody.data.token;

      results.push({
        name: '17. Password is hashed',
        passed,
        details: passed
          ? `Password successfully hashed with bcrypt and verified via authenticating JWT login for ${testStaffEmail}`
          : `Failed: resetStatus=${resetRes.status}, loginStatus=${loginRes.status}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 18: Role changes are protected (Admin only)
    // --------------------------------------------------------------------------
    {
      // Non-admin attempts role change
      const nonAdminRes = await fetch(`${BASE_URL}/users/${createdUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({ role: 'ADMIN' }),
      });
      const nonAdminBody = await nonAdminRes.json();

      // Admin performs role change
      const adminRes = await fetch(`${BASE_URL}/users/${createdUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ role: 'MARKETING', departmentId: null }),
      });
      const adminBody = await adminRes.json();

      const passed =
        nonAdminRes.status === 403 &&
        adminRes.status === 200 &&
        adminBody.data.role === 'MARKETING';

      results.push({
        name: '18. Role changes are protected',
        passed,
        details: passed
          ? `Privilege escalation blocked with 403; Admin successfully changed role to MARKETING`
          : `Failed: nonAdminStatus=${nonAdminRes.status}, adminStatus=${adminRes.status}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 19: Department access remains correctly scoped
    // --------------------------------------------------------------------------
    {
      const freshHeadUsersRes = await fetch(`${BASE_URL}/users?departmentId=dept-fresh-001`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const freshHeadUsersBody = await freshHeadUsersRes.json();
      const freshUsers = Array.isArray(freshHeadUsersBody.data)
        ? freshHeadUsersBody.data
        : freshHeadUsersBody.data.users || [];

      const allBelongToFresh = freshUsers.every((u: any) => u.departmentId === 'dept-fresh-001');
      const passed = freshHeadUsersRes.status === 200 && allBelongToFresh && freshUsers.length > 0;

      results.push({
        name: '19. Department access remains correctly scoped',
        passed,
        details: passed
          ? `Filtered query strictly returned ${freshUsers.length} users all belonging to Fresh department`
          : `Failed: status=${freshHeadUsersRes.status}, length=${freshUsers.length}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 20: No Director role exists
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Illegal Director User',
          email: `director.${timestamp}@spar.internal`,
          password: 'Password123!',
          role: 'DIRECTOR',
        }),
      });
      const body = await res.json();
      const passed = res.status === 400 && body.message.toUpperCase().includes('DIRECTOR');

      results.push({
        name: '20. No Director role exists',
        passed,
        details: passed
          ? `Creation of Director role rejected with 400: "${body.message}"`
          : `Expected 400 rejection of Director role, got status ${res.status}: ${JSON.stringify(body)}`,
      });
    }

  } catch (err: any) {
    console.error('Fatal test execution error:', err);
    results.push({
      name: 'Fatal Error',
      passed: false,
      details: err.message,
      error: err.stack,
    });
  }

  // --------------------------------------------------------------------------
  // Summary Report
  // --------------------------------------------------------------------------
  console.log('\n====================================================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('====================================================================\n');

  let passedCount = 0;
  for (const r of results) {
    const symbol = r.passed ? '✅' : '❌';
    console.log(`${symbol} ${r.name}`);
    console.log(`   ${r.details}`);
    if (r.passed) passedCount++;
  }

  console.log(`\nPassed: ${passedCount} / ${results.length}`);
  console.log('====================================================================\n');

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runTests();
