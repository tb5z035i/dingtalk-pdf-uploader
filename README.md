# dingtalk-pdf-uploader

A frontend-only Chrome extension that uploads the **current PDF tab** into a configured folder inside a **DingTalk team knowledge base**.

## What is implemented

### Chrome extension

- Manifest V3 extension
- Detects PDFs from:
  - direct `.pdf` URLs
  - Chrome's built-in PDF viewer URL (`chrome-extension://.../index.html?src=...`)
  - response headers captured via `webRequest`
- Supports both:
  - remote PDFs (`http://`, `https://`)
  - local PDFs (`file://`) when the user enables **Allow access to file URLs**
- Popup UI for:
  - showing the current PDF
  - overriding the upload filename
  - uploading directly into DingTalk
- Options page for:
  - storing DingTalk credentials locally
  - loading knowledge bases directly from DingTalk
  - browsing folders directly from DingTalk
  - saving the target destination locally
- Background service worker for:
  - DingTalk token acquisition
  - workspace and folder listing
  - direct media upload
  - knowledge-base node creation

## Repository layout

```text
apps/
  extension/  # Chrome extension (MV3)
```

## Quick start

### 1) Install dependencies

```bash
npm install
```

### 2) Build the extension

```bash
npm run build
```

### 3) Load the extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select:

```text
apps/extension/dist
```

### 4) Configure the extension

1. Open the extension's **Options**
2. Fill in:
   - **App Key / Client ID**
   - **App Secret / Client Secret**
   - **Operator unionId**
   - optionally **Corp ID**
3. Click **Authenticate & load workspaces**
4. Choose the target knowledge base
5. Browse to the target folder
6. Click **Save credentials & destination**

### 5) Upload a PDF

1. Open a PDF in Chrome
2. Click the extension icon
3. Optionally rename the file
4. Click **Upload**

## Local file support

For `file://` PDFs, Chrome requires a manual permission toggle:

1. Go to `chrome://extensions`
2. Find this extension
3. Enable **Allow access to file URLs**

Without that toggle, local PDFs cannot be read by the extension.

## DingTalk credential fields

The extension stores these values locally in the browser profile:

- **App ID**: optional metadata field
- **Corp ID**: optional but preferred for the newer token endpoint
- **App Key / Client ID**
- **App Secret / Client Secret**
- **Operator unionId**
- **API base URL**: defaults to `https://api.dingtalk.com`
- **OAPI base URL**: defaults to `https://oapi.dingtalk.com`
- **Create node path**: defaults to `/v2.0/wiki/nodes`

The extension first tries the newer token endpoint:

```text
POST /v1.0/oauth2/{corpId}/token
```

If Corp ID is unavailable or that flow fails, it falls back to:

```text
POST /v1.0/oauth2/accessToken
```

## Required DingTalk permissions

Make sure the DingTalk app has access to:

- knowledge base read
- knowledge base node / folder read
- knowledge base write / node create
- media / file upload
- any user/contact permission needed to identify the operator unionId

## Scripts

### Root

```bash
npm run build
npm test
npm run typecheck
```

### Extension only

```bash
npm run build --workspace @dingtalk-pdf-uploader/extension
npm run test --workspace @dingtalk-pdf-uploader/extension
npm run typecheck --workspace @dingtalk-pdf-uploader/extension
```

## Testing

Automated test coverage includes:

- extension PDF URL detection
- extension Chrome PDF viewer source extraction
- extension credential storage
- DingTalk token request shaping and fallback logic
- DingTalk workspace / folder request shaping
- DingTalk media upload request shaping
- filename normalization

Recommended manual verification:

1. load the unpacked extension
2. configure credentials and destination in Options
3. open:
   - a direct `.pdf` URL
   - a PDF shown inside Chrome's built-in viewer
   - a local `file://` PDF
4. verify popup detection and direct DingTalk upload behavior

## Security note

This extension stores DingTalk app credentials locally in the extension's storage area. That is acceptable only for:

- private/internal use
- trusted machines
- controlled distribution

Do **not** publish this architecture as a public extension if you are not comfortable with the client-side exposure risk of the app secret.
