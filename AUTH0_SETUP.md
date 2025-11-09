# Auth0 Callback URL Setup

## The Problem
Auth0 is showing: "Callback URL mismatch. The provided redirect_uri is not in the list of allowed callback URLs."

## Solution

1. Go to your Auth0 Dashboard: https://manage.auth0.com/
2. Navigate to Applications → Your Application
3. Go to the "Settings" tab
4. Scroll down to "Allowed Callback URLs"
5. Add these URLs (one per line):
   ```
   http://localhost:3000
   http://localhost:3000/
   https://your-production-domain.com
   ```
6. Scroll to "Allowed Logout URLs" and add:
   ```
   http://localhost:3000
   http://localhost:3000/
   https://your-production-domain.com
   ```
7. Scroll to "Allowed Web Origins" and add:
   ```
   http://localhost:3000
   https://your-production-domain.com
   ```
8. Click "Save Changes"

## Important Notes

- The callback URL must **exactly match** what's in your Auth0 dashboard
- For local development, use: `http://localhost:3000`
- Make sure there are no trailing slashes inconsistencies
- After saving, wait a few seconds for changes to propagate

## Current Configuration

The app is configured to use:
- Redirect URI: `window.location.origin` (which will be `http://localhost:3000` in development)
- Make sure this matches what you added in Auth0 dashboard

## Customize Login Message

To change the login message from "Log in to dev-oxbg5ukfe4ngqpqg to continue to hackutd25" to "Continue to qaPI":

1. Go to Auth0 Dashboard: https://manage.auth0.com/
2. Navigate to **Branding** → **Universal Login**
3. Click on **Login** tab
4. In the login template, you can customize the text
5. Alternatively, go to **Applications** → Your Application → **Settings**
6. Change the **Application Name** to "qaPI" (this affects the "continue to" part)
7. You can also customize the login page HTML/CSS in **Branding** → **Universal Login** → **Login** → **Customize Login Page**

**Quick Fix**: Change the Application Name in Auth0 Dashboard to "qaPI" to make it say "Continue to qaPI"



