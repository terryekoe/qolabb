// =====================================================
// Workspace Role Manager Component
// Comprehensive role management for course workspaces
// =====================================================

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  UserMinus,
  Shield,
  Settings,
  Mail,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Crown,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Upload,
  FileText,
  Plus,
  X,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Calendar,
  MapPin,
  Phone,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { cn } from '@/lib/utils';
import type { EnhancedUserRole } from '@/lib/types/permissions';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface WorkspaceMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: EnhancedUserRole;
  workspaceRole: 'owner' | 'admin' | 'member' | 'guest';
  status: 'active' | 'pending' | 'suspended';
  joinedAt: string;
  lastActive: string;
  permissions: string[];
  teams: string[];
  projects: string[];
  institution?: string;
  department?: string;
  studentId?: string;
  employeeId?: string;
}

interface InvitationLink {
  id: string;
  role: EnhancedUserRole;
  workspaceRole: 'member' | 'guest';
  expiresAt: string;
  maxUses?: number;
  currentUses: number;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  role: EnhancedUserRole;
  workspaceRole: 'member' | 'guest';
  permissions: string[];
  isDefault: boolean;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function WorkspaceRoleManager() {
  const { canAccess, can } = usePermissions();
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'templates' | 'settings'>(
    'members'
  );
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Mock data - replace with actual API calls
  const [members, setMembers] = useState<WorkspaceMember[]>([
    {
      id: '1',
      userId: 'user1',
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@university.edu',
      role: 'instructor',
      workspaceRole: 'owner',
      status: 'active',
      joinedAt: '2024-01-01',
      lastActive: '2024-01-12T10:30:00',
      permissions: ['all'],
      teams: [],
      projects: ['proj1', 'proj2'],
      institution: 'MIT',
      department: 'Computer Science',
      employeeId: 'EMP001',
    },
    {
      id: '2',
      userId: 'user2',
      name: 'Alice Chen',
      email: 'alice.chen@student.university.edu',
      role: 'student',
      workspaceRole: 'member',
      status: 'active',
      joinedAt: '2024-01-05',
      lastActive: '2024-01-12T09:15:00',
      permissions: ['profile:read', 'task:create', 'team:join'],
      teams: ['team1', 'team2'],
      projects: ['proj1'],
      institution: 'MIT',
      department: 'Computer Science',
      studentId: 'STU001',
    },
    {
      id: '3',
      userId: 'user3',
      name: 'Bob Smith',
      email: 'bob.smith@student.university.edu',
      role: 'student',
      workspaceRole: 'member',
      status: 'pending',
      joinedAt: '2024-01-10',
      lastActive: '2024-01-10T14:20:00',
      permissions: ['profile:read', 'task:create', 'team:join'],
      teams: [],
      projects: [],
      institution: 'MIT',
      department: 'Computer Science',
      studentId: 'STU002',
    },
  ]);

  const [invitations, setInvitations] = useState<InvitationLink[]>([
    {
      id: '1',
      role: 'student',
      workspaceRole: 'member',
      expiresAt: '2024-01-20',
      maxUses: 50,
      currentUses: 12,
      createdBy: 'Dr. Sarah Johnson',
      createdAt: '2024-01-01',
      isActive: true,
    },
  ]);

  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([
    {
      id: '1',
      name: 'Course Student',
      description: 'Standard student role with basic permissions',
      role: 'student',
      workspaceRole: 'member',
      permissions: ['profile:read', 'task:create', 'team:join', 'contribution:create'],
      isDefault: true,
    },
    {
      id: '2',
      name: 'Teaching Assistant',
      description: 'TA role with limited instructor permissions (now merged into instructor)',
      role: 'instructor',
      workspaceRole: 'member',
      permissions: ['profile:read', 'task:create', 'team:manage', 'analytics:view_basic'],
      isDefault: false,
    },
  ]);

  // Check permissions
  if (!canAccess.workspace()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">You don't have permission to manage workspace roles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workspace Role Management</h1>
          <p className="text-gray-600">
            Manage members, roles, and permissions for {currentWorkspace?.name || 'this workspace'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {can('workspace', 'invite_members') && (
            <>
              <Button variant="outline" onClick={() => setShowBulkImport(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Bulk Import
              </Button>
              <Button onClick={() => setShowInviteModal(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Members
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            label: 'Total Members',
            value: members.length,
            icon: Users,
            color: 'blue',
          },
          {
            label: 'Active Students',
            value: members.filter((m) => m.role === 'student' && m.status === 'active').length,
            icon: GraduationCap,
            color: 'green',
          },
          {
            label: 'Instructors',
            value: members.filter((m) => m.role === 'instructor').length,
            icon: BookOpen,
            color: 'purple',
          },
          {
            label: 'Pending Invites',
            value: members.filter((m) => m.status === 'pending').length,
            icon: Clock,
            color: 'orange',
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={cn('p-3 rounded-lg', `bg-${stat.color}-100`)}>
                <stat.icon className={cn('w-6 h-6', `text-${stat.color}-600`)} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'members', label: 'Members', icon: Users },
            { id: 'invitations', label: 'Invitations', icon: Mail },
            { id: 'templates', label: 'Role Templates', icon: Shield },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'members' && <MembersTab members={members} setMembers={setMembers} />}
          {activeTab === 'invitations' && (
            <InvitationsTab invitations={invitations} setInvitations={setInvitations} />
          )}
          {activeTab === 'templates' && (
            <RoleTemplatesTab templates={roleTemplates} setTemplates={setRoleTemplates} />
          )}
          {activeTab === 'settings' && <WorkspaceSettingsTab />}
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      {showInviteModal && (
        <InviteMembersModal onClose={() => setShowInviteModal(false)} templates={roleTemplates} />
      )}

      {showBulkImport && <BulkImportModal onClose={() => setShowBulkImport(false)} />}
    </div>
  );
}

// =====================================================
// MEMBERS TAB
// =====================================================

function MembersTab({
  members,
  setMembers,
}: {
  members: WorkspaceMember[];
  setMembers: React.Dispatch<React.SetStateAction<WorkspaceMember[]>>;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | EnhancedUserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>(
    'all'
  );

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const updateMemberRole = (memberId: string, newRole: EnhancedUserRole) => {
    setMembers((prev) =>
      prev.map((member) => (member.id === memberId ? { ...member, role: newRole } : member))
    );
  };

  const updateMemberStatus = (memberId: string, newStatus: WorkspaceMember['status']) => {
    setMembers((prev) =>
      prev.map((member) => (member.id === memberId ? { ...member, status: newStatus } : member))
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Roles</option>
          <option value="student">Students</option>
          <option value="instructor">Instructors</option>
          <option value="admin">Admins</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>

        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teams
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {member.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                          {member.workspaceRole === 'owner' && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                        {(member.studentId || member.employeeId) && (
                          <div className="text-xs text-gray-400">
                            ID: {member.studentId || member.employeeId}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={member.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.teams.length}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(member.lastActive).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// INVITATIONS TAB
// =====================================================

function InvitationsTab({
  invitations,
  setInvitations,
}: {
  invitations: InvitationLink[];
  setInvitations: React.Dispatch<React.SetStateAction<InvitationLink[]>>;
}) {
  const copyInviteLink = (invitationId: string) => {
    const link = `${window.location.origin}/invite/${invitationId}`;
    navigator.clipboard.writeText(link);
    // Show toast notification
  };

  const toggleInvitation = (invitationId: string) => {
    setInvitations((prev) =>
      prev.map((inv) => (inv.id === invitationId ? { ...inv, isActive: !inv.isActive } : inv))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Invitation Links</h3>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Invitation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <RoleBadge role={invitation.role} />
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleInvitation(invitation.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {invitation.isActive ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => copyInviteLink(invitation.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Uses</span>
                <span className="font-medium">
                  {invitation.currentUses}
                  {invitation.maxUses && ` / ${invitation.maxUses}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expires</span>
                <span className="font-medium">
                  {new Date(invitation.expiresAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created by</span>
                <span className="font-medium">{invitation.createdBy}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => copyInviteLink(invitation.id)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// ROLE TEMPLATES TAB
// =====================================================

function RoleTemplatesTab({
  templates,
  setTemplates,
}: {
  templates: RoleTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<RoleTemplate[]>>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Role Templates</h3>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h4 className="text-lg font-semibold text-gray-900">{template.name}</h4>
                {template.isDefault && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Default
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
                {!template.isDefault && (
                  <Button variant="outline" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <p className="text-gray-600 mb-4">{template.description}</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Role</span>
                <RoleBadge role={template.role} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Workspace Role</span>
                <span className="text-sm font-medium capitalize">{template.workspaceRole}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Permissions</span>
                <div className="mt-2 flex flex-wrap gap-1">
                  {template.permissions.slice(0, 3).map((permission) => (
                    <span
                      key={permission}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                    >
                      {permission}
                    </span>
                  ))}
                  {template.permissions.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      +{template.permissions.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// WORKSPACE SETTINGS TAB
// =====================================================

function WorkspaceSettingsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Workspace Settings</h3>
        <p className="text-gray-600">
          Workspace-level settings and configurations would be implemented here, including default
          roles, permission policies, and integration settings.
        </p>
      </div>
    </div>
  );
}

// =====================================================
// MODALS
// =====================================================

function InviteMembersModal({
  onClose,
  templates,
}: {
  onClose: () => void;
  templates: RoleTemplate[];
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Invite Members</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Addresses</label>
            <textarea
              placeholder="Enter email addresses, one per line"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role Template</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-3 pt-4">
            <Button onClick={onClose} className="flex-1">
              Send Invitations
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkImportModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Bulk Import Members</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Drop CSV file here or click to browse</p>
          </div>

          <div className="flex items-center space-x-3">
            <Button onClick={onClose} className="flex-1">
              Import
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// UTILITY COMPONENTS
// =====================================================

function RoleBadge({ role }: { role: EnhancedUserRole }) {
  const styles: Record<string, string> = {
    student: 'bg-blue-100 text-blue-800',
    instructor: 'bg-purple-100 text-purple-800',
    admin: 'bg-red-100 text-red-800',
    both: 'bg-orange-100 text-orange-800',
  };

  const labels: Record<string, string> = {
    student: 'Student',
    instructor: 'Instructor',
    admin: 'Admin',
    both: 'Both',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        styles[role]
      )}
    >
      {labels[role]}
    </span>
  );
}

function StatusBadge({ status }: { status: WorkspaceMember['status'] }) {
  const styles = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    suspended: 'bg-red-100 text-red-800',
  };

  const labels = {
    active: 'Active',
    pending: 'Pending',
    suspended: 'Suspended',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  );
}
