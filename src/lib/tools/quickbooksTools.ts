import { tool } from 'ai';
import { z } from 'zod';
import { cookies } from 'next/headers';

// Dummy data (should match frontend)
const dummyCompanyInfo = {
  name: 'Acme Corp',
  address: '123 Main St, Springfield',
  industry: 'Software',
  employees: 42,
  taxId: '12-3456789',
};

const dummyInvoices = [
  { id: 'INV-001', customer: 'Acme Corp', amount: 1200.5, status: 'Paid', date: '2024-06-01' },
  { id: 'INV-002', customer: 'Beta LLC', amount: 850.0, status: 'Unpaid', date: '2024-06-05' },
  { id: 'INV-003', customer: 'Gamma Inc', amount: 430.75, status: 'Overdue', date: '2024-05-28' },
  { id: 'INV-004', customer: 'Delta Ltd', amount: 1500.0, status: 'Unpaid', date: '2024-06-10' },
];

// Tool 2: List Unpaid Invoices
export const listUnpaidInvoices = tool({
  description: 'List all unpaid invoices.',
  parameters: z.object({}),
  async execute() {
    return dummyInvoices.filter(inv => inv.status === 'Unpaid');
  },
});

// Tool 3: Get Company Info
export const getCompanyInfo = tool({
  description: 'Get the company information.',
  parameters: z.object({}),
  async execute() {
    return dummyCompanyInfo;
  },
});

export const getInvoiceByIdFromApi = tool({
  description: 'Fetches a QuickBooks invoice by its ID from the backend API.',
  parameters: z.object({
    invoiceId: z.string().describe('The ID of the invoice to retrieve'),
  }),
  async execute({ invoiceId }) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const cookieStore = cookies();
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