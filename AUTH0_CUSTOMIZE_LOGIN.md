# Customize Auth0 Login Message

## Change "Log in to dev-oxbg5ukfe4ngqpqg to continue to hackutd25" to "Continue to qaPI"

The login message is controlled in the Auth0 Dashboard. Here's how to change it:

### Method 1: Change Application Name (Quickest)

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Navigate to **Applications** → Your Application
3. Click on **Settings** tab
4. Find **Name** field (at the top)
5. Change it from "hackutd25" to **"qaPI"**
6. Click **Save Changes**

This will change the message to: "Log in to dev-oxbg5ukfe4ngqpqg to continue to **qaPI**"

### Method 2: Customize Universal Login Page (Full Control)

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Navigate to **Branding** → **Universal Login**
3. Click on **Login** tab
4. Select **Customize Login Page** (or edit the template)
5. You can customize the HTML/CSS to change the entire message
6. Look for the text that says "Log in to {tenant} to continue to {application}"
7. Change it to just "Continue to qaPI" or customize as needed
8. Click **Save**

### Method 3: Use Custom Domain (Advanced)

If you have a custom Auth0 domain, you can:
1. Set up a custom domain in Auth0
2. This will remove the "dev-oxbg5ukfe4ngqpqg" part
3. The message will just say "Continue to qaPI"

### Current Code Configuration

The code is set up to use `screen_hint: 'login'` which helps customize the login flow, but the actual message text must be changed in the Auth0 Dashboard.

**Note**: After making changes in Auth0 Dashboard, it may take a few minutes for changes to propagate.

