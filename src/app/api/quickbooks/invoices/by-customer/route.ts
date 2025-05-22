import QuickBooks from 'node-quickbooks';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const customerName = searchParams.get('name')?.toLowerCase() || '';

  type Invoice = {
    Id?: string;
    DocNumber?: string;
    TxnDate?: string;
    CustomerRef?: { name?: string; value?: string };
    [key: string]: unknown;
  };
  type QueryResponse = { QueryResponse?: { Invoice?: Invoice[] } };

  function isQueryResponse(obj: unknown): obj is QueryResponse {
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
    let filtered: Invoice[] = [];
    if (isQueryResponse(invoices) && invoices.QueryResponse?.Invoice) {
      filtered = invoices.QueryResponse.Invoice.filter(inv =>
        inv.CustomerRef?.name?.toLowerCase().includes(customerName)
      );
    }
    return NextResponse.json(filtered);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch invoices by customer', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
} 