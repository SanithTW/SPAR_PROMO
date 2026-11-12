/**
 * ==============================================================================
 * SPAR PROMO APPROVAL SYSTEM — PHASE 4 PROMO ENTRY TEST SUITE
 * ==============================================================================
 * Comprehensive automated verification of:
 * 1. Staff can create a promo list
 * 2. Promo list defaults to DRAFT
 * 3. Staff cannot create a list for another department (ownership derived from token)
 * 4. Staff can save a draft with lines
 * 5. Staff can retrieve their own draft
 * 6. Staff cannot edit another user's promo list (across departments or creators)
 * 7. Staff can edit their own DRAFT
 * 8. Staff cannot edit SUBMITTED_TO_HEAD
 * 9. Staff can edit REJECTED_BY_HEAD (resubmission flow)
 * 10. Staff can submit a valid DRAFT
 * 11. Submission changes status to SUBMITTED_TO_HEAD
 * 12. Invalid promo lists cannot be submitted (e.g. invalid price <= 0)
 * 13. Empty promo list (0 lines) cannot be submitted
 * 14. Duplicate products are handled and rejected with friendly message
 * 15. Backend validation cannot be bypassed
 * 16. Calculated values are authoritative on the backend (frontend spoofing ignored)
 * 17. APPROVED lists cannot be edited
 * 18. Unauthorized users receive 401/403
 * 19. Verify no Director role, route, or status exists
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
  console.log('\n================================================================');
  console.log('🌲 SPAR PROMO APPROVAL SYSTEM - PHASE 4 PROMO ENTRY TEST SUITE');
  console.log('================================================================\n');

  try {
    // Acquire tokens
    const staffFreshToken = await loginUser('staff.fresh@spar.internal'); // Fresh Dept
    const staffFoodToken = await loginUser('staff.food@spar.internal');   // Food Dept
    const headFreshToken = await loginUser('head.fresh@spar.internal');   // Head of Fresh
    const marketingToken = await loginUser('marketing@spar.internal');

    // ----------------------------------------------------
    // TEST 1 & 2: Staff can create a promo list & defaults to DRAFT
    // ----------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/promo-lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({
          title: 'Week 46 Fresh Produce Spring Extravaganza',
          promoType: 'WEEKLY_LEAFLET',
          startDate: '2026-11-15T00:00:00.000Z',
          endDate: '2026-11-21T23:59:59.000Z',
          notes: 'Created by Marcus Chen for Fresh produce flyer',
        }),
      });

      const body = await res.json();
      const promo = body.data;

      if (res.status === 201 && promo && promo.status === 'DRAFT' && promo.promoCode.startsWith('PR-')) {
        results.push({
          name: '[TEST 1 & 2] Staff can create a promo list & defaults to DRAFT',
          passed: true,
          details: `Created Promo ID: ${promo.id}, Code: ${promo.promoCode}, Status: ${promo.status}`,
        });
      } else {
        results.push({
          name: '[TEST 1 & 2] Staff can create a promo list & defaults to DRAFT',
          passed: false,
          details: `Expected 201 DRAFT, got status ${res.status}: ${JSON.stringify(body)}`,
        });
      }
    } catch (e: any) {
      results.push({
        name: '[TEST 1 & 2] Staff can create a promo list & defaults to DRAFT',
        passed: false,
        details: e.message,
      });
    }

    // ----------------------------------------------------
    // TEST 3: Staff cannot create a list for another department
    // ----------------------------------------------------
    try {
      // Marcus Chen belongs to dept-fresh-001. Attempts to specify dept-food-002
      const res = await fetch(`${BASE_URL}/promo-lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({
          title: 'Tampering Test: Food Promo by Fresh Staff',
          departmentId: 'dept-food-002',
          startDate: '2026-11-15T00:00:00.000Z',
          endDate: '2026-11-21T23:59:59.000Z',
        }),
      });

      const body = await res.json();
      if (res.status === 403 || res.status === 400) {
        results.push({
          name: '[TEST 3] Staff cannot create a list for another department',
          passed: true,
          details: `Tampering blocked with HTTP ${res.status}: "${body.message}"`,
        });
      } else {
        results.push({
          name: '[TEST 3] Staff cannot create a list for another department',
          passed: false,
          details: `Expected 403/400, got ${res.status}: ${JSON.stringify(body)}`,
        });
      }
    } catch (e: any) {
      results.push({
        name: '[TEST 3] Staff cannot create a list for another department',
        passed: false,
        details: e.message,
      });
    }

    // ----------------------------------------------------
    // TEST 4 & 5: Staff can save a draft with lines & retrieve it
    // ----------------------------------------------------
    let createdDraftId = '';
    try {
      const createRes = await fetch(`${BASE_URL}/promo-lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({
          title: 'Week 47 Fresh Weekend Market Blitz',
          promoType: 'INSTORE_SPECIAL',
          startDate: '2026-11-22T00:00:00.000Z',
          endDate: '2026-11-28T23:59:59.000Z',
          lines: [
            {
              productId: 'prod-fresh-001', // SPAR Milk 2L
              promoPrice: 24.99,
              dealCost: 20.00,
              estimatedVolume: 500,
              mechanic: 'Price Cut',
              displayType: 'End Cap',
            },
            {
              productId: 'prod-fresh-003', // Onions 2kg
              promoPrice: 21.99,
              rebateAmount: 2.00,
              estimatedVolume: 400,
              mechanic: 'Bulk Deal',
            },
          ],
        }),
      });

      const createBody = await createRes.json();
      createdDraftId = createBody.data?.id;

      // Retrieve via GET
      const getRes = await fetch(`${BASE_URL}/promo-lists/${createdDraftId}`, {
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const getBody = await getRes.json();
      const draft = getBody.data;

      if (
        getRes.ok &&
        draft &&
        draft.promoLines?.length === 2 &&
        draft.status === 'DRAFT' &&
        draft.totalVolume === 900
      ) {
        results.push({
          name: '[TEST 4 & 5] Staff can save a draft with lines & retrieve it',
          passed: true,
          details: `Draft retrieved with 2 promo lines, total volume ${draft.totalVolume}, total revenue ${draft.totalRevenue}`,
        });
      } else {
        results.push({
          name: '[TEST 4 & 5] Staff can save a draft with lines & retrieve it',
          passed: false,
          details: `Retrieval failed or incomplete: ${JSON.stringify(getBody)}`,
        });
      }
    } catch (e: any) {
      results.push({
        name: '[TEST 4 & 5] Staff can save a draft with lines & retrieve it',
        passed: false,
        details: e.message,
      });
    }

    // ----------------------------------------------------
    // TEST 6: Staff cannot edit another user's promo list
    // ----------------------------------------------------
    try {
      // Lucas Meyer (Food Staff) tries to edit Marcus Chen's Fresh draft
      const res = await fetch(`${BASE_URL}/promo-lists/${createdDraftId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFoodToken}`,
        },
        body: JSON.stringify({
          title: 'Hacked Title by Food Staff',
        }),
      });

      const body = await res.json();
      if (res.status === 403) {
        results.push({
          name: "[TEST 6] Staff cannot edit another user's promo list",
          passed: true,
          details: `Cross-user/department edit properly rejected with HTTP 403: "${body.message}"`,
        });
      } else {
        results.push({
          name: "[TEST 6] Staff cannot edit another user's promo list",
          passed: false,
          details: `Expected 403, got ${res.status}: ${JSON.stringify(body)}`,
        });
      }
    } catch (e: any) {
      results.push({
        name: "[TEST 6] Staff cannot edit another user's promo list",
        passed: false,
        details: e.message,
      });
    }

    // ----------------------------------------------------
    // TEST 7: Staff can edit their own DRAFT
    // ----------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/promo-lists/${createdDraftId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({
          title: 'Week 47 Fresh Weekend Market Blitz (Updated)',
          notes: 'Added fresh chicken fillets and updated pricing',
          lines: [
            {
              productId: 'prod-fresh-001',
              promoPrice: 23.99, // modified price
              dealCost: 19.50,
              estimatedVolume: 600,
            },
            {
              productId: 'prod-fresh-006', // Chicken Breasts
              promoPrice: 79.99,
              dealCost: 62.00,
              estimatedVolume: 350,
            },
          ],
        }),
      });

      const body = await res.json();
      const updated = body.data;

      if (res.ok && updated.title.includes('(Updated)') && updated.promoLines?.length === 2) {
        results.push({
          name: '[TEST 7] Staff can edit their own DRAFT',
          passed: true,
          details: `Updated title to "${updated.title}", lines count: ${updated.promoLines.length}`,
        });
      } else {
        results.push({
          name: '[TEST 7] Staff can edit their own DRAFT',
          passed: false,
          details: `Edit failed: ${JSON.stringify(body)}`,
        });
      }
    } catch (e: any) {
      results.push({
        name: '[TEST 7] Staff can edit their own DRAFT',
        passed: false,
        details: e.message,
      });
    }

    // ----------------------------------------------------
    // TEST 8: Staff cannot edit SUBMITTED_TO_HEAD
    // ----------------------------------------------------
    try {
      // promo-fresh-001 is already SUBMITTED_TO_HEAD
      const res = await fetch(`${BASE_URL}/promo-lists/promo-fresh-001`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({
          title: 'Attempting to edit submitted promo',
        }),
      });

      const body = await res.json();
      if (res.status === 400 && body.message.includes('waiting for Head review')) {
        results.push({
          name: '[TEST 8] Staff cannot edit SUBMITTED_TO_HEAD',
          passed: true,
          details: `Blocked correctly with HTTP 400: "${body.message}"`,
        });
      } else {
        results.push({
          name: '[TEST 8] Staff cannot edit SUBMITTED_TO_HEAD',
          passed: false,
          details: `Expected 400 lock, got ${res.status}: ${JSON.stringify(body)}`,
        });
      }
    } catch (e: any) {
      results.push({
        name: '[TEST 8] Staff cannot edit SUBMITTED_TO_HEAD',
        passed: false,
        details: e.message,
      });
    }

    // ----------------------------------------------------
    // TEST 9: Staff can edit REJECTED_BY_HEAD
    // ----------------------------------------------------
    try {
      // promo-fresh-003 is REJECTED_BY_HEAD with feedback from Evelyn Vance
      const res = await fetch(`${BASE_URL}/promo-lists/promo-fresh-003`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({
          title: 'Week 43 Braai Weekend Meat Blitz (Corrected)',
          lines: [
            {
              productId: 'prod-fresh-002', // Beef Mince
              promoPrice: 84.99,           // Raised from 79.99 per Head feedback
              dealCost: 70.00,             // Revised deal cost
              estimatedVolume: 1500,
            },
            {
              productId: 'prod-fresh-006', // Chicken Breasts
              promoPrice: 74.99,
              dealCost: 59.00,
              estimatedVolume: 1100,
            },
          ],
        }),
      });

      const body = await res.json();
      if (res.ok && body.data.status === 'REJECTED_BY_HEAD') {
        results.push({
          name: '[TEST 9] Staff can edit REJECTED_BY_HEAD',
          passed: true,
          details: `Successfully corrected promo lines on rejected promo PR-2026-W43-FRESH-03 per Head feedback.`,
        });
      } else {
        results.push({
          name: '[TEST 9] Staff can edit REJECTED_BY_HEAD',
          passed: false,
          details: `Expected success on REJECTED_BY_HEAD edit, got: ${JSON.stringify(body)}`,
        });
      }
    } catch (e: any) {
      results.push({
        name: '[TEST 9] Staff can edit REJECTED_BY_HEAD',
        passed: false,
        details: e.message,
      });
    }

    // ----------------------------------------------------
    // TEST 10 & 11: Staff can submit a valid DRAFT -> transitions to SUBMITTED_TO_HEAD
    // ----------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/promo-lists/${createdDraftId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
      });

      const body = await res.json();
      const submitted = body.data;

      if (res.ok && submitted.status === 'SUBMITTED_TO_HEAD' && submitted.submittedAt) {
        results.push({
          name: '[TEST 10 & 11] Staff can submit a valid DRAFT -> transitions to SUBMITTED_TO_HEAD',
          passed: true,
          details: `Promo transitioned to SUBMITTED_TO_HEAD at ${submitted.submittedAt}`,
        });
      } else {
        results.push({
          name: '[TEST 10 & 11] Staff can submit a valid DRAFT -> transitions to SUBMITTED_TO_HEAD',
          passed: false,
          details: `Submission failed: ${JSON.stringify(body)}`,
        });
      }
    } catch (e: any) {
      results.push({
        name: '[TEST 10 & 11] Staff can submit a valid DRAFT -> transitions to SUBMITTED_TO_HEAD',
        passed: false,
        details: e.message,
      });
    }

    // ----------------------------------------------------
    // TEST 12: Invalid promo line values cannot be submitted
    // ----------------------------------------------------
    try {
      // Create draft with 0 or negative price
      const createRes = await fetch(`${BASE_URL}/promo-lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({
          title: 'Invalid Promo Line Test',
          startDate: '2026-11-20T00:00:00.000Z',
          endDate: '2026-11-27T23:59:59.000Z',
          lines: [
            {
              productId: 'prod-fresh-001',
              promoPrice: -5.0, // Invalid negative price
            },
          ],
        }),
      });

      const createBody = await createRes.json();
      if (createRes.status === 400 && createBody.message.includes('greater than 0')) {
        results.push({
          name: '[TEST 12] Invalid promo line values cannot be submitted',
          passed: true,
          details: `Negative price blocked with: "${createBody.message}"`,
        });
      } else {
        results.push({
          name: '[TEST 12] Invalid promo line values cannot be submitted',
          passed: false,
          details: `Expected 400, got ${createRes.status}: ${JSON.stringify(createBody)}`,
        });
      }
    } catch (e: any) {
      results.push({
        name: '[TEST 12] Invalid promo line values cannot be submitted',
        passed: false,
        details: e.message,
      });
    }

    // ----------------------------------------------------
    // TEST 13: Empty promo list (0 lines) cannot be submitted
    // ----------------------------------------------------
    try {
      const emptyDraftRes = await fetch(`${BASE_URL}/promo-lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({
          title: 'Empty Promo Draft Test',
          startDate: '2026-11-20T00:00:00.000Z',
          endDate: '2026-11-27T23:59:59.000Z',
          lines: [],
        }),
      });
      const emptyDraft = (await emptyDraftRes.json()).data;

      const submitRes = await fetch(`${BASE_URL}/promo-lists/${emptyDraft.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
      });

      const submitBody = await submitRes.json();
      if (submitRes.status === 400 && submitBody.message.includes('at least one product')) {
        results.push({
          name: '[TEST 13] Empty promo list (0 lines) cannot be submitted',
          passed: true,
          details: `Blocked correctly: "${submitBody.message}"`,
        });
      } else {
        results.push({
          name: '[TEST 13] Empty promo list (0 lines) cannot be submitted',
          passed: false,
          details: `Expected 400, got ${submitRes.status}: ${JSON.stringify(submitBody)}`,
        });
      }
    } catch (e: any) {
      results.push({
        name: '[TEST 13] Empty promo list (0 lines) cannot be submitted',
        passed: false,
        details: e.message,
      });
    }

    // ----------------------------------------------------
    // TEST 14: Duplicate products are handled correctly
    // ----------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/promo-lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({
          title: 'Duplicate SKU Test',
          startDate: '2026-11-20T00:00:00.000Z',
          endDate: '2026-11-27T23:59:59.000Z',
          lines: [
            { productId: 'prod-fresh-001', promoPrice: 24.99 },
            { productId: 'prod-fresh-001', promoPrice: 22.99 }, // Duplicate!
          ],
        }),
      });

      const body = await res.json();
      if (res.status === 400 && body.message.includes('already in the promo list')) {
        results.push({
          name: '[TEST 14] Duplicate products are handled correctly',
          passed: true,
          details: `Duplicate product rejected with: "${body.message}"`,
        });
      } else {
        results.push({
          name: '[TEST 14] Duplicate products are handled correctly',
          passed: false,
          details: `Expected duplicate rejection, got ${res.status}: ${JSON.stringify(body)}`,
        });
      }
    } catch (e: any) {
      results.push({
        name: '[TEST 14] Duplicate products are handled correctly',
        passed: false,
        details: e.message,
      });
    }

    // ----------------------------------------------------
    // TEST 15: Backend validation cannot be bypassed
    // ----------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/promo-lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({
          title: '', // empty title
          startDate: 'invalid-date',
          endDate: '2026-10-01',
        }),
      });

      const body = await res.json();
      if (res.status === 400) {
        results.push({
          name: '[TEST 15] Backend validation cannot be bypassed',
          passed: true,
          details: `Zod validation blocked invalid payload: "${body.message}"`,
        });
      } else {
        results.push({
          name: '[TEST 15] Backend validation cannot be bypassed',
          passed: false,
          details: `Expected 400, got ${res.status}: ${JSON.stringify(body)}`,
        });
      }
    } catch (e: any) {
      results.push({
        name: '[TEST 15] Backend validation cannot be bypassed',
        passed: false,
        details: e.message,
      });
    }

    // ----------------------------------------------------
    // TEST 16: Calculated values cannot be trusted from frontend
    // ----------------------------------------------------
    try {
      // Send spoofed forecastMargin = 999999 and marginPercent = 99.9%
      const res = await fetch(`${BASE_URL}/promo-lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({
          title: 'Calculation Spoofing Verification',
          startDate: '2026-11-20T00:00:00.000Z',
          endDate: '2026-11-27T23:59:59.000Z',
          lines: [
            {
              productId: 'prod-fresh-001', // Normal retail R29.99, Base cost R22.50, VAT 0%
              promoPrice: 24.99,
              dealCost: 20.00,
              estimatedVolume: 100,
              // Spoofed values that frontend might try to pass:
              discountAmount: 999,
              forecastMargin: 999999,
              marginPercent: 99.99,
            },
          ],
        }),
      });

      const body = await res.json();
      const line = body.data?.promoLines?.[0];

      // True authoritative margin: retailExclVat (24.99) - netCost (20.00) = 4.99; forecastMargin = 499.00
      if (line && line.forecastMargin === 499.0 && line.discountAmount === 5.0) {
        results.push({
          name: '[TEST 16] Calculated values cannot be trusted from frontend (Authoritative server calculation)',
          passed: true,
          details: `Server calculated discountAmount=R${line.discountAmount} (not 999), forecastMargin=R${line.forecastMargin} (not 999999).`,
        });
      } else {
        results.push({
          name: '[TEST 16] Calculated values cannot be trusted from frontend (Authoritative server calculation)',
          passed: false,
          details: `Server did not enforce authoritative calculation: ${JSON.stringify(line)}`,
        });
      }
    } catch (e: any) {
      results.push({
        name: '[TEST 16] Calculated values cannot be trusted from frontend',
        passed: false,
        details: e.message,
      });
    }

    // ----------------------------------------------------
    // TEST 17: APPROVED lists cannot be edited
    // ----------------------------------------------------
    try {
      // promo-fresh-004 is APPROVED
      const res = await fetch(`${BASE_URL}/promo-lists/promo-fresh-004`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffFreshToken}`,
        },
        body: JSON.stringify({
          title: 'Tampering with Approved Promo',
        }),
      });

      const body = await res.json();
      if (res.status === 400 && body.message.includes('Approved promotional lists are locked')) {
        results.push({
          name: '[TEST 17] APPROVED lists cannot be edited',
          passed: true,
          details: `Edit locked: "${body.message}"`,
        });
      } else {
        results.push({
          name: '[TEST 17] APPROVED lists cannot be edited',
          passed: false,
          details: `Expected 400 locked, got ${res.status}: ${JSON.stringify(body)}`,
        });
      }
    } catch (e: any) {
      results.push({
        name: '[TEST 17] APPROVED lists cannot be edited',
        passed: false,
        details: e.message,
      });
    }

    // ----------------------------------------------------
    // TEST 18: Unauthorized users receive 403/appropriate errors
    // ----------------------------------------------------
    try {
      // Marketing role attempting to create promo lists
      const res = await fetch(`${BASE_URL}/promo-lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${marketingToken}`,
        },
        body: JSON.stringify({
          title: 'Marketing Attempting to Create Promo',
          startDate: '2026-11-20T00:00:00.000Z',
          endDate: '2026-11-27T23:59:59.000Z',
        }),
      });

      const body = await res.json();
      if (res.status === 403) {
        results.push({
          name: '[TEST 18] Unauthorized users receive 403/appropriate errors',
          passed: true,
          details: `Marketing role creation blocked with HTTP 403: "${body.message}"`,
        });
      } else {
        results.push({
          name: '[TEST 18] Unauthorized users receive 403/appropriate errors',
          passed: false,
          details: `Expected 403, got ${res.status}: ${JSON.stringify(body)}`,
        });
      }
    } catch (e: any) {
      results.push({
        name: '[TEST 18] Unauthorized users receive 403/appropriate errors',
        passed: false,
        details: e.message,
      });
    }

    // ----------------------------------------------------
    // TEST 19: No Director role/status/route exists
    // ----------------------------------------------------
    try {
      const resRoute = await fetch(`${BASE_URL}/director/approval`, {
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });

      const resSubmitDirector = await fetch(`${BASE_URL}/promo-lists/${createdDraftId}/submit-to-director`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });

      if (resRoute.status === 404 && resSubmitDirector.status === 404) {
        results.push({
          name: '[TEST 19] No Director role/status/route exists in Promo Entry',
          passed: true,
          details: `All Director routes return HTTP 404. Head review is the sole final approver.`,
        });
      } else {
        results.push({
          name: '[TEST 19] No Director role/status/route exists in Promo Entry',
          passed: false,
          details: `Expected 404 for director routes, got ${resRoute.status} and ${resSubmitDirector.status}`,
        });
      }
    } catch (e: any) {
      results.push({
        name: '[TEST 19] No Director role/status/route exists in Promo Entry',
        passed: false,
        details: e.message,
      });
    }
  } catch (globalErr: any) {
    console.error('Test execution error:', globalErr);
  }

  // Print Summary
  console.log('----------------------------------------------------------------');
  console.log('PHASE 4 TEST RESULTS:');
  console.log('----------------------------------------------------------------');
  let passCount = 0;
  for (const r of results) {
    if (r.passed) {
      passCount++;
      console.log(`✅ PASS ${r.name}`);
      console.log(`       Details: ${r.details}`);
    } else {
      console.log(`❌ FAIL ${r.name}`);
      console.log(`       Details: ${r.details}`);
    }
  }

  console.log('----------------------------------------------------------------');
  console.log(`Total: ${results.length} | Passed: ${passCount} | Failed: ${results.length - passCount}`);
  console.log('================================================================\n');

  if (passCount !== results.length) {
    process.exit(1);
  }
}

runTests();
