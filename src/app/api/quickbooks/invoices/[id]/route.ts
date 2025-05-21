import QuickBooks from 'node-quickbooks';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  const cookieStore = await cookies();
  const accessToken = req.headers.get('x-qbo-access-token') || cookieStore.get('qbo_access_token')?.value;
  const refreshToken = req.headers.get('x-qbo-refresh-token') || cookieStore.get('qbo_refresh_token')?.value;
  const realmId = req.headers.get('x-qbo-realm-id') || cookieStore.get('qbo_realm_id')?.value;

  // Add debug logging to check credential values
  console.log('QuickBooks credentials:', {
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    realmId,
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken
  });

  if (!clientId || !clientSecret || !realmId || !accessToken || !refreshToken) {
    console.error('Missing credentials:', {
      clientId: !!clientId,
      clientSecret: !!clientSecret,
      realmId: !!realmId,
      accessToken: !!accessToken,
      refreshToken: !!refreshToken
    });
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

  // Await params as required by Next.js
  const { id: invoiceId } = context.params;

  try {
    const invoice = await new Promise((resolve, reject) => {
      qbo.getInvoice(invoiceId, (err: any, data: any) => {
        if (err) {
          console.error('QuickBooks API error:', err);
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    const response = NextResponse.json(invoice);
    response.headers.set('Content-Type', 'application/json');
    return response;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    const errorResponse = NextResponse.json(
      { error: 'Failed to fetch invoice', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
    errorResponse.headers.set('Content-Type', 'application/json');
    return errorResponse;
  }
}