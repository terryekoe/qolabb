'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth/AuthContext';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (error: any) {
      setError(error.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md w-full space-y-8"
        >
          {/* Logo */}
          <div>
            <Link href="/" className="inline-block">
              <motion.div whileHover={{ scale: 1.05 }} className="text-4xl font-bold mb-2">
                <span className="text-black dark:text-white">Qol</span>
                <span className="text-blue-600 dark:text-blue-400">abb</span>
              </motion.div>
            </Link>
            <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
              Reset your password
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Remember your password?{' '}
              <Link
                href="/login"
                className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3"
            >
              <AlertCircle
                className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                size={20}
              />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </motion.div>
          )}

          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start space-x-3"
            >
              <CheckCircle2
                className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
                size={20}
              />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Check your email
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  We've sent a password reset link to <strong>{email}</strong>. Please check your
                  inbox and follow the instructions.
                </p>
              </div>
            </motion.div>
          )}

          {/* Form */}
          {!success && (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="text-gray-400 dark:text-gray-500" size={20} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full group"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send reset link'}
                <ArrowRight
                  className="inline-block ml-2 group-hover:translate-x-1 transition-transform"
                  size={20}
                />
              </Button>
            </form>
          )}

          {/* Back to Login */}
          {success && (
            <div className="mt-6">
              <Link href="/login">
                <Button variant="ghost" size="lg" className="w-full group">
                  <ArrowLeft
                    className="inline-block mr-2 group-hover:-translate-x-1 transition-transform"
                    size={20}
                  />
                  Back to sign in
                </Button>
              </Link>
            </div>
          )}
        </motion.div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 to-blue-800 items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="max-w-lg text-white"
        >
          <h2 className="text-4xl font-bold mb-6">Secure password reset</h2>
          <p className="text-xl text-white/90 mb-8">
            We'll send you a secure link to reset your password. This link will expire in 1 hour for
            your security.
          </p>
          <div className="space-y-4">
            {[
              'Secure email verification',
              'Time-limited reset links',
              'One-click password update',
            ].map((feature, i) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center space-x-3"
              >
                <div className="bg-white/20 rounded-full p-1">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span className="text-lg">{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
