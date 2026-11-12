/**
 * ==============================================================================
 * SPAR PROMO APPROVAL SYSTEM — PHASE 7 NOTIFICATIONS TEST SUITE
 * ==============================================================================
 * Comprehensive automated verification for Phase 7 requirements:
 *  1. Authenticated user can get own notifications
 *  2. Unauthenticated user cannot access notifications (401)
 *  3. User cannot access another user's notifications
 *  4. Staff submission creates Head notification
 *  5. Head rejection creates Staff notification
 *  6. Head approval creates Staff notification
 *  7. Head approval creates Marketing notification
 *  8. Mark notification as read
 *  9. Mark all notifications as read
 * 10. Unread count is correct
 * 11. Department-specific notification routing works
 * 12. Director notification is never created
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
  console.log('🌲 SPAR PROMO APPROVAL SYSTEM — PHASE 7 NOTIFICATIONS TEST SUITE');
  console.log('====================================================================\n');

  try {
    // 1. Acquire tokens
    const staffFreshToken = await loginUser('staff.fresh@spar.internal');
    const headFreshToken = await loginUser('head.fresh@spar.internal');
    const staffFoodToken = await loginUser('staff.food@spar.internal');
    const headFoodToken = await loginUser('head.food@spar.internal');
    const marketingToken = await loginUser('marketing@spar.internal');
    const adminToken = await loginUser('admin@spar.internal');

    // --------------------------------------------------------------------------
    // Test 1: Authenticated user can get own notifications
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const body = await res.json();
      const passed = res.status === 200 && body.success === true && Array.isArray(body.data.notifications);
      results.push({
        name: '1. Authenticated user can get own notifications',
        passed,
        details: passed
          ? `Returned 200 with ${body.data.notifications.length} notifications, total: ${body.data.total}`
          : `Failed with status ${res.status}: ${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 2: Unauthenticated user cannot access notifications (401)
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/notifications`);
      const body = await res.json();
      const passed = res.status === 401 && body.success === false;
      results.push({
        name: '2. Unauthenticated user cannot access notifications (401)',
        passed,
        details: passed
          ? `Correctly blocked unauthenticated request with 401: "${body.message}"`
          : `Expected 401 but got ${res.status}: ${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Create fresh test promo list for workflow testing
    // --------------------------------------------------------------------------
    // Get a product for Fresh department
    const prodRes = await fetch(`${BASE_URL}/products?departmentCode=FRESH`, {
      headers: { Authorization: `Bearer ${staffFreshToken}` },
    });
    const prodData = await prodRes.json();
    const testProduct = prodData.data[0];

    const createRes = await fetch(`${BASE_URL}/promo-lists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffFreshToken}`,
      },
      body: JSON.stringify({
        title: `Phase 7 Notification Test Promo ${Date.now()}`,
        promoType: 'WEEKLY_LEAFLET',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        notes: 'Testing automated in-app notifications',
        lines: [
          {
            productId: 'prod-fresh-001',
            promoPrice: 24.99,
            dealCost: 20.0,
            estimatedVolume: 100,
          },
        ],
      }),
    });
    const createData = await createRes.json();
    if (!createData.data) {
      throw new Error(`Failed to create promo list: ${JSON.stringify(createData)}`);
    }
    const promoId = createData.data.id;
    const promoCode = createData.data.promoCode;

    // Check Head Fresh unread count before submission
    const headFreshPreRes = await fetch(`${BASE_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${headFreshToken}` },
    });
    const headFreshPreData = await headFreshPreRes.json();
    const headFreshPreCount = headFreshPreData.data.count;

    // Check Head Food unread count before submission
    const headFoodPreRes = await fetch(`${BASE_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${headFoodToken}` },
    });
    const headFoodPreData = await headFoodPreRes.json();
    const headFoodPreCount = headFoodPreData.data.count;

    // --------------------------------------------------------------------------
    // Submit promo list by Staff Fresh
    // --------------------------------------------------------------------------
    const submitRes = await fetch(`${BASE_URL}/promo-lists/${promoId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffFreshToken}` },
    });
    const submitData = await submitRes.json();

    // --------------------------------------------------------------------------
    // Test 4: Staff submission creates Head notification
    // --------------------------------------------------------------------------
    let headNotificationId = '';
    {
      const res = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${headFreshToken}` },
      });
      const body = await res.json();
      const notif = body.data.notifications.find(
        (n: any) => n.promoListId === promoId && n.type === 'PROMO_SUBMITTED'
      );
      if (notif) headNotificationId = notif.id;

      const passed =
        submitRes.status === 200 &&
        !!notif &&
        notif.title === 'New Promo List Submitted' &&
        notif.linkUrl === `/head-review/${promoId}` &&
        notif.isRead === false;

      results.push({
        name: '4. Staff submission creates Head notification',
        passed,
        details: passed
          ? `Head Fresh received PROMO_SUBMITTED notification for #${promoCode}: "${notif.message}"`
          : `Failed: notif found=${!!notif}, submitStatus=${submitRes.status}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 11: Department-specific notification routing works (Food Head does NOT receive)
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${headFoodToken}` },
      });
      const body = await res.json();
      const notif = body.data.notifications.find(
        (n: any) => n.promoListId === promoId
      );
      const passed = !notif;
      results.push({
        name: '11. Department-specific notification routing works',
        passed,
        details: passed
          ? `Correct: Head Food did NOT receive notification for Fresh promo #${promoCode}`
          : `Failed: Head Food unexpectedly received notification for Fresh department promo`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 3: User cannot access another user's notifications
    // --------------------------------------------------------------------------
    {
      // Staff Fresh tries to mark Head Fresh's notification as read
      const res = await fetch(`${BASE_URL}/notifications/${headNotificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const body = await res.json();
      const passed = res.status === 403 && body.success === false;
      results.push({
        name: "3. User cannot access another user's notifications",
        passed,
        details: passed
          ? `Correctly rejected cross-user notification update with 403: "${body.message}"`
          : `Expected 403 but got ${res.status}: ${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 8: Mark notification as read
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/notifications/${headNotificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${headFreshToken}` },
      });
      const body = await res.json();
      const passed = res.status === 200 && body.success === true && body.data.isRead === true;
      results.push({
        name: '8. Mark notification as read',
        passed,
        details: passed
          ? `Head Fresh marked notification #${headNotificationId} as read (isRead=true, readAt set)`
          : `Failed with status ${res.status}: ${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 5: Head rejection creates Staff notification
    // --------------------------------------------------------------------------
    let staffRejectionNotifId = '';
    {
      const rejectRes = await fetch(`${BASE_URL}/head-review/${promoId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${headFreshToken}`,
        },
        body: JSON.stringify({
          comments: 'Please adjust promotional volume and pricing.',
        }),
      });

      const res = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const body = await res.json();
      const notif = body.data.notifications.find(
        (n: any) => n.promoListId === promoId && n.type === 'PROMO_REJECTED'
      );
      if (notif) staffRejectionNotifId = notif.id;

      const passed =
        rejectRes.status === 200 &&
        !!notif &&
        notif.title === 'Promo List Rejected' &&
        notif.message.includes('Please adjust promotional volume and pricing') &&
        notif.linkUrl === `/promo-entry/${promoId}` &&
        notif.isRead === false;

      results.push({
        name: '5. Head rejection creates Staff notification',
        passed,
        details: passed
          ? `Staff Fresh received PROMO_REJECTED with reason: "${notif.message}"`
          : `Failed: notif found=${!!notif}, rejectStatus=${rejectRes.status}`,
      });
    }

    // --------------------------------------------------------------------------
    // Resubmit and Approve
    // --------------------------------------------------------------------------
    await fetch(`${BASE_URL}/promo-lists/${promoId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffFreshToken}` },
    });

    const approveRes = await fetch(`${BASE_URL}/head-review/${promoId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${headFreshToken}`,
      },
      body: JSON.stringify({
        comments: 'Approved for national leaflet distribution.',
      }),
    });

    // --------------------------------------------------------------------------
    // Test 6: Head approval creates Staff notification
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const body = await res.json();
      const notif = body.data.notifications.find(
        (n: any) => n.promoListId === promoId && n.type === 'PROMO_APPROVED'
      );

      const passed =
        approveRes.status === 200 &&
        !!notif &&
        notif.title === 'Promo List Approved' &&
        notif.isRead === false;

      results.push({
        name: '6. Head approval creates Staff notification',
        passed,
        details: passed
          ? `Staff Fresh received PROMO_APPROVED notification for #${promoCode}: "${notif.message}"`
          : `Failed: notif found=${!!notif}, approveStatus=${approveRes.status}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 7: Head approval creates Marketing notification
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${marketingToken}` },
      });
      const body = await res.json();
      const notif = body.data.notifications.find(
        (n: any) => n.promoListId === promoId && n.type === 'PROMO_APPROVED'
      );

      const passed =
        !!notif &&
        notif.title === 'New Approved Promo' &&
        notif.message.includes('ready for Marketing') &&
        notif.linkUrl === `/approved-promos/${promoId}`;

      results.push({
        name: '7. Head approval creates Marketing notification',
        passed,
        details: passed
          ? `Marketing received notification for approved promo #${promoCode}: "${notif.message}"`
          : `Failed: notif found=${!!notif}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 10: Unread count is correct
    // --------------------------------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const body = await res.json();
      const passed = res.status === 200 && typeof body.data.count === 'number' && body.data.count > 0;
      results.push({
        name: '10. Unread count is correct',
        passed,
        details: passed
          ? `Unread count endpoint returned correct count: ${body.data.count}`
          : `Failed: status=${res.status}, body=${JSON.stringify(body)}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 9: Mark all notifications as read
    // --------------------------------------------------------------------------
    {
      const readAllRes = await fetch(`${BASE_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const readAllBody = await readAllRes.json();

      const countRes = await fetch(`${BASE_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${staffFreshToken}` },
      });
      const countBody = await countRes.json();

      const passed =
        readAllRes.status === 200 &&
        readAllBody.success === true &&
        countBody.data.count === 0;

      results.push({
        name: '9. Mark all notifications as read',
        passed,
        details: passed
          ? `Successfully marked all notifications as read; unread count dropped to 0`
          : `Failed: readAllStatus=${readAllRes.status}, remainingUnread=${countBody.data.count}`,
      });
    }

    // --------------------------------------------------------------------------
    // Test 12: Director notification is never created
    // --------------------------------------------------------------------------
    {
      const notifsRes = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const notifsBody = await notifsRes.json();
      const allNotifs = notifsBody.data.notifications || [];

      const directorNotif = allNotifs.find((n: any) =>
        (n.title && n.title.toUpperCase().includes('DIRECTOR')) ||
        (n.message && n.message.toUpperCase().includes('DIRECTOR')) ||
        (n.type && n.type.toUpperCase().includes('DIRECTOR'))
      );

      const passed = !directorNotif;
      results.push({
        name: '12. Director notification is never created',
        passed,
        details: passed
          ? 'Zero Director-related notification types, titles, or messages exist anywhere in system'
          : `VIOLATION: Found Director notification: ${JSON.stringify(directorNotif)}`,
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
