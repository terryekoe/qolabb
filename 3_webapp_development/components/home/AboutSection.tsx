'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, Heart } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-20 md:py-32 bg-gradient-to-br from-gray-50 to-qolabb-beige-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main About Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          {/* Left - Image/Visual */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-blue-500 to-qolabb-beige-500 rounded-2xl p-12 text-white">
              <h3 className="text-3xl font-bold mb-4">The Problem</h3>
              <p className="text-lg leading-relaxed mb-6">
                In most student projects, participation is uneven. Some members do most of the work while others contribute very little.
              </p>
              <p className="text-lg leading-relaxed">
                This leads to frustration, unfair grading, and missed learning opportunities.
              </p>
              
              {/* Stats Visualization */}
              <div className="mt-8 space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Unequal Participation</span>
                    <span className="text-sm font-bold">73%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white rounded-full h-2" style={{ width: '73%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Student Frustration</span>
                    <span className="text-sm font-bold">68%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white rounded-full h-2" style={{ width: '68%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              About <span className="text-blue-600">Qolabb</span>
            </h2>
            <p className="text-xl text-gray-600 mb-6 leading-relaxed">
              Qolabb is designed to solve this challenge by making team participation transparent, trackable, and fair.
            </p>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              We combine simple data analytics with an intuitive user experience to help both students and instructors track contributions, visualize engagement, and encourage equitable teamwork.
            </p>
            
            {/* Key Points */}
            <div className="space-y-4">
              {[
                'Monitor participation across all team projects',
                'Provide transparent analytics for teams and supervisors',
                'Encourage healthy collaboration and accountability',
                'Support data-informed feedback and grading',
              ].map((point, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-3"
                >
                  <div className="bg-blue-100 rounded-full p-1 mt-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                  <p className="text-gray-700">{point}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Mission, Vision, Values */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            {
              icon: Target,
              title: 'Our Mission',
              description: 'To promote equitable participation and fair assessment in student group projects through data-driven transparency.',
            },
            {
              icon: Eye,
              title: 'Our Vision',
              description: 'A world where every student contributes meaningfully to team projects and receives recognition for their work.',
            },
            {
              icon: Heart,
              title: 'Our Values',
              description: 'Transparency, fairness, accountability, and collaboration. We believe in empowering students through data.',
            },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-lg"
            >
              <div className="bg-qolabb-beige-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <item.icon className="text-blue-700" size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                {item.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
