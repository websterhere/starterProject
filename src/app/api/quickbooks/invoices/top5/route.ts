import { GET_TOP5 } from '../route';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return GET_TOP5(req as any);
} 