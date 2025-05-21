// src/app/api/quickbooks/callback/route.ts
import { AuthorizationCode } from 'simple-oauth2';
import QuickBooks from 'node-quickbooks';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const realmId = searchParams.get('realmId');

  if (!code || !realmId) {
    return NextResponse.json({ error: 'Missing code or realmId in query params' }, { status: 400 });
  }

  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: 'Missing QuickBooks OAuth environment variables.' }, { status: 500 });
  }

  const client = new AuthorizationCode({
    client: { id: clientId, secret: clientSecret },
    auth: {
      tokenHost: 'https://oauth.platform.intuit.com',
      authorizePath: '/oauth2/v1/tokens/bearer',
      tokenPath: '/oauth2/v1/tokens/bearer',
    },
  });

  try {
    const tokenParams = { code, redirect_uri: redirectUri };
    const accessToken = await client.getToken(tokenParams);

    // Store tokens in cookies for future use (ASYNC!)
    const cookieStore = await cookies();
    cookieStore.set('qbo_access_token', accessToken.token.access_token, { httpOnly: true });
    cookieStore.set('qbo_refresh_token', accessToken.token.refresh_token, { httpOnly: true });
    cookieStore.set('qbo_realm_id', realmId, { httpOnly: true });

    // Redirect to the home page after successful authentication
    return NextResponse.redirect(new URL('/', req.url));
  } catch (error) {
    console.error('OAuth or QuickBooks Error:', error);
    return NextResponse.json(
      { error: 'OAuth callback or QuickBooks API failed', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}
