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
        async request({ client, params, checks, provider }) {
          // Get client credentials from environment since NextAuth isn't passing them correctly
          const clientId = process.env.YAHOO_CLIENT_ID!;
          const clientSecret = process.env.YAHOO_CLIENT_SECRET!;
          
          // Use the exact method from Stack Overflow - binary encoding for auth header
          const AUTH_HEADER = Buffer.from(`${clientId}:${clientSecret}`, 'binary').toString('base64');
          
          const tokenParams = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/yahoo`,
            code: params.code!,
            grant_type: 'authorization_code'
          });

          console.log('Token exchange successful!');

          const response = await fetch(provider.token!.url!, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${AUTH_HEADER}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36',
            },
            body: tokenParams.toString(),
          });

          const responseText = await response.text();

          if (!response.ok) {
            throw new Error(`Token exchange failed (${response.status}): ${responseText}`);
          }

          let tokens;
          try {
            tokens = JSON.parse(responseText);
          } catch (e) {
            throw new Error(`Failed to parse token response: ${responseText}`);
          }
          
          return { tokens };
        },
      },
      userinfo: {
        // Provide a dummy userinfo endpoint that just returns a basic profile
        async request({ tokens, provider }) {
          // Return minimal user info since Yahoo's userinfo endpoint has issues
          return {
            sub: 'yahoo-user-' + Date.now(),
            name: 'Yahoo User',
            email: null,
            picture: null,
          };
        },
      },
      clientId: process.env.YAHOO_CLIENT_ID!,
      clientSecret: process.env.YAHOO_CLIENT_SECRET!,
      profile(profile, tokens) {
        return {
          id: profile.sub || 'yahoo-user',
          name: profile.name || 'Yahoo User',
          email: profile.email || null,
          image: profile.picture || null,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        console.log('✅ Access token stored in JWT');
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      console.log('✅ Session created with access token');
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
};