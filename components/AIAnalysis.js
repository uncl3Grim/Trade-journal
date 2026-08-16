'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AIAnalysis({ defaultRiskAmount }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState('');

  async function runAnalysis() {
    setLoading(true);
    setError('');
    setAnalysis('');
    const {
      data: { session },
    } = await supabase.auth.getSession();
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ defaultRiskAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">AI Trade Analysis</h3>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-medium"
        >
          {loading ? 'Analyzing...' : 'Analyze My Trading'}
        </button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {analysis && <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{analysis}</div>}
      {!analysis && !loading && !error && (
        <p className="text-xs text-gray-400">Get AI-powered coaching based on your full trade history, patterns, and stats.</p>
      )}
    </div>
  );
}
