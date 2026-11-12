import React, { useEffect, useState, useMemo } from 'react';
import { PageHeader } from '../components/layout/PageHeader.js';
import { DataTable, Column } from '../components/common/DataTable.js';
import { Button } from '../components/common/Button.js';
import { Modal } from '../components/common/Modal.js';
import { Input } from '../components/common/Input.js';
import { Select } from '../components/common/Select.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.js';
import { LoadingState } from '../components/common/LoadingState.js';
import { ErrorState } from '../components/common/ErrorState.js';
import { EmptyState } from '../components/common/EmptyState.js';
import { User, Department, RoleType } from '../types/index.js';
import { apiRequest } from '../services/api.js';
import { formatDate } from '../utils/formatters.js';
import { useAuth } from '../contexts/AuthContext.js';
import {
  Users,
  Building2,
  UserPlus,
  Shield,
  KeyRound,
  Edit2,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const UsersDepartments: React.FC = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'departments'>('users');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Notifications / Feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // User Filter State
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [userDeptFilter, setUserDeptFilter] = useState<string>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('ALL');
  const [userPage, setUserPage] = useState(1);
  const pageSize = 15;

  // Department Filter State
  const [deptSearch, setDeptSearch] = useState('');
  const [deptStatusFilter, setDeptStatusFilter] = useState<string>('ALL');

  // User Modals
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isResetPwdOpen, setIsResetPwdOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // User Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleType>('STAFF');
  const [departmentId, setDepartmentId] = useState('');
  const [isActiveUser, setIsActiveUser] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Department Modals
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [isEditDeptOpen, setIsEditDeptOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [deptCode, setDeptCode] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptHeadId, setDeptHeadId] = useState('');

  // Confirmation Dialog States
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {},
  });

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [userData, deptData] = await Promise.all([
        apiRequest<User[] | { users: User[] }>('/users'),
        apiRequest<Department[]>('/departments'),
      ]);
      const userList = Array.isArray(userData) ? userData : (userData as any).users || [];
      setUsers(userList);
      setDepartments(deptData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load user and department data.';
      setLoadError(msg);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search by name or email
      if (userSearch.trim()) {
        const q = userSearch.toLowerCase();
        const matchesName = (u.name || `${u.firstName} ${u.lastName}`).toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail) return false;
      }
      // Role filter
      if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) {
        return false;
      }
      // Department filter
      if (userDeptFilter !== 'ALL' && u.departmentId !== userDeptFilter) {
        return false;
      }
      // Status filter
      if (userStatusFilter === 'ACTIVE' && !u.active) return false;
      if (userStatusFilter === 'INACTIVE' && u.active) return false;

      return true;
    });
  }, [users, userSearch, userRoleFilter, userDeptFilter, userStatusFilter]);

  // Paginated Users
  const totalUserPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, userPage, pageSize]);

  // Filtered Departments
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      if (deptSearch.trim()) {
        const q = deptSearch.toLowerCase();
        const matchesName = d.name.toLowerCase().includes(q);
        const matchesCode = d.code.toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }
      if (deptStatusFilter === 'ACTIVE' && !d.active) return false;
      if (deptStatusFilter === 'INACTIVE' && d.active) return false;
      return true;
    });
  }, [departments, deptSearch, deptStatusFilter]);

  // Active departments only for user assignment
  const activeDepartments = useMemo(() => {
    return departments.filter((d) => d.active);
  }, [departments]);

  // ----------------------------------------------------
  // User Actions
  // ----------------------------------------------------

  const handleOpenAddUser = () => {
    setSelectedUser(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('STAFF');
    setDepartmentId(activeDepartments[0]?.id || '');
    setIsActiveUser(true);
    setErrorMessage(null);
    setIsAddUserOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setSelectedUser(user);
    setFullName(user.name || `${user.firstName} ${user.lastName}`);
    setEmail(user.email);
    setRole(user.role);
    setDepartmentId(user.departmentId || '');
    setIsActiveUser(user.active);
    setErrorMessage(null);
    setIsEditUserOpen(true);
  };

  const handleOpenResetPassword = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setErrorMessage(null);
    setIsResetPwdOpen(true);
  };

  const handleSaveUser = async () => {
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Email address is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    if (!selectedUser && (!password || password.length < 6)) {
      setErrorMessage('Password is required and must be at least 6 characters long.');
      return;
    }
    if ((role === 'HEAD' || role === 'STAFF') && !departmentId) {
      setErrorMessage(`Department assignment is required for '${role}' role.`);
      return;
    }

    setFormLoading(true);
    try {
      if (selectedUser) {
        await apiRequest(`/users/${selectedUser.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: fullName.trim(),
            email: email.trim(),
            role,
            departmentId: departmentId || null,
            active: isActiveUser,
          }),
        });
        setSuccessMessage(`User '${fullName.trim()}' updated successfully.`);
        setIsEditUserOpen(false);
      } else {
        await apiRequest('/users', {
          method: 'POST',
          body: JSON.stringify({
            name: fullName.trim(),
            email: email.trim(),
            password,
            role,
            departmentId: departmentId || null,
            active: isActiveUser,
          }),
        });
        setSuccessMessage(`User '${fullName.trim()}' created successfully.`);
        setIsAddUserOpen(false);
      }
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handlePromptToggleUserStatus = (user: User) => {
    // Prevent self-lockout
    if (user.active && currentUser?.id === user.id) {
      setErrorMessage('You cannot deactivate your own account.');
      return;
    }

    if (user.active) {
      setConfirmDialog({
        isOpen: true,
        title: 'Deactivate User Account?',
        message: `${user.name || user.email} will no longer be able to log into the SPAR Promo Approval System. Their existing promo history and audit trail will be safely preserved.`,
        type: 'danger',
        onConfirm: async () => {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          await executeToggleUserStatus(user, false);
        },
      });
    } else {
      executeToggleUserStatus(user, true);
    }
  };

  const executeToggleUserStatus = async (user: User, active: boolean) => {
    try {
      await apiRequest(`/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      });
      setSuccessMessage(`User '${user.name || user.email}' ${active ? 'reactivated' : 'deactivated'} successfully.`);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update user status');
    }
  };

  const handleResetPasswordSubmit = async () => {
    if (!selectedUser || !newPassword || newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    setFormLoading(true);
    try {
      await apiRequest(`/users/${selectedUser.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: newPassword }),
      });
      setSuccessMessage(`Password reset successfully for ${selectedUser.email}.`);
      setIsResetPwdOpen(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setFormLoading(false);
    }
  };

  // ----------------------------------------------------
  // Department Actions
  // ----------------------------------------------------

  const handleOpenAddDept = () => {
    setSelectedDept(null);
    setDeptCode('');
    setDeptName('');
    setDeptDesc('');
    setDeptHeadId('');
    setErrorMessage(null);
    setIsAddDeptOpen(true);
  };

  const handleOpenEditDept = (dept: Department) => {
    setSelectedDept(dept);
    setDeptCode(dept.code);
    setDeptName(dept.name);
    setDeptDesc(dept.description || '');
    setDeptHeadId(dept.headId || '');
    setErrorMessage(null);
    setIsEditDeptOpen(true);
  };

  const handleSaveDept = async () => {
    setErrorMessage(null);
    if (!deptCode.trim()) {
      setErrorMessage('Department code is required.');
      return;
    }
    if (!deptName.trim()) {
      setErrorMessage('Department name is required.');
      return;
    }

    setFormLoading(true);
    try {
      if (selectedDept) {
        await apiRequest(`/departments/${selectedDept.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            code: deptCode.trim().toUpperCase(),
            name: deptName.trim(),
            description: deptDesc.trim(),
            headId: deptHeadId || null,
          }),
        });
        setSuccessMessage(`Department '${deptName.trim()}' updated successfully.`);
        setIsEditDeptOpen(false);
      } else {
        await apiRequest('/departments', {
          method: 'POST',
          body: JSON.stringify({
            code: deptCode.trim().toUpperCase(),
            name: deptName.trim(),
            description: deptDesc.trim(),
            headId: deptHeadId || null,
          }),
        });
        setSuccessMessage(`Department '${deptName.trim()}' created successfully.`);
        setIsAddDeptOpen(false);
      }
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handlePromptToggleDeptStatus = (dept: Department) => {
    if (dept.active) {
      const assignedUsersCount = users.filter((u) => u.departmentId === dept.id).length;
      const warningText =
        assignedUsersCount > 0
          ? `This department currently has ${assignedUsersCount} assigned user(s). Deactivating it may affect new assignments. Existing records and historical promos will remain linked.`
          : 'Are you sure you want to deactivate this department? Inactive departments cannot be assigned to new users.';

      setConfirmDialog({
        isOpen: true,
        title: `Deactivate Department '${dept.name}'?`,
        message: warningText,
        type: 'warning',
        onConfirm: async () => {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          await executeToggleDeptStatus(dept, false);
        },
      });
    } else {
      executeToggleDeptStatus(dept, true);
    }
  };

  const executeToggleDeptStatus = async (dept: Department, active: boolean) => {
    try {
      await apiRequest(`/departments/${dept.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      });
      setSuccessMessage(`Department '${dept.name}' ${active ? 'reactivated' : 'deactivated'} successfully.`);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update department status');
    }
  };

  // ----------------------------------------------------
  // Column Definitions
  // ----------------------------------------------------

  const userColumns: Column<User>[] = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (u) => (
        <div>
          <span className="font-semibold text-slate-900 block">{u.name || `${u.firstName} ${u.lastName}`}</span>
          <span className="text-[11px] text-slate-500">{u.email}</span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => {
        const roleColors = {
          ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
          HEAD: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
          STAFF: 'bg-blue-50 text-blue-700 border-blue-200',
          MARKETING: 'bg-amber-50 text-amber-800 border-amber-200',
          MASTER_DATA: 'bg-slate-100 text-slate-700 border-slate-300',
        }[u.role] || 'bg-slate-100 text-slate-700 border-slate-300';
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${roleColors}`}>
            {u.role}
          </span>
        );
      },
    },
    {
      key: 'department',
      header: 'Department',
      render: (u) => (
        <span className="text-slate-700 font-medium text-xs">
          {u.department ? `${u.department.name} (${u.department.code})` : 'Cross-Department'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
            u.active
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {u.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (u) => <span className="text-slate-500 text-[11px]">{formatDate(u.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (u) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEditUser(u)}
            title="Edit User"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenResetPassword(u)}
            title="Reset Password"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePromptToggleUserStatus(u)}
            title={u.active ? 'Deactivate user' : 'Reactivate user'}
            disabled={u.active && currentUser?.id === u.id}
          >
            {u.active ? (
              <ToggleRight className={`w-4 h-4 ${currentUser?.id === u.id ? 'text-slate-300 cursor-not-allowed' : 'text-emerald-600'}`} />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-400" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  const deptColumns: Column<Department>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (d) => <span className="font-bold text-spar-green font-mono">{d.code}</span>,
    },
    {
      key: 'name',
      header: 'Department Name',
      render: (d) => (
        <div>
          <span className="font-semibold text-slate-900 block">{d.name}</span>
          <span className="text-slate-500 text-[11px]">{d.description || '—'}</span>
        </div>
      ),
    },
    {
      key: 'head',
      header: 'Assigned Head (1 per Dept)',
      render: (d) => (
        <div>
          {d.head ? (
            <span className="font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs flex items-center gap-1 w-fit">
              <Shield className="w-3 h-3 text-spar-green" />
              {d.head.name}
            </span>
          ) : (
            <span className="text-amber-700 italic text-xs">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
            d.active
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${d.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {d.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (d) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEditDept(d)}
            title="Edit Department"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePromptToggleDeptStatus(d)}
            title={d.active ? 'Deactivate Department' : 'Reactivate Department'}
          >
            {d.active ? (
              <ToggleRight className="w-4 h-4 text-emerald-600" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-400" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Departments"
        description="System administration portal to manage SPAR retail users, departments, and role governance."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Users & Departments' }]}
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'users' ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<UserPlus className="w-4 h-4" />}
                onClick={handleOpenAddUser}
              >
                Add User
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<PlusCircle className="w-4 h-4" />}
                onClick={handleOpenAddDept}
              >
                Add Department
              </Button>
            )}
          </div>
        }
      />

      {/* Governance Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-start gap-3 shadow-sm">
        <Shield className="w-5 h-5 text-spar-green flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-900 block mb-0.5">Role Governance & Department Rules</span>
          Authorized roles: <strong className="text-slate-800">STAFF</strong> (Commercial Submitter), <strong className="text-slate-800">HEAD</strong> (Final Approver), <strong className="text-slate-800">MARKETING</strong> (Campaign Viewer), <strong className="text-slate-800">ADMIN</strong>, and <strong className="text-slate-800">MASTER_DATA</strong>.
          <span className="ml-1 text-emerald-800 font-semibold">Strict Rule: Exactly ONE Head per department. Director role is permanently omitted.</span>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-spar-green" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-spar-red" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => {
            setActiveTab('users');
            setErrorMessage(null);
          }}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-spar-green text-spar-green'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Users ({users.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('departments');
            setErrorMessage(null);
          }}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'departments'
              ? 'border-spar-green text-spar-green'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Departments ({departments.length})
        </button>
      </div>

      {/* Tab Content: Users */}
      {activeTab === 'users' ? (
        <div className="space-y-4">
          {/* User Filters & Search Bar */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-spar-green/20 focus:border-spar-green transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Filter className="w-3.5 h-3.5" />
                <span>Filters:</span>
              </div>

              {/* Role Filter */}
              <select
                value={userRoleFilter}
                onChange={(e) => {
                  setUserRoleFilter(e.target.value);
                  setUserPage(1);
                }}
                className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-spar-green/20"
              >
                <option value="ALL">All Roles</option>
                <option value="STAFF">Staff</option>
                <option value="HEAD">Head</option>
                <option value="MARKETING">Marketing</option>
                <option value="ADMIN">Admin</option>
                <option value="MASTER_DATA">Master Data</option>
              </select>

              {/* Department Filter */}
              <select
                value={userDeptFilter}
                onChange={(e) => {
                  setUserDeptFilter(e.target.value);
                  setUserPage(1);
                }}
                className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-spar-green/20"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={userStatusFilter}
                onChange={(e) => {
                  setUserStatusFilter(e.target.value);
                  setUserPage(1);
                }}
                className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-spar-green/20"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* User Table / States */}
          {isLoading ? (
            <LoadingState message="Loading users directory..." />
          ) : loadError ? (
            <ErrorState title="Unable to load users." message={loadError} onRetry={loadData} />
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              title={userSearch || userRoleFilter !== 'ALL' || userDeptFilter !== 'ALL' || userStatusFilter !== 'ALL' ? 'No users match your search' : 'No users found'}
              description="Adjust your search query or filter options to view available accounts."
              icon={<Users className="w-8 h-8" />}
            />
          ) : (
            <>
              <DataTable
                columns={userColumns}
                data={paginatedUsers}
                keyExtractor={(u) => u.id}
                emptyTitle="No users found"
              />

              {/* Pagination Controls */}
              {totalUserPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
                  <span>
                    Showing <strong>{(userPage - 1) * pageSize + 1}</strong> to{' '}
                    <strong>{Math.min(userPage * pageSize, filteredUsers.length)}</strong> of{' '}
                    <strong>{filteredUsers.length}</strong> users
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      disabled={userPage === 1}
                      leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                    >
                      Previous
                    </Button>
                    <span className="px-3 py-1 font-semibold text-slate-800">
                      Page {userPage} of {totalUserPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                      disabled={userPage === totalUserPages}
                      rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* Tab Content: Departments */
        <div className="space-y-4">
          {/* Department Search & Filter */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search department name or code..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-spar-green/20 focus:border-spar-green transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={deptStatusFilter}
                onChange={(e) => setDeptStatusFilter(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-spar-green/20"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <LoadingState message="Loading retail departments..." />
          ) : loadError ? (
            <ErrorState title="Unable to load departments." message={loadError} onRetry={loadData} />
          ) : filteredDepartments.length === 0 ? (
            <EmptyState
              title={deptSearch || deptStatusFilter !== 'ALL' ? 'No departments match your filter' : 'No departments found'}
              description="Adjust your search criteria or create a new department."
              icon={<Building2 className="w-8 h-8" />}
            />
          ) : (
            <DataTable
              columns={deptColumns}
              data={filteredDepartments}
              keyExtractor={(d) => d.id}
              emptyTitle="No departments found"
            />
          )}
        </div>
      )}

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={isAddUserOpen || isEditUserOpen}
        onClose={() => {
          setIsAddUserOpen(false);
          setIsEditUserOpen(false);
        }}
        title={selectedUser ? `Edit User: ${selectedUser.name}` : 'Create New User Account'}
        subtitle="Manage user credentials, role assignment, and department scoping"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddUserOpen(false);
                setIsEditUserOpen(false);
              }}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveUser} isLoading={formLoading}>
              {selectedUser ? 'Save Changes' : 'Create User'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full Name *"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. John Silva"
          />

          <Input
            label="Email Address *"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. john@spar.lk"
          />

          {!selectedUser && (
            <Input
              label="Temporary Password *"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              helperText="Must be at least 6 characters. Will be securely hashed."
            />
          )}

          <Select
            label="System Role *"
            value={role}
            onChange={(e) => setRole(e.target.value as RoleType)}
            options={[
              { value: 'STAFF', label: 'STAFF — Commercial Submitter' },
              { value: 'HEAD', label: 'HEAD — Department Head & Final Approver' },
              { value: 'MARKETING', label: 'MARKETING — Campaign Viewer (Read-only)' },
              { value: 'ADMIN', label: 'ADMIN — System Administrator' },
              { value: 'MASTER_DATA', label: 'MASTER_DATA — Catalog Specialist' },
            ]}
          />

          {(role === 'STAFF' || role === 'HEAD') && (
            <Select
              label="Operational Department *"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={activeDepartments.map((d) => ({
                value: d.id,
                label: `${d.name} (${d.code})`,
              }))}
              helperText={
                role === 'HEAD'
                  ? 'Strict rule: Exactly one Head per retail department.'
                  : 'Only active retail departments are available for assignment.'
              }
            />
          )}

          {selectedUser && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <input
                type="checkbox"
                id="userActiveCheck"
                checked={isActiveUser}
                onChange={(e) => setIsActiveUser(e.target.checked)}
                className="rounded border-slate-300 text-spar-green focus:ring-spar-green"
              />
              <label htmlFor="userActiveCheck" className="text-xs font-medium text-slate-700">
                User account is Active (allows system login)
              </label>
            </div>
          )}
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={isResetPwdOpen}
        onClose={() => setIsResetPwdOpen(false)}
        title={`Reset Password: ${selectedUser?.name || selectedUser?.email}`}
        subtitle="Set a new temporary password for this user"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsResetPwdOpen(false)} disabled={formLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleResetPasswordSubmit} isLoading={formLoading}>
              Set Password
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <KeyRound className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              This will immediately overwrite the user's password with a new bcrypt hash. The user must use this new password on next login.
            </p>
          </div>
          <Input
            label="New Password *"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 6 characters"
          />
        </div>
      </Modal>

      {/* Add / Edit Department Modal */}
      <Modal
        isOpen={isAddDeptOpen || isEditDeptOpen}
        onClose={() => {
          setIsAddDeptOpen(false);
          setIsEditDeptOpen(false);
        }}
        title={selectedDept ? `Edit Department: ${selectedDept.name}` : 'Create New Retail Department'}
        subtitle="Manage department code, name, and assigned Head"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddDeptOpen(false);
                setIsEditDeptOpen(false);
              }}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveDept} isLoading={formLoading}>
              {selectedDept ? 'Save Changes' : 'Create Department'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Department Code *"
            value={deptCode}
            onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
            placeholder="e.g. GROCERY"
            helperText="Must be unique across all retail departments."
          />

          <Input
            label="Department Name *"
            value={deptName}
            onChange={(e) => setDeptName(e.target.value)}
            placeholder="e.g. Ambient & Dry Foods"
          />

          <Input
            label="Description"
            value={deptDesc}
            onChange={(e) => setDeptDesc(e.target.value)}
            placeholder="Optional department notes or categories covered"
          />

          {selectedDept && (
            <Select
              label="Assigned Department Head (Optional)"
              value={deptHeadId}
              onChange={(e) => setDeptHeadId(e.target.value)}
              options={[
                { value: '', label: '— Unassigned —' },
                ...users
                  .filter((u) => u.role === 'HEAD')
                  .map((u) => ({
                    value: u.id,
                    label: `${u.name || `${u.firstName} ${u.lastName}`} (${u.email})`,
                  })),
              ]}
              helperText="Only users with role 'HEAD' can be assigned as Department Head."
            />
          )}
        </div>
      </Modal>

      {/* Reusable Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />
    </div>
  );
};
