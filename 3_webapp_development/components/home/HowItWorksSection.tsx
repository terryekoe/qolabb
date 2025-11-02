'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, ClipboardList, BarChart2, Trophy } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      icon: UserPlus,
      number: '01',
      title: 'Create Your Team',
      description: 'Sign up and create a team for your group project. Invite your teammates to join.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: ClipboardList,
      number: '02',
      title: 'Log Activities',
      description: 'Track tasks, contributions, and updates as your team works on the project.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: BarChart2,
      number: '03',
      title: 'View Analytics',
      description: 'Access real-time dashboards showing participation metrics and engagement levels.',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: Trophy,
      number: '04',
      title: 'Achieve Fairness',
      description: 'Use insights to balance workload and ensure everyone contributes equally.',
      color: 'from-green-500 to-emerald-500',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            How It <span className="text-blue-600">Works</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get started in minutes with our simple, intuitive process designed for students and educators.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-200 via-qolabb-beige-200 to-blue-200 transform -translate-y-1/2 z-0"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative"
              >
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border-2 border-gray-100">
                  {/* Step Number */}
                  <div className={`bg-gradient-to-r ${step.color} w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto lg:mx-0`}>
                    <span className="text-white font-bold text-2xl">{step.number}</span>
                  </div>

                  {/* Icon */}
                  <div className="bg-gray-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 mx-auto lg:mx-0">
                    <step.icon className="text-gray-700" size={28} />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold mb-3 text-gray-900 text-center lg:text-left">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-center lg:text-left">
                    {step.description}
                  </p>
                </div>

                {/* Mobile Connection Arrow */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden flex justify-center my-4">
                    <motion.div
                      animate={{ y: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-blue-400"
                    >
                      ↓
                    </motion.div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Demo Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-12 text-white text-center"
        >
          <h3 className="text-3xl md:text-4xl font-bold mb-6">
            See Qolabb in Action
          </h3>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Watch a quick walkthrough of how teams use Qolabb to track contributions and promote fair collaboration.
          </p>
          
          {/* Video Placeholder */}
          <div className="bg-black/30 rounded-2xl aspect-video max-w-4xl mx-auto flex items-center justify-center mb-8 backdrop-blur-sm border-2 border-white/20">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="bg-white/20 backdrop-blur-md rounded-full p-6 cursor-pointer hover:bg-white/30 transition-colors"
            >
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-blue-700 border-b-8 border-b-transparent ml-1"></div>
              </div>
            </motion.div>
          </div>

          <p className="text-sm opacity-75">
            Interactive demo coming soon • 2 minutes
          </p>
        </motion.div>
      </div>
    </section>
  );
};
