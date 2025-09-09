import type { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: 'yahoo',
      name: 'Yahoo',
      type: 'oauth',
      authorization: {
        url: 'https://api.login.yahoo.com/oauth2/request_auth',
        params: {
          scope: 'fspt-r',
          response_type: 'code',
          language: 'en-us',
        },
      },
      token: {
        url: 'https://api.login.yahoo.com/oauth2/get_token',
        async request({ params, provider }) {
          const clientId = process.env.YAHOO_CLIENT_ID!;
          const clientSecret = process.env.YAHOO_CLIENT_SECRET!;
          const AUTH_HEADER = Buffer.from(`${clientId}:${clientSecret}`, 'binary').toString('base64');

          const tokenParams = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/yahoo`,
            code: params.code!,
            grant_type: 'authorization_code',
          });

          const response = await fetch(provider.token!.url!, {
            method: 'POST',
            headers: {
              Authorization: `Basic ${AUTH_HEADER}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0',
            },
            body: tokenParams.toString(),
          });

          const responseText = await response.text();
          if (!response.ok) {
            throw new Error(`Token exchange failed (${response.status}): ${responseText}`);
          }

          let tokens: any;
          try {
            tokens = JSON.parse(responseText);
          } catch (e) {
            throw new Error(`Failed to parse token response: ${responseText}`);
          }
          return { tokens };
        },
      },
      userinfo: {
        async request() {
          return { sub: 'yahoo-user', name: 'Yahoo User', email: null, picture: null } as any;
        },
      },
      clientId: process.env.YAHOO_CLIENT_ID!,
      clientSecret: process.env.YAHOO_CLIENT_SECRET!,
      profile(profile: any) {
        return {
          id: profile.sub || 'yahoo-user',
          name: profile.name || 'Yahoo User',
          email: profile.email || null,
          image: profile.picture || null,
        } as any;
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        (token as any).accessToken = (account as any).access_token;
        (token as any).refreshToken = (account as any).refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = (token as any).accessToken;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
};

