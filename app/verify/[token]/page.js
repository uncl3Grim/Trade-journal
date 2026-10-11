'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import TrackRecordView from '../../../components/trackrecord/TrackRecordView';
import AmbientBackground from '../../../components/trackrecord/AmbientBackground';

export default function VerifyPage() {
  const params = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc('get_public_report', { p_token: params.token }).then(({ data, error }) => {
      if (error || data?.error) {
        setError(data?.error || error?.message || 'Report not found');
      } else {
        setReport(data);
      }
      setLoading(false);
    });
  }, [params.token]);

  if (loading) {
    return (
      <div className="relative min-h-screen bg-[#0a0a0a]">
        <AmbientBackground />
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-10 space-y-4">
          <div className="skeleton h-32 !rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton h-28 !rounded-2xl" />
            ))}
          </div>
          <div className="skeleton h-80 !rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <AmbientBackground />
        <div className="relative z-10 rounded-2xl border border-rose-500/30 bg-rose-500/10 backdrop-blur-md px-6 py-5 text-sm text-rose-300">
          {error}
        </div>
      </div>
    );
  }

  return <TrackRecordView report={report} />;
}
