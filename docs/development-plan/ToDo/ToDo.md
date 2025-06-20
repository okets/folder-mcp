State of my project now:
MCP server is running,  Claude Desktop is connected

# Implementation Roadmap

## Phase 1: Core CLI TUI MVP
- Create Fullscreen TUI interface
- Configuration Wizard
    - System detection & auto-configuration
    - Multi-language model support required?
- User input box with border and placeholder text
- Keyboard navigation
    - \ slash commands for every CLI command
        - select model
        - change port
        - ... all commands
- Advanced help system
    - get connection JSONs
- notification area
    - progress bars for loading, embedding, etc.
    - state of the server (updating embeddings, ready, etc.)
- Interactive configuration wizard
- System detection & auto-configuration

## Phase 2: Backend & Integration Essentials
- Support Legacy Doc, Xls, Ppt Formats (think of as many formats as possible)
- Consider support for images
- Support BitNet for Very Weak Machines in model selection - Reference: https://www.geektime.co.il/pc-with-pentium-ii-128mb-ram-and-windows-98-ran-llm/
- Embedding model setup: Nomic Embed, download/caching, progress...
    - GPU-enabled embedding model: Ollama CLI detection, fallback to CPU, same API, GPU/CPU status, service startup, model download
    - Batch embedding generation: batches of 32, progress bar, saves to embeddings, incremental, resume capability
- FAISS vector index: 768-dim, binary format, ID mappings, load/search, fallback to JSON
- Check Similarity search using embeddings in real life: query embedding, top-K, similarity scores (0-1), chunk metadata, empty index handling
- Search CLI command: `folder-mcp search <folder> <query>`, -k param, source/line info, content snippets, works offline
- choosing the best sentence transformer model for the machine
    - Hugging Face Hub integration for model Metadata
    - figure out machine capabilities (CPU, GPU, RAM) and select the best model
    - Ollama CLI integration for model management
- MCP Access Management:
    - Cloudflare Tunnel support
    - Remote access foundation (gRPC TCP, API key, TLS/mTLS)
    - HTTP gateway (REST/JSON, OpenAPI, CORS)
    - Authentication & security (API key lifecycle, access control)
    - Remote access testing & validation
- VSCode-native MCP integration https://code.visualstudio.com/updates/v1_101
- MCP prompts and tool descriptions support
- support Code folders and files!
this feature will be awesome! mcp that knows your frontend code when working on a backend project

## Phase 3: In-app Chat & Collaboration
- Chat configuration wizard in the first ru
- Internal CLI chat
- Cloud provider integration (OpenAI, Anthropic, etc.)
- Local LLM integration (Ollama)
    - offeer the best model for the machine
- Interactive chat interface
- Advanced chat features (history, export, templates)
- Chat session management
- Chat testing & validation
- token counting & management

## Phase 4: Release & Documentation
- CI/CD
- Production performance optimization
- Comprehensive test suite overview
- Documentation & API reference
- Release preparation & distribution
- Prepare docs for open source release
- Comprehensive documentation (API docs, integration guides, troubleshooting, performance, best practices, usage examples)
- Open source release preparation (license, contribution guidelines, community engagement)
- developer guides (setup, usage, integration, testing, troubleshooting)
