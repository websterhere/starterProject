'use client';

import React, { useEffect, useState } from 'react';
import ChatPanel from './ChatPanel';

// Refine Invoice and Line types for better type safety
interface InvoiceLine {
  Description?: string;
  DetailType?: string;
  SalesItemLineDetail?: {
    ItemRef?: { name?: string };
    Qty?: number;
    UnitPrice?: number;
  };
  Amount?: number;
}

interface Invoice {
  Id?: string;
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
  CustomerRef?: { name?: string; value?: string };
  TotalAmt?: number;
  Balance?: number;
  Line?: InvoiceLine[];
  [key: string]: unknown;
}

export default function HomePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleConnect = async () => {
    window.location.href = '/api/quickbooks/auth';
  };

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/quickbooks/invoices');
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const data = await response.json();

      // QuickBooks API may return { QueryResponse: { Invoice: [...] } }
      let invoicesArr: Invoice[] = [];
      if (Array.isArray(data)) {
        invoicesArr = data;
      } else if (data?.QueryResponse?.Invoice) {
        invoicesArr = data.QueryResponse.Invoice;
      } else if (data?.Invoice) {
        invoicesArr = Array.isArray(data.Invoice) ? data.Invoice : [data.Invoice];
      } else {
        invoicesArr = [data];
      }
      setInvoices(invoicesArr);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/quickbooks/check-auth');
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // Render a presentable invoice card
  function renderInvoiceCard(invoice: Invoice, idx: number) {
    return (
      <div
        key={invoice.Id || idx}
        className="bg-white shadow rounded-lg p-6 mb-6 border border-gray-200"
      >
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2">
          <div>
            <span className="font-semibold text-gray-700">Invoice #</span>{' '}
            <span className="text-gray-900">{invoice.DocNumber || invoice.Id}</span>
            {invoice.Id && (
              <span className="ml-2 text-xs text-gray-500">(Internal Id: {invoice.Id})</span>
            )}
          </div>
          <div>
            <span className="font-semibold text-gray-700">Date:</span>{' '}
            <span className="text-gray-900">{invoice.TxnDate || '-'}</span>
            {invoice.DueDate && (
              <>
                <span className="ml-4 font-semibold text-gray-700">Due:</span>{' '}
                <span className="text-gray-900">{invoice.DueDate}</span>
              </>
            )}
          </div>
        </div>
        <div className="mb-2">
          <span className="font-semibold text-gray-700">Customer:</span>{' '}
          <span className="text-gray-900">
            {invoice.CustomerRef?.name || invoice.CustomerRef?.value || '-'}
          </span>
        </div>
        <div className="mb-2">
          <span className="font-semibold text-gray-700">Total:</span>{' '}
          <span className="text-gray-900">${invoice.TotalAmt?.toFixed(2) ?? '-'}</span>
          {typeof invoice.Balance === 'number' && (
            <>
              <span className="ml-4 font-semibold text-gray-700">Balance:</span>{' '}
              <span className="text-gray-900">${invoice.Balance.toFixed(2)}</span>
            </>
          )}
        </div>
        {Array.isArray(invoice.Line) && invoice.Line.length > 0 && (
          <div className="mt-4">
            <div className="font-semibold text-gray-700 mb-2">Line Items:</div>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded text-xs">
                <thead>
                  <tr>
                    <th className="px-2 py-1 border-b bg-gray-50 text-left font-semibold text-gray-700">Description</th>
                    <th className="px-2 py-1 border-b bg-gray-50 text-left font-semibold text-gray-700">Qty</th>
                    <th className="px-2 py-1 border-b bg-gray-50 text-left font-semibold text-gray-700">Rate</th>
                    <th className="px-2 py-1 border-b bg-gray-50 text-left font-semibold text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.Line.filter((line) => line.DetailType !== 'SubTotalLineDetail').map((line, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1 border-b">
                        {line.Description || line.SalesItemLineDetail?.ItemRef?.name || '-'}
                      </td>
                      <td className="px-2 py-1 border-b">
                        {line.SalesItemLineDetail?.Qty ?? '-'}
                      </td>
                      <td className="px-2 py-1 border-b">
                        {line.SalesItemLineDetail?.UnitPrice !== undefined
                          ? `$${line.SalesItemLineDetail.UnitPrice.toFixed(2)}`
                          : '-'}
                      </td>
                      <td className="px-2 py-1 border-b">
                        {line.Amount !== undefined ? `$${line.Amount.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-7xl flex flex-col md:flex-row gap-8 shadow-xl rounded-2xl bg-white/80 p-4 md:p-8 border border-gray-200">
        {/* Invoices Panel */}
        <div className="flex-1 min-w-0 flex flex-col max-h-[80vh]">
          <h2 className="text-2xl font-bold mb-4 text-blue-900">Your Invoices</h2>
          <div className="flex-1 overflow-y-auto pr-2">
            {isLoading && (
              <div className="text-center py-4 text-gray-500">Loading invoices...</div>
            )}
            {error && (
              <div className="text-red-600 py-4">{error}</div>
            )}
            {invoices.length > 0 ? (
              <div className="space-y-4">
                {invoices.map((invoice, idx) => renderInvoiceCard(invoice, idx))}
              </div>
            ) : !isLoading && !error ? (
              <div className="text-gray-400 text-center">No invoices found.</div>
            ) : null}
          </div>
          {!isAuthenticated && (
            <button
              onClick={handleConnect}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Connect to QuickBooks
            </button>
          )}
          {isAuthenticated && (
            <button
              onClick={fetchInvoices}
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              Fetch Invoices
            </button>
          )}
        </div>
        {/* Chat Panel */}
        <div className="w-[420px] min-w-[320px] max-w-[100vw]">
          <ChatPanel onInvoices={setInvoices} />
        </div>
      </div>
    </main>
  );
}
