import React from 'react';
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import { getOrCreateUser } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout';
import ClientDashboard from '@/components/features/client-dashboard';
import ReaderDashboard from '@/components/features/reader-dashboard';
import AdminDashboard from '@/components/features/admin-dashboard';

export default async function DashboardPage() {
  const clerkUser = await currentUser();
  
  if (!clerkUser) {
    redirect('/sign-in');
  }

  const user = await getOrCreateUser(clerkUser);

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <DashboardLayout>
      {user.role === 'client' && <ClientDashboard user={user} />}
      {user.role === 'reader' && <ReaderDashboard user={user} />}
      {user.role === 'admin' && <AdminDashboard user={user} />}
    </DashboardLayout>
  );
}
