Supabase Google OAuth Setup

This file provides the exact steps required to enable Google sign-in for the app and avoid the "Unsupported provider" error.

1) Enable Google provider in Supabase
   - Dashboard → Authentication → Providers → Google → Enable

2) Create Google OAuth credentials
   - Google Cloud Console → APIs & Services → Credentials
   - Create an OAuth Client ID (Web application)
   - Add this exact redirect URI to the OAuth client:
     - https://<SUPABASE_PROJECT_ID>.supabase.co/auth/v1/callback

3) Configure Supabase with Google credentials
   - Copy the Google Client ID and Client Secret and paste them into Supabase → Authentication → Providers → Google

4) Configure Supabase authentication URLs
   - Supabase → Authentication → URL Configuration
     - Site URL: http://localhost:5173
     - Redirect URLs: http://localhost:5173/**

5) Local environment
   - Set the following in your local environment file (e.g., `.env`)
     - VITE_SUPABASE_URL
     - VITE_SUPABASE_ANON_KEY
     - VITE_SITE_URL (optional) e.g. http://localhost:5173

6) Frontend usage
   - Use Supabase's SDK call (do NOT call /auth/v1/authorize directly):

```ts
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: 'http://localhost:5173' }
});
```

7) Troubleshooting
   - If you still see "Unsupported provider", ensure Google provider is enabled and the Google OAuth client has the exact Supabase callback URL.
   - Confirm that the **Client ID** and **Client Secret** are present in the Supabase provider settings.
