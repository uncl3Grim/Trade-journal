import { NextResponse } from 'next/server';

// Always answers fresh: it reports which deployment is live right now.
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { id: process.env.NEXT_PUBLIC_BUILD_ID || 'local' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
