'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Check,
  X,
  Users,
  UserPlus,
  AlertCircle,
  Loader2,
  MessageSquare,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/Button';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import {
  getTeamJoinRequests,
  getWorkspaceJoinRequests,
  respondToJoinRequest,
  isTeamLeaderOrInstructor,
} from '@/lib/db/queries';
import { TeamJoinRequestWithDetails } from '@/lib/types/database';
import { toast } from 'react-hot-toast';

interface JoinRequestManagerProps {
  teamId?: string; // If provided, show requests for specific team
  onRequestProcessed?: () => void;
}

export default function JoinRequestManager({
  teamId,
  onRequestProcessed,
}: JoinRequestManagerProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [requests, setRequests] = useState<TeamJoinRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [canManageRequests, setCanManageRequests] = useState(false);

  useEffect(() => {
    if (currentWorkspace?.id && user?.id) {
      loadJoinRequests();
      checkPermissions();
    }
  }, [currentWorkspace?.id, user?.id, teamId]);

  const loadJoinRequests = async () => {
    if (!currentWorkspace?.id) return;

    try {
      setLoading(true);
      let joinRequests: TeamJoinRequestWithDetails[] = [];

      if (teamId) {
        // Load requests for specific team
        joinRequests = await getTeamJoinRequests(teamId);
      } else {
        // Load all requests for workspace
        joinRequests = await getWorkspaceJoinRequests(currentWorkspace.id);
      }

      setRequests(joinRequests || []);
    } catch (error) {
      console.error('Error loading join requests:', error);
      toast.error('Failed to load join requests');
    } finally {
      setLoading(false);
    }
  };

  const checkPermissions = async () => {
    if (!user?.id || !currentWorkspace?.id) return;

    try {
      if (teamId) {
        // Check if user can manage this specific team
        const canManage = await isTeamLeaderOrInstructor(user.id, teamId, currentWorkspace.id);
        setCanManageRequests(canManage);
      } else {
        // For workspace-wide view, check if user is workspace owner/admin
        // This would need to be implemented based on workspace permissions
        setCanManageRequests(true); // Placeholder - implement proper permission check
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setCanManageRequests(false);
    }
  };

  const handleRequestResponse = async (
    requestId: string,
    action: 'approved' | 'rejected',
    userName: string,
    teamName: string
  ) => {
    if (!user?.id) return;

    try {
      setProcessingRequest(requestId);
      await respondToJoinRequest(requestId, action, user.id);

      const actionText = action === 'approved' ? 'approved' : 'rejected';
      toast.success(`${userName}'s request to join ${teamName} has been ${actionText}`);

      // Remove the processed request from the list
      setRequests((prev) => prev.filter((req) => req.id !== requestId));

      if (onRequestProcessed) {
        onRequestProcessed();
      }
    } catch (error) {
      console.error(`Error ${action} join request:`, error);
      toast.error(`Failed to ${action} join request`);
    } finally {
      setProcessingRequest(null);
    }
  };

  const pendingRequests = requests.filter((req) => req.status === 'pending');

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Users size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Class Selected</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Select a workspace to manage join requests
          </p>
        </div>
      </div>
    );
  }

  if (!canManageRequests) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 p-8 text-center">
        <AlertCircle size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600 dark:text-gray-400">
          You don't have permission to manage join requests
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Join Requests</h2>
          <p className="text-gray-600 mt-1">
            {teamId
              ? 'Manage requests for this group'
              : `Manage requests in ${currentWorkspace.name}`}
          </p>
        </div>
        {pendingRequests.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            {pendingRequests.length} pending
          </div>
        )}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
                <div className="flex gap-2">
                  <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : pendingRequests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-600"
        >
          <UserPlus size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pending Requests</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {teamId
              ? 'There are no pending join requests for this group'
              : 'There are no pending join requests in this class'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onApprove={() =>
                handleRequestResponse(
                  request.id,
                  'approved',
                  request.user.full_name,
                  request.team.name
                )
              }
              onReject={() =>
                handleRequestResponse(
                  request.id,
                  'rejected',
                  request.user.full_name,
                  request.team.name
                )
              }
              isProcessing={processingRequest === request.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RequestCardProps {
  request: TeamJoinRequestWithDetails;
  onApprove: () => void;
  onReject: () => void;
  isProcessing: boolean;
}

function RequestCard({ request, onApprove, onReject, isProcessing }: RequestCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRequestTypeText = () => {
    switch (request.request_type) {
      case 'self_request':
        return 'Self-requested to join';
      case 'owner_invitation':
        return 'Invited by owner';
      default:
        return 'Requested to join';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-blue-200 transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        {/* User Avatar */}
        <Avatar
          userId={request.user.id}
          name={request.user.full_name}
          src={request.user.avatar_url}
          size="lg"
          square
          className="shadow-sm"
        />

        {/* Request Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{request.user.full_name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getRequestTypeText()} <span className="font-medium">{request.team.name}</span>
              </p>
              {request.user.institution && (
                <p className="text-xs text-gray-500 mt-1">{request.user.institution}</p>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="w-3 h-3" />
              {formatDate(request.created_at)}
            </div>
          </div>

          {/* Message */}
          {request.message && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Message</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{request.message}</p>
            </div>
          )}

          {/* Team Info */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: request.team.avatar_color }}
            >
              {request.team.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900">{request.team.name}</p>
              {request.team.description && (
                <p className="text-sm text-gray-600 line-clamp-1">{request.team.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 min-w-0">
          <Button
            variant="primary"
            size="sm"
            onClick={onApprove}
            disabled={isProcessing}
            className="flex items-center gap-2 min-w-[100px] justify-center"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Approve
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onReject}
            disabled={isProcessing}
            className="flex items-center gap-2 min-w-[100px] justify-center border-red-200 text-red-600 hover:bg-red-50"
          >
            <X className="w-4 h-4" />
            Reject
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
