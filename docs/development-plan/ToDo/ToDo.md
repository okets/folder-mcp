State of my project now:
MCP server is running,  Claude Desktop is connected

- Add breadcrumbs to the top of the screen path devided by a diamond bullet shape

TUI (Text User Interface) main Screen design ToDo:

### Scrolling and Navigation Vision

- The current scrolling behavior moves up and down by text lines, but this limits our ability to use the up and down arrows for more intuitive actions.
- We should change scrolling so that, instead of moving one line at a time, pressing the up or down arrow brings the current element fully into view:
    - Pressing up brings the current element to the top of the screen. (only if the current element is not already visible of course)
    - Pressing down brings the current element to the bottom. (only if the current element is not already visible of course)
- To support this, introduce an abstraction called a "round-box-element":
    - Only "round-box-element" types can be children of a round-box.
    - Elements can be various things (e.g., list items).
- Navigation and focus:
    - When navigating with up/down, the focused "round-box-element" receives a "focused" event and can visually indicate focus (e.g., highlight/change bullet color...whatever looks best for this element).
    - Once focused, pressing right arrow or [Enter] makes the element "Active".
    - Pressing left arrow or [Esc] exits the "Active" state, returning to the truncated view but keeping the element focused.
- Our first round-box-element will be "list-item":
    (In the status round-box, there are many list items (with bullets) that are perfect candidates for round-box-elements.)
    - When focused, the line or bullet can change color.
    - When "Active", the list-item expands to show its full content, wrapping text as needed and expanding vertically.
    - While "Active", scrolling within the element is line-by-line if the content overflows the parent round-box.
    This complements our override mechanism for current active keyboard shortcuts (includeing the status row that shows the current active keyboard shortcuts).
    When the round-box-container itself is active (for round-box-containers, Active also=Focused BTW) it shows:
    [↑↓/PgUp/PgDn] Next/Prev, [←] Back, [→/Enter] Open.
    when a round-box-element is active, it shows:
    [↑↓] Scroll, [←/Esc] Back.
- Replace all content of the Configuration and Status round-boxes with round-box-elements (just list-items for now, some with long text for debugging scroll).


--------------

# Implementation Roadmap

## Phase 1: Core CLI TUI MVP
- Create Fullscreen TUI interface
- Configuration Wizard
    - System detection & auto-configuration
    - Multi-language model support required?
    - **Machine capability detection (CPU, GPU, RAM) for model recommendations**
    - **Hugging Face Hub integration for model metadata display**
    - **Ollama CLI integration and detection**
    - **BitNet support for very weak machines**
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
    - **Model download progress integration**
    - **Embedding generation progress tracking (batches of 32)**
    - **GPU/CPU status display**
    - state of the server (updating embeddings, ready, etc.)
- Interactive configuration wizard
- System detection & auto-configuration
- **Backend Integration Essentials (moved from Phase 2):**
    - **Embedding model setup with caching and progress**
    - **FAISS vector index integration for progress display**

## Phase 2: Backend & Integration Essentials
- Support Legacy Doc, Xls, Ppt Formats (think of as many formats as possible)
- Consider support for images
- Check Similarity search using embeddings in real life: query embedding, top-K, similarity scores (0-1), chunk metadata, empty index handling
- Search CLI command: `folder-mcp search <folder> <query>`, -k param, source/line info, content snippets, works offline
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
- Add npx tool support so this project runs using npx command (npx folder-mcp [command] [args])
