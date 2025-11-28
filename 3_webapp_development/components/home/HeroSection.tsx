'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '../Button';

export const HeroSection: React.FC = () => {
  const [imageError, setImageError] = useState(false);
  // Generate stable background elements to avoid hydration mismatch
  const backgroundElements = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => {
      // Use index to seed pseudo-random values for stability
      const seed = i * 137.508; // Golden angle for distribution
      return {
        width: ((seed * 17) % 250) + 50,
        height: ((seed * 23) % 250) + 50,
        left: ((seed * 31) % 100),
        top: ((seed * 41) % 100),
        animateY: ((seed * 13) % 100) - 50,
        animateX: ((seed * 19) % 100) - 50,
        duration: ((seed * 7) % 10) + 10,
      };
    });
  }, []);
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-gray-50 to-qolabb-beige-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {backgroundElements.map((element, i) => (
          <motion.div
            key={i}
            className="absolute bg-blue-100 dark:bg-blue-900/20 rounded-full opacity-20"
            style={{
              width: element.width,
              height: element.height,
              left: `${element.left}%`,
              top: `${element.top}%`,
            }}
            animate={{
              y: [0, element.animateY],
              x: [0, element.animateX],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: element.duration,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-block mb-6"
            >
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-semibold">
                ✨ Fair Teamwork Starts Here
              </span>
            </motion.div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="text-gray-900 dark:text-white">Make Group Projects</span>{' '}
              <span className="text-blue-600 dark:text-blue-400">Fair & Engaging</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              Track contributions, visualize engagement, and promote equitable participation in student team projects with data-driven insights.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link href="/signup">
                <Button variant="primary" size="lg" className="group">
                  Get Started
                  <ArrowRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="group">
                <Play className="inline-block mr-2" size={20} />
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200 dark:border-gray-700">
              {[
                { value: '1000+', label: 'Students' },
                { value: '250+', label: 'Projects' },
                { value: '98%', label: 'Satisfaction' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <div className="text-3xl md:text-4xl font-bold text-blue-700 dark:text-blue-400">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Column - Image/Illustration */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              {/* Student collaboration image */}
              <div className="aspect-square bg-gradient-to-br from-blue-400 to-qolabb-beige-400 dark:from-blue-600 dark:to-gray-800 flex items-center justify-center relative">
                {!imageError ? (
                  <Image
                    src="/students.jpg"
                    alt="Happy students collaborating on team projects"
                    fill
                    className="object-cover"
                    priority
                    onError={() => {
                      console.error('Failed to load image: /students.jpg');
                      setImageError(true);
                    }}
                  />
                ) : (
                  /* Fallback placeholder - shown if image fails to load */
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="text-white text-center p-8 flex flex-col items-center justify-center"
                  >
                    <div className="text-6xl mb-4">👥</div>
                    <p className="text-2xl font-semibold">Happy Students</p>
                    <p className="text-lg mt-2 opacity-90">Collaborating Together</p>
                    <p className="text-sm mt-4 opacity-75">Image: /students.jpg not found</p>
                  </motion.div>
                )}
              </div>

              {/* Floating Cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-4 -left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Active Teams</span>
                </div>
                <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">24</div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                className="absolute -bottom-4 -right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Engagement</span>
                </div>
                <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">95%</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
