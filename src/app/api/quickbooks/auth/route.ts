// src/app/api/quickbooks/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthorizationCode } from 'simple-oauth2';

const clientId = process.env.QUICKBOOKS_CLIENT_ID;
const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;

if (!clientId || !clientSecret || !redirectUri) {
  throw new Error('Missing QuickBooks OAuth environment variables.');
}

const oauth2 = new AuthorizationCode({
  client: {
    id: clientId,
    secret: clientSecret,
  },
  auth: {
    tokenHost: 'https://oauth.platform.intuit.com',
    authorizeHost: 'https://appcenter.intuit.com',
    authorizePath: '/connect/oauth2',
    tokenPath: '/oauth2/v1/tokens/bearer',
  },
});

export async function GET() {
  const authUrl = oauth2.authorizeURL({
    redirect_uri: redirectUri,
    scope: 'com.intuit.quickbooks.accounting',
    state: 'secureRandomString',
  });

  return NextResponse.redirect(authUrl);
}
