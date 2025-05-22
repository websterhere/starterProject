import React, { useState, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
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

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

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
      let toolWasUsed = false;
      let toolResultHandled = false;
      let toolResultBuffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        if (value) {
          const chunk = decoder.decode(value);
          toolResultBuffer += chunk;

          try {
            const lines = toolResultBuffer.split(/\n|(?<=})\s*(?=\w+:)/);
            
            for (const line of lines) {
              const jsonStart = line.indexOf('{');
              const jsonEnd = line.lastIndexOf('}');
              
              if (jsonStart !== -1 && jsonEnd > jsonStart) {
                const possibleJson = line.slice(jsonStart, jsonEnd + 1);
                try {
                  const parsed = JSON.parse(possibleJson);
                  const maybeInvoice = parsed.result || parsed;

                  if (Array.isArray(maybeInvoice) && maybeInvoice.length && maybeInvoice[0].DocNumber) {
                    if (onInvoices) onInvoices(maybeInvoice);
                    toolResultHandled = true;
                    toolWasUsed = true;
                    streamMessage('Tool called');
                    return;
                  }

                  if (
                    maybeInvoice &&
                    (maybeInvoice.Id || maybeInvoice.DocNumber) &&
                    maybeInvoice.TotalAmt !== undefined
                  ) {
                    toolWasUsed = true;
                    if (onInvoices && !toolResultHandled) {
                      onInvoices([maybeInvoice]);
                      toolResultHandled = true;
                      streamMessage('Tool called');
                    }
                    return;
                  }
                } catch {
                  // Not valid JSON, skip
                }
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      if (!toolResultHandled) {
        streamMessage('Either tool was called and there was an error or not called');
      }
    } catch (err) {
      console.error('Error in chat:', err);
      streamMessage('Either tool was called and there was an error or not called');
    } finally {
      setLoading(false);
      scrollToBottom();
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
