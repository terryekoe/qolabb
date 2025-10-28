'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, BarChart3, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Users, label: 'My Teams', href: '/coming-soon' },
    { icon: BarChart3, label: 'Analytics', href: '/coming-soon' },
    { icon: Settings, label: 'Settings', href: '/coming-soon' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <Link href="/">
            <div className="text-2xl font-bold">
              <span className="text-black">Qol</span>
              <span className="text-qolabb-navy-600">abb</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {sidebarItems.map((item) => (
            <Link key={item.label} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <item.icon size={20} className="text-gray-600" />
                <span className="font-medium text-gray-700">{item.label}</span>
              </motion.div>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <button className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 w-full transition-colors">
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold mb-2 text-gray-900">Welcome to Qolabb!</h1>
            <p className="text-xl text-gray-600 mb-8">Your team collaboration dashboard</p>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                { label: 'Active Teams', value: '0', color: 'bg-blue-500' },
                { label: 'Total Contributions', value: '0', color: 'bg-green-500' },
                { label: 'Avg. Participation', value: '0%', color: 'bg-purple-500' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
                >
                  <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                    <span className="text-white text-xl font-bold">{stat.value}</span>
                  </div>
                  <h3 className="text-gray-600 font-medium">{stat.label}</h3>
                </motion.div>
              ))}
            </div>

            {/* Coming Soon Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-qolabb-navy-600 to-qolabb-navy-800 rounded-2xl p-12 text-center text-white"
            >
              <h2 className="text-3xl font-bold mb-4">Dashboard Features Coming Soon</h2>
              <p className="text-xl mb-6 opacity-90">
                We're building amazing features to help you track and manage your team projects.
              </p>
              <ul className="text-left max-w-md mx-auto space-y-3">
                {[
                  'Create and manage teams',
                  'Track member contributions',
                  'View real-time analytics',
                  'Export detailed reports',
                  'Set team goals and milestones',
                ].map((feature) => (
                  <li key={feature} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
