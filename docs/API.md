# DryMDF API Documentation

## Base URL

```
Development: http://localhost:4000/api
Production: https://api.drymdf.com/api
```

## Interactive Documentation

Visit `/api/docs` for the interactive Swagger documentation.

## Endpoints

### Health Check

#### GET /health

Check if the API is running.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-02-02T10:00:00.000Z",
  "uptime": 12345.67
}
```

### Convert to PDF

#### POST /convert/pdf

Queue a PDF conversion job.

**Request Body:**

```json
{
  "markdown": "# Hello World\n\nThis is **markdown**.",
  "clientId": "client-123456",
  "options": {
    "format": "a4",
    "margins": {
      "top": "20mm",
      "right": "20mm",
      "bottom": "20mm",
      "left": "20mm"
    },
    "showHeaderFooter": false
  }
}
```

**Response:**

```json
{
  "jobId": "123",
  "status": "queued"
}
```

**Rate Limit:** 10 requests per minute

### Get Job Status

#### GET /convert/pdf/:jobId

Get the status of a PDF conversion job.

**Response (Processing):**

```json
{
  "status": "active",
  "progress": 50
}
```

**Response (Completed):**

```json
{
  "status": "completed",
  "progress": 100,
  "result": {
    "buffer": "base64-encoded-pdf...",
    "filename": "document_1234567890.pdf"
  }
}
```

### Convert to HTML

#### POST /convert/html

Convert Markdown to HTML synchronously.

**Request Body:**

```json
{
  "markdown": "# Hello World\n\nThis is **markdown**."
}
```

**Response:**

```json
{
  "html": "<h1>Hello World</h1><p>This is <strong>markdown</strong>.</p>"
}
```

**Rate Limit:** 20 requests per minute

## WebSocket Events

### Connection

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);
});
```

### Job Progress

Listen for job progress updates:

```javascript
socket.on("job-progress", (data) => {
  console.log("Progress:", data);
  // {
  //   stage: "parsing",
  //   progress: 20,
  //   message: "Parsing Markdown content..."
  // }
});
```

**Stages:**

- `parsing` - Parsing Markdown (20%)
- `rendering` - Rendering HTML and Mermaid (50%)
- `generating` - Generating PDF (80%)
- `complete` - PDF generated successfully (100%)
- `failed` - Job failed

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

**Common Status Codes:**

- `400` - Bad Request (invalid input)
- `404` - Not Found (job doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Rate Limiting

Rate limits are applied per IP address:

- PDF conversion: 10 requests/minute
- HTML conversion: 20 requests/minute
- Job status: 60 requests/minute

Headers returned on rate limit:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 5
X-RateLimit-Reset: 1234567890
```

## Supported Markdown Features

- GitHub Flavored Markdown (GFM)
- Tables
- Task lists
- Strikethrough
- Autolinks
- Math equations (KaTeX)
- Syntax highlighting for code blocks
- Mermaid diagrams (all types)

## PDF Options

### Page Formats

- `a4` (default) - 210mm x 297mm
- `letter` - 8.5in x 11in
- `legal` - 8.5in x 14in

### Margins

Default margins: `20mm` on all sides

Custom margins:

```json
{
  "margins": {
    "top": "25mm",
    "right": "25mm",
    "bottom": "25mm",
    "left": "25mm"
  }
}
```

### Headers and Footers

```json
{
  "showHeaderFooter": true,
  "headerTemplate": "<div style='font-size: 10px; text-align: center;'>My Document</div>",
  "footerTemplate": "<div style='font-size: 10px; text-align: center;'><span class='pageNumber'></span> / <span class='totalPages'></span></div>"
}
```

## Examples

### Convert with Mermaid Diagram

```markdown
# Flowchart Example

\`\`\`mermaid
graph TD
A[Start] --> B{Is it?}
B -->|Yes| C[OK]
C --> D[Rethink]
D --> B
B ---->|No| E[End]
\`\`\`
```

This will be rendered as an SVG diagram in the PDF.

### Full Example with Node.js

```javascript
const axios = require("axios");
const io = require("socket.io-client");

const API_URL = "http://localhost:4000/api";
const socket = io("http://localhost:4000");

async function convertToPdf() {
  const clientId = socket.id;

  // Listen for progress
  socket.on("job-progress", (data) => {
    console.log(`${data.stage}: ${data.progress}%`);
  });

  // Submit job
  const response = await axios.post(`${API_URL}/convert/pdf`, {
    markdown: "# Hello World\n\nThis is a test.",
    clientId,
    options: { format: "a4" },
  });

  const { jobId } = response.data;

  // Poll for completion
  while (true) {
    const status = await axios.get(`${API_URL}/convert/pdf/${jobId}`);

    if (status.data.status === "completed") {
      const pdfBuffer = Buffer.from(status.data.result.buffer, "base64");
      // Save or process the PDF
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
```
