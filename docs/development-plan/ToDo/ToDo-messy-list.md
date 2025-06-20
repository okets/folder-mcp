


[Work in Progress]
####  ☁️ Cloudflare Tunnel plan prompt
Give me full implementation plan for implementing cloudflare Tunnel. with all required steps, including registering the domain mcp-folder.link (or folder-mcp.app, haven't decided yet) with the  service.
my goal is to have the user run my CLI app locally, have it process the data -> serve it using MCP server
the user should have a connection address with this format fdsl3442356lkl.folder-mcp.link
also, check what are the implications if the user shuts off his computer for the night.
will it still work after starting it again?
```

#### Features I Need to Add to Task Lists
-------------------------------------------------
## Tests I Need to Run
1. Choosing Ollama model, then deleting it from Ollama.
-------------------------------------------------
## Features I Need to Support
### 1. Support BitNet for Very Weak Machines
- Reference: https://www.geektime.co.il/pc-with-pentium-ii-128mb-ram-and-windows-98-ran-llm/

### 2. *** CLI should notify the user when the server is ready (consider the async design nature of the server)
### 3. Support Legacy Doc, Xls, Ppt Formats