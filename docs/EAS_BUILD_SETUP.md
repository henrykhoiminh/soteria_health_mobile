# EAS Build Setup for iOS Physical Device

This guide walks you through setting up EAS Build to run the Soteria Health app on your physical iPhone with native module support (including video compression).

## Prerequisites

- Apple Developer Program membership ($99/year) - **Done**
- Expo account logged in via `eas login` - **Done**
- EAS project configured - **Done**

## Step 1: Run the Build Command

In your terminal, navigate to the project directory and run:

```bash
cd /Users/henrytran/Documents/Trans-Action-Apps/soteria-health-mobile
eas build --profile development-device --platform ios
```

## Step 2: Apple Developer Authentication

You'll be prompted to log in to your Apple Developer account:

1. **Enter your Apple ID** (email)
2. **Enter your password**
3. **Complete 2FA** if prompted (code sent to your devices)

## Step 3: Certificate Setup

EAS will ask about certificates. Select these options:

1. **"Generate a new Apple Distribution Certificate?"** → Select **Yes**
2. **"Generate a new Apple Provisioning Profile?"** → Select **Yes**

EAS will automatically create and store these credentials securely.

## Step 4: Wait for Build

- The build takes approximately **15-20 minutes**
- You'll see a URL like: `https://expo.dev/accounts/henrykhoiminh/builds/...`
- You can close the terminal - the build continues on Expo's servers
- You'll get a notification when it's done

## Step 5: Install on Your iPhone

Once the build completes:

1. **Open the build URL** on your iPhone (or scan the QR code)
2. **Tap "Install"** to download the development client
3. **Trust the developer** on your iPhone:
   - Go to: **Settings → General → VPN & Device Management**
   - Tap your developer certificate
   - Tap **"Trust"**

## Step 6: Run the App

After installation, start the development server:

```bash
npx expo start --dev-client
```

Then:
1. Open the **Soteria Health** app on your iPhone
2. It will show a QR code scanner or the dev server URL
3. **Scan the QR code** from your terminal or enter the URL
4. The app loads with full native module support!

## Daily Development Workflow

After the initial setup, your daily workflow is:

```bash
# Start the dev server
npx expo start --dev-client

# Open the app on your phone and scan the QR code
```

No cables, no simulator, no slow laptop!

## Rebuilding (When Needed)

You only need to rebuild when you:
- Add a new native module
- Update native module versions
- Change `app.json` native configuration

To rebuild:
```bash
eas build --profile development-device --platform ios
```

## Troubleshooting

### "App not installed" error
- Make sure you trusted the developer certificate in Settings

### App crashes on launch
- Check that you're running `npx expo start --dev-client` (not just `npx expo start`)

### Can't connect to dev server
- Make sure your phone and laptop are on the same WiFi network
- Try using tunnel mode: `npx expo start --dev-client --tunnel`

### Need to update credentials
```bash
eas credentials
```

## Useful Commands

```bash
# Check build status
eas build:list

# View credentials
eas credentials

# Cancel a running build
eas build:cancel

# Create a new build
eas build --profile development-device --platform ios
```

## What's Included in This Build

The development build includes these native modules:
- `react-native-compressor` - Video compression (reduces 4K videos to uploadable sizes)
- `expo-av` - Audio/video playback
- `expo-image-picker` - Photo/video selection
- All other Expo modules

---

**Created:** January 2026
**Last Updated:** January 2026
