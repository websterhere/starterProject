// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getInvoiceByIdFromApi, listUnpaidInvoices, getCompanyInfo } from '@/lib/tools/quickbooksTools';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4'),
    messages,
    tools: { getInvoiceByIdFromApi, listUnpaidInvoices, getCompanyInfo },
    toolChoice: 'auto',
  });

  return result.toDataStreamResponse();
}