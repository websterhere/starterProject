// @ts-ignore
import QuickBooks from 'node-quickbooks';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  const cookieStore = await cookies();
  const accessToken = req.headers.get('x-qbo-access-token') || cookieStore.get('qbo_access_token')?.value;
  const refreshToken = req.headers.get('x-qbo-refresh-token') || cookieStore.get('qbo_refresh_token')?.value;
  const realmId = req.headers.get('x-qbo-realm-id') || cookieStore.get('qbo_realm_id')?.value;
  
  // Add debug logging to check cookie values
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

  try {
    const invoices = await new Promise((resolve, reject) => {
      qbo.findInvoices({}, (err, data) => {
        if (err) {
          console.error('QuickBooks API error:', err);
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    const response = NextResponse.json(invoices);
    response.headers.set('Content-Type', 'application/json');
    return response;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    const errorResponse = NextResponse.json(
      { error: 'Failed to fetch invoices', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
    errorResponse.headers.set('Content-Type', 'application/json');
    return errorResponse;
  }
}

export async function GET_TOP5(req: NextRequest) {
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

  type Invoice = {
    Id?: string;
    DocNumber?: string;
    TxnDate?: string;
    [key: string]: unknown;
  };
  type QueryResponse = { QueryResponse?: { Invoice?: Invoice[] } };

  function isQueryResponse(obj: any): obj is QueryResponse {
    return obj && typeof obj === 'object' && 'QueryResponse' in obj;
  }

  try {
    const invoices: QueryResponse = await new Promise((resolve, reject) => {
      qbo.findInvoices({}, (err: unknown, data: unknown) => {
        if (err) {
          reject(err);
        } else {
          resolve(data as QueryResponse);
        }
      });
    });
    // Sort by TotalAmt descending and take top 5
    const sorted = isQueryResponse(invoices) && invoices.QueryResponse?.Invoice
      ? invoices.QueryResponse.Invoice.sort((a, b) => Number(b.TotalAmt ?? 0) - Number(a.TotalAmt ?? 0)).slice(0, 5)
      : [];
    return NextResponse.json(sorted);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch top 5 invoices', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}