'use client';

import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ComingSoon } from '@/components/ComingSoon';

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <ComingSoon />
    </DashboardLayout>
  );
}
