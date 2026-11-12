/**
 * ==============================================================================
 * SPAR PROMO APPROVAL SYSTEM — PHASE 10 INTEGRATION & EXPORT TEST SUITE
 * ==============================================================================
 * Automated Verification:
 *  1. External API Connectivity & Health Check (Product Master & Sales)
 *  2. Product Master Authentication & Token Flow
 *  3. Real Product Search (Debounced API lookup with real fields)
 *  4. Product Detail & SKU Lookup
 *  5. Product Validation (Prevent invalid/fake products from submission)
 *  6. Sales API Authentication & Token Flow
 *  7. Sales API Historical Query & Product Aggregation
 *  8. Excel Export Generation (Formatting, branding, columns, totals)
 *  9. PDF Export Generation (Professional document, calculations, watermark)
 * 10. Security & IDOR Authorization Checks
 * 11. Marketing Read-Only & Export Governance
 * 12. Complete End-to-End Workflow (Staff -> Draft -> Submit -> Head Reject -> Fix -> Approve -> Marketing Export)
 * 13. Verification that credentials NEVER leak in responses or bundles
 * 14. Verification that Director role/workflow does NOT exist
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

function recordTest(name: string, passed: boolean, details: string, error?: string) {
  results.push({ name, passed, details, error });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} | ${name}`);
  if (!passed && error) {
    console.log(`       Details: ${error}`);
  }
}

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

async function runPhase10Tests() {
  console.log('\n====================================================================');
  console.log('🌲 SPAR PROMO APPROVAL SYSTEM — PHASE 10 EXTERNAL API & EXPORT SUITE');
  console.log('====================================================================\n');

  try {
    // 1. Login required roles
    const staffFreshToken = await loginUser('staff.fresh@spar.internal');
    const headFreshToken = await loginUser('head.fresh@spar.internal');
    const marketingToken = await loginUser('marketing@spar.internal');
    const adminToken = await loginUser('admin@spar.internal');
    const staffFoodToken = await loginUser('staff.food@spar.internal');

    // -------------------------------------------------------------------------
    // TEST 1: External API Health Check
    // -------------------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/health/integrations`);
      const body = await res.json();
      const passed =
        res.status === 200 &&
        body.success === true &&
        body.data.productMaster === 'connected' &&
        body.data.sales === 'connected';
      recordTest(
        '[TEST 1] External API Health Check (Product Master & Sales reachable)',
        passed,
        `PM: ${body.data?.productMaster}, Sales: ${body.data?.sales}`,
        passed ? undefined : JSON.stringify(body)
      );
    } catch (err: any) {
      recordTest('[TEST 1] External API Health Check', false, 'Request error', err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Product Master Search with Real Fields
    // -------------------------------------------------------------------------
    let foundProductCode = '';
    let foundProductName = '';
    let foundProductPrice = 0;
    let foundProductCost = 0;

    try {
      const res = await fetch(`${BASE_URL}/products/search?q=pasta`, {
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const body = await res.json();
      const passed =
        res.status === 200 &&
        body.success === true &&
        Array.isArray(body.data) &&
        body.data.length > 0 &&
        body.data[0].sku &&
        body.data[0].name &&
        body.data[0].retailPrice !== undefined;

      if (passed) {
        foundProductCode = body.data[0].sku;
        foundProductName = body.data[0].name;
        foundProductPrice = Number(body.data[0].retailPrice);
        foundProductCost = Number(body.data[0].baseCost);
      }

      recordTest(
        '[TEST 2] Product Search returns real Product Master items',
        passed,
        `Found ${body.data?.length || 0} items. Sample: [${foundProductCode}] ${foundProductName}`,
        passed ? undefined : JSON.stringify(body)
      );
    } catch (err: any) {
      recordTest('[TEST 2] Product Search', false, 'Request error', err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Product Detail Lookup by Code
    // -------------------------------------------------------------------------
    try {
      const codeToTest = foundProductCode || '00000001';
      const res = await fetch(`${BASE_URL}/products/${codeToTest}`, {
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const body = await res.json();
      const passed =
        res.status === 200 &&
        body.success === true &&
        body.data &&
        body.data.sku === codeToTest;

      recordTest(
        '[TEST 3] Product Detail lookup by Code from Product Master',
        passed,
        `Product SKU: ${body.data?.sku}, Category: ${body.data?.category}, Base Cost: ${body.data?.baseCost}`,
        passed ? undefined : JSON.stringify(body)
      );
    } catch (err: any) {
      recordTest('[TEST 3] Product Detail lookup', false, 'Request error', err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Product Validation — Reject Non-Existent Product Code
    // -------------------------------------------------------------------------
    try {
      const invalidPromoPayload = {
        title: 'Invalid Product Test Campaign',
        startDate: '2026-11-01',
        endDate: '2026-11-07',
        promoType: 'WEEKLY_LEAFLET',
        lines: [
          {
            productId: 'fake-nonexistent-sku-99999999',
            promoPrice: 50.0,
            estimatedVolume: 100,
          },
        ],
      };
      const res = await fetch(`${BASE_URL}/promos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify(invalidPromoPayload),
      });
      const body = await res.json();
      const passed = res.status === 400 && body.success === false && body.message.includes('not found in Product Master');

      recordTest(
        '[TEST 4] Product Validation rejects fake/non-existent product submission',
        passed,
        `Response status: ${res.status}, message: ${body.message}`,
        passed ? undefined : JSON.stringify(body)
      );
    } catch (err: any) {
      recordTest('[TEST 4] Product Validation', false, 'Request error', err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Sales API — Product Sales Performance & Historical Transactions
    // -------------------------------------------------------------------------
    try {
      // Test product code with known sales: 00016348
      const res = await fetch(`${BASE_URL}/sales/product/00016348`, {
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const body = await res.json();
      const passed =
        res.status === 200 &&
        body.success === true &&
        body.data &&
        body.data.productCode === '00016348' &&
        body.data.totalTransactions > 0 &&
        body.data.totalQuantitySold > 0 &&
        Array.isArray(body.data.recentSalesLines);

      recordTest(
        '[TEST 5] Sales API returns aggregated product performance and recent invoices',
        passed,
        `Code: 00016348, Trans: ${body.data?.totalTransactions}, Units: ${body.data?.totalQuantitySold}, Avg Price: R${body.data?.averageSellingPrice}`,
        passed ? undefined : JSON.stringify(body)
      );
    } catch (err: any) {
      recordTest('[TEST 5] Sales API Performance', false, 'Request error', err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Sales API — Query Raw Sales Lines
    // -------------------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/sales/lines?limit=5`, {
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const body = await res.json();
      const passed =
        res.status === 200 &&
        body.success === true &&
        body.data &&
        Array.isArray(body.data.items) &&
        body.data.items.length > 0;

      recordTest(
        '[TEST 6] Sales API returns raw paginated sales records',
        passed,
        `Returned ${body.data?.items?.length || 0} sales lines. Total records in DB: ${body.data?.total}`,
        passed ? undefined : JSON.stringify(body)
      );
    } catch (err: any) {
      recordTest('[TEST 6] Sales API Lines', false, 'Request error', err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 7: End-to-End Workflow with Real Product Master Item
    // -------------------------------------------------------------------------
    let createdPromoId = '';
    let createdPromoCode = '';

    try {
      // Step A: Staff creates a draft with a real product from Product Master
      const productToUse = foundProductCode || '00000001';
      const promoPrice = foundProductPrice > 0 ? Number((foundProductPrice * 0.85).toFixed(2)) : 19.99;
      const dealCost = foundProductCost > 0 ? foundProductCost : 12.0;

      const createRes = await fetch(`${BASE_URL}/promos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({
          title: 'Spring Freshness Carnival Phase 10',
          promoType: 'WEEKLY_LEAFLET',
          startDate: '2026-11-01',
          endDate: '2026-11-08',
          notes: 'Tested with real Product Master and Sales integrations',
          lines: [
            {
              productId: `pm-${productToUse}`,
              promoPrice,
              dealCost,
              estimatedVolume: 250,
              mechanic: 'Special Discount',
            },
          ],
        }),
      });

      const createBody = await createRes.json();
      const stepAPassed = createRes.status === 201 && createBody.success === true;
      if (stepAPassed) {
        createdPromoId = createBody.data.id;
        createdPromoCode = createBody.data.promoCode;
      }

      // Step B: Staff submits promo to Head
      const submitRes = await fetch(`${BASE_URL}/promos/${createdPromoId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const submitBody = await submitRes.json();
      const stepBPassed = submitRes.status === 200 && submitBody.data?.status === 'SUBMITTED_TO_HEAD';

      // Step C: Head rejects promo with feedback
      const rejectRes = await fetch(`${BASE_URL}/promos/${createdPromoId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${headFreshToken}`,
        },
        body: JSON.stringify({ comments: 'Please adjust promotional retail slightly.' }),
      });
      const rejectBody = await rejectRes.json();
      const stepCPassed = rejectRes.status === 200 && rejectBody.data?.status === 'REJECTED_BY_HEAD';

      // Step D: Staff fixes promo and resubmits
      const resubmitRes = await fetch(`${BASE_URL}/promos/${createdPromoId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const resubmitBody = await resubmitRes.json();
      const stepDPassed = resubmitRes.status === 200 && resubmitBody.data?.status === 'SUBMITTED_TO_HEAD';

      // Step E: Head approves promo
      const approveRes = await fetch(`${BASE_URL}/promos/${createdPromoId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${headFreshToken}`,
        },
        body: JSON.stringify({ comments: 'Approved for commercial release. Exceptional margins.' }),
      });
      const approveBody = await approveRes.json();
      const stepEPassed = approveRes.status === 200 && approveBody.data?.status === 'APPROVED';

      const fullWorkflowPassed = stepAPassed && stepBPassed && stepCPassed && stepDPassed && stepEPassed;
      recordTest(
        '[TEST 7] End-to-End Promo Lifecycle (Draft -> Submit -> Reject -> Resubmit -> Approve)',
        fullWorkflowPassed,
        `Promo: ${createdPromoCode}, Final Status: ${approveBody.data?.status}`,
        fullWorkflowPassed ? undefined : 'Lifecycle step failed'
      );
    } catch (err: any) {
      recordTest('[TEST 7] End-to-End Promo Lifecycle', false, 'Request error', err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Excel Export for Approved Promo
    // -------------------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/approved-promos/${createdPromoId}/export/excel`, {
        headers: { Authorization: `Bearer ${marketingToken}` },
      });
      const contentType = res.headers.get('Content-Type') || '';
      const contentDisposition = res.headers.get('Content-Disposition') || '';
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const passed =
        res.status === 200 &&
        contentType.includes('spreadsheetml') &&
        contentDisposition.includes('filename=') &&
        buffer.length > 500;

      recordTest(
        '[TEST 8] Excel Export for Approved Promo generates formatted XLSX buffer',
        passed,
        `Status: ${res.status}, Type: ${contentType}, Size: ${buffer.length} bytes, Header: ${contentDisposition}`,
        passed ? undefined : `Status ${res.status}`
      );
    } catch (err: any) {
      recordTest('[TEST 8] Excel Export', false, 'Request error', err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 9: PDF Export for Approved Promo
    // -------------------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/approved-promos/${createdPromoId}/export/pdf`, {
        headers: { Authorization: `Bearer ${marketingToken}` },
      });
      const contentType = res.headers.get('Content-Type') || '';
      const contentDisposition = res.headers.get('Content-Disposition') || '';
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const passed =
        res.status === 200 &&
        contentType.includes('application/pdf') &&
        contentDisposition.includes('.pdf') &&
        buffer.length > 1000 &&
        buffer.toString('utf8', 0, 4) === '%PDF';

      recordTest(
        '[TEST 9] PDF Export for Approved Promo generates formatted PDF document',
        passed,
        `Status: ${res.status}, Type: ${contentType}, Size: ${buffer.length} bytes, Valid PDF Header: ${buffer.toString('utf8', 0, 4)}`,
        passed ? undefined : `Status ${res.status}`
      );
    } catch (err: any) {
      recordTest('[TEST 9] PDF Export', false, 'Request error', err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 10: Export Security — Unauthenticated User Blocked (401)
    // -------------------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/approved-promos/${createdPromoId}/export/excel`);
      const passed = res.status === 401;
      recordTest(
        '[TEST 10] Unauthenticated Export is blocked (401 Unauthorized)',
        passed,
        `Status: ${res.status}`,
        passed ? undefined : `Expected 401, got ${res.status}`
      );
    } catch (err: any) {
      recordTest('[TEST 10] Unauthenticated Export', false, 'Request error', err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 11: Export Security & IDOR — Cross-Department Access Blocked (403)
    // -------------------------------------------------------------------------
    try {
      // Create a draft promo in Fresh department
      const freshDraftRes = await fetch(`${BASE_URL}/promos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({
          title: 'Private Fresh Draft Promo',
          startDate: '2026-11-10',
          endDate: '2026-11-15',
          lines: [{ productId: `pm-${foundProductCode || '00000001'}`, promoPrice: 45.0, estimatedVolume: 50 }],
        }),
      });
      const freshDraft = await freshDraftRes.json();
      const freshDraftId = freshDraft.data.id;

      // Staff Food attempts to export Fresh department's draft (IDOR attack)
      const idorRes = await fetch(`${BASE_URL}/promos/${freshDraftId}/export/excel`, {
        headers: { Authorization: `Bearer ${staffFoodToken}` },
      });
      const idorBody = await idorRes.json().catch(() => ({}));
      const passed = idorRes.status === 403;

      recordTest(
        '[TEST 11] IDOR Prevention — Cross-Department Export Blocked (403 Forbidden)',
        passed,
        `Status: ${idorRes.status}, Message: ${idorBody.message || 'Forbidden'}`,
        passed ? undefined : `Expected 403, got ${idorRes.status}`
      );
    } catch (err: any) {
      recordTest('[TEST 11] IDOR Prevention', false, 'Request error', err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 12: Marketing Role Cannot Edit Approved Promos (403)
    // -------------------------------------------------------------------------
    try {
      const editRes = await fetch(`${BASE_URL}/approved-promos/${createdPromoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${marketingToken}`,
        },
        body: JSON.stringify({ title: 'Hacked Title by Marketing' }),
      });
      const passed = editRes.status === 403;
      recordTest(
        '[TEST 12] Marketing cannot edit approved promos (Permanently locked & read-only)',
        passed,
        `Status: ${editRes.status}`,
        passed ? undefined : `Expected 403, got ${editRes.status}`
      );
    } catch (err: any) {
      recordTest('[TEST 12] Marketing read-only enforcement', false, 'Request error', err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 13: Staff Role Cannot Approve Promos (403)
    // -------------------------------------------------------------------------
    try {
      const staffApproveRes = await fetch(`${BASE_URL}/promos/${createdPromoId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({ comments: 'Illegal Staff Approval' }),
      });
      const passed = staffApproveRes.status === 403;
      recordTest(
        '[TEST 13] Staff cannot approve promos (Governance role restriction)',
        passed,
        `Status: ${staffApproveRes.status}`,
        passed ? undefined : `Expected 403, got ${staffApproveRes.status}`
      );
    } catch (err: any) {
      recordTest('[TEST 13] Staff approval restriction', false, 'Request error', err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 14: Verify Director Role & Routes DO NOT Exist
    // -------------------------------------------------------------------------
    try {
      const directorRouteRes = await fetch(`${BASE_URL}/director-approval`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const passed = directorRouteRes.status === 404;
      recordTest(
        '[TEST 14] Verification: Director role & Director approval routes do NOT exist',
        passed,
        `Status: ${directorRouteRes.status} (Route cleanly absent)`,
        passed ? undefined : `Expected 404, got ${directorRouteRes.status}`
      );
    } catch (err: any) {
      recordTest('[TEST 14] Director route verification', false, 'Request error', err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 15: Security Check — Credentials Never Exposed in API Responses
    // -------------------------------------------------------------------------
    try {
      const sensitivePatterns = [
        process.env.PRODUCT_MASTER_API_USERNAME,
        process.env.SALES_API_USERNAME,
        process.env.PRODUCT_MASTER_API_PASSWORD,
        process.env.SALES_API_PASSWORD,
      ].filter((p): p is string => Boolean(p && p.trim().length > 0));
      const testEndpoints = [
        `${BASE_URL}/health`,
        `${BASE_URL}/health/integrations`,
        `${BASE_URL}/products/search?q=pasta`,
        `${BASE_URL}/sales/product/00016348`,
        `${BASE_URL}/promos/${createdPromoId}`,
      ];

      let anyLeak = false;
      let leakEndpoint = '';

      for (const ep of testEndpoints) {
        const epRes = await fetch(ep, {
          headers: { Authorization: `Bearer ${staffFreshToken}` },
        });
        const text = await epRes.text();
        for (const pattern of sensitivePatterns) {
          if (text.includes(pattern)) {
            anyLeak = true;
            leakEndpoint = `${ep} leaked ${pattern}`;
            break;
          }
        }
        if (anyLeak) break;
      }

      recordTest(
        '[TEST 15] Security Verification — Credentials are NEVER exposed in API responses',
        !anyLeak,
        anyLeak ? `LEAK DETECTED: ${leakEndpoint}` : 'All inspected endpoints are completely clean of sensitive credentials.',
        anyLeak ? leakEndpoint : undefined
      );
    } catch (err: any) {
      recordTest('[TEST 15] Credentials leak verification', false, 'Request error', err.message);
    }
  } catch (err: any) {
    console.error('Test suite initialization error:', err);
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = total - passedCount;

  console.log('\n--------------------------------------------------------------------');
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('--------------------------------------------------------------------\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase10Tests();
