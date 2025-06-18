# Engineering Documentation

## API Endpoints

### Search Endpoint
```typescript
interface SearchRequest {
  query: string;
  mode: "semantic" | "regex";
  scope: "documents" | "chunks";
  filters?: {
    folder?: string;
    fileType?: string;
  };
  max_tokens?: number;
  continuation_token?: string;
}
```

### Document Retrieval
The `get_document_data` endpoint supports multiple formats:
- `raw`: Full document text
- `chunks`: Chunked content with metadata
- `metadata`: Document metadata only

## Configuration

Database connection settings:
```yaml
database:
  host: localhost
  port: 5432
  name: knowledge_base
```

## Testing Notes

For testing search functionality with "Q1 financial results", ensure the following test data patterns are included across documents:
- Emails: john@acme.com, sarah.smith@bigco.com, procurement@supplier.com  
- Financial: "Q1 revenue", "quarterly results", "$1.2M"
- Dates: "March 31, 2024", "Q1 2024", "2024-03-31"
- Legal: "force majeure", "confidential information", "indemnification"

## Remote Work Guidelines

This document contains references to remote work policies and WFH guidelines for testing search functionality.
