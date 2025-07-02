# Logging Documentation

This micropub endpoint includes comprehensive logging for all incoming requests and their processing, making it easier to debug issues and monitor usage.

## Log Format

All logs are output as structured JSON with the following base format:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO|WARN|ERROR",
  "message": "Human readable message",
  "...additional_fields"
}
```

## Log Levels

- **INFO**: Normal operations (requests, responses, successful actions)
- **WARN**: Warning conditions (authentication failures, invalid requests)
- **ERROR**: Error conditions (exceptions, failed operations)

## Request Logging

Every incoming request is logged with:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "message": "Incoming POST request to micropub",
  "endpoint": "micropub|media",
  "method": "GET|POST",
  "headers": {
    "authorization": "[REDACTED]",
    "content-type": "application/json",
    "user-agent": "Client/1.0"
  },
  "query": {"q": "config"},
  "body": {
    "action": "create",
    "access_token": "[REDACTED]"
  },
  "userAgent": "Client/1.0",
  "contentType": "application/json",
  "origin": "https://example.com"
}
```

**Security Note**: Sensitive data like `authorization` headers and `access_token` fields are automatically redacted as `[REDACTED]`.

## Response Logging

All responses are logged with:

```json
{
  "timestamp": "2024-01-15T10:30:45.456Z",
  "level": "INFO",
  "message": "Response sent from micropub",
  "endpoint": "micropub|media",
  "statusCode": 201,
  "response": {"status": "created"},
  "duration": "150ms"
}
```

## Authentication Logging

Authentication attempts are logged separately:

```json
{
  "timestamp": "2024-01-15T10:30:45.200Z",
  "level": "INFO|WARN",
  "message": "Authentication successful|Authentication failed",
  "auth": {
    "success": true,
    "clientId": "https://example.com",
    "scope": "create update delete"
  },
  "error": null
}
```

## Action Logging

Specific micropub actions are logged:

```json
{
  "timestamp": "2024-01-15T10:30:45.300Z",
  "level": "INFO",
  "message": "Action: create",
  "action": "create|update|delete|undelete",
  "client_id": "https://example.com",
  "scope": "create update"
}
```

## Media Upload Logging

Media uploads include additional details:

```json
{
  "timestamp": "2024-01-15T10:30:45.400Z",
  "level": "INFO",
  "message": "Uploading media file",
  "filename": "image.jpg",
  "mimeType": "image/jpeg",
  "size": 1024576,
  "client_id": "https://example.com"
}
```

## Error Logging

Errors include stack traces when available:

```json
{
  "timestamp": "2024-01-15T10:30:45.500Z",
  "level": "ERROR",
  "message": "Unexpected error in micropub handler",
  "error": {
    "name": "TypeError",
    "message": "Cannot read property 'foo' of undefined",
    "stack": "TypeError: Cannot read property...\n    at function..."
  },
  "method": "POST",
  "duration": "50ms"
}
```

## Query and Source Logging

GET requests for config, source, and syndicate-to are logged:

```json
{
  "timestamp": "2024-01-15T10:30:45.600Z",
  "level": "INFO",
  "message": "Action: micropub_get_query",
  "action": "micropub_get_query",
  "query": "config",
  "hasUrl": false
}
```

## Viewing Logs

### Local Development

When running locally with `npm run serve`, logs appear in your terminal console.

### Netlify Functions

Logs are available in:
1. **Netlify Dashboard**: Functions → [Function Name] → Logs
2. **Netlify CLI**: `netlify logs:functions`

## Log Analysis

Since all logs are structured JSON, you can easily:

1. **Filter by level**: `level:"ERROR"`
2. **Search by client**: `auth.clientId:"https://example.com"`
3. **Track request duration**: `duration > 1000ms`
4. **Monitor actions**: `action:"create"`
5. **Debug authentication**: `auth.success:false`

## Privacy Considerations

The logging system automatically redacts:
- Authorization headers
- Access tokens
- Any field named `access_token`

Additional sensitive fields can be redacted by modifying the `logger.js` sanitization functions.

## Example Log Flow

Here's what a typical successful post creation looks like:

```json
// 1. Incoming request
{"level":"INFO","message":"Incoming POST request to micropub",...}

// 2. Authentication
{"level":"INFO","message":"Authentication successful",...}

// 3. Action processing
{"level":"INFO","message":"Action: create",...}

// 4. Content creation
{"level":"INFO","message":"Creating content",...}

// 5. Success
{"level":"INFO","message":"Action completed successfully",...}

// 6. Response
{"level":"INFO","message":"Response sent from micropub","statusCode":201,...}
```

## Troubleshooting

Use logs to debug common issues:

- **Authentication failures**: Look for `auth.success:false` logs
- **Scope errors**: Check `message:"Invalid scope for action"`
- **Content creation issues**: Search for error logs during `action:"create"`
- **Media upload problems**: Filter `endpoint:"media"` logs
- **Performance issues**: Sort by `duration` field

## Configuration

Logging is enabled by default and requires no configuration. The logging level cannot be changed at runtime, but you can filter logs in your monitoring tools.
