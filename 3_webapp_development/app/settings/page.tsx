"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings as SettingsIcon,
  User,
  Building2,
  Users,
  Bell,
  Shield,
  Palette,
  Globe,
  Download,
  Trash2,
  Copy,
  Check,
  UserMinus,
  Crown,
  Eye,
  EyeOff,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Save,
  Camera,
  Lock,
  Smartphone,
  Key,
  AlertTriangle,
  Moon,
  Sun,
  Monitor,
  Volume2,
  VolumeX,
  Languages,
  Clock,
  FileText,
  HelpCircle,
  Upload,
  X,
  Menu,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/Button";
import Avatar from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth/AuthContext";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { useSearchParams } from "next/navigation";
import {
  getWorkspaceMembers,
  getProfile,
  updateProfile,
  getUserContributions,
  getUserTasks,
  getUserTeams,
} from "@/lib/db/queries";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/types/database";
import { AVAILABLE_GOALS } from "@/lib/constants/goals";

type SettingsCategory =
  | "profile"
  | "account"
  | "workspace"
  | "notifications"
  | "privacy"
  | "appearance"
  | "integrations"
  | "billing"
  | "support";

interface SettingsSection {
  id: SettingsCategory;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

const settingsSections: SettingsSection[] = [
  {
    id: "profile",
    label: "Profile",
    icon: User,
    description: "Manage your personal information and preferences",
  },
  {
    id: "account",
    label: "Account & Security",
    icon: Shield,
    description: "Password, authentication, and account settings",
  },
  {
    id: "workspace",
    label: "Workspace",
    icon: Building2,
    description: "Workspace settings and member management",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Email, push, and in-app notification preferences",
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: Eye,
    description: "Control your data and privacy settings",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    description: "Theme, display, and interface customization",
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Globe,
    description: "Connected apps and external services",
  },
  {
    id: "billing",
    label: "Billing & Plans",
    icon: FileText,
    description: "Subscription, usage, and payment information",
  },
  {
    id: "support",
    label: "Help & Support",
    icon: HelpCircle,
    description: "Documentation, contact support, and feedback",
  },
];

// Force dynamic rendering to prevent prerender errors
export const dynamic = 'force-dynamic';

function SettingsPageContent() {
  const { user } = useAuth();
  const { currentWorkspace, refreshWorkspaces } = useWorkspace();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] =
    useState<SettingsCategory>("profile");
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for tab and section parameters and navigate accordingly
  useEffect(() => {
    const tab = searchParams.get('tab');
    const section = searchParams.get('section');
    
    if (tab === 'workspace' && section === 'invite') {
      setActiveSection('workspace');
    } else if (tab === 'notifications') {
      setActiveSection('notifications');
    }
  }, [searchParams]);

  // Profile settings state
  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    phone: "",
    institution: "",
    role: "",
    goals: [] as string[],
    bio: "",
    location: "",
    timezone: "",
    avatar: "",
  });

  // Account settings state
  const [accountSettings, setAccountSettings] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactorEnabled: false,
    sessionTimeout: "24h",
  });

  // Workspace settings state
  const [workspaceSettings, setWorkspaceSettings] = useState({
    name: "",
    description: "",
    inviteCode: "",
    defaultRole: "member",
    allowPublicJoin: false,
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    projectUpdates: true,
    taskAssignments: true,
    teamInvites: true,
    weeklyDigest: true,
    marketingEmails: false,
  });

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: "workspace",
    showEmail: false,
    showPhone: false,
    allowDirectMessages: true,
    dataExport: false,
    analyticsOptOut: false,
  });

  // Appearance settings state
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: "system",
    language: "en",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    density: "comfortable",
    animations: true,
    soundEffects: true,
  });

  const [copiedCode, setCopiedCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceSettings({
        name: currentWorkspace.name,
        description: currentWorkspace.description || "",
        inviteCode: currentWorkspace.invite_code || "",
        defaultRole: "member",
        allowPublicJoin: false,
      });
      loadMembers();
    }
  }, [currentWorkspace]);

  useEffect(() => {
    async function loadProfileData() {
      if (user) {
        try {
          const profile = await getProfile(user.id);
          setProfileData({
            fullName: profile?.full_name || user.user_metadata?.full_name || "",
            email: user.email || "",
            phone: user.user_metadata?.phone || "",
            institution:
              profile?.institution || user.user_metadata?.institution || "",
            role: profile?.role || user.user_metadata?.role || "",
            goals: profile?.goals || [],
            bio: user.user_metadata?.bio || "",
            location: user.user_metadata?.location || "",
            timezone: user.user_metadata?.timezone || "UTC",
            avatar: profile?.avatar_url || user.user_metadata?.avatar_url || "",
          });
        } catch (error) {
          console.error("Error loading profile:", error);
          // Fallback to auth metadata
          setProfileData({
            fullName: user.user_metadata?.full_name || "",
            email: user.email || "",
            phone: user.user_metadata?.phone || "",
            institution: user.user_metadata?.institution || "",
            role: user.user_metadata?.role || "",
            goals: [],
            bio: user.user_metadata?.bio || "",
            location: user.user_metadata?.location || "",
            timezone: user.user_metadata?.timezone || "UTC",
            avatar: user.user_metadata?.avatar_url || "",
          });
        }
      }
    }

    loadProfileData();
  }, [user]);

  async function loadMembers() {
    console.log('🔍 [CLIENT] loadMembers called');
    console.log('🔍 [CLIENT] user:', user ? { id: user.id, email: user.email } : 'null');
    console.log('🔍 [CLIENT] currentWorkspace:', currentWorkspace ? { id: currentWorkspace.id, name: currentWorkspace.name } : 'null');
    
    if (!currentWorkspace) {
      console.log('❌ [CLIENT] No current workspace, returning early');
      return;
    }

    try {
      setLoading(true);
      console.log('🚀 [CLIENT] Loading members for workspace:', currentWorkspace.id, currentWorkspace.name);
      const membersData = await getWorkspaceMembers(currentWorkspace.id);
      console.log('✅ [CLIENT] Workspace members returned:', membersData);
      console.log('📊 [CLIENT] Number of members:', membersData?.length || 0);
      setMembers(membersData || []);
    } catch (error) {
      console.error("❌ [CLIENT] Error loading members:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!user) return;

    setSaving(true);
    try {
      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: profileData.fullName,
          phone: profileData.phone,
          institution: profileData.institution,
          role: profileData.role as UserRole,
          bio: profileData.bio,
          location: profileData.location,
          timezone: profileData.timezone,
        },
      });

      if (authError) throw authError;

      // Update profile table
      await updateProfile(user.id, {
        full_name: profileData.fullName,
        institution: profileData.institution,
        role: profileData.role as UserRole | undefined,
        goals: profileData.goals,
        avatar_url: profileData.avatar,
      });

      alert("Profile updated successfully!");
    } catch (error: any) {
      alert("Failed to update profile: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  // File upload functions
  function handleFileSelect() {
    fileInputRef.current?.click();
  }

  function validateFile(file: File): string | null {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return 'Please select a valid image file (JPG, PNG, or GIF)';
    }

    // Check file size (2MB limit)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      return 'File size must be less than 2MB';
    }

    return null;
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    setUploading(true);
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      // Update profile data state
      setProfileData({ ...profileData, avatar: avatarUrl });

      // Update database immediately
      await updateProfile(user.id, {
        avatar_url: avatarUrl,
      });

      alert('Profile picture updated successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      
      // Provide specific error messages based on the error type
      let errorMessage = 'Failed to upload profile picture. Please try again.';
      
      if (error.message?.includes('bucket')) {
        errorMessage = 'Storage not configured. Please contact support.';
      } else if (error.message?.includes('size')) {
        errorMessage = 'File is too large. Please use an image under 2MB.';
      } else if (error.message?.includes('type')) {
        errorMessage = 'Invalid file type. Please use JPG, PNG, or GIF.';
      } else if (error.message) {
        errorMessage = `Upload failed: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleRemoveAvatar() {
    if (!user) return;

    try {
      setUploading(true);
      
      // Update profile data state
      setProfileData({ ...profileData, avatar: '' });

      // Update database
      await updateProfile(user.id, {
        avatar_url: null,
      });

      alert('Profile picture removed successfully!');
    } catch (error: any) {
      console.error('Remove avatar error:', error);
      alert('Failed to remove profile picture: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleExportData() {
    if (!user) return;

    try {
      setExportingData(true);

      // Fetch all user data
      const [profile, contributions, tasks, teamsData, workspaceMemberships] = await Promise.all([
        getProfile(user.id),
        getUserContributions(user.id),
        getUserTasks(user.id),
        getUserTeams(user.id),
        supabase
          .from('workspace_members')
          .select(`
            id,
            workspace_id,
            role,
            joined_at,
            workspace:workspaces(
              id,
              name,
              description,
              invite_code,
              created_at
            )
          `)
          .eq('user_id', user.id),
      ]);

      // Get user's activity logs
      const { data: activityLogs } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1000);

      // Get user's notifications
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);

      // Get user's team memberships with details
      const teams = Array.isArray(teamsData) ? teamsData : [];
      const teamMemberships = teams.flatMap((teamMember: any) => {
        const team = teamMember.team;
        if (!team) return [];
        return [{
          team_id: team.id,
          team_name: team.name,
          role: teamMember.role,
          joined_at: teamMember.joined_at,
        }];
      });

      // Extract unique teams
      const teamMap = new Map<string, any>();
      teams.forEach((tm: any) => {
        if (tm.team?.id) {
          teamMap.set(tm.team.id, tm.team);
        }
      });
      const uniqueTeams = Array.from(teamMap.values());

      // Get projects user participated in (via contributions or tasks)
      const projectIds = new Set<string>();
      contributions?.forEach((c: any) => c.project_id && projectIds.add(c.project_id));
      tasks?.forEach((t: any) => t.project_id && projectIds.add(t.project_id));

      const { data: projects } = projectIds.size > 0
        ? await supabase
            .from('projects')
            .select('*')
            .in('id', Array.from(projectIds))
        : { data: [] };

      // Normalize workspace data - handle arrays from Supabase joins
      const normalizedWorkspaces = (workspaceMemberships.data || []).map((wm: any) => {
        let workspace = wm.workspace;
        if (Array.isArray(workspace)) {
          workspace = workspace[0] || null;
        }
        return {
          ...wm,
          workspace: workspace,
        };
      });

      // Format export data
      const exportData = {
        export_metadata: {
          exported_at: new Date().toISOString(),
          exported_by: user.id,
          format_version: '1.0',
        },
        profile: profile || null,
        contributions: contributions || [],
        tasks: tasks || [],
        teams: uniqueTeams.map((team: any) => ({
          id: team.id,
          name: team.name,
          description: team.description,
          workspace_id: team.workspace_id,
          role: teamMemberships.find((tm: any) => tm.team_id === team.id)?.role || 'member',
          joined_at: teamMemberships.find((tm: any) => tm.team_id === team.id)?.joined_at || null,
        })),
        projects: projects || [],
        workspace_memberships: normalizedWorkspaces,
        activity_logs: activityLogs || [],
        notifications: notifications || [],
        summary: {
          total_contributions: contributions?.length || 0,
          total_tasks: tasks?.length || 0,
          total_teams: uniqueTeams.length,
          total_projects: projects?.length || 0,
          total_workspaces: normalizedWorkspaces.length,
          total_activities: activityLogs?.length || 0,
          total_notifications: notifications?.length || 0,
        },
      };

      // Convert to JSON and download
      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = `qolabb_data_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('Data export completed successfully!');
    } catch (error: any) {
      console.error('Export data error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExportingData(false);
    }
  }

  async function handleSaveWorkspace() {
    if (!currentWorkspace) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("workspaces")
        .update({
          name: workspaceSettings.name,
          description: workspaceSettings.description || null,
        } as any)
        .eq("id", currentWorkspace.id);

      if (error) throw error;

      await refreshWorkspaces();
      alert("Workspace updated successfully!");
    } catch (error: any) {
      alert("Failed to update workspace: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  function copyInviteCode() {
    if (!workspaceSettings.inviteCode) return;
    navigator.clipboard.writeText(workspaceSettings.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  const currentMember = members.find((m) => m.user_id === user?.id);
  const isOwnerOrAdmin =
    currentMember?.role === "owner" || currentMember?.role === "admin";

  if (!currentWorkspace && activeSection === "workspace") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <SettingsIcon size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Please select a workspace first</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Profile Settings
        </h2>
        <p className="text-gray-600">
          Manage your personal information and preferences
        </p>
      </div>

      {/* Profile Picture */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Profile Picture
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
          {/* Avatar Display */}
          <div className="relative flex justify-center sm:justify-start">
            <Avatar
              userId={user?.id || 'default'}
              name={profileData.fullName}
              src={profileData.avatar}
              size="xl"
              className="border-2 border-gray-200"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <Button 
                variant="ghost" 
                className="flex items-center space-x-2 w-full sm:w-auto justify-center"
                onClick={handleFileSelect}
                disabled={uploading}
              >
                <Camera size={18} />
                <span>{profileData.avatar ? 'Change Photo' : 'Upload Photo'}</span>
              </Button>
              
              {profileData.avatar && (
                <Button 
                  variant="ghost" 
                  className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto justify-center"
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                >
                  <X size={18} />
                  <span>Remove</span>
                </Button>
              )}
            </div>
            
            <p className="text-sm text-gray-500 mt-1">
              JPG, PNG or GIF. Max size 2MB.
            </p>
            
            {uploading && (
              <p className="text-sm text-qolabb-navy-600 mt-1">
                Uploading...
              </p>
            )}
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={profileData.fullName}
              onChange={(e) =>
                setProfileData({ ...profileData, fullName: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={profileData.email}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) =>
                setProfileData({ ...profileData, phone: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Institution
            </label>
            <input
              type="text"
              value={profileData.institution}
              onChange={(e) =>
                setProfileData({ ...profileData, institution: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={profileData.role}
              onChange={(e) =>
                setProfileData({ ...profileData, role: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
            >
              <option value="">Select Role</option>
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="researcher">Researcher</option>
              <option value="administrator">Administrator</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={profileData.location}
              onChange={(e) =>
                setProfileData({ ...profileData, location: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
              placeholder="City, Country"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bio
          </label>
          <textarea
            value={profileData.bio}
            onChange={(e) =>
              setProfileData({ ...profileData, bio: e.target.value })
            }
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
            placeholder="Tell us about yourself..."
          />
        </div>

        {/* Goals Section */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Goals
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Select your learning and research goals
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {AVAILABLE_GOALS.map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => {
                  const newGoals = profileData.goals.includes(goal)
                    ? profileData.goals.filter((g) => g !== goal)
                    : [...profileData.goals, goal];
                  setProfileData({ ...profileData, goals: newGoals });
                }}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-center ${
                  profileData.goals.includes(goal)
                    ? "bg-qolabb-navy-500 text-white border-qolabb-navy-500"
                    : "bg-white text-gray-700 border-gray-300 hover:border-qolabb-navy-300"
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <Button
            variant="primary"
            onClick={handleSaveProfile}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderAccountSettings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Account & Security
        </h2>
        <p className="text-gray-600">
          Manage your password, authentication, and security settings
        </p>
      </div>

      {/* Password */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Change Password
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={accountSettings.currentPassword}
                onChange={(e) =>
                  setAccountSettings({
                    ...accountSettings,
                    currentPassword: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={accountSettings.newPassword}
              onChange={(e) =>
                setAccountSettings({
                  ...accountSettings,
                  newPassword: e.target.value,
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={accountSettings.confirmPassword}
              onChange={(e) =>
                setAccountSettings({
                  ...accountSettings,
                  confirmPassword: e.target.value,
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
            />
          </div>
          <Button variant="primary" className="w-full">
            Update Password
          </Button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Two-Factor Authentication
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-900 font-medium">Enable 2FA</p>
            <p className="text-sm text-gray-600">
              Add an extra layer of security to your account
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={accountSettings.twoFactorEnabled}
              onChange={(e) =>
                setAccountSettings({
                  ...accountSettings,
                  twoFactorEnabled: e.target.checked,
                })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-qolabb-navy-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-qolabb-navy-600"></div>
          </label>
        </div>
      </div>

      {/* Session Management */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Session Management
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Timeout
            </label>
            <select
              value={accountSettings.sessionTimeout}
              onChange={(e) =>
                setAccountSettings({
                  ...accountSettings,
                  sessionTimeout: e.target.value,
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
            >
              <option value="1h">1 hour</option>
              <option value="8h">8 hours</option>
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
            </select>
          </div>
          <Button variant="ghost" className="text-red-600 hover:bg-red-50">
            Sign Out All Devices
          </Button>
        </div>
      </div>
    </div>
  );

  const renderWorkspaceSettings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Workspace Settings
        </h2>
        <p className="text-gray-600">
          Manage {currentWorkspace?.name || "your workspace"}
        </p>
      </div>

      {/* Debug Information */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-4">
          🔍 Debug Information
        </h3>
        <div className="space-y-3 text-sm">
          <div>
            <span className="font-medium text-yellow-800">User:</span>{" "}
            <span className="text-yellow-700">
              {user ? `${user.email} (ID: ${user.id})` : "Not authenticated"}
            </span>
          </div>
          <div>
            <span className="font-medium text-yellow-800">Current Workspace:</span>{" "}
            <span className="text-yellow-700">
              {currentWorkspace ? `${currentWorkspace.name} (ID: ${currentWorkspace.id})` : "No workspace selected"}
            </span>
          </div>
          <div>
            <span className="font-medium text-yellow-800">Members Count:</span>{" "}
            <span className="text-yellow-700">{members.length}</span>
          </div>
          <div>
            <span className="font-medium text-yellow-800">Loading State:</span>{" "}
            <span className="text-yellow-700">{loading ? "Loading..." : "Loaded"}</span>
          </div>
          <div>
            <span className="font-medium text-yellow-800">Profile:</span>{" "}
            <span className="text-yellow-700">
              {profileData ? `${profileData.fullName || 'No name'} (Role: ${profileData.role || 'No role'})` : "No profile"}
            </span>
          </div>
        </div>
        <button
          onClick={loadMembers}
          className="mt-4 px-4 py-2 bg-yellow-200 text-yellow-800 rounded-lg hover:bg-yellow-300 transition-colors"
        >
          🔄 Reload Members
        </button>
      </div>

      {/* Workspace Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Workspace Information
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workspace Name
            </label>
            <input
              type="text"
              value={workspaceSettings.name}
              onChange={(e) =>
                setWorkspaceSettings({
                  ...workspaceSettings,
                  name: e.target.value,
                })
              }
              disabled={!isOwnerOrAdmin}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={workspaceSettings.description}
              onChange={(e) =>
                setWorkspaceSettings({
                  ...workspaceSettings,
                  description: e.target.value,
                })
              }
              disabled={!isOwnerOrAdmin}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Add a description for this workspace..."
            />
          </div>

          {isOwnerOrAdmin && (
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handleSaveWorkspace}
                disabled={saving || !workspaceSettings.name.trim()}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Invite Code */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Invite Code
        </h3>
        <p className="text-gray-600 mb-4">
          Share this code with others to invite them to your workspace
        </p>

        <div className="flex items-center space-x-3">
          <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg font-mono text-lg tracking-wider text-gray-900">
            {workspaceSettings.inviteCode}
          </div>
          <Button
            variant="ghost"
            onClick={copyInviteCode}
            className="flex items-center space-x-2"
          >
            {copiedCode ? (
              <>
                <Check size={20} className="text-green-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={20} />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Members</h3>
          <p className="text-gray-600 text-sm mt-1">
            {members.length} member{members.length !== 1 ? "s" : ""} in this
            workspace
          </p>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center space-x-4 animate-pulse"
              >
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {members.map((member) => (
              <div
                key={member.id}
                className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <Avatar
                    userId={member.user?.id || member.id}
                    name={member.user?.full_name || 'User'}
                    src={member.user?.avatar_url}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                      <p className="font-semibold text-gray-900 truncate">
                        {member.user?.full_name || "Unknown User"}
                      </p>
                      {member.user_id === user?.id && (
                        <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full self-start">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {member.user?.institution || "No institution"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-3">
                  <div className="flex items-center space-x-2">
                    {member.role === "owner" && (
                      <div className="flex items-center space-x-1 bg-qolabb-navy-100 text-qolabb-navy-700 px-3 py-1 rounded-full">
                        <Crown size={14} />
                        <span className="text-sm font-semibold">Owner</span>
                      </div>
                    )}
                    {member.role === "admin" && (
                      <div className="flex items-center space-x-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                        <Shield size={14} />
                        <span className="text-sm font-semibold">Admin</span>
                      </div>
                    )}
                    {member.role === "member" && (
                      <span className="text-sm text-gray-500">Member</span>
                    )}
                  </div>

                  {isOwnerOrAdmin &&
                    member.user_id !== user?.id &&
                    member.role !== "owner" && (
                      <button className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors flex-shrink-0">
                        <UserMinus size={18} />
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      {isOwnerOrAdmin && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Danger Zone
          </h3>
          <p className="text-red-700 text-sm mb-4">
            Deleting a workspace is permanent and cannot be undone
          </p>
          <Button variant="ghost" className="text-red-600 hover:bg-red-100">
            <Trash2 size={18} className="mr-2" />
            Delete Workspace
          </Button>
        </div>
      )}
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Notification Settings
        </h2>
        <p className="text-gray-600">
          Control how and when you receive notifications
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Email Notifications
        </h3>
        <div className="space-y-4">
          {[
            {
              key: "emailNotifications",
              label: "Email Notifications",
              description: "Receive notifications via email",
            },
            {
              key: "projectUpdates",
              label: "Project Updates",
              description: "Get notified about project changes and milestones",
            },
            {
              key: "taskAssignments",
              label: "Task Assignments",
              description: "Notifications when tasks are assigned to you",
            },
            {
              key: "teamInvites",
              label: "Team Invitations",
              description: "Get notified when invited to teams",
            },
            {
              key: "weeklyDigest",
              label: "Weekly Digest",
              description: "Weekly summary of your activity and updates",
            },
            {
              key: "marketingEmails",
              label: "Marketing Emails",
              description: "Product updates and promotional content",
            },
          ].map((setting) => (
            <div
              key={setting.key}
              className="flex items-center justify-between"
            >
              <div>
                <p className="text-gray-900 font-medium">{setting.label}</p>
                <p className="text-sm text-gray-600">{setting.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    notificationSettings[
                      setting.key as keyof typeof notificationSettings
                    ] as boolean
                  }
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      [setting.key]: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-qolabb-navy-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-qolabb-navy-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Push Notifications
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-900 font-medium">Browser Notifications</p>
            <p className="text-sm text-gray-600">
              Receive push notifications in your browser
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notificationSettings.pushNotifications}
              onChange={(e) =>
                setNotificationSettings({
                  ...notificationSettings,
                  pushNotifications: e.target.checked,
                })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-qolabb-navy-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-qolabb-navy-600"></div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Privacy Settings
        </h2>
        <p className="text-gray-600">
          Control your data and privacy preferences
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Profile Visibility
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who can see your profile?
            </label>
            <select
              value={privacySettings.profileVisibility}
              onChange={(e) =>
                setPrivacySettings({
                  ...privacySettings,
                  profileVisibility: e.target.value,
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
            >
              <option value="public">Everyone</option>
              <option value="workspace">Workspace Members Only</option>
              <option value="team">Team Members Only</option>
              <option value="private">Only Me</option>
            </select>
          </div>

          {[
            {
              key: "showEmail",
              label: "Show Email Address",
              description: "Allow others to see your email address",
            },
            {
              key: "showPhone",
              label: "Show Phone Number",
              description: "Allow others to see your phone number",
            },
            {
              key: "allowDirectMessages",
              label: "Allow Direct Messages",
              description: "Let others send you direct messages",
            },
          ].map((setting) => (
            <div
              key={setting.key}
              className="flex items-center justify-between"
            >
              <div>
                <p className="text-gray-900 font-medium">{setting.label}</p>
                <p className="text-sm text-gray-600">{setting.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    privacySettings[
                      setting.key as keyof typeof privacySettings
                    ] as boolean
                  }
                  onChange={(e) =>
                    setPrivacySettings({
                      ...privacySettings,
                      [setting.key]: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-qolabb-navy-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-qolabb-navy-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Data & Analytics
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-900 font-medium">Analytics Opt-out</p>
              <p className="text-sm text-gray-600">
                Opt out of anonymous usage analytics
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={privacySettings.analyticsOptOut}
                onChange={(e) =>
                  setPrivacySettings({
                    ...privacySettings,
                    analyticsOptOut: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-qolabb-navy-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-qolabb-navy-600"></div>
            </label>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Button
              variant="ghost"
              className="text-qolabb-navy-600 hover:bg-qolabb-navy-50"
              onClick={handleExportData}
              disabled={exportingData}
            >
              <Download size={18} className="mr-2" />
              {exportingData ? 'Exporting...' : 'Export My Data'}
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              Download a copy of all your data (JSON format)
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Appearance Settings
        </h2>
        <p className="text-gray-600">
          Customize the look and feel of your interface
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Theme</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: "light", label: "Light", icon: Sun },
            { value: "dark", label: "Dark", icon: Moon },
            { value: "system", label: "System", icon: Monitor },
          ].map((theme) => (
            <button
              key={theme.value}
              onClick={() =>
                setAppearanceSettings({
                  ...appearanceSettings,
                  theme: theme.value,
                })
              }
              className={`p-4 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                appearanceSettings.theme === theme.value
                  ? "border-qolabb-navy-500 bg-qolabb-navy-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <theme.icon size={24} />
              <span className="font-medium">{theme.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Language & Region
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              value={appearanceSettings.language}
              onChange={(e) =>
                setAppearanceSettings({
                  ...appearanceSettings,
                  language: e.target.value,
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="zh">中文</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Format
            </label>
            <select
              value={appearanceSettings.dateFormat}
              onChange={(e) =>
                setAppearanceSettings({
                  ...appearanceSettings,
                  dateFormat: e.target.value,
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Interface</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Density
            </label>
            <select
              value={appearanceSettings.density}
              onChange={(e) =>
                setAppearanceSettings({
                  ...appearanceSettings,
                  density: e.target.value,
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </select>
          </div>

          {[
            {
              key: "animations",
              label: "Enable Animations",
              description: "Show smooth transitions and animations",
            },
            {
              key: "soundEffects",
              label: "Sound Effects",
              description: "Play sounds for notifications and interactions",
            },
          ].map((setting) => (
            <div
              key={setting.key}
              className="flex items-center justify-between"
            >
              <div>
                <p className="text-gray-900 font-medium">{setting.label}</p>
                <p className="text-sm text-gray-600">{setting.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    appearanceSettings[
                      setting.key as keyof typeof appearanceSettings
                    ] as boolean
                  }
                  onChange={(e) =>
                    setAppearanceSettings({
                      ...appearanceSettings,
                      [setting.key]: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-qolabb-navy-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-qolabb-navy-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderComingSoonSection = (title: string, description: string) => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-qolabb-navy-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <SettingsIcon size={32} className="text-qolabb-navy-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Coming Soon
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          This section is currently under development. We're working hard to
          bring you these features soon!
        </p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return renderProfileSettings();
      case "account":
        return renderAccountSettings();
      case "workspace":
        return renderWorkspaceSettings();
      case "notifications":
        return renderNotificationSettings();
      case "privacy":
        return renderPrivacySettings();
      case "appearance":
        return renderAppearanceSettings();
      case "integrations":
        return renderComingSoonSection(
          "Integrations",
          "Connect external apps and services"
        );
      case "billing":
        return renderComingSoonSection(
          "Billing & Plans",
          "Manage your subscription and billing"
        );
      case "support":
        return renderComingSoonSection(
          "Help & Support",
          "Get help and contact support"
        );
      default:
        return renderProfileSettings();
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Settings Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-qolabb-navy-100 rounded-lg">
                  <SettingsIcon size={24} className="text-qolabb-navy-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Settings</h1>
                  <p className="text-sm text-gray-500 hidden sm:block">
                    Manage your account and preferences
                  </p>
                </div>
              </div>
              
              {/* Mobile Settings Menu Button */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Desktop Horizontal Navigation */}
            <div className="hidden md:block">
              <nav className="flex space-x-1 overflow-x-auto pb-4">
                {settingsSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      activeSection === section.id
                        ? "bg-qolabb-navy-100 text-qolabb-navy-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <section.icon size={16} />
                    <span>{section.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Mobile Settings Navigation Overlay */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden"
                onClick={() => setIsMobileSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-80 bg-white shadow-xl z-50 md:hidden"
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
                  <button
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <nav className="p-4 space-y-1">
                  {settingsSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        setActiveSection(section.id);
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeSection === section.id
                          ? "bg-qolabb-navy-50 text-qolabb-navy-700 border border-qolabb-navy-200"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <section.icon size={20} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{section.label}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {section.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-qolabb-navy-600"></div>
        </div>
      </DashboardLayout>
    }>
      <SettingsPageContent />
    </Suspense>
  );
}
