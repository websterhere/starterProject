import React, { useState, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Invoice {
  Id?: string;
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
  CustomerRef?: { name?: string; value?: string };
  TotalAmt?: number;
  Balance?: number;
  Line?: Array<{
    Description?: string;
    Amount?: number;
    DetailType?: string;
    SalesItemLineDetail?: {
      ItemRef?: { name?: string };
      Qty?: number;
      UnitPrice?: number;
    };
  }>;
  [key: string]: unknown;
}

interface ChatPanelProps {
  onInvoices?: (invoices: Invoice[]) => void;
  invoices?: Invoice[];
}

const ChatPanel: React.FC<ChatPanelProps> = ({ onInvoices }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user' as const, content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = '';
      let toolResultHandled = false;
      let toolWasUsed = false;
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          const chunk = decoder.decode(value);
          assistantMsg += chunk;

          try {
            const lines = assistantMsg.split(/\n|(?<=})\s*(?=\w+:)/);
            for (const line of lines) {
              const jsonStart = line.indexOf('{');
              const jsonEnd = line.lastIndexOf('}');
              if (jsonStart !== -1 && jsonEnd > jsonStart) {
                const possibleJson = line.slice(jsonStart, jsonEnd + 1);
                try {
                  const parsed = JSON.parse(possibleJson);
                  const maybeInvoice = parsed.result || parsed;

                  // If the tool result is an array of invoices, notify parent
                  if (Array.isArray(maybeInvoice) && maybeInvoice.length && maybeInvoice[0].DocNumber) {
                    if (onInvoices) onInvoices(maybeInvoice);
                    toolResultHandled = true;
                    toolWasUsed = true;
                    setMessages((msgs) => [
                      ...msgs,
                      {
                        role: 'assistant',
                        content: `✅ Tool was called successfully: *Get Invoices by Customer*\n\nCustomer invoices are shown in the left panel.`,
                      },
                    ]);
                    return;
                  }

                  // If the tool result is a single invoice, notify parent
                  if (
                    maybeInvoice &&
                    (maybeInvoice.Id || maybeInvoice.DocNumber) &&
                    maybeInvoice.TotalAmt !== undefined
                  ) {
                    toolWasUsed = true;
                    if (onInvoices && !toolResultHandled) {
                      onInvoices([maybeInvoice]);
                      toolResultHandled = true;
                      setMessages((msgs) => [
                        ...msgs,
                        {
                          role: 'assistant',
                          content: `✅ Tool was called successfully: *Invoice Extractor*\n\nInvoice Details:\nID: ${maybeInvoice.Id}\nDocument Number: ${maybeInvoice.DocNumber}\nCustomer: ${maybeInvoice.CustomerRef?.name}\nTotal Amount: $${maybeInvoice.TotalAmt}\nBalance: $${maybeInvoice.Balance}`,
                        },
                      ]);
                    }
                    return;
                  }
                } catch {
                  // Not valid JSON, skip
                }
              }
            }
          } catch (err) {
            console.log('Chunk parse failed, waiting for more data...', err);
          }
        }
      }

      if (!toolResultHandled) {
        // Check if the input contains an invoice number pattern
        const invoiceNumberMatch = input.match(/invoice\s+(\d+)/i);
        if (invoiceNumberMatch) {
          setMessages((msgs) => [
            ...msgs,
            {
              role: 'assistant',
              content: `❌ Invoice ${invoiceNumberMatch[1]} was not found. Please check the invoice number and try again.`,
            },
          ]);
        } else if (toolWasUsed) {
          setMessages((msgs) => [
            ...msgs,
            {
              role: 'assistant',
              content: 'ℹ️ The tool was used, but no matching invoice was found. Please check the invoice number and try again.',
            },
          ]);
        } else {
          setMessages((msgs) => [
            ...msgs,
            {
              role: 'assistant',
              content: 'Either the tool was not used, or the tool was used but there was some issue with the tool call.',
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Error in chat:', err);
      setMessages((msgs) => [
        ...msgs,
        { role: 'assistant', content: '❌ Error: Could not get response.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b font-semibold text-lg text-gray-700">Invoice Chat Assistant</div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 text-sm">
        {messages.length === 0 && (
          <div className="text-gray-400 text-center">Ask me about your invoices!</div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={msg.role === 'user' ? 'text-right' : 'text-left'}
          >
            <span
              className={
                msg.role === 'user'
                  ? 'inline-block bg-blue-100 text-blue-800 rounded px-3 py-1 my-1'
                  : 'inline-block bg-gray-100 text-gray-800 rounded px-3 py-1 my-1'
              }
            >
              {msg.content}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="p-3 border-t flex gap-2">
        <input
          type="text"
          className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring"
          placeholder="Type your question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
