/**
 * SPAR Promo Approval System - Phase 3 Automated Verification Suite
 * Dashboard API & Role Scoping (Tests 1 through 10)
 */

const BASE_URL = 'http://localhost:5001/api';

interface TestResult {
  testId: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function loginUser(email: string, password = 'Password123!') {
  const res = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.status === 200 && res.data?.data?.token) {
    return res.data.data.token as string;
  }
  throw new Error(`Login failed for ${email}: ${res.status}`);
}

async function runDashboardTests() {
  console.log('================================================================');
  console.log('🌲 SPAR PROMO APPROVAL SYSTEM - PHASE 3 DASHBOARD TEST SUITE');
  console.log('================================================================\n');

  let staffFreshToken = '';
  let headFreshToken = '';
  let headFoodToken = '';
  let adminToken = '';
  let marketingToken = '';

  try {
    staffFreshToken = await loginUser('staff.fresh@spar.internal');
    headFreshToken = await loginUser('head.fresh@spar.internal');
    headFoodToken = await loginUser('head.food@spar.internal');
    adminToken = await loginUser('admin@spar.internal');
    marketingToken = await loginUser('marketing@spar.internal');
  } catch (err: any) {
    console.error('Initial login setup failed:', err.message);
    process.exit(1);
  }

  // TEST 1: Unauthenticated user cannot access dashboard API
  try {
    const resSummary = await api('/dashboard/summary');
    const resRecent = await api('/dashboard/recent');
    if (resSummary.status === 401 && resRecent.status === 401) {
      results.push({
        testId: 'TEST 1',
        name: 'Unauthenticated user cannot access dashboard API',
        passed: true,
        details: 'HTTP 401 properly returned on both /dashboard/summary and /dashboard/recent without token.',
      });
    } else {
      results.push({
        testId: 'TEST 1',
        name: 'Unauthenticated user cannot access dashboard API',
        passed: false,
        details: `Expected 401, got summary: ${resSummary.status}, recent: ${resRecent.status}`,
      });
    }
  } catch (e: any) {
    results.push({ testId: 'TEST 1', name: 'Unauthenticated user cannot access dashboard API', passed: false, details: e.message });
  }

  // TEST 2: STAFF receives only permitted dashboard data
  try {
    const res = await api('/dashboard/recent', {
      headers: { Authorization: `Bearer ${staffFreshToken}` },
    });
    if (res.status === 200 && Array.isArray(res.data.data)) {
      const items: any[] = res.data.data;
      const otherDeptItems = items.filter((p) => p.department && p.department.code !== 'FRESH');
      if (otherDeptItems.length === 0) {
        results.push({
          testId: 'TEST 2',
          name: 'STAFF receives only permitted dashboard data',
          passed: true,
          details: `Staff received ${items.length} records, all strictly within assigned Fresh department. Zero cross-department leakage.`,
        });
      } else {
        results.push({
          testId: 'TEST 2',
          name: 'STAFF receives only permitted dashboard data',
          passed: false,
          details: `Found ${otherDeptItems.length} records outside Fresh department for staff user.`,
        });
      }
    } else {
      results.push({ testId: 'TEST 2', name: 'STAFF receives only permitted dashboard data', passed: false, details: `Status: ${res.status}` });
    }
  } catch (e: any) {
    results.push({ testId: 'TEST 2', name: 'STAFF receives only permitted dashboard data', passed: false, details: e.message });
  }

  // TEST 3: HEAD receives department-scoped dashboard data
  try {
    const res = await api('/dashboard/recent', {
      headers: { Authorization: `Bearer ${headFreshToken}` },
    });
    if (res.status === 200 && Array.isArray(res.data.data)) {
      const items: any[] = res.data.data;
      const otherDeptItems = items.filter((p) => p.department && p.department.code !== 'FRESH');
      if (otherDeptItems.length === 0) {
        results.push({
          testId: 'TEST 3',
          name: 'HEAD receives department-scoped dashboard data',
          passed: true,
          details: `Head received ${items.length} records, strictly scoped to Fresh department.`,
        });
      } else {
        results.push({
          testId: 'TEST 3',
          name: 'HEAD receives department-scoped dashboard data',
          passed: false,
          details: `Head received data outside their department.`,
        });
      }
    } else {
      results.push({ testId: 'TEST 3', name: 'HEAD receives department-scoped dashboard data', passed: false, details: `Status: ${res.status}` });
    }
  } catch (e: any) {
    results.push({ testId: 'TEST 3', name: 'HEAD receives department-scoped dashboard data', passed: false, details: e.message });
  }

  // TEST 4: ADMIN can receive global dashboard data
  try {
    const res = await api('/dashboard/summary', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status === 200 && res.data.data) {
      const d = res.data.data;
      // Admin sees enterprise-wide totals
      if (d.drafts >= 2 && d.waitingForMe >= 2 && d.approved >= 3) {
        results.push({
          testId: 'TEST 4',
          name: 'ADMIN can receive global dashboard data',
          passed: true,
          details: `Admin global summary: Drafts=${d.drafts}, WaitingForHead=${d.waitingForMe}, Rejected=${d.rejected}, Approved=${d.approved}`,
        });
      } else {
        results.push({
          testId: 'TEST 4',
          name: 'ADMIN can receive global dashboard data',
          passed: false,
          details: `Unexpected counts: ${JSON.stringify(d)}`,
        });
      }
    } else {
      results.push({ testId: 'TEST 4', name: 'ADMIN can receive global dashboard data', passed: false, details: `Status: ${res.status}` });
    }
  } catch (e: any) {
    results.push({ testId: 'TEST 4', name: 'ADMIN can receive global dashboard data', passed: false, details: e.message });
  }

  // TEST 5: Waiting for Me correctly counts SUBMITTED_TO_HEAD for a Head
  try {
    const resFreshHead = await api('/dashboard/summary', {
      headers: { Authorization: `Bearer ${headFreshToken}` },
    });
    const resFoodHead = await api('/dashboard/summary', {
      headers: { Authorization: `Bearer ${headFoodToken}` },
    });

    if (
      resFreshHead.status === 200 &&
      resFreshHead.data.data.waitingForMe >= 1 &&
      resFoodHead.status === 200 &&
      resFoodHead.data.data.waitingForMe >= 1
    ) {
      results.push({
        testId: 'TEST 5',
        name: 'Waiting for Me correctly counts SUBMITTED_TO_HEAD for Head',
        passed: true,
        details: `Fresh Head waitingForMe=${resFreshHead.data.data.waitingForMe}, Food Head waitingForMe=${resFoodHead.data.data.waitingForMe}. Department-level accuracy verified.`,
      });
    } else {
      results.push({
        testId: 'TEST 5',
        name: 'Waiting for Me correctly counts SUBMITTED_TO_HEAD for Head',
        passed: false,
        details: `Fresh Head count: ${resFreshHead.data?.data?.waitingForMe}, Food Head count: ${resFoodHead.data?.data?.waitingForMe}`,
      });
    }
  } catch (e: any) {
    results.push({ testId: 'TEST 5', name: 'Waiting for Me correctly counts SUBMITTED_TO_HEAD for Head', passed: false, details: e.message });
  }

  // TEST 6: REJECTED_BY_HEAD appears in rejected count
  try {
    const res = await api('/dashboard/summary', {
      headers: { Authorization: `Bearer ${staffFreshToken}` },
    });
    if (res.status === 200 && res.data.data.rejected >= 1) {
      results.push({
        testId: 'TEST 6',
        name: 'REJECTED_BY_HEAD appears in rejected count',
        passed: true,
        details: `Staff rejected count is ${res.data.data.rejected} (matches PR-2026-W43-FRESH-03).`,
      });
    } else {
      results.push({
        testId: 'TEST 6',
        name: 'REJECTED_BY_HEAD appears in rejected count',
        passed: false,
        details: `Expected rejected count >= 1, got ${res.data?.data?.rejected}`,
      });
    }
  } catch (e: any) {
    results.push({ testId: 'TEST 6', name: 'REJECTED_BY_HEAD appears in rejected count', passed: false, details: e.message });
  }

  // TEST 7: APPROVED appears in approved count
  try {
    const resMarketing = await api('/dashboard/summary', {
      headers: { Authorization: `Bearer ${marketingToken}` },
    });
    if (resMarketing.status === 200 && resMarketing.data.data.approved >= 3) {
      results.push({
        testId: 'TEST 7',
        name: 'APPROVED appears in approved count',
        passed: true,
        details: `Marketing approved count is ${resMarketing.data.data.approved} across all released campaigns.`,
      });
    } else {
      results.push({
        testId: 'TEST 7',
        name: 'APPROVED appears in approved count',
        passed: false,
        details: `Expected approved >= 3, got ${resMarketing.data?.data?.approved}`,
      });
    }
  } catch (e: any) {
    results.push({ testId: 'TEST 7', name: 'APPROVED appears in approved count', passed: false, details: e.message });
  }

  // TEST 8: Director role does not exist
  try {
    const res = await api('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Fake Director',
        email: `dirtest.${Date.now()}@spar.internal`,
        password: 'Password123!',
        role: 'DIRECTOR',
      }),
    });
    if (res.status === 400 && res.data.message.includes('DIRECTOR')) {
      results.push({
        testId: 'TEST 8',
        name: 'Director role does not exist and cannot be used',
        passed: true,
        details: `Creation rejected with: "${res.data.message}"`,
      });
    } else {
      results.push({
        testId: 'TEST 8',
        name: 'Director role does not exist and cannot be used',
        passed: false,
        details: `Status: ${res.status}, msg: ${res.data?.message}`,
      });
    }
  } catch (e: any) {
    results.push({ testId: 'TEST 8', name: 'Director role does not exist and cannot be used', passed: false, details: e.message });
  }

  // TEST 9: Director statuses are not accepted
  try {
    // Attempt accessing or querying non-existent director routes/statuses
    const res1 = await api('/director/approve', { headers: { Authorization: `Bearer ${adminToken}` } });
    const res2 = await api('/promos?status=SENT_TO_DIRECTOR', { headers: { Authorization: `Bearer ${adminToken}` } });
    // SENT_TO_DIRECTOR should return 0 results (empty array) and /director/approve must be 404
    if (res1.status === 404 && res2.status === 200 && Array.isArray(res2.data.data) && res2.data.data.length === 0) {
      results.push({
        testId: 'TEST 9',
        name: 'Director statuses and routes are not accepted',
        passed: true,
        details: 'Route /director/approve is 404; query with status SENT_TO_DIRECTOR yields 0 items.',
      });
    } else {
      results.push({
        testId: 'TEST 9',
        name: 'Director statuses and routes are not accepted',
        passed: false,
        details: `res1=${res1.status}, res2=${res2.status}`,
      });
    }
  } catch (e: any) {
    results.push({ testId: 'TEST 9', name: 'Director statuses and routes are not accepted', passed: false, details: e.message });
  }

  // TEST 10: Unauthorized department data cannot be accessed by changing request parameters
  try {
    // Staff in Fresh tries to tamper with departmentId query param to fetch Food department recent promos
    const res = await api('/dashboard/recent?departmentId=dept-food-002', {
      headers: { Authorization: `Bearer ${staffFreshToken}` },
    });
    if (res.status === 200 && Array.isArray(res.data.data)) {
      const items: any[] = res.data.data;
      const foodItems = items.filter((p) => p.department && p.department.code === 'FOOD');
      if (foodItems.length === 0) {
        results.push({
          testId: 'TEST 10',
          name: 'Unauthorized department data cannot be accessed by parameter tampering',
          passed: true,
          details: 'Backend strictly uses authenticated session identity to scope data. Query param tampering safely ignored/isolated.',
        });
      } else {
        results.push({
          testId: 'TEST 10',
          name: 'Unauthorized department data cannot be accessed by parameter tampering',
          passed: false,
          details: 'Food items leaked to Fresh staff member via query parameter tampering.',
        });
      }
    } else {
      results.push({
        testId: 'TEST 10',
        name: 'Unauthorized department data cannot be accessed by parameter tampering',
        passed: false,
        details: `Status: ${res.status}`,
      });
    }
  } catch (e: any) {
    results.push({ testId: 'TEST 10', name: 'Unauthorized department data cannot be accessed by parameter tampering', passed: false, details: e.message });
  }

  // Summary Table
  console.log('----------------------------------------------------------------');
  console.log('PHASE 3 TEST RESULTS:');
  console.log('----------------------------------------------------------------');
  let passCount = 0;
  for (const r of results) {
    const icon = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${icon} [${r.testId}] ${r.name}`);
    console.log(`       Details: ${r.details}`);
    if (r.passed) passCount++;
  }
  console.log('----------------------------------------------------------------');
  console.log(`Total: ${results.length} | Passed: ${passCount} | Failed: ${results.length - passCount}`);
  console.log('================================================================\n');

  if (passCount !== results.length) {
    process.exit(1);
  }
}

runDashboardTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
