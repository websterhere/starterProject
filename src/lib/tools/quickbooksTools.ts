import { tool } from 'ai';
import { z } from 'zod';
import { cookies } from 'next/headers';

export const getInvoiceByIdFromApi = tool({
  description: 'Fetches a QuickBooks invoice by its ID from the backend API.',
  parameters: z.object({
    invoiceId: z.string().describe('The ID of the invoice to retrieve'),
  }),
  async execute({ invoiceId }) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('qbo_access_token')?.value;
    const refreshToken = cookieStore.get('qbo_refresh_token')?.value;
    const realmId = cookieStore.get('qbo_realm_id')?.value;

    if (!accessToken || !refreshToken || !realmId) {
      return { 
        error: 'Missing QuickBooks credentials',
        details: {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasRealmId: !!realmId
        }
      };
    }

    const res = await fetch(`${baseUrl}/api/quickbooks/invoices/${invoiceId}`, {
      headers: {
        'x-qbo-access-token': accessToken,
        'x-qbo-refresh-token': refreshToken,
        'x-qbo-realm-id': realmId,
      }
    });
    if (!res.ok) {
      const errorText = await res.text();
      return { error: `Failed to fetch invoice: ${res.statusText}`, status: res.status, body: errorText };
    }
    return await res.json();
  },
});

export const getTop5InvoicesFromApi = tool({
  description: 'Fetches the top 5 most recent QuickBooks invoices from the backend API.',
  parameters: z.object({}),
  async execute() {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('qbo_access_token')?.value;
    const refreshToken = cookieStore.get('qbo_refresh_token')?.value;
    const realmId = cookieStore.get('qbo_realm_id')?.value;

    if (!accessToken || !refreshToken || !realmId) {
      return {
        error: 'Missing QuickBooks credentials',
        details: {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasRealmId: !!realmId
        }
      };
    }

    const res = await fetch(`${baseUrl}/api/quickbooks/invoices/top5`, {
      headers: {
        'x-qbo-access-token': accessToken,
        'x-qbo-refresh-token': refreshToken,
        'x-qbo-realm-id': realmId,
      }
    });
    if (!res.ok) {
      const errorText = await res.text();
      return { error: `Failed to fetch top 5 invoices: ${res.statusText}`, status: res.status, body: errorText };
    }
    return await res.json();
  },
});

export const getInvoicesByCustomerNameFromApi = tool({
  description: "Retrieves invoices based on the customer's full or partial name.",
  parameters: z.object({
    customerName: z.string().describe("The full or partial name of the customer to search for"),
  }),
  async execute({ customerName }) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('qbo_access_token')?.value;
    const refreshToken = cookieStore.get('qbo_refresh_token')?.value;
    const realmId = cookieStore.get('qbo_realm_id')?.value;

    if (!accessToken || !refreshToken || !realmId) {
      return {
        error: 'Missing QuickBooks credentials',
        details: {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasRealmId: !!realmId
        }
      };
    }

    const res = await fetch(`${baseUrl}/api/quickbooks/invoices/by-customer?name=${encodeURIComponent(customerName)}`, {
      headers: {
        'x-qbo-access-token': accessToken,
        'x-qbo-refresh-token': refreshToken,
        'x-qbo-realm-id': realmId,
      }
    });
    if (!res.ok) {
      const errorText = await res.text();
      return { error: `Failed to fetch invoices by customer: ${res.statusText}`, status: res.status, body: errorText };
    }
    return await res.json();
  },
});