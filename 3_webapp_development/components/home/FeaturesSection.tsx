"use client";

import React from "react";
import { motion } from "framer-motion";
import { BarChart3, Users, Award, TrendingUp, Shield, Zap } from "lucide-react";

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: BarChart3,
      title: "Data-Driven Insights",
      description:
        "Transform participation logs into actionable analytics. Understand team dynamics through clear visualizations and metrics.",
    },
    {
      icon: Users,
      title: "Team Management",
      description:
        "Easily create, join, and manage project teams. Keep everyone organized and connected in one place.",
    },
    {
      icon: Award,
      title: "Fair Assessment",
      description:
        "Help instructors make informed grading decisions based on transparent contribution tracking.",
    },
    {
      icon: TrendingUp,
      title: "Engagement Tracking",
      description:
        "Monitor individual and team participation trends over time to identify and address imbalances early.",
    },
    {
      icon: Shield,
      title: "Transparency",
      description:
        "Build trust within teams through clear, visible contribution records that everyone can access.",
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description:
        "Stay informed with instant notifications and live dashboard updates as team members contribute.",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <section id="features" className="py-20 md:py-32 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
            Why Choose <span className="text-blue-600 dark:text-blue-400">Qolabb</span>?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Everything you need to promote fair collaboration and accountability
            in student group projects.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 hover:shadow-lg transition-shadow"
            >
              <div className="bg-blue-100 dark:bg-blue-900/30 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <feature.icon className="text-blue-700 dark:text-blue-400" size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-16"
        >
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Ready to transform your team collaboration?
          </p>
          <motion.a
            href="/signup"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Use For Free!
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};
