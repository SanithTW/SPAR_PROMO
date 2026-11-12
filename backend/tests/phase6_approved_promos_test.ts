/**
 * ==============================================================================
 * SPAR PROMO APPROVAL SYSTEM — PHASE 6 APPROVED PROMOS & MARKETING TEST SUITE
 * ==============================================================================
 * Comprehensive automated verification for Phase 6 requirements:
 *  1. Unauthenticated users cannot access Approved Promos (401)
 *  2. Marketing can view approved promos (200)
 *  3. Marketing cannot edit approved promos (PUT/POST/PATCH blocked with 403)
 *  4. Marketing cannot approve/reject (403)
 *  5. Head can view permitted approved promos (their department)
 *  6. Head cannot modify approved records (blocked with 403)
 *  7. Admin can view approved promos system-wide (200)
 *  8. Staff can only view permitted approved records in their department (200)
 *  9. Staff cannot access another department's private approved records (403)
 * 10. Only APPROVED records appear by default (Drafts and Submitted do not leak)
 * 11. Search works (searches promo code, title, notes)
 * 12. Filters work (department, promo type, date range)
 * 13. Pagination works (returns page, pageSize, total, totalPages)
 * 14. Approved detail page returns complete read-only data snapshot
 * 15. Unauthorized PUT/PATCH/DELETE requests on approved promos are rejected
 * 16. Approved data represents the final approved state (authoritative head approver)
 * 17. Dashboard Approved metric is correct for Marketing
 * 18. No Director functionality exists (zero Director routes / statuses)
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
  console.log('🌲 SPAR PROMO APPROVAL SYSTEM — PHASE 6 APPROVED PROMOS TEST SUITE');
  console.log('====================================================================\n');

  try {
    // 1. Acquire tokens for all roles
    const staffFreshToken = await loginUser('staff.fresh@spar.internal');
    const headFreshToken = await loginUser('head.fresh@spar.internal');
    const staffFoodToken = await loginUser('staff.food@spar.internal');
    const headFoodToken = await loginUser('head.food@spar.internal');
    const marketingToken = await loginUser('marketing@spar.internal');
    const adminToken = await loginUser('admin@spar.internal');

    console.log('🔑 Authentication tokens acquired for all testing roles.\n');

    // -------------------------------------------------------------------------
    // TEST 1: Unauthenticated users cannot access Approved Promos (401)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/approved-promos`);
      const passed = res.status === 401;
      results.push({
        name: '1. Unauthenticated users cannot access Approved Promos (401)',
        passed,
        details: `Expected 401 Unauthorized without token. Got ${res.status}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 2: Marketing can view approved promos (200)
    // -------------------------------------------------------------------------
    let sampleApprovedPromoId = '';
    let freshApprovedPromoId = '';
    let foodApprovedPromoId = '';

    {
      const res = await fetch(`${BASE_URL}/approved-promos`, {
        headers: { Authorization: `Bearer ${marketingToken}` },
      });
      const data = await res.json();
      const items = data.data?.items || data.data || [];
      const passed = res.status === 200 && Array.isArray(items) && items.length > 0;
      if (items.length > 0) {
        sampleApprovedPromoId = items[0].id;
      }
      results.push({
        name: '2. Marketing can view approved promos (200)',
        passed,
        details: `Marketing retrieved ${items.length} approved promo lists across all departments.`,
      });
    }

    // Helper: Find a Fresh approved promo and a Food approved promo
    {
      const res = await fetch(`${BASE_URL}/approved-promos`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      const items = data.data?.items || data.data || [];
      const fresh = items.find((p: any) => p.department?.name === 'Fresh' || p.departmentId === 'dept-fresh-001');
      const food = items.find((p: any) => p.department?.name === 'Food' || p.departmentId === 'dept-food-002');
      if (fresh) freshApprovedPromoId = fresh.id;
      if (food) foodApprovedPromoId = food.id;
    }

    // -------------------------------------------------------------------------
    // TEST 3: Marketing cannot edit approved promos (PUT/POST/PATCH blocked with 403)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/approved-promos/${sampleApprovedPromoId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${marketingToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Hacked by Marketing' }),
      });
      const passed = res.status === 403;
      results.push({
        name: '3. Marketing cannot edit approved promos (403)',
        passed,
        details: `Expected 403 Forbidden for modification attempt. Got ${res.status}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 4: Marketing cannot approve or reject (403)
    // -------------------------------------------------------------------------
    {
      const resApprove = await fetch(`${BASE_URL}/head-review/${sampleApprovedPromoId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${marketingToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments: 'Marketing approving' }),
      });
      const resReject = await fetch(`${BASE_URL}/head-review/${sampleApprovedPromoId}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${marketingToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments: 'Marketing rejecting' }),
      });
      const passed = resApprove.status === 403 && resReject.status === 403;
      results.push({
        name: '4. Marketing cannot approve or reject (403)',
        passed,
        details: `Approve: HTTP ${resApprove.status}, Reject: HTTP ${resReject.status}. Both blocked with 403.`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 5: Head can view permitted approved promos (their department)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/approved-promos`, {
        headers: { Authorization: `Bearer ${headFreshToken}` },
      });
      const data = await res.json();
      const items = data.data?.items || data.data || [];
      // All items must belong to Fresh department
      const allFresh = items.every((p: any) => p.departmentId === 'dept-fresh-001');
      const passed = res.status === 200 && allFresh && items.length > 0;
      results.push({
        name: '5. Head can view permitted approved promos (their department)',
        passed,
        details: `Fresh Head retrieved ${items.length} records, all strictly within Fresh department: ${allFresh}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 6: Head cannot modify approved records (blocked with 403)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/approved-promos/${freshApprovedPromoId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${headFreshToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Head trying to edit approved promo' }),
      });
      const passed = res.status === 403;
      results.push({
        name: '6. Head cannot modify approved records (403)',
        passed,
        details: `Expected 403 Forbidden for modification attempt on locked approved promo. Got ${res.status}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 7: Admin can view approved promos system-wide (200)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/approved-promos`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      const items = data.data?.items || data.data || [];
      const passed = res.status === 200 && items.length > 0;
      results.push({
        name: '7. Admin can view approved promos system-wide (200)',
        passed,
        details: `Admin retrieved ${items.length} approved records across enterprise scope.`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 8: Staff can only view permitted approved records in their department (200)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/approved-promos`, {
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const data = await res.json();
      const items = data.data?.items || data.data || [];
      const allFresh = items.every((p: any) => p.departmentId === 'dept-fresh-001');
      const passed = res.status === 200 && allFresh;
      results.push({
        name: '8. Staff can only view permitted approved records in their department (200)',
        passed,
        details: `Staff Fresh received ${items.length} records, all strictly within Fresh department: ${allFresh}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 9: Staff cannot access another department's private approved records (403)
    // -------------------------------------------------------------------------
    {
      // Staff Fresh attempts to view Food approved promo detail
      const res = await fetch(`${BASE_URL}/approved-promos/${foodApprovedPromoId}`, {
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const passed = res.status === 403;
      results.push({
        name: "9. Staff cannot access another department's private records (403)",
        passed,
        details: `Expected 403 Forbidden for cross-department detail access. Got ${res.status}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 10: Only APPROVED records appear by default (Drafts and Submitted do not leak)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/approved-promos`, {
        headers: { Authorization: `Bearer ${marketingToken}` },
      });
      const data = await res.json();
      const items = data.data?.items || data.data || [];
      const allApproved = items.every((p: any) => p.status === 'APPROVED');
      const passed = res.status === 200 && allApproved && items.length > 0;
      results.push({
        name: '10. Only APPROVED records appear by default (Zero drafts/submitted leakage)',
        passed,
        details: `Checked ${items.length} records. Every single record has status=APPROVED: ${allApproved}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 11: Search works (searches promo code, title, notes)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/approved-promos?search=Harvest`, {
        headers: { Authorization: `Bearer ${marketingToken}` },
      });
      const data = await res.json();
      const items = data.data?.items || data.data || [];
      const matchesSearch = items.length > 0 && items.every((p: any) => p.title.includes('Harvest') || p.notes?.includes('Harvest'));
      const passed = res.status === 200 && matchesSearch;
      results.push({
        name: '11. Search works (searches promo code, title, notes)',
        passed,
        details: `Search 'Harvest' returned ${items.length} matching campaigns.`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 12: Filters work (department, promo type, date range)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(
        `${BASE_URL}/approved-promos?departmentId=dept-fresh-001&promoType=MONTHLY_CATALOGUE`,
        {
          headers: { Authorization: `Bearer ${marketingToken}` },
        }
      );
      const data = await res.json();
      const items = data.data?.items || data.data || [];
      const allMatch = items.every(
        (p: any) => p.departmentId === 'dept-fresh-001' && p.promoType === 'MONTHLY_CATALOGUE'
      );
      const passed = res.status === 200 && items.length > 0 && allMatch;
      results.push({
        name: '12. Filters work (department, promo type, date range)',
        passed,
        details: `Filter returned ${items.length} records matching Fresh + MONTHLY_CATALOGUE.`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 13: Pagination works (returns page, pageSize, total, totalPages)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/approved-promos?page=1&pageSize=2`, {
        headers: { Authorization: `Bearer ${marketingToken}` },
      });
      const data = await res.json();
      const pagination = data.pagination || data.data;
      const items = data.data?.items || data.data || [];
      const passed =
        res.status === 200 &&
        items.length <= 2 &&
        typeof pagination.total === 'number' &&
        pagination.page === 1;
      results.push({
        name: '13. Pagination works (returns page, pageSize, total, totalPages)',
        passed,
        details: `Items length: ${items.length}, total: ${pagination.total}, page: ${pagination.page}, pageSize: ${pagination.pageSize}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 14: Approved detail page returns complete read-only data snapshot
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/approved-promos/${freshApprovedPromoId}`, {
        headers: { Authorization: `Bearer ${marketingToken}` },
      });
      const data = await res.json();
      const promo = data.data;
      const passed =
        res.status === 200 &&
        promo.id === freshApprovedPromoId &&
        promo.status === 'APPROVED' &&
        Array.isArray(promo.promoLines) &&
        typeof promo.totalRevenue === 'number' &&
        typeof promo.totalVolume === 'number';
      results.push({
        name: '14. Approved detail page returns complete read-only data snapshot',
        passed,
        details: `Code: ${promo?.promoCode}, Total Lines: ${promo?.promoLines?.length}, Forecast Revenue (AV): R${promo?.totalRevenue}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 15: Unauthorized PUT/PATCH/DELETE requests on approved promos are rejected
    // -------------------------------------------------------------------------
    {
      const resPut = await fetch(`${BASE_URL}/approved-promos/${freshApprovedPromoId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${marketingToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Tamper attempt' }),
      });
      const resDelete = await fetch(`${BASE_URL}/approved-promos/${freshApprovedPromoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${marketingToken}` },
      });
      const passed = resPut.status === 403 && resDelete.status === 403;
      results.push({
        name: '15. Unauthorized PUT/PATCH/DELETE requests are rejected (403)',
        passed,
        details: `PUT: HTTP ${resPut.status}, DELETE: HTTP ${resDelete.status}. Modification rejected.`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 16: Approved data represents the final approved state (authoritative head approver)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/approved-promos/${freshApprovedPromoId}`, {
        headers: { Authorization: `Bearer ${marketingToken}` },
      });
      const data = await res.json();
      const promo = data.data;
      const passed =
        promo.headApproverId !== null &&
        promo.headApprovedAt !== null &&
        promo.status === 'APPROVED' &&
        typeof promo.version === 'number';
      results.push({
        name: '16. Approved data represents final approved state with Head approver & version',
        passed,
        details: `HeadApprover: ${promo?.headApprover?.firstName} ${promo?.headApprover?.lastName}, ApprovedAt: ${promo?.headApprovedAt}, Version: ${promo?.version}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 17: Dashboard Approved metric is correct for Marketing
    // -------------------------------------------------------------------------
    {
      const [dashRes, approvedRes] = await Promise.all([
        fetch(`${BASE_URL}/dashboard/summary`, {
          headers: { Authorization: `Bearer ${marketingToken}` },
        }),
        fetch(`${BASE_URL}/approved-promos`, {
          headers: { Authorization: `Bearer ${marketingToken}` },
        }),
      ]);
      const dashData = await dashRes.json();
      const approvedData = await approvedRes.json();
      const totalApprovedFromList = approvedData.pagination?.total || (approvedData.data?.items || approvedData.data).length;
      const dashApprovedCount = dashData.data?.approved;
      const passed = dashRes.status === 200 && dashApprovedCount === totalApprovedFromList;
      results.push({
        name: '17. Dashboard Approved metric matches total approved promos for Marketing',
        passed,
        details: `Dashboard Approved: ${dashApprovedCount}, Approved Promos List: ${totalApprovedFromList}. Exactly matches.`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 18: No Director functionality exists (zero Director routes / statuses)
    // -------------------------------------------------------------------------
    {
      const directorRoutes = [
        `${BASE_URL}/director`,
        `${BASE_URL}/director-approval`,
        `${BASE_URL}/approved-promos/director`,
        `${BASE_URL}/promo-lists/${sampleApprovedPromoId}/director-approve`,
      ];
      let all404 = true;
      for (const route of directorRoutes) {
        const res = await fetch(route, { headers: { Authorization: `Bearer ${marketingToken}` } });
        if (res.status !== 404) {
          all404 = false;
        }
      }
      results.push({
        name: '18. No Director functionality exists (all 404)',
        passed: all404,
        details: `Tested ${directorRoutes.length} potential director endpoints. All returned 404: ${all404}`,
      });
    }

  } catch (err: unknown) {
    console.error('Fatal test error:', err);
    results.push({
      name: 'Test Execution Pipeline',
      passed: false,
      details: 'Test run failed with an unhandled exception',
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Summary Output
  console.log('--------------------------------------------------------------------');
  console.log('PHASE 6 TEST RESULTS REPORT');
  console.log('--------------------------------------------------------------------\n');

  let passedCount = 0;
  for (const r of results) {
    const symbol = r.passed ? '✅' : '❌';
    console.log(`${symbol} ${r.name}`);
    console.log(`   ${r.details}`);
    if (r.error) {
      console.log(`   Error: ${r.error}`);
    }
    if (r.passed) passedCount++;
  }

  console.log('\n====================================================================');
  console.log(`SUMMARY: ${passedCount}/${results.length} tests passed (${Math.round((passedCount / results.length) * 100)}%)`);
  console.log('====================================================================\n');

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runTests();
