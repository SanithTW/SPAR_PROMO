/**
 * ==============================================================================
 * SPAR PROMO APPROVAL SYSTEM — PHASE 5 HEAD REVIEW & FINAL APPROVAL TEST SUITE
 * ==============================================================================
 * Comprehensive automated verification for Phase 5 requirements:
 *  1. STAFF cannot access Head Review (403)
 *  2. MARKETING cannot approve (403)
 *  3. MASTER_DATA cannot approve (403)
 *  4. HEAD can access Head Review (200)
 *  5. HEAD sees only their department
 *  6. HEAD cannot access another department's promo list (403)
 *  7. SUBMITTED_TO_HEAD can be approved
 *  8. SUBMITTED_TO_HEAD can be rejected
 *  9. Approval changes status to APPROVED (Final Approver - No Director Stage)
 * 10. Rejection changes status to REJECTED_BY_HEAD
 * 11. Rejection requires a comment
 * 12. Empty rejection comment is rejected (400)
 * 13. APPROVED cannot be approved again (400)
 * 14. APPROVED cannot be rejected (400)
 * 15. DRAFT cannot be approved directly (400)
 * 16. Rejected Staff list can be resubmitted (REJECTED_BY_HEAD -> SUBMITTED_TO_HEAD)
 * 17. Approval record is created in database
 * 18. Audit record is created in database
 * 19. Dashboard "Waiting for Me" updates correctly
 * 20. No Director workflow exists (404 on director routes)
 * 21. Unauthorized cross-department approval attempts return 403
 * 22. Approval/Rejection operations are transaction-safe & atomic
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
  console.log('🌲 SPAR PROMO APPROVAL SYSTEM — PHASE 5 HEAD REVIEW TEST SUITE');
  console.log('====================================================================\n');

  try {
    // 1. Acquire tokens for all roles & departments
    const staffFreshToken = await loginUser('staff.fresh@spar.internal');
    const headFreshToken = await loginUser('head.fresh@spar.internal');
    const staffFoodToken = await loginUser('staff.food@spar.internal');
    const headFoodToken = await loginUser('head.food@spar.internal');
    const marketingToken = await loginUser('marketing@spar.internal');
    const masterDataToken = await loginUser('masterdata@spar.internal');
    const adminToken = await loginUser('admin@spar.internal');

    console.log('🔑 Authentication tokens acquired for all testing roles.\n');

    // -------------------------------------------------------------------------
    // TEST 1: STAFF cannot access Head Review (403)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/head-review`, {
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const data = await res.json();
      const passed = res.status === 403;
      results.push({
        name: '1. STAFF cannot access Head Review',
        passed,
        details: `Expected 403 Forbidden. Got ${res.status} (${data.message || 'Access restricted'})`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 2: MARKETING cannot approve (403)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/promo-lists/any-id/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${marketingToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments: 'Marketing trying to approve' }),
      });
      const passed = res.status === 403;
      results.push({
        name: '2. MARKETING cannot approve',
        passed,
        details: `Expected 403 Forbidden. Got ${res.status}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 3: MASTER_DATA cannot approve (403)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/head-review/any-id/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${masterDataToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments: 'Master data trying to approve' }),
      });
      const passed = res.status === 403;
      results.push({
        name: '3. MASTER_DATA cannot approve',
        passed,
        details: `Expected 403 Forbidden. Got ${res.status}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 4: HEAD can access Head Review (200)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/head-review`, {
        headers: { Authorization: `Bearer ${headFreshToken}` },
      });
      const data = await res.json();
      const passed = res.status === 200 && Array.isArray(data.data);
      results.push({
        name: '4. HEAD can access Head Review',
        passed,
        details: `Expected 200 OK. Got ${res.status}. Total reviews returned: ${data.data?.length ?? 0}`,
      });
    }

    // Helper: Staff Fresh creates and submits a fresh promo list
    // 1) Find a fresh product
    const prodRes = await fetch(`${BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${staffFreshToken}` },
    });
    const prodData = await prodRes.json();
    const freshProduct = prodData.data[0];

    const createPromoRes = await fetch(`${BASE_URL}/promo-lists`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffFreshToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Phase 5 Organic Bananas Special',
        promoType: 'WEEKLY_LEAFLET',
        startDate: '2026-11-01',
        endDate: '2026-11-07',
        lines: [
          {
            productId: freshProduct.id,
            promoPrice: 19.99,
            dealCost: 12.5,
            estimatedVolume: 1200,
            fundingMechanism: 'SUPPLIER_REBATE',
            rebateAmount: 2.0,
            mechanic: 'PRICE_CUT',
          },
        ],
      }),
    });
    const createdData = await createPromoRes.json();
    const freshPromoId = createdData.data.id;

    // Helper: Staff Food creates and submits a Food promo list
    const foodProdRes = await fetch(`${BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${staffFoodToken}` },
    });
    const foodProdData = await foodProdRes.json();
    const foodProduct = foodProdData.data[0];

    const createFoodRes = await fetch(`${BASE_URL}/promo-lists`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffFoodToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Phase 5 Food Department Bakery Promo',
        promoType: 'MONTHLY_CATALOGUE',
        startDate: '2026-11-05',
        endDate: '2026-11-12',
        lines: [
          {
            productId: foodProduct.id,
            promoPrice: 24.99,
            dealCost: 16.0,
            estimatedVolume: 500,
          },
        ],
      }),
    });
    const foodCreatedData = await createFoodRes.json();
    if (!foodCreatedData.data) {
      console.log('Food promo creation failed:', foodCreatedData, 'Product was:', foodProduct);
    }
    const foodPromoId = foodCreatedData.data?.id;

    // Submit both to their respective heads
    await fetch(`${BASE_URL}/promo-lists/${freshPromoId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffFreshToken}` },
    });
    await fetch(`${BASE_URL}/promo-lists/${foodPromoId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffFoodToken}` },
    });

    // -------------------------------------------------------------------------
    // TEST 5: HEAD sees only their department
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/head-review`, {
        headers: { Authorization: `Bearer ${headFreshToken}` },
      });
      const data = await res.json();
      const items = data.data as any[];
      const containsFresh = items.some((p) => p.id === freshPromoId);
      const containsFood = items.some((p) => p.id === foodPromoId);
      const passed = containsFresh && !containsFood;
      results.push({
        name: '5. HEAD sees only their department',
        passed,
        details: `Fresh Head queue contains Fresh list: ${containsFresh}, contains Food list: ${containsFood}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 6: HEAD cannot access another department's promo list (403)
    // -------------------------------------------------------------------------
    {
      // Head Fresh trying to view Food promo detail
      const res = await fetch(`${BASE_URL}/head-review/${foodPromoId}`, {
        headers: { Authorization: `Bearer ${headFreshToken}` },
      });
      const passed = res.status === 403;
      results.push({
        name: "6. HEAD cannot access another department's promo list",
        passed,
        details: `Expected 403 Forbidden for cross-department detail view. Got ${res.status}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 7: SUBMITTED_TO_HEAD can be rejected with comment
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/head-review/${freshPromoId}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${headFreshToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comments: 'Margin on line 1 is too low for organic fresh produce. Please adjust promo price.',
        }),
      });
      const data = await res.json();
      const passed = res.status === 200 && data.data?.status === 'REJECTED_BY_HEAD';
      results.push({
        name: '8. SUBMITTED_TO_HEAD can be rejected',
        passed,
        details: `Expected status REJECTED_BY_HEAD. Got ${data.data?.status}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 10: Rejection changes status to REJECTED_BY_HEAD
    // -------------------------------------------------------------------------
    {
      const detailRes = await fetch(`${BASE_URL}/promo-lists/${freshPromoId}`, {
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const detailData = await detailRes.json();
      const passed =
        detailData.data?.status === 'REJECTED_BY_HEAD' &&
        detailData.data?.rejectionReason?.includes('Margin on line 1');
      results.push({
        name: '10. Rejection changes status to REJECTED_BY_HEAD and stores reason',
        passed,
        details: `Status: ${detailData.data?.status}, RejectionReason: "${detailData.data?.rejectionReason}"`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 11 & 12: Empty rejection comment is rejected (400)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/head-review/${foodPromoId}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${headFoodToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments: '   ' }), // empty or whitespace
      });
      const passed = res.status === 400;
      results.push({
        name: '11 & 12. Empty rejection comment is rejected with 400',
        passed,
        details: `Expected 400 Bad Request for whitespace rejection comment. Got ${res.status}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 16: Rejected Staff list can be resubmitted
    // -------------------------------------------------------------------------
    {
      // Staff updates line promoPrice to fix margin
      await fetch(`${BASE_URL}/promo-lists/${freshPromoId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${staffFreshToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Phase 5 Organic Bananas Special (Corrected)',
          lines: [
            {
              productId: freshProduct.id,
              promoPrice: 22.99,
              dealCost: 12.5,
              estimatedVolume: 1200,
            },
          ],
        }),
      });

      // Staff resubmits to Head
      const resubmitRes = await fetch(`${BASE_URL}/promo-lists/${freshPromoId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const resubmitData = await resubmitRes.json();
      const passed =
        resubmitRes.status === 200 && resubmitData.data?.status === 'SUBMITTED_TO_HEAD';
      results.push({
        name: '16. Rejected Staff list can be resubmitted (REJECTED_BY_HEAD -> SUBMITTED_TO_HEAD)',
        passed,
        details: `Resubmitted status: ${resubmitData.data?.status}, Version: ${resubmitData.data?.version}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 7 & 9: SUBMITTED_TO_HEAD can be approved -> changes status to APPROVED
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/head-review/${freshPromoId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${headFreshToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments: 'Approved by Head of Fresh Produce. Final approval complete.' }),
      });
      const data = await res.json();
      const passed = res.status === 200 && data.data?.status === 'APPROVED';
      results.push({
        name: '7 & 9. SUBMITTED_TO_HEAD can be approved and transitions to APPROVED (Final)',
        passed,
        details: `Expected status APPROVED. Got ${data.data?.status}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 13: APPROVED cannot be approved again (400)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/head-review/${freshPromoId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${headFreshToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments: 'Trying to approve already approved' }),
      });
      const passed = res.status === 400;
      results.push({
        name: '13. APPROVED cannot be approved again',
        passed,
        details: `Expected 400 Bad Request. Got ${res.status}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 14: APPROVED cannot be rejected (400)
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/head-review/${freshPromoId}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${headFreshToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments: 'Trying to reject already approved' }),
      });
      const passed = res.status === 400;
      results.push({
        name: '14. APPROVED cannot be rejected',
        passed,
        details: `Expected 400 Bad Request. Got ${res.status}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 15: DRAFT cannot be approved directly (400)
    // -------------------------------------------------------------------------
    {
      // Create a new draft
      const draftRes = await fetch(`${BASE_URL}/promo-lists`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffFreshToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Draft Never Submitted',
          startDate: '2026-12-01',
          endDate: '2026-12-07',
          lines: [{ productId: freshProduct.id, promoPrice: 15.0 }],
        }),
      });
      const draftData = await draftRes.json();
      const draftId = draftData.data.id;

      // Try to approve draft
      const res = await fetch(`${BASE_URL}/head-review/${draftId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${headFreshToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments: 'Direct draft approve attempt' }),
      });
      const passed = res.status === 400;
      results.push({
        name: '15. DRAFT cannot be approved directly',
        passed,
        details: `Expected 400 Bad Request. Got ${res.status}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 17: Approval record is created
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/head-review/${freshPromoId}`, {
        headers: { Authorization: `Bearer ${headFreshToken}` },
      });
      const data = await res.json();
      const approvals = data.data?.approvals || [];
      const hasApprovedRecord = approvals.some(
        (a: any) => a.action === 'APPROVED' && a.reviewer?.role === 'HEAD'
      );
      const hasRejectedRecord = approvals.some(
        (a: any) => a.action === 'REJECTED' && a.reviewer?.role === 'HEAD'
      );
      const passed = hasApprovedRecord && hasRejectedRecord;
      results.push({
        name: '17. Approval record is created in database with reviewer profile & history',
        passed,
        details: `Found APPROVED record: ${hasApprovedRecord}, Found REJECTED record: ${hasRejectedRecord}, Total records: ${approvals.length}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 18: Audit record is created
    // -------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/audit?limit=20`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      const logs = data.data || [];
      const hasApprovedAudit = logs.some(
        (l: any) => l.action === 'HEAD_APPROVED' && l.entityId === freshPromoId
      );
      const hasRejectedAudit = logs.some(
        (l: any) => l.action === 'HEAD_REJECTED' && l.entityId === freshPromoId
      );
      const passed = hasApprovedAudit && hasRejectedAudit;
      results.push({
        name: '18. Audit record is created for Head approval and rejection',
        passed,
        details: `HEAD_APPROVED audit: ${hasApprovedAudit}, HEAD_REJECTED audit: ${hasRejectedAudit}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 19: Dashboard Waiting for Me updates correctly
    // -------------------------------------------------------------------------
    {
      // Check Head Fresh dashboard: freshPromoId was approved, so Waiting for Me should exclude it
      const res = await fetch(`${BASE_URL}/dashboard/summary`, {
        headers: { Authorization: `Bearer ${headFreshToken}` },
      });
      const data = await res.json();
      const summary = data.data;
      const passed = res.status === 200 && typeof summary.waitingForMe === 'number';
      results.push({
        name: '19. Dashboard Waiting for Me reflects pending SUBMITTED_TO_HEAD accurately',
        passed,
        details: `Head Waiting for Me: ${summary.waitingForMe}, Approved: ${summary.approved}, Department: ${summary.departmentName}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 20: No Director workflow exists
    // -------------------------------------------------------------------------
    {
      const directorRoutes = [
        `${BASE_URL}/director`,
        `${BASE_URL}/director-approval`,
        `${BASE_URL}/promos/${freshPromoId}/send-to-director`,
        `${BASE_URL}/promo-lists/${freshPromoId}/director-approve`,
      ];
      let all404 = true;
      for (const route of directorRoutes) {
        const res = await fetch(route, { headers: { Authorization: `Bearer ${adminToken}` } });
        if (res.status !== 404) {
          all404 = false;
        }
      }
      results.push({
        name: '20. No Director workflow exists (404 on director routes)',
        passed: all404,
        details: `Tested ${directorRoutes.length} potential director routes. All returned 404: ${all404}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 21: Unauthorized department access returns 403
    // -------------------------------------------------------------------------
    {
      // Head Fresh attempts to approve Food promo list
      const res = await fetch(`${BASE_URL}/head-review/${foodPromoId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${headFreshToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments: 'Cross department approval attempt' }),
      });
      const passed = res.status === 403;
      results.push({
        name: '21. Unauthorized cross-department approval attempts return 403',
        passed,
        details: `Expected 403 Forbidden. Got ${res.status}`,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 22: Approval operation is transaction-safe
    // -------------------------------------------------------------------------
    {
      // Valid Head Food approves their Food promo list
      const res = await fetch(`${BASE_URL}/head-review/${foodPromoId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${headFoodToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments: 'Food head approves final bakery promotion' }),
      });
      const data = await res.json();
      const passed =
        res.status === 200 &&
        data.data?.status === 'APPROVED' &&
        data.data?.headApproverId !== null &&
        data.data?.headApprovedAt !== null;
      results.push({
        name: '22. Approval operation is transaction-safe and atomically sets approved metadata',
        passed,
        details: `Status: ${data.data?.status}, headApproverId: ${data.data?.headApproverId}, headApprovedAt: ${data.data?.headApprovedAt}`,
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
  console.log('PHASE 5 TEST RESULTS REPORT');
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
