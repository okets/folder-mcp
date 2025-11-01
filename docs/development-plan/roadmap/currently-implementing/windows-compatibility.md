**WINDOWS TESTING INSTRUCTIONS FOR RTX 3080 LAPTOP GPU**
----------------------------------------------------------indexing tests-----------------------------------------------------------------------
This is a smoke test I used on my macOS machine to verify all models are downloading properly and functioning as expected. it runs perfectly on macOS.
This test covers all 5 of our curated models, both ONNX CPU models and Python GPU models.
I created similar test folders in the tmp/ folder in our project directory of this windows machine.
please read the scripts in the TMOAT folder to see how to connect to the daemon's websocket interface and add/remove folders from the indexing list.
1. run the daemon in the background using 'npm run daemon:restart'
2. using the websocket interface, add the smoke test folders one by one, each with it's respective model.
3. make sure downloading and indexing works properly for all 5 models.
if anything fails, fix the root cause and start the entire process over again.
note: the paths below are for macOS, please adapt them to windows path: e.g. C:\ThinkingHomes\folder-mcp\tmp\cpu-xenova-multilingual-e5-large
────────────────────────────────────────────────────────────────────
                     ***Smoke test***
────────────────────────────────────────────────────────────────────
There are our currently 5 indexed folders, one for each curated model.
DB path example: tmp/cpu-xenova-multilingual-e5-large/.folder-mcp/embeddings.db
the folders are:
/Users/hanan/Projects/folder-mcp/tmp/cpu-xenova-multilingual-e5-large
/Users/hanan/Projects/folder-mcp/tmp/cpu-xenova-multilingual-e5-small
/Users/hanan/Projects/folder-mcp/tmp/gpu-bge-m3
/Users/hanan/Projects/folder-mcp/tmp/gpu-minilm-l12-fast
/Users/hanan/Projects/folder-mcp/tmp/gpu-xenova-multilingual-e5-large
Run the test routine to trigger re-indexing: 
1. for each of our indexed folders, remove the .folder-mcp folder we created that contains our database files.
2. kill any running daemon and run a new instance of our daemon in the background using this single command 'npm run daemon:restart'
3. read the daemon logs, wait for all folders to index fully, check the databases, see that we managed to index all 5 folders one by one successfully.

Note: the full test might take a while, don't give up, sleep for 2 minutes between each progress check.
-----------------------------------------------------------------data quality tests----------------------------------------------------------------
Now that we are sure that all models are downloading and indexing properly, let's test that the files are being indexed properly in the databases.
1. write a script to query the tables of the 5 databases and see that all the tables including the vec0 tables containg the correct information. including metadata, indexing status, chunks, extracted semantic data and also embeddings.
to query a vec table, you need to use special libraries to query it, use the same as we use in our codebase.

-----------------------------------------------------------------query tests-----------------------------------------------------------------------
Now that we are sure that all models are downloading and indexing properly, let's test that querying works as expected. when I say "query" I mean use direct mcp client calls using the folder-mcp server as the mcp server.
1. help me setup an agent-to-endpoint test where you use the folder-mcp mcp server to query each of the indexed folders for known content.
add folder-mcp as an mcp server tool.
2. query each of the indexed folders for content and see if the expected results are returned. (quality of results is not important at this stage, just that something is returned)
3. add our project's docs folder as an indexed folder using the websocket interface.
4. query the docs folder for known content and see if the expected results are returned. check the quality of results as well.
