# STEP_35_IMPLEMENTATION_PLAN.md

## Description

**Step 35: Remote Access & Cloud LLM Integration**

Implement secure remote access for cloud LLM integration with Cloudflare tunneling. This step enables cloud LLM access to local folder-mcp instances with zero-config tunneling while maintaining the existing MCP protocol (stdio) for Claude Desktop and adding TCP transport for remote gRPC connections.

**Key Focus Areas:**
- TCP transport for remote gRPC server with configurable port (50051)
- API key authentication with Bearer token validation
- TLS/mTLS support with auto-generated certificates
- Cloudflare Tunnel integration for zero-config remote access
- Project subdomain service with `username.folder-mcp.com` subdomains
- Let's Encrypt integration for automated certificate management
- Rate limiting and security audit logging
- Comprehensive certificate management with auto-renewal

**Note**: MCP protocol remains local-only (stdio) as Claude Desktop requires direct process communication. Remote access applies exclusively to gRPC protocol.

## Task Checklist

### Infrastructure & Dependencies
- [ ] **Install Cloudflare Tunnel dependencies**
  - **Description**: Install `@cloudflare/cloudflared` SDK and related tunneling packages
  - **Success Criterion**: Dependencies installed and available in package.json with TypeScript definitions

- [ ] **Install TLS/Certificate dependencies**
  - **Description**: Install certificate management packages (`node-forge`, `acme-client` for Let's Encrypt)
  - **Success Criterion**: All certificate management dependencies available with TypeScript support

### TCP Transport Layer
- [ ] **Implement TCP transport configuration**
  - **Description**: Extend transport factory to support TCP binding with configurable ports
  - **Success Criterion**: Transport factory creates TCP gRPC server on specified port (default 50051)

- [ ] **Add TCP binding to gRPC server**
  - **Description**: Modify existing gRPC server to support both Unix socket and TCP binding simultaneously
  - **Success Criterion**: gRPC server binds to both Unix socket (local) and TCP port (remote) without conflicts

- [ ] **Implement hybrid connection handling**
  - **Description**: Route local connections to Unix socket and remote connections to TCP transport
  - **Success Criterion**: Local connections use Unix socket (no auth), remote connections use TCP (with auth)

### Authentication & Security
- [ ] **Implement API key validation middleware**
  - **Description**: Create gRPC interceptor to validate Bearer tokens from `authorization` metadata
  - **Success Criterion**: Remote gRPC calls require valid API key, local calls bypass authentication

- [ ] **Add rate limiting per API key**
  - **Description**: Implement per-key request throttling with configurable limits
  - **Success Criterion**: API keys are rate-limited, with tracking and enforcement working correctly

- [ ] **Implement security audit logging**
  - **Description**: Log all authentication events, failed attempts, and security violations
  - **Success Criterion**: Comprehensive security event logging with structured format and log rotation

### Certificate Management
- [ ] **Implement self-signed certificate generation**
  - **Description**: Auto-generate self-signed certificates for development and testing
  - **Success Criterion**: Self-signed certificates created automatically with proper CN and SAN fields

- [ ] **Add Let's Encrypt integration**
  - **Description**: Implement automated certificate provisioning using ACME protocol
  - **Success Criterion**: Production certificates obtained and renewed automatically from Let's Encrypt

- [ ] **Implement certificate lifecycle management**
  - **Description**: Handle certificate expiration monitoring, renewal, and rotation
  - **Success Criterion**: Certificates auto-renew before expiration with zero downtime

### Cloudflare Tunnel Integration
- [ ] **Implement Cloudflare Tunnel SDK integration**
  - **Description**: Integrate with Cloudflare Tunnel API for automatic tunnel creation
  - **Success Criterion**: Tunnels created programmatically with proper authentication and configuration

- [ ] **Add dynamic subdomain allocation**
  - **Description**: Implement subdomain service for user-friendly URLs (username.folder-mcp.com)
  - **Success Criterion**: Users get predictable subdomains with DNS record management

- [ ] **Implement tunnel health monitoring**
  - **Description**: Monitor tunnel status and implement automatic reconnection
  - **Success Criterion**: Tunnel failures detected and recovered automatically with minimal downtime

- [ ] **Add tunnel management CLI commands**
  - **Description**: Extend CLI with tunnel control commands (start, stop, status, logs)
  - **Success Criterion**: CLI commands manage tunnel lifecycle and provide status information

### Configuration & CLI Integration
- [ ] **Extend runtime configuration**
  - **Description**: Add tunnel and remote access configuration options to runtime config
  - **Success Criterion**: Configuration supports all tunnel settings with validation and defaults

- [ ] **Implement tunnel CLI commands**
  - **Description**: Add `folder-mcp serve <folder> --tunnel --subdomain <name>` command
  - **Success Criterion**: Single command starts local server with remote tunnel access

- [ ] **Add certificate CLI commands**
  - **Description**: Implement certificate management commands (generate, renew, revoke, status)
  - **Success Criterion**: CLI provides complete certificate lifecycle management

### Testing & Validation
- [ ] **Create integration tests for TCP transport**
  - **Description**: Test TCP gRPC connections with authentication and error handling
  - **Success Criterion**: All TCP transport scenarios tested with 100% pass rate

- [ ] **Test API key authentication flow**
  - **Description**: Validate authentication middleware with valid/invalid keys and rate limiting
  - **Success Criterion**: Authentication works correctly for all scenarios with proper error responses

- [ ] **Test certificate generation and renewal**
  - **Description**: Validate certificate lifecycle from generation through renewal
  - **Success Criterion**: Certificates generated, validated, and renewed without manual intervention

- [ ] **Test Cloudflare tunnel integration**
  - **Description**: Validate tunnel creation, DNS management, and external connectivity
  - **Success Criterion**: External clients can connect through tunnel with proper authentication

### Documentation & Examples
- [ ] **Create remote access configuration documentation**
  - **Description**: Document all remote access configuration options and security settings
  - **Success Criterion**: Complete documentation with examples for all configuration scenarios

- [ ] **Add cloud LLM integration examples**
  - **Description**: Provide examples for integrating with major cloud LLM providers
  - **Success Criterion**: Working examples for OpenAI, Anthropic, and other major providers

- [ ] **Update security documentation**
  - **Description**: Document API key management, certificate handling, and security best practices
  - **Success Criterion**: Comprehensive security guide with troubleshooting information

### Final Integration & Testing
- [ ] **Run comprehensive integration tests**
  - **Description**: Execute full test suite including new remote access functionality
  - **Success Criterion**: All 263+ tests pass with zero TypeScript errors

- [ ] **Validate local MCP compatibility**
  - **Description**: Ensure existing Claude Desktop integration remains fully functional
  - **Success Criterion**: Claude Desktop connects and operates normally with all MCP tools working

- [ ] **Run a real world example with Claude Desktop**
  - **Description**: Test MCP server functionality with Claude Desktop integration. Use the procedure in [CLAUDE_DESKTOP_TEST_ROUTINE.md](CLAUDE_DESKTOP_TEST_ROUTINE.md). **Agent**: Supply a prompt to test the remote access functionality and verify that local MCP connections still work while remote gRPC connections require authentication.
  - **Success Criterion**: Claude Desktop integration confirmed working, remote access functional with proper security, and all authentication/authorization working correctly

## Agent Instructions

- This tool is in pre-production, so do **not** preserve any legacy code.
- Test folder paths:
  - Full test folder: `C:\ThinkingHomes\test-folder`
  - Simple test folder: `C:\ThinkingHomes\test-simple`
- On Windows, use PowerShell command chaining with `;` instead of `&&`.
- Regularly update this file and mark completed steps: `- [x]`.
- Keep this plan file as the **single source of truth** for progress tracking.
