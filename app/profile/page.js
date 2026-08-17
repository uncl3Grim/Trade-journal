'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import RiskSettings from '../../components/RiskSettings';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
      } else {
        setUser(session.user);
      }
    });
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const initial = user?.email ? user.email[0].toUpperCase() : '?';

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-6 bg-[#f7f7fb]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
        <button onClick={() => router.push('/journal')} className="text-sm text-gray-500 hover:text-gray-800">
          Back to Journal
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-semibold">
          {initial}
        </div>
        <div>
          <div className="font-medium text-gray-900">{user?.email}</div>
          <div className="text-xs text-gray-400">Trade Journal account</div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-2">Settings</h2>
      <RiskSettings userId={user?.id} onSaved={() => {}} />

      <button
        onClick={handleSignOut}
        className="w-full mt-6 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl py-2 text-sm font-medium"
      >
        Sign out
      </button>
    </div>
  );
}
