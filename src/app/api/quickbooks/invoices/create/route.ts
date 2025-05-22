import QuickBooks from 'node-quickbooks';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  const cookieStore = await cookies();
  const accessToken = req.headers.get('x-qbo-access-token') || cookieStore.get('qbo_access_token')?.value;
  const refreshToken = req.headers.get('x-qbo-refresh-token') || cookieStore.get('qbo_refresh_token')?.value;
  const realmId = req.headers.get('x-qbo-realm-id') || cookieStore.get('qbo_realm_id')?.value;

  if (!clientId || !clientSecret || !realmId || !accessToken || !refreshToken) {
    return NextResponse.json({ error: 'Missing QuickBooks credentials or tokens.' }, { status: 401 });
  }

  const qbo = new QuickBooks(
    clientId,
    clientSecret,
    accessToken,
    false,
    realmId,
    true, // use Sandbox
    true,
    null,
    '2.0',
    refreshToken
  );

  const invoiceData = await req.json();

  try {
    const created = await new Promise((resolve, reject) => {
      qbo.createInvoice(invoiceData, (err: unknown, data: unknown) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
    return NextResponse.json(created);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create invoice', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 