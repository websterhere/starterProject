import React, { useState, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean; // Indicates if this message is still streaming
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

  // Helper to scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Helper to stream a message character by character
  const streamMessage = (msg: string) => {
    setMessages((msgs) => [
      ...msgs,
      { role: 'assistant', content: '', streaming: true }
    ]);
    let i = 0;
    const stream = () => {
      setMessages((msgs) => {
        const idx = msgs.findIndex(
          (m, idx) => m.role === 'assistant' && m.streaming && idx === msgs.length - 1
        );
        if (idx !== -1) {
          const updated = [...msgs];
          updated[idx] = {
            ...updated[idx],
            content: msg.slice(0, i),
            streaming: i < msg.length,
          };
          return updated;
        }
        return msgs;
      });
      if (i < msg.length) {
        i++;
        setTimeout(stream, 10);
      }
    };
    stream();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user' as const, content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Add a placeholder for the streaming assistant message
    setMessages((msgs) => [
      ...msgs,
      { role: 'assistant', content: '', streaming: true }
    ]);

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

      // For tool result handling
      let toolResultBuffer = '';

      // Streaming logic: only show plain text, never show JSON
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          const chunk = decoder.decode(value);

          // Filter out any JSON-looking content from the chunk
          // Remove any lines that look like JSON objects or arrays
          const filteredChunk = chunk
            .split('\n')
            .filter(line => {
              // Remove lines that look like JSON objects or arrays
              const trimmed = line.trim();
              // Remove if line starts with { or [ or looks like JSON
              if (
                trimmed.startsWith('{') ||
                trimmed.startsWith('[') ||
                trimmed.endsWith('}') ||
                trimmed.endsWith(']') ||
                trimmed.match(/^".*":/) // key: value
              ) {
                return false;
              }
              // Remove if line is a valid JSON object
              try {
                const maybeJson = JSON.parse(trimmed);
                if (typeof maybeJson === 'object') return false;
              } catch {
                // not JSON, keep
              }
              return true;
            })
            .join('\n');

          assistantMsg += filteredChunk;

          // Update the streaming assistant message in the UI
          setMessages((msgs) => {
            // Find the last assistant message with streaming: true
            const idx = msgs.findIndex(
              (m, i) => m.role === 'assistant' && m.streaming && i === msgs.length - 1
            );
            if (idx !== -1) {
              const updated = [...msgs];
              updated[idx] = { ...updated[idx], content: assistantMsg, streaming: true };
              return updated;
            }
            return msgs;
          });
          scrollToBottom();

          // Try to parse tool result from the stream (but do not show JSON in UI)
          try {
            toolResultBuffer += chunk;
            // Try to find JSON in the buffer
            const lines = toolResultBuffer.split(/\n|(?<=})\s*(?=\w+:)/);
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
                    // Stream the success message
                    streamMessage(`✅ Tool was called successfully: *Get Invoices by Customer*\n\nCustomer invoices are shown in the left panel.`);
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
                      streamMessage(
                        `✅ Tool was called successfully: *Invoice Extractor*\n\nInvoice Details:\nID: ${maybeInvoice.Id}\nDocument Number: ${maybeInvoice.DocNumber}\nCustomer: ${maybeInvoice.CustomerRef?.name}\nTotal Amount: $${maybeInvoice.TotalAmt}\nBalance: $${maybeInvoice.Balance}`
                      );
                    }
                    return;
                  }
                } catch {
                  // Not valid JSON, skip
                }
              }
            }
          } catch {
            // Ignore parse errors, wait for more data
          }
        }
      }

      // When stream is done, finalize the streaming message
      setMessages((msgs) => {
        // Find the last assistant message with streaming: true
        const idx = msgs.findIndex(
          (m, i) => m.role === 'assistant' && m.streaming && i === msgs.length - 1
        );
        if (idx !== -1) {
          const updated = [...msgs];
          updated[idx] = { ...updated[idx], content: assistantMsg, streaming: false };
          return updated;
        }
        return msgs;
      });
      scrollToBottom();

      // If no tool result was handled, show fallback messages as a stream
      if (!toolResultHandled) {
        // Check if the input contains an invoice number pattern
        const invoiceNumberMatch = input.match(/invoice\s+(\d+)/i);
        if (invoiceNumberMatch) {
          streamMessage(`❌ Invoice ${invoiceNumberMatch[1]} was not found. Please check the invoice number and try again.`);
        } else if (toolWasUsed) {
          streamMessage('ℹ️ The tool was used, but no matching invoice was found. Please check the invoice number and try again.');
        } else {
          streamMessage('Either the tool was not used, or the tool was used but there was some issue with the tool call.');
        }
        scrollToBottom();
      }
    } catch (err) {
      console.error('Error in chat:', err);
      streamMessage('❌ Error: Could not get response.');
      scrollToBottom();
    } finally {
      setLoading(false);
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
              style={msg.streaming ? { opacity: 0.7, fontStyle: 'italic' } : {}}
            >
              {msg.content}
              {/* Remove the cursor/pulse indicator */}
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
