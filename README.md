# WhatsApp Development Server

A NestJS-based development server that acts as a local WhatsApp interface, mimicking the WhatsApp Cloud API for testing and development purposes. This server allows you to send and receive WhatsApp messages through your personal WhatsApp account without needing access to the official WhatsApp Business API.

## How It Works

This server bridges your local WhatsApp Web session with your development environment:

1. **Authentication**: On startup, the server initializes a WhatsApp Web client using [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js). You'll need to scan a QR code (displayed in the terminal) with your WhatsApp mobile app to authenticate.

2. **Session Persistence**: Once authenticated, your session is saved locally using `LocalAuth`, so you won't need to scan the QR code on subsequent restarts.

3. **Receiving Messages**: When someone sends you a WhatsApp message, the server:
   - Captures the incoming message
   - Formats it to match the WhatsApp Cloud API webhook payload structure
   - Forwards it to your configured webhook URL (if set)

4. **Sending Messages**: You can send messages through the REST API using a payload format similar to the WhatsApp Cloud API.

## Installation

```bash
pnpm install
```

## Configuration

Set the following environment variables (optional):

```bash
# Port for the server (default: 3005)
PORT=3005

# Webhook URL to receive incoming messages
WEBHOOK_URL=http://your-webhook-endpoint.com/webhook

# Base URL for the server
BASE_URL=http://localhost:3005
```

## Running the Server

```bash
# Development mode with auto-reload
pnpm run start:dev

# Production mode
pnpm run start:prod

# Standard start
pnpm run start
```

On first run, scan the QR code displayed in the terminal with your WhatsApp mobile app (WhatsApp > Settings > Linked Devices > Link a Device).

## API Endpoints

### **POST** `/whatsapp/send`

Send a WhatsApp message using Cloud API format.

**Request Body:**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "1234567890",
  "type": "text",
  "text": {
    "body": "Hello, this is a test message!"
  }
}
```

**Parameters:**
- `messaging_product`: Must be `"whatsapp"`
- `recipient_type`: Must be `"individual"`
- `to`: Phone number (with or without country code, with or without @c.us suffix)
- `type`: Must be `"text"`
- `text.body`: The message content

**Response:**
```json
{
  "success": true,
  "response": { /* WhatsApp message details */ }
}
```

**Example:**
```bash
curl -X POST http://localhost:3005/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "1234567890",
    "type": "text",
    "text": {
      "body": "Hello from the dev server!"
    }
  }'
```

---

### **GET** `/whatsapp/config/webhook`

Get the currently configured webhook URL.

**Response:**
```json
{
  "webhookUrl": "http://your-webhook-endpoint.com/webhook"
}
```

**Example:**
```bash
curl http://localhost:3005/whatsapp/config/webhook
```

---

### **POST** `/whatsapp/config/webhook`

Set or update the webhook URL for receiving incoming messages.

**Request Body:**
```json
{
  "url": "http://your-webhook-endpoint.com/webhook"
}
```

**Response:**
```json
{
  "success": true,
  "webhookUrl": "http://your-webhook-endpoint.com/webhook"
}
```

**Example:**
```bash
curl -X POST http://localhost:3005/whatsapp/config/webhook \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:4000/webhook"}'
```

---

### **GET** `/whatsapp/logout`

Logout from the WhatsApp Web session and clear authentication.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Example:**
```bash
curl http://localhost:3005/whatsapp/logout
```

---

## Cloud API Compatible Endpoint

This endpoint mimics the official WhatsApp Cloud API, allowing you to use this server as a drop-in replacement during development.

### **POST** `/:version/:phoneId/messages`

A Cloud API compatible endpoint for sending messages and marking messages as read. Use this when your application is built to work with the WhatsApp Cloud API.

**Base URL Example:** `http://localhost:3005/v18.0/dev`

---

#### Send a Text Message

**Request Body:**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "1234567890",
  "type": "text",
  "text": {
    "body": "Hello!"
  }
}
```

**Parameters:**
- `messaging_product`: Must be `"whatsapp"`
- `recipient_type`: Must be `"individual"` (optional, defaults to individual)
- `to`: Phone number
- `type`: Must be `"text"`
- `text.body`: The message content

**Response:**
```json
{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "1234567890", "wa_id": "1234567890" }],
  "messages": [{ "id": "wamid.xxxxx" }]
}
```

**Example:**
```bash
curl -X POST http://localhost:3005/v18.0/dev/messages \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "1234567890",
    "type": "text",
    "text": { "body": "Hello from Cloud API!" }
  }'
```

---

#### Mark Message as Read

**Request Body:**
```json
{
  "messaging_product": "whatsapp",
  "status": "read",
  "message_id": "wamid.xxxxx"
}
```

**Parameters:**
- `messaging_product`: Must be `"whatsapp"`
- `status`: Must be `"read"`
- `message_id`: The ID of the message to mark as read

**Response:**
```json
{
  "success": true
}
```

**Example:**
```bash
curl -X POST http://localhost:3005/v18.0/dev/messages \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "status": "read",
    "message_id": "wamid.xxxxx"
  }'
```

---

## Webhook Payload Format

When a message is received, the server forwards it to your configured webhook URL with the following Cloud API-compatible payload:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "your_phone_number",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "your_phone_number",
              "phone_number_id": "your_phone_number"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Contact Name"
                },
                "wa_id": "1234567890"
              }
            ],
            "messages": [
              {
                "from": "1234567890",
                "id": "message_id",
                "timestamp": "1634567890",
                "text": {
                  "body": "Message content"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

## Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

## Tech Stack

- **NestJS** - Progressive Node.js framework
- **whatsapp-web.js** - WhatsApp Web client library
- **Puppeteer** - Headless browser for WhatsApp Web
- **TypeScript** - Type-safe development

## License

UNLICENSED
