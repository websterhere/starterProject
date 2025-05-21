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
  onInvoiceResult?: (invoice: Invoice) => void;
  invoices?: Invoice[];
}

const ChatPanel: React.FC<ChatPanelProps> = ({ onInvoiceResult, invoices = [] }) => {
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

                  if (
                    maybeInvoice &&
                    (maybeInvoice.Id || maybeInvoice.DocNumber) &&
                    maybeInvoice.TotalAmt !== undefined
                  ) {
                    if (onInvoiceResult && !toolResultHandled) {
                      onInvoiceResult(maybeInvoice);
                      toolResultHandled = true;
                    }
                    return; // ✅ Don't show anything for tool call
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          } catch (err) {
            console.log('Chunk parse failed, waiting for more data...', err);
          }

          if (!toolResultHandled) {
            const lines = assistantMsg.split('\n');
            const humanLines = lines.filter((line) => {
              const trimmed = line.trim();

              const isNoise = 
                trimmed.startsWith('e:{') || 
                trimmed.startsWith('d:{') ||
                trimmed.includes('"promptTokens"') ||
                trimmed.includes('"completionTokens"') ||
                trimmed.includes('"finishReason"') ||
                trimmed.includes('"toolCallId"') ||
                trimmed.includes('"toolName"') ||
                /^[0-9]+:/.test(trimmed); // filters lines like 0: "Hi" 1: "there"

              return trimmed && !isNoise;
            });

            const cleanOutput = humanLines.join(' ').trim();

            if (cleanOutput) {
              setMessages((msgs) => [
                ...msgs.filter((m, i) => i !== msgs.length - 1 || m.role !== 'assistant'),
                { role: 'assistant', content: cleanOutput },
              ]);
            }

          }
          
        }
      }
    } catch (err) {
      console.error('Error in chat:', err);
      setMessages((msgs) => [
        ...msgs,
        { role: 'assistant', content: 'Error: Could not get response.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg border border-gray-200 flex flex-col h-[500px] max-h-[80vh]">
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
