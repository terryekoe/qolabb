'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { joinWorkspaceByInviteCode, createTestWorkspace } from '@/app/actions/workspace';

export default function DebugAuthPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    const runDebugChecks = async () => {
      const info: any = {
        timestamp: new Date().toISOString(),
        userFromContext: user,
        profileFromContext: profile,
        loading,
      };

      try {
        // Check Supabase session
        const { data: session, error: sessionError } = await supabase.auth.getSession();
        info.supabaseSession = {
          session: session.session ? {
            user: session.session.user?.email,
            expires_at: session.session.expires_at,
            access_token: session.session.access_token?.substring(0, 20) + '...'
          } : null,
          error: sessionError?.message
        };

        // Check Supabase user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        info.supabaseUser = {
          user: userData.user ? {
            id: userData.user.id,
            email: userData.user.email,
            created_at: userData.user.created_at,
            user_metadata: userData.user.user_metadata
          } : null,
          error: userError?.message
        };

        // Check browser storage
        if (typeof window !== 'undefined') {
          info.browserStorage = {
            cookies: document.cookie,
            localStorage: Object.keys(localStorage).filter(key => 
              key.includes('supabase') || key.includes('auth')
            ),
            sessionStorage: Object.keys(sessionStorage).filter(key => 
              key.includes('supabase') || key.includes('auth')
            )
          };
        }

      } catch (error) {
        info.error = error instanceof Error ? error.message : 'Unknown error';
      }

      setDebugInfo(info);
    };

    runDebugChecks();
  }, [user, loading]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testWorkspaceJoin = async () => {
    try {
      addTestResult('Testing workspace join...');
      // This would need a valid invite code to test
      addTestResult('Workspace join test requires valid invite code');
    } catch (error) {
      addTestResult(`Workspace join error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testWorkspaceCreation = async () => {
    try {
      addTestResult('Testing workspace creation...');
      // This would create a test workspace
      addTestResult('Workspace creation test requires implementation');
    } catch (error) {
      addTestResult(`Workspace creation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const checkProfileInDatabase = async () => {
    try {
      addTestResult('Checking profile in database...');
      if (!user) {
        addTestResult('No user available');
        return;
      }

      // Direct database query to see what's stored
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        addTestResult(`Database error: ${error.message}`);
      } else {
        addTestResult(`Profile found: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      addTestResult(`Profile check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const fixProfileName = async () => {
    try {
      addTestResult('Attempting to fix profile name...');
      if (!user) {
        addTestResult('No user available');
        return;
      }

      // Get the user metadata to see what full_name should be
      const { data: userData } = await supabase.auth.getUser();
      const fullNameFromAuth = userData.user?.user_metadata?.full_name;
      
      addTestResult(`Full name from auth metadata: ${fullNameFromAuth}`);

      if (fullNameFromAuth) {
        // Update the profile with the correct name
        const { data, error } = await supabase
          .from('profiles')
          .update({ full_name: fullNameFromAuth })
          .eq('id', user.id)
          .select()
          .single();

        if (error) {
          addTestResult(`Update error: ${error.message}`);
        } else {
          addTestResult(`Profile updated successfully: ${JSON.stringify(data, null, 2)}`);
          // Refresh the page to see the changes
          window.location.reload();
        }
      } else {
        addTestResult('No full_name found in auth metadata');
      }
    } catch (error) {
      addTestResult(`Fix profile error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading authentication debug info...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Authentication Debug</h1>
            <p className="mt-1 text-sm text-gray-600">
              Debug information for authentication and workspace functionality
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* User Status */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-3">User Status</h2>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm">
                  <span className="font-medium">Status:</span>{' '}
                  <span className={user ? 'text-green-600' : 'text-red-600'}>
                    {user ? 'Authenticated' : 'Not Authenticated'}
                  </span>
                </p>
                {user && (
                  <p className="text-sm mt-1">
                    <span className="font-medium">Email:</span> {user.email}
                  </p>
                )}
              </div>
            </div>

            {/* Profile Information */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-3">Profile Information</h2>
              <div className="bg-gray-50 rounded-md p-4">
                {profile ? (
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Full Name:</span> {profile.full_name || 'Not set'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Role:</span> {profile.role || 'Not set'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Institution:</span> {profile.institution || 'Not set'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Profile ID:</span> {profile.id}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-red-600">No profile data available</p>
                )}
              </div>
            </div>

            {/* Debug Information */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-3">Debug Information</h2>
              <div className="bg-gray-50 rounded-md p-4">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-96">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            </div>

            {/* Test Actions */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-3">Test Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={testWorkspaceJoin}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mr-3"
                >
                  Test Workspace Join
                </button>
                <button
                  onClick={testWorkspaceCreation}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 mr-3"
                >
                  Test Workspace Creation
                </button>
                <button
                  onClick={checkProfileInDatabase}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 mr-3"
                >
                  Check Profile in Database
                </button>
                <button
                  onClick={fixProfileName}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 mr-3"
                >
                  Fix Profile Name
                </button>
                <button
          onClick={() => refreshProfile()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Refresh Profile
        </button>
              </div>
            </div>

            {/* Test Results */}
            {testResults.length > 0 && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-3">Test Results</h2>
                <div className="bg-gray-50 rounded-md p-4 max-h-64 overflow-auto">
                  {testResults.map((result, index) => (
                    <p key={index} className="text-sm text-gray-700 mb-1">
                      {result}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}