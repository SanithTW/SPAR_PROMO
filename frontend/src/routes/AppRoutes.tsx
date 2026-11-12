import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute.js';
import { RoleGuard } from '../components/auth/RoleGuard.js';
import { AppLayout } from '../components/layout/AppLayout.js';

// Pages
import { Login } from '../pages/Login.js';
import { Dashboard } from '../pages/Dashboard.js';
import { PromoCalendar } from '../pages/PromoCalendar.js';
import { PromoEntry } from '../pages/PromoEntry.js';
import { HeadReview } from '../pages/HeadReview.js';
import { ApprovedPromos } from '../pages/ApprovedPromos.js';
import { UsersDepartments } from '../pages/UsersDepartments.js';
import { MasterData } from '../pages/MasterData.js';
import { Settings } from '../pages/Settings.js';
import { Audit } from '../pages/Audit.js';
import { Unauthorized } from '../pages/Unauthorized.js';
import { NotFound } from '../pages/NotFound.js';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />

      {/* Protected Application Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="calendar" element={<PromoCalendar />} />

        {/* Commercial Staff Promo Entry */}
        <Route
          path="promo-entry"
          element={
            <RoleGuard allowedRoles={['STAFF', 'ADMIN']}>
              <PromoEntry />
            </RoleGuard>
          }
        />
        <Route
          path="promo-entry/:id"
          element={
            <RoleGuard allowedRoles={['STAFF', 'ADMIN']}>
              <PromoEntry />
            </RoleGuard>
          }
        />

        {/* Head Review (Head is Final Approver - No Director Stage) */}
        <Route
          path="head-review"
          element={
            <RoleGuard allowedRoles={['HEAD', 'ADMIN']}>
              <HeadReview />
            </RoleGuard>
          }
        />
        <Route
          path="head-review/:id"
          element={
            <RoleGuard allowedRoles={['HEAD', 'ADMIN']}>
              <HeadReview />
            </RoleGuard>
          }
        />

        {/* Approved Promos for Marketing and Teams */}
        <Route
          path="approved-promos"
          element={
            <RoleGuard allowedRoles={['STAFF', 'MARKETING', 'HEAD', 'ADMIN']}>
              <ApprovedPromos />
            </RoleGuard>
          }
        />
        <Route
          path="approved-promos/:id"
          element={
            <RoleGuard allowedRoles={['STAFF', 'MARKETING', 'HEAD', 'ADMIN']}>
              <ApprovedPromos />
            </RoleGuard>
          }
        />

        {/* Users & Departments (Admin only) */}
        <Route
          path="users-departments"
          element={
            <RoleGuard allowedRoles={['ADMIN']}>
              <UsersDepartments />
            </RoleGuard>
          }
        />

        {/* Master Data */}
        <Route
          path="master-data"
          element={
            <RoleGuard allowedRoles={['MASTER_DATA', 'ADMIN']}>
              <MasterData />
            </RoleGuard>
          }
        />

        {/* Audit Trail */}
        <Route
          path="audit"
          element={
            <RoleGuard allowedRoles={['HEAD', 'ADMIN']}>
              <Audit />
            </RoleGuard>
          }
        />

        {/* Settings */}
        <Route
          path="settings"
          element={
            <RoleGuard allowedRoles={['STAFF', 'MARKETING', 'HEAD', 'ADMIN']}>
              <Settings />
            </RoleGuard>
          }
        />

        {/* Security / Error Routes */}
        <Route path="unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
