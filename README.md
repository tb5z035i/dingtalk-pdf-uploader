# dingtalk-pdf-uploader

A Chrome extension plus a small backend that lets you upload the **current PDF tab** into a configured folder inside a **DingTalk team knowledge base**.

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
  - uploading to the configured DingTalk destination
- Options page for:
  - backend URL
  - loading knowledge bases
  - browsing folders
  - saving the target destination

### Backend

- Express server with:
  - `GET /health`
  - `GET /api/workspaces`
  - `GET /api/nodes?parentNodeId=...`
  - `POST /api/upload`
- Mock DingTalk mode for local development and testing
- Real DingTalk mode with:
  - app-token retrieval
  - workspace listing
  - node listing
  - PDF media upload
  - configurable knowledge-base node creation path

## Repository layout

```text
apps/
  extension/  # Chrome extension (MV3)
  server/     # backend API and DingTalk integration
```

## Quick start

### 1) Install dependencies

```bash
npm install
```

### 2) Build everything

```bash
npm run build
```

### 3) Start the backend in local mock mode

```bash
PORT=8787 DINGTALK_MOCK_MODE=true npm run start --workspace @dingtalk-pdf-uploader/server
```

The backend will be available at:

```text
http://localhost:8787
```

### 4) Load the extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select:

```text
apps/extension/dist
```

### 5) Configure the extension

1. Open the extension's **Options**
2. Set backend URL to:

```text
http://localhost:8787
```

3. Click **Load workspaces**
4. Choose the knowledge base
5. Browse to the desired folder
6. Click **Save settings**

### 6) Upload a PDF

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

## Mock vs real DingTalk mode

## Mock mode

Mock mode is the default development path and does **not** require real DingTalk credentials.

Use:

```bash
DINGTALK_MOCK_MODE=true
```

This mode returns a demo knowledge base and accepts PDF uploads locally, which makes it suitable for:

- extension development
- backend validation
- CI and automated tests

## Real DingTalk mode

Set:

```bash
DINGTALK_MOCK_MODE=false
```

Then configure the backend with the variables shown in `apps/server/.env.example`.

### Real-mode notes

- DingTalk app credentials stay on the backend only.
- The backend expects a fixed `DINGTALK_OPERATOR_ID` / unionId for MVP.
- The current real upload implementation follows this shape:
  1. fetch app access token
  2. upload PDF to DingTalk media API
  3. create a knowledge-base node using a configurable node-create path

Because DingTalk's documentation around **PDF/file-node insertion into a knowledge base** is less explicit than the list APIs, the final node-create endpoint is configurable through:

```text
DINGTALK_CREATE_NODE_PATH
```

Default:

```text
/v2.0/wiki/nodes
```

If your DingTalk tenant or official API flow requires a different endpoint, adjust this environment variable instead of changing extension code.

## Environment variables

See:

```text
apps/server/.env.example
```

Key variables:

- `PORT`
- `MAX_UPLOAD_BYTES`
- `BACKEND_ALLOWED_ORIGINS`
- `DINGTALK_MOCK_MODE`
- `DEFAULT_WORKSPACE_ID`
- `DEFAULT_PARENT_NODE_ID`
- `DINGTALK_APP_KEY`
- `DINGTALK_APP_SECRET`
- `DINGTALK_OPERATOR_ID`
- `DINGTALK_API_BASE_URL`
- `DINGTALK_OAPI_BASE_URL`
- `DINGTALK_CREATE_NODE_PATH`

## Scripts

### Root

```bash
npm run build
npm test
npm run typecheck
```

### Backend only

```bash
npm run dev --workspace @dingtalk-pdf-uploader/server
npm run start --workspace @dingtalk-pdf-uploader/server
```

### Extension only

```bash
npm run build --workspace @dingtalk-pdf-uploader/extension
npm run test --workspace @dingtalk-pdf-uploader/extension
```

## Testing

Automated test coverage includes:

- backend request validation
- backend token caching
- filename normalization
- extension PDF URL detection
- extension Chrome PDF viewer source extraction

Recommended manual verification:

1. start the backend in mock mode
2. load the unpacked extension
3. configure the destination in Options
4. open:
   - a direct `.pdf` URL
   - a PDF shown inside Chrome's built-in viewer
   - a local `file://` PDF
5. verify popup detection and upload behavior
