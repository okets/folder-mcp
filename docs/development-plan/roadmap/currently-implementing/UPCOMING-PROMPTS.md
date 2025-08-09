**THIS FILE IS WHERE I STACK MY UPCOMING PROMPTS**

***after indexing process is perfected, I want to work on the available models lists:***
- I want to discuss the list of sentence transformers we are about to offer. We need to list existing ollama sentence transformers the user might have installed.
As for our python offerings, I want to offer few, but I don’t want to download all of them, just cache them as they first download.
- Validation error on the FMDM when a chosen model was deleted (llama only our models can be re-downloaded).

- I want to discuss multiple systems for embeddings support, Ollama/folder-mcp python/transformers.js


***TUI Visual Bugs***
1. we have a bug in the first run wizard. esc button will not let you exit the program and the "cancel" button as well. you must do a ctrl+c to actually exit. let's exit cleanly in these two actions please. ->[Image #1](stuck pressing esc trying to get back to the command line)
2. when exiting the main screen tui, this message appears above the command line ->[Image #2] the daemon is running and it might confuse the user to think that exiting the TUI means killing the folder-mcp service as well.      