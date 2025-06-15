/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobufModule from "protobufjs/minimal.js";
const $protobuf = $protobufModule.default;

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const folder_mcp = $root.folder_mcp = (() => {

    /**
     * Namespace folder_mcp.
     * @exports folder_mcp
     * @namespace
     */
    const folder_mcp = {};

    /**
     * DocumentType enum.
     * @name folder_mcp.DocumentType
     * @enum {number}
     * @property {number} DOCUMENT_TYPE_UNSPECIFIED=0 DOCUMENT_TYPE_UNSPECIFIED value
     * @property {number} DOCUMENT_TYPE_PDF=1 DOCUMENT_TYPE_PDF value
     * @property {number} DOCUMENT_TYPE_DOCX=2 DOCUMENT_TYPE_DOCX value
     * @property {number} DOCUMENT_TYPE_DOC=3 DOCUMENT_TYPE_DOC value
     * @property {number} DOCUMENT_TYPE_XLSX=4 DOCUMENT_TYPE_XLSX value
     * @property {number} DOCUMENT_TYPE_XLS=5 DOCUMENT_TYPE_XLS value
     * @property {number} DOCUMENT_TYPE_PPTX=6 DOCUMENT_TYPE_PPTX value
     * @property {number} DOCUMENT_TYPE_PPT=7 DOCUMENT_TYPE_PPT value
     * @property {number} DOCUMENT_TYPE_TXT=8 DOCUMENT_TYPE_TXT value
     * @property {number} DOCUMENT_TYPE_MD=9 DOCUMENT_TYPE_MD value
     * @property {number} DOCUMENT_TYPE_CSV=10 DOCUMENT_TYPE_CSV value
     * @property {number} DOCUMENT_TYPE_RTF=11 DOCUMENT_TYPE_RTF value
     * @property {number} DOCUMENT_TYPE_ODT=12 DOCUMENT_TYPE_ODT value
     * @property {number} DOCUMENT_TYPE_ODS=13 DOCUMENT_TYPE_ODS value
     * @property {number} DOCUMENT_TYPE_ODP=14 DOCUMENT_TYPE_ODP value
     * @property {number} DOCUMENT_TYPE_HTML=15 DOCUMENT_TYPE_HTML value
     * @property {number} DOCUMENT_TYPE_XML=16 DOCUMENT_TYPE_XML value
     */
    folder_mcp.DocumentType = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "DOCUMENT_TYPE_UNSPECIFIED"] = 0;
        values[valuesById[1] = "DOCUMENT_TYPE_PDF"] = 1;
        values[valuesById[2] = "DOCUMENT_TYPE_DOCX"] = 2;
        values[valuesById[3] = "DOCUMENT_TYPE_DOC"] = 3;
        values[valuesById[4] = "DOCUMENT_TYPE_XLSX"] = 4;
        values[valuesById[5] = "DOCUMENT_TYPE_XLS"] = 5;
        values[valuesById[6] = "DOCUMENT_TYPE_PPTX"] = 6;
        values[valuesById[7] = "DOCUMENT_TYPE_PPT"] = 7;
        values[valuesById[8] = "DOCUMENT_TYPE_TXT"] = 8;
        values[valuesById[9] = "DOCUMENT_TYPE_MD"] = 9;
        values[valuesById[10] = "DOCUMENT_TYPE_CSV"] = 10;
        values[valuesById[11] = "DOCUMENT_TYPE_RTF"] = 11;
        values[valuesById[12] = "DOCUMENT_TYPE_ODT"] = 12;
        values[valuesById[13] = "DOCUMENT_TYPE_ODS"] = 13;
        values[valuesById[14] = "DOCUMENT_TYPE_ODP"] = 14;
        values[valuesById[15] = "DOCUMENT_TYPE_HTML"] = 15;
        values[valuesById[16] = "DOCUMENT_TYPE_XML"] = 16;
        return values;
    })();

    /**
     * SummaryMode enum.
     * @name folder_mcp.SummaryMode
     * @enum {number}
     * @property {number} SUMMARY_MODE_UNSPECIFIED=0 SUMMARY_MODE_UNSPECIFIED value
     * @property {number} SUMMARY_MODE_BRIEF=1 SUMMARY_MODE_BRIEF value
     * @property {number} SUMMARY_MODE_DETAILED=2 SUMMARY_MODE_DETAILED value
     * @property {number} SUMMARY_MODE_EXECUTIVE=3 SUMMARY_MODE_EXECUTIVE value
     * @property {number} SUMMARY_MODE_TECHNICAL=4 SUMMARY_MODE_TECHNICAL value
     */
    folder_mcp.SummaryMode = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "SUMMARY_MODE_UNSPECIFIED"] = 0;
        values[valuesById[1] = "SUMMARY_MODE_BRIEF"] = 1;
        values[valuesById[2] = "SUMMARY_MODE_DETAILED"] = 2;
        values[valuesById[3] = "SUMMARY_MODE_EXECUTIVE"] = 3;
        values[valuesById[4] = "SUMMARY_MODE_TECHNICAL"] = 4;
        return values;
    })();

    /**
     * IngestStatus enum.
     * @name folder_mcp.IngestStatus
     * @enum {number}
     * @property {number} INGEST_STATUS_UNSPECIFIED=0 INGEST_STATUS_UNSPECIFIED value
     * @property {number} INGEST_STATUS_PENDING=1 INGEST_STATUS_PENDING value
     * @property {number} INGEST_STATUS_PROCESSING=2 INGEST_STATUS_PROCESSING value
     * @property {number} INGEST_STATUS_COMPLETED=3 INGEST_STATUS_COMPLETED value
     * @property {number} INGEST_STATUS_FAILED=4 INGEST_STATUS_FAILED value
     * @property {number} INGEST_STATUS_CANCELLED=5 INGEST_STATUS_CANCELLED value
     * @property {number} INGEST_STATUS_RETRY=6 INGEST_STATUS_RETRY value
     */
    folder_mcp.IngestStatus = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "INGEST_STATUS_UNSPECIFIED"] = 0;
        values[valuesById[1] = "INGEST_STATUS_PENDING"] = 1;
        values[valuesById[2] = "INGEST_STATUS_PROCESSING"] = 2;
        values[valuesById[3] = "INGEST_STATUS_COMPLETED"] = 3;
        values[valuesById[4] = "INGEST_STATUS_FAILED"] = 4;
        values[valuesById[5] = "INGEST_STATUS_CANCELLED"] = 5;
        values[valuesById[6] = "INGEST_STATUS_RETRY"] = 6;
        return values;
    })();

    /**
     * Priority enum.
     * @name folder_mcp.Priority
     * @enum {number}
     * @property {number} PRIORITY_UNSPECIFIED=0 PRIORITY_UNSPECIFIED value
     * @property {number} PRIORITY_LOW=1 PRIORITY_LOW value
     * @property {number} PRIORITY_NORMAL=2 PRIORITY_NORMAL value
     * @property {number} PRIORITY_HIGH=3 PRIORITY_HIGH value
     * @property {number} PRIORITY_URGENT=4 PRIORITY_URGENT value
     */
    folder_mcp.Priority = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "PRIORITY_UNSPECIFIED"] = 0;
        values[valuesById[1] = "PRIORITY_LOW"] = 1;
        values[valuesById[2] = "PRIORITY_NORMAL"] = 2;
        values[valuesById[3] = "PRIORITY_HIGH"] = 3;
        values[valuesById[4] = "PRIORITY_URGENT"] = 4;
        return values;
    })();

    /**
     * ErrorCode enum.
     * @name folder_mcp.ErrorCode
     * @enum {number}
     * @property {number} ERROR_CODE_UNSPECIFIED=0 ERROR_CODE_UNSPECIFIED value
     * @property {number} ERROR_CODE_NOT_FOUND=1 ERROR_CODE_NOT_FOUND value
     * @property {number} ERROR_CODE_PERMISSION_DENIED=2 ERROR_CODE_PERMISSION_DENIED value
     * @property {number} ERROR_CODE_INVALID_REQUEST=3 ERROR_CODE_INVALID_REQUEST value
     * @property {number} ERROR_CODE_RESOURCE_EXHAUSTED=4 ERROR_CODE_RESOURCE_EXHAUSTED value
     * @property {number} ERROR_CODE_INTERNAL_ERROR=5 ERROR_CODE_INTERNAL_ERROR value
     * @property {number} ERROR_CODE_UNAVAILABLE=6 ERROR_CODE_UNAVAILABLE value
     * @property {number} ERROR_CODE_TIMEOUT=7 ERROR_CODE_TIMEOUT value
     * @property {number} ERROR_CODE_ALREADY_EXISTS=8 ERROR_CODE_ALREADY_EXISTS value
     * @property {number} ERROR_CODE_PRECONDITION_FAILED=9 ERROR_CODE_PRECONDITION_FAILED value
     * @property {number} ERROR_CODE_OUT_OF_RANGE=10 ERROR_CODE_OUT_OF_RANGE value
     */
    folder_mcp.ErrorCode = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "ERROR_CODE_UNSPECIFIED"] = 0;
        values[valuesById[1] = "ERROR_CODE_NOT_FOUND"] = 1;
        values[valuesById[2] = "ERROR_CODE_PERMISSION_DENIED"] = 2;
        values[valuesById[3] = "ERROR_CODE_INVALID_REQUEST"] = 3;
        values[valuesById[4] = "ERROR_CODE_RESOURCE_EXHAUSTED"] = 4;
        values[valuesById[5] = "ERROR_CODE_INTERNAL_ERROR"] = 5;
        values[valuesById[6] = "ERROR_CODE_UNAVAILABLE"] = 6;
        values[valuesById[7] = "ERROR_CODE_TIMEOUT"] = 7;
        values[valuesById[8] = "ERROR_CODE_ALREADY_EXISTS"] = 8;
        values[valuesById[9] = "ERROR_CODE_PRECONDITION_FAILED"] = 9;
        values[valuesById[10] = "ERROR_CODE_OUT_OF_RANGE"] = 10;
        return values;
    })();

    /**
     * CellDataType enum.
     * @name folder_mcp.CellDataType
     * @enum {number}
     * @property {number} CELL_DATA_TYPE_UNSPECIFIED=0 CELL_DATA_TYPE_UNSPECIFIED value
     * @property {number} CELL_DATA_TYPE_TEXT=1 CELL_DATA_TYPE_TEXT value
     * @property {number} CELL_DATA_TYPE_NUMBER=2 CELL_DATA_TYPE_NUMBER value
     * @property {number} CELL_DATA_TYPE_DATE=3 CELL_DATA_TYPE_DATE value
     * @property {number} CELL_DATA_TYPE_BOOLEAN=4 CELL_DATA_TYPE_BOOLEAN value
     * @property {number} CELL_DATA_TYPE_FORMULA=5 CELL_DATA_TYPE_FORMULA value
     * @property {number} CELL_DATA_TYPE_ERROR=6 CELL_DATA_TYPE_ERROR value
     */
    folder_mcp.CellDataType = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "CELL_DATA_TYPE_UNSPECIFIED"] = 0;
        values[valuesById[1] = "CELL_DATA_TYPE_TEXT"] = 1;
        values[valuesById[2] = "CELL_DATA_TYPE_NUMBER"] = 2;
        values[valuesById[3] = "CELL_DATA_TYPE_DATE"] = 3;
        values[valuesById[4] = "CELL_DATA_TYPE_BOOLEAN"] = 4;
        values[valuesById[5] = "CELL_DATA_TYPE_FORMULA"] = 5;
        values[valuesById[6] = "CELL_DATA_TYPE_ERROR"] = 6;
        return values;
    })();

    folder_mcp.FolderMCP = (function() {

        /**
         * Constructs a new FolderMCP service.
         * @memberof folder_mcp
         * @classdesc Represents a FolderMCP
         * @extends $protobuf.rpc.Service
         * @constructor
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         */
        function FolderMCP(rpcImpl, requestDelimited, responseDelimited) {
            $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
        }

        (FolderMCP.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = FolderMCP;

        /**
         * Creates new FolderMCP service using the specified rpc implementation.
         * @function create
         * @memberof folder_mcp.FolderMCP
         * @static
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         * @returns {FolderMCP} RPC service. Useful where requests and/or responses are streamed.
         */
        FolderMCP.create = function create(rpcImpl, requestDelimited, responseDelimited) {
            return new this(rpcImpl, requestDelimited, responseDelimited);
        };

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#searchDocs}.
         * @memberof folder_mcp.FolderMCP
         * @typedef SearchDocsCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {folder_mcp.SearchDocsResponse} [response] SearchDocsResponse
         */

        /**
         * Calls SearchDocs.
         * @function searchDocs
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.ISearchDocsRequest} request SearchDocsRequest message or plain object
         * @param {folder_mcp.FolderMCP.SearchDocsCallback} callback Node-style callback called with the error, if any, and SearchDocsResponse
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(FolderMCP.prototype.searchDocs = function searchDocs(request, callback) {
            return this.rpcCall(searchDocs, $root.folder_mcp.SearchDocsRequest, $root.folder_mcp.SearchDocsResponse, request, callback);
        }, "name", { value: "SearchDocs" });

        /**
         * Calls SearchDocs.
         * @function searchDocs
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.ISearchDocsRequest} request SearchDocsRequest message or plain object
         * @returns {Promise<folder_mcp.SearchDocsResponse>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#searchChunks}.
         * @memberof folder_mcp.FolderMCP
         * @typedef SearchChunksCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {folder_mcp.SearchChunksResponse} [response] SearchChunksResponse
         */

        /**
         * Calls SearchChunks.
         * @function searchChunks
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.ISearchChunksRequest} request SearchChunksRequest message or plain object
         * @param {folder_mcp.FolderMCP.SearchChunksCallback} callback Node-style callback called with the error, if any, and SearchChunksResponse
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(FolderMCP.prototype.searchChunks = function searchChunks(request, callback) {
            return this.rpcCall(searchChunks, $root.folder_mcp.SearchChunksRequest, $root.folder_mcp.SearchChunksResponse, request, callback);
        }, "name", { value: "SearchChunks" });

        /**
         * Calls SearchChunks.
         * @function searchChunks
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.ISearchChunksRequest} request SearchChunksRequest message or plain object
         * @returns {Promise<folder_mcp.SearchChunksResponse>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#listFolders}.
         * @memberof folder_mcp.FolderMCP
         * @typedef ListFoldersCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {folder_mcp.ListFoldersResponse} [response] ListFoldersResponse
         */

        /**
         * Calls ListFolders.
         * @function listFolders
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IListFoldersRequest} request ListFoldersRequest message or plain object
         * @param {folder_mcp.FolderMCP.ListFoldersCallback} callback Node-style callback called with the error, if any, and ListFoldersResponse
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(FolderMCP.prototype.listFolders = function listFolders(request, callback) {
            return this.rpcCall(listFolders, $root.folder_mcp.ListFoldersRequest, $root.folder_mcp.ListFoldersResponse, request, callback);
        }, "name", { value: "ListFolders" });

        /**
         * Calls ListFolders.
         * @function listFolders
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IListFoldersRequest} request ListFoldersRequest message or plain object
         * @returns {Promise<folder_mcp.ListFoldersResponse>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#listDocumentsInFolder}.
         * @memberof folder_mcp.FolderMCP
         * @typedef ListDocumentsInFolderCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {folder_mcp.ListDocumentsInFolderResponse} [response] ListDocumentsInFolderResponse
         */

        /**
         * Calls ListDocumentsInFolder.
         * @function listDocumentsInFolder
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IListDocumentsInFolderRequest} request ListDocumentsInFolderRequest message or plain object
         * @param {folder_mcp.FolderMCP.ListDocumentsInFolderCallback} callback Node-style callback called with the error, if any, and ListDocumentsInFolderResponse
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(FolderMCP.prototype.listDocumentsInFolder = function listDocumentsInFolder(request, callback) {
            return this.rpcCall(listDocumentsInFolder, $root.folder_mcp.ListDocumentsInFolderRequest, $root.folder_mcp.ListDocumentsInFolderResponse, request, callback);
        }, "name", { value: "ListDocumentsInFolder" });

        /**
         * Calls ListDocumentsInFolder.
         * @function listDocumentsInFolder
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IListDocumentsInFolderRequest} request ListDocumentsInFolderRequest message or plain object
         * @returns {Promise<folder_mcp.ListDocumentsInFolderResponse>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#getDocMetadata}.
         * @memberof folder_mcp.FolderMCP
         * @typedef GetDocMetadataCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {folder_mcp.GetDocMetadataResponse} [response] GetDocMetadataResponse
         */

        /**
         * Calls GetDocMetadata.
         * @function getDocMetadata
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IGetDocMetadataRequest} request GetDocMetadataRequest message or plain object
         * @param {folder_mcp.FolderMCP.GetDocMetadataCallback} callback Node-style callback called with the error, if any, and GetDocMetadataResponse
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(FolderMCP.prototype.getDocMetadata = function getDocMetadata(request, callback) {
            return this.rpcCall(getDocMetadata, $root.folder_mcp.GetDocMetadataRequest, $root.folder_mcp.GetDocMetadataResponse, request, callback);
        }, "name", { value: "GetDocMetadata" });

        /**
         * Calls GetDocMetadata.
         * @function getDocMetadata
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IGetDocMetadataRequest} request GetDocMetadataRequest message or plain object
         * @returns {Promise<folder_mcp.GetDocMetadataResponse>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#downloadDoc}.
         * @memberof folder_mcp.FolderMCP
         * @typedef DownloadDocCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {folder_mcp.DownloadDocResponse} [response] DownloadDocResponse
         */

        /**
         * Calls DownloadDoc.
         * @function downloadDoc
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IDownloadDocRequest} request DownloadDocRequest message or plain object
         * @param {folder_mcp.FolderMCP.DownloadDocCallback} callback Node-style callback called with the error, if any, and DownloadDocResponse
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(FolderMCP.prototype.downloadDoc = function downloadDoc(request, callback) {
            return this.rpcCall(downloadDoc, $root.folder_mcp.DownloadDocRequest, $root.folder_mcp.DownloadDocResponse, request, callback);
        }, "name", { value: "DownloadDoc" });

        /**
         * Calls DownloadDoc.
         * @function downloadDoc
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IDownloadDocRequest} request DownloadDocRequest message or plain object
         * @returns {Promise<folder_mcp.DownloadDocResponse>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#getChunks}.
         * @memberof folder_mcp.FolderMCP
         * @typedef GetChunksCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {folder_mcp.GetChunksResponse} [response] GetChunksResponse
         */

        /**
         * Calls GetChunks.
         * @function getChunks
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IGetChunksRequest} request GetChunksRequest message or plain object
         * @param {folder_mcp.FolderMCP.GetChunksCallback} callback Node-style callback called with the error, if any, and GetChunksResponse
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(FolderMCP.prototype.getChunks = function getChunks(request, callback) {
            return this.rpcCall(getChunks, $root.folder_mcp.GetChunksRequest, $root.folder_mcp.GetChunksResponse, request, callback);
        }, "name", { value: "GetChunks" });

        /**
         * Calls GetChunks.
         * @function getChunks
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IGetChunksRequest} request GetChunksRequest message or plain object
         * @returns {Promise<folder_mcp.GetChunksResponse>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#getDocSummary}.
         * @memberof folder_mcp.FolderMCP
         * @typedef GetDocSummaryCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {folder_mcp.GetDocSummaryResponse} [response] GetDocSummaryResponse
         */

        /**
         * Calls GetDocSummary.
         * @function getDocSummary
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IGetDocSummaryRequest} request GetDocSummaryRequest message or plain object
         * @param {folder_mcp.FolderMCP.GetDocSummaryCallback} callback Node-style callback called with the error, if any, and GetDocSummaryResponse
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(FolderMCP.prototype.getDocSummary = function getDocSummary(request, callback) {
            return this.rpcCall(getDocSummary, $root.folder_mcp.GetDocSummaryRequest, $root.folder_mcp.GetDocSummaryResponse, request, callback);
        }, "name", { value: "GetDocSummary" });

        /**
         * Calls GetDocSummary.
         * @function getDocSummary
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IGetDocSummaryRequest} request GetDocSummaryRequest message or plain object
         * @returns {Promise<folder_mcp.GetDocSummaryResponse>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#batchDocSummary}.
         * @memberof folder_mcp.FolderMCP
         * @typedef BatchDocSummaryCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {folder_mcp.BatchDocSummaryResponse} [response] BatchDocSummaryResponse
         */

        /**
         * Calls BatchDocSummary.
         * @function batchDocSummary
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IBatchDocSummaryRequest} request BatchDocSummaryRequest message or plain object
         * @param {folder_mcp.FolderMCP.BatchDocSummaryCallback} callback Node-style callback called with the error, if any, and BatchDocSummaryResponse
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(FolderMCP.prototype.batchDocSummary = function batchDocSummary(request, callback) {
            return this.rpcCall(batchDocSummary, $root.folder_mcp.BatchDocSummaryRequest, $root.folder_mcp.BatchDocSummaryResponse, request, callback);
        }, "name", { value: "BatchDocSummary" });

        /**
         * Calls BatchDocSummary.
         * @function batchDocSummary
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IBatchDocSummaryRequest} request BatchDocSummaryRequest message or plain object
         * @returns {Promise<folder_mcp.BatchDocSummaryResponse>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#tableQuery}.
         * @memberof folder_mcp.FolderMCP
         * @typedef TableQueryCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {folder_mcp.TableQueryResponse} [response] TableQueryResponse
         */

        /**
         * Calls TableQuery.
         * @function tableQuery
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.ITableQueryRequest} request TableQueryRequest message or plain object
         * @param {folder_mcp.FolderMCP.TableQueryCallback} callback Node-style callback called with the error, if any, and TableQueryResponse
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(FolderMCP.prototype.tableQuery = function tableQuery(request, callback) {
            return this.rpcCall(tableQuery, $root.folder_mcp.TableQueryRequest, $root.folder_mcp.TableQueryResponse, request, callback);
        }, "name", { value: "TableQuery" });

        /**
         * Calls TableQuery.
         * @function tableQuery
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.ITableQueryRequest} request TableQueryRequest message or plain object
         * @returns {Promise<folder_mcp.TableQueryResponse>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#ingestStatus}.
         * @memberof folder_mcp.FolderMCP
         * @typedef IngestStatusCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {folder_mcp.IngestStatusResponse} [response] IngestStatusResponse
         */

        /**
         * Calls IngestStatus.
         * @function ingestStatus
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IIngestStatusRequest} request IngestStatusRequest message or plain object
         * @param {folder_mcp.FolderMCP.IngestStatusCallback} callback Node-style callback called with the error, if any, and IngestStatusResponse
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(FolderMCP.prototype.ingestStatus = function ingestStatus(request, callback) {
            return this.rpcCall(ingestStatus, $root.folder_mcp.IngestStatusRequest, $root.folder_mcp.IngestStatusResponse, request, callback);
        }, "name", { value: "IngestStatus" });

        /**
         * Calls IngestStatus.
         * @function ingestStatus
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IIngestStatusRequest} request IngestStatusRequest message or plain object
         * @returns {Promise<folder_mcp.IngestStatusResponse>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#refreshDoc}.
         * @memberof folder_mcp.FolderMCP
         * @typedef RefreshDocCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {folder_mcp.RefreshDocResponse} [response] RefreshDocResponse
         */

        /**
         * Calls RefreshDoc.
         * @function refreshDoc
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IRefreshDocRequest} request RefreshDocRequest message or plain object
         * @param {folder_mcp.FolderMCP.RefreshDocCallback} callback Node-style callback called with the error, if any, and RefreshDocResponse
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(FolderMCP.prototype.refreshDoc = function refreshDoc(request, callback) {
            return this.rpcCall(refreshDoc, $root.folder_mcp.RefreshDocRequest, $root.folder_mcp.RefreshDocResponse, request, callback);
        }, "name", { value: "RefreshDoc" });

        /**
         * Calls RefreshDoc.
         * @function refreshDoc
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IRefreshDocRequest} request RefreshDocRequest message or plain object
         * @returns {Promise<folder_mcp.RefreshDocResponse>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#getEmbedding}.
         * @memberof folder_mcp.FolderMCP
         * @typedef GetEmbeddingCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {folder_mcp.GetEmbeddingResponse} [response] GetEmbeddingResponse
         */

        /**
         * Calls GetEmbedding.
         * @function getEmbedding
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IGetEmbeddingRequest} request GetEmbeddingRequest message or plain object
         * @param {folder_mcp.FolderMCP.GetEmbeddingCallback} callback Node-style callback called with the error, if any, and GetEmbeddingResponse
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(FolderMCP.prototype.getEmbedding = function getEmbedding(request, callback) {
            return this.rpcCall(getEmbedding, $root.folder_mcp.GetEmbeddingRequest, $root.folder_mcp.GetEmbeddingResponse, request, callback);
        }, "name", { value: "GetEmbedding" });

        /**
         * Calls GetEmbedding.
         * @function getEmbedding
         * @memberof folder_mcp.FolderMCP
         * @instance
         * @param {folder_mcp.IGetEmbeddingRequest} request GetEmbeddingRequest message or plain object
         * @returns {Promise<folder_mcp.GetEmbeddingResponse>} Promise
         * @variation 2
         */

        return FolderMCP;
    })();

    folder_mcp.SearchDocsRequest = (function() {

        /**
         * Properties of a SearchDocsRequest.
         * @memberof folder_mcp
         * @interface ISearchDocsRequest
         * @property {string|null} [query] SearchDocsRequest query
         * @property {number|null} [topK] SearchDocsRequest topK
         * @property {Array.<folder_mcp.DocumentType>|null} [documentTypes] SearchDocsRequest documentTypes
         * @property {string|null} [dateFrom] SearchDocsRequest dateFrom
         * @property {string|null} [dateTo] SearchDocsRequest dateTo
         * @property {Array.<string>|null} [authors] SearchDocsRequest authors
         * @property {Object.<string,string>|null} [metadataFilters] SearchDocsRequest metadataFilters
         */

        /**
         * Constructs a new SearchDocsRequest.
         * @memberof folder_mcp
         * @classdesc Represents a SearchDocsRequest.
         * @implements ISearchDocsRequest
         * @constructor
         * @param {folder_mcp.ISearchDocsRequest=} [properties] Properties to set
         */
        function SearchDocsRequest(properties) {
            this.documentTypes = [];
            this.authors = [];
            this.metadataFilters = {};
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SearchDocsRequest query.
         * @member {string} query
         * @memberof folder_mcp.SearchDocsRequest
         * @instance
         */
        SearchDocsRequest.prototype.query = "";

        /**
         * SearchDocsRequest topK.
         * @member {number} topK
         * @memberof folder_mcp.SearchDocsRequest
         * @instance
         */
        SearchDocsRequest.prototype.topK = 0;

        /**
         * SearchDocsRequest documentTypes.
         * @member {Array.<folder_mcp.DocumentType>} documentTypes
         * @memberof folder_mcp.SearchDocsRequest
         * @instance
         */
        SearchDocsRequest.prototype.documentTypes = $util.emptyArray;

        /**
         * SearchDocsRequest dateFrom.
         * @member {string} dateFrom
         * @memberof folder_mcp.SearchDocsRequest
         * @instance
         */
        SearchDocsRequest.prototype.dateFrom = "";

        /**
         * SearchDocsRequest dateTo.
         * @member {string} dateTo
         * @memberof folder_mcp.SearchDocsRequest
         * @instance
         */
        SearchDocsRequest.prototype.dateTo = "";

        /**
         * SearchDocsRequest authors.
         * @member {Array.<string>} authors
         * @memberof folder_mcp.SearchDocsRequest
         * @instance
         */
        SearchDocsRequest.prototype.authors = $util.emptyArray;

        /**
         * SearchDocsRequest metadataFilters.
         * @member {Object.<string,string>} metadataFilters
         * @memberof folder_mcp.SearchDocsRequest
         * @instance
         */
        SearchDocsRequest.prototype.metadataFilters = $util.emptyObject;

        /**
         * Creates a new SearchDocsRequest instance using the specified properties.
         * @function create
         * @memberof folder_mcp.SearchDocsRequest
         * @static
         * @param {folder_mcp.ISearchDocsRequest=} [properties] Properties to set
         * @returns {folder_mcp.SearchDocsRequest} SearchDocsRequest instance
         */
        SearchDocsRequest.create = function create(properties) {
            return new SearchDocsRequest(properties);
        };

        /**
         * Encodes the specified SearchDocsRequest message. Does not implicitly {@link folder_mcp.SearchDocsRequest.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.SearchDocsRequest
         * @static
         * @param {folder_mcp.ISearchDocsRequest} message SearchDocsRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SearchDocsRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.query != null && Object.hasOwnProperty.call(message, "query"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.query);
            if (message.topK != null && Object.hasOwnProperty.call(message, "topK"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.topK);
            if (message.documentTypes != null && message.documentTypes.length) {
                writer.uint32(/* id 3, wireType 2 =*/26).fork();
                for (let i = 0; i < message.documentTypes.length; ++i)
                    writer.int32(message.documentTypes[i]);
                writer.ldelim();
            }
            if (message.dateFrom != null && Object.hasOwnProperty.call(message, "dateFrom"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.dateFrom);
            if (message.dateTo != null && Object.hasOwnProperty.call(message, "dateTo"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.dateTo);
            if (message.authors != null && message.authors.length)
                for (let i = 0; i < message.authors.length; ++i)
                    writer.uint32(/* id 6, wireType 2 =*/50).string(message.authors[i]);
            if (message.metadataFilters != null && Object.hasOwnProperty.call(message, "metadataFilters"))
                for (let keys = Object.keys(message.metadataFilters), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 7, wireType 2 =*/58).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 2 =*/18).string(message.metadataFilters[keys[i]]).ldelim();
            return writer;
        };

        /**
         * Encodes the specified SearchDocsRequest message, length delimited. Does not implicitly {@link folder_mcp.SearchDocsRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.SearchDocsRequest
         * @static
         * @param {folder_mcp.ISearchDocsRequest} message SearchDocsRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SearchDocsRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SearchDocsRequest message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.SearchDocsRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.SearchDocsRequest} SearchDocsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SearchDocsRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.SearchDocsRequest(), key, value;
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.query = reader.string();
                        break;
                    }
                case 2: {
                        message.topK = reader.int32();
                        break;
                    }
                case 3: {
                        if (!(message.documentTypes && message.documentTypes.length))
                            message.documentTypes = [];
                        if ((tag & 7) === 2) {
                            let end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.documentTypes.push(reader.int32());
                        } else
                            message.documentTypes.push(reader.int32());
                        break;
                    }
                case 4: {
                        message.dateFrom = reader.string();
                        break;
                    }
                case 5: {
                        message.dateTo = reader.string();
                        break;
                    }
                case 6: {
                        if (!(message.authors && message.authors.length))
                            message.authors = [];
                        message.authors.push(reader.string());
                        break;
                    }
                case 7: {
                        if (message.metadataFilters === $util.emptyObject)
                            message.metadataFilters = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = "";
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.string();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.metadataFilters[key] = value;
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SearchDocsRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.SearchDocsRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.SearchDocsRequest} SearchDocsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SearchDocsRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SearchDocsRequest message.
         * @function verify
         * @memberof folder_mcp.SearchDocsRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SearchDocsRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.query != null && message.hasOwnProperty("query"))
                if (!$util.isString(message.query))
                    return "query: string expected";
            if (message.topK != null && message.hasOwnProperty("topK"))
                if (!$util.isInteger(message.topK))
                    return "topK: integer expected";
            if (message.documentTypes != null && message.hasOwnProperty("documentTypes")) {
                if (!Array.isArray(message.documentTypes))
                    return "documentTypes: array expected";
                for (let i = 0; i < message.documentTypes.length; ++i)
                    switch (message.documentTypes[i]) {
                    default:
                        return "documentTypes: enum value[] expected";
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                    case 7:
                    case 8:
                    case 9:
                    case 10:
                    case 11:
                    case 12:
                    case 13:
                    case 14:
                    case 15:
                    case 16:
                        break;
                    }
            }
            if (message.dateFrom != null && message.hasOwnProperty("dateFrom"))
                if (!$util.isString(message.dateFrom))
                    return "dateFrom: string expected";
            if (message.dateTo != null && message.hasOwnProperty("dateTo"))
                if (!$util.isString(message.dateTo))
                    return "dateTo: string expected";
            if (message.authors != null && message.hasOwnProperty("authors")) {
                if (!Array.isArray(message.authors))
                    return "authors: array expected";
                for (let i = 0; i < message.authors.length; ++i)
                    if (!$util.isString(message.authors[i]))
                        return "authors: string[] expected";
            }
            if (message.metadataFilters != null && message.hasOwnProperty("metadataFilters")) {
                if (!$util.isObject(message.metadataFilters))
                    return "metadataFilters: object expected";
                let key = Object.keys(message.metadataFilters);
                for (let i = 0; i < key.length; ++i)
                    if (!$util.isString(message.metadataFilters[key[i]]))
                        return "metadataFilters: string{k:string} expected";
            }
            return null;
        };

        /**
         * Creates a SearchDocsRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.SearchDocsRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.SearchDocsRequest} SearchDocsRequest
         */
        SearchDocsRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.SearchDocsRequest)
                return object;
            let message = new $root.folder_mcp.SearchDocsRequest();
            if (object.query != null)
                message.query = String(object.query);
            if (object.topK != null)
                message.topK = object.topK | 0;
            if (object.documentTypes) {
                if (!Array.isArray(object.documentTypes))
                    throw TypeError(".folder_mcp.SearchDocsRequest.documentTypes: array expected");
                message.documentTypes = [];
                for (let i = 0; i < object.documentTypes.length; ++i)
                    switch (object.documentTypes[i]) {
                    default:
                        if (typeof object.documentTypes[i] === "number") {
                            message.documentTypes[i] = object.documentTypes[i];
                            break;
                        }
                    case "DOCUMENT_TYPE_UNSPECIFIED":
                    case 0:
                        message.documentTypes[i] = 0;
                        break;
                    case "DOCUMENT_TYPE_PDF":
                    case 1:
                        message.documentTypes[i] = 1;
                        break;
                    case "DOCUMENT_TYPE_DOCX":
                    case 2:
                        message.documentTypes[i] = 2;
                        break;
                    case "DOCUMENT_TYPE_DOC":
                    case 3:
                        message.documentTypes[i] = 3;
                        break;
                    case "DOCUMENT_TYPE_XLSX":
                    case 4:
                        message.documentTypes[i] = 4;
                        break;
                    case "DOCUMENT_TYPE_XLS":
                    case 5:
                        message.documentTypes[i] = 5;
                        break;
                    case "DOCUMENT_TYPE_PPTX":
                    case 6:
                        message.documentTypes[i] = 6;
                        break;
                    case "DOCUMENT_TYPE_PPT":
                    case 7:
                        message.documentTypes[i] = 7;
                        break;
                    case "DOCUMENT_TYPE_TXT":
                    case 8:
                        message.documentTypes[i] = 8;
                        break;
                    case "DOCUMENT_TYPE_MD":
                    case 9:
                        message.documentTypes[i] = 9;
                        break;
                    case "DOCUMENT_TYPE_CSV":
                    case 10:
                        message.documentTypes[i] = 10;
                        break;
                    case "DOCUMENT_TYPE_RTF":
                    case 11:
                        message.documentTypes[i] = 11;
                        break;
                    case "DOCUMENT_TYPE_ODT":
                    case 12:
                        message.documentTypes[i] = 12;
                        break;
                    case "DOCUMENT_TYPE_ODS":
                    case 13:
                        message.documentTypes[i] = 13;
                        break;
                    case "DOCUMENT_TYPE_ODP":
                    case 14:
                        message.documentTypes[i] = 14;
                        break;
                    case "DOCUMENT_TYPE_HTML":
                    case 15:
                        message.documentTypes[i] = 15;
                        break;
                    case "DOCUMENT_TYPE_XML":
                    case 16:
                        message.documentTypes[i] = 16;
                        break;
                    }
            }
            if (object.dateFrom != null)
                message.dateFrom = String(object.dateFrom);
            if (object.dateTo != null)
                message.dateTo = String(object.dateTo);
            if (object.authors) {
                if (!Array.isArray(object.authors))
                    throw TypeError(".folder_mcp.SearchDocsRequest.authors: array expected");
                message.authors = [];
                for (let i = 0; i < object.authors.length; ++i)
                    message.authors[i] = String(object.authors[i]);
            }
            if (object.metadataFilters) {
                if (typeof object.metadataFilters !== "object")
                    throw TypeError(".folder_mcp.SearchDocsRequest.metadataFilters: object expected");
                message.metadataFilters = {};
                for (let keys = Object.keys(object.metadataFilters), i = 0; i < keys.length; ++i)
                    message.metadataFilters[keys[i]] = String(object.metadataFilters[keys[i]]);
            }
            return message;
        };

        /**
         * Creates a plain object from a SearchDocsRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.SearchDocsRequest
         * @static
         * @param {folder_mcp.SearchDocsRequest} message SearchDocsRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SearchDocsRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults) {
                object.documentTypes = [];
                object.authors = [];
            }
            if (options.objects || options.defaults)
                object.metadataFilters = {};
            if (options.defaults) {
                object.query = "";
                object.topK = 0;
                object.dateFrom = "";
                object.dateTo = "";
            }
            if (message.query != null && message.hasOwnProperty("query"))
                object.query = message.query;
            if (message.topK != null && message.hasOwnProperty("topK"))
                object.topK = message.topK;
            if (message.documentTypes && message.documentTypes.length) {
                object.documentTypes = [];
                for (let j = 0; j < message.documentTypes.length; ++j)
                    object.documentTypes[j] = options.enums === String ? $root.folder_mcp.DocumentType[message.documentTypes[j]] === undefined ? message.documentTypes[j] : $root.folder_mcp.DocumentType[message.documentTypes[j]] : message.documentTypes[j];
            }
            if (message.dateFrom != null && message.hasOwnProperty("dateFrom"))
                object.dateFrom = message.dateFrom;
            if (message.dateTo != null && message.hasOwnProperty("dateTo"))
                object.dateTo = message.dateTo;
            if (message.authors && message.authors.length) {
                object.authors = [];
                for (let j = 0; j < message.authors.length; ++j)
                    object.authors[j] = message.authors[j];
            }
            let keys2;
            if (message.metadataFilters && (keys2 = Object.keys(message.metadataFilters)).length) {
                object.metadataFilters = {};
                for (let j = 0; j < keys2.length; ++j)
                    object.metadataFilters[keys2[j]] = message.metadataFilters[keys2[j]];
            }
            return object;
        };

        /**
         * Converts this SearchDocsRequest to JSON.
         * @function toJSON
         * @memberof folder_mcp.SearchDocsRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SearchDocsRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SearchDocsRequest
         * @function getTypeUrl
         * @memberof folder_mcp.SearchDocsRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SearchDocsRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.SearchDocsRequest";
        };

        return SearchDocsRequest;
    })();

    folder_mcp.SearchDocsResponse = (function() {

        /**
         * Properties of a SearchDocsResponse.
         * @memberof folder_mcp
         * @interface ISearchDocsResponse
         * @property {Array.<folder_mcp.IDocumentResult>|null} [documents] SearchDocsResponse documents
         * @property {number|null} [totalFound] SearchDocsResponse totalFound
         * @property {folder_mcp.ISimilarityScore|null} [maxScore] SearchDocsResponse maxScore
         * @property {string|null} [queryId] SearchDocsResponse queryId
         * @property {folder_mcp.IResponseStatus|null} [status] SearchDocsResponse status
         * @property {folder_mcp.IPaginationInfo|null} [pagination] SearchDocsResponse pagination
         */

        /**
         * Constructs a new SearchDocsResponse.
         * @memberof folder_mcp
         * @classdesc Represents a SearchDocsResponse.
         * @implements ISearchDocsResponse
         * @constructor
         * @param {folder_mcp.ISearchDocsResponse=} [properties] Properties to set
         */
        function SearchDocsResponse(properties) {
            this.documents = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SearchDocsResponse documents.
         * @member {Array.<folder_mcp.IDocumentResult>} documents
         * @memberof folder_mcp.SearchDocsResponse
         * @instance
         */
        SearchDocsResponse.prototype.documents = $util.emptyArray;

        /**
         * SearchDocsResponse totalFound.
         * @member {number} totalFound
         * @memberof folder_mcp.SearchDocsResponse
         * @instance
         */
        SearchDocsResponse.prototype.totalFound = 0;

        /**
         * SearchDocsResponse maxScore.
         * @member {folder_mcp.ISimilarityScore|null|undefined} maxScore
         * @memberof folder_mcp.SearchDocsResponse
         * @instance
         */
        SearchDocsResponse.prototype.maxScore = null;

        /**
         * SearchDocsResponse queryId.
         * @member {string} queryId
         * @memberof folder_mcp.SearchDocsResponse
         * @instance
         */
        SearchDocsResponse.prototype.queryId = "";

        /**
         * SearchDocsResponse status.
         * @member {folder_mcp.IResponseStatus|null|undefined} status
         * @memberof folder_mcp.SearchDocsResponse
         * @instance
         */
        SearchDocsResponse.prototype.status = null;

        /**
         * SearchDocsResponse pagination.
         * @member {folder_mcp.IPaginationInfo|null|undefined} pagination
         * @memberof folder_mcp.SearchDocsResponse
         * @instance
         */
        SearchDocsResponse.prototype.pagination = null;

        /**
         * Creates a new SearchDocsResponse instance using the specified properties.
         * @function create
         * @memberof folder_mcp.SearchDocsResponse
         * @static
         * @param {folder_mcp.ISearchDocsResponse=} [properties] Properties to set
         * @returns {folder_mcp.SearchDocsResponse} SearchDocsResponse instance
         */
        SearchDocsResponse.create = function create(properties) {
            return new SearchDocsResponse(properties);
        };

        /**
         * Encodes the specified SearchDocsResponse message. Does not implicitly {@link folder_mcp.SearchDocsResponse.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.SearchDocsResponse
         * @static
         * @param {folder_mcp.ISearchDocsResponse} message SearchDocsResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SearchDocsResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documents != null && message.documents.length)
                for (let i = 0; i < message.documents.length; ++i)
                    $root.folder_mcp.DocumentResult.encode(message.documents[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.totalFound != null && Object.hasOwnProperty.call(message, "totalFound"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.totalFound);
            if (message.maxScore != null && Object.hasOwnProperty.call(message, "maxScore"))
                $root.folder_mcp.SimilarityScore.encode(message.maxScore, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.queryId != null && Object.hasOwnProperty.call(message, "queryId"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.queryId);
            if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                $root.folder_mcp.ResponseStatus.encode(message.status, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
            if (message.pagination != null && Object.hasOwnProperty.call(message, "pagination"))
                $root.folder_mcp.PaginationInfo.encode(message.pagination, writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified SearchDocsResponse message, length delimited. Does not implicitly {@link folder_mcp.SearchDocsResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.SearchDocsResponse
         * @static
         * @param {folder_mcp.ISearchDocsResponse} message SearchDocsResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SearchDocsResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SearchDocsResponse message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.SearchDocsResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.SearchDocsResponse} SearchDocsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SearchDocsResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.SearchDocsResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.documents && message.documents.length))
                            message.documents = [];
                        message.documents.push($root.folder_mcp.DocumentResult.decode(reader, reader.uint32()));
                        break;
                    }
                case 2: {
                        message.totalFound = reader.int32();
                        break;
                    }
                case 3: {
                        message.maxScore = $root.folder_mcp.SimilarityScore.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.queryId = reader.string();
                        break;
                    }
                case 5: {
                        message.status = $root.folder_mcp.ResponseStatus.decode(reader, reader.uint32());
                        break;
                    }
                case 6: {
                        message.pagination = $root.folder_mcp.PaginationInfo.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SearchDocsResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.SearchDocsResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.SearchDocsResponse} SearchDocsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SearchDocsResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SearchDocsResponse message.
         * @function verify
         * @memberof folder_mcp.SearchDocsResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SearchDocsResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documents != null && message.hasOwnProperty("documents")) {
                if (!Array.isArray(message.documents))
                    return "documents: array expected";
                for (let i = 0; i < message.documents.length; ++i) {
                    let error = $root.folder_mcp.DocumentResult.verify(message.documents[i]);
                    if (error)
                        return "documents." + error;
                }
            }
            if (message.totalFound != null && message.hasOwnProperty("totalFound"))
                if (!$util.isInteger(message.totalFound))
                    return "totalFound: integer expected";
            if (message.maxScore != null && message.hasOwnProperty("maxScore")) {
                let error = $root.folder_mcp.SimilarityScore.verify(message.maxScore);
                if (error)
                    return "maxScore." + error;
            }
            if (message.queryId != null && message.hasOwnProperty("queryId"))
                if (!$util.isString(message.queryId))
                    return "queryId: string expected";
            if (message.status != null && message.hasOwnProperty("status")) {
                let error = $root.folder_mcp.ResponseStatus.verify(message.status);
                if (error)
                    return "status." + error;
            }
            if (message.pagination != null && message.hasOwnProperty("pagination")) {
                let error = $root.folder_mcp.PaginationInfo.verify(message.pagination);
                if (error)
                    return "pagination." + error;
            }
            return null;
        };

        /**
         * Creates a SearchDocsResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.SearchDocsResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.SearchDocsResponse} SearchDocsResponse
         */
        SearchDocsResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.SearchDocsResponse)
                return object;
            let message = new $root.folder_mcp.SearchDocsResponse();
            if (object.documents) {
                if (!Array.isArray(object.documents))
                    throw TypeError(".folder_mcp.SearchDocsResponse.documents: array expected");
                message.documents = [];
                for (let i = 0; i < object.documents.length; ++i) {
                    if (typeof object.documents[i] !== "object")
                        throw TypeError(".folder_mcp.SearchDocsResponse.documents: object expected");
                    message.documents[i] = $root.folder_mcp.DocumentResult.fromObject(object.documents[i]);
                }
            }
            if (object.totalFound != null)
                message.totalFound = object.totalFound | 0;
            if (object.maxScore != null) {
                if (typeof object.maxScore !== "object")
                    throw TypeError(".folder_mcp.SearchDocsResponse.maxScore: object expected");
                message.maxScore = $root.folder_mcp.SimilarityScore.fromObject(object.maxScore);
            }
            if (object.queryId != null)
                message.queryId = String(object.queryId);
            if (object.status != null) {
                if (typeof object.status !== "object")
                    throw TypeError(".folder_mcp.SearchDocsResponse.status: object expected");
                message.status = $root.folder_mcp.ResponseStatus.fromObject(object.status);
            }
            if (object.pagination != null) {
                if (typeof object.pagination !== "object")
                    throw TypeError(".folder_mcp.SearchDocsResponse.pagination: object expected");
                message.pagination = $root.folder_mcp.PaginationInfo.fromObject(object.pagination);
            }
            return message;
        };

        /**
         * Creates a plain object from a SearchDocsResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.SearchDocsResponse
         * @static
         * @param {folder_mcp.SearchDocsResponse} message SearchDocsResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SearchDocsResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.documents = [];
            if (options.defaults) {
                object.totalFound = 0;
                object.maxScore = null;
                object.queryId = "";
                object.status = null;
                object.pagination = null;
            }
            if (message.documents && message.documents.length) {
                object.documents = [];
                for (let j = 0; j < message.documents.length; ++j)
                    object.documents[j] = $root.folder_mcp.DocumentResult.toObject(message.documents[j], options);
            }
            if (message.totalFound != null && message.hasOwnProperty("totalFound"))
                object.totalFound = message.totalFound;
            if (message.maxScore != null && message.hasOwnProperty("maxScore"))
                object.maxScore = $root.folder_mcp.SimilarityScore.toObject(message.maxScore, options);
            if (message.queryId != null && message.hasOwnProperty("queryId"))
                object.queryId = message.queryId;
            if (message.status != null && message.hasOwnProperty("status"))
                object.status = $root.folder_mcp.ResponseStatus.toObject(message.status, options);
            if (message.pagination != null && message.hasOwnProperty("pagination"))
                object.pagination = $root.folder_mcp.PaginationInfo.toObject(message.pagination, options);
            return object;
        };

        /**
         * Converts this SearchDocsResponse to JSON.
         * @function toJSON
         * @memberof folder_mcp.SearchDocsResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SearchDocsResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SearchDocsResponse
         * @function getTypeUrl
         * @memberof folder_mcp.SearchDocsResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SearchDocsResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.SearchDocsResponse";
        };

        return SearchDocsResponse;
    })();

    folder_mcp.DocumentResult = (function() {

        /**
         * Properties of a DocumentResult.
         * @memberof folder_mcp
         * @interface IDocumentResult
         * @property {string|null} [documentId] DocumentResult documentId
         * @property {string|null} [filePath] DocumentResult filePath
         * @property {string|null} [title] DocumentResult title
         * @property {folder_mcp.ISimilarityScore|null} [similarity] DocumentResult similarity
         * @property {folder_mcp.DocumentType|null} [documentType] DocumentResult documentType
         * @property {number|Long|null} [fileSize] DocumentResult fileSize
         * @property {string|null} [modifiedDate] DocumentResult modifiedDate
         * @property {Array.<folder_mcp.IAuthor>|null} [authors] DocumentResult authors
         * @property {string|null} [snippet] DocumentResult snippet
         * @property {folder_mcp.IMetadata|null} [metadata] DocumentResult metadata
         */

        /**
         * Constructs a new DocumentResult.
         * @memberof folder_mcp
         * @classdesc Represents a DocumentResult.
         * @implements IDocumentResult
         * @constructor
         * @param {folder_mcp.IDocumentResult=} [properties] Properties to set
         */
        function DocumentResult(properties) {
            this.authors = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DocumentResult documentId.
         * @member {string} documentId
         * @memberof folder_mcp.DocumentResult
         * @instance
         */
        DocumentResult.prototype.documentId = "";

        /**
         * DocumentResult filePath.
         * @member {string} filePath
         * @memberof folder_mcp.DocumentResult
         * @instance
         */
        DocumentResult.prototype.filePath = "";

        /**
         * DocumentResult title.
         * @member {string} title
         * @memberof folder_mcp.DocumentResult
         * @instance
         */
        DocumentResult.prototype.title = "";

        /**
         * DocumentResult similarity.
         * @member {folder_mcp.ISimilarityScore|null|undefined} similarity
         * @memberof folder_mcp.DocumentResult
         * @instance
         */
        DocumentResult.prototype.similarity = null;

        /**
         * DocumentResult documentType.
         * @member {folder_mcp.DocumentType} documentType
         * @memberof folder_mcp.DocumentResult
         * @instance
         */
        DocumentResult.prototype.documentType = 0;

        /**
         * DocumentResult fileSize.
         * @member {number|Long} fileSize
         * @memberof folder_mcp.DocumentResult
         * @instance
         */
        DocumentResult.prototype.fileSize = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * DocumentResult modifiedDate.
         * @member {string} modifiedDate
         * @memberof folder_mcp.DocumentResult
         * @instance
         */
        DocumentResult.prototype.modifiedDate = "";

        /**
         * DocumentResult authors.
         * @member {Array.<folder_mcp.IAuthor>} authors
         * @memberof folder_mcp.DocumentResult
         * @instance
         */
        DocumentResult.prototype.authors = $util.emptyArray;

        /**
         * DocumentResult snippet.
         * @member {string} snippet
         * @memberof folder_mcp.DocumentResult
         * @instance
         */
        DocumentResult.prototype.snippet = "";

        /**
         * DocumentResult metadata.
         * @member {folder_mcp.IMetadata|null|undefined} metadata
         * @memberof folder_mcp.DocumentResult
         * @instance
         */
        DocumentResult.prototype.metadata = null;

        /**
         * Creates a new DocumentResult instance using the specified properties.
         * @function create
         * @memberof folder_mcp.DocumentResult
         * @static
         * @param {folder_mcp.IDocumentResult=} [properties] Properties to set
         * @returns {folder_mcp.DocumentResult} DocumentResult instance
         */
        DocumentResult.create = function create(properties) {
            return new DocumentResult(properties);
        };

        /**
         * Encodes the specified DocumentResult message. Does not implicitly {@link folder_mcp.DocumentResult.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.DocumentResult
         * @static
         * @param {folder_mcp.IDocumentResult} message DocumentResult message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DocumentResult.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documentId != null && Object.hasOwnProperty.call(message, "documentId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.documentId);
            if (message.filePath != null && Object.hasOwnProperty.call(message, "filePath"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.filePath);
            if (message.title != null && Object.hasOwnProperty.call(message, "title"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.title);
            if (message.similarity != null && Object.hasOwnProperty.call(message, "similarity"))
                $root.folder_mcp.SimilarityScore.encode(message.similarity, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            if (message.documentType != null && Object.hasOwnProperty.call(message, "documentType"))
                writer.uint32(/* id 5, wireType 0 =*/40).int32(message.documentType);
            if (message.fileSize != null && Object.hasOwnProperty.call(message, "fileSize"))
                writer.uint32(/* id 6, wireType 0 =*/48).int64(message.fileSize);
            if (message.modifiedDate != null && Object.hasOwnProperty.call(message, "modifiedDate"))
                writer.uint32(/* id 7, wireType 2 =*/58).string(message.modifiedDate);
            if (message.authors != null && message.authors.length)
                for (let i = 0; i < message.authors.length; ++i)
                    $root.folder_mcp.Author.encode(message.authors[i], writer.uint32(/* id 8, wireType 2 =*/66).fork()).ldelim();
            if (message.snippet != null && Object.hasOwnProperty.call(message, "snippet"))
                writer.uint32(/* id 9, wireType 2 =*/74).string(message.snippet);
            if (message.metadata != null && Object.hasOwnProperty.call(message, "metadata"))
                $root.folder_mcp.Metadata.encode(message.metadata, writer.uint32(/* id 10, wireType 2 =*/82).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified DocumentResult message, length delimited. Does not implicitly {@link folder_mcp.DocumentResult.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.DocumentResult
         * @static
         * @param {folder_mcp.IDocumentResult} message DocumentResult message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DocumentResult.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DocumentResult message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.DocumentResult
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.DocumentResult} DocumentResult
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DocumentResult.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.DocumentResult();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.documentId = reader.string();
                        break;
                    }
                case 2: {
                        message.filePath = reader.string();
                        break;
                    }
                case 3: {
                        message.title = reader.string();
                        break;
                    }
                case 4: {
                        message.similarity = $root.folder_mcp.SimilarityScore.decode(reader, reader.uint32());
                        break;
                    }
                case 5: {
                        message.documentType = reader.int32();
                        break;
                    }
                case 6: {
                        message.fileSize = reader.int64();
                        break;
                    }
                case 7: {
                        message.modifiedDate = reader.string();
                        break;
                    }
                case 8: {
                        if (!(message.authors && message.authors.length))
                            message.authors = [];
                        message.authors.push($root.folder_mcp.Author.decode(reader, reader.uint32()));
                        break;
                    }
                case 9: {
                        message.snippet = reader.string();
                        break;
                    }
                case 10: {
                        message.metadata = $root.folder_mcp.Metadata.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a DocumentResult message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.DocumentResult
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.DocumentResult} DocumentResult
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DocumentResult.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a DocumentResult message.
         * @function verify
         * @memberof folder_mcp.DocumentResult
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        DocumentResult.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                if (!$util.isString(message.documentId))
                    return "documentId: string expected";
            if (message.filePath != null && message.hasOwnProperty("filePath"))
                if (!$util.isString(message.filePath))
                    return "filePath: string expected";
            if (message.title != null && message.hasOwnProperty("title"))
                if (!$util.isString(message.title))
                    return "title: string expected";
            if (message.similarity != null && message.hasOwnProperty("similarity")) {
                let error = $root.folder_mcp.SimilarityScore.verify(message.similarity);
                if (error)
                    return "similarity." + error;
            }
            if (message.documentType != null && message.hasOwnProperty("documentType"))
                switch (message.documentType) {
                default:
                    return "documentType: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                case 8:
                case 9:
                case 10:
                case 11:
                case 12:
                case 13:
                case 14:
                case 15:
                case 16:
                    break;
                }
            if (message.fileSize != null && message.hasOwnProperty("fileSize"))
                if (!$util.isInteger(message.fileSize) && !(message.fileSize && $util.isInteger(message.fileSize.low) && $util.isInteger(message.fileSize.high)))
                    return "fileSize: integer|Long expected";
            if (message.modifiedDate != null && message.hasOwnProperty("modifiedDate"))
                if (!$util.isString(message.modifiedDate))
                    return "modifiedDate: string expected";
            if (message.authors != null && message.hasOwnProperty("authors")) {
                if (!Array.isArray(message.authors))
                    return "authors: array expected";
                for (let i = 0; i < message.authors.length; ++i) {
                    let error = $root.folder_mcp.Author.verify(message.authors[i]);
                    if (error)
                        return "authors." + error;
                }
            }
            if (message.snippet != null && message.hasOwnProperty("snippet"))
                if (!$util.isString(message.snippet))
                    return "snippet: string expected";
            if (message.metadata != null && message.hasOwnProperty("metadata")) {
                let error = $root.folder_mcp.Metadata.verify(message.metadata);
                if (error)
                    return "metadata." + error;
            }
            return null;
        };

        /**
         * Creates a DocumentResult message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.DocumentResult
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.DocumentResult} DocumentResult
         */
        DocumentResult.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.DocumentResult)
                return object;
            let message = new $root.folder_mcp.DocumentResult();
            if (object.documentId != null)
                message.documentId = String(object.documentId);
            if (object.filePath != null)
                message.filePath = String(object.filePath);
            if (object.title != null)
                message.title = String(object.title);
            if (object.similarity != null) {
                if (typeof object.similarity !== "object")
                    throw TypeError(".folder_mcp.DocumentResult.similarity: object expected");
                message.similarity = $root.folder_mcp.SimilarityScore.fromObject(object.similarity);
            }
            switch (object.documentType) {
            default:
                if (typeof object.documentType === "number") {
                    message.documentType = object.documentType;
                    break;
                }
                break;
            case "DOCUMENT_TYPE_UNSPECIFIED":
            case 0:
                message.documentType = 0;
                break;
            case "DOCUMENT_TYPE_PDF":
            case 1:
                message.documentType = 1;
                break;
            case "DOCUMENT_TYPE_DOCX":
            case 2:
                message.documentType = 2;
                break;
            case "DOCUMENT_TYPE_DOC":
            case 3:
                message.documentType = 3;
                break;
            case "DOCUMENT_TYPE_XLSX":
            case 4:
                message.documentType = 4;
                break;
            case "DOCUMENT_TYPE_XLS":
            case 5:
                message.documentType = 5;
                break;
            case "DOCUMENT_TYPE_PPTX":
            case 6:
                message.documentType = 6;
                break;
            case "DOCUMENT_TYPE_PPT":
            case 7:
                message.documentType = 7;
                break;
            case "DOCUMENT_TYPE_TXT":
            case 8:
                message.documentType = 8;
                break;
            case "DOCUMENT_TYPE_MD":
            case 9:
                message.documentType = 9;
                break;
            case "DOCUMENT_TYPE_CSV":
            case 10:
                message.documentType = 10;
                break;
            case "DOCUMENT_TYPE_RTF":
            case 11:
                message.documentType = 11;
                break;
            case "DOCUMENT_TYPE_ODT":
            case 12:
                message.documentType = 12;
                break;
            case "DOCUMENT_TYPE_ODS":
            case 13:
                message.documentType = 13;
                break;
            case "DOCUMENT_TYPE_ODP":
            case 14:
                message.documentType = 14;
                break;
            case "DOCUMENT_TYPE_HTML":
            case 15:
                message.documentType = 15;
                break;
            case "DOCUMENT_TYPE_XML":
            case 16:
                message.documentType = 16;
                break;
            }
            if (object.fileSize != null)
                if ($util.Long)
                    (message.fileSize = $util.Long.fromValue(object.fileSize)).unsigned = false;
                else if (typeof object.fileSize === "string")
                    message.fileSize = parseInt(object.fileSize, 10);
                else if (typeof object.fileSize === "number")
                    message.fileSize = object.fileSize;
                else if (typeof object.fileSize === "object")
                    message.fileSize = new $util.LongBits(object.fileSize.low >>> 0, object.fileSize.high >>> 0).toNumber();
            if (object.modifiedDate != null)
                message.modifiedDate = String(object.modifiedDate);
            if (object.authors) {
                if (!Array.isArray(object.authors))
                    throw TypeError(".folder_mcp.DocumentResult.authors: array expected");
                message.authors = [];
                for (let i = 0; i < object.authors.length; ++i) {
                    if (typeof object.authors[i] !== "object")
                        throw TypeError(".folder_mcp.DocumentResult.authors: object expected");
                    message.authors[i] = $root.folder_mcp.Author.fromObject(object.authors[i]);
                }
            }
            if (object.snippet != null)
                message.snippet = String(object.snippet);
            if (object.metadata != null) {
                if (typeof object.metadata !== "object")
                    throw TypeError(".folder_mcp.DocumentResult.metadata: object expected");
                message.metadata = $root.folder_mcp.Metadata.fromObject(object.metadata);
            }
            return message;
        };

        /**
         * Creates a plain object from a DocumentResult message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.DocumentResult
         * @static
         * @param {folder_mcp.DocumentResult} message DocumentResult
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        DocumentResult.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.authors = [];
            if (options.defaults) {
                object.documentId = "";
                object.filePath = "";
                object.title = "";
                object.similarity = null;
                object.documentType = options.enums === String ? "DOCUMENT_TYPE_UNSPECIFIED" : 0;
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.fileSize = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.fileSize = options.longs === String ? "0" : 0;
                object.modifiedDate = "";
                object.snippet = "";
                object.metadata = null;
            }
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                object.documentId = message.documentId;
            if (message.filePath != null && message.hasOwnProperty("filePath"))
                object.filePath = message.filePath;
            if (message.title != null && message.hasOwnProperty("title"))
                object.title = message.title;
            if (message.similarity != null && message.hasOwnProperty("similarity"))
                object.similarity = $root.folder_mcp.SimilarityScore.toObject(message.similarity, options);
            if (message.documentType != null && message.hasOwnProperty("documentType"))
                object.documentType = options.enums === String ? $root.folder_mcp.DocumentType[message.documentType] === undefined ? message.documentType : $root.folder_mcp.DocumentType[message.documentType] : message.documentType;
            if (message.fileSize != null && message.hasOwnProperty("fileSize"))
                if (typeof message.fileSize === "number")
                    object.fileSize = options.longs === String ? String(message.fileSize) : message.fileSize;
                else
                    object.fileSize = options.longs === String ? $util.Long.prototype.toString.call(message.fileSize) : options.longs === Number ? new $util.LongBits(message.fileSize.low >>> 0, message.fileSize.high >>> 0).toNumber() : message.fileSize;
            if (message.modifiedDate != null && message.hasOwnProperty("modifiedDate"))
                object.modifiedDate = message.modifiedDate;
            if (message.authors && message.authors.length) {
                object.authors = [];
                for (let j = 0; j < message.authors.length; ++j)
                    object.authors[j] = $root.folder_mcp.Author.toObject(message.authors[j], options);
            }
            if (message.snippet != null && message.hasOwnProperty("snippet"))
                object.snippet = message.snippet;
            if (message.metadata != null && message.hasOwnProperty("metadata"))
                object.metadata = $root.folder_mcp.Metadata.toObject(message.metadata, options);
            return object;
        };

        /**
         * Converts this DocumentResult to JSON.
         * @function toJSON
         * @memberof folder_mcp.DocumentResult
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        DocumentResult.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for DocumentResult
         * @function getTypeUrl
         * @memberof folder_mcp.DocumentResult
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        DocumentResult.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.DocumentResult";
        };

        return DocumentResult;
    })();

    folder_mcp.SearchChunksRequest = (function() {

        /**
         * Properties of a SearchChunksRequest.
         * @memberof folder_mcp
         * @interface ISearchChunksRequest
         * @property {string|null} [query] SearchChunksRequest query
         * @property {number|null} [topK] SearchChunksRequest topK
         * @property {Array.<string>|null} [documentIds] SearchChunksRequest documentIds
         * @property {number|null} [maxPreviewTokens] SearchChunksRequest maxPreviewTokens
         * @property {boolean|null} [includeContext] SearchChunksRequest includeContext
         */

        /**
         * Constructs a new SearchChunksRequest.
         * @memberof folder_mcp
         * @classdesc Represents a SearchChunksRequest.
         * @implements ISearchChunksRequest
         * @constructor
         * @param {folder_mcp.ISearchChunksRequest=} [properties] Properties to set
         */
        function SearchChunksRequest(properties) {
            this.documentIds = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SearchChunksRequest query.
         * @member {string} query
         * @memberof folder_mcp.SearchChunksRequest
         * @instance
         */
        SearchChunksRequest.prototype.query = "";

        /**
         * SearchChunksRequest topK.
         * @member {number} topK
         * @memberof folder_mcp.SearchChunksRequest
         * @instance
         */
        SearchChunksRequest.prototype.topK = 0;

        /**
         * SearchChunksRequest documentIds.
         * @member {Array.<string>} documentIds
         * @memberof folder_mcp.SearchChunksRequest
         * @instance
         */
        SearchChunksRequest.prototype.documentIds = $util.emptyArray;

        /**
         * SearchChunksRequest maxPreviewTokens.
         * @member {number} maxPreviewTokens
         * @memberof folder_mcp.SearchChunksRequest
         * @instance
         */
        SearchChunksRequest.prototype.maxPreviewTokens = 0;

        /**
         * SearchChunksRequest includeContext.
         * @member {boolean} includeContext
         * @memberof folder_mcp.SearchChunksRequest
         * @instance
         */
        SearchChunksRequest.prototype.includeContext = false;

        /**
         * Creates a new SearchChunksRequest instance using the specified properties.
         * @function create
         * @memberof folder_mcp.SearchChunksRequest
         * @static
         * @param {folder_mcp.ISearchChunksRequest=} [properties] Properties to set
         * @returns {folder_mcp.SearchChunksRequest} SearchChunksRequest instance
         */
        SearchChunksRequest.create = function create(properties) {
            return new SearchChunksRequest(properties);
        };

        /**
         * Encodes the specified SearchChunksRequest message. Does not implicitly {@link folder_mcp.SearchChunksRequest.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.SearchChunksRequest
         * @static
         * @param {folder_mcp.ISearchChunksRequest} message SearchChunksRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SearchChunksRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.query != null && Object.hasOwnProperty.call(message, "query"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.query);
            if (message.topK != null && Object.hasOwnProperty.call(message, "topK"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.topK);
            if (message.documentIds != null && message.documentIds.length)
                for (let i = 0; i < message.documentIds.length; ++i)
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.documentIds[i]);
            if (message.maxPreviewTokens != null && Object.hasOwnProperty.call(message, "maxPreviewTokens"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.maxPreviewTokens);
            if (message.includeContext != null && Object.hasOwnProperty.call(message, "includeContext"))
                writer.uint32(/* id 5, wireType 0 =*/40).bool(message.includeContext);
            return writer;
        };

        /**
         * Encodes the specified SearchChunksRequest message, length delimited. Does not implicitly {@link folder_mcp.SearchChunksRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.SearchChunksRequest
         * @static
         * @param {folder_mcp.ISearchChunksRequest} message SearchChunksRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SearchChunksRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SearchChunksRequest message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.SearchChunksRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.SearchChunksRequest} SearchChunksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SearchChunksRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.SearchChunksRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.query = reader.string();
                        break;
                    }
                case 2: {
                        message.topK = reader.int32();
                        break;
                    }
                case 3: {
                        if (!(message.documentIds && message.documentIds.length))
                            message.documentIds = [];
                        message.documentIds.push(reader.string());
                        break;
                    }
                case 4: {
                        message.maxPreviewTokens = reader.int32();
                        break;
                    }
                case 5: {
                        message.includeContext = reader.bool();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SearchChunksRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.SearchChunksRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.SearchChunksRequest} SearchChunksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SearchChunksRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SearchChunksRequest message.
         * @function verify
         * @memberof folder_mcp.SearchChunksRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SearchChunksRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.query != null && message.hasOwnProperty("query"))
                if (!$util.isString(message.query))
                    return "query: string expected";
            if (message.topK != null && message.hasOwnProperty("topK"))
                if (!$util.isInteger(message.topK))
                    return "topK: integer expected";
            if (message.documentIds != null && message.hasOwnProperty("documentIds")) {
                if (!Array.isArray(message.documentIds))
                    return "documentIds: array expected";
                for (let i = 0; i < message.documentIds.length; ++i)
                    if (!$util.isString(message.documentIds[i]))
                        return "documentIds: string[] expected";
            }
            if (message.maxPreviewTokens != null && message.hasOwnProperty("maxPreviewTokens"))
                if (!$util.isInteger(message.maxPreviewTokens))
                    return "maxPreviewTokens: integer expected";
            if (message.includeContext != null && message.hasOwnProperty("includeContext"))
                if (typeof message.includeContext !== "boolean")
                    return "includeContext: boolean expected";
            return null;
        };

        /**
         * Creates a SearchChunksRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.SearchChunksRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.SearchChunksRequest} SearchChunksRequest
         */
        SearchChunksRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.SearchChunksRequest)
                return object;
            let message = new $root.folder_mcp.SearchChunksRequest();
            if (object.query != null)
                message.query = String(object.query);
            if (object.topK != null)
                message.topK = object.topK | 0;
            if (object.documentIds) {
                if (!Array.isArray(object.documentIds))
                    throw TypeError(".folder_mcp.SearchChunksRequest.documentIds: array expected");
                message.documentIds = [];
                for (let i = 0; i < object.documentIds.length; ++i)
                    message.documentIds[i] = String(object.documentIds[i]);
            }
            if (object.maxPreviewTokens != null)
                message.maxPreviewTokens = object.maxPreviewTokens | 0;
            if (object.includeContext != null)
                message.includeContext = Boolean(object.includeContext);
            return message;
        };

        /**
         * Creates a plain object from a SearchChunksRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.SearchChunksRequest
         * @static
         * @param {folder_mcp.SearchChunksRequest} message SearchChunksRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SearchChunksRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.documentIds = [];
            if (options.defaults) {
                object.query = "";
                object.topK = 0;
                object.maxPreviewTokens = 0;
                object.includeContext = false;
            }
            if (message.query != null && message.hasOwnProperty("query"))
                object.query = message.query;
            if (message.topK != null && message.hasOwnProperty("topK"))
                object.topK = message.topK;
            if (message.documentIds && message.documentIds.length) {
                object.documentIds = [];
                for (let j = 0; j < message.documentIds.length; ++j)
                    object.documentIds[j] = message.documentIds[j];
            }
            if (message.maxPreviewTokens != null && message.hasOwnProperty("maxPreviewTokens"))
                object.maxPreviewTokens = message.maxPreviewTokens;
            if (message.includeContext != null && message.hasOwnProperty("includeContext"))
                object.includeContext = message.includeContext;
            return object;
        };

        /**
         * Converts this SearchChunksRequest to JSON.
         * @function toJSON
         * @memberof folder_mcp.SearchChunksRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SearchChunksRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SearchChunksRequest
         * @function getTypeUrl
         * @memberof folder_mcp.SearchChunksRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SearchChunksRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.SearchChunksRequest";
        };

        return SearchChunksRequest;
    })();

    folder_mcp.SearchChunksResponse = (function() {

        /**
         * Properties of a SearchChunksResponse.
         * @memberof folder_mcp
         * @interface ISearchChunksResponse
         * @property {Array.<folder_mcp.IChunkResult>|null} [chunks] SearchChunksResponse chunks
         * @property {number|null} [totalFound] SearchChunksResponse totalFound
         * @property {folder_mcp.ISimilarityScore|null} [maxScore] SearchChunksResponse maxScore
         * @property {string|null} [queryId] SearchChunksResponse queryId
         * @property {folder_mcp.IResponseStatus|null} [status] SearchChunksResponse status
         * @property {folder_mcp.IPaginationInfo|null} [pagination] SearchChunksResponse pagination
         */

        /**
         * Constructs a new SearchChunksResponse.
         * @memberof folder_mcp
         * @classdesc Represents a SearchChunksResponse.
         * @implements ISearchChunksResponse
         * @constructor
         * @param {folder_mcp.ISearchChunksResponse=} [properties] Properties to set
         */
        function SearchChunksResponse(properties) {
            this.chunks = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SearchChunksResponse chunks.
         * @member {Array.<folder_mcp.IChunkResult>} chunks
         * @memberof folder_mcp.SearchChunksResponse
         * @instance
         */
        SearchChunksResponse.prototype.chunks = $util.emptyArray;

        /**
         * SearchChunksResponse totalFound.
         * @member {number} totalFound
         * @memberof folder_mcp.SearchChunksResponse
         * @instance
         */
        SearchChunksResponse.prototype.totalFound = 0;

        /**
         * SearchChunksResponse maxScore.
         * @member {folder_mcp.ISimilarityScore|null|undefined} maxScore
         * @memberof folder_mcp.SearchChunksResponse
         * @instance
         */
        SearchChunksResponse.prototype.maxScore = null;

        /**
         * SearchChunksResponse queryId.
         * @member {string} queryId
         * @memberof folder_mcp.SearchChunksResponse
         * @instance
         */
        SearchChunksResponse.prototype.queryId = "";

        /**
         * SearchChunksResponse status.
         * @member {folder_mcp.IResponseStatus|null|undefined} status
         * @memberof folder_mcp.SearchChunksResponse
         * @instance
         */
        SearchChunksResponse.prototype.status = null;

        /**
         * SearchChunksResponse pagination.
         * @member {folder_mcp.IPaginationInfo|null|undefined} pagination
         * @memberof folder_mcp.SearchChunksResponse
         * @instance
         */
        SearchChunksResponse.prototype.pagination = null;

        /**
         * Creates a new SearchChunksResponse instance using the specified properties.
         * @function create
         * @memberof folder_mcp.SearchChunksResponse
         * @static
         * @param {folder_mcp.ISearchChunksResponse=} [properties] Properties to set
         * @returns {folder_mcp.SearchChunksResponse} SearchChunksResponse instance
         */
        SearchChunksResponse.create = function create(properties) {
            return new SearchChunksResponse(properties);
        };

        /**
         * Encodes the specified SearchChunksResponse message. Does not implicitly {@link folder_mcp.SearchChunksResponse.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.SearchChunksResponse
         * @static
         * @param {folder_mcp.ISearchChunksResponse} message SearchChunksResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SearchChunksResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.chunks != null && message.chunks.length)
                for (let i = 0; i < message.chunks.length; ++i)
                    $root.folder_mcp.ChunkResult.encode(message.chunks[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.totalFound != null && Object.hasOwnProperty.call(message, "totalFound"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.totalFound);
            if (message.maxScore != null && Object.hasOwnProperty.call(message, "maxScore"))
                $root.folder_mcp.SimilarityScore.encode(message.maxScore, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.queryId != null && Object.hasOwnProperty.call(message, "queryId"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.queryId);
            if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                $root.folder_mcp.ResponseStatus.encode(message.status, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
            if (message.pagination != null && Object.hasOwnProperty.call(message, "pagination"))
                $root.folder_mcp.PaginationInfo.encode(message.pagination, writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified SearchChunksResponse message, length delimited. Does not implicitly {@link folder_mcp.SearchChunksResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.SearchChunksResponse
         * @static
         * @param {folder_mcp.ISearchChunksResponse} message SearchChunksResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SearchChunksResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SearchChunksResponse message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.SearchChunksResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.SearchChunksResponse} SearchChunksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SearchChunksResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.SearchChunksResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.chunks && message.chunks.length))
                            message.chunks = [];
                        message.chunks.push($root.folder_mcp.ChunkResult.decode(reader, reader.uint32()));
                        break;
                    }
                case 2: {
                        message.totalFound = reader.int32();
                        break;
                    }
                case 3: {
                        message.maxScore = $root.folder_mcp.SimilarityScore.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.queryId = reader.string();
                        break;
                    }
                case 5: {
                        message.status = $root.folder_mcp.ResponseStatus.decode(reader, reader.uint32());
                        break;
                    }
                case 6: {
                        message.pagination = $root.folder_mcp.PaginationInfo.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SearchChunksResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.SearchChunksResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.SearchChunksResponse} SearchChunksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SearchChunksResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SearchChunksResponse message.
         * @function verify
         * @memberof folder_mcp.SearchChunksResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SearchChunksResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.chunks != null && message.hasOwnProperty("chunks")) {
                if (!Array.isArray(message.chunks))
                    return "chunks: array expected";
                for (let i = 0; i < message.chunks.length; ++i) {
                    let error = $root.folder_mcp.ChunkResult.verify(message.chunks[i]);
                    if (error)
                        return "chunks." + error;
                }
            }
            if (message.totalFound != null && message.hasOwnProperty("totalFound"))
                if (!$util.isInteger(message.totalFound))
                    return "totalFound: integer expected";
            if (message.maxScore != null && message.hasOwnProperty("maxScore")) {
                let error = $root.folder_mcp.SimilarityScore.verify(message.maxScore);
                if (error)
                    return "maxScore." + error;
            }
            if (message.queryId != null && message.hasOwnProperty("queryId"))
                if (!$util.isString(message.queryId))
                    return "queryId: string expected";
            if (message.status != null && message.hasOwnProperty("status")) {
                let error = $root.folder_mcp.ResponseStatus.verify(message.status);
                if (error)
                    return "status." + error;
            }
            if (message.pagination != null && message.hasOwnProperty("pagination")) {
                let error = $root.folder_mcp.PaginationInfo.verify(message.pagination);
                if (error)
                    return "pagination." + error;
            }
            return null;
        };

        /**
         * Creates a SearchChunksResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.SearchChunksResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.SearchChunksResponse} SearchChunksResponse
         */
        SearchChunksResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.SearchChunksResponse)
                return object;
            let message = new $root.folder_mcp.SearchChunksResponse();
            if (object.chunks) {
                if (!Array.isArray(object.chunks))
                    throw TypeError(".folder_mcp.SearchChunksResponse.chunks: array expected");
                message.chunks = [];
                for (let i = 0; i < object.chunks.length; ++i) {
                    if (typeof object.chunks[i] !== "object")
                        throw TypeError(".folder_mcp.SearchChunksResponse.chunks: object expected");
                    message.chunks[i] = $root.folder_mcp.ChunkResult.fromObject(object.chunks[i]);
                }
            }
            if (object.totalFound != null)
                message.totalFound = object.totalFound | 0;
            if (object.maxScore != null) {
                if (typeof object.maxScore !== "object")
                    throw TypeError(".folder_mcp.SearchChunksResponse.maxScore: object expected");
                message.maxScore = $root.folder_mcp.SimilarityScore.fromObject(object.maxScore);
            }
            if (object.queryId != null)
                message.queryId = String(object.queryId);
            if (object.status != null) {
                if (typeof object.status !== "object")
                    throw TypeError(".folder_mcp.SearchChunksResponse.status: object expected");
                message.status = $root.folder_mcp.ResponseStatus.fromObject(object.status);
            }
            if (object.pagination != null) {
                if (typeof object.pagination !== "object")
                    throw TypeError(".folder_mcp.SearchChunksResponse.pagination: object expected");
                message.pagination = $root.folder_mcp.PaginationInfo.fromObject(object.pagination);
            }
            return message;
        };

        /**
         * Creates a plain object from a SearchChunksResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.SearchChunksResponse
         * @static
         * @param {folder_mcp.SearchChunksResponse} message SearchChunksResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SearchChunksResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.chunks = [];
            if (options.defaults) {
                object.totalFound = 0;
                object.maxScore = null;
                object.queryId = "";
                object.status = null;
                object.pagination = null;
            }
            if (message.chunks && message.chunks.length) {
                object.chunks = [];
                for (let j = 0; j < message.chunks.length; ++j)
                    object.chunks[j] = $root.folder_mcp.ChunkResult.toObject(message.chunks[j], options);
            }
            if (message.totalFound != null && message.hasOwnProperty("totalFound"))
                object.totalFound = message.totalFound;
            if (message.maxScore != null && message.hasOwnProperty("maxScore"))
                object.maxScore = $root.folder_mcp.SimilarityScore.toObject(message.maxScore, options);
            if (message.queryId != null && message.hasOwnProperty("queryId"))
                object.queryId = message.queryId;
            if (message.status != null && message.hasOwnProperty("status"))
                object.status = $root.folder_mcp.ResponseStatus.toObject(message.status, options);
            if (message.pagination != null && message.hasOwnProperty("pagination"))
                object.pagination = $root.folder_mcp.PaginationInfo.toObject(message.pagination, options);
            return object;
        };

        /**
         * Converts this SearchChunksResponse to JSON.
         * @function toJSON
         * @memberof folder_mcp.SearchChunksResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SearchChunksResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SearchChunksResponse
         * @function getTypeUrl
         * @memberof folder_mcp.SearchChunksResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SearchChunksResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.SearchChunksResponse";
        };

        return SearchChunksResponse;
    })();

    folder_mcp.ChunkResult = (function() {

        /**
         * Properties of a ChunkResult.
         * @memberof folder_mcp
         * @interface IChunkResult
         * @property {string|null} [chunkId] ChunkResult chunkId
         * @property {string|null} [documentId] ChunkResult documentId
         * @property {string|null} [filePath] ChunkResult filePath
         * @property {folder_mcp.ISimilarityScore|null} [similarity] ChunkResult similarity
         * @property {string|null} [contentPreview] ChunkResult contentPreview
         * @property {number|null} [chunkIndex] ChunkResult chunkIndex
         * @property {number|null} [startOffset] ChunkResult startOffset
         * @property {number|null} [endOffset] ChunkResult endOffset
         * @property {Array.<folder_mcp.IChunkResult>|null} [contextChunks] ChunkResult contextChunks
         * @property {folder_mcp.IMetadata|null} [metadata] ChunkResult metadata
         */

        /**
         * Constructs a new ChunkResult.
         * @memberof folder_mcp
         * @classdesc Represents a ChunkResult.
         * @implements IChunkResult
         * @constructor
         * @param {folder_mcp.IChunkResult=} [properties] Properties to set
         */
        function ChunkResult(properties) {
            this.contextChunks = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ChunkResult chunkId.
         * @member {string} chunkId
         * @memberof folder_mcp.ChunkResult
         * @instance
         */
        ChunkResult.prototype.chunkId = "";

        /**
         * ChunkResult documentId.
         * @member {string} documentId
         * @memberof folder_mcp.ChunkResult
         * @instance
         */
        ChunkResult.prototype.documentId = "";

        /**
         * ChunkResult filePath.
         * @member {string} filePath
         * @memberof folder_mcp.ChunkResult
         * @instance
         */
        ChunkResult.prototype.filePath = "";

        /**
         * ChunkResult similarity.
         * @member {folder_mcp.ISimilarityScore|null|undefined} similarity
         * @memberof folder_mcp.ChunkResult
         * @instance
         */
        ChunkResult.prototype.similarity = null;

        /**
         * ChunkResult contentPreview.
         * @member {string} contentPreview
         * @memberof folder_mcp.ChunkResult
         * @instance
         */
        ChunkResult.prototype.contentPreview = "";

        /**
         * ChunkResult chunkIndex.
         * @member {number} chunkIndex
         * @memberof folder_mcp.ChunkResult
         * @instance
         */
        ChunkResult.prototype.chunkIndex = 0;

        /**
         * ChunkResult startOffset.
         * @member {number} startOffset
         * @memberof folder_mcp.ChunkResult
         * @instance
         */
        ChunkResult.prototype.startOffset = 0;

        /**
         * ChunkResult endOffset.
         * @member {number} endOffset
         * @memberof folder_mcp.ChunkResult
         * @instance
         */
        ChunkResult.prototype.endOffset = 0;

        /**
         * ChunkResult contextChunks.
         * @member {Array.<folder_mcp.IChunkResult>} contextChunks
         * @memberof folder_mcp.ChunkResult
         * @instance
         */
        ChunkResult.prototype.contextChunks = $util.emptyArray;

        /**
         * ChunkResult metadata.
         * @member {folder_mcp.IMetadata|null|undefined} metadata
         * @memberof folder_mcp.ChunkResult
         * @instance
         */
        ChunkResult.prototype.metadata = null;

        /**
         * Creates a new ChunkResult instance using the specified properties.
         * @function create
         * @memberof folder_mcp.ChunkResult
         * @static
         * @param {folder_mcp.IChunkResult=} [properties] Properties to set
         * @returns {folder_mcp.ChunkResult} ChunkResult instance
         */
        ChunkResult.create = function create(properties) {
            return new ChunkResult(properties);
        };

        /**
         * Encodes the specified ChunkResult message. Does not implicitly {@link folder_mcp.ChunkResult.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.ChunkResult
         * @static
         * @param {folder_mcp.IChunkResult} message ChunkResult message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ChunkResult.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.chunkId != null && Object.hasOwnProperty.call(message, "chunkId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.chunkId);
            if (message.documentId != null && Object.hasOwnProperty.call(message, "documentId"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.documentId);
            if (message.filePath != null && Object.hasOwnProperty.call(message, "filePath"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.filePath);
            if (message.similarity != null && Object.hasOwnProperty.call(message, "similarity"))
                $root.folder_mcp.SimilarityScore.encode(message.similarity, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            if (message.contentPreview != null && Object.hasOwnProperty.call(message, "contentPreview"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.contentPreview);
            if (message.chunkIndex != null && Object.hasOwnProperty.call(message, "chunkIndex"))
                writer.uint32(/* id 6, wireType 0 =*/48).int32(message.chunkIndex);
            if (message.startOffset != null && Object.hasOwnProperty.call(message, "startOffset"))
                writer.uint32(/* id 7, wireType 0 =*/56).int32(message.startOffset);
            if (message.endOffset != null && Object.hasOwnProperty.call(message, "endOffset"))
                writer.uint32(/* id 8, wireType 0 =*/64).int32(message.endOffset);
            if (message.contextChunks != null && message.contextChunks.length)
                for (let i = 0; i < message.contextChunks.length; ++i)
                    $root.folder_mcp.ChunkResult.encode(message.contextChunks[i], writer.uint32(/* id 9, wireType 2 =*/74).fork()).ldelim();
            if (message.metadata != null && Object.hasOwnProperty.call(message, "metadata"))
                $root.folder_mcp.Metadata.encode(message.metadata, writer.uint32(/* id 10, wireType 2 =*/82).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified ChunkResult message, length delimited. Does not implicitly {@link folder_mcp.ChunkResult.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.ChunkResult
         * @static
         * @param {folder_mcp.IChunkResult} message ChunkResult message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ChunkResult.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ChunkResult message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.ChunkResult
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.ChunkResult} ChunkResult
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ChunkResult.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.ChunkResult();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.chunkId = reader.string();
                        break;
                    }
                case 2: {
                        message.documentId = reader.string();
                        break;
                    }
                case 3: {
                        message.filePath = reader.string();
                        break;
                    }
                case 4: {
                        message.similarity = $root.folder_mcp.SimilarityScore.decode(reader, reader.uint32());
                        break;
                    }
                case 5: {
                        message.contentPreview = reader.string();
                        break;
                    }
                case 6: {
                        message.chunkIndex = reader.int32();
                        break;
                    }
                case 7: {
                        message.startOffset = reader.int32();
                        break;
                    }
                case 8: {
                        message.endOffset = reader.int32();
                        break;
                    }
                case 9: {
                        if (!(message.contextChunks && message.contextChunks.length))
                            message.contextChunks = [];
                        message.contextChunks.push($root.folder_mcp.ChunkResult.decode(reader, reader.uint32()));
                        break;
                    }
                case 10: {
                        message.metadata = $root.folder_mcp.Metadata.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ChunkResult message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.ChunkResult
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.ChunkResult} ChunkResult
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ChunkResult.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ChunkResult message.
         * @function verify
         * @memberof folder_mcp.ChunkResult
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ChunkResult.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.chunkId != null && message.hasOwnProperty("chunkId"))
                if (!$util.isString(message.chunkId))
                    return "chunkId: string expected";
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                if (!$util.isString(message.documentId))
                    return "documentId: string expected";
            if (message.filePath != null && message.hasOwnProperty("filePath"))
                if (!$util.isString(message.filePath))
                    return "filePath: string expected";
            if (message.similarity != null && message.hasOwnProperty("similarity")) {
                let error = $root.folder_mcp.SimilarityScore.verify(message.similarity);
                if (error)
                    return "similarity." + error;
            }
            if (message.contentPreview != null && message.hasOwnProperty("contentPreview"))
                if (!$util.isString(message.contentPreview))
                    return "contentPreview: string expected";
            if (message.chunkIndex != null && message.hasOwnProperty("chunkIndex"))
                if (!$util.isInteger(message.chunkIndex))
                    return "chunkIndex: integer expected";
            if (message.startOffset != null && message.hasOwnProperty("startOffset"))
                if (!$util.isInteger(message.startOffset))
                    return "startOffset: integer expected";
            if (message.endOffset != null && message.hasOwnProperty("endOffset"))
                if (!$util.isInteger(message.endOffset))
                    return "endOffset: integer expected";
            if (message.contextChunks != null && message.hasOwnProperty("contextChunks")) {
                if (!Array.isArray(message.contextChunks))
                    return "contextChunks: array expected";
                for (let i = 0; i < message.contextChunks.length; ++i) {
                    let error = $root.folder_mcp.ChunkResult.verify(message.contextChunks[i]);
                    if (error)
                        return "contextChunks." + error;
                }
            }
            if (message.metadata != null && message.hasOwnProperty("metadata")) {
                let error = $root.folder_mcp.Metadata.verify(message.metadata);
                if (error)
                    return "metadata." + error;
            }
            return null;
        };

        /**
         * Creates a ChunkResult message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.ChunkResult
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.ChunkResult} ChunkResult
         */
        ChunkResult.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.ChunkResult)
                return object;
            let message = new $root.folder_mcp.ChunkResult();
            if (object.chunkId != null)
                message.chunkId = String(object.chunkId);
            if (object.documentId != null)
                message.documentId = String(object.documentId);
            if (object.filePath != null)
                message.filePath = String(object.filePath);
            if (object.similarity != null) {
                if (typeof object.similarity !== "object")
                    throw TypeError(".folder_mcp.ChunkResult.similarity: object expected");
                message.similarity = $root.folder_mcp.SimilarityScore.fromObject(object.similarity);
            }
            if (object.contentPreview != null)
                message.contentPreview = String(object.contentPreview);
            if (object.chunkIndex != null)
                message.chunkIndex = object.chunkIndex | 0;
            if (object.startOffset != null)
                message.startOffset = object.startOffset | 0;
            if (object.endOffset != null)
                message.endOffset = object.endOffset | 0;
            if (object.contextChunks) {
                if (!Array.isArray(object.contextChunks))
                    throw TypeError(".folder_mcp.ChunkResult.contextChunks: array expected");
                message.contextChunks = [];
                for (let i = 0; i < object.contextChunks.length; ++i) {
                    if (typeof object.contextChunks[i] !== "object")
                        throw TypeError(".folder_mcp.ChunkResult.contextChunks: object expected");
                    message.contextChunks[i] = $root.folder_mcp.ChunkResult.fromObject(object.contextChunks[i]);
                }
            }
            if (object.metadata != null) {
                if (typeof object.metadata !== "object")
                    throw TypeError(".folder_mcp.ChunkResult.metadata: object expected");
                message.metadata = $root.folder_mcp.Metadata.fromObject(object.metadata);
            }
            return message;
        };

        /**
         * Creates a plain object from a ChunkResult message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.ChunkResult
         * @static
         * @param {folder_mcp.ChunkResult} message ChunkResult
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ChunkResult.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.contextChunks = [];
            if (options.defaults) {
                object.chunkId = "";
                object.documentId = "";
                object.filePath = "";
                object.similarity = null;
                object.contentPreview = "";
                object.chunkIndex = 0;
                object.startOffset = 0;
                object.endOffset = 0;
                object.metadata = null;
            }
            if (message.chunkId != null && message.hasOwnProperty("chunkId"))
                object.chunkId = message.chunkId;
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                object.documentId = message.documentId;
            if (message.filePath != null && message.hasOwnProperty("filePath"))
                object.filePath = message.filePath;
            if (message.similarity != null && message.hasOwnProperty("similarity"))
                object.similarity = $root.folder_mcp.SimilarityScore.toObject(message.similarity, options);
            if (message.contentPreview != null && message.hasOwnProperty("contentPreview"))
                object.contentPreview = message.contentPreview;
            if (message.chunkIndex != null && message.hasOwnProperty("chunkIndex"))
                object.chunkIndex = message.chunkIndex;
            if (message.startOffset != null && message.hasOwnProperty("startOffset"))
                object.startOffset = message.startOffset;
            if (message.endOffset != null && message.hasOwnProperty("endOffset"))
                object.endOffset = message.endOffset;
            if (message.contextChunks && message.contextChunks.length) {
                object.contextChunks = [];
                for (let j = 0; j < message.contextChunks.length; ++j)
                    object.contextChunks[j] = $root.folder_mcp.ChunkResult.toObject(message.contextChunks[j], options);
            }
            if (message.metadata != null && message.hasOwnProperty("metadata"))
                object.metadata = $root.folder_mcp.Metadata.toObject(message.metadata, options);
            return object;
        };

        /**
         * Converts this ChunkResult to JSON.
         * @function toJSON
         * @memberof folder_mcp.ChunkResult
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ChunkResult.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ChunkResult
         * @function getTypeUrl
         * @memberof folder_mcp.ChunkResult
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ChunkResult.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.ChunkResult";
        };

        return ChunkResult;
    })();

    folder_mcp.ListFoldersRequest = (function() {

        /**
         * Properties of a ListFoldersRequest.
         * @memberof folder_mcp
         * @interface IListFoldersRequest
         * @property {string|null} [basePath] ListFoldersRequest basePath
         * @property {number|null} [maxDepth] ListFoldersRequest maxDepth
         * @property {boolean|null} [includeDocumentCounts] ListFoldersRequest includeDocumentCounts
         */

        /**
         * Constructs a new ListFoldersRequest.
         * @memberof folder_mcp
         * @classdesc Represents a ListFoldersRequest.
         * @implements IListFoldersRequest
         * @constructor
         * @param {folder_mcp.IListFoldersRequest=} [properties] Properties to set
         */
        function ListFoldersRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ListFoldersRequest basePath.
         * @member {string} basePath
         * @memberof folder_mcp.ListFoldersRequest
         * @instance
         */
        ListFoldersRequest.prototype.basePath = "";

        /**
         * ListFoldersRequest maxDepth.
         * @member {number} maxDepth
         * @memberof folder_mcp.ListFoldersRequest
         * @instance
         */
        ListFoldersRequest.prototype.maxDepth = 0;

        /**
         * ListFoldersRequest includeDocumentCounts.
         * @member {boolean} includeDocumentCounts
         * @memberof folder_mcp.ListFoldersRequest
         * @instance
         */
        ListFoldersRequest.prototype.includeDocumentCounts = false;

        /**
         * Creates a new ListFoldersRequest instance using the specified properties.
         * @function create
         * @memberof folder_mcp.ListFoldersRequest
         * @static
         * @param {folder_mcp.IListFoldersRequest=} [properties] Properties to set
         * @returns {folder_mcp.ListFoldersRequest} ListFoldersRequest instance
         */
        ListFoldersRequest.create = function create(properties) {
            return new ListFoldersRequest(properties);
        };

        /**
         * Encodes the specified ListFoldersRequest message. Does not implicitly {@link folder_mcp.ListFoldersRequest.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.ListFoldersRequest
         * @static
         * @param {folder_mcp.IListFoldersRequest} message ListFoldersRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListFoldersRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.basePath != null && Object.hasOwnProperty.call(message, "basePath"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.basePath);
            if (message.maxDepth != null && Object.hasOwnProperty.call(message, "maxDepth"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.maxDepth);
            if (message.includeDocumentCounts != null && Object.hasOwnProperty.call(message, "includeDocumentCounts"))
                writer.uint32(/* id 3, wireType 0 =*/24).bool(message.includeDocumentCounts);
            return writer;
        };

        /**
         * Encodes the specified ListFoldersRequest message, length delimited. Does not implicitly {@link folder_mcp.ListFoldersRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.ListFoldersRequest
         * @static
         * @param {folder_mcp.IListFoldersRequest} message ListFoldersRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListFoldersRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ListFoldersRequest message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.ListFoldersRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.ListFoldersRequest} ListFoldersRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListFoldersRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.ListFoldersRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.basePath = reader.string();
                        break;
                    }
                case 2: {
                        message.maxDepth = reader.int32();
                        break;
                    }
                case 3: {
                        message.includeDocumentCounts = reader.bool();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ListFoldersRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.ListFoldersRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.ListFoldersRequest} ListFoldersRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListFoldersRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ListFoldersRequest message.
         * @function verify
         * @memberof folder_mcp.ListFoldersRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ListFoldersRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.basePath != null && message.hasOwnProperty("basePath"))
                if (!$util.isString(message.basePath))
                    return "basePath: string expected";
            if (message.maxDepth != null && message.hasOwnProperty("maxDepth"))
                if (!$util.isInteger(message.maxDepth))
                    return "maxDepth: integer expected";
            if (message.includeDocumentCounts != null && message.hasOwnProperty("includeDocumentCounts"))
                if (typeof message.includeDocumentCounts !== "boolean")
                    return "includeDocumentCounts: boolean expected";
            return null;
        };

        /**
         * Creates a ListFoldersRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.ListFoldersRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.ListFoldersRequest} ListFoldersRequest
         */
        ListFoldersRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.ListFoldersRequest)
                return object;
            let message = new $root.folder_mcp.ListFoldersRequest();
            if (object.basePath != null)
                message.basePath = String(object.basePath);
            if (object.maxDepth != null)
                message.maxDepth = object.maxDepth | 0;
            if (object.includeDocumentCounts != null)
                message.includeDocumentCounts = Boolean(object.includeDocumentCounts);
            return message;
        };

        /**
         * Creates a plain object from a ListFoldersRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.ListFoldersRequest
         * @static
         * @param {folder_mcp.ListFoldersRequest} message ListFoldersRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ListFoldersRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.basePath = "";
                object.maxDepth = 0;
                object.includeDocumentCounts = false;
            }
            if (message.basePath != null && message.hasOwnProperty("basePath"))
                object.basePath = message.basePath;
            if (message.maxDepth != null && message.hasOwnProperty("maxDepth"))
                object.maxDepth = message.maxDepth;
            if (message.includeDocumentCounts != null && message.hasOwnProperty("includeDocumentCounts"))
                object.includeDocumentCounts = message.includeDocumentCounts;
            return object;
        };

        /**
         * Converts this ListFoldersRequest to JSON.
         * @function toJSON
         * @memberof folder_mcp.ListFoldersRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ListFoldersRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ListFoldersRequest
         * @function getTypeUrl
         * @memberof folder_mcp.ListFoldersRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ListFoldersRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.ListFoldersRequest";
        };

        return ListFoldersRequest;
    })();

    folder_mcp.ListFoldersResponse = (function() {

        /**
         * Properties of a ListFoldersResponse.
         * @memberof folder_mcp
         * @interface IListFoldersResponse
         * @property {Array.<folder_mcp.IFolderInfo>|null} [folders] ListFoldersResponse folders
         * @property {number|null} [totalFolders] ListFoldersResponse totalFolders
         * @property {folder_mcp.IResponseStatus|null} [status] ListFoldersResponse status
         * @property {folder_mcp.IPaginationInfo|null} [pagination] ListFoldersResponse pagination
         */

        /**
         * Constructs a new ListFoldersResponse.
         * @memberof folder_mcp
         * @classdesc Represents a ListFoldersResponse.
         * @implements IListFoldersResponse
         * @constructor
         * @param {folder_mcp.IListFoldersResponse=} [properties] Properties to set
         */
        function ListFoldersResponse(properties) {
            this.folders = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ListFoldersResponse folders.
         * @member {Array.<folder_mcp.IFolderInfo>} folders
         * @memberof folder_mcp.ListFoldersResponse
         * @instance
         */
        ListFoldersResponse.prototype.folders = $util.emptyArray;

        /**
         * ListFoldersResponse totalFolders.
         * @member {number} totalFolders
         * @memberof folder_mcp.ListFoldersResponse
         * @instance
         */
        ListFoldersResponse.prototype.totalFolders = 0;

        /**
         * ListFoldersResponse status.
         * @member {folder_mcp.IResponseStatus|null|undefined} status
         * @memberof folder_mcp.ListFoldersResponse
         * @instance
         */
        ListFoldersResponse.prototype.status = null;

        /**
         * ListFoldersResponse pagination.
         * @member {folder_mcp.IPaginationInfo|null|undefined} pagination
         * @memberof folder_mcp.ListFoldersResponse
         * @instance
         */
        ListFoldersResponse.prototype.pagination = null;

        /**
         * Creates a new ListFoldersResponse instance using the specified properties.
         * @function create
         * @memberof folder_mcp.ListFoldersResponse
         * @static
         * @param {folder_mcp.IListFoldersResponse=} [properties] Properties to set
         * @returns {folder_mcp.ListFoldersResponse} ListFoldersResponse instance
         */
        ListFoldersResponse.create = function create(properties) {
            return new ListFoldersResponse(properties);
        };

        /**
         * Encodes the specified ListFoldersResponse message. Does not implicitly {@link folder_mcp.ListFoldersResponse.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.ListFoldersResponse
         * @static
         * @param {folder_mcp.IListFoldersResponse} message ListFoldersResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListFoldersResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.folders != null && message.folders.length)
                for (let i = 0; i < message.folders.length; ++i)
                    $root.folder_mcp.FolderInfo.encode(message.folders[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.totalFolders != null && Object.hasOwnProperty.call(message, "totalFolders"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.totalFolders);
            if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                $root.folder_mcp.ResponseStatus.encode(message.status, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.pagination != null && Object.hasOwnProperty.call(message, "pagination"))
                $root.folder_mcp.PaginationInfo.encode(message.pagination, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified ListFoldersResponse message, length delimited. Does not implicitly {@link folder_mcp.ListFoldersResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.ListFoldersResponse
         * @static
         * @param {folder_mcp.IListFoldersResponse} message ListFoldersResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListFoldersResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ListFoldersResponse message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.ListFoldersResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.ListFoldersResponse} ListFoldersResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListFoldersResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.ListFoldersResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.folders && message.folders.length))
                            message.folders = [];
                        message.folders.push($root.folder_mcp.FolderInfo.decode(reader, reader.uint32()));
                        break;
                    }
                case 2: {
                        message.totalFolders = reader.int32();
                        break;
                    }
                case 3: {
                        message.status = $root.folder_mcp.ResponseStatus.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.pagination = $root.folder_mcp.PaginationInfo.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ListFoldersResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.ListFoldersResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.ListFoldersResponse} ListFoldersResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListFoldersResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ListFoldersResponse message.
         * @function verify
         * @memberof folder_mcp.ListFoldersResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ListFoldersResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.folders != null && message.hasOwnProperty("folders")) {
                if (!Array.isArray(message.folders))
                    return "folders: array expected";
                for (let i = 0; i < message.folders.length; ++i) {
                    let error = $root.folder_mcp.FolderInfo.verify(message.folders[i]);
                    if (error)
                        return "folders." + error;
                }
            }
            if (message.totalFolders != null && message.hasOwnProperty("totalFolders"))
                if (!$util.isInteger(message.totalFolders))
                    return "totalFolders: integer expected";
            if (message.status != null && message.hasOwnProperty("status")) {
                let error = $root.folder_mcp.ResponseStatus.verify(message.status);
                if (error)
                    return "status." + error;
            }
            if (message.pagination != null && message.hasOwnProperty("pagination")) {
                let error = $root.folder_mcp.PaginationInfo.verify(message.pagination);
                if (error)
                    return "pagination." + error;
            }
            return null;
        };

        /**
         * Creates a ListFoldersResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.ListFoldersResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.ListFoldersResponse} ListFoldersResponse
         */
        ListFoldersResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.ListFoldersResponse)
                return object;
            let message = new $root.folder_mcp.ListFoldersResponse();
            if (object.folders) {
                if (!Array.isArray(object.folders))
                    throw TypeError(".folder_mcp.ListFoldersResponse.folders: array expected");
                message.folders = [];
                for (let i = 0; i < object.folders.length; ++i) {
                    if (typeof object.folders[i] !== "object")
                        throw TypeError(".folder_mcp.ListFoldersResponse.folders: object expected");
                    message.folders[i] = $root.folder_mcp.FolderInfo.fromObject(object.folders[i]);
                }
            }
            if (object.totalFolders != null)
                message.totalFolders = object.totalFolders | 0;
            if (object.status != null) {
                if (typeof object.status !== "object")
                    throw TypeError(".folder_mcp.ListFoldersResponse.status: object expected");
                message.status = $root.folder_mcp.ResponseStatus.fromObject(object.status);
            }
            if (object.pagination != null) {
                if (typeof object.pagination !== "object")
                    throw TypeError(".folder_mcp.ListFoldersResponse.pagination: object expected");
                message.pagination = $root.folder_mcp.PaginationInfo.fromObject(object.pagination);
            }
            return message;
        };

        /**
         * Creates a plain object from a ListFoldersResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.ListFoldersResponse
         * @static
         * @param {folder_mcp.ListFoldersResponse} message ListFoldersResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ListFoldersResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.folders = [];
            if (options.defaults) {
                object.totalFolders = 0;
                object.status = null;
                object.pagination = null;
            }
            if (message.folders && message.folders.length) {
                object.folders = [];
                for (let j = 0; j < message.folders.length; ++j)
                    object.folders[j] = $root.folder_mcp.FolderInfo.toObject(message.folders[j], options);
            }
            if (message.totalFolders != null && message.hasOwnProperty("totalFolders"))
                object.totalFolders = message.totalFolders;
            if (message.status != null && message.hasOwnProperty("status"))
                object.status = $root.folder_mcp.ResponseStatus.toObject(message.status, options);
            if (message.pagination != null && message.hasOwnProperty("pagination"))
                object.pagination = $root.folder_mcp.PaginationInfo.toObject(message.pagination, options);
            return object;
        };

        /**
         * Converts this ListFoldersResponse to JSON.
         * @function toJSON
         * @memberof folder_mcp.ListFoldersResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ListFoldersResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ListFoldersResponse
         * @function getTypeUrl
         * @memberof folder_mcp.ListFoldersResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ListFoldersResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.ListFoldersResponse";
        };

        return ListFoldersResponse;
    })();

    folder_mcp.FolderInfo = (function() {

        /**
         * Properties of a FolderInfo.
         * @memberof folder_mcp
         * @interface IFolderInfo
         * @property {string|null} [folderPath] FolderInfo folderPath
         * @property {string|null} [folderName] FolderInfo folderName
         * @property {number|null} [documentCount] FolderInfo documentCount
         * @property {number|Long|null} [totalSize] FolderInfo totalSize
         * @property {string|null} [lastModified] FolderInfo lastModified
         * @property {Array.<folder_mcp.IFolderInfo>|null} [subfolders] FolderInfo subfolders
         */

        /**
         * Constructs a new FolderInfo.
         * @memberof folder_mcp
         * @classdesc Represents a FolderInfo.
         * @implements IFolderInfo
         * @constructor
         * @param {folder_mcp.IFolderInfo=} [properties] Properties to set
         */
        function FolderInfo(properties) {
            this.subfolders = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * FolderInfo folderPath.
         * @member {string} folderPath
         * @memberof folder_mcp.FolderInfo
         * @instance
         */
        FolderInfo.prototype.folderPath = "";

        /**
         * FolderInfo folderName.
         * @member {string} folderName
         * @memberof folder_mcp.FolderInfo
         * @instance
         */
        FolderInfo.prototype.folderName = "";

        /**
         * FolderInfo documentCount.
         * @member {number} documentCount
         * @memberof folder_mcp.FolderInfo
         * @instance
         */
        FolderInfo.prototype.documentCount = 0;

        /**
         * FolderInfo totalSize.
         * @member {number|Long} totalSize
         * @memberof folder_mcp.FolderInfo
         * @instance
         */
        FolderInfo.prototype.totalSize = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * FolderInfo lastModified.
         * @member {string} lastModified
         * @memberof folder_mcp.FolderInfo
         * @instance
         */
        FolderInfo.prototype.lastModified = "";

        /**
         * FolderInfo subfolders.
         * @member {Array.<folder_mcp.IFolderInfo>} subfolders
         * @memberof folder_mcp.FolderInfo
         * @instance
         */
        FolderInfo.prototype.subfolders = $util.emptyArray;

        /**
         * Creates a new FolderInfo instance using the specified properties.
         * @function create
         * @memberof folder_mcp.FolderInfo
         * @static
         * @param {folder_mcp.IFolderInfo=} [properties] Properties to set
         * @returns {folder_mcp.FolderInfo} FolderInfo instance
         */
        FolderInfo.create = function create(properties) {
            return new FolderInfo(properties);
        };

        /**
         * Encodes the specified FolderInfo message. Does not implicitly {@link folder_mcp.FolderInfo.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.FolderInfo
         * @static
         * @param {folder_mcp.IFolderInfo} message FolderInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FolderInfo.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.folderPath != null && Object.hasOwnProperty.call(message, "folderPath"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.folderPath);
            if (message.folderName != null && Object.hasOwnProperty.call(message, "folderName"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.folderName);
            if (message.documentCount != null && Object.hasOwnProperty.call(message, "documentCount"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.documentCount);
            if (message.totalSize != null && Object.hasOwnProperty.call(message, "totalSize"))
                writer.uint32(/* id 4, wireType 0 =*/32).int64(message.totalSize);
            if (message.lastModified != null && Object.hasOwnProperty.call(message, "lastModified"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.lastModified);
            if (message.subfolders != null && message.subfolders.length)
                for (let i = 0; i < message.subfolders.length; ++i)
                    $root.folder_mcp.FolderInfo.encode(message.subfolders[i], writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified FolderInfo message, length delimited. Does not implicitly {@link folder_mcp.FolderInfo.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.FolderInfo
         * @static
         * @param {folder_mcp.IFolderInfo} message FolderInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FolderInfo.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a FolderInfo message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.FolderInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.FolderInfo} FolderInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FolderInfo.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.FolderInfo();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.folderPath = reader.string();
                        break;
                    }
                case 2: {
                        message.folderName = reader.string();
                        break;
                    }
                case 3: {
                        message.documentCount = reader.int32();
                        break;
                    }
                case 4: {
                        message.totalSize = reader.int64();
                        break;
                    }
                case 5: {
                        message.lastModified = reader.string();
                        break;
                    }
                case 6: {
                        if (!(message.subfolders && message.subfolders.length))
                            message.subfolders = [];
                        message.subfolders.push($root.folder_mcp.FolderInfo.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a FolderInfo message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.FolderInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.FolderInfo} FolderInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FolderInfo.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a FolderInfo message.
         * @function verify
         * @memberof folder_mcp.FolderInfo
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        FolderInfo.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.folderPath != null && message.hasOwnProperty("folderPath"))
                if (!$util.isString(message.folderPath))
                    return "folderPath: string expected";
            if (message.folderName != null && message.hasOwnProperty("folderName"))
                if (!$util.isString(message.folderName))
                    return "folderName: string expected";
            if (message.documentCount != null && message.hasOwnProperty("documentCount"))
                if (!$util.isInteger(message.documentCount))
                    return "documentCount: integer expected";
            if (message.totalSize != null && message.hasOwnProperty("totalSize"))
                if (!$util.isInteger(message.totalSize) && !(message.totalSize && $util.isInteger(message.totalSize.low) && $util.isInteger(message.totalSize.high)))
                    return "totalSize: integer|Long expected";
            if (message.lastModified != null && message.hasOwnProperty("lastModified"))
                if (!$util.isString(message.lastModified))
                    return "lastModified: string expected";
            if (message.subfolders != null && message.hasOwnProperty("subfolders")) {
                if (!Array.isArray(message.subfolders))
                    return "subfolders: array expected";
                for (let i = 0; i < message.subfolders.length; ++i) {
                    let error = $root.folder_mcp.FolderInfo.verify(message.subfolders[i]);
                    if (error)
                        return "subfolders." + error;
                }
            }
            return null;
        };

        /**
         * Creates a FolderInfo message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.FolderInfo
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.FolderInfo} FolderInfo
         */
        FolderInfo.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.FolderInfo)
                return object;
            let message = new $root.folder_mcp.FolderInfo();
            if (object.folderPath != null)
                message.folderPath = String(object.folderPath);
            if (object.folderName != null)
                message.folderName = String(object.folderName);
            if (object.documentCount != null)
                message.documentCount = object.documentCount | 0;
            if (object.totalSize != null)
                if ($util.Long)
                    (message.totalSize = $util.Long.fromValue(object.totalSize)).unsigned = false;
                else if (typeof object.totalSize === "string")
                    message.totalSize = parseInt(object.totalSize, 10);
                else if (typeof object.totalSize === "number")
                    message.totalSize = object.totalSize;
                else if (typeof object.totalSize === "object")
                    message.totalSize = new $util.LongBits(object.totalSize.low >>> 0, object.totalSize.high >>> 0).toNumber();
            if (object.lastModified != null)
                message.lastModified = String(object.lastModified);
            if (object.subfolders) {
                if (!Array.isArray(object.subfolders))
                    throw TypeError(".folder_mcp.FolderInfo.subfolders: array expected");
                message.subfolders = [];
                for (let i = 0; i < object.subfolders.length; ++i) {
                    if (typeof object.subfolders[i] !== "object")
                        throw TypeError(".folder_mcp.FolderInfo.subfolders: object expected");
                    message.subfolders[i] = $root.folder_mcp.FolderInfo.fromObject(object.subfolders[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a FolderInfo message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.FolderInfo
         * @static
         * @param {folder_mcp.FolderInfo} message FolderInfo
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        FolderInfo.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.subfolders = [];
            if (options.defaults) {
                object.folderPath = "";
                object.folderName = "";
                object.documentCount = 0;
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.totalSize = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.totalSize = options.longs === String ? "0" : 0;
                object.lastModified = "";
            }
            if (message.folderPath != null && message.hasOwnProperty("folderPath"))
                object.folderPath = message.folderPath;
            if (message.folderName != null && message.hasOwnProperty("folderName"))
                object.folderName = message.folderName;
            if (message.documentCount != null && message.hasOwnProperty("documentCount"))
                object.documentCount = message.documentCount;
            if (message.totalSize != null && message.hasOwnProperty("totalSize"))
                if (typeof message.totalSize === "number")
                    object.totalSize = options.longs === String ? String(message.totalSize) : message.totalSize;
                else
                    object.totalSize = options.longs === String ? $util.Long.prototype.toString.call(message.totalSize) : options.longs === Number ? new $util.LongBits(message.totalSize.low >>> 0, message.totalSize.high >>> 0).toNumber() : message.totalSize;
            if (message.lastModified != null && message.hasOwnProperty("lastModified"))
                object.lastModified = message.lastModified;
            if (message.subfolders && message.subfolders.length) {
                object.subfolders = [];
                for (let j = 0; j < message.subfolders.length; ++j)
                    object.subfolders[j] = $root.folder_mcp.FolderInfo.toObject(message.subfolders[j], options);
            }
            return object;
        };

        /**
         * Converts this FolderInfo to JSON.
         * @function toJSON
         * @memberof folder_mcp.FolderInfo
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        FolderInfo.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for FolderInfo
         * @function getTypeUrl
         * @memberof folder_mcp.FolderInfo
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        FolderInfo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.FolderInfo";
        };

        return FolderInfo;
    })();

    folder_mcp.ListDocumentsInFolderRequest = (function() {

        /**
         * Properties of a ListDocumentsInFolderRequest.
         * @memberof folder_mcp
         * @interface IListDocumentsInFolderRequest
         * @property {string|null} [folderPath] ListDocumentsInFolderRequest folderPath
         * @property {number|null} [page] ListDocumentsInFolderRequest page
         * @property {number|null} [perPage] ListDocumentsInFolderRequest perPage
         * @property {string|null} [sortBy] ListDocumentsInFolderRequest sortBy
         * @property {string|null} [sortOrder] ListDocumentsInFolderRequest sortOrder
         * @property {Array.<folder_mcp.DocumentType>|null} [typeFilter] ListDocumentsInFolderRequest typeFilter
         * @property {string|null} [modifiedAfter] ListDocumentsInFolderRequest modifiedAfter
         * @property {string|null} [modifiedBefore] ListDocumentsInFolderRequest modifiedBefore
         */

        /**
         * Constructs a new ListDocumentsInFolderRequest.
         * @memberof folder_mcp
         * @classdesc Represents a ListDocumentsInFolderRequest.
         * @implements IListDocumentsInFolderRequest
         * @constructor
         * @param {folder_mcp.IListDocumentsInFolderRequest=} [properties] Properties to set
         */
        function ListDocumentsInFolderRequest(properties) {
            this.typeFilter = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ListDocumentsInFolderRequest folderPath.
         * @member {string} folderPath
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @instance
         */
        ListDocumentsInFolderRequest.prototype.folderPath = "";

        /**
         * ListDocumentsInFolderRequest page.
         * @member {number} page
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @instance
         */
        ListDocumentsInFolderRequest.prototype.page = 0;

        /**
         * ListDocumentsInFolderRequest perPage.
         * @member {number} perPage
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @instance
         */
        ListDocumentsInFolderRequest.prototype.perPage = 0;

        /**
         * ListDocumentsInFolderRequest sortBy.
         * @member {string} sortBy
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @instance
         */
        ListDocumentsInFolderRequest.prototype.sortBy = "";

        /**
         * ListDocumentsInFolderRequest sortOrder.
         * @member {string} sortOrder
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @instance
         */
        ListDocumentsInFolderRequest.prototype.sortOrder = "";

        /**
         * ListDocumentsInFolderRequest typeFilter.
         * @member {Array.<folder_mcp.DocumentType>} typeFilter
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @instance
         */
        ListDocumentsInFolderRequest.prototype.typeFilter = $util.emptyArray;

        /**
         * ListDocumentsInFolderRequest modifiedAfter.
         * @member {string} modifiedAfter
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @instance
         */
        ListDocumentsInFolderRequest.prototype.modifiedAfter = "";

        /**
         * ListDocumentsInFolderRequest modifiedBefore.
         * @member {string} modifiedBefore
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @instance
         */
        ListDocumentsInFolderRequest.prototype.modifiedBefore = "";

        /**
         * Creates a new ListDocumentsInFolderRequest instance using the specified properties.
         * @function create
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @static
         * @param {folder_mcp.IListDocumentsInFolderRequest=} [properties] Properties to set
         * @returns {folder_mcp.ListDocumentsInFolderRequest} ListDocumentsInFolderRequest instance
         */
        ListDocumentsInFolderRequest.create = function create(properties) {
            return new ListDocumentsInFolderRequest(properties);
        };

        /**
         * Encodes the specified ListDocumentsInFolderRequest message. Does not implicitly {@link folder_mcp.ListDocumentsInFolderRequest.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @static
         * @param {folder_mcp.IListDocumentsInFolderRequest} message ListDocumentsInFolderRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListDocumentsInFolderRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.folderPath != null && Object.hasOwnProperty.call(message, "folderPath"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.folderPath);
            if (message.page != null && Object.hasOwnProperty.call(message, "page"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.page);
            if (message.perPage != null && Object.hasOwnProperty.call(message, "perPage"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.perPage);
            if (message.sortBy != null && Object.hasOwnProperty.call(message, "sortBy"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.sortBy);
            if (message.sortOrder != null && Object.hasOwnProperty.call(message, "sortOrder"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.sortOrder);
            if (message.typeFilter != null && message.typeFilter.length) {
                writer.uint32(/* id 6, wireType 2 =*/50).fork();
                for (let i = 0; i < message.typeFilter.length; ++i)
                    writer.int32(message.typeFilter[i]);
                writer.ldelim();
            }
            if (message.modifiedAfter != null && Object.hasOwnProperty.call(message, "modifiedAfter"))
                writer.uint32(/* id 7, wireType 2 =*/58).string(message.modifiedAfter);
            if (message.modifiedBefore != null && Object.hasOwnProperty.call(message, "modifiedBefore"))
                writer.uint32(/* id 8, wireType 2 =*/66).string(message.modifiedBefore);
            return writer;
        };

        /**
         * Encodes the specified ListDocumentsInFolderRequest message, length delimited. Does not implicitly {@link folder_mcp.ListDocumentsInFolderRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @static
         * @param {folder_mcp.IListDocumentsInFolderRequest} message ListDocumentsInFolderRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListDocumentsInFolderRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ListDocumentsInFolderRequest message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.ListDocumentsInFolderRequest} ListDocumentsInFolderRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListDocumentsInFolderRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.ListDocumentsInFolderRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.folderPath = reader.string();
                        break;
                    }
                case 2: {
                        message.page = reader.int32();
                        break;
                    }
                case 3: {
                        message.perPage = reader.int32();
                        break;
                    }
                case 4: {
                        message.sortBy = reader.string();
                        break;
                    }
                case 5: {
                        message.sortOrder = reader.string();
                        break;
                    }
                case 6: {
                        if (!(message.typeFilter && message.typeFilter.length))
                            message.typeFilter = [];
                        if ((tag & 7) === 2) {
                            let end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.typeFilter.push(reader.int32());
                        } else
                            message.typeFilter.push(reader.int32());
                        break;
                    }
                case 7: {
                        message.modifiedAfter = reader.string();
                        break;
                    }
                case 8: {
                        message.modifiedBefore = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ListDocumentsInFolderRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.ListDocumentsInFolderRequest} ListDocumentsInFolderRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListDocumentsInFolderRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ListDocumentsInFolderRequest message.
         * @function verify
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ListDocumentsInFolderRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.folderPath != null && message.hasOwnProperty("folderPath"))
                if (!$util.isString(message.folderPath))
                    return "folderPath: string expected";
            if (message.page != null && message.hasOwnProperty("page"))
                if (!$util.isInteger(message.page))
                    return "page: integer expected";
            if (message.perPage != null && message.hasOwnProperty("perPage"))
                if (!$util.isInteger(message.perPage))
                    return "perPage: integer expected";
            if (message.sortBy != null && message.hasOwnProperty("sortBy"))
                if (!$util.isString(message.sortBy))
                    return "sortBy: string expected";
            if (message.sortOrder != null && message.hasOwnProperty("sortOrder"))
                if (!$util.isString(message.sortOrder))
                    return "sortOrder: string expected";
            if (message.typeFilter != null && message.hasOwnProperty("typeFilter")) {
                if (!Array.isArray(message.typeFilter))
                    return "typeFilter: array expected";
                for (let i = 0; i < message.typeFilter.length; ++i)
                    switch (message.typeFilter[i]) {
                    default:
                        return "typeFilter: enum value[] expected";
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                    case 7:
                    case 8:
                    case 9:
                    case 10:
                    case 11:
                    case 12:
                    case 13:
                    case 14:
                    case 15:
                    case 16:
                        break;
                    }
            }
            if (message.modifiedAfter != null && message.hasOwnProperty("modifiedAfter"))
                if (!$util.isString(message.modifiedAfter))
                    return "modifiedAfter: string expected";
            if (message.modifiedBefore != null && message.hasOwnProperty("modifiedBefore"))
                if (!$util.isString(message.modifiedBefore))
                    return "modifiedBefore: string expected";
            return null;
        };

        /**
         * Creates a ListDocumentsInFolderRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.ListDocumentsInFolderRequest} ListDocumentsInFolderRequest
         */
        ListDocumentsInFolderRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.ListDocumentsInFolderRequest)
                return object;
            let message = new $root.folder_mcp.ListDocumentsInFolderRequest();
            if (object.folderPath != null)
                message.folderPath = String(object.folderPath);
            if (object.page != null)
                message.page = object.page | 0;
            if (object.perPage != null)
                message.perPage = object.perPage | 0;
            if (object.sortBy != null)
                message.sortBy = String(object.sortBy);
            if (object.sortOrder != null)
                message.sortOrder = String(object.sortOrder);
            if (object.typeFilter) {
                if (!Array.isArray(object.typeFilter))
                    throw TypeError(".folder_mcp.ListDocumentsInFolderRequest.typeFilter: array expected");
                message.typeFilter = [];
                for (let i = 0; i < object.typeFilter.length; ++i)
                    switch (object.typeFilter[i]) {
                    default:
                        if (typeof object.typeFilter[i] === "number") {
                            message.typeFilter[i] = object.typeFilter[i];
                            break;
                        }
                    case "DOCUMENT_TYPE_UNSPECIFIED":
                    case 0:
                        message.typeFilter[i] = 0;
                        break;
                    case "DOCUMENT_TYPE_PDF":
                    case 1:
                        message.typeFilter[i] = 1;
                        break;
                    case "DOCUMENT_TYPE_DOCX":
                    case 2:
                        message.typeFilter[i] = 2;
                        break;
                    case "DOCUMENT_TYPE_DOC":
                    case 3:
                        message.typeFilter[i] = 3;
                        break;
                    case "DOCUMENT_TYPE_XLSX":
                    case 4:
                        message.typeFilter[i] = 4;
                        break;
                    case "DOCUMENT_TYPE_XLS":
                    case 5:
                        message.typeFilter[i] = 5;
                        break;
                    case "DOCUMENT_TYPE_PPTX":
                    case 6:
                        message.typeFilter[i] = 6;
                        break;
                    case "DOCUMENT_TYPE_PPT":
                    case 7:
                        message.typeFilter[i] = 7;
                        break;
                    case "DOCUMENT_TYPE_TXT":
                    case 8:
                        message.typeFilter[i] = 8;
                        break;
                    case "DOCUMENT_TYPE_MD":
                    case 9:
                        message.typeFilter[i] = 9;
                        break;
                    case "DOCUMENT_TYPE_CSV":
                    case 10:
                        message.typeFilter[i] = 10;
                        break;
                    case "DOCUMENT_TYPE_RTF":
                    case 11:
                        message.typeFilter[i] = 11;
                        break;
                    case "DOCUMENT_TYPE_ODT":
                    case 12:
                        message.typeFilter[i] = 12;
                        break;
                    case "DOCUMENT_TYPE_ODS":
                    case 13:
                        message.typeFilter[i] = 13;
                        break;
                    case "DOCUMENT_TYPE_ODP":
                    case 14:
                        message.typeFilter[i] = 14;
                        break;
                    case "DOCUMENT_TYPE_HTML":
                    case 15:
                        message.typeFilter[i] = 15;
                        break;
                    case "DOCUMENT_TYPE_XML":
                    case 16:
                        message.typeFilter[i] = 16;
                        break;
                    }
            }
            if (object.modifiedAfter != null)
                message.modifiedAfter = String(object.modifiedAfter);
            if (object.modifiedBefore != null)
                message.modifiedBefore = String(object.modifiedBefore);
            return message;
        };

        /**
         * Creates a plain object from a ListDocumentsInFolderRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @static
         * @param {folder_mcp.ListDocumentsInFolderRequest} message ListDocumentsInFolderRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ListDocumentsInFolderRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.typeFilter = [];
            if (options.defaults) {
                object.folderPath = "";
                object.page = 0;
                object.perPage = 0;
                object.sortBy = "";
                object.sortOrder = "";
                object.modifiedAfter = "";
                object.modifiedBefore = "";
            }
            if (message.folderPath != null && message.hasOwnProperty("folderPath"))
                object.folderPath = message.folderPath;
            if (message.page != null && message.hasOwnProperty("page"))
                object.page = message.page;
            if (message.perPage != null && message.hasOwnProperty("perPage"))
                object.perPage = message.perPage;
            if (message.sortBy != null && message.hasOwnProperty("sortBy"))
                object.sortBy = message.sortBy;
            if (message.sortOrder != null && message.hasOwnProperty("sortOrder"))
                object.sortOrder = message.sortOrder;
            if (message.typeFilter && message.typeFilter.length) {
                object.typeFilter = [];
                for (let j = 0; j < message.typeFilter.length; ++j)
                    object.typeFilter[j] = options.enums === String ? $root.folder_mcp.DocumentType[message.typeFilter[j]] === undefined ? message.typeFilter[j] : $root.folder_mcp.DocumentType[message.typeFilter[j]] : message.typeFilter[j];
            }
            if (message.modifiedAfter != null && message.hasOwnProperty("modifiedAfter"))
                object.modifiedAfter = message.modifiedAfter;
            if (message.modifiedBefore != null && message.hasOwnProperty("modifiedBefore"))
                object.modifiedBefore = message.modifiedBefore;
            return object;
        };

        /**
         * Converts this ListDocumentsInFolderRequest to JSON.
         * @function toJSON
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ListDocumentsInFolderRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ListDocumentsInFolderRequest
         * @function getTypeUrl
         * @memberof folder_mcp.ListDocumentsInFolderRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ListDocumentsInFolderRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.ListDocumentsInFolderRequest";
        };

        return ListDocumentsInFolderRequest;
    })();

    folder_mcp.ListDocumentsInFolderResponse = (function() {

        /**
         * Properties of a ListDocumentsInFolderResponse.
         * @memberof folder_mcp
         * @interface IListDocumentsInFolderResponse
         * @property {Array.<folder_mcp.IDocumentInfo>|null} [documents] ListDocumentsInFolderResponse documents
         * @property {number|null} [totalDocuments] ListDocumentsInFolderResponse totalDocuments
         * @property {folder_mcp.IResponseStatus|null} [status] ListDocumentsInFolderResponse status
         * @property {folder_mcp.IPaginationInfo|null} [pagination] ListDocumentsInFolderResponse pagination
         */

        /**
         * Constructs a new ListDocumentsInFolderResponse.
         * @memberof folder_mcp
         * @classdesc Represents a ListDocumentsInFolderResponse.
         * @implements IListDocumentsInFolderResponse
         * @constructor
         * @param {folder_mcp.IListDocumentsInFolderResponse=} [properties] Properties to set
         */
        function ListDocumentsInFolderResponse(properties) {
            this.documents = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ListDocumentsInFolderResponse documents.
         * @member {Array.<folder_mcp.IDocumentInfo>} documents
         * @memberof folder_mcp.ListDocumentsInFolderResponse
         * @instance
         */
        ListDocumentsInFolderResponse.prototype.documents = $util.emptyArray;

        /**
         * ListDocumentsInFolderResponse totalDocuments.
         * @member {number} totalDocuments
         * @memberof folder_mcp.ListDocumentsInFolderResponse
         * @instance
         */
        ListDocumentsInFolderResponse.prototype.totalDocuments = 0;

        /**
         * ListDocumentsInFolderResponse status.
         * @member {folder_mcp.IResponseStatus|null|undefined} status
         * @memberof folder_mcp.ListDocumentsInFolderResponse
         * @instance
         */
        ListDocumentsInFolderResponse.prototype.status = null;

        /**
         * ListDocumentsInFolderResponse pagination.
         * @member {folder_mcp.IPaginationInfo|null|undefined} pagination
         * @memberof folder_mcp.ListDocumentsInFolderResponse
         * @instance
         */
        ListDocumentsInFolderResponse.prototype.pagination = null;

        /**
         * Creates a new ListDocumentsInFolderResponse instance using the specified properties.
         * @function create
         * @memberof folder_mcp.ListDocumentsInFolderResponse
         * @static
         * @param {folder_mcp.IListDocumentsInFolderResponse=} [properties] Properties to set
         * @returns {folder_mcp.ListDocumentsInFolderResponse} ListDocumentsInFolderResponse instance
         */
        ListDocumentsInFolderResponse.create = function create(properties) {
            return new ListDocumentsInFolderResponse(properties);
        };

        /**
         * Encodes the specified ListDocumentsInFolderResponse message. Does not implicitly {@link folder_mcp.ListDocumentsInFolderResponse.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.ListDocumentsInFolderResponse
         * @static
         * @param {folder_mcp.IListDocumentsInFolderResponse} message ListDocumentsInFolderResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListDocumentsInFolderResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documents != null && message.documents.length)
                for (let i = 0; i < message.documents.length; ++i)
                    $root.folder_mcp.DocumentInfo.encode(message.documents[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.totalDocuments != null && Object.hasOwnProperty.call(message, "totalDocuments"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.totalDocuments);
            if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                $root.folder_mcp.ResponseStatus.encode(message.status, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.pagination != null && Object.hasOwnProperty.call(message, "pagination"))
                $root.folder_mcp.PaginationInfo.encode(message.pagination, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified ListDocumentsInFolderResponse message, length delimited. Does not implicitly {@link folder_mcp.ListDocumentsInFolderResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.ListDocumentsInFolderResponse
         * @static
         * @param {folder_mcp.IListDocumentsInFolderResponse} message ListDocumentsInFolderResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ListDocumentsInFolderResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ListDocumentsInFolderResponse message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.ListDocumentsInFolderResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.ListDocumentsInFolderResponse} ListDocumentsInFolderResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListDocumentsInFolderResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.ListDocumentsInFolderResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.documents && message.documents.length))
                            message.documents = [];
                        message.documents.push($root.folder_mcp.DocumentInfo.decode(reader, reader.uint32()));
                        break;
                    }
                case 2: {
                        message.totalDocuments = reader.int32();
                        break;
                    }
                case 3: {
                        message.status = $root.folder_mcp.ResponseStatus.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.pagination = $root.folder_mcp.PaginationInfo.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ListDocumentsInFolderResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.ListDocumentsInFolderResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.ListDocumentsInFolderResponse} ListDocumentsInFolderResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ListDocumentsInFolderResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ListDocumentsInFolderResponse message.
         * @function verify
         * @memberof folder_mcp.ListDocumentsInFolderResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ListDocumentsInFolderResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documents != null && message.hasOwnProperty("documents")) {
                if (!Array.isArray(message.documents))
                    return "documents: array expected";
                for (let i = 0; i < message.documents.length; ++i) {
                    let error = $root.folder_mcp.DocumentInfo.verify(message.documents[i]);
                    if (error)
                        return "documents." + error;
                }
            }
            if (message.totalDocuments != null && message.hasOwnProperty("totalDocuments"))
                if (!$util.isInteger(message.totalDocuments))
                    return "totalDocuments: integer expected";
            if (message.status != null && message.hasOwnProperty("status")) {
                let error = $root.folder_mcp.ResponseStatus.verify(message.status);
                if (error)
                    return "status." + error;
            }
            if (message.pagination != null && message.hasOwnProperty("pagination")) {
                let error = $root.folder_mcp.PaginationInfo.verify(message.pagination);
                if (error)
                    return "pagination." + error;
            }
            return null;
        };

        /**
         * Creates a ListDocumentsInFolderResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.ListDocumentsInFolderResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.ListDocumentsInFolderResponse} ListDocumentsInFolderResponse
         */
        ListDocumentsInFolderResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.ListDocumentsInFolderResponse)
                return object;
            let message = new $root.folder_mcp.ListDocumentsInFolderResponse();
            if (object.documents) {
                if (!Array.isArray(object.documents))
                    throw TypeError(".folder_mcp.ListDocumentsInFolderResponse.documents: array expected");
                message.documents = [];
                for (let i = 0; i < object.documents.length; ++i) {
                    if (typeof object.documents[i] !== "object")
                        throw TypeError(".folder_mcp.ListDocumentsInFolderResponse.documents: object expected");
                    message.documents[i] = $root.folder_mcp.DocumentInfo.fromObject(object.documents[i]);
                }
            }
            if (object.totalDocuments != null)
                message.totalDocuments = object.totalDocuments | 0;
            if (object.status != null) {
                if (typeof object.status !== "object")
                    throw TypeError(".folder_mcp.ListDocumentsInFolderResponse.status: object expected");
                message.status = $root.folder_mcp.ResponseStatus.fromObject(object.status);
            }
            if (object.pagination != null) {
                if (typeof object.pagination !== "object")
                    throw TypeError(".folder_mcp.ListDocumentsInFolderResponse.pagination: object expected");
                message.pagination = $root.folder_mcp.PaginationInfo.fromObject(object.pagination);
            }
            return message;
        };

        /**
         * Creates a plain object from a ListDocumentsInFolderResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.ListDocumentsInFolderResponse
         * @static
         * @param {folder_mcp.ListDocumentsInFolderResponse} message ListDocumentsInFolderResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ListDocumentsInFolderResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.documents = [];
            if (options.defaults) {
                object.totalDocuments = 0;
                object.status = null;
                object.pagination = null;
            }
            if (message.documents && message.documents.length) {
                object.documents = [];
                for (let j = 0; j < message.documents.length; ++j)
                    object.documents[j] = $root.folder_mcp.DocumentInfo.toObject(message.documents[j], options);
            }
            if (message.totalDocuments != null && message.hasOwnProperty("totalDocuments"))
                object.totalDocuments = message.totalDocuments;
            if (message.status != null && message.hasOwnProperty("status"))
                object.status = $root.folder_mcp.ResponseStatus.toObject(message.status, options);
            if (message.pagination != null && message.hasOwnProperty("pagination"))
                object.pagination = $root.folder_mcp.PaginationInfo.toObject(message.pagination, options);
            return object;
        };

        /**
         * Converts this ListDocumentsInFolderResponse to JSON.
         * @function toJSON
         * @memberof folder_mcp.ListDocumentsInFolderResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ListDocumentsInFolderResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ListDocumentsInFolderResponse
         * @function getTypeUrl
         * @memberof folder_mcp.ListDocumentsInFolderResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ListDocumentsInFolderResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.ListDocumentsInFolderResponse";
        };

        return ListDocumentsInFolderResponse;
    })();

    folder_mcp.DocumentInfo = (function() {

        /**
         * Properties of a DocumentInfo.
         * @memberof folder_mcp
         * @interface IDocumentInfo
         * @property {string|null} [documentId] DocumentInfo documentId
         * @property {string|null} [filePath] DocumentInfo filePath
         * @property {string|null} [filename] DocumentInfo filename
         * @property {folder_mcp.DocumentType|null} [documentType] DocumentInfo documentType
         * @property {number|Long|null} [fileSize] DocumentInfo fileSize
         * @property {string|null} [createdDate] DocumentInfo createdDate
         * @property {string|null} [modifiedDate] DocumentInfo modifiedDate
         * @property {Array.<folder_mcp.IAuthor>|null} [authors] DocumentInfo authors
         * @property {string|null} [title] DocumentInfo title
         * @property {number|null} [pageCount] DocumentInfo pageCount
         * @property {folder_mcp.IMetadata|null} [metadata] DocumentInfo metadata
         */

        /**
         * Constructs a new DocumentInfo.
         * @memberof folder_mcp
         * @classdesc Represents a DocumentInfo.
         * @implements IDocumentInfo
         * @constructor
         * @param {folder_mcp.IDocumentInfo=} [properties] Properties to set
         */
        function DocumentInfo(properties) {
            this.authors = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DocumentInfo documentId.
         * @member {string} documentId
         * @memberof folder_mcp.DocumentInfo
         * @instance
         */
        DocumentInfo.prototype.documentId = "";

        /**
         * DocumentInfo filePath.
         * @member {string} filePath
         * @memberof folder_mcp.DocumentInfo
         * @instance
         */
        DocumentInfo.prototype.filePath = "";

        /**
         * DocumentInfo filename.
         * @member {string} filename
         * @memberof folder_mcp.DocumentInfo
         * @instance
         */
        DocumentInfo.prototype.filename = "";

        /**
         * DocumentInfo documentType.
         * @member {folder_mcp.DocumentType} documentType
         * @memberof folder_mcp.DocumentInfo
         * @instance
         */
        DocumentInfo.prototype.documentType = 0;

        /**
         * DocumentInfo fileSize.
         * @member {number|Long} fileSize
         * @memberof folder_mcp.DocumentInfo
         * @instance
         */
        DocumentInfo.prototype.fileSize = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * DocumentInfo createdDate.
         * @member {string} createdDate
         * @memberof folder_mcp.DocumentInfo
         * @instance
         */
        DocumentInfo.prototype.createdDate = "";

        /**
         * DocumentInfo modifiedDate.
         * @member {string} modifiedDate
         * @memberof folder_mcp.DocumentInfo
         * @instance
         */
        DocumentInfo.prototype.modifiedDate = "";

        /**
         * DocumentInfo authors.
         * @member {Array.<folder_mcp.IAuthor>} authors
         * @memberof folder_mcp.DocumentInfo
         * @instance
         */
        DocumentInfo.prototype.authors = $util.emptyArray;

        /**
         * DocumentInfo title.
         * @member {string} title
         * @memberof folder_mcp.DocumentInfo
         * @instance
         */
        DocumentInfo.prototype.title = "";

        /**
         * DocumentInfo pageCount.
         * @member {number} pageCount
         * @memberof folder_mcp.DocumentInfo
         * @instance
         */
        DocumentInfo.prototype.pageCount = 0;

        /**
         * DocumentInfo metadata.
         * @member {folder_mcp.IMetadata|null|undefined} metadata
         * @memberof folder_mcp.DocumentInfo
         * @instance
         */
        DocumentInfo.prototype.metadata = null;

        /**
         * Creates a new DocumentInfo instance using the specified properties.
         * @function create
         * @memberof folder_mcp.DocumentInfo
         * @static
         * @param {folder_mcp.IDocumentInfo=} [properties] Properties to set
         * @returns {folder_mcp.DocumentInfo} DocumentInfo instance
         */
        DocumentInfo.create = function create(properties) {
            return new DocumentInfo(properties);
        };

        /**
         * Encodes the specified DocumentInfo message. Does not implicitly {@link folder_mcp.DocumentInfo.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.DocumentInfo
         * @static
         * @param {folder_mcp.IDocumentInfo} message DocumentInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DocumentInfo.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documentId != null && Object.hasOwnProperty.call(message, "documentId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.documentId);
            if (message.filePath != null && Object.hasOwnProperty.call(message, "filePath"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.filePath);
            if (message.filename != null && Object.hasOwnProperty.call(message, "filename"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.filename);
            if (message.documentType != null && Object.hasOwnProperty.call(message, "documentType"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.documentType);
            if (message.fileSize != null && Object.hasOwnProperty.call(message, "fileSize"))
                writer.uint32(/* id 5, wireType 0 =*/40).int64(message.fileSize);
            if (message.createdDate != null && Object.hasOwnProperty.call(message, "createdDate"))
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.createdDate);
            if (message.modifiedDate != null && Object.hasOwnProperty.call(message, "modifiedDate"))
                writer.uint32(/* id 7, wireType 2 =*/58).string(message.modifiedDate);
            if (message.authors != null && message.authors.length)
                for (let i = 0; i < message.authors.length; ++i)
                    $root.folder_mcp.Author.encode(message.authors[i], writer.uint32(/* id 8, wireType 2 =*/66).fork()).ldelim();
            if (message.title != null && Object.hasOwnProperty.call(message, "title"))
                writer.uint32(/* id 9, wireType 2 =*/74).string(message.title);
            if (message.pageCount != null && Object.hasOwnProperty.call(message, "pageCount"))
                writer.uint32(/* id 10, wireType 0 =*/80).int32(message.pageCount);
            if (message.metadata != null && Object.hasOwnProperty.call(message, "metadata"))
                $root.folder_mcp.Metadata.encode(message.metadata, writer.uint32(/* id 11, wireType 2 =*/90).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified DocumentInfo message, length delimited. Does not implicitly {@link folder_mcp.DocumentInfo.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.DocumentInfo
         * @static
         * @param {folder_mcp.IDocumentInfo} message DocumentInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DocumentInfo.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DocumentInfo message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.DocumentInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.DocumentInfo} DocumentInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DocumentInfo.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.DocumentInfo();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.documentId = reader.string();
                        break;
                    }
                case 2: {
                        message.filePath = reader.string();
                        break;
                    }
                case 3: {
                        message.filename = reader.string();
                        break;
                    }
                case 4: {
                        message.documentType = reader.int32();
                        break;
                    }
                case 5: {
                        message.fileSize = reader.int64();
                        break;
                    }
                case 6: {
                        message.createdDate = reader.string();
                        break;
                    }
                case 7: {
                        message.modifiedDate = reader.string();
                        break;
                    }
                case 8: {
                        if (!(message.authors && message.authors.length))
                            message.authors = [];
                        message.authors.push($root.folder_mcp.Author.decode(reader, reader.uint32()));
                        break;
                    }
                case 9: {
                        message.title = reader.string();
                        break;
                    }
                case 10: {
                        message.pageCount = reader.int32();
                        break;
                    }
                case 11: {
                        message.metadata = $root.folder_mcp.Metadata.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a DocumentInfo message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.DocumentInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.DocumentInfo} DocumentInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DocumentInfo.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a DocumentInfo message.
         * @function verify
         * @memberof folder_mcp.DocumentInfo
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        DocumentInfo.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                if (!$util.isString(message.documentId))
                    return "documentId: string expected";
            if (message.filePath != null && message.hasOwnProperty("filePath"))
                if (!$util.isString(message.filePath))
                    return "filePath: string expected";
            if (message.filename != null && message.hasOwnProperty("filename"))
                if (!$util.isString(message.filename))
                    return "filename: string expected";
            if (message.documentType != null && message.hasOwnProperty("documentType"))
                switch (message.documentType) {
                default:
                    return "documentType: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                case 8:
                case 9:
                case 10:
                case 11:
                case 12:
                case 13:
                case 14:
                case 15:
                case 16:
                    break;
                }
            if (message.fileSize != null && message.hasOwnProperty("fileSize"))
                if (!$util.isInteger(message.fileSize) && !(message.fileSize && $util.isInteger(message.fileSize.low) && $util.isInteger(message.fileSize.high)))
                    return "fileSize: integer|Long expected";
            if (message.createdDate != null && message.hasOwnProperty("createdDate"))
                if (!$util.isString(message.createdDate))
                    return "createdDate: string expected";
            if (message.modifiedDate != null && message.hasOwnProperty("modifiedDate"))
                if (!$util.isString(message.modifiedDate))
                    return "modifiedDate: string expected";
            if (message.authors != null && message.hasOwnProperty("authors")) {
                if (!Array.isArray(message.authors))
                    return "authors: array expected";
                for (let i = 0; i < message.authors.length; ++i) {
                    let error = $root.folder_mcp.Author.verify(message.authors[i]);
                    if (error)
                        return "authors." + error;
                }
            }
            if (message.title != null && message.hasOwnProperty("title"))
                if (!$util.isString(message.title))
                    return "title: string expected";
            if (message.pageCount != null && message.hasOwnProperty("pageCount"))
                if (!$util.isInteger(message.pageCount))
                    return "pageCount: integer expected";
            if (message.metadata != null && message.hasOwnProperty("metadata")) {
                let error = $root.folder_mcp.Metadata.verify(message.metadata);
                if (error)
                    return "metadata." + error;
            }
            return null;
        };

        /**
         * Creates a DocumentInfo message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.DocumentInfo
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.DocumentInfo} DocumentInfo
         */
        DocumentInfo.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.DocumentInfo)
                return object;
            let message = new $root.folder_mcp.DocumentInfo();
            if (object.documentId != null)
                message.documentId = String(object.documentId);
            if (object.filePath != null)
                message.filePath = String(object.filePath);
            if (object.filename != null)
                message.filename = String(object.filename);
            switch (object.documentType) {
            default:
                if (typeof object.documentType === "number") {
                    message.documentType = object.documentType;
                    break;
                }
                break;
            case "DOCUMENT_TYPE_UNSPECIFIED":
            case 0:
                message.documentType = 0;
                break;
            case "DOCUMENT_TYPE_PDF":
            case 1:
                message.documentType = 1;
                break;
            case "DOCUMENT_TYPE_DOCX":
            case 2:
                message.documentType = 2;
                break;
            case "DOCUMENT_TYPE_DOC":
            case 3:
                message.documentType = 3;
                break;
            case "DOCUMENT_TYPE_XLSX":
            case 4:
                message.documentType = 4;
                break;
            case "DOCUMENT_TYPE_XLS":
            case 5:
                message.documentType = 5;
                break;
            case "DOCUMENT_TYPE_PPTX":
            case 6:
                message.documentType = 6;
                break;
            case "DOCUMENT_TYPE_PPT":
            case 7:
                message.documentType = 7;
                break;
            case "DOCUMENT_TYPE_TXT":
            case 8:
                message.documentType = 8;
                break;
            case "DOCUMENT_TYPE_MD":
            case 9:
                message.documentType = 9;
                break;
            case "DOCUMENT_TYPE_CSV":
            case 10:
                message.documentType = 10;
                break;
            case "DOCUMENT_TYPE_RTF":
            case 11:
                message.documentType = 11;
                break;
            case "DOCUMENT_TYPE_ODT":
            case 12:
                message.documentType = 12;
                break;
            case "DOCUMENT_TYPE_ODS":
            case 13:
                message.documentType = 13;
                break;
            case "DOCUMENT_TYPE_ODP":
            case 14:
                message.documentType = 14;
                break;
            case "DOCUMENT_TYPE_HTML":
            case 15:
                message.documentType = 15;
                break;
            case "DOCUMENT_TYPE_XML":
            case 16:
                message.documentType = 16;
                break;
            }
            if (object.fileSize != null)
                if ($util.Long)
                    (message.fileSize = $util.Long.fromValue(object.fileSize)).unsigned = false;
                else if (typeof object.fileSize === "string")
                    message.fileSize = parseInt(object.fileSize, 10);
                else if (typeof object.fileSize === "number")
                    message.fileSize = object.fileSize;
                else if (typeof object.fileSize === "object")
                    message.fileSize = new $util.LongBits(object.fileSize.low >>> 0, object.fileSize.high >>> 0).toNumber();
            if (object.createdDate != null)
                message.createdDate = String(object.createdDate);
            if (object.modifiedDate != null)
                message.modifiedDate = String(object.modifiedDate);
            if (object.authors) {
                if (!Array.isArray(object.authors))
                    throw TypeError(".folder_mcp.DocumentInfo.authors: array expected");
                message.authors = [];
                for (let i = 0; i < object.authors.length; ++i) {
                    if (typeof object.authors[i] !== "object")
                        throw TypeError(".folder_mcp.DocumentInfo.authors: object expected");
                    message.authors[i] = $root.folder_mcp.Author.fromObject(object.authors[i]);
                }
            }
            if (object.title != null)
                message.title = String(object.title);
            if (object.pageCount != null)
                message.pageCount = object.pageCount | 0;
            if (object.metadata != null) {
                if (typeof object.metadata !== "object")
                    throw TypeError(".folder_mcp.DocumentInfo.metadata: object expected");
                message.metadata = $root.folder_mcp.Metadata.fromObject(object.metadata);
            }
            return message;
        };

        /**
         * Creates a plain object from a DocumentInfo message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.DocumentInfo
         * @static
         * @param {folder_mcp.DocumentInfo} message DocumentInfo
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        DocumentInfo.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.authors = [];
            if (options.defaults) {
                object.documentId = "";
                object.filePath = "";
                object.filename = "";
                object.documentType = options.enums === String ? "DOCUMENT_TYPE_UNSPECIFIED" : 0;
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.fileSize = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.fileSize = options.longs === String ? "0" : 0;
                object.createdDate = "";
                object.modifiedDate = "";
                object.title = "";
                object.pageCount = 0;
                object.metadata = null;
            }
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                object.documentId = message.documentId;
            if (message.filePath != null && message.hasOwnProperty("filePath"))
                object.filePath = message.filePath;
            if (message.filename != null && message.hasOwnProperty("filename"))
                object.filename = message.filename;
            if (message.documentType != null && message.hasOwnProperty("documentType"))
                object.documentType = options.enums === String ? $root.folder_mcp.DocumentType[message.documentType] === undefined ? message.documentType : $root.folder_mcp.DocumentType[message.documentType] : message.documentType;
            if (message.fileSize != null && message.hasOwnProperty("fileSize"))
                if (typeof message.fileSize === "number")
                    object.fileSize = options.longs === String ? String(message.fileSize) : message.fileSize;
                else
                    object.fileSize = options.longs === String ? $util.Long.prototype.toString.call(message.fileSize) : options.longs === Number ? new $util.LongBits(message.fileSize.low >>> 0, message.fileSize.high >>> 0).toNumber() : message.fileSize;
            if (message.createdDate != null && message.hasOwnProperty("createdDate"))
                object.createdDate = message.createdDate;
            if (message.modifiedDate != null && message.hasOwnProperty("modifiedDate"))
                object.modifiedDate = message.modifiedDate;
            if (message.authors && message.authors.length) {
                object.authors = [];
                for (let j = 0; j < message.authors.length; ++j)
                    object.authors[j] = $root.folder_mcp.Author.toObject(message.authors[j], options);
            }
            if (message.title != null && message.hasOwnProperty("title"))
                object.title = message.title;
            if (message.pageCount != null && message.hasOwnProperty("pageCount"))
                object.pageCount = message.pageCount;
            if (message.metadata != null && message.hasOwnProperty("metadata"))
                object.metadata = $root.folder_mcp.Metadata.toObject(message.metadata, options);
            return object;
        };

        /**
         * Converts this DocumentInfo to JSON.
         * @function toJSON
         * @memberof folder_mcp.DocumentInfo
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        DocumentInfo.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for DocumentInfo
         * @function getTypeUrl
         * @memberof folder_mcp.DocumentInfo
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        DocumentInfo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.DocumentInfo";
        };

        return DocumentInfo;
    })();

    folder_mcp.GetDocMetadataRequest = (function() {

        /**
         * Properties of a GetDocMetadataRequest.
         * @memberof folder_mcp
         * @interface IGetDocMetadataRequest
         * @property {string|null} [documentId] GetDocMetadataRequest documentId
         * @property {boolean|null} [includeStructure] GetDocMetadataRequest includeStructure
         */

        /**
         * Constructs a new GetDocMetadataRequest.
         * @memberof folder_mcp
         * @classdesc Represents a GetDocMetadataRequest.
         * @implements IGetDocMetadataRequest
         * @constructor
         * @param {folder_mcp.IGetDocMetadataRequest=} [properties] Properties to set
         */
        function GetDocMetadataRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetDocMetadataRequest documentId.
         * @member {string} documentId
         * @memberof folder_mcp.GetDocMetadataRequest
         * @instance
         */
        GetDocMetadataRequest.prototype.documentId = "";

        /**
         * GetDocMetadataRequest includeStructure.
         * @member {boolean} includeStructure
         * @memberof folder_mcp.GetDocMetadataRequest
         * @instance
         */
        GetDocMetadataRequest.prototype.includeStructure = false;

        /**
         * Creates a new GetDocMetadataRequest instance using the specified properties.
         * @function create
         * @memberof folder_mcp.GetDocMetadataRequest
         * @static
         * @param {folder_mcp.IGetDocMetadataRequest=} [properties] Properties to set
         * @returns {folder_mcp.GetDocMetadataRequest} GetDocMetadataRequest instance
         */
        GetDocMetadataRequest.create = function create(properties) {
            return new GetDocMetadataRequest(properties);
        };

        /**
         * Encodes the specified GetDocMetadataRequest message. Does not implicitly {@link folder_mcp.GetDocMetadataRequest.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.GetDocMetadataRequest
         * @static
         * @param {folder_mcp.IGetDocMetadataRequest} message GetDocMetadataRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetDocMetadataRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documentId != null && Object.hasOwnProperty.call(message, "documentId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.documentId);
            if (message.includeStructure != null && Object.hasOwnProperty.call(message, "includeStructure"))
                writer.uint32(/* id 2, wireType 0 =*/16).bool(message.includeStructure);
            return writer;
        };

        /**
         * Encodes the specified GetDocMetadataRequest message, length delimited. Does not implicitly {@link folder_mcp.GetDocMetadataRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.GetDocMetadataRequest
         * @static
         * @param {folder_mcp.IGetDocMetadataRequest} message GetDocMetadataRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetDocMetadataRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetDocMetadataRequest message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.GetDocMetadataRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.GetDocMetadataRequest} GetDocMetadataRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetDocMetadataRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.GetDocMetadataRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.documentId = reader.string();
                        break;
                    }
                case 2: {
                        message.includeStructure = reader.bool();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetDocMetadataRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.GetDocMetadataRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.GetDocMetadataRequest} GetDocMetadataRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetDocMetadataRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetDocMetadataRequest message.
         * @function verify
         * @memberof folder_mcp.GetDocMetadataRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetDocMetadataRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                if (!$util.isString(message.documentId))
                    return "documentId: string expected";
            if (message.includeStructure != null && message.hasOwnProperty("includeStructure"))
                if (typeof message.includeStructure !== "boolean")
                    return "includeStructure: boolean expected";
            return null;
        };

        /**
         * Creates a GetDocMetadataRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.GetDocMetadataRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.GetDocMetadataRequest} GetDocMetadataRequest
         */
        GetDocMetadataRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.GetDocMetadataRequest)
                return object;
            let message = new $root.folder_mcp.GetDocMetadataRequest();
            if (object.documentId != null)
                message.documentId = String(object.documentId);
            if (object.includeStructure != null)
                message.includeStructure = Boolean(object.includeStructure);
            return message;
        };

        /**
         * Creates a plain object from a GetDocMetadataRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.GetDocMetadataRequest
         * @static
         * @param {folder_mcp.GetDocMetadataRequest} message GetDocMetadataRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetDocMetadataRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.documentId = "";
                object.includeStructure = false;
            }
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                object.documentId = message.documentId;
            if (message.includeStructure != null && message.hasOwnProperty("includeStructure"))
                object.includeStructure = message.includeStructure;
            return object;
        };

        /**
         * Converts this GetDocMetadataRequest to JSON.
         * @function toJSON
         * @memberof folder_mcp.GetDocMetadataRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetDocMetadataRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetDocMetadataRequest
         * @function getTypeUrl
         * @memberof folder_mcp.GetDocMetadataRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetDocMetadataRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.GetDocMetadataRequest";
        };

        return GetDocMetadataRequest;
    })();

    folder_mcp.GetDocMetadataResponse = (function() {

        /**
         * Properties of a GetDocMetadataResponse.
         * @memberof folder_mcp
         * @interface IGetDocMetadataResponse
         * @property {folder_mcp.IDocumentInfo|null} [documentInfo] GetDocMetadataResponse documentInfo
         * @property {folder_mcp.IDocumentStructureEnhanced|null} [structure] GetDocMetadataResponse structure
         * @property {folder_mcp.IResponseStatus|null} [status] GetDocMetadataResponse status
         */

        /**
         * Constructs a new GetDocMetadataResponse.
         * @memberof folder_mcp
         * @classdesc Represents a GetDocMetadataResponse.
         * @implements IGetDocMetadataResponse
         * @constructor
         * @param {folder_mcp.IGetDocMetadataResponse=} [properties] Properties to set
         */
        function GetDocMetadataResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetDocMetadataResponse documentInfo.
         * @member {folder_mcp.IDocumentInfo|null|undefined} documentInfo
         * @memberof folder_mcp.GetDocMetadataResponse
         * @instance
         */
        GetDocMetadataResponse.prototype.documentInfo = null;

        /**
         * GetDocMetadataResponse structure.
         * @member {folder_mcp.IDocumentStructureEnhanced|null|undefined} structure
         * @memberof folder_mcp.GetDocMetadataResponse
         * @instance
         */
        GetDocMetadataResponse.prototype.structure = null;

        /**
         * GetDocMetadataResponse status.
         * @member {folder_mcp.IResponseStatus|null|undefined} status
         * @memberof folder_mcp.GetDocMetadataResponse
         * @instance
         */
        GetDocMetadataResponse.prototype.status = null;

        /**
         * Creates a new GetDocMetadataResponse instance using the specified properties.
         * @function create
         * @memberof folder_mcp.GetDocMetadataResponse
         * @static
         * @param {folder_mcp.IGetDocMetadataResponse=} [properties] Properties to set
         * @returns {folder_mcp.GetDocMetadataResponse} GetDocMetadataResponse instance
         */
        GetDocMetadataResponse.create = function create(properties) {
            return new GetDocMetadataResponse(properties);
        };

        /**
         * Encodes the specified GetDocMetadataResponse message. Does not implicitly {@link folder_mcp.GetDocMetadataResponse.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.GetDocMetadataResponse
         * @static
         * @param {folder_mcp.IGetDocMetadataResponse} message GetDocMetadataResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetDocMetadataResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documentInfo != null && Object.hasOwnProperty.call(message, "documentInfo"))
                $root.folder_mcp.DocumentInfo.encode(message.documentInfo, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.structure != null && Object.hasOwnProperty.call(message, "structure"))
                $root.folder_mcp.DocumentStructureEnhanced.encode(message.structure, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                $root.folder_mcp.ResponseStatus.encode(message.status, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetDocMetadataResponse message, length delimited. Does not implicitly {@link folder_mcp.GetDocMetadataResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.GetDocMetadataResponse
         * @static
         * @param {folder_mcp.IGetDocMetadataResponse} message GetDocMetadataResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetDocMetadataResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetDocMetadataResponse message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.GetDocMetadataResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.GetDocMetadataResponse} GetDocMetadataResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetDocMetadataResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.GetDocMetadataResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.documentInfo = $root.folder_mcp.DocumentInfo.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.structure = $root.folder_mcp.DocumentStructureEnhanced.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.status = $root.folder_mcp.ResponseStatus.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetDocMetadataResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.GetDocMetadataResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.GetDocMetadataResponse} GetDocMetadataResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetDocMetadataResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetDocMetadataResponse message.
         * @function verify
         * @memberof folder_mcp.GetDocMetadataResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetDocMetadataResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documentInfo != null && message.hasOwnProperty("documentInfo")) {
                let error = $root.folder_mcp.DocumentInfo.verify(message.documentInfo);
                if (error)
                    return "documentInfo." + error;
            }
            if (message.structure != null && message.hasOwnProperty("structure")) {
                let error = $root.folder_mcp.DocumentStructureEnhanced.verify(message.structure);
                if (error)
                    return "structure." + error;
            }
            if (message.status != null && message.hasOwnProperty("status")) {
                let error = $root.folder_mcp.ResponseStatus.verify(message.status);
                if (error)
                    return "status." + error;
            }
            return null;
        };

        /**
         * Creates a GetDocMetadataResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.GetDocMetadataResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.GetDocMetadataResponse} GetDocMetadataResponse
         */
        GetDocMetadataResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.GetDocMetadataResponse)
                return object;
            let message = new $root.folder_mcp.GetDocMetadataResponse();
            if (object.documentInfo != null) {
                if (typeof object.documentInfo !== "object")
                    throw TypeError(".folder_mcp.GetDocMetadataResponse.documentInfo: object expected");
                message.documentInfo = $root.folder_mcp.DocumentInfo.fromObject(object.documentInfo);
            }
            if (object.structure != null) {
                if (typeof object.structure !== "object")
                    throw TypeError(".folder_mcp.GetDocMetadataResponse.structure: object expected");
                message.structure = $root.folder_mcp.DocumentStructureEnhanced.fromObject(object.structure);
            }
            if (object.status != null) {
                if (typeof object.status !== "object")
                    throw TypeError(".folder_mcp.GetDocMetadataResponse.status: object expected");
                message.status = $root.folder_mcp.ResponseStatus.fromObject(object.status);
            }
            return message;
        };

        /**
         * Creates a plain object from a GetDocMetadataResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.GetDocMetadataResponse
         * @static
         * @param {folder_mcp.GetDocMetadataResponse} message GetDocMetadataResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetDocMetadataResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.documentInfo = null;
                object.structure = null;
                object.status = null;
            }
            if (message.documentInfo != null && message.hasOwnProperty("documentInfo"))
                object.documentInfo = $root.folder_mcp.DocumentInfo.toObject(message.documentInfo, options);
            if (message.structure != null && message.hasOwnProperty("structure"))
                object.structure = $root.folder_mcp.DocumentStructureEnhanced.toObject(message.structure, options);
            if (message.status != null && message.hasOwnProperty("status"))
                object.status = $root.folder_mcp.ResponseStatus.toObject(message.status, options);
            return object;
        };

        /**
         * Converts this GetDocMetadataResponse to JSON.
         * @function toJSON
         * @memberof folder_mcp.GetDocMetadataResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetDocMetadataResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetDocMetadataResponse
         * @function getTypeUrl
         * @memberof folder_mcp.GetDocMetadataResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetDocMetadataResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.GetDocMetadataResponse";
        };

        return GetDocMetadataResponse;
    })();

    folder_mcp.DocumentStructure = (function() {

        /**
         * Properties of a DocumentStructure.
         * @memberof folder_mcp
         * @interface IDocumentStructure
         * @property {Array.<folder_mcp.ISheetInfo>|null} [sheets] DocumentStructure sheets
         * @property {Array.<folder_mcp.ISlideInfo>|null} [slides] DocumentStructure slides
         * @property {Array.<folder_mcp.IPageInfo>|null} [pages] DocumentStructure pages
         * @property {Array.<folder_mcp.ISectionInfo>|null} [sections] DocumentStructure sections
         */

        /**
         * Constructs a new DocumentStructure.
         * @memberof folder_mcp
         * @classdesc Represents a DocumentStructure.
         * @implements IDocumentStructure
         * @constructor
         * @param {folder_mcp.IDocumentStructure=} [properties] Properties to set
         */
        function DocumentStructure(properties) {
            this.sheets = [];
            this.slides = [];
            this.pages = [];
            this.sections = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DocumentStructure sheets.
         * @member {Array.<folder_mcp.ISheetInfo>} sheets
         * @memberof folder_mcp.DocumentStructure
         * @instance
         */
        DocumentStructure.prototype.sheets = $util.emptyArray;

        /**
         * DocumentStructure slides.
         * @member {Array.<folder_mcp.ISlideInfo>} slides
         * @memberof folder_mcp.DocumentStructure
         * @instance
         */
        DocumentStructure.prototype.slides = $util.emptyArray;

        /**
         * DocumentStructure pages.
         * @member {Array.<folder_mcp.IPageInfo>} pages
         * @memberof folder_mcp.DocumentStructure
         * @instance
         */
        DocumentStructure.prototype.pages = $util.emptyArray;

        /**
         * DocumentStructure sections.
         * @member {Array.<folder_mcp.ISectionInfo>} sections
         * @memberof folder_mcp.DocumentStructure
         * @instance
         */
        DocumentStructure.prototype.sections = $util.emptyArray;

        /**
         * Creates a new DocumentStructure instance using the specified properties.
         * @function create
         * @memberof folder_mcp.DocumentStructure
         * @static
         * @param {folder_mcp.IDocumentStructure=} [properties] Properties to set
         * @returns {folder_mcp.DocumentStructure} DocumentStructure instance
         */
        DocumentStructure.create = function create(properties) {
            return new DocumentStructure(properties);
        };

        /**
         * Encodes the specified DocumentStructure message. Does not implicitly {@link folder_mcp.DocumentStructure.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.DocumentStructure
         * @static
         * @param {folder_mcp.IDocumentStructure} message DocumentStructure message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DocumentStructure.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.sheets != null && message.sheets.length)
                for (let i = 0; i < message.sheets.length; ++i)
                    $root.folder_mcp.SheetInfo.encode(message.sheets[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.slides != null && message.slides.length)
                for (let i = 0; i < message.slides.length; ++i)
                    $root.folder_mcp.SlideInfo.encode(message.slides[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.pages != null && message.pages.length)
                for (let i = 0; i < message.pages.length; ++i)
                    $root.folder_mcp.PageInfo.encode(message.pages[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.sections != null && message.sections.length)
                for (let i = 0; i < message.sections.length; ++i)
                    $root.folder_mcp.SectionInfo.encode(message.sections[i], writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified DocumentStructure message, length delimited. Does not implicitly {@link folder_mcp.DocumentStructure.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.DocumentStructure
         * @static
         * @param {folder_mcp.IDocumentStructure} message DocumentStructure message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DocumentStructure.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DocumentStructure message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.DocumentStructure
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.DocumentStructure} DocumentStructure
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DocumentStructure.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.DocumentStructure();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.sheets && message.sheets.length))
                            message.sheets = [];
                        message.sheets.push($root.folder_mcp.SheetInfo.decode(reader, reader.uint32()));
                        break;
                    }
                case 2: {
                        if (!(message.slides && message.slides.length))
                            message.slides = [];
                        message.slides.push($root.folder_mcp.SlideInfo.decode(reader, reader.uint32()));
                        break;
                    }
                case 3: {
                        if (!(message.pages && message.pages.length))
                            message.pages = [];
                        message.pages.push($root.folder_mcp.PageInfo.decode(reader, reader.uint32()));
                        break;
                    }
                case 4: {
                        if (!(message.sections && message.sections.length))
                            message.sections = [];
                        message.sections.push($root.folder_mcp.SectionInfo.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a DocumentStructure message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.DocumentStructure
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.DocumentStructure} DocumentStructure
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DocumentStructure.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a DocumentStructure message.
         * @function verify
         * @memberof folder_mcp.DocumentStructure
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        DocumentStructure.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.sheets != null && message.hasOwnProperty("sheets")) {
                if (!Array.isArray(message.sheets))
                    return "sheets: array expected";
                for (let i = 0; i < message.sheets.length; ++i) {
                    let error = $root.folder_mcp.SheetInfo.verify(message.sheets[i]);
                    if (error)
                        return "sheets." + error;
                }
            }
            if (message.slides != null && message.hasOwnProperty("slides")) {
                if (!Array.isArray(message.slides))
                    return "slides: array expected";
                for (let i = 0; i < message.slides.length; ++i) {
                    let error = $root.folder_mcp.SlideInfo.verify(message.slides[i]);
                    if (error)
                        return "slides." + error;
                }
            }
            if (message.pages != null && message.hasOwnProperty("pages")) {
                if (!Array.isArray(message.pages))
                    return "pages: array expected";
                for (let i = 0; i < message.pages.length; ++i) {
                    let error = $root.folder_mcp.PageInfo.verify(message.pages[i]);
                    if (error)
                        return "pages." + error;
                }
            }
            if (message.sections != null && message.hasOwnProperty("sections")) {
                if (!Array.isArray(message.sections))
                    return "sections: array expected";
                for (let i = 0; i < message.sections.length; ++i) {
                    let error = $root.folder_mcp.SectionInfo.verify(message.sections[i]);
                    if (error)
                        return "sections." + error;
                }
            }
            return null;
        };

        /**
         * Creates a DocumentStructure message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.DocumentStructure
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.DocumentStructure} DocumentStructure
         */
        DocumentStructure.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.DocumentStructure)
                return object;
            let message = new $root.folder_mcp.DocumentStructure();
            if (object.sheets) {
                if (!Array.isArray(object.sheets))
                    throw TypeError(".folder_mcp.DocumentStructure.sheets: array expected");
                message.sheets = [];
                for (let i = 0; i < object.sheets.length; ++i) {
                    if (typeof object.sheets[i] !== "object")
                        throw TypeError(".folder_mcp.DocumentStructure.sheets: object expected");
                    message.sheets[i] = $root.folder_mcp.SheetInfo.fromObject(object.sheets[i]);
                }
            }
            if (object.slides) {
                if (!Array.isArray(object.slides))
                    throw TypeError(".folder_mcp.DocumentStructure.slides: array expected");
                message.slides = [];
                for (let i = 0; i < object.slides.length; ++i) {
                    if (typeof object.slides[i] !== "object")
                        throw TypeError(".folder_mcp.DocumentStructure.slides: object expected");
                    message.slides[i] = $root.folder_mcp.SlideInfo.fromObject(object.slides[i]);
                }
            }
            if (object.pages) {
                if (!Array.isArray(object.pages))
                    throw TypeError(".folder_mcp.DocumentStructure.pages: array expected");
                message.pages = [];
                for (let i = 0; i < object.pages.length; ++i) {
                    if (typeof object.pages[i] !== "object")
                        throw TypeError(".folder_mcp.DocumentStructure.pages: object expected");
                    message.pages[i] = $root.folder_mcp.PageInfo.fromObject(object.pages[i]);
                }
            }
            if (object.sections) {
                if (!Array.isArray(object.sections))
                    throw TypeError(".folder_mcp.DocumentStructure.sections: array expected");
                message.sections = [];
                for (let i = 0; i < object.sections.length; ++i) {
                    if (typeof object.sections[i] !== "object")
                        throw TypeError(".folder_mcp.DocumentStructure.sections: object expected");
                    message.sections[i] = $root.folder_mcp.SectionInfo.fromObject(object.sections[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a DocumentStructure message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.DocumentStructure
         * @static
         * @param {folder_mcp.DocumentStructure} message DocumentStructure
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        DocumentStructure.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults) {
                object.sheets = [];
                object.slides = [];
                object.pages = [];
                object.sections = [];
            }
            if (message.sheets && message.sheets.length) {
                object.sheets = [];
                for (let j = 0; j < message.sheets.length; ++j)
                    object.sheets[j] = $root.folder_mcp.SheetInfo.toObject(message.sheets[j], options);
            }
            if (message.slides && message.slides.length) {
                object.slides = [];
                for (let j = 0; j < message.slides.length; ++j)
                    object.slides[j] = $root.folder_mcp.SlideInfo.toObject(message.slides[j], options);
            }
            if (message.pages && message.pages.length) {
                object.pages = [];
                for (let j = 0; j < message.pages.length; ++j)
                    object.pages[j] = $root.folder_mcp.PageInfo.toObject(message.pages[j], options);
            }
            if (message.sections && message.sections.length) {
                object.sections = [];
                for (let j = 0; j < message.sections.length; ++j)
                    object.sections[j] = $root.folder_mcp.SectionInfo.toObject(message.sections[j], options);
            }
            return object;
        };

        /**
         * Converts this DocumentStructure to JSON.
         * @function toJSON
         * @memberof folder_mcp.DocumentStructure
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        DocumentStructure.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for DocumentStructure
         * @function getTypeUrl
         * @memberof folder_mcp.DocumentStructure
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        DocumentStructure.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.DocumentStructure";
        };

        return DocumentStructure;
    })();

    folder_mcp.SheetInfo = (function() {

        /**
         * Properties of a SheetInfo.
         * @memberof folder_mcp
         * @interface ISheetInfo
         * @property {string|null} [sheetName] SheetInfo sheetName
         * @property {number|null} [rowCount] SheetInfo rowCount
         * @property {number|null} [columnCount] SheetInfo columnCount
         * @property {Array.<string>|null} [columnHeaders] SheetInfo columnHeaders
         */

        /**
         * Constructs a new SheetInfo.
         * @memberof folder_mcp
         * @classdesc Represents a SheetInfo.
         * @implements ISheetInfo
         * @constructor
         * @param {folder_mcp.ISheetInfo=} [properties] Properties to set
         */
        function SheetInfo(properties) {
            this.columnHeaders = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SheetInfo sheetName.
         * @member {string} sheetName
         * @memberof folder_mcp.SheetInfo
         * @instance
         */
        SheetInfo.prototype.sheetName = "";

        /**
         * SheetInfo rowCount.
         * @member {number} rowCount
         * @memberof folder_mcp.SheetInfo
         * @instance
         */
        SheetInfo.prototype.rowCount = 0;

        /**
         * SheetInfo columnCount.
         * @member {number} columnCount
         * @memberof folder_mcp.SheetInfo
         * @instance
         */
        SheetInfo.prototype.columnCount = 0;

        /**
         * SheetInfo columnHeaders.
         * @member {Array.<string>} columnHeaders
         * @memberof folder_mcp.SheetInfo
         * @instance
         */
        SheetInfo.prototype.columnHeaders = $util.emptyArray;

        /**
         * Creates a new SheetInfo instance using the specified properties.
         * @function create
         * @memberof folder_mcp.SheetInfo
         * @static
         * @param {folder_mcp.ISheetInfo=} [properties] Properties to set
         * @returns {folder_mcp.SheetInfo} SheetInfo instance
         */
        SheetInfo.create = function create(properties) {
            return new SheetInfo(properties);
        };

        /**
         * Encodes the specified SheetInfo message. Does not implicitly {@link folder_mcp.SheetInfo.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.SheetInfo
         * @static
         * @param {folder_mcp.ISheetInfo} message SheetInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SheetInfo.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.sheetName != null && Object.hasOwnProperty.call(message, "sheetName"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.sheetName);
            if (message.rowCount != null && Object.hasOwnProperty.call(message, "rowCount"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.rowCount);
            if (message.columnCount != null && Object.hasOwnProperty.call(message, "columnCount"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.columnCount);
            if (message.columnHeaders != null && message.columnHeaders.length)
                for (let i = 0; i < message.columnHeaders.length; ++i)
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.columnHeaders[i]);
            return writer;
        };

        /**
         * Encodes the specified SheetInfo message, length delimited. Does not implicitly {@link folder_mcp.SheetInfo.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.SheetInfo
         * @static
         * @param {folder_mcp.ISheetInfo} message SheetInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SheetInfo.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SheetInfo message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.SheetInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.SheetInfo} SheetInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SheetInfo.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.SheetInfo();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.sheetName = reader.string();
                        break;
                    }
                case 2: {
                        message.rowCount = reader.int32();
                        break;
                    }
                case 3: {
                        message.columnCount = reader.int32();
                        break;
                    }
                case 4: {
                        if (!(message.columnHeaders && message.columnHeaders.length))
                            message.columnHeaders = [];
                        message.columnHeaders.push(reader.string());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SheetInfo message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.SheetInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.SheetInfo} SheetInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SheetInfo.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SheetInfo message.
         * @function verify
         * @memberof folder_mcp.SheetInfo
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SheetInfo.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.sheetName != null && message.hasOwnProperty("sheetName"))
                if (!$util.isString(message.sheetName))
                    return "sheetName: string expected";
            if (message.rowCount != null && message.hasOwnProperty("rowCount"))
                if (!$util.isInteger(message.rowCount))
                    return "rowCount: integer expected";
            if (message.columnCount != null && message.hasOwnProperty("columnCount"))
                if (!$util.isInteger(message.columnCount))
                    return "columnCount: integer expected";
            if (message.columnHeaders != null && message.hasOwnProperty("columnHeaders")) {
                if (!Array.isArray(message.columnHeaders))
                    return "columnHeaders: array expected";
                for (let i = 0; i < message.columnHeaders.length; ++i)
                    if (!$util.isString(message.columnHeaders[i]))
                        return "columnHeaders: string[] expected";
            }
            return null;
        };

        /**
         * Creates a SheetInfo message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.SheetInfo
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.SheetInfo} SheetInfo
         */
        SheetInfo.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.SheetInfo)
                return object;
            let message = new $root.folder_mcp.SheetInfo();
            if (object.sheetName != null)
                message.sheetName = String(object.sheetName);
            if (object.rowCount != null)
                message.rowCount = object.rowCount | 0;
            if (object.columnCount != null)
                message.columnCount = object.columnCount | 0;
            if (object.columnHeaders) {
                if (!Array.isArray(object.columnHeaders))
                    throw TypeError(".folder_mcp.SheetInfo.columnHeaders: array expected");
                message.columnHeaders = [];
                for (let i = 0; i < object.columnHeaders.length; ++i)
                    message.columnHeaders[i] = String(object.columnHeaders[i]);
            }
            return message;
        };

        /**
         * Creates a plain object from a SheetInfo message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.SheetInfo
         * @static
         * @param {folder_mcp.SheetInfo} message SheetInfo
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SheetInfo.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.columnHeaders = [];
            if (options.defaults) {
                object.sheetName = "";
                object.rowCount = 0;
                object.columnCount = 0;
            }
            if (message.sheetName != null && message.hasOwnProperty("sheetName"))
                object.sheetName = message.sheetName;
            if (message.rowCount != null && message.hasOwnProperty("rowCount"))
                object.rowCount = message.rowCount;
            if (message.columnCount != null && message.hasOwnProperty("columnCount"))
                object.columnCount = message.columnCount;
            if (message.columnHeaders && message.columnHeaders.length) {
                object.columnHeaders = [];
                for (let j = 0; j < message.columnHeaders.length; ++j)
                    object.columnHeaders[j] = message.columnHeaders[j];
            }
            return object;
        };

        /**
         * Converts this SheetInfo to JSON.
         * @function toJSON
         * @memberof folder_mcp.SheetInfo
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SheetInfo.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SheetInfo
         * @function getTypeUrl
         * @memberof folder_mcp.SheetInfo
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SheetInfo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.SheetInfo";
        };

        return SheetInfo;
    })();

    folder_mcp.SlideInfo = (function() {

        /**
         * Properties of a SlideInfo.
         * @memberof folder_mcp
         * @interface ISlideInfo
         * @property {number|null} [slideNumber] SlideInfo slideNumber
         * @property {string|null} [title] SlideInfo title
         * @property {string|null} [layout] SlideInfo layout
         * @property {number|null} [textLength] SlideInfo textLength
         */

        /**
         * Constructs a new SlideInfo.
         * @memberof folder_mcp
         * @classdesc Represents a SlideInfo.
         * @implements ISlideInfo
         * @constructor
         * @param {folder_mcp.ISlideInfo=} [properties] Properties to set
         */
        function SlideInfo(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SlideInfo slideNumber.
         * @member {number} slideNumber
         * @memberof folder_mcp.SlideInfo
         * @instance
         */
        SlideInfo.prototype.slideNumber = 0;

        /**
         * SlideInfo title.
         * @member {string} title
         * @memberof folder_mcp.SlideInfo
         * @instance
         */
        SlideInfo.prototype.title = "";

        /**
         * SlideInfo layout.
         * @member {string} layout
         * @memberof folder_mcp.SlideInfo
         * @instance
         */
        SlideInfo.prototype.layout = "";

        /**
         * SlideInfo textLength.
         * @member {number} textLength
         * @memberof folder_mcp.SlideInfo
         * @instance
         */
        SlideInfo.prototype.textLength = 0;

        /**
         * Creates a new SlideInfo instance using the specified properties.
         * @function create
         * @memberof folder_mcp.SlideInfo
         * @static
         * @param {folder_mcp.ISlideInfo=} [properties] Properties to set
         * @returns {folder_mcp.SlideInfo} SlideInfo instance
         */
        SlideInfo.create = function create(properties) {
            return new SlideInfo(properties);
        };

        /**
         * Encodes the specified SlideInfo message. Does not implicitly {@link folder_mcp.SlideInfo.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.SlideInfo
         * @static
         * @param {folder_mcp.ISlideInfo} message SlideInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SlideInfo.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.slideNumber != null && Object.hasOwnProperty.call(message, "slideNumber"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.slideNumber);
            if (message.title != null && Object.hasOwnProperty.call(message, "title"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.title);
            if (message.layout != null && Object.hasOwnProperty.call(message, "layout"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.layout);
            if (message.textLength != null && Object.hasOwnProperty.call(message, "textLength"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.textLength);
            return writer;
        };

        /**
         * Encodes the specified SlideInfo message, length delimited. Does not implicitly {@link folder_mcp.SlideInfo.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.SlideInfo
         * @static
         * @param {folder_mcp.ISlideInfo} message SlideInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SlideInfo.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SlideInfo message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.SlideInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.SlideInfo} SlideInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SlideInfo.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.SlideInfo();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.slideNumber = reader.int32();
                        break;
                    }
                case 2: {
                        message.title = reader.string();
                        break;
                    }
                case 3: {
                        message.layout = reader.string();
                        break;
                    }
                case 4: {
                        message.textLength = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SlideInfo message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.SlideInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.SlideInfo} SlideInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SlideInfo.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SlideInfo message.
         * @function verify
         * @memberof folder_mcp.SlideInfo
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SlideInfo.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.slideNumber != null && message.hasOwnProperty("slideNumber"))
                if (!$util.isInteger(message.slideNumber))
                    return "slideNumber: integer expected";
            if (message.title != null && message.hasOwnProperty("title"))
                if (!$util.isString(message.title))
                    return "title: string expected";
            if (message.layout != null && message.hasOwnProperty("layout"))
                if (!$util.isString(message.layout))
                    return "layout: string expected";
            if (message.textLength != null && message.hasOwnProperty("textLength"))
                if (!$util.isInteger(message.textLength))
                    return "textLength: integer expected";
            return null;
        };

        /**
         * Creates a SlideInfo message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.SlideInfo
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.SlideInfo} SlideInfo
         */
        SlideInfo.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.SlideInfo)
                return object;
            let message = new $root.folder_mcp.SlideInfo();
            if (object.slideNumber != null)
                message.slideNumber = object.slideNumber | 0;
            if (object.title != null)
                message.title = String(object.title);
            if (object.layout != null)
                message.layout = String(object.layout);
            if (object.textLength != null)
                message.textLength = object.textLength | 0;
            return message;
        };

        /**
         * Creates a plain object from a SlideInfo message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.SlideInfo
         * @static
         * @param {folder_mcp.SlideInfo} message SlideInfo
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SlideInfo.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.slideNumber = 0;
                object.title = "";
                object.layout = "";
                object.textLength = 0;
            }
            if (message.slideNumber != null && message.hasOwnProperty("slideNumber"))
                object.slideNumber = message.slideNumber;
            if (message.title != null && message.hasOwnProperty("title"))
                object.title = message.title;
            if (message.layout != null && message.hasOwnProperty("layout"))
                object.layout = message.layout;
            if (message.textLength != null && message.hasOwnProperty("textLength"))
                object.textLength = message.textLength;
            return object;
        };

        /**
         * Converts this SlideInfo to JSON.
         * @function toJSON
         * @memberof folder_mcp.SlideInfo
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SlideInfo.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SlideInfo
         * @function getTypeUrl
         * @memberof folder_mcp.SlideInfo
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SlideInfo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.SlideInfo";
        };

        return SlideInfo;
    })();

    folder_mcp.PageInfo = (function() {

        /**
         * Properties of a PageInfo.
         * @memberof folder_mcp
         * @interface IPageInfo
         * @property {number|null} [pageNumber] PageInfo pageNumber
         * @property {number|null} [textLength] PageInfo textLength
         * @property {boolean|null} [hasImages] PageInfo hasImages
         * @property {boolean|null} [hasTables] PageInfo hasTables
         */

        /**
         * Constructs a new PageInfo.
         * @memberof folder_mcp
         * @classdesc Represents a PageInfo.
         * @implements IPageInfo
         * @constructor
         * @param {folder_mcp.IPageInfo=} [properties] Properties to set
         */
        function PageInfo(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PageInfo pageNumber.
         * @member {number} pageNumber
         * @memberof folder_mcp.PageInfo
         * @instance
         */
        PageInfo.prototype.pageNumber = 0;

        /**
         * PageInfo textLength.
         * @member {number} textLength
         * @memberof folder_mcp.PageInfo
         * @instance
         */
        PageInfo.prototype.textLength = 0;

        /**
         * PageInfo hasImages.
         * @member {boolean} hasImages
         * @memberof folder_mcp.PageInfo
         * @instance
         */
        PageInfo.prototype.hasImages = false;

        /**
         * PageInfo hasTables.
         * @member {boolean} hasTables
         * @memberof folder_mcp.PageInfo
         * @instance
         */
        PageInfo.prototype.hasTables = false;

        /**
         * Creates a new PageInfo instance using the specified properties.
         * @function create
         * @memberof folder_mcp.PageInfo
         * @static
         * @param {folder_mcp.IPageInfo=} [properties] Properties to set
         * @returns {folder_mcp.PageInfo} PageInfo instance
         */
        PageInfo.create = function create(properties) {
            return new PageInfo(properties);
        };

        /**
         * Encodes the specified PageInfo message. Does not implicitly {@link folder_mcp.PageInfo.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.PageInfo
         * @static
         * @param {folder_mcp.IPageInfo} message PageInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PageInfo.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.pageNumber != null && Object.hasOwnProperty.call(message, "pageNumber"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.pageNumber);
            if (message.textLength != null && Object.hasOwnProperty.call(message, "textLength"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.textLength);
            if (message.hasImages != null && Object.hasOwnProperty.call(message, "hasImages"))
                writer.uint32(/* id 3, wireType 0 =*/24).bool(message.hasImages);
            if (message.hasTables != null && Object.hasOwnProperty.call(message, "hasTables"))
                writer.uint32(/* id 4, wireType 0 =*/32).bool(message.hasTables);
            return writer;
        };

        /**
         * Encodes the specified PageInfo message, length delimited. Does not implicitly {@link folder_mcp.PageInfo.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.PageInfo
         * @static
         * @param {folder_mcp.IPageInfo} message PageInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PageInfo.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PageInfo message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.PageInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.PageInfo} PageInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PageInfo.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.PageInfo();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.pageNumber = reader.int32();
                        break;
                    }
                case 2: {
                        message.textLength = reader.int32();
                        break;
                    }
                case 3: {
                        message.hasImages = reader.bool();
                        break;
                    }
                case 4: {
                        message.hasTables = reader.bool();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PageInfo message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.PageInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.PageInfo} PageInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PageInfo.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PageInfo message.
         * @function verify
         * @memberof folder_mcp.PageInfo
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PageInfo.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.pageNumber != null && message.hasOwnProperty("pageNumber"))
                if (!$util.isInteger(message.pageNumber))
                    return "pageNumber: integer expected";
            if (message.textLength != null && message.hasOwnProperty("textLength"))
                if (!$util.isInteger(message.textLength))
                    return "textLength: integer expected";
            if (message.hasImages != null && message.hasOwnProperty("hasImages"))
                if (typeof message.hasImages !== "boolean")
                    return "hasImages: boolean expected";
            if (message.hasTables != null && message.hasOwnProperty("hasTables"))
                if (typeof message.hasTables !== "boolean")
                    return "hasTables: boolean expected";
            return null;
        };

        /**
         * Creates a PageInfo message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.PageInfo
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.PageInfo} PageInfo
         */
        PageInfo.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.PageInfo)
                return object;
            let message = new $root.folder_mcp.PageInfo();
            if (object.pageNumber != null)
                message.pageNumber = object.pageNumber | 0;
            if (object.textLength != null)
                message.textLength = object.textLength | 0;
            if (object.hasImages != null)
                message.hasImages = Boolean(object.hasImages);
            if (object.hasTables != null)
                message.hasTables = Boolean(object.hasTables);
            return message;
        };

        /**
         * Creates a plain object from a PageInfo message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.PageInfo
         * @static
         * @param {folder_mcp.PageInfo} message PageInfo
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PageInfo.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.pageNumber = 0;
                object.textLength = 0;
                object.hasImages = false;
                object.hasTables = false;
            }
            if (message.pageNumber != null && message.hasOwnProperty("pageNumber"))
                object.pageNumber = message.pageNumber;
            if (message.textLength != null && message.hasOwnProperty("textLength"))
                object.textLength = message.textLength;
            if (message.hasImages != null && message.hasOwnProperty("hasImages"))
                object.hasImages = message.hasImages;
            if (message.hasTables != null && message.hasOwnProperty("hasTables"))
                object.hasTables = message.hasTables;
            return object;
        };

        /**
         * Converts this PageInfo to JSON.
         * @function toJSON
         * @memberof folder_mcp.PageInfo
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PageInfo.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PageInfo
         * @function getTypeUrl
         * @memberof folder_mcp.PageInfo
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PageInfo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.PageInfo";
        };

        return PageInfo;
    })();

    folder_mcp.SectionInfo = (function() {

        /**
         * Properties of a SectionInfo.
         * @memberof folder_mcp
         * @interface ISectionInfo
         * @property {string|null} [sectionTitle] SectionInfo sectionTitle
         * @property {number|null} [level] SectionInfo level
         * @property {number|null} [startOffset] SectionInfo startOffset
         * @property {number|null} [endOffset] SectionInfo endOffset
         */

        /**
         * Constructs a new SectionInfo.
         * @memberof folder_mcp
         * @classdesc Represents a SectionInfo.
         * @implements ISectionInfo
         * @constructor
         * @param {folder_mcp.ISectionInfo=} [properties] Properties to set
         */
        function SectionInfo(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SectionInfo sectionTitle.
         * @member {string} sectionTitle
         * @memberof folder_mcp.SectionInfo
         * @instance
         */
        SectionInfo.prototype.sectionTitle = "";

        /**
         * SectionInfo level.
         * @member {number} level
         * @memberof folder_mcp.SectionInfo
         * @instance
         */
        SectionInfo.prototype.level = 0;

        /**
         * SectionInfo startOffset.
         * @member {number} startOffset
         * @memberof folder_mcp.SectionInfo
         * @instance
         */
        SectionInfo.prototype.startOffset = 0;

        /**
         * SectionInfo endOffset.
         * @member {number} endOffset
         * @memberof folder_mcp.SectionInfo
         * @instance
         */
        SectionInfo.prototype.endOffset = 0;

        /**
         * Creates a new SectionInfo instance using the specified properties.
         * @function create
         * @memberof folder_mcp.SectionInfo
         * @static
         * @param {folder_mcp.ISectionInfo=} [properties] Properties to set
         * @returns {folder_mcp.SectionInfo} SectionInfo instance
         */
        SectionInfo.create = function create(properties) {
            return new SectionInfo(properties);
        };

        /**
         * Encodes the specified SectionInfo message. Does not implicitly {@link folder_mcp.SectionInfo.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.SectionInfo
         * @static
         * @param {folder_mcp.ISectionInfo} message SectionInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SectionInfo.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.sectionTitle != null && Object.hasOwnProperty.call(message, "sectionTitle"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.sectionTitle);
            if (message.level != null && Object.hasOwnProperty.call(message, "level"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.level);
            if (message.startOffset != null && Object.hasOwnProperty.call(message, "startOffset"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.startOffset);
            if (message.endOffset != null && Object.hasOwnProperty.call(message, "endOffset"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.endOffset);
            return writer;
        };

        /**
         * Encodes the specified SectionInfo message, length delimited. Does not implicitly {@link folder_mcp.SectionInfo.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.SectionInfo
         * @static
         * @param {folder_mcp.ISectionInfo} message SectionInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SectionInfo.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SectionInfo message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.SectionInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.SectionInfo} SectionInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SectionInfo.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.SectionInfo();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.sectionTitle = reader.string();
                        break;
                    }
                case 2: {
                        message.level = reader.int32();
                        break;
                    }
                case 3: {
                        message.startOffset = reader.int32();
                        break;
                    }
                case 4: {
                        message.endOffset = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SectionInfo message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.SectionInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.SectionInfo} SectionInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SectionInfo.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SectionInfo message.
         * @function verify
         * @memberof folder_mcp.SectionInfo
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SectionInfo.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.sectionTitle != null && message.hasOwnProperty("sectionTitle"))
                if (!$util.isString(message.sectionTitle))
                    return "sectionTitle: string expected";
            if (message.level != null && message.hasOwnProperty("level"))
                if (!$util.isInteger(message.level))
                    return "level: integer expected";
            if (message.startOffset != null && message.hasOwnProperty("startOffset"))
                if (!$util.isInteger(message.startOffset))
                    return "startOffset: integer expected";
            if (message.endOffset != null && message.hasOwnProperty("endOffset"))
                if (!$util.isInteger(message.endOffset))
                    return "endOffset: integer expected";
            return null;
        };

        /**
         * Creates a SectionInfo message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.SectionInfo
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.SectionInfo} SectionInfo
         */
        SectionInfo.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.SectionInfo)
                return object;
            let message = new $root.folder_mcp.SectionInfo();
            if (object.sectionTitle != null)
                message.sectionTitle = String(object.sectionTitle);
            if (object.level != null)
                message.level = object.level | 0;
            if (object.startOffset != null)
                message.startOffset = object.startOffset | 0;
            if (object.endOffset != null)
                message.endOffset = object.endOffset | 0;
            return message;
        };

        /**
         * Creates a plain object from a SectionInfo message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.SectionInfo
         * @static
         * @param {folder_mcp.SectionInfo} message SectionInfo
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SectionInfo.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.sectionTitle = "";
                object.level = 0;
                object.startOffset = 0;
                object.endOffset = 0;
            }
            if (message.sectionTitle != null && message.hasOwnProperty("sectionTitle"))
                object.sectionTitle = message.sectionTitle;
            if (message.level != null && message.hasOwnProperty("level"))
                object.level = message.level;
            if (message.startOffset != null && message.hasOwnProperty("startOffset"))
                object.startOffset = message.startOffset;
            if (message.endOffset != null && message.hasOwnProperty("endOffset"))
                object.endOffset = message.endOffset;
            return object;
        };

        /**
         * Converts this SectionInfo to JSON.
         * @function toJSON
         * @memberof folder_mcp.SectionInfo
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SectionInfo.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SectionInfo
         * @function getTypeUrl
         * @memberof folder_mcp.SectionInfo
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SectionInfo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.SectionInfo";
        };

        return SectionInfo;
    })();

    folder_mcp.DownloadDocRequest = (function() {

        /**
         * Properties of a DownloadDocRequest.
         * @memberof folder_mcp
         * @interface IDownloadDocRequest
         * @property {string|null} [documentId] DownloadDocRequest documentId
         * @property {string|null} [format] DownloadDocRequest format
         */

        /**
         * Constructs a new DownloadDocRequest.
         * @memberof folder_mcp
         * @classdesc Represents a DownloadDocRequest.
         * @implements IDownloadDocRequest
         * @constructor
         * @param {folder_mcp.IDownloadDocRequest=} [properties] Properties to set
         */
        function DownloadDocRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DownloadDocRequest documentId.
         * @member {string} documentId
         * @memberof folder_mcp.DownloadDocRequest
         * @instance
         */
        DownloadDocRequest.prototype.documentId = "";

        /**
         * DownloadDocRequest format.
         * @member {string} format
         * @memberof folder_mcp.DownloadDocRequest
         * @instance
         */
        DownloadDocRequest.prototype.format = "";

        /**
         * Creates a new DownloadDocRequest instance using the specified properties.
         * @function create
         * @memberof folder_mcp.DownloadDocRequest
         * @static
         * @param {folder_mcp.IDownloadDocRequest=} [properties] Properties to set
         * @returns {folder_mcp.DownloadDocRequest} DownloadDocRequest instance
         */
        DownloadDocRequest.create = function create(properties) {
            return new DownloadDocRequest(properties);
        };

        /**
         * Encodes the specified DownloadDocRequest message. Does not implicitly {@link folder_mcp.DownloadDocRequest.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.DownloadDocRequest
         * @static
         * @param {folder_mcp.IDownloadDocRequest} message DownloadDocRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DownloadDocRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documentId != null && Object.hasOwnProperty.call(message, "documentId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.documentId);
            if (message.format != null && Object.hasOwnProperty.call(message, "format"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.format);
            return writer;
        };

        /**
         * Encodes the specified DownloadDocRequest message, length delimited. Does not implicitly {@link folder_mcp.DownloadDocRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.DownloadDocRequest
         * @static
         * @param {folder_mcp.IDownloadDocRequest} message DownloadDocRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DownloadDocRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DownloadDocRequest message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.DownloadDocRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.DownloadDocRequest} DownloadDocRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DownloadDocRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.DownloadDocRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.documentId = reader.string();
                        break;
                    }
                case 2: {
                        message.format = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a DownloadDocRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.DownloadDocRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.DownloadDocRequest} DownloadDocRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DownloadDocRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a DownloadDocRequest message.
         * @function verify
         * @memberof folder_mcp.DownloadDocRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        DownloadDocRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                if (!$util.isString(message.documentId))
                    return "documentId: string expected";
            if (message.format != null && message.hasOwnProperty("format"))
                if (!$util.isString(message.format))
                    return "format: string expected";
            return null;
        };

        /**
         * Creates a DownloadDocRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.DownloadDocRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.DownloadDocRequest} DownloadDocRequest
         */
        DownloadDocRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.DownloadDocRequest)
                return object;
            let message = new $root.folder_mcp.DownloadDocRequest();
            if (object.documentId != null)
                message.documentId = String(object.documentId);
            if (object.format != null)
                message.format = String(object.format);
            return message;
        };

        /**
         * Creates a plain object from a DownloadDocRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.DownloadDocRequest
         * @static
         * @param {folder_mcp.DownloadDocRequest} message DownloadDocRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        DownloadDocRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.documentId = "";
                object.format = "";
            }
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                object.documentId = message.documentId;
            if (message.format != null && message.hasOwnProperty("format"))
                object.format = message.format;
            return object;
        };

        /**
         * Converts this DownloadDocRequest to JSON.
         * @function toJSON
         * @memberof folder_mcp.DownloadDocRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        DownloadDocRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for DownloadDocRequest
         * @function getTypeUrl
         * @memberof folder_mcp.DownloadDocRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        DownloadDocRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.DownloadDocRequest";
        };

        return DownloadDocRequest;
    })();

    folder_mcp.DownloadDocResponse = (function() {

        /**
         * Properties of a DownloadDocResponse.
         * @memberof folder_mcp
         * @interface IDownloadDocResponse
         * @property {Uint8Array|null} [chunkData] DownloadDocResponse chunkData
         * @property {string|null} [contentType] DownloadDocResponse contentType
         * @property {number|Long|null} [totalSize] DownloadDocResponse totalSize
         * @property {string|null} [filename] DownloadDocResponse filename
         */

        /**
         * Constructs a new DownloadDocResponse.
         * @memberof folder_mcp
         * @classdesc Represents a DownloadDocResponse.
         * @implements IDownloadDocResponse
         * @constructor
         * @param {folder_mcp.IDownloadDocResponse=} [properties] Properties to set
         */
        function DownloadDocResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DownloadDocResponse chunkData.
         * @member {Uint8Array} chunkData
         * @memberof folder_mcp.DownloadDocResponse
         * @instance
         */
        DownloadDocResponse.prototype.chunkData = $util.newBuffer([]);

        /**
         * DownloadDocResponse contentType.
         * @member {string} contentType
         * @memberof folder_mcp.DownloadDocResponse
         * @instance
         */
        DownloadDocResponse.prototype.contentType = "";

        /**
         * DownloadDocResponse totalSize.
         * @member {number|Long} totalSize
         * @memberof folder_mcp.DownloadDocResponse
         * @instance
         */
        DownloadDocResponse.prototype.totalSize = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * DownloadDocResponse filename.
         * @member {string} filename
         * @memberof folder_mcp.DownloadDocResponse
         * @instance
         */
        DownloadDocResponse.prototype.filename = "";

        /**
         * Creates a new DownloadDocResponse instance using the specified properties.
         * @function create
         * @memberof folder_mcp.DownloadDocResponse
         * @static
         * @param {folder_mcp.IDownloadDocResponse=} [properties] Properties to set
         * @returns {folder_mcp.DownloadDocResponse} DownloadDocResponse instance
         */
        DownloadDocResponse.create = function create(properties) {
            return new DownloadDocResponse(properties);
        };

        /**
         * Encodes the specified DownloadDocResponse message. Does not implicitly {@link folder_mcp.DownloadDocResponse.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.DownloadDocResponse
         * @static
         * @param {folder_mcp.IDownloadDocResponse} message DownloadDocResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DownloadDocResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.chunkData != null && Object.hasOwnProperty.call(message, "chunkData"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.chunkData);
            if (message.contentType != null && Object.hasOwnProperty.call(message, "contentType"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.contentType);
            if (message.totalSize != null && Object.hasOwnProperty.call(message, "totalSize"))
                writer.uint32(/* id 3, wireType 0 =*/24).int64(message.totalSize);
            if (message.filename != null && Object.hasOwnProperty.call(message, "filename"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.filename);
            return writer;
        };

        /**
         * Encodes the specified DownloadDocResponse message, length delimited. Does not implicitly {@link folder_mcp.DownloadDocResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.DownloadDocResponse
         * @static
         * @param {folder_mcp.IDownloadDocResponse} message DownloadDocResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DownloadDocResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DownloadDocResponse message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.DownloadDocResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.DownloadDocResponse} DownloadDocResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DownloadDocResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.DownloadDocResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.chunkData = reader.bytes();
                        break;
                    }
                case 2: {
                        message.contentType = reader.string();
                        break;
                    }
                case 3: {
                        message.totalSize = reader.int64();
                        break;
                    }
                case 4: {
                        message.filename = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a DownloadDocResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.DownloadDocResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.DownloadDocResponse} DownloadDocResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DownloadDocResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a DownloadDocResponse message.
         * @function verify
         * @memberof folder_mcp.DownloadDocResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        DownloadDocResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.chunkData != null && message.hasOwnProperty("chunkData"))
                if (!(message.chunkData && typeof message.chunkData.length === "number" || $util.isString(message.chunkData)))
                    return "chunkData: buffer expected";
            if (message.contentType != null && message.hasOwnProperty("contentType"))
                if (!$util.isString(message.contentType))
                    return "contentType: string expected";
            if (message.totalSize != null && message.hasOwnProperty("totalSize"))
                if (!$util.isInteger(message.totalSize) && !(message.totalSize && $util.isInteger(message.totalSize.low) && $util.isInteger(message.totalSize.high)))
                    return "totalSize: integer|Long expected";
            if (message.filename != null && message.hasOwnProperty("filename"))
                if (!$util.isString(message.filename))
                    return "filename: string expected";
            return null;
        };

        /**
         * Creates a DownloadDocResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.DownloadDocResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.DownloadDocResponse} DownloadDocResponse
         */
        DownloadDocResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.DownloadDocResponse)
                return object;
            let message = new $root.folder_mcp.DownloadDocResponse();
            if (object.chunkData != null)
                if (typeof object.chunkData === "string")
                    $util.base64.decode(object.chunkData, message.chunkData = $util.newBuffer($util.base64.length(object.chunkData)), 0);
                else if (object.chunkData.length >= 0)
                    message.chunkData = object.chunkData;
            if (object.contentType != null)
                message.contentType = String(object.contentType);
            if (object.totalSize != null)
                if ($util.Long)
                    (message.totalSize = $util.Long.fromValue(object.totalSize)).unsigned = false;
                else if (typeof object.totalSize === "string")
                    message.totalSize = parseInt(object.totalSize, 10);
                else if (typeof object.totalSize === "number")
                    message.totalSize = object.totalSize;
                else if (typeof object.totalSize === "object")
                    message.totalSize = new $util.LongBits(object.totalSize.low >>> 0, object.totalSize.high >>> 0).toNumber();
            if (object.filename != null)
                message.filename = String(object.filename);
            return message;
        };

        /**
         * Creates a plain object from a DownloadDocResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.DownloadDocResponse
         * @static
         * @param {folder_mcp.DownloadDocResponse} message DownloadDocResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        DownloadDocResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                if (options.bytes === String)
                    object.chunkData = "";
                else {
                    object.chunkData = [];
                    if (options.bytes !== Array)
                        object.chunkData = $util.newBuffer(object.chunkData);
                }
                object.contentType = "";
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.totalSize = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.totalSize = options.longs === String ? "0" : 0;
                object.filename = "";
            }
            if (message.chunkData != null && message.hasOwnProperty("chunkData"))
                object.chunkData = options.bytes === String ? $util.base64.encode(message.chunkData, 0, message.chunkData.length) : options.bytes === Array ? Array.prototype.slice.call(message.chunkData) : message.chunkData;
            if (message.contentType != null && message.hasOwnProperty("contentType"))
                object.contentType = message.contentType;
            if (message.totalSize != null && message.hasOwnProperty("totalSize"))
                if (typeof message.totalSize === "number")
                    object.totalSize = options.longs === String ? String(message.totalSize) : message.totalSize;
                else
                    object.totalSize = options.longs === String ? $util.Long.prototype.toString.call(message.totalSize) : options.longs === Number ? new $util.LongBits(message.totalSize.low >>> 0, message.totalSize.high >>> 0).toNumber() : message.totalSize;
            if (message.filename != null && message.hasOwnProperty("filename"))
                object.filename = message.filename;
            return object;
        };

        /**
         * Converts this DownloadDocResponse to JSON.
         * @function toJSON
         * @memberof folder_mcp.DownloadDocResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        DownloadDocResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for DownloadDocResponse
         * @function getTypeUrl
         * @memberof folder_mcp.DownloadDocResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        DownloadDocResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.DownloadDocResponse";
        };

        return DownloadDocResponse;
    })();

    folder_mcp.GetChunksRequest = (function() {

        /**
         * Properties of a GetChunksRequest.
         * @memberof folder_mcp
         * @interface IGetChunksRequest
         * @property {string|null} [documentId] GetChunksRequest documentId
         * @property {Array.<number>|null} [chunkIndices] GetChunksRequest chunkIndices
         * @property {boolean|null} [includeMetadata] GetChunksRequest includeMetadata
         * @property {number|null} [maxTokensPerChunk] GetChunksRequest maxTokensPerChunk
         */

        /**
         * Constructs a new GetChunksRequest.
         * @memberof folder_mcp
         * @classdesc Represents a GetChunksRequest.
         * @implements IGetChunksRequest
         * @constructor
         * @param {folder_mcp.IGetChunksRequest=} [properties] Properties to set
         */
        function GetChunksRequest(properties) {
            this.chunkIndices = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetChunksRequest documentId.
         * @member {string} documentId
         * @memberof folder_mcp.GetChunksRequest
         * @instance
         */
        GetChunksRequest.prototype.documentId = "";

        /**
         * GetChunksRequest chunkIndices.
         * @member {Array.<number>} chunkIndices
         * @memberof folder_mcp.GetChunksRequest
         * @instance
         */
        GetChunksRequest.prototype.chunkIndices = $util.emptyArray;

        /**
         * GetChunksRequest includeMetadata.
         * @member {boolean} includeMetadata
         * @memberof folder_mcp.GetChunksRequest
         * @instance
         */
        GetChunksRequest.prototype.includeMetadata = false;

        /**
         * GetChunksRequest maxTokensPerChunk.
         * @member {number} maxTokensPerChunk
         * @memberof folder_mcp.GetChunksRequest
         * @instance
         */
        GetChunksRequest.prototype.maxTokensPerChunk = 0;

        /**
         * Creates a new GetChunksRequest instance using the specified properties.
         * @function create
         * @memberof folder_mcp.GetChunksRequest
         * @static
         * @param {folder_mcp.IGetChunksRequest=} [properties] Properties to set
         * @returns {folder_mcp.GetChunksRequest} GetChunksRequest instance
         */
        GetChunksRequest.create = function create(properties) {
            return new GetChunksRequest(properties);
        };

        /**
         * Encodes the specified GetChunksRequest message. Does not implicitly {@link folder_mcp.GetChunksRequest.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.GetChunksRequest
         * @static
         * @param {folder_mcp.IGetChunksRequest} message GetChunksRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetChunksRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documentId != null && Object.hasOwnProperty.call(message, "documentId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.documentId);
            if (message.chunkIndices != null && message.chunkIndices.length) {
                writer.uint32(/* id 2, wireType 2 =*/18).fork();
                for (let i = 0; i < message.chunkIndices.length; ++i)
                    writer.int32(message.chunkIndices[i]);
                writer.ldelim();
            }
            if (message.includeMetadata != null && Object.hasOwnProperty.call(message, "includeMetadata"))
                writer.uint32(/* id 3, wireType 0 =*/24).bool(message.includeMetadata);
            if (message.maxTokensPerChunk != null && Object.hasOwnProperty.call(message, "maxTokensPerChunk"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.maxTokensPerChunk);
            return writer;
        };

        /**
         * Encodes the specified GetChunksRequest message, length delimited. Does not implicitly {@link folder_mcp.GetChunksRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.GetChunksRequest
         * @static
         * @param {folder_mcp.IGetChunksRequest} message GetChunksRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetChunksRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetChunksRequest message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.GetChunksRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.GetChunksRequest} GetChunksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetChunksRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.GetChunksRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.documentId = reader.string();
                        break;
                    }
                case 2: {
                        if (!(message.chunkIndices && message.chunkIndices.length))
                            message.chunkIndices = [];
                        if ((tag & 7) === 2) {
                            let end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.chunkIndices.push(reader.int32());
                        } else
                            message.chunkIndices.push(reader.int32());
                        break;
                    }
                case 3: {
                        message.includeMetadata = reader.bool();
                        break;
                    }
                case 4: {
                        message.maxTokensPerChunk = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetChunksRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.GetChunksRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.GetChunksRequest} GetChunksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetChunksRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetChunksRequest message.
         * @function verify
         * @memberof folder_mcp.GetChunksRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetChunksRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                if (!$util.isString(message.documentId))
                    return "documentId: string expected";
            if (message.chunkIndices != null && message.hasOwnProperty("chunkIndices")) {
                if (!Array.isArray(message.chunkIndices))
                    return "chunkIndices: array expected";
                for (let i = 0; i < message.chunkIndices.length; ++i)
                    if (!$util.isInteger(message.chunkIndices[i]))
                        return "chunkIndices: integer[] expected";
            }
            if (message.includeMetadata != null && message.hasOwnProperty("includeMetadata"))
                if (typeof message.includeMetadata !== "boolean")
                    return "includeMetadata: boolean expected";
            if (message.maxTokensPerChunk != null && message.hasOwnProperty("maxTokensPerChunk"))
                if (!$util.isInteger(message.maxTokensPerChunk))
                    return "maxTokensPerChunk: integer expected";
            return null;
        };

        /**
         * Creates a GetChunksRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.GetChunksRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.GetChunksRequest} GetChunksRequest
         */
        GetChunksRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.GetChunksRequest)
                return object;
            let message = new $root.folder_mcp.GetChunksRequest();
            if (object.documentId != null)
                message.documentId = String(object.documentId);
            if (object.chunkIndices) {
                if (!Array.isArray(object.chunkIndices))
                    throw TypeError(".folder_mcp.GetChunksRequest.chunkIndices: array expected");
                message.chunkIndices = [];
                for (let i = 0; i < object.chunkIndices.length; ++i)
                    message.chunkIndices[i] = object.chunkIndices[i] | 0;
            }
            if (object.includeMetadata != null)
                message.includeMetadata = Boolean(object.includeMetadata);
            if (object.maxTokensPerChunk != null)
                message.maxTokensPerChunk = object.maxTokensPerChunk | 0;
            return message;
        };

        /**
         * Creates a plain object from a GetChunksRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.GetChunksRequest
         * @static
         * @param {folder_mcp.GetChunksRequest} message GetChunksRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetChunksRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.chunkIndices = [];
            if (options.defaults) {
                object.documentId = "";
                object.includeMetadata = false;
                object.maxTokensPerChunk = 0;
            }
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                object.documentId = message.documentId;
            if (message.chunkIndices && message.chunkIndices.length) {
                object.chunkIndices = [];
                for (let j = 0; j < message.chunkIndices.length; ++j)
                    object.chunkIndices[j] = message.chunkIndices[j];
            }
            if (message.includeMetadata != null && message.hasOwnProperty("includeMetadata"))
                object.includeMetadata = message.includeMetadata;
            if (message.maxTokensPerChunk != null && message.hasOwnProperty("maxTokensPerChunk"))
                object.maxTokensPerChunk = message.maxTokensPerChunk;
            return object;
        };

        /**
         * Converts this GetChunksRequest to JSON.
         * @function toJSON
         * @memberof folder_mcp.GetChunksRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetChunksRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetChunksRequest
         * @function getTypeUrl
         * @memberof folder_mcp.GetChunksRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetChunksRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.GetChunksRequest";
        };

        return GetChunksRequest;
    })();

    folder_mcp.GetChunksResponse = (function() {

        /**
         * Properties of a GetChunksResponse.
         * @memberof folder_mcp
         * @interface IGetChunksResponse
         * @property {Array.<folder_mcp.IChunkData>|null} [chunks] GetChunksResponse chunks
         * @property {string|null} [documentId] GetChunksResponse documentId
         * @property {folder_mcp.IResponseStatus|null} [status] GetChunksResponse status
         * @property {number|null} [totalTokenCount] GetChunksResponse totalTokenCount
         */

        /**
         * Constructs a new GetChunksResponse.
         * @memberof folder_mcp
         * @classdesc Represents a GetChunksResponse.
         * @implements IGetChunksResponse
         * @constructor
         * @param {folder_mcp.IGetChunksResponse=} [properties] Properties to set
         */
        function GetChunksResponse(properties) {
            this.chunks = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetChunksResponse chunks.
         * @member {Array.<folder_mcp.IChunkData>} chunks
         * @memberof folder_mcp.GetChunksResponse
         * @instance
         */
        GetChunksResponse.prototype.chunks = $util.emptyArray;

        /**
         * GetChunksResponse documentId.
         * @member {string} documentId
         * @memberof folder_mcp.GetChunksResponse
         * @instance
         */
        GetChunksResponse.prototype.documentId = "";

        /**
         * GetChunksResponse status.
         * @member {folder_mcp.IResponseStatus|null|undefined} status
         * @memberof folder_mcp.GetChunksResponse
         * @instance
         */
        GetChunksResponse.prototype.status = null;

        /**
         * GetChunksResponse totalTokenCount.
         * @member {number} totalTokenCount
         * @memberof folder_mcp.GetChunksResponse
         * @instance
         */
        GetChunksResponse.prototype.totalTokenCount = 0;

        /**
         * Creates a new GetChunksResponse instance using the specified properties.
         * @function create
         * @memberof folder_mcp.GetChunksResponse
         * @static
         * @param {folder_mcp.IGetChunksResponse=} [properties] Properties to set
         * @returns {folder_mcp.GetChunksResponse} GetChunksResponse instance
         */
        GetChunksResponse.create = function create(properties) {
            return new GetChunksResponse(properties);
        };

        /**
         * Encodes the specified GetChunksResponse message. Does not implicitly {@link folder_mcp.GetChunksResponse.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.GetChunksResponse
         * @static
         * @param {folder_mcp.IGetChunksResponse} message GetChunksResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetChunksResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.chunks != null && message.chunks.length)
                for (let i = 0; i < message.chunks.length; ++i)
                    $root.folder_mcp.ChunkData.encode(message.chunks[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.documentId != null && Object.hasOwnProperty.call(message, "documentId"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.documentId);
            if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                $root.folder_mcp.ResponseStatus.encode(message.status, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.totalTokenCount != null && Object.hasOwnProperty.call(message, "totalTokenCount"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.totalTokenCount);
            return writer;
        };

        /**
         * Encodes the specified GetChunksResponse message, length delimited. Does not implicitly {@link folder_mcp.GetChunksResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.GetChunksResponse
         * @static
         * @param {folder_mcp.IGetChunksResponse} message GetChunksResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetChunksResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetChunksResponse message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.GetChunksResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.GetChunksResponse} GetChunksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetChunksResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.GetChunksResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.chunks && message.chunks.length))
                            message.chunks = [];
                        message.chunks.push($root.folder_mcp.ChunkData.decode(reader, reader.uint32()));
                        break;
                    }
                case 2: {
                        message.documentId = reader.string();
                        break;
                    }
                case 3: {
                        message.status = $root.folder_mcp.ResponseStatus.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.totalTokenCount = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetChunksResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.GetChunksResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.GetChunksResponse} GetChunksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetChunksResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetChunksResponse message.
         * @function verify
         * @memberof folder_mcp.GetChunksResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetChunksResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.chunks != null && message.hasOwnProperty("chunks")) {
                if (!Array.isArray(message.chunks))
                    return "chunks: array expected";
                for (let i = 0; i < message.chunks.length; ++i) {
                    let error = $root.folder_mcp.ChunkData.verify(message.chunks[i]);
                    if (error)
                        return "chunks." + error;
                }
            }
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                if (!$util.isString(message.documentId))
                    return "documentId: string expected";
            if (message.status != null && message.hasOwnProperty("status")) {
                let error = $root.folder_mcp.ResponseStatus.verify(message.status);
                if (error)
                    return "status." + error;
            }
            if (message.totalTokenCount != null && message.hasOwnProperty("totalTokenCount"))
                if (!$util.isInteger(message.totalTokenCount))
                    return "totalTokenCount: integer expected";
            return null;
        };

        /**
         * Creates a GetChunksResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.GetChunksResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.GetChunksResponse} GetChunksResponse
         */
        GetChunksResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.GetChunksResponse)
                return object;
            let message = new $root.folder_mcp.GetChunksResponse();
            if (object.chunks) {
                if (!Array.isArray(object.chunks))
                    throw TypeError(".folder_mcp.GetChunksResponse.chunks: array expected");
                message.chunks = [];
                for (let i = 0; i < object.chunks.length; ++i) {
                    if (typeof object.chunks[i] !== "object")
                        throw TypeError(".folder_mcp.GetChunksResponse.chunks: object expected");
                    message.chunks[i] = $root.folder_mcp.ChunkData.fromObject(object.chunks[i]);
                }
            }
            if (object.documentId != null)
                message.documentId = String(object.documentId);
            if (object.status != null) {
                if (typeof object.status !== "object")
                    throw TypeError(".folder_mcp.GetChunksResponse.status: object expected");
                message.status = $root.folder_mcp.ResponseStatus.fromObject(object.status);
            }
            if (object.totalTokenCount != null)
                message.totalTokenCount = object.totalTokenCount | 0;
            return message;
        };

        /**
         * Creates a plain object from a GetChunksResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.GetChunksResponse
         * @static
         * @param {folder_mcp.GetChunksResponse} message GetChunksResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetChunksResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.chunks = [];
            if (options.defaults) {
                object.documentId = "";
                object.status = null;
                object.totalTokenCount = 0;
            }
            if (message.chunks && message.chunks.length) {
                object.chunks = [];
                for (let j = 0; j < message.chunks.length; ++j)
                    object.chunks[j] = $root.folder_mcp.ChunkData.toObject(message.chunks[j], options);
            }
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                object.documentId = message.documentId;
            if (message.status != null && message.hasOwnProperty("status"))
                object.status = $root.folder_mcp.ResponseStatus.toObject(message.status, options);
            if (message.totalTokenCount != null && message.hasOwnProperty("totalTokenCount"))
                object.totalTokenCount = message.totalTokenCount;
            return object;
        };

        /**
         * Converts this GetChunksResponse to JSON.
         * @function toJSON
         * @memberof folder_mcp.GetChunksResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetChunksResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetChunksResponse
         * @function getTypeUrl
         * @memberof folder_mcp.GetChunksResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetChunksResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.GetChunksResponse";
        };

        return GetChunksResponse;
    })();

    folder_mcp.ChunkData = (function() {

        /**
         * Properties of a ChunkData.
         * @memberof folder_mcp
         * @interface IChunkData
         * @property {string|null} [chunkId] ChunkData chunkId
         * @property {number|null} [chunkIndex] ChunkData chunkIndex
         * @property {string|null} [content] ChunkData content
         * @property {number|null} [startOffset] ChunkData startOffset
         * @property {number|null} [endOffset] ChunkData endOffset
         * @property {number|null} [tokenCount] ChunkData tokenCount
         * @property {folder_mcp.IMetadata|null} [metadata] ChunkData metadata
         */

        /**
         * Constructs a new ChunkData.
         * @memberof folder_mcp
         * @classdesc Represents a ChunkData.
         * @implements IChunkData
         * @constructor
         * @param {folder_mcp.IChunkData=} [properties] Properties to set
         */
        function ChunkData(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ChunkData chunkId.
         * @member {string} chunkId
         * @memberof folder_mcp.ChunkData
         * @instance
         */
        ChunkData.prototype.chunkId = "";

        /**
         * ChunkData chunkIndex.
         * @member {number} chunkIndex
         * @memberof folder_mcp.ChunkData
         * @instance
         */
        ChunkData.prototype.chunkIndex = 0;

        /**
         * ChunkData content.
         * @member {string} content
         * @memberof folder_mcp.ChunkData
         * @instance
         */
        ChunkData.prototype.content = "";

        /**
         * ChunkData startOffset.
         * @member {number} startOffset
         * @memberof folder_mcp.ChunkData
         * @instance
         */
        ChunkData.prototype.startOffset = 0;

        /**
         * ChunkData endOffset.
         * @member {number} endOffset
         * @memberof folder_mcp.ChunkData
         * @instance
         */
        ChunkData.prototype.endOffset = 0;

        /**
         * ChunkData tokenCount.
         * @member {number} tokenCount
         * @memberof folder_mcp.ChunkData
         * @instance
         */
        ChunkData.prototype.tokenCount = 0;

        /**
         * ChunkData metadata.
         * @member {folder_mcp.IMetadata|null|undefined} metadata
         * @memberof folder_mcp.ChunkData
         * @instance
         */
        ChunkData.prototype.metadata = null;

        /**
         * Creates a new ChunkData instance using the specified properties.
         * @function create
         * @memberof folder_mcp.ChunkData
         * @static
         * @param {folder_mcp.IChunkData=} [properties] Properties to set
         * @returns {folder_mcp.ChunkData} ChunkData instance
         */
        ChunkData.create = function create(properties) {
            return new ChunkData(properties);
        };

        /**
         * Encodes the specified ChunkData message. Does not implicitly {@link folder_mcp.ChunkData.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.ChunkData
         * @static
         * @param {folder_mcp.IChunkData} message ChunkData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ChunkData.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.chunkId != null && Object.hasOwnProperty.call(message, "chunkId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.chunkId);
            if (message.chunkIndex != null && Object.hasOwnProperty.call(message, "chunkIndex"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.chunkIndex);
            if (message.content != null && Object.hasOwnProperty.call(message, "content"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.content);
            if (message.startOffset != null && Object.hasOwnProperty.call(message, "startOffset"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.startOffset);
            if (message.endOffset != null && Object.hasOwnProperty.call(message, "endOffset"))
                writer.uint32(/* id 5, wireType 0 =*/40).int32(message.endOffset);
            if (message.tokenCount != null && Object.hasOwnProperty.call(message, "tokenCount"))
                writer.uint32(/* id 6, wireType 0 =*/48).int32(message.tokenCount);
            if (message.metadata != null && Object.hasOwnProperty.call(message, "metadata"))
                $root.folder_mcp.Metadata.encode(message.metadata, writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified ChunkData message, length delimited. Does not implicitly {@link folder_mcp.ChunkData.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.ChunkData
         * @static
         * @param {folder_mcp.IChunkData} message ChunkData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ChunkData.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ChunkData message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.ChunkData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.ChunkData} ChunkData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ChunkData.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.ChunkData();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.chunkId = reader.string();
                        break;
                    }
                case 2: {
                        message.chunkIndex = reader.int32();
                        break;
                    }
                case 3: {
                        message.content = reader.string();
                        break;
                    }
                case 4: {
                        message.startOffset = reader.int32();
                        break;
                    }
                case 5: {
                        message.endOffset = reader.int32();
                        break;
                    }
                case 6: {
                        message.tokenCount = reader.int32();
                        break;
                    }
                case 7: {
                        message.metadata = $root.folder_mcp.Metadata.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ChunkData message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.ChunkData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.ChunkData} ChunkData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ChunkData.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ChunkData message.
         * @function verify
         * @memberof folder_mcp.ChunkData
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ChunkData.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.chunkId != null && message.hasOwnProperty("chunkId"))
                if (!$util.isString(message.chunkId))
                    return "chunkId: string expected";
            if (message.chunkIndex != null && message.hasOwnProperty("chunkIndex"))
                if (!$util.isInteger(message.chunkIndex))
                    return "chunkIndex: integer expected";
            if (message.content != null && message.hasOwnProperty("content"))
                if (!$util.isString(message.content))
                    return "content: string expected";
            if (message.startOffset != null && message.hasOwnProperty("startOffset"))
                if (!$util.isInteger(message.startOffset))
                    return "startOffset: integer expected";
            if (message.endOffset != null && message.hasOwnProperty("endOffset"))
                if (!$util.isInteger(message.endOffset))
                    return "endOffset: integer expected";
            if (message.tokenCount != null && message.hasOwnProperty("tokenCount"))
                if (!$util.isInteger(message.tokenCount))
                    return "tokenCount: integer expected";
            if (message.metadata != null && message.hasOwnProperty("metadata")) {
                let error = $root.folder_mcp.Metadata.verify(message.metadata);
                if (error)
                    return "metadata." + error;
            }
            return null;
        };

        /**
         * Creates a ChunkData message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.ChunkData
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.ChunkData} ChunkData
         */
        ChunkData.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.ChunkData)
                return object;
            let message = new $root.folder_mcp.ChunkData();
            if (object.chunkId != null)
                message.chunkId = String(object.chunkId);
            if (object.chunkIndex != null)
                message.chunkIndex = object.chunkIndex | 0;
            if (object.content != null)
                message.content = String(object.content);
            if (object.startOffset != null)
                message.startOffset = object.startOffset | 0;
            if (object.endOffset != null)
                message.endOffset = object.endOffset | 0;
            if (object.tokenCount != null)
                message.tokenCount = object.tokenCount | 0;
            if (object.metadata != null) {
                if (typeof object.metadata !== "object")
                    throw TypeError(".folder_mcp.ChunkData.metadata: object expected");
                message.metadata = $root.folder_mcp.Metadata.fromObject(object.metadata);
            }
            return message;
        };

        /**
         * Creates a plain object from a ChunkData message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.ChunkData
         * @static
         * @param {folder_mcp.ChunkData} message ChunkData
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ChunkData.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.chunkId = "";
                object.chunkIndex = 0;
                object.content = "";
                object.startOffset = 0;
                object.endOffset = 0;
                object.tokenCount = 0;
                object.metadata = null;
            }
            if (message.chunkId != null && message.hasOwnProperty("chunkId"))
                object.chunkId = message.chunkId;
            if (message.chunkIndex != null && message.hasOwnProperty("chunkIndex"))
                object.chunkIndex = message.chunkIndex;
            if (message.content != null && message.hasOwnProperty("content"))
                object.content = message.content;
            if (message.startOffset != null && message.hasOwnProperty("startOffset"))
                object.startOffset = message.startOffset;
            if (message.endOffset != null && message.hasOwnProperty("endOffset"))
                object.endOffset = message.endOffset;
            if (message.tokenCount != null && message.hasOwnProperty("tokenCount"))
                object.tokenCount = message.tokenCount;
            if (message.metadata != null && message.hasOwnProperty("metadata"))
                object.metadata = $root.folder_mcp.Metadata.toObject(message.metadata, options);
            return object;
        };

        /**
         * Converts this ChunkData to JSON.
         * @function toJSON
         * @memberof folder_mcp.ChunkData
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ChunkData.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ChunkData
         * @function getTypeUrl
         * @memberof folder_mcp.ChunkData
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ChunkData.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.ChunkData";
        };

        return ChunkData;
    })();

    folder_mcp.GetDocSummaryRequest = (function() {

        /**
         * Properties of a GetDocSummaryRequest.
         * @memberof folder_mcp
         * @interface IGetDocSummaryRequest
         * @property {string|null} [documentId] GetDocSummaryRequest documentId
         * @property {folder_mcp.SummaryMode|null} [mode] GetDocSummaryRequest mode
         * @property {Array.<string>|null} [focusAreas] GetDocSummaryRequest focusAreas
         * @property {number|null} [maxTokens] GetDocSummaryRequest maxTokens
         */

        /**
         * Constructs a new GetDocSummaryRequest.
         * @memberof folder_mcp
         * @classdesc Represents a GetDocSummaryRequest.
         * @implements IGetDocSummaryRequest
         * @constructor
         * @param {folder_mcp.IGetDocSummaryRequest=} [properties] Properties to set
         */
        function GetDocSummaryRequest(properties) {
            this.focusAreas = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetDocSummaryRequest documentId.
         * @member {string} documentId
         * @memberof folder_mcp.GetDocSummaryRequest
         * @instance
         */
        GetDocSummaryRequest.prototype.documentId = "";

        /**
         * GetDocSummaryRequest mode.
         * @member {folder_mcp.SummaryMode} mode
         * @memberof folder_mcp.GetDocSummaryRequest
         * @instance
         */
        GetDocSummaryRequest.prototype.mode = 0;

        /**
         * GetDocSummaryRequest focusAreas.
         * @member {Array.<string>} focusAreas
         * @memberof folder_mcp.GetDocSummaryRequest
         * @instance
         */
        GetDocSummaryRequest.prototype.focusAreas = $util.emptyArray;

        /**
         * GetDocSummaryRequest maxTokens.
         * @member {number} maxTokens
         * @memberof folder_mcp.GetDocSummaryRequest
         * @instance
         */
        GetDocSummaryRequest.prototype.maxTokens = 0;

        /**
         * Creates a new GetDocSummaryRequest instance using the specified properties.
         * @function create
         * @memberof folder_mcp.GetDocSummaryRequest
         * @static
         * @param {folder_mcp.IGetDocSummaryRequest=} [properties] Properties to set
         * @returns {folder_mcp.GetDocSummaryRequest} GetDocSummaryRequest instance
         */
        GetDocSummaryRequest.create = function create(properties) {
            return new GetDocSummaryRequest(properties);
        };

        /**
         * Encodes the specified GetDocSummaryRequest message. Does not implicitly {@link folder_mcp.GetDocSummaryRequest.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.GetDocSummaryRequest
         * @static
         * @param {folder_mcp.IGetDocSummaryRequest} message GetDocSummaryRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetDocSummaryRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documentId != null && Object.hasOwnProperty.call(message, "documentId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.documentId);
            if (message.mode != null && Object.hasOwnProperty.call(message, "mode"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.mode);
            if (message.focusAreas != null && message.focusAreas.length)
                for (let i = 0; i < message.focusAreas.length; ++i)
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.focusAreas[i]);
            if (message.maxTokens != null && Object.hasOwnProperty.call(message, "maxTokens"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.maxTokens);
            return writer;
        };

        /**
         * Encodes the specified GetDocSummaryRequest message, length delimited. Does not implicitly {@link folder_mcp.GetDocSummaryRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.GetDocSummaryRequest
         * @static
         * @param {folder_mcp.IGetDocSummaryRequest} message GetDocSummaryRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetDocSummaryRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetDocSummaryRequest message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.GetDocSummaryRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.GetDocSummaryRequest} GetDocSummaryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetDocSummaryRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.GetDocSummaryRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.documentId = reader.string();
                        break;
                    }
                case 2: {
                        message.mode = reader.int32();
                        break;
                    }
                case 3: {
                        if (!(message.focusAreas && message.focusAreas.length))
                            message.focusAreas = [];
                        message.focusAreas.push(reader.string());
                        break;
                    }
                case 4: {
                        message.maxTokens = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetDocSummaryRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.GetDocSummaryRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.GetDocSummaryRequest} GetDocSummaryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetDocSummaryRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetDocSummaryRequest message.
         * @function verify
         * @memberof folder_mcp.GetDocSummaryRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetDocSummaryRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                if (!$util.isString(message.documentId))
                    return "documentId: string expected";
            if (message.mode != null && message.hasOwnProperty("mode"))
                switch (message.mode) {
                default:
                    return "mode: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                    break;
                }
            if (message.focusAreas != null && message.hasOwnProperty("focusAreas")) {
                if (!Array.isArray(message.focusAreas))
                    return "focusAreas: array expected";
                for (let i = 0; i < message.focusAreas.length; ++i)
                    if (!$util.isString(message.focusAreas[i]))
                        return "focusAreas: string[] expected";
            }
            if (message.maxTokens != null && message.hasOwnProperty("maxTokens"))
                if (!$util.isInteger(message.maxTokens))
                    return "maxTokens: integer expected";
            return null;
        };

        /**
         * Creates a GetDocSummaryRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.GetDocSummaryRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.GetDocSummaryRequest} GetDocSummaryRequest
         */
        GetDocSummaryRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.GetDocSummaryRequest)
                return object;
            let message = new $root.folder_mcp.GetDocSummaryRequest();
            if (object.documentId != null)
                message.documentId = String(object.documentId);
            switch (object.mode) {
            default:
                if (typeof object.mode === "number") {
                    message.mode = object.mode;
                    break;
                }
                break;
            case "SUMMARY_MODE_UNSPECIFIED":
            case 0:
                message.mode = 0;
                break;
            case "SUMMARY_MODE_BRIEF":
            case 1:
                message.mode = 1;
                break;
            case "SUMMARY_MODE_DETAILED":
            case 2:
                message.mode = 2;
                break;
            case "SUMMARY_MODE_EXECUTIVE":
            case 3:
                message.mode = 3;
                break;
            case "SUMMARY_MODE_TECHNICAL":
            case 4:
                message.mode = 4;
                break;
            }
            if (object.focusAreas) {
                if (!Array.isArray(object.focusAreas))
                    throw TypeError(".folder_mcp.GetDocSummaryRequest.focusAreas: array expected");
                message.focusAreas = [];
                for (let i = 0; i < object.focusAreas.length; ++i)
                    message.focusAreas[i] = String(object.focusAreas[i]);
            }
            if (object.maxTokens != null)
                message.maxTokens = object.maxTokens | 0;
            return message;
        };

        /**
         * Creates a plain object from a GetDocSummaryRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.GetDocSummaryRequest
         * @static
         * @param {folder_mcp.GetDocSummaryRequest} message GetDocSummaryRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetDocSummaryRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.focusAreas = [];
            if (options.defaults) {
                object.documentId = "";
                object.mode = options.enums === String ? "SUMMARY_MODE_UNSPECIFIED" : 0;
                object.maxTokens = 0;
            }
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                object.documentId = message.documentId;
            if (message.mode != null && message.hasOwnProperty("mode"))
                object.mode = options.enums === String ? $root.folder_mcp.SummaryMode[message.mode] === undefined ? message.mode : $root.folder_mcp.SummaryMode[message.mode] : message.mode;
            if (message.focusAreas && message.focusAreas.length) {
                object.focusAreas = [];
                for (let j = 0; j < message.focusAreas.length; ++j)
                    object.focusAreas[j] = message.focusAreas[j];
            }
            if (message.maxTokens != null && message.hasOwnProperty("maxTokens"))
                object.maxTokens = message.maxTokens;
            return object;
        };

        /**
         * Converts this GetDocSummaryRequest to JSON.
         * @function toJSON
         * @memberof folder_mcp.GetDocSummaryRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetDocSummaryRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetDocSummaryRequest
         * @function getTypeUrl
         * @memberof folder_mcp.GetDocSummaryRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetDocSummaryRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.GetDocSummaryRequest";
        };

        return GetDocSummaryRequest;
    })();

    folder_mcp.GetDocSummaryResponse = (function() {

        /**
         * Properties of a GetDocSummaryResponse.
         * @memberof folder_mcp
         * @interface IGetDocSummaryResponse
         * @property {string|null} [summary] GetDocSummaryResponse summary
         * @property {Array.<folder_mcp.ISourceRange>|null} [sourceRanges] GetDocSummaryResponse sourceRanges
         * @property {folder_mcp.SummaryMode|null} [mode] GetDocSummaryResponse mode
         * @property {number|null} [tokenCount] GetDocSummaryResponse tokenCount
         * @property {number|null} [confidenceScore] GetDocSummaryResponse confidenceScore
         * @property {folder_mcp.IResponseStatus|null} [status] GetDocSummaryResponse status
         */

        /**
         * Constructs a new GetDocSummaryResponse.
         * @memberof folder_mcp
         * @classdesc Represents a GetDocSummaryResponse.
         * @implements IGetDocSummaryResponse
         * @constructor
         * @param {folder_mcp.IGetDocSummaryResponse=} [properties] Properties to set
         */
        function GetDocSummaryResponse(properties) {
            this.sourceRanges = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetDocSummaryResponse summary.
         * @member {string} summary
         * @memberof folder_mcp.GetDocSummaryResponse
         * @instance
         */
        GetDocSummaryResponse.prototype.summary = "";

        /**
         * GetDocSummaryResponse sourceRanges.
         * @member {Array.<folder_mcp.ISourceRange>} sourceRanges
         * @memberof folder_mcp.GetDocSummaryResponse
         * @instance
         */
        GetDocSummaryResponse.prototype.sourceRanges = $util.emptyArray;

        /**
         * GetDocSummaryResponse mode.
         * @member {folder_mcp.SummaryMode} mode
         * @memberof folder_mcp.GetDocSummaryResponse
         * @instance
         */
        GetDocSummaryResponse.prototype.mode = 0;

        /**
         * GetDocSummaryResponse tokenCount.
         * @member {number} tokenCount
         * @memberof folder_mcp.GetDocSummaryResponse
         * @instance
         */
        GetDocSummaryResponse.prototype.tokenCount = 0;

        /**
         * GetDocSummaryResponse confidenceScore.
         * @member {number} confidenceScore
         * @memberof folder_mcp.GetDocSummaryResponse
         * @instance
         */
        GetDocSummaryResponse.prototype.confidenceScore = 0;

        /**
         * GetDocSummaryResponse status.
         * @member {folder_mcp.IResponseStatus|null|undefined} status
         * @memberof folder_mcp.GetDocSummaryResponse
         * @instance
         */
        GetDocSummaryResponse.prototype.status = null;

        /**
         * Creates a new GetDocSummaryResponse instance using the specified properties.
         * @function create
         * @memberof folder_mcp.GetDocSummaryResponse
         * @static
         * @param {folder_mcp.IGetDocSummaryResponse=} [properties] Properties to set
         * @returns {folder_mcp.GetDocSummaryResponse} GetDocSummaryResponse instance
         */
        GetDocSummaryResponse.create = function create(properties) {
            return new GetDocSummaryResponse(properties);
        };

        /**
         * Encodes the specified GetDocSummaryResponse message. Does not implicitly {@link folder_mcp.GetDocSummaryResponse.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.GetDocSummaryResponse
         * @static
         * @param {folder_mcp.IGetDocSummaryResponse} message GetDocSummaryResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetDocSummaryResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.summary != null && Object.hasOwnProperty.call(message, "summary"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.summary);
            if (message.sourceRanges != null && message.sourceRanges.length)
                for (let i = 0; i < message.sourceRanges.length; ++i)
                    $root.folder_mcp.SourceRange.encode(message.sourceRanges[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.mode != null && Object.hasOwnProperty.call(message, "mode"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.mode);
            if (message.tokenCount != null && Object.hasOwnProperty.call(message, "tokenCount"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.tokenCount);
            if (message.confidenceScore != null && Object.hasOwnProperty.call(message, "confidenceScore"))
                writer.uint32(/* id 5, wireType 5 =*/45).float(message.confidenceScore);
            if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                $root.folder_mcp.ResponseStatus.encode(message.status, writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetDocSummaryResponse message, length delimited. Does not implicitly {@link folder_mcp.GetDocSummaryResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.GetDocSummaryResponse
         * @static
         * @param {folder_mcp.IGetDocSummaryResponse} message GetDocSummaryResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetDocSummaryResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetDocSummaryResponse message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.GetDocSummaryResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.GetDocSummaryResponse} GetDocSummaryResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetDocSummaryResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.GetDocSummaryResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.summary = reader.string();
                        break;
                    }
                case 2: {
                        if (!(message.sourceRanges && message.sourceRanges.length))
                            message.sourceRanges = [];
                        message.sourceRanges.push($root.folder_mcp.SourceRange.decode(reader, reader.uint32()));
                        break;
                    }
                case 3: {
                        message.mode = reader.int32();
                        break;
                    }
                case 4: {
                        message.tokenCount = reader.int32();
                        break;
                    }
                case 5: {
                        message.confidenceScore = reader.float();
                        break;
                    }
                case 6: {
                        message.status = $root.folder_mcp.ResponseStatus.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetDocSummaryResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.GetDocSummaryResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.GetDocSummaryResponse} GetDocSummaryResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetDocSummaryResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetDocSummaryResponse message.
         * @function verify
         * @memberof folder_mcp.GetDocSummaryResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetDocSummaryResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.summary != null && message.hasOwnProperty("summary"))
                if (!$util.isString(message.summary))
                    return "summary: string expected";
            if (message.sourceRanges != null && message.hasOwnProperty("sourceRanges")) {
                if (!Array.isArray(message.sourceRanges))
                    return "sourceRanges: array expected";
                for (let i = 0; i < message.sourceRanges.length; ++i) {
                    let error = $root.folder_mcp.SourceRange.verify(message.sourceRanges[i]);
                    if (error)
                        return "sourceRanges." + error;
                }
            }
            if (message.mode != null && message.hasOwnProperty("mode"))
                switch (message.mode) {
                default:
                    return "mode: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                    break;
                }
            if (message.tokenCount != null && message.hasOwnProperty("tokenCount"))
                if (!$util.isInteger(message.tokenCount))
                    return "tokenCount: integer expected";
            if (message.confidenceScore != null && message.hasOwnProperty("confidenceScore"))
                if (typeof message.confidenceScore !== "number")
                    return "confidenceScore: number expected";
            if (message.status != null && message.hasOwnProperty("status")) {
                let error = $root.folder_mcp.ResponseStatus.verify(message.status);
                if (error)
                    return "status." + error;
            }
            return null;
        };

        /**
         * Creates a GetDocSummaryResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.GetDocSummaryResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.GetDocSummaryResponse} GetDocSummaryResponse
         */
        GetDocSummaryResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.GetDocSummaryResponse)
                return object;
            let message = new $root.folder_mcp.GetDocSummaryResponse();
            if (object.summary != null)
                message.summary = String(object.summary);
            if (object.sourceRanges) {
                if (!Array.isArray(object.sourceRanges))
                    throw TypeError(".folder_mcp.GetDocSummaryResponse.sourceRanges: array expected");
                message.sourceRanges = [];
                for (let i = 0; i < object.sourceRanges.length; ++i) {
                    if (typeof object.sourceRanges[i] !== "object")
                        throw TypeError(".folder_mcp.GetDocSummaryResponse.sourceRanges: object expected");
                    message.sourceRanges[i] = $root.folder_mcp.SourceRange.fromObject(object.sourceRanges[i]);
                }
            }
            switch (object.mode) {
            default:
                if (typeof object.mode === "number") {
                    message.mode = object.mode;
                    break;
                }
                break;
            case "SUMMARY_MODE_UNSPECIFIED":
            case 0:
                message.mode = 0;
                break;
            case "SUMMARY_MODE_BRIEF":
            case 1:
                message.mode = 1;
                break;
            case "SUMMARY_MODE_DETAILED":
            case 2:
                message.mode = 2;
                break;
            case "SUMMARY_MODE_EXECUTIVE":
            case 3:
                message.mode = 3;
                break;
            case "SUMMARY_MODE_TECHNICAL":
            case 4:
                message.mode = 4;
                break;
            }
            if (object.tokenCount != null)
                message.tokenCount = object.tokenCount | 0;
            if (object.confidenceScore != null)
                message.confidenceScore = Number(object.confidenceScore);
            if (object.status != null) {
                if (typeof object.status !== "object")
                    throw TypeError(".folder_mcp.GetDocSummaryResponse.status: object expected");
                message.status = $root.folder_mcp.ResponseStatus.fromObject(object.status);
            }
            return message;
        };

        /**
         * Creates a plain object from a GetDocSummaryResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.GetDocSummaryResponse
         * @static
         * @param {folder_mcp.GetDocSummaryResponse} message GetDocSummaryResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetDocSummaryResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.sourceRanges = [];
            if (options.defaults) {
                object.summary = "";
                object.mode = options.enums === String ? "SUMMARY_MODE_UNSPECIFIED" : 0;
                object.tokenCount = 0;
                object.confidenceScore = 0;
                object.status = null;
            }
            if (message.summary != null && message.hasOwnProperty("summary"))
                object.summary = message.summary;
            if (message.sourceRanges && message.sourceRanges.length) {
                object.sourceRanges = [];
                for (let j = 0; j < message.sourceRanges.length; ++j)
                    object.sourceRanges[j] = $root.folder_mcp.SourceRange.toObject(message.sourceRanges[j], options);
            }
            if (message.mode != null && message.hasOwnProperty("mode"))
                object.mode = options.enums === String ? $root.folder_mcp.SummaryMode[message.mode] === undefined ? message.mode : $root.folder_mcp.SummaryMode[message.mode] : message.mode;
            if (message.tokenCount != null && message.hasOwnProperty("tokenCount"))
                object.tokenCount = message.tokenCount;
            if (message.confidenceScore != null && message.hasOwnProperty("confidenceScore"))
                object.confidenceScore = options.json && !isFinite(message.confidenceScore) ? String(message.confidenceScore) : message.confidenceScore;
            if (message.status != null && message.hasOwnProperty("status"))
                object.status = $root.folder_mcp.ResponseStatus.toObject(message.status, options);
            return object;
        };

        /**
         * Converts this GetDocSummaryResponse to JSON.
         * @function toJSON
         * @memberof folder_mcp.GetDocSummaryResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetDocSummaryResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetDocSummaryResponse
         * @function getTypeUrl
         * @memberof folder_mcp.GetDocSummaryResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetDocSummaryResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.GetDocSummaryResponse";
        };

        return GetDocSummaryResponse;
    })();

    folder_mcp.SourceRange = (function() {

        /**
         * Properties of a SourceRange.
         * @memberof folder_mcp
         * @interface ISourceRange
         * @property {number|null} [startOffset] SourceRange startOffset
         * @property {number|null} [endOffset] SourceRange endOffset
         * @property {string|null} [sourceText] SourceRange sourceText
         * @property {number|null} [pageNumber] SourceRange pageNumber
         * @property {string|null} [sectionTitle] SourceRange sectionTitle
         */

        /**
         * Constructs a new SourceRange.
         * @memberof folder_mcp
         * @classdesc Represents a SourceRange.
         * @implements ISourceRange
         * @constructor
         * @param {folder_mcp.ISourceRange=} [properties] Properties to set
         */
        function SourceRange(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SourceRange startOffset.
         * @member {number} startOffset
         * @memberof folder_mcp.SourceRange
         * @instance
         */
        SourceRange.prototype.startOffset = 0;

        /**
         * SourceRange endOffset.
         * @member {number} endOffset
         * @memberof folder_mcp.SourceRange
         * @instance
         */
        SourceRange.prototype.endOffset = 0;

        /**
         * SourceRange sourceText.
         * @member {string} sourceText
         * @memberof folder_mcp.SourceRange
         * @instance
         */
        SourceRange.prototype.sourceText = "";

        /**
         * SourceRange pageNumber.
         * @member {number} pageNumber
         * @memberof folder_mcp.SourceRange
         * @instance
         */
        SourceRange.prototype.pageNumber = 0;

        /**
         * SourceRange sectionTitle.
         * @member {string} sectionTitle
         * @memberof folder_mcp.SourceRange
         * @instance
         */
        SourceRange.prototype.sectionTitle = "";

        /**
         * Creates a new SourceRange instance using the specified properties.
         * @function create
         * @memberof folder_mcp.SourceRange
         * @static
         * @param {folder_mcp.ISourceRange=} [properties] Properties to set
         * @returns {folder_mcp.SourceRange} SourceRange instance
         */
        SourceRange.create = function create(properties) {
            return new SourceRange(properties);
        };

        /**
         * Encodes the specified SourceRange message. Does not implicitly {@link folder_mcp.SourceRange.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.SourceRange
         * @static
         * @param {folder_mcp.ISourceRange} message SourceRange message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SourceRange.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.startOffset != null && Object.hasOwnProperty.call(message, "startOffset"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.startOffset);
            if (message.endOffset != null && Object.hasOwnProperty.call(message, "endOffset"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.endOffset);
            if (message.sourceText != null && Object.hasOwnProperty.call(message, "sourceText"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.sourceText);
            if (message.pageNumber != null && Object.hasOwnProperty.call(message, "pageNumber"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.pageNumber);
            if (message.sectionTitle != null && Object.hasOwnProperty.call(message, "sectionTitle"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.sectionTitle);
            return writer;
        };

        /**
         * Encodes the specified SourceRange message, length delimited. Does not implicitly {@link folder_mcp.SourceRange.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.SourceRange
         * @static
         * @param {folder_mcp.ISourceRange} message SourceRange message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SourceRange.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SourceRange message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.SourceRange
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.SourceRange} SourceRange
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SourceRange.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.SourceRange();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.startOffset = reader.int32();
                        break;
                    }
                case 2: {
                        message.endOffset = reader.int32();
                        break;
                    }
                case 3: {
                        message.sourceText = reader.string();
                        break;
                    }
                case 4: {
                        message.pageNumber = reader.int32();
                        break;
                    }
                case 5: {
                        message.sectionTitle = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SourceRange message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.SourceRange
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.SourceRange} SourceRange
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SourceRange.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SourceRange message.
         * @function verify
         * @memberof folder_mcp.SourceRange
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SourceRange.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.startOffset != null && message.hasOwnProperty("startOffset"))
                if (!$util.isInteger(message.startOffset))
                    return "startOffset: integer expected";
            if (message.endOffset != null && message.hasOwnProperty("endOffset"))
                if (!$util.isInteger(message.endOffset))
                    return "endOffset: integer expected";
            if (message.sourceText != null && message.hasOwnProperty("sourceText"))
                if (!$util.isString(message.sourceText))
                    return "sourceText: string expected";
            if (message.pageNumber != null && message.hasOwnProperty("pageNumber"))
                if (!$util.isInteger(message.pageNumber))
                    return "pageNumber: integer expected";
            if (message.sectionTitle != null && message.hasOwnProperty("sectionTitle"))
                if (!$util.isString(message.sectionTitle))
                    return "sectionTitle: string expected";
            return null;
        };

        /**
         * Creates a SourceRange message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.SourceRange
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.SourceRange} SourceRange
         */
        SourceRange.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.SourceRange)
                return object;
            let message = new $root.folder_mcp.SourceRange();
            if (object.startOffset != null)
                message.startOffset = object.startOffset | 0;
            if (object.endOffset != null)
                message.endOffset = object.endOffset | 0;
            if (object.sourceText != null)
                message.sourceText = String(object.sourceText);
            if (object.pageNumber != null)
                message.pageNumber = object.pageNumber | 0;
            if (object.sectionTitle != null)
                message.sectionTitle = String(object.sectionTitle);
            return message;
        };

        /**
         * Creates a plain object from a SourceRange message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.SourceRange
         * @static
         * @param {folder_mcp.SourceRange} message SourceRange
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SourceRange.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.startOffset = 0;
                object.endOffset = 0;
                object.sourceText = "";
                object.pageNumber = 0;
                object.sectionTitle = "";
            }
            if (message.startOffset != null && message.hasOwnProperty("startOffset"))
                object.startOffset = message.startOffset;
            if (message.endOffset != null && message.hasOwnProperty("endOffset"))
                object.endOffset = message.endOffset;
            if (message.sourceText != null && message.hasOwnProperty("sourceText"))
                object.sourceText = message.sourceText;
            if (message.pageNumber != null && message.hasOwnProperty("pageNumber"))
                object.pageNumber = message.pageNumber;
            if (message.sectionTitle != null && message.hasOwnProperty("sectionTitle"))
                object.sectionTitle = message.sectionTitle;
            return object;
        };

        /**
         * Converts this SourceRange to JSON.
         * @function toJSON
         * @memberof folder_mcp.SourceRange
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SourceRange.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SourceRange
         * @function getTypeUrl
         * @memberof folder_mcp.SourceRange
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SourceRange.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.SourceRange";
        };

        return SourceRange;
    })();

    folder_mcp.BatchDocSummaryRequest = (function() {

        /**
         * Properties of a BatchDocSummaryRequest.
         * @memberof folder_mcp
         * @interface IBatchDocSummaryRequest
         * @property {Array.<string>|null} [documentIds] BatchDocSummaryRequest documentIds
         * @property {folder_mcp.SummaryMode|null} [mode] BatchDocSummaryRequest mode
         * @property {number|null} [maxTotalTokens] BatchDocSummaryRequest maxTotalTokens
         * @property {boolean|null} [includeCrossReferences] BatchDocSummaryRequest includeCrossReferences
         */

        /**
         * Constructs a new BatchDocSummaryRequest.
         * @memberof folder_mcp
         * @classdesc Represents a BatchDocSummaryRequest.
         * @implements IBatchDocSummaryRequest
         * @constructor
         * @param {folder_mcp.IBatchDocSummaryRequest=} [properties] Properties to set
         */
        function BatchDocSummaryRequest(properties) {
            this.documentIds = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * BatchDocSummaryRequest documentIds.
         * @member {Array.<string>} documentIds
         * @memberof folder_mcp.BatchDocSummaryRequest
         * @instance
         */
        BatchDocSummaryRequest.prototype.documentIds = $util.emptyArray;

        /**
         * BatchDocSummaryRequest mode.
         * @member {folder_mcp.SummaryMode} mode
         * @memberof folder_mcp.BatchDocSummaryRequest
         * @instance
         */
        BatchDocSummaryRequest.prototype.mode = 0;

        /**
         * BatchDocSummaryRequest maxTotalTokens.
         * @member {number} maxTotalTokens
         * @memberof folder_mcp.BatchDocSummaryRequest
         * @instance
         */
        BatchDocSummaryRequest.prototype.maxTotalTokens = 0;

        /**
         * BatchDocSummaryRequest includeCrossReferences.
         * @member {boolean} includeCrossReferences
         * @memberof folder_mcp.BatchDocSummaryRequest
         * @instance
         */
        BatchDocSummaryRequest.prototype.includeCrossReferences = false;

        /**
         * Creates a new BatchDocSummaryRequest instance using the specified properties.
         * @function create
         * @memberof folder_mcp.BatchDocSummaryRequest
         * @static
         * @param {folder_mcp.IBatchDocSummaryRequest=} [properties] Properties to set
         * @returns {folder_mcp.BatchDocSummaryRequest} BatchDocSummaryRequest instance
         */
        BatchDocSummaryRequest.create = function create(properties) {
            return new BatchDocSummaryRequest(properties);
        };

        /**
         * Encodes the specified BatchDocSummaryRequest message. Does not implicitly {@link folder_mcp.BatchDocSummaryRequest.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.BatchDocSummaryRequest
         * @static
         * @param {folder_mcp.IBatchDocSummaryRequest} message BatchDocSummaryRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BatchDocSummaryRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documentIds != null && message.documentIds.length)
                for (let i = 0; i < message.documentIds.length; ++i)
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.documentIds[i]);
            if (message.mode != null && Object.hasOwnProperty.call(message, "mode"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.mode);
            if (message.maxTotalTokens != null && Object.hasOwnProperty.call(message, "maxTotalTokens"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.maxTotalTokens);
            if (message.includeCrossReferences != null && Object.hasOwnProperty.call(message, "includeCrossReferences"))
                writer.uint32(/* id 4, wireType 0 =*/32).bool(message.includeCrossReferences);
            return writer;
        };

        /**
         * Encodes the specified BatchDocSummaryRequest message, length delimited. Does not implicitly {@link folder_mcp.BatchDocSummaryRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.BatchDocSummaryRequest
         * @static
         * @param {folder_mcp.IBatchDocSummaryRequest} message BatchDocSummaryRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BatchDocSummaryRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a BatchDocSummaryRequest message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.BatchDocSummaryRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.BatchDocSummaryRequest} BatchDocSummaryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BatchDocSummaryRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.BatchDocSummaryRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.documentIds && message.documentIds.length))
                            message.documentIds = [];
                        message.documentIds.push(reader.string());
                        break;
                    }
                case 2: {
                        message.mode = reader.int32();
                        break;
                    }
                case 3: {
                        message.maxTotalTokens = reader.int32();
                        break;
                    }
                case 4: {
                        message.includeCrossReferences = reader.bool();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a BatchDocSummaryRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.BatchDocSummaryRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.BatchDocSummaryRequest} BatchDocSummaryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BatchDocSummaryRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a BatchDocSummaryRequest message.
         * @function verify
         * @memberof folder_mcp.BatchDocSummaryRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        BatchDocSummaryRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documentIds != null && message.hasOwnProperty("documentIds")) {
                if (!Array.isArray(message.documentIds))
                    return "documentIds: array expected";
                for (let i = 0; i < message.documentIds.length; ++i)
                    if (!$util.isString(message.documentIds[i]))
                        return "documentIds: string[] expected";
            }
            if (message.mode != null && message.hasOwnProperty("mode"))
                switch (message.mode) {
                default:
                    return "mode: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                    break;
                }
            if (message.maxTotalTokens != null && message.hasOwnProperty("maxTotalTokens"))
                if (!$util.isInteger(message.maxTotalTokens))
                    return "maxTotalTokens: integer expected";
            if (message.includeCrossReferences != null && message.hasOwnProperty("includeCrossReferences"))
                if (typeof message.includeCrossReferences !== "boolean")
                    return "includeCrossReferences: boolean expected";
            return null;
        };

        /**
         * Creates a BatchDocSummaryRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.BatchDocSummaryRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.BatchDocSummaryRequest} BatchDocSummaryRequest
         */
        BatchDocSummaryRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.BatchDocSummaryRequest)
                return object;
            let message = new $root.folder_mcp.BatchDocSummaryRequest();
            if (object.documentIds) {
                if (!Array.isArray(object.documentIds))
                    throw TypeError(".folder_mcp.BatchDocSummaryRequest.documentIds: array expected");
                message.documentIds = [];
                for (let i = 0; i < object.documentIds.length; ++i)
                    message.documentIds[i] = String(object.documentIds[i]);
            }
            switch (object.mode) {
            default:
                if (typeof object.mode === "number") {
                    message.mode = object.mode;
                    break;
                }
                break;
            case "SUMMARY_MODE_UNSPECIFIED":
            case 0:
                message.mode = 0;
                break;
            case "SUMMARY_MODE_BRIEF":
            case 1:
                message.mode = 1;
                break;
            case "SUMMARY_MODE_DETAILED":
            case 2:
                message.mode = 2;
                break;
            case "SUMMARY_MODE_EXECUTIVE":
            case 3:
                message.mode = 3;
                break;
            case "SUMMARY_MODE_TECHNICAL":
            case 4:
                message.mode = 4;
                break;
            }
            if (object.maxTotalTokens != null)
                message.maxTotalTokens = object.maxTotalTokens | 0;
            if (object.includeCrossReferences != null)
                message.includeCrossReferences = Boolean(object.includeCrossReferences);
            return message;
        };

        /**
         * Creates a plain object from a BatchDocSummaryRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.BatchDocSummaryRequest
         * @static
         * @param {folder_mcp.BatchDocSummaryRequest} message BatchDocSummaryRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        BatchDocSummaryRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.documentIds = [];
            if (options.defaults) {
                object.mode = options.enums === String ? "SUMMARY_MODE_UNSPECIFIED" : 0;
                object.maxTotalTokens = 0;
                object.includeCrossReferences = false;
            }
            if (message.documentIds && message.documentIds.length) {
                object.documentIds = [];
                for (let j = 0; j < message.documentIds.length; ++j)
                    object.documentIds[j] = message.documentIds[j];
            }
            if (message.mode != null && message.hasOwnProperty("mode"))
                object.mode = options.enums === String ? $root.folder_mcp.SummaryMode[message.mode] === undefined ? message.mode : $root.folder_mcp.SummaryMode[message.mode] : message.mode;
            if (message.maxTotalTokens != null && message.hasOwnProperty("maxTotalTokens"))
                object.maxTotalTokens = message.maxTotalTokens;
            if (message.includeCrossReferences != null && message.hasOwnProperty("includeCrossReferences"))
                object.includeCrossReferences = message.includeCrossReferences;
            return object;
        };

        /**
         * Converts this BatchDocSummaryRequest to JSON.
         * @function toJSON
         * @memberof folder_mcp.BatchDocSummaryRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        BatchDocSummaryRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for BatchDocSummaryRequest
         * @function getTypeUrl
         * @memberof folder_mcp.BatchDocSummaryRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        BatchDocSummaryRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.BatchDocSummaryRequest";
        };

        return BatchDocSummaryRequest;
    })();

    folder_mcp.BatchDocSummaryResponse = (function() {

        /**
         * Properties of a BatchDocSummaryResponse.
         * @memberof folder_mcp
         * @interface IBatchDocSummaryResponse
         * @property {Array.<folder_mcp.IDocumentSummary>|null} [summaries] BatchDocSummaryResponse summaries
         * @property {number|null} [totalTokens] BatchDocSummaryResponse totalTokens
         * @property {Array.<folder_mcp.ICrossReference>|null} [crossReferences] BatchDocSummaryResponse crossReferences
         * @property {folder_mcp.IResponseStatus|null} [status] BatchDocSummaryResponse status
         * @property {folder_mcp.IProcessingStats|null} [processingStats] BatchDocSummaryResponse processingStats
         */

        /**
         * Constructs a new BatchDocSummaryResponse.
         * @memberof folder_mcp
         * @classdesc Represents a BatchDocSummaryResponse.
         * @implements IBatchDocSummaryResponse
         * @constructor
         * @param {folder_mcp.IBatchDocSummaryResponse=} [properties] Properties to set
         */
        function BatchDocSummaryResponse(properties) {
            this.summaries = [];
            this.crossReferences = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * BatchDocSummaryResponse summaries.
         * @member {Array.<folder_mcp.IDocumentSummary>} summaries
         * @memberof folder_mcp.BatchDocSummaryResponse
         * @instance
         */
        BatchDocSummaryResponse.prototype.summaries = $util.emptyArray;

        /**
         * BatchDocSummaryResponse totalTokens.
         * @member {number} totalTokens
         * @memberof folder_mcp.BatchDocSummaryResponse
         * @instance
         */
        BatchDocSummaryResponse.prototype.totalTokens = 0;

        /**
         * BatchDocSummaryResponse crossReferences.
         * @member {Array.<folder_mcp.ICrossReference>} crossReferences
         * @memberof folder_mcp.BatchDocSummaryResponse
         * @instance
         */
        BatchDocSummaryResponse.prototype.crossReferences = $util.emptyArray;

        /**
         * BatchDocSummaryResponse status.
         * @member {folder_mcp.IResponseStatus|null|undefined} status
         * @memberof folder_mcp.BatchDocSummaryResponse
         * @instance
         */
        BatchDocSummaryResponse.prototype.status = null;

        /**
         * BatchDocSummaryResponse processingStats.
         * @member {folder_mcp.IProcessingStats|null|undefined} processingStats
         * @memberof folder_mcp.BatchDocSummaryResponse
         * @instance
         */
        BatchDocSummaryResponse.prototype.processingStats = null;

        /**
         * Creates a new BatchDocSummaryResponse instance using the specified properties.
         * @function create
         * @memberof folder_mcp.BatchDocSummaryResponse
         * @static
         * @param {folder_mcp.IBatchDocSummaryResponse=} [properties] Properties to set
         * @returns {folder_mcp.BatchDocSummaryResponse} BatchDocSummaryResponse instance
         */
        BatchDocSummaryResponse.create = function create(properties) {
            return new BatchDocSummaryResponse(properties);
        };

        /**
         * Encodes the specified BatchDocSummaryResponse message. Does not implicitly {@link folder_mcp.BatchDocSummaryResponse.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.BatchDocSummaryResponse
         * @static
         * @param {folder_mcp.IBatchDocSummaryResponse} message BatchDocSummaryResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BatchDocSummaryResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.summaries != null && message.summaries.length)
                for (let i = 0; i < message.summaries.length; ++i)
                    $root.folder_mcp.DocumentSummary.encode(message.summaries[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.totalTokens != null && Object.hasOwnProperty.call(message, "totalTokens"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.totalTokens);
            if (message.crossReferences != null && message.crossReferences.length)
                for (let i = 0; i < message.crossReferences.length; ++i)
                    $root.folder_mcp.CrossReference.encode(message.crossReferences[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                $root.folder_mcp.ResponseStatus.encode(message.status, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            if (message.processingStats != null && Object.hasOwnProperty.call(message, "processingStats"))
                $root.folder_mcp.ProcessingStats.encode(message.processingStats, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified BatchDocSummaryResponse message, length delimited. Does not implicitly {@link folder_mcp.BatchDocSummaryResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.BatchDocSummaryResponse
         * @static
         * @param {folder_mcp.IBatchDocSummaryResponse} message BatchDocSummaryResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BatchDocSummaryResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a BatchDocSummaryResponse message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.BatchDocSummaryResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.BatchDocSummaryResponse} BatchDocSummaryResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BatchDocSummaryResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.BatchDocSummaryResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.summaries && message.summaries.length))
                            message.summaries = [];
                        message.summaries.push($root.folder_mcp.DocumentSummary.decode(reader, reader.uint32()));
                        break;
                    }
                case 2: {
                        message.totalTokens = reader.int32();
                        break;
                    }
                case 3: {
                        if (!(message.crossReferences && message.crossReferences.length))
                            message.crossReferences = [];
                        message.crossReferences.push($root.folder_mcp.CrossReference.decode(reader, reader.uint32()));
                        break;
                    }
                case 4: {
                        message.status = $root.folder_mcp.ResponseStatus.decode(reader, reader.uint32());
                        break;
                    }
                case 5: {
                        message.processingStats = $root.folder_mcp.ProcessingStats.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a BatchDocSummaryResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.BatchDocSummaryResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.BatchDocSummaryResponse} BatchDocSummaryResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BatchDocSummaryResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a BatchDocSummaryResponse message.
         * @function verify
         * @memberof folder_mcp.BatchDocSummaryResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        BatchDocSummaryResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.summaries != null && message.hasOwnProperty("summaries")) {
                if (!Array.isArray(message.summaries))
                    return "summaries: array expected";
                for (let i = 0; i < message.summaries.length; ++i) {
                    let error = $root.folder_mcp.DocumentSummary.verify(message.summaries[i]);
                    if (error)
                        return "summaries." + error;
                }
            }
            if (message.totalTokens != null && message.hasOwnProperty("totalTokens"))
                if (!$util.isInteger(message.totalTokens))
                    return "totalTokens: integer expected";
            if (message.crossReferences != null && message.hasOwnProperty("crossReferences")) {
                if (!Array.isArray(message.crossReferences))
                    return "crossReferences: array expected";
                for (let i = 0; i < message.crossReferences.length; ++i) {
                    let error = $root.folder_mcp.CrossReference.verify(message.crossReferences[i]);
                    if (error)
                        return "crossReferences." + error;
                }
            }
            if (message.status != null && message.hasOwnProperty("status")) {
                let error = $root.folder_mcp.ResponseStatus.verify(message.status);
                if (error)
                    return "status." + error;
            }
            if (message.processingStats != null && message.hasOwnProperty("processingStats")) {
                let error = $root.folder_mcp.ProcessingStats.verify(message.processingStats);
                if (error)
                    return "processingStats." + error;
            }
            return null;
        };

        /**
         * Creates a BatchDocSummaryResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.BatchDocSummaryResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.BatchDocSummaryResponse} BatchDocSummaryResponse
         */
        BatchDocSummaryResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.BatchDocSummaryResponse)
                return object;
            let message = new $root.folder_mcp.BatchDocSummaryResponse();
            if (object.summaries) {
                if (!Array.isArray(object.summaries))
                    throw TypeError(".folder_mcp.BatchDocSummaryResponse.summaries: array expected");
                message.summaries = [];
                for (let i = 0; i < object.summaries.length; ++i) {
                    if (typeof object.summaries[i] !== "object")
                        throw TypeError(".folder_mcp.BatchDocSummaryResponse.summaries: object expected");
                    message.summaries[i] = $root.folder_mcp.DocumentSummary.fromObject(object.summaries[i]);
                }
            }
            if (object.totalTokens != null)
                message.totalTokens = object.totalTokens | 0;
            if (object.crossReferences) {
                if (!Array.isArray(object.crossReferences))
                    throw TypeError(".folder_mcp.BatchDocSummaryResponse.crossReferences: array expected");
                message.crossReferences = [];
                for (let i = 0; i < object.crossReferences.length; ++i) {
                    if (typeof object.crossReferences[i] !== "object")
                        throw TypeError(".folder_mcp.BatchDocSummaryResponse.crossReferences: object expected");
                    message.crossReferences[i] = $root.folder_mcp.CrossReference.fromObject(object.crossReferences[i]);
                }
            }
            if (object.status != null) {
                if (typeof object.status !== "object")
                    throw TypeError(".folder_mcp.BatchDocSummaryResponse.status: object expected");
                message.status = $root.folder_mcp.ResponseStatus.fromObject(object.status);
            }
            if (object.processingStats != null) {
                if (typeof object.processingStats !== "object")
                    throw TypeError(".folder_mcp.BatchDocSummaryResponse.processingStats: object expected");
                message.processingStats = $root.folder_mcp.ProcessingStats.fromObject(object.processingStats);
            }
            return message;
        };

        /**
         * Creates a plain object from a BatchDocSummaryResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.BatchDocSummaryResponse
         * @static
         * @param {folder_mcp.BatchDocSummaryResponse} message BatchDocSummaryResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        BatchDocSummaryResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults) {
                object.summaries = [];
                object.crossReferences = [];
            }
            if (options.defaults) {
                object.totalTokens = 0;
                object.status = null;
                object.processingStats = null;
            }
            if (message.summaries && message.summaries.length) {
                object.summaries = [];
                for (let j = 0; j < message.summaries.length; ++j)
                    object.summaries[j] = $root.folder_mcp.DocumentSummary.toObject(message.summaries[j], options);
            }
            if (message.totalTokens != null && message.hasOwnProperty("totalTokens"))
                object.totalTokens = message.totalTokens;
            if (message.crossReferences && message.crossReferences.length) {
                object.crossReferences = [];
                for (let j = 0; j < message.crossReferences.length; ++j)
                    object.crossReferences[j] = $root.folder_mcp.CrossReference.toObject(message.crossReferences[j], options);
            }
            if (message.status != null && message.hasOwnProperty("status"))
                object.status = $root.folder_mcp.ResponseStatus.toObject(message.status, options);
            if (message.processingStats != null && message.hasOwnProperty("processingStats"))
                object.processingStats = $root.folder_mcp.ProcessingStats.toObject(message.processingStats, options);
            return object;
        };

        /**
         * Converts this BatchDocSummaryResponse to JSON.
         * @function toJSON
         * @memberof folder_mcp.BatchDocSummaryResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        BatchDocSummaryResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for BatchDocSummaryResponse
         * @function getTypeUrl
         * @memberof folder_mcp.BatchDocSummaryResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        BatchDocSummaryResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.BatchDocSummaryResponse";
        };

        return BatchDocSummaryResponse;
    })();

    folder_mcp.DocumentSummary = (function() {

        /**
         * Properties of a DocumentSummary.
         * @memberof folder_mcp
         * @interface IDocumentSummary
         * @property {string|null} [documentId] DocumentSummary documentId
         * @property {string|null} [summary] DocumentSummary summary
         * @property {number|null} [tokenCount] DocumentSummary tokenCount
         * @property {Array.<folder_mcp.ISourceRange>|null} [sourceRanges] DocumentSummary sourceRanges
         */

        /**
         * Constructs a new DocumentSummary.
         * @memberof folder_mcp
         * @classdesc Represents a DocumentSummary.
         * @implements IDocumentSummary
         * @constructor
         * @param {folder_mcp.IDocumentSummary=} [properties] Properties to set
         */
        function DocumentSummary(properties) {
            this.sourceRanges = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DocumentSummary documentId.
         * @member {string} documentId
         * @memberof folder_mcp.DocumentSummary
         * @instance
         */
        DocumentSummary.prototype.documentId = "";

        /**
         * DocumentSummary summary.
         * @member {string} summary
         * @memberof folder_mcp.DocumentSummary
         * @instance
         */
        DocumentSummary.prototype.summary = "";

        /**
         * DocumentSummary tokenCount.
         * @member {number} tokenCount
         * @memberof folder_mcp.DocumentSummary
         * @instance
         */
        DocumentSummary.prototype.tokenCount = 0;

        /**
         * DocumentSummary sourceRanges.
         * @member {Array.<folder_mcp.ISourceRange>} sourceRanges
         * @memberof folder_mcp.DocumentSummary
         * @instance
         */
        DocumentSummary.prototype.sourceRanges = $util.emptyArray;

        /**
         * Creates a new DocumentSummary instance using the specified properties.
         * @function create
         * @memberof folder_mcp.DocumentSummary
         * @static
         * @param {folder_mcp.IDocumentSummary=} [properties] Properties to set
         * @returns {folder_mcp.DocumentSummary} DocumentSummary instance
         */
        DocumentSummary.create = function create(properties) {
            return new DocumentSummary(properties);
        };

        /**
         * Encodes the specified DocumentSummary message. Does not implicitly {@link folder_mcp.DocumentSummary.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.DocumentSummary
         * @static
         * @param {folder_mcp.IDocumentSummary} message DocumentSummary message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DocumentSummary.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documentId != null && Object.hasOwnProperty.call(message, "documentId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.documentId);
            if (message.summary != null && Object.hasOwnProperty.call(message, "summary"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.summary);
            if (message.tokenCount != null && Object.hasOwnProperty.call(message, "tokenCount"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.tokenCount);
            if (message.sourceRanges != null && message.sourceRanges.length)
                for (let i = 0; i < message.sourceRanges.length; ++i)
                    $root.folder_mcp.SourceRange.encode(message.sourceRanges[i], writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified DocumentSummary message, length delimited. Does not implicitly {@link folder_mcp.DocumentSummary.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.DocumentSummary
         * @static
         * @param {folder_mcp.IDocumentSummary} message DocumentSummary message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DocumentSummary.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DocumentSummary message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.DocumentSummary
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.DocumentSummary} DocumentSummary
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DocumentSummary.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.DocumentSummary();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.documentId = reader.string();
                        break;
                    }
                case 2: {
                        message.summary = reader.string();
                        break;
                    }
                case 3: {
                        message.tokenCount = reader.int32();
                        break;
                    }
                case 4: {
                        if (!(message.sourceRanges && message.sourceRanges.length))
                            message.sourceRanges = [];
                        message.sourceRanges.push($root.folder_mcp.SourceRange.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a DocumentSummary message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.DocumentSummary
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.DocumentSummary} DocumentSummary
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DocumentSummary.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a DocumentSummary message.
         * @function verify
         * @memberof folder_mcp.DocumentSummary
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        DocumentSummary.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                if (!$util.isString(message.documentId))
                    return "documentId: string expected";
            if (message.summary != null && message.hasOwnProperty("summary"))
                if (!$util.isString(message.summary))
                    return "summary: string expected";
            if (message.tokenCount != null && message.hasOwnProperty("tokenCount"))
                if (!$util.isInteger(message.tokenCount))
                    return "tokenCount: integer expected";
            if (message.sourceRanges != null && message.hasOwnProperty("sourceRanges")) {
                if (!Array.isArray(message.sourceRanges))
                    return "sourceRanges: array expected";
                for (let i = 0; i < message.sourceRanges.length; ++i) {
                    let error = $root.folder_mcp.SourceRange.verify(message.sourceRanges[i]);
                    if (error)
                        return "sourceRanges." + error;
                }
            }
            return null;
        };

        /**
         * Creates a DocumentSummary message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.DocumentSummary
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.DocumentSummary} DocumentSummary
         */
        DocumentSummary.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.DocumentSummary)
                return object;
            let message = new $root.folder_mcp.DocumentSummary();
            if (object.documentId != null)
                message.documentId = String(object.documentId);
            if (object.summary != null)
                message.summary = String(object.summary);
            if (object.tokenCount != null)
                message.tokenCount = object.tokenCount | 0;
            if (object.sourceRanges) {
                if (!Array.isArray(object.sourceRanges))
                    throw TypeError(".folder_mcp.DocumentSummary.sourceRanges: array expected");
                message.sourceRanges = [];
                for (let i = 0; i < object.sourceRanges.length; ++i) {
                    if (typeof object.sourceRanges[i] !== "object")
                        throw TypeError(".folder_mcp.DocumentSummary.sourceRanges: object expected");
                    message.sourceRanges[i] = $root.folder_mcp.SourceRange.fromObject(object.sourceRanges[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a DocumentSummary message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.DocumentSummary
         * @static
         * @param {folder_mcp.DocumentSummary} message DocumentSummary
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        DocumentSummary.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.sourceRanges = [];
            if (options.defaults) {
                object.documentId = "";
                object.summary = "";
                object.tokenCount = 0;
            }
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                object.documentId = message.documentId;
            if (message.summary != null && message.hasOwnProperty("summary"))
                object.summary = message.summary;
            if (message.tokenCount != null && message.hasOwnProperty("tokenCount"))
                object.tokenCount = message.tokenCount;
            if (message.sourceRanges && message.sourceRanges.length) {
                object.sourceRanges = [];
                for (let j = 0; j < message.sourceRanges.length; ++j)
                    object.sourceRanges[j] = $root.folder_mcp.SourceRange.toObject(message.sourceRanges[j], options);
            }
            return object;
        };

        /**
         * Converts this DocumentSummary to JSON.
         * @function toJSON
         * @memberof folder_mcp.DocumentSummary
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        DocumentSummary.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for DocumentSummary
         * @function getTypeUrl
         * @memberof folder_mcp.DocumentSummary
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        DocumentSummary.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.DocumentSummary";
        };

        return DocumentSummary;
    })();

    folder_mcp.CrossReference = (function() {

        /**
         * Properties of a CrossReference.
         * @memberof folder_mcp
         * @interface ICrossReference
         * @property {string|null} [sourceDocumentId] CrossReference sourceDocumentId
         * @property {string|null} [targetDocumentId] CrossReference targetDocumentId
         * @property {string|null} [relationship] CrossReference relationship
         * @property {number|null} [confidence] CrossReference confidence
         */

        /**
         * Constructs a new CrossReference.
         * @memberof folder_mcp
         * @classdesc Represents a CrossReference.
         * @implements ICrossReference
         * @constructor
         * @param {folder_mcp.ICrossReference=} [properties] Properties to set
         */
        function CrossReference(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * CrossReference sourceDocumentId.
         * @member {string} sourceDocumentId
         * @memberof folder_mcp.CrossReference
         * @instance
         */
        CrossReference.prototype.sourceDocumentId = "";

        /**
         * CrossReference targetDocumentId.
         * @member {string} targetDocumentId
         * @memberof folder_mcp.CrossReference
         * @instance
         */
        CrossReference.prototype.targetDocumentId = "";

        /**
         * CrossReference relationship.
         * @member {string} relationship
         * @memberof folder_mcp.CrossReference
         * @instance
         */
        CrossReference.prototype.relationship = "";

        /**
         * CrossReference confidence.
         * @member {number} confidence
         * @memberof folder_mcp.CrossReference
         * @instance
         */
        CrossReference.prototype.confidence = 0;

        /**
         * Creates a new CrossReference instance using the specified properties.
         * @function create
         * @memberof folder_mcp.CrossReference
         * @static
         * @param {folder_mcp.ICrossReference=} [properties] Properties to set
         * @returns {folder_mcp.CrossReference} CrossReference instance
         */
        CrossReference.create = function create(properties) {
            return new CrossReference(properties);
        };

        /**
         * Encodes the specified CrossReference message. Does not implicitly {@link folder_mcp.CrossReference.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.CrossReference
         * @static
         * @param {folder_mcp.ICrossReference} message CrossReference message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CrossReference.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.sourceDocumentId != null && Object.hasOwnProperty.call(message, "sourceDocumentId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.sourceDocumentId);
            if (message.targetDocumentId != null && Object.hasOwnProperty.call(message, "targetDocumentId"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.targetDocumentId);
            if (message.relationship != null && Object.hasOwnProperty.call(message, "relationship"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.relationship);
            if (message.confidence != null && Object.hasOwnProperty.call(message, "confidence"))
                writer.uint32(/* id 4, wireType 5 =*/37).float(message.confidence);
            return writer;
        };

        /**
         * Encodes the specified CrossReference message, length delimited. Does not implicitly {@link folder_mcp.CrossReference.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.CrossReference
         * @static
         * @param {folder_mcp.ICrossReference} message CrossReference message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CrossReference.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a CrossReference message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.CrossReference
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.CrossReference} CrossReference
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CrossReference.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.CrossReference();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.sourceDocumentId = reader.string();
                        break;
                    }
                case 2: {
                        message.targetDocumentId = reader.string();
                        break;
                    }
                case 3: {
                        message.relationship = reader.string();
                        break;
                    }
                case 4: {
                        message.confidence = reader.float();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a CrossReference message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.CrossReference
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.CrossReference} CrossReference
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CrossReference.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a CrossReference message.
         * @function verify
         * @memberof folder_mcp.CrossReference
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        CrossReference.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.sourceDocumentId != null && message.hasOwnProperty("sourceDocumentId"))
                if (!$util.isString(message.sourceDocumentId))
                    return "sourceDocumentId: string expected";
            if (message.targetDocumentId != null && message.hasOwnProperty("targetDocumentId"))
                if (!$util.isString(message.targetDocumentId))
                    return "targetDocumentId: string expected";
            if (message.relationship != null && message.hasOwnProperty("relationship"))
                if (!$util.isString(message.relationship))
                    return "relationship: string expected";
            if (message.confidence != null && message.hasOwnProperty("confidence"))
                if (typeof message.confidence !== "number")
                    return "confidence: number expected";
            return null;
        };

        /**
         * Creates a CrossReference message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.CrossReference
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.CrossReference} CrossReference
         */
        CrossReference.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.CrossReference)
                return object;
            let message = new $root.folder_mcp.CrossReference();
            if (object.sourceDocumentId != null)
                message.sourceDocumentId = String(object.sourceDocumentId);
            if (object.targetDocumentId != null)
                message.targetDocumentId = String(object.targetDocumentId);
            if (object.relationship != null)
                message.relationship = String(object.relationship);
            if (object.confidence != null)
                message.confidence = Number(object.confidence);
            return message;
        };

        /**
         * Creates a plain object from a CrossReference message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.CrossReference
         * @static
         * @param {folder_mcp.CrossReference} message CrossReference
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        CrossReference.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.sourceDocumentId = "";
                object.targetDocumentId = "";
                object.relationship = "";
                object.confidence = 0;
            }
            if (message.sourceDocumentId != null && message.hasOwnProperty("sourceDocumentId"))
                object.sourceDocumentId = message.sourceDocumentId;
            if (message.targetDocumentId != null && message.hasOwnProperty("targetDocumentId"))
                object.targetDocumentId = message.targetDocumentId;
            if (message.relationship != null && message.hasOwnProperty("relationship"))
                object.relationship = message.relationship;
            if (message.confidence != null && message.hasOwnProperty("confidence"))
                object.confidence = options.json && !isFinite(message.confidence) ? String(message.confidence) : message.confidence;
            return object;
        };

        /**
         * Converts this CrossReference to JSON.
         * @function toJSON
         * @memberof folder_mcp.CrossReference
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        CrossReference.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for CrossReference
         * @function getTypeUrl
         * @memberof folder_mcp.CrossReference
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        CrossReference.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.CrossReference";
        };

        return CrossReference;
    })();

    folder_mcp.TableQueryRequest = (function() {

        /**
         * Properties of a TableQueryRequest.
         * @memberof folder_mcp
         * @interface ITableQueryRequest
         * @property {string|null} [query] TableQueryRequest query
         * @property {Array.<string>|null} [documentIds] TableQueryRequest documentIds
         * @property {Array.<string>|null} [sheetNames] TableQueryRequest sheetNames
         * @property {string|null} [cellRange] TableQueryRequest cellRange
         * @property {number|null} [maxResults] TableQueryRequest maxResults
         */

        /**
         * Constructs a new TableQueryRequest.
         * @memberof folder_mcp
         * @classdesc Represents a TableQueryRequest.
         * @implements ITableQueryRequest
         * @constructor
         * @param {folder_mcp.ITableQueryRequest=} [properties] Properties to set
         */
        function TableQueryRequest(properties) {
            this.documentIds = [];
            this.sheetNames = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TableQueryRequest query.
         * @member {string} query
         * @memberof folder_mcp.TableQueryRequest
         * @instance
         */
        TableQueryRequest.prototype.query = "";

        /**
         * TableQueryRequest documentIds.
         * @member {Array.<string>} documentIds
         * @memberof folder_mcp.TableQueryRequest
         * @instance
         */
        TableQueryRequest.prototype.documentIds = $util.emptyArray;

        /**
         * TableQueryRequest sheetNames.
         * @member {Array.<string>} sheetNames
         * @memberof folder_mcp.TableQueryRequest
         * @instance
         */
        TableQueryRequest.prototype.sheetNames = $util.emptyArray;

        /**
         * TableQueryRequest cellRange.
         * @member {string} cellRange
         * @memberof folder_mcp.TableQueryRequest
         * @instance
         */
        TableQueryRequest.prototype.cellRange = "";

        /**
         * TableQueryRequest maxResults.
         * @member {number} maxResults
         * @memberof folder_mcp.TableQueryRequest
         * @instance
         */
        TableQueryRequest.prototype.maxResults = 0;

        /**
         * Creates a new TableQueryRequest instance using the specified properties.
         * @function create
         * @memberof folder_mcp.TableQueryRequest
         * @static
         * @param {folder_mcp.ITableQueryRequest=} [properties] Properties to set
         * @returns {folder_mcp.TableQueryRequest} TableQueryRequest instance
         */
        TableQueryRequest.create = function create(properties) {
            return new TableQueryRequest(properties);
        };

        /**
         * Encodes the specified TableQueryRequest message. Does not implicitly {@link folder_mcp.TableQueryRequest.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.TableQueryRequest
         * @static
         * @param {folder_mcp.ITableQueryRequest} message TableQueryRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TableQueryRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.query != null && Object.hasOwnProperty.call(message, "query"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.query);
            if (message.documentIds != null && message.documentIds.length)
                for (let i = 0; i < message.documentIds.length; ++i)
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.documentIds[i]);
            if (message.sheetNames != null && message.sheetNames.length)
                for (let i = 0; i < message.sheetNames.length; ++i)
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.sheetNames[i]);
            if (message.cellRange != null && Object.hasOwnProperty.call(message, "cellRange"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.cellRange);
            if (message.maxResults != null && Object.hasOwnProperty.call(message, "maxResults"))
                writer.uint32(/* id 5, wireType 0 =*/40).int32(message.maxResults);
            return writer;
        };

        /**
         * Encodes the specified TableQueryRequest message, length delimited. Does not implicitly {@link folder_mcp.TableQueryRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.TableQueryRequest
         * @static
         * @param {folder_mcp.ITableQueryRequest} message TableQueryRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TableQueryRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TableQueryRequest message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.TableQueryRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.TableQueryRequest} TableQueryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TableQueryRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.TableQueryRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.query = reader.string();
                        break;
                    }
                case 2: {
                        if (!(message.documentIds && message.documentIds.length))
                            message.documentIds = [];
                        message.documentIds.push(reader.string());
                        break;
                    }
                case 3: {
                        if (!(message.sheetNames && message.sheetNames.length))
                            message.sheetNames = [];
                        message.sheetNames.push(reader.string());
                        break;
                    }
                case 4: {
                        message.cellRange = reader.string();
                        break;
                    }
                case 5: {
                        message.maxResults = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TableQueryRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.TableQueryRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.TableQueryRequest} TableQueryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TableQueryRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TableQueryRequest message.
         * @function verify
         * @memberof folder_mcp.TableQueryRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TableQueryRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.query != null && message.hasOwnProperty("query"))
                if (!$util.isString(message.query))
                    return "query: string expected";
            if (message.documentIds != null && message.hasOwnProperty("documentIds")) {
                if (!Array.isArray(message.documentIds))
                    return "documentIds: array expected";
                for (let i = 0; i < message.documentIds.length; ++i)
                    if (!$util.isString(message.documentIds[i]))
                        return "documentIds: string[] expected";
            }
            if (message.sheetNames != null && message.hasOwnProperty("sheetNames")) {
                if (!Array.isArray(message.sheetNames))
                    return "sheetNames: array expected";
                for (let i = 0; i < message.sheetNames.length; ++i)
                    if (!$util.isString(message.sheetNames[i]))
                        return "sheetNames: string[] expected";
            }
            if (message.cellRange != null && message.hasOwnProperty("cellRange"))
                if (!$util.isString(message.cellRange))
                    return "cellRange: string expected";
            if (message.maxResults != null && message.hasOwnProperty("maxResults"))
                if (!$util.isInteger(message.maxResults))
                    return "maxResults: integer expected";
            return null;
        };

        /**
         * Creates a TableQueryRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.TableQueryRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.TableQueryRequest} TableQueryRequest
         */
        TableQueryRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.TableQueryRequest)
                return object;
            let message = new $root.folder_mcp.TableQueryRequest();
            if (object.query != null)
                message.query = String(object.query);
            if (object.documentIds) {
                if (!Array.isArray(object.documentIds))
                    throw TypeError(".folder_mcp.TableQueryRequest.documentIds: array expected");
                message.documentIds = [];
                for (let i = 0; i < object.documentIds.length; ++i)
                    message.documentIds[i] = String(object.documentIds[i]);
            }
            if (object.sheetNames) {
                if (!Array.isArray(object.sheetNames))
                    throw TypeError(".folder_mcp.TableQueryRequest.sheetNames: array expected");
                message.sheetNames = [];
                for (let i = 0; i < object.sheetNames.length; ++i)
                    message.sheetNames[i] = String(object.sheetNames[i]);
            }
            if (object.cellRange != null)
                message.cellRange = String(object.cellRange);
            if (object.maxResults != null)
                message.maxResults = object.maxResults | 0;
            return message;
        };

        /**
         * Creates a plain object from a TableQueryRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.TableQueryRequest
         * @static
         * @param {folder_mcp.TableQueryRequest} message TableQueryRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TableQueryRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults) {
                object.documentIds = [];
                object.sheetNames = [];
            }
            if (options.defaults) {
                object.query = "";
                object.cellRange = "";
                object.maxResults = 0;
            }
            if (message.query != null && message.hasOwnProperty("query"))
                object.query = message.query;
            if (message.documentIds && message.documentIds.length) {
                object.documentIds = [];
                for (let j = 0; j < message.documentIds.length; ++j)
                    object.documentIds[j] = message.documentIds[j];
            }
            if (message.sheetNames && message.sheetNames.length) {
                object.sheetNames = [];
                for (let j = 0; j < message.sheetNames.length; ++j)
                    object.sheetNames[j] = message.sheetNames[j];
            }
            if (message.cellRange != null && message.hasOwnProperty("cellRange"))
                object.cellRange = message.cellRange;
            if (message.maxResults != null && message.hasOwnProperty("maxResults"))
                object.maxResults = message.maxResults;
            return object;
        };

        /**
         * Converts this TableQueryRequest to JSON.
         * @function toJSON
         * @memberof folder_mcp.TableQueryRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TableQueryRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TableQueryRequest
         * @function getTypeUrl
         * @memberof folder_mcp.TableQueryRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TableQueryRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.TableQueryRequest";
        };

        return TableQueryRequest;
    })();

    folder_mcp.TableQueryResponse = (function() {

        /**
         * Properties of a TableQueryResponse.
         * @memberof folder_mcp
         * @interface ITableQueryResponse
         * @property {Array.<folder_mcp.ICellMatch>|null} [matches] TableQueryResponse matches
         * @property {Array.<folder_mcp.ITableStructure>|null} [tables] TableQueryResponse tables
         * @property {string|null} [queryInterpretation] TableQueryResponse queryInterpretation
         * @property {folder_mcp.IResponseStatus|null} [status] TableQueryResponse status
         * @property {folder_mcp.IPaginationInfo|null} [pagination] TableQueryResponse pagination
         */

        /**
         * Constructs a new TableQueryResponse.
         * @memberof folder_mcp
         * @classdesc Represents a TableQueryResponse.
         * @implements ITableQueryResponse
         * @constructor
         * @param {folder_mcp.ITableQueryResponse=} [properties] Properties to set
         */
        function TableQueryResponse(properties) {
            this.matches = [];
            this.tables = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TableQueryResponse matches.
         * @member {Array.<folder_mcp.ICellMatch>} matches
         * @memberof folder_mcp.TableQueryResponse
         * @instance
         */
        TableQueryResponse.prototype.matches = $util.emptyArray;

        /**
         * TableQueryResponse tables.
         * @member {Array.<folder_mcp.ITableStructure>} tables
         * @memberof folder_mcp.TableQueryResponse
         * @instance
         */
        TableQueryResponse.prototype.tables = $util.emptyArray;

        /**
         * TableQueryResponse queryInterpretation.
         * @member {string} queryInterpretation
         * @memberof folder_mcp.TableQueryResponse
         * @instance
         */
        TableQueryResponse.prototype.queryInterpretation = "";

        /**
         * TableQueryResponse status.
         * @member {folder_mcp.IResponseStatus|null|undefined} status
         * @memberof folder_mcp.TableQueryResponse
         * @instance
         */
        TableQueryResponse.prototype.status = null;

        /**
         * TableQueryResponse pagination.
         * @member {folder_mcp.IPaginationInfo|null|undefined} pagination
         * @memberof folder_mcp.TableQueryResponse
         * @instance
         */
        TableQueryResponse.prototype.pagination = null;

        /**
         * Creates a new TableQueryResponse instance using the specified properties.
         * @function create
         * @memberof folder_mcp.TableQueryResponse
         * @static
         * @param {folder_mcp.ITableQueryResponse=} [properties] Properties to set
         * @returns {folder_mcp.TableQueryResponse} TableQueryResponse instance
         */
        TableQueryResponse.create = function create(properties) {
            return new TableQueryResponse(properties);
        };

        /**
         * Encodes the specified TableQueryResponse message. Does not implicitly {@link folder_mcp.TableQueryResponse.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.TableQueryResponse
         * @static
         * @param {folder_mcp.ITableQueryResponse} message TableQueryResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TableQueryResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.matches != null && message.matches.length)
                for (let i = 0; i < message.matches.length; ++i)
                    $root.folder_mcp.CellMatch.encode(message.matches[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.tables != null && message.tables.length)
                for (let i = 0; i < message.tables.length; ++i)
                    $root.folder_mcp.TableStructure.encode(message.tables[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.queryInterpretation != null && Object.hasOwnProperty.call(message, "queryInterpretation"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.queryInterpretation);
            if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                $root.folder_mcp.ResponseStatus.encode(message.status, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            if (message.pagination != null && Object.hasOwnProperty.call(message, "pagination"))
                $root.folder_mcp.PaginationInfo.encode(message.pagination, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified TableQueryResponse message, length delimited. Does not implicitly {@link folder_mcp.TableQueryResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.TableQueryResponse
         * @static
         * @param {folder_mcp.ITableQueryResponse} message TableQueryResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TableQueryResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TableQueryResponse message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.TableQueryResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.TableQueryResponse} TableQueryResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TableQueryResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.TableQueryResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.matches && message.matches.length))
                            message.matches = [];
                        message.matches.push($root.folder_mcp.CellMatch.decode(reader, reader.uint32()));
                        break;
                    }
                case 2: {
                        if (!(message.tables && message.tables.length))
                            message.tables = [];
                        message.tables.push($root.folder_mcp.TableStructure.decode(reader, reader.uint32()));
                        break;
                    }
                case 3: {
                        message.queryInterpretation = reader.string();
                        break;
                    }
                case 4: {
                        message.status = $root.folder_mcp.ResponseStatus.decode(reader, reader.uint32());
                        break;
                    }
                case 5: {
                        message.pagination = $root.folder_mcp.PaginationInfo.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TableQueryResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.TableQueryResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.TableQueryResponse} TableQueryResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TableQueryResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TableQueryResponse message.
         * @function verify
         * @memberof folder_mcp.TableQueryResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TableQueryResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.matches != null && message.hasOwnProperty("matches")) {
                if (!Array.isArray(message.matches))
                    return "matches: array expected";
                for (let i = 0; i < message.matches.length; ++i) {
                    let error = $root.folder_mcp.CellMatch.verify(message.matches[i]);
                    if (error)
                        return "matches." + error;
                }
            }
            if (message.tables != null && message.hasOwnProperty("tables")) {
                if (!Array.isArray(message.tables))
                    return "tables: array expected";
                for (let i = 0; i < message.tables.length; ++i) {
                    let error = $root.folder_mcp.TableStructure.verify(message.tables[i]);
                    if (error)
                        return "tables." + error;
                }
            }
            if (message.queryInterpretation != null && message.hasOwnProperty("queryInterpretation"))
                if (!$util.isString(message.queryInterpretation))
                    return "queryInterpretation: string expected";
            if (message.status != null && message.hasOwnProperty("status")) {
                let error = $root.folder_mcp.ResponseStatus.verify(message.status);
                if (error)
                    return "status." + error;
            }
            if (message.pagination != null && message.hasOwnProperty("pagination")) {
                let error = $root.folder_mcp.PaginationInfo.verify(message.pagination);
                if (error)
                    return "pagination." + error;
            }
            return null;
        };

        /**
         * Creates a TableQueryResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.TableQueryResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.TableQueryResponse} TableQueryResponse
         */
        TableQueryResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.TableQueryResponse)
                return object;
            let message = new $root.folder_mcp.TableQueryResponse();
            if (object.matches) {
                if (!Array.isArray(object.matches))
                    throw TypeError(".folder_mcp.TableQueryResponse.matches: array expected");
                message.matches = [];
                for (let i = 0; i < object.matches.length; ++i) {
                    if (typeof object.matches[i] !== "object")
                        throw TypeError(".folder_mcp.TableQueryResponse.matches: object expected");
                    message.matches[i] = $root.folder_mcp.CellMatch.fromObject(object.matches[i]);
                }
            }
            if (object.tables) {
                if (!Array.isArray(object.tables))
                    throw TypeError(".folder_mcp.TableQueryResponse.tables: array expected");
                message.tables = [];
                for (let i = 0; i < object.tables.length; ++i) {
                    if (typeof object.tables[i] !== "object")
                        throw TypeError(".folder_mcp.TableQueryResponse.tables: object expected");
                    message.tables[i] = $root.folder_mcp.TableStructure.fromObject(object.tables[i]);
                }
            }
            if (object.queryInterpretation != null)
                message.queryInterpretation = String(object.queryInterpretation);
            if (object.status != null) {
                if (typeof object.status !== "object")
                    throw TypeError(".folder_mcp.TableQueryResponse.status: object expected");
                message.status = $root.folder_mcp.ResponseStatus.fromObject(object.status);
            }
            if (object.pagination != null) {
                if (typeof object.pagination !== "object")
                    throw TypeError(".folder_mcp.TableQueryResponse.pagination: object expected");
                message.pagination = $root.folder_mcp.PaginationInfo.fromObject(object.pagination);
            }
            return message;
        };

        /**
         * Creates a plain object from a TableQueryResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.TableQueryResponse
         * @static
         * @param {folder_mcp.TableQueryResponse} message TableQueryResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TableQueryResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults) {
                object.matches = [];
                object.tables = [];
            }
            if (options.defaults) {
                object.queryInterpretation = "";
                object.status = null;
                object.pagination = null;
            }
            if (message.matches && message.matches.length) {
                object.matches = [];
                for (let j = 0; j < message.matches.length; ++j)
                    object.matches[j] = $root.folder_mcp.CellMatch.toObject(message.matches[j], options);
            }
            if (message.tables && message.tables.length) {
                object.tables = [];
                for (let j = 0; j < message.tables.length; ++j)
                    object.tables[j] = $root.folder_mcp.TableStructure.toObject(message.tables[j], options);
            }
            if (message.queryInterpretation != null && message.hasOwnProperty("queryInterpretation"))
                object.queryInterpretation = message.queryInterpretation;
            if (message.status != null && message.hasOwnProperty("status"))
                object.status = $root.folder_mcp.ResponseStatus.toObject(message.status, options);
            if (message.pagination != null && message.hasOwnProperty("pagination"))
                object.pagination = $root.folder_mcp.PaginationInfo.toObject(message.pagination, options);
            return object;
        };

        /**
         * Converts this TableQueryResponse to JSON.
         * @function toJSON
         * @memberof folder_mcp.TableQueryResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TableQueryResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TableQueryResponse
         * @function getTypeUrl
         * @memberof folder_mcp.TableQueryResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TableQueryResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.TableQueryResponse";
        };

        return TableQueryResponse;
    })();

    folder_mcp.CellMatch = (function() {

        /**
         * Properties of a CellMatch.
         * @memberof folder_mcp
         * @interface ICellMatch
         * @property {string|null} [documentId] CellMatch documentId
         * @property {string|null} [sheetName] CellMatch sheetName
         * @property {folder_mcp.ICell|null} [cell] CellMatch cell
         * @property {number|null} [relevanceScore] CellMatch relevanceScore
         * @property {string|null} [context] CellMatch context
         */

        /**
         * Constructs a new CellMatch.
         * @memberof folder_mcp
         * @classdesc Represents a CellMatch.
         * @implements ICellMatch
         * @constructor
         * @param {folder_mcp.ICellMatch=} [properties] Properties to set
         */
        function CellMatch(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * CellMatch documentId.
         * @member {string} documentId
         * @memberof folder_mcp.CellMatch
         * @instance
         */
        CellMatch.prototype.documentId = "";

        /**
         * CellMatch sheetName.
         * @member {string} sheetName
         * @memberof folder_mcp.CellMatch
         * @instance
         */
        CellMatch.prototype.sheetName = "";

        /**
         * CellMatch cell.
         * @member {folder_mcp.ICell|null|undefined} cell
         * @memberof folder_mcp.CellMatch
         * @instance
         */
        CellMatch.prototype.cell = null;

        /**
         * CellMatch relevanceScore.
         * @member {number} relevanceScore
         * @memberof folder_mcp.CellMatch
         * @instance
         */
        CellMatch.prototype.relevanceScore = 0;

        /**
         * CellMatch context.
         * @member {string} context
         * @memberof folder_mcp.CellMatch
         * @instance
         */
        CellMatch.prototype.context = "";

        /**
         * Creates a new CellMatch instance using the specified properties.
         * @function create
         * @memberof folder_mcp.CellMatch
         * @static
         * @param {folder_mcp.ICellMatch=} [properties] Properties to set
         * @returns {folder_mcp.CellMatch} CellMatch instance
         */
        CellMatch.create = function create(properties) {
            return new CellMatch(properties);
        };

        /**
         * Encodes the specified CellMatch message. Does not implicitly {@link folder_mcp.CellMatch.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.CellMatch
         * @static
         * @param {folder_mcp.ICellMatch} message CellMatch message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CellMatch.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documentId != null && Object.hasOwnProperty.call(message, "documentId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.documentId);
            if (message.sheetName != null && Object.hasOwnProperty.call(message, "sheetName"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.sheetName);
            if (message.cell != null && Object.hasOwnProperty.call(message, "cell"))
                $root.folder_mcp.Cell.encode(message.cell, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.relevanceScore != null && Object.hasOwnProperty.call(message, "relevanceScore"))
                writer.uint32(/* id 4, wireType 5 =*/37).float(message.relevanceScore);
            if (message.context != null && Object.hasOwnProperty.call(message, "context"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.context);
            return writer;
        };

        /**
         * Encodes the specified CellMatch message, length delimited. Does not implicitly {@link folder_mcp.CellMatch.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.CellMatch
         * @static
         * @param {folder_mcp.ICellMatch} message CellMatch message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CellMatch.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a CellMatch message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.CellMatch
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.CellMatch} CellMatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CellMatch.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.CellMatch();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.documentId = reader.string();
                        break;
                    }
                case 2: {
                        message.sheetName = reader.string();
                        break;
                    }
                case 3: {
                        message.cell = $root.folder_mcp.Cell.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.relevanceScore = reader.float();
                        break;
                    }
                case 5: {
                        message.context = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a CellMatch message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.CellMatch
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.CellMatch} CellMatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CellMatch.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a CellMatch message.
         * @function verify
         * @memberof folder_mcp.CellMatch
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        CellMatch.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                if (!$util.isString(message.documentId))
                    return "documentId: string expected";
            if (message.sheetName != null && message.hasOwnProperty("sheetName"))
                if (!$util.isString(message.sheetName))
                    return "sheetName: string expected";
            if (message.cell != null && message.hasOwnProperty("cell")) {
                let error = $root.folder_mcp.Cell.verify(message.cell);
                if (error)
                    return "cell." + error;
            }
            if (message.relevanceScore != null && message.hasOwnProperty("relevanceScore"))
                if (typeof message.relevanceScore !== "number")
                    return "relevanceScore: number expected";
            if (message.context != null && message.hasOwnProperty("context"))
                if (!$util.isString(message.context))
                    return "context: string expected";
            return null;
        };

        /**
         * Creates a CellMatch message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.CellMatch
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.CellMatch} CellMatch
         */
        CellMatch.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.CellMatch)
                return object;
            let message = new $root.folder_mcp.CellMatch();
            if (object.documentId != null)
                message.documentId = String(object.documentId);
            if (object.sheetName != null)
                message.sheetName = String(object.sheetName);
            if (object.cell != null) {
                if (typeof object.cell !== "object")
                    throw TypeError(".folder_mcp.CellMatch.cell: object expected");
                message.cell = $root.folder_mcp.Cell.fromObject(object.cell);
            }
            if (object.relevanceScore != null)
                message.relevanceScore = Number(object.relevanceScore);
            if (object.context != null)
                message.context = String(object.context);
            return message;
        };

        /**
         * Creates a plain object from a CellMatch message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.CellMatch
         * @static
         * @param {folder_mcp.CellMatch} message CellMatch
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        CellMatch.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.documentId = "";
                object.sheetName = "";
                object.cell = null;
                object.relevanceScore = 0;
                object.context = "";
            }
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                object.documentId = message.documentId;
            if (message.sheetName != null && message.hasOwnProperty("sheetName"))
                object.sheetName = message.sheetName;
            if (message.cell != null && message.hasOwnProperty("cell"))
                object.cell = $root.folder_mcp.Cell.toObject(message.cell, options);
            if (message.relevanceScore != null && message.hasOwnProperty("relevanceScore"))
                object.relevanceScore = options.json && !isFinite(message.relevanceScore) ? String(message.relevanceScore) : message.relevanceScore;
            if (message.context != null && message.hasOwnProperty("context"))
                object.context = message.context;
            return object;
        };

        /**
         * Converts this CellMatch to JSON.
         * @function toJSON
         * @memberof folder_mcp.CellMatch
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        CellMatch.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for CellMatch
         * @function getTypeUrl
         * @memberof folder_mcp.CellMatch
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        CellMatch.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.CellMatch";
        };

        return CellMatch;
    })();

    folder_mcp.TableStructure = (function() {

        /**
         * Properties of a TableStructure.
         * @memberof folder_mcp
         * @interface ITableStructure
         * @property {string|null} [documentId] TableStructure documentId
         * @property {string|null} [sheetName] TableStructure sheetName
         * @property {Array.<string>|null} [headers] TableStructure headers
         * @property {number|null} [rowCount] TableStructure rowCount
         * @property {number|null} [columnCount] TableStructure columnCount
         */

        /**
         * Constructs a new TableStructure.
         * @memberof folder_mcp
         * @classdesc Represents a TableStructure.
         * @implements ITableStructure
         * @constructor
         * @param {folder_mcp.ITableStructure=} [properties] Properties to set
         */
        function TableStructure(properties) {
            this.headers = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TableStructure documentId.
         * @member {string} documentId
         * @memberof folder_mcp.TableStructure
         * @instance
         */
        TableStructure.prototype.documentId = "";

        /**
         * TableStructure sheetName.
         * @member {string} sheetName
         * @memberof folder_mcp.TableStructure
         * @instance
         */
        TableStructure.prototype.sheetName = "";

        /**
         * TableStructure headers.
         * @member {Array.<string>} headers
         * @memberof folder_mcp.TableStructure
         * @instance
         */
        TableStructure.prototype.headers = $util.emptyArray;

        /**
         * TableStructure rowCount.
         * @member {number} rowCount
         * @memberof folder_mcp.TableStructure
         * @instance
         */
        TableStructure.prototype.rowCount = 0;

        /**
         * TableStructure columnCount.
         * @member {number} columnCount
         * @memberof folder_mcp.TableStructure
         * @instance
         */
        TableStructure.prototype.columnCount = 0;

        /**
         * Creates a new TableStructure instance using the specified properties.
         * @function create
         * @memberof folder_mcp.TableStructure
         * @static
         * @param {folder_mcp.ITableStructure=} [properties] Properties to set
         * @returns {folder_mcp.TableStructure} TableStructure instance
         */
        TableStructure.create = function create(properties) {
            return new TableStructure(properties);
        };

        /**
         * Encodes the specified TableStructure message. Does not implicitly {@link folder_mcp.TableStructure.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.TableStructure
         * @static
         * @param {folder_mcp.ITableStructure} message TableStructure message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TableStructure.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documentId != null && Object.hasOwnProperty.call(message, "documentId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.documentId);
            if (message.sheetName != null && Object.hasOwnProperty.call(message, "sheetName"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.sheetName);
            if (message.headers != null && message.headers.length)
                for (let i = 0; i < message.headers.length; ++i)
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.headers[i]);
            if (message.rowCount != null && Object.hasOwnProperty.call(message, "rowCount"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.rowCount);
            if (message.columnCount != null && Object.hasOwnProperty.call(message, "columnCount"))
                writer.uint32(/* id 5, wireType 0 =*/40).int32(message.columnCount);
            return writer;
        };

        /**
         * Encodes the specified TableStructure message, length delimited. Does not implicitly {@link folder_mcp.TableStructure.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.TableStructure
         * @static
         * @param {folder_mcp.ITableStructure} message TableStructure message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TableStructure.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TableStructure message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.TableStructure
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.TableStructure} TableStructure
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TableStructure.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.TableStructure();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.documentId = reader.string();
                        break;
                    }
                case 2: {
                        message.sheetName = reader.string();
                        break;
                    }
                case 3: {
                        if (!(message.headers && message.headers.length))
                            message.headers = [];
                        message.headers.push(reader.string());
                        break;
                    }
                case 4: {
                        message.rowCount = reader.int32();
                        break;
                    }
                case 5: {
                        message.columnCount = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TableStructure message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.TableStructure
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.TableStructure} TableStructure
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TableStructure.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TableStructure message.
         * @function verify
         * @memberof folder_mcp.TableStructure
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TableStructure.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                if (!$util.isString(message.documentId))
                    return "documentId: string expected";
            if (message.sheetName != null && message.hasOwnProperty("sheetName"))
                if (!$util.isString(message.sheetName))
                    return "sheetName: string expected";
            if (message.headers != null && message.hasOwnProperty("headers")) {
                if (!Array.isArray(message.headers))
                    return "headers: array expected";
                for (let i = 0; i < message.headers.length; ++i)
                    if (!$util.isString(message.headers[i]))
                        return "headers: string[] expected";
            }
            if (message.rowCount != null && message.hasOwnProperty("rowCount"))
                if (!$util.isInteger(message.rowCount))
                    return "rowCount: integer expected";
            if (message.columnCount != null && message.hasOwnProperty("columnCount"))
                if (!$util.isInteger(message.columnCount))
                    return "columnCount: integer expected";
            return null;
        };

        /**
         * Creates a TableStructure message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.TableStructure
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.TableStructure} TableStructure
         */
        TableStructure.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.TableStructure)
                return object;
            let message = new $root.folder_mcp.TableStructure();
            if (object.documentId != null)
                message.documentId = String(object.documentId);
            if (object.sheetName != null)
                message.sheetName = String(object.sheetName);
            if (object.headers) {
                if (!Array.isArray(object.headers))
                    throw TypeError(".folder_mcp.TableStructure.headers: array expected");
                message.headers = [];
                for (let i = 0; i < object.headers.length; ++i)
                    message.headers[i] = String(object.headers[i]);
            }
            if (object.rowCount != null)
                message.rowCount = object.rowCount | 0;
            if (object.columnCount != null)
                message.columnCount = object.columnCount | 0;
            return message;
        };

        /**
         * Creates a plain object from a TableStructure message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.TableStructure
         * @static
         * @param {folder_mcp.TableStructure} message TableStructure
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TableStructure.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.headers = [];
            if (options.defaults) {
                object.documentId = "";
                object.sheetName = "";
                object.rowCount = 0;
                object.columnCount = 0;
            }
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                object.documentId = message.documentId;
            if (message.sheetName != null && message.hasOwnProperty("sheetName"))
                object.sheetName = message.sheetName;
            if (message.headers && message.headers.length) {
                object.headers = [];
                for (let j = 0; j < message.headers.length; ++j)
                    object.headers[j] = message.headers[j];
            }
            if (message.rowCount != null && message.hasOwnProperty("rowCount"))
                object.rowCount = message.rowCount;
            if (message.columnCount != null && message.hasOwnProperty("columnCount"))
                object.columnCount = message.columnCount;
            return object;
        };

        /**
         * Converts this TableStructure to JSON.
         * @function toJSON
         * @memberof folder_mcp.TableStructure
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TableStructure.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TableStructure
         * @function getTypeUrl
         * @memberof folder_mcp.TableStructure
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TableStructure.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.TableStructure";
        };

        return TableStructure;
    })();

    folder_mcp.IngestStatusRequest = (function() {

        /**
         * Properties of an IngestStatusRequest.
         * @memberof folder_mcp
         * @interface IIngestStatusRequest
         * @property {Array.<string>|null} [documentIds] IngestStatusRequest documentIds
         * @property {boolean|null} [includeErrorDetails] IngestStatusRequest includeErrorDetails
         */

        /**
         * Constructs a new IngestStatusRequest.
         * @memberof folder_mcp
         * @classdesc Represents an IngestStatusRequest.
         * @implements IIngestStatusRequest
         * @constructor
         * @param {folder_mcp.IIngestStatusRequest=} [properties] Properties to set
         */
        function IngestStatusRequest(properties) {
            this.documentIds = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * IngestStatusRequest documentIds.
         * @member {Array.<string>} documentIds
         * @memberof folder_mcp.IngestStatusRequest
         * @instance
         */
        IngestStatusRequest.prototype.documentIds = $util.emptyArray;

        /**
         * IngestStatusRequest includeErrorDetails.
         * @member {boolean} includeErrorDetails
         * @memberof folder_mcp.IngestStatusRequest
         * @instance
         */
        IngestStatusRequest.prototype.includeErrorDetails = false;

        /**
         * Creates a new IngestStatusRequest instance using the specified properties.
         * @function create
         * @memberof folder_mcp.IngestStatusRequest
         * @static
         * @param {folder_mcp.IIngestStatusRequest=} [properties] Properties to set
         * @returns {folder_mcp.IngestStatusRequest} IngestStatusRequest instance
         */
        IngestStatusRequest.create = function create(properties) {
            return new IngestStatusRequest(properties);
        };

        /**
         * Encodes the specified IngestStatusRequest message. Does not implicitly {@link folder_mcp.IngestStatusRequest.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.IngestStatusRequest
         * @static
         * @param {folder_mcp.IIngestStatusRequest} message IngestStatusRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        IngestStatusRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documentIds != null && message.documentIds.length)
                for (let i = 0; i < message.documentIds.length; ++i)
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.documentIds[i]);
            if (message.includeErrorDetails != null && Object.hasOwnProperty.call(message, "includeErrorDetails"))
                writer.uint32(/* id 2, wireType 0 =*/16).bool(message.includeErrorDetails);
            return writer;
        };

        /**
         * Encodes the specified IngestStatusRequest message, length delimited. Does not implicitly {@link folder_mcp.IngestStatusRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.IngestStatusRequest
         * @static
         * @param {folder_mcp.IIngestStatusRequest} message IngestStatusRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        IngestStatusRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an IngestStatusRequest message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.IngestStatusRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.IngestStatusRequest} IngestStatusRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        IngestStatusRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.IngestStatusRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.documentIds && message.documentIds.length))
                            message.documentIds = [];
                        message.documentIds.push(reader.string());
                        break;
                    }
                case 2: {
                        message.includeErrorDetails = reader.bool();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an IngestStatusRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.IngestStatusRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.IngestStatusRequest} IngestStatusRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        IngestStatusRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an IngestStatusRequest message.
         * @function verify
         * @memberof folder_mcp.IngestStatusRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        IngestStatusRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documentIds != null && message.hasOwnProperty("documentIds")) {
                if (!Array.isArray(message.documentIds))
                    return "documentIds: array expected";
                for (let i = 0; i < message.documentIds.length; ++i)
                    if (!$util.isString(message.documentIds[i]))
                        return "documentIds: string[] expected";
            }
            if (message.includeErrorDetails != null && message.hasOwnProperty("includeErrorDetails"))
                if (typeof message.includeErrorDetails !== "boolean")
                    return "includeErrorDetails: boolean expected";
            return null;
        };

        /**
         * Creates an IngestStatusRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.IngestStatusRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.IngestStatusRequest} IngestStatusRequest
         */
        IngestStatusRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.IngestStatusRequest)
                return object;
            let message = new $root.folder_mcp.IngestStatusRequest();
            if (object.documentIds) {
                if (!Array.isArray(object.documentIds))
                    throw TypeError(".folder_mcp.IngestStatusRequest.documentIds: array expected");
                message.documentIds = [];
                for (let i = 0; i < object.documentIds.length; ++i)
                    message.documentIds[i] = String(object.documentIds[i]);
            }
            if (object.includeErrorDetails != null)
                message.includeErrorDetails = Boolean(object.includeErrorDetails);
            return message;
        };

        /**
         * Creates a plain object from an IngestStatusRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.IngestStatusRequest
         * @static
         * @param {folder_mcp.IngestStatusRequest} message IngestStatusRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        IngestStatusRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.documentIds = [];
            if (options.defaults)
                object.includeErrorDetails = false;
            if (message.documentIds && message.documentIds.length) {
                object.documentIds = [];
                for (let j = 0; j < message.documentIds.length; ++j)
                    object.documentIds[j] = message.documentIds[j];
            }
            if (message.includeErrorDetails != null && message.hasOwnProperty("includeErrorDetails"))
                object.includeErrorDetails = message.includeErrorDetails;
            return object;
        };

        /**
         * Converts this IngestStatusRequest to JSON.
         * @function toJSON
         * @memberof folder_mcp.IngestStatusRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        IngestStatusRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for IngestStatusRequest
         * @function getTypeUrl
         * @memberof folder_mcp.IngestStatusRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        IngestStatusRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.IngestStatusRequest";
        };

        return IngestStatusRequest;
    })();

    folder_mcp.IngestStatusResponse = (function() {

        /**
         * Properties of an IngestStatusResponse.
         * @memberof folder_mcp
         * @interface IIngestStatusResponse
         * @property {Array.<folder_mcp.IDocumentStatus>|null} [documents] IngestStatusResponse documents
         * @property {folder_mcp.IOverallStatus|null} [overall] IngestStatusResponse overall
         * @property {folder_mcp.IResponseStatus|null} [status] IngestStatusResponse status
         */

        /**
         * Constructs a new IngestStatusResponse.
         * @memberof folder_mcp
         * @classdesc Represents an IngestStatusResponse.
         * @implements IIngestStatusResponse
         * @constructor
         * @param {folder_mcp.IIngestStatusResponse=} [properties] Properties to set
         */
        function IngestStatusResponse(properties) {
            this.documents = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * IngestStatusResponse documents.
         * @member {Array.<folder_mcp.IDocumentStatus>} documents
         * @memberof folder_mcp.IngestStatusResponse
         * @instance
         */
        IngestStatusResponse.prototype.documents = $util.emptyArray;

        /**
         * IngestStatusResponse overall.
         * @member {folder_mcp.IOverallStatus|null|undefined} overall
         * @memberof folder_mcp.IngestStatusResponse
         * @instance
         */
        IngestStatusResponse.prototype.overall = null;

        /**
         * IngestStatusResponse status.
         * @member {folder_mcp.IResponseStatus|null|undefined} status
         * @memberof folder_mcp.IngestStatusResponse
         * @instance
         */
        IngestStatusResponse.prototype.status = null;

        /**
         * Creates a new IngestStatusResponse instance using the specified properties.
         * @function create
         * @memberof folder_mcp.IngestStatusResponse
         * @static
         * @param {folder_mcp.IIngestStatusResponse=} [properties] Properties to set
         * @returns {folder_mcp.IngestStatusResponse} IngestStatusResponse instance
         */
        IngestStatusResponse.create = function create(properties) {
            return new IngestStatusResponse(properties);
        };

        /**
         * Encodes the specified IngestStatusResponse message. Does not implicitly {@link folder_mcp.IngestStatusResponse.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.IngestStatusResponse
         * @static
         * @param {folder_mcp.IIngestStatusResponse} message IngestStatusResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        IngestStatusResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documents != null && message.documents.length)
                for (let i = 0; i < message.documents.length; ++i)
                    $root.folder_mcp.DocumentStatus.encode(message.documents[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.overall != null && Object.hasOwnProperty.call(message, "overall"))
                $root.folder_mcp.OverallStatus.encode(message.overall, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                $root.folder_mcp.ResponseStatus.encode(message.status, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified IngestStatusResponse message, length delimited. Does not implicitly {@link folder_mcp.IngestStatusResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.IngestStatusResponse
         * @static
         * @param {folder_mcp.IIngestStatusResponse} message IngestStatusResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        IngestStatusResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an IngestStatusResponse message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.IngestStatusResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.IngestStatusResponse} IngestStatusResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        IngestStatusResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.IngestStatusResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.documents && message.documents.length))
                            message.documents = [];
                        message.documents.push($root.folder_mcp.DocumentStatus.decode(reader, reader.uint32()));
                        break;
                    }
                case 2: {
                        message.overall = $root.folder_mcp.OverallStatus.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.status = $root.folder_mcp.ResponseStatus.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an IngestStatusResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.IngestStatusResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.IngestStatusResponse} IngestStatusResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        IngestStatusResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an IngestStatusResponse message.
         * @function verify
         * @memberof folder_mcp.IngestStatusResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        IngestStatusResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documents != null && message.hasOwnProperty("documents")) {
                if (!Array.isArray(message.documents))
                    return "documents: array expected";
                for (let i = 0; i < message.documents.length; ++i) {
                    let error = $root.folder_mcp.DocumentStatus.verify(message.documents[i]);
                    if (error)
                        return "documents." + error;
                }
            }
            if (message.overall != null && message.hasOwnProperty("overall")) {
                let error = $root.folder_mcp.OverallStatus.verify(message.overall);
                if (error)
                    return "overall." + error;
            }
            if (message.status != null && message.hasOwnProperty("status")) {
                let error = $root.folder_mcp.ResponseStatus.verify(message.status);
                if (error)
                    return "status." + error;
            }
            return null;
        };

        /**
         * Creates an IngestStatusResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.IngestStatusResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.IngestStatusResponse} IngestStatusResponse
         */
        IngestStatusResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.IngestStatusResponse)
                return object;
            let message = new $root.folder_mcp.IngestStatusResponse();
            if (object.documents) {
                if (!Array.isArray(object.documents))
                    throw TypeError(".folder_mcp.IngestStatusResponse.documents: array expected");
                message.documents = [];
                for (let i = 0; i < object.documents.length; ++i) {
                    if (typeof object.documents[i] !== "object")
                        throw TypeError(".folder_mcp.IngestStatusResponse.documents: object expected");
                    message.documents[i] = $root.folder_mcp.DocumentStatus.fromObject(object.documents[i]);
                }
            }
            if (object.overall != null) {
                if (typeof object.overall !== "object")
                    throw TypeError(".folder_mcp.IngestStatusResponse.overall: object expected");
                message.overall = $root.folder_mcp.OverallStatus.fromObject(object.overall);
            }
            if (object.status != null) {
                if (typeof object.status !== "object")
                    throw TypeError(".folder_mcp.IngestStatusResponse.status: object expected");
                message.status = $root.folder_mcp.ResponseStatus.fromObject(object.status);
            }
            return message;
        };

        /**
         * Creates a plain object from an IngestStatusResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.IngestStatusResponse
         * @static
         * @param {folder_mcp.IngestStatusResponse} message IngestStatusResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        IngestStatusResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.documents = [];
            if (options.defaults) {
                object.overall = null;
                object.status = null;
            }
            if (message.documents && message.documents.length) {
                object.documents = [];
                for (let j = 0; j < message.documents.length; ++j)
                    object.documents[j] = $root.folder_mcp.DocumentStatus.toObject(message.documents[j], options);
            }
            if (message.overall != null && message.hasOwnProperty("overall"))
                object.overall = $root.folder_mcp.OverallStatus.toObject(message.overall, options);
            if (message.status != null && message.hasOwnProperty("status"))
                object.status = $root.folder_mcp.ResponseStatus.toObject(message.status, options);
            return object;
        };

        /**
         * Converts this IngestStatusResponse to JSON.
         * @function toJSON
         * @memberof folder_mcp.IngestStatusResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        IngestStatusResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for IngestStatusResponse
         * @function getTypeUrl
         * @memberof folder_mcp.IngestStatusResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        IngestStatusResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.IngestStatusResponse";
        };

        return IngestStatusResponse;
    })();

    folder_mcp.DocumentStatus = (function() {

        /**
         * Properties of a DocumentStatus.
         * @memberof folder_mcp
         * @interface IDocumentStatus
         * @property {string|null} [documentId] DocumentStatus documentId
         * @property {string|null} [filePath] DocumentStatus filePath
         * @property {folder_mcp.IngestStatus|null} [status] DocumentStatus status
         * @property {folder_mcp.IProgress|null} [progress] DocumentStatus progress
         * @property {string|null} [lastUpdated] DocumentStatus lastUpdated
         * @property {Array.<folder_mcp.IErrorDetail>|null} [errors] DocumentStatus errors
         * @property {folder_mcp.IProcessingStats|null} [stats] DocumentStatus stats
         */

        /**
         * Constructs a new DocumentStatus.
         * @memberof folder_mcp
         * @classdesc Represents a DocumentStatus.
         * @implements IDocumentStatus
         * @constructor
         * @param {folder_mcp.IDocumentStatus=} [properties] Properties to set
         */
        function DocumentStatus(properties) {
            this.errors = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DocumentStatus documentId.
         * @member {string} documentId
         * @memberof folder_mcp.DocumentStatus
         * @instance
         */
        DocumentStatus.prototype.documentId = "";

        /**
         * DocumentStatus filePath.
         * @member {string} filePath
         * @memberof folder_mcp.DocumentStatus
         * @instance
         */
        DocumentStatus.prototype.filePath = "";

        /**
         * DocumentStatus status.
         * @member {folder_mcp.IngestStatus} status
         * @memberof folder_mcp.DocumentStatus
         * @instance
         */
        DocumentStatus.prototype.status = 0;

        /**
         * DocumentStatus progress.
         * @member {folder_mcp.IProgress|null|undefined} progress
         * @memberof folder_mcp.DocumentStatus
         * @instance
         */
        DocumentStatus.prototype.progress = null;

        /**
         * DocumentStatus lastUpdated.
         * @member {string} lastUpdated
         * @memberof folder_mcp.DocumentStatus
         * @instance
         */
        DocumentStatus.prototype.lastUpdated = "";

        /**
         * DocumentStatus errors.
         * @member {Array.<folder_mcp.IErrorDetail>} errors
         * @memberof folder_mcp.DocumentStatus
         * @instance
         */
        DocumentStatus.prototype.errors = $util.emptyArray;

        /**
         * DocumentStatus stats.
         * @member {folder_mcp.IProcessingStats|null|undefined} stats
         * @memberof folder_mcp.DocumentStatus
         * @instance
         */
        DocumentStatus.prototype.stats = null;

        /**
         * Creates a new DocumentStatus instance using the specified properties.
         * @function create
         * @memberof folder_mcp.DocumentStatus
         * @static
         * @param {folder_mcp.IDocumentStatus=} [properties] Properties to set
         * @returns {folder_mcp.DocumentStatus} DocumentStatus instance
         */
        DocumentStatus.create = function create(properties) {
            return new DocumentStatus(properties);
        };

        /**
         * Encodes the specified DocumentStatus message. Does not implicitly {@link folder_mcp.DocumentStatus.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.DocumentStatus
         * @static
         * @param {folder_mcp.IDocumentStatus} message DocumentStatus message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DocumentStatus.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documentId != null && Object.hasOwnProperty.call(message, "documentId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.documentId);
            if (message.filePath != null && Object.hasOwnProperty.call(message, "filePath"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.filePath);
            if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.status);
            if (message.progress != null && Object.hasOwnProperty.call(message, "progress"))
                $root.folder_mcp.Progress.encode(message.progress, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            if (message.lastUpdated != null && Object.hasOwnProperty.call(message, "lastUpdated"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.lastUpdated);
            if (message.errors != null && message.errors.length)
                for (let i = 0; i < message.errors.length; ++i)
                    $root.folder_mcp.ErrorDetail.encode(message.errors[i], writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
            if (message.stats != null && Object.hasOwnProperty.call(message, "stats"))
                $root.folder_mcp.ProcessingStats.encode(message.stats, writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified DocumentStatus message, length delimited. Does not implicitly {@link folder_mcp.DocumentStatus.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.DocumentStatus
         * @static
         * @param {folder_mcp.IDocumentStatus} message DocumentStatus message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DocumentStatus.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DocumentStatus message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.DocumentStatus
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.DocumentStatus} DocumentStatus
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DocumentStatus.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.DocumentStatus();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.documentId = reader.string();
                        break;
                    }
                case 2: {
                        message.filePath = reader.string();
                        break;
                    }
                case 3: {
                        message.status = reader.int32();
                        break;
                    }
                case 4: {
                        message.progress = $root.folder_mcp.Progress.decode(reader, reader.uint32());
                        break;
                    }
                case 5: {
                        message.lastUpdated = reader.string();
                        break;
                    }
                case 6: {
                        if (!(message.errors && message.errors.length))
                            message.errors = [];
                        message.errors.push($root.folder_mcp.ErrorDetail.decode(reader, reader.uint32()));
                        break;
                    }
                case 7: {
                        message.stats = $root.folder_mcp.ProcessingStats.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a DocumentStatus message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.DocumentStatus
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.DocumentStatus} DocumentStatus
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DocumentStatus.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a DocumentStatus message.
         * @function verify
         * @memberof folder_mcp.DocumentStatus
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        DocumentStatus.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                if (!$util.isString(message.documentId))
                    return "documentId: string expected";
            if (message.filePath != null && message.hasOwnProperty("filePath"))
                if (!$util.isString(message.filePath))
                    return "filePath: string expected";
            if (message.status != null && message.hasOwnProperty("status"))
                switch (message.status) {
                default:
                    return "status: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                    break;
                }
            if (message.progress != null && message.hasOwnProperty("progress")) {
                let error = $root.folder_mcp.Progress.verify(message.progress);
                if (error)
                    return "progress." + error;
            }
            if (message.lastUpdated != null && message.hasOwnProperty("lastUpdated"))
                if (!$util.isString(message.lastUpdated))
                    return "lastUpdated: string expected";
            if (message.errors != null && message.hasOwnProperty("errors")) {
                if (!Array.isArray(message.errors))
                    return "errors: array expected";
                for (let i = 0; i < message.errors.length; ++i) {
                    let error = $root.folder_mcp.ErrorDetail.verify(message.errors[i]);
                    if (error)
                        return "errors." + error;
                }
            }
            if (message.stats != null && message.hasOwnProperty("stats")) {
                let error = $root.folder_mcp.ProcessingStats.verify(message.stats);
                if (error)
                    return "stats." + error;
            }
            return null;
        };

        /**
         * Creates a DocumentStatus message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.DocumentStatus
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.DocumentStatus} DocumentStatus
         */
        DocumentStatus.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.DocumentStatus)
                return object;
            let message = new $root.folder_mcp.DocumentStatus();
            if (object.documentId != null)
                message.documentId = String(object.documentId);
            if (object.filePath != null)
                message.filePath = String(object.filePath);
            switch (object.status) {
            default:
                if (typeof object.status === "number") {
                    message.status = object.status;
                    break;
                }
                break;
            case "INGEST_STATUS_UNSPECIFIED":
            case 0:
                message.status = 0;
                break;
            case "INGEST_STATUS_PENDING":
            case 1:
                message.status = 1;
                break;
            case "INGEST_STATUS_PROCESSING":
            case 2:
                message.status = 2;
                break;
            case "INGEST_STATUS_COMPLETED":
            case 3:
                message.status = 3;
                break;
            case "INGEST_STATUS_FAILED":
            case 4:
                message.status = 4;
                break;
            case "INGEST_STATUS_CANCELLED":
            case 5:
                message.status = 5;
                break;
            case "INGEST_STATUS_RETRY":
            case 6:
                message.status = 6;
                break;
            }
            if (object.progress != null) {
                if (typeof object.progress !== "object")
                    throw TypeError(".folder_mcp.DocumentStatus.progress: object expected");
                message.progress = $root.folder_mcp.Progress.fromObject(object.progress);
            }
            if (object.lastUpdated != null)
                message.lastUpdated = String(object.lastUpdated);
            if (object.errors) {
                if (!Array.isArray(object.errors))
                    throw TypeError(".folder_mcp.DocumentStatus.errors: array expected");
                message.errors = [];
                for (let i = 0; i < object.errors.length; ++i) {
                    if (typeof object.errors[i] !== "object")
                        throw TypeError(".folder_mcp.DocumentStatus.errors: object expected");
                    message.errors[i] = $root.folder_mcp.ErrorDetail.fromObject(object.errors[i]);
                }
            }
            if (object.stats != null) {
                if (typeof object.stats !== "object")
                    throw TypeError(".folder_mcp.DocumentStatus.stats: object expected");
                message.stats = $root.folder_mcp.ProcessingStats.fromObject(object.stats);
            }
            return message;
        };

        /**
         * Creates a plain object from a DocumentStatus message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.DocumentStatus
         * @static
         * @param {folder_mcp.DocumentStatus} message DocumentStatus
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        DocumentStatus.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.errors = [];
            if (options.defaults) {
                object.documentId = "";
                object.filePath = "";
                object.status = options.enums === String ? "INGEST_STATUS_UNSPECIFIED" : 0;
                object.progress = null;
                object.lastUpdated = "";
                object.stats = null;
            }
            if (message.documentId != null && message.hasOwnProperty("documentId"))
                object.documentId = message.documentId;
            if (message.filePath != null && message.hasOwnProperty("filePath"))
                object.filePath = message.filePath;
            if (message.status != null && message.hasOwnProperty("status"))
                object.status = options.enums === String ? $root.folder_mcp.IngestStatus[message.status] === undefined ? message.status : $root.folder_mcp.IngestStatus[message.status] : message.status;
            if (message.progress != null && message.hasOwnProperty("progress"))
                object.progress = $root.folder_mcp.Progress.toObject(message.progress, options);
            if (message.lastUpdated != null && message.hasOwnProperty("lastUpdated"))
                object.lastUpdated = message.lastUpdated;
            if (message.errors && message.errors.length) {
                object.errors = [];
                for (let j = 0; j < message.errors.length; ++j)
                    object.errors[j] = $root.folder_mcp.ErrorDetail.toObject(message.errors[j], options);
            }
            if (message.stats != null && message.hasOwnProperty("stats"))
                object.stats = $root.folder_mcp.ProcessingStats.toObject(message.stats, options);
            return object;
        };

        /**
         * Converts this DocumentStatus to JSON.
         * @function toJSON
         * @memberof folder_mcp.DocumentStatus
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        DocumentStatus.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for DocumentStatus
         * @function getTypeUrl
         * @memberof folder_mcp.DocumentStatus
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        DocumentStatus.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.DocumentStatus";
        };

        return DocumentStatus;
    })();

    folder_mcp.ProcessingStats = (function() {

        /**
         * Properties of a ProcessingStats.
         * @memberof folder_mcp
         * @interface IProcessingStats
         * @property {number|null} [chunksCreated] ProcessingStats chunksCreated
         * @property {number|null} [embeddingsGenerated] ProcessingStats embeddingsGenerated
         * @property {number|Long|null} [processingTimeMs] ProcessingStats processingTimeMs
         */

        /**
         * Constructs a new ProcessingStats.
         * @memberof folder_mcp
         * @classdesc Represents a ProcessingStats.
         * @implements IProcessingStats
         * @constructor
         * @param {folder_mcp.IProcessingStats=} [properties] Properties to set
         */
        function ProcessingStats(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ProcessingStats chunksCreated.
         * @member {number} chunksCreated
         * @memberof folder_mcp.ProcessingStats
         * @instance
         */
        ProcessingStats.prototype.chunksCreated = 0;

        /**
         * ProcessingStats embeddingsGenerated.
         * @member {number} embeddingsGenerated
         * @memberof folder_mcp.ProcessingStats
         * @instance
         */
        ProcessingStats.prototype.embeddingsGenerated = 0;

        /**
         * ProcessingStats processingTimeMs.
         * @member {number|Long} processingTimeMs
         * @memberof folder_mcp.ProcessingStats
         * @instance
         */
        ProcessingStats.prototype.processingTimeMs = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Creates a new ProcessingStats instance using the specified properties.
         * @function create
         * @memberof folder_mcp.ProcessingStats
         * @static
         * @param {folder_mcp.IProcessingStats=} [properties] Properties to set
         * @returns {folder_mcp.ProcessingStats} ProcessingStats instance
         */
        ProcessingStats.create = function create(properties) {
            return new ProcessingStats(properties);
        };

        /**
         * Encodes the specified ProcessingStats message. Does not implicitly {@link folder_mcp.ProcessingStats.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.ProcessingStats
         * @static
         * @param {folder_mcp.IProcessingStats} message ProcessingStats message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProcessingStats.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.chunksCreated != null && Object.hasOwnProperty.call(message, "chunksCreated"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.chunksCreated);
            if (message.embeddingsGenerated != null && Object.hasOwnProperty.call(message, "embeddingsGenerated"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.embeddingsGenerated);
            if (message.processingTimeMs != null && Object.hasOwnProperty.call(message, "processingTimeMs"))
                writer.uint32(/* id 3, wireType 0 =*/24).int64(message.processingTimeMs);
            return writer;
        };

        /**
         * Encodes the specified ProcessingStats message, length delimited. Does not implicitly {@link folder_mcp.ProcessingStats.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.ProcessingStats
         * @static
         * @param {folder_mcp.IProcessingStats} message ProcessingStats message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProcessingStats.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ProcessingStats message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.ProcessingStats
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.ProcessingStats} ProcessingStats
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProcessingStats.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.ProcessingStats();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.chunksCreated = reader.int32();
                        break;
                    }
                case 2: {
                        message.embeddingsGenerated = reader.int32();
                        break;
                    }
                case 3: {
                        message.processingTimeMs = reader.int64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ProcessingStats message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.ProcessingStats
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.ProcessingStats} ProcessingStats
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProcessingStats.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ProcessingStats message.
         * @function verify
         * @memberof folder_mcp.ProcessingStats
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ProcessingStats.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.chunksCreated != null && message.hasOwnProperty("chunksCreated"))
                if (!$util.isInteger(message.chunksCreated))
                    return "chunksCreated: integer expected";
            if (message.embeddingsGenerated != null && message.hasOwnProperty("embeddingsGenerated"))
                if (!$util.isInteger(message.embeddingsGenerated))
                    return "embeddingsGenerated: integer expected";
            if (message.processingTimeMs != null && message.hasOwnProperty("processingTimeMs"))
                if (!$util.isInteger(message.processingTimeMs) && !(message.processingTimeMs && $util.isInteger(message.processingTimeMs.low) && $util.isInteger(message.processingTimeMs.high)))
                    return "processingTimeMs: integer|Long expected";
            return null;
        };

        /**
         * Creates a ProcessingStats message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.ProcessingStats
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.ProcessingStats} ProcessingStats
         */
        ProcessingStats.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.ProcessingStats)
                return object;
            let message = new $root.folder_mcp.ProcessingStats();
            if (object.chunksCreated != null)
                message.chunksCreated = object.chunksCreated | 0;
            if (object.embeddingsGenerated != null)
                message.embeddingsGenerated = object.embeddingsGenerated | 0;
            if (object.processingTimeMs != null)
                if ($util.Long)
                    (message.processingTimeMs = $util.Long.fromValue(object.processingTimeMs)).unsigned = false;
                else if (typeof object.processingTimeMs === "string")
                    message.processingTimeMs = parseInt(object.processingTimeMs, 10);
                else if (typeof object.processingTimeMs === "number")
                    message.processingTimeMs = object.processingTimeMs;
                else if (typeof object.processingTimeMs === "object")
                    message.processingTimeMs = new $util.LongBits(object.processingTimeMs.low >>> 0, object.processingTimeMs.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from a ProcessingStats message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.ProcessingStats
         * @static
         * @param {folder_mcp.ProcessingStats} message ProcessingStats
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ProcessingStats.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.chunksCreated = 0;
                object.embeddingsGenerated = 0;
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.processingTimeMs = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.processingTimeMs = options.longs === String ? "0" : 0;
            }
            if (message.chunksCreated != null && message.hasOwnProperty("chunksCreated"))
                object.chunksCreated = message.chunksCreated;
            if (message.embeddingsGenerated != null && message.hasOwnProperty("embeddingsGenerated"))
                object.embeddingsGenerated = message.embeddingsGenerated;
            if (message.processingTimeMs != null && message.hasOwnProperty("processingTimeMs"))
                if (typeof message.processingTimeMs === "number")
                    object.processingTimeMs = options.longs === String ? String(message.processingTimeMs) : message.processingTimeMs;
                else
                    object.processingTimeMs = options.longs === String ? $util.Long.prototype.toString.call(message.processingTimeMs) : options.longs === Number ? new $util.LongBits(message.processingTimeMs.low >>> 0, message.processingTimeMs.high >>> 0).toNumber() : message.processingTimeMs;
            return object;
        };

        /**
         * Converts this ProcessingStats to JSON.
         * @function toJSON
         * @memberof folder_mcp.ProcessingStats
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ProcessingStats.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ProcessingStats
         * @function getTypeUrl
         * @memberof folder_mcp.ProcessingStats
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ProcessingStats.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.ProcessingStats";
        };

        return ProcessingStats;
    })();

    folder_mcp.OverallStatus = (function() {

        /**
         * Properties of an OverallStatus.
         * @memberof folder_mcp
         * @interface IOverallStatus
         * @property {number|null} [totalDocuments] OverallStatus totalDocuments
         * @property {number|null} [completedDocuments] OverallStatus completedDocuments
         * @property {number|null} [pendingDocuments] OverallStatus pendingDocuments
         * @property {number|null} [errorDocuments] OverallStatus errorDocuments
         * @property {number|null} [overallProgress] OverallStatus overallProgress
         */

        /**
         * Constructs a new OverallStatus.
         * @memberof folder_mcp
         * @classdesc Represents an OverallStatus.
         * @implements IOverallStatus
         * @constructor
         * @param {folder_mcp.IOverallStatus=} [properties] Properties to set
         */
        function OverallStatus(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * OverallStatus totalDocuments.
         * @member {number} totalDocuments
         * @memberof folder_mcp.OverallStatus
         * @instance
         */
        OverallStatus.prototype.totalDocuments = 0;

        /**
         * OverallStatus completedDocuments.
         * @member {number} completedDocuments
         * @memberof folder_mcp.OverallStatus
         * @instance
         */
        OverallStatus.prototype.completedDocuments = 0;

        /**
         * OverallStatus pendingDocuments.
         * @member {number} pendingDocuments
         * @memberof folder_mcp.OverallStatus
         * @instance
         */
        OverallStatus.prototype.pendingDocuments = 0;

        /**
         * OverallStatus errorDocuments.
         * @member {number} errorDocuments
         * @memberof folder_mcp.OverallStatus
         * @instance
         */
        OverallStatus.prototype.errorDocuments = 0;

        /**
         * OverallStatus overallProgress.
         * @member {number} overallProgress
         * @memberof folder_mcp.OverallStatus
         * @instance
         */
        OverallStatus.prototype.overallProgress = 0;

        /**
         * Creates a new OverallStatus instance using the specified properties.
         * @function create
         * @memberof folder_mcp.OverallStatus
         * @static
         * @param {folder_mcp.IOverallStatus=} [properties] Properties to set
         * @returns {folder_mcp.OverallStatus} OverallStatus instance
         */
        OverallStatus.create = function create(properties) {
            return new OverallStatus(properties);
        };

        /**
         * Encodes the specified OverallStatus message. Does not implicitly {@link folder_mcp.OverallStatus.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.OverallStatus
         * @static
         * @param {folder_mcp.IOverallStatus} message OverallStatus message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        OverallStatus.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.totalDocuments != null && Object.hasOwnProperty.call(message, "totalDocuments"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.totalDocuments);
            if (message.completedDocuments != null && Object.hasOwnProperty.call(message, "completedDocuments"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.completedDocuments);
            if (message.pendingDocuments != null && Object.hasOwnProperty.call(message, "pendingDocuments"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.pendingDocuments);
            if (message.errorDocuments != null && Object.hasOwnProperty.call(message, "errorDocuments"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.errorDocuments);
            if (message.overallProgress != null && Object.hasOwnProperty.call(message, "overallProgress"))
                writer.uint32(/* id 5, wireType 5 =*/45).float(message.overallProgress);
            return writer;
        };

        /**
         * Encodes the specified OverallStatus message, length delimited. Does not implicitly {@link folder_mcp.OverallStatus.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.OverallStatus
         * @static
         * @param {folder_mcp.IOverallStatus} message OverallStatus message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        OverallStatus.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an OverallStatus message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.OverallStatus
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.OverallStatus} OverallStatus
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        OverallStatus.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.OverallStatus();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.totalDocuments = reader.int32();
                        break;
                    }
                case 2: {
                        message.completedDocuments = reader.int32();
                        break;
                    }
                case 3: {
                        message.pendingDocuments = reader.int32();
                        break;
                    }
                case 4: {
                        message.errorDocuments = reader.int32();
                        break;
                    }
                case 5: {
                        message.overallProgress = reader.float();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an OverallStatus message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.OverallStatus
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.OverallStatus} OverallStatus
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        OverallStatus.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an OverallStatus message.
         * @function verify
         * @memberof folder_mcp.OverallStatus
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        OverallStatus.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.totalDocuments != null && message.hasOwnProperty("totalDocuments"))
                if (!$util.isInteger(message.totalDocuments))
                    return "totalDocuments: integer expected";
            if (message.completedDocuments != null && message.hasOwnProperty("completedDocuments"))
                if (!$util.isInteger(message.completedDocuments))
                    return "completedDocuments: integer expected";
            if (message.pendingDocuments != null && message.hasOwnProperty("pendingDocuments"))
                if (!$util.isInteger(message.pendingDocuments))
                    return "pendingDocuments: integer expected";
            if (message.errorDocuments != null && message.hasOwnProperty("errorDocuments"))
                if (!$util.isInteger(message.errorDocuments))
                    return "errorDocuments: integer expected";
            if (message.overallProgress != null && message.hasOwnProperty("overallProgress"))
                if (typeof message.overallProgress !== "number")
                    return "overallProgress: number expected";
            return null;
        };

        /**
         * Creates an OverallStatus message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.OverallStatus
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.OverallStatus} OverallStatus
         */
        OverallStatus.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.OverallStatus)
                return object;
            let message = new $root.folder_mcp.OverallStatus();
            if (object.totalDocuments != null)
                message.totalDocuments = object.totalDocuments | 0;
            if (object.completedDocuments != null)
                message.completedDocuments = object.completedDocuments | 0;
            if (object.pendingDocuments != null)
                message.pendingDocuments = object.pendingDocuments | 0;
            if (object.errorDocuments != null)
                message.errorDocuments = object.errorDocuments | 0;
            if (object.overallProgress != null)
                message.overallProgress = Number(object.overallProgress);
            return message;
        };

        /**
         * Creates a plain object from an OverallStatus message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.OverallStatus
         * @static
         * @param {folder_mcp.OverallStatus} message OverallStatus
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        OverallStatus.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.totalDocuments = 0;
                object.completedDocuments = 0;
                object.pendingDocuments = 0;
                object.errorDocuments = 0;
                object.overallProgress = 0;
            }
            if (message.totalDocuments != null && message.hasOwnProperty("totalDocuments"))
                object.totalDocuments = message.totalDocuments;
            if (message.completedDocuments != null && message.hasOwnProperty("completedDocuments"))
                object.completedDocuments = message.completedDocuments;
            if (message.pendingDocuments != null && message.hasOwnProperty("pendingDocuments"))
                object.pendingDocuments = message.pendingDocuments;
            if (message.errorDocuments != null && message.hasOwnProperty("errorDocuments"))
                object.errorDocuments = message.errorDocuments;
            if (message.overallProgress != null && message.hasOwnProperty("overallProgress"))
                object.overallProgress = options.json && !isFinite(message.overallProgress) ? String(message.overallProgress) : message.overallProgress;
            return object;
        };

        /**
         * Converts this OverallStatus to JSON.
         * @function toJSON
         * @memberof folder_mcp.OverallStatus
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        OverallStatus.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for OverallStatus
         * @function getTypeUrl
         * @memberof folder_mcp.OverallStatus
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        OverallStatus.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.OverallStatus";
        };

        return OverallStatus;
    })();

    folder_mcp.RefreshDocRequest = (function() {

        /**
         * Properties of a RefreshDocRequest.
         * @memberof folder_mcp
         * @interface IRefreshDocRequest
         * @property {Array.<string>|null} [documentIds] RefreshDocRequest documentIds
         * @property {boolean|null} [forceReprocess] RefreshDocRequest forceReprocess
         * @property {folder_mcp.Priority|null} [priority] RefreshDocRequest priority
         */

        /**
         * Constructs a new RefreshDocRequest.
         * @memberof folder_mcp
         * @classdesc Represents a RefreshDocRequest.
         * @implements IRefreshDocRequest
         * @constructor
         * @param {folder_mcp.IRefreshDocRequest=} [properties] Properties to set
         */
        function RefreshDocRequest(properties) {
            this.documentIds = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * RefreshDocRequest documentIds.
         * @member {Array.<string>} documentIds
         * @memberof folder_mcp.RefreshDocRequest
         * @instance
         */
        RefreshDocRequest.prototype.documentIds = $util.emptyArray;

        /**
         * RefreshDocRequest forceReprocess.
         * @member {boolean} forceReprocess
         * @memberof folder_mcp.RefreshDocRequest
         * @instance
         */
        RefreshDocRequest.prototype.forceReprocess = false;

        /**
         * RefreshDocRequest priority.
         * @member {folder_mcp.Priority} priority
         * @memberof folder_mcp.RefreshDocRequest
         * @instance
         */
        RefreshDocRequest.prototype.priority = 0;

        /**
         * Creates a new RefreshDocRequest instance using the specified properties.
         * @function create
         * @memberof folder_mcp.RefreshDocRequest
         * @static
         * @param {folder_mcp.IRefreshDocRequest=} [properties] Properties to set
         * @returns {folder_mcp.RefreshDocRequest} RefreshDocRequest instance
         */
        RefreshDocRequest.create = function create(properties) {
            return new RefreshDocRequest(properties);
        };

        /**
         * Encodes the specified RefreshDocRequest message. Does not implicitly {@link folder_mcp.RefreshDocRequest.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.RefreshDocRequest
         * @static
         * @param {folder_mcp.IRefreshDocRequest} message RefreshDocRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RefreshDocRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documentIds != null && message.documentIds.length)
                for (let i = 0; i < message.documentIds.length; ++i)
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.documentIds[i]);
            if (message.forceReprocess != null && Object.hasOwnProperty.call(message, "forceReprocess"))
                writer.uint32(/* id 2, wireType 0 =*/16).bool(message.forceReprocess);
            if (message.priority != null && Object.hasOwnProperty.call(message, "priority"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.priority);
            return writer;
        };

        /**
         * Encodes the specified RefreshDocRequest message, length delimited. Does not implicitly {@link folder_mcp.RefreshDocRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.RefreshDocRequest
         * @static
         * @param {folder_mcp.IRefreshDocRequest} message RefreshDocRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RefreshDocRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a RefreshDocRequest message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.RefreshDocRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.RefreshDocRequest} RefreshDocRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RefreshDocRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.RefreshDocRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.documentIds && message.documentIds.length))
                            message.documentIds = [];
                        message.documentIds.push(reader.string());
                        break;
                    }
                case 2: {
                        message.forceReprocess = reader.bool();
                        break;
                    }
                case 3: {
                        message.priority = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a RefreshDocRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.RefreshDocRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.RefreshDocRequest} RefreshDocRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RefreshDocRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a RefreshDocRequest message.
         * @function verify
         * @memberof folder_mcp.RefreshDocRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        RefreshDocRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documentIds != null && message.hasOwnProperty("documentIds")) {
                if (!Array.isArray(message.documentIds))
                    return "documentIds: array expected";
                for (let i = 0; i < message.documentIds.length; ++i)
                    if (!$util.isString(message.documentIds[i]))
                        return "documentIds: string[] expected";
            }
            if (message.forceReprocess != null && message.hasOwnProperty("forceReprocess"))
                if (typeof message.forceReprocess !== "boolean")
                    return "forceReprocess: boolean expected";
            if (message.priority != null && message.hasOwnProperty("priority"))
                switch (message.priority) {
                default:
                    return "priority: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                    break;
                }
            return null;
        };

        /**
         * Creates a RefreshDocRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.RefreshDocRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.RefreshDocRequest} RefreshDocRequest
         */
        RefreshDocRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.RefreshDocRequest)
                return object;
            let message = new $root.folder_mcp.RefreshDocRequest();
            if (object.documentIds) {
                if (!Array.isArray(object.documentIds))
                    throw TypeError(".folder_mcp.RefreshDocRequest.documentIds: array expected");
                message.documentIds = [];
                for (let i = 0; i < object.documentIds.length; ++i)
                    message.documentIds[i] = String(object.documentIds[i]);
            }
            if (object.forceReprocess != null)
                message.forceReprocess = Boolean(object.forceReprocess);
            switch (object.priority) {
            default:
                if (typeof object.priority === "number") {
                    message.priority = object.priority;
                    break;
                }
                break;
            case "PRIORITY_UNSPECIFIED":
            case 0:
                message.priority = 0;
                break;
            case "PRIORITY_LOW":
            case 1:
                message.priority = 1;
                break;
            case "PRIORITY_NORMAL":
            case 2:
                message.priority = 2;
                break;
            case "PRIORITY_HIGH":
            case 3:
                message.priority = 3;
                break;
            case "PRIORITY_URGENT":
            case 4:
                message.priority = 4;
                break;
            }
            return message;
        };

        /**
         * Creates a plain object from a RefreshDocRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.RefreshDocRequest
         * @static
         * @param {folder_mcp.RefreshDocRequest} message RefreshDocRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        RefreshDocRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.documentIds = [];
            if (options.defaults) {
                object.forceReprocess = false;
                object.priority = options.enums === String ? "PRIORITY_UNSPECIFIED" : 0;
            }
            if (message.documentIds && message.documentIds.length) {
                object.documentIds = [];
                for (let j = 0; j < message.documentIds.length; ++j)
                    object.documentIds[j] = message.documentIds[j];
            }
            if (message.forceReprocess != null && message.hasOwnProperty("forceReprocess"))
                object.forceReprocess = message.forceReprocess;
            if (message.priority != null && message.hasOwnProperty("priority"))
                object.priority = options.enums === String ? $root.folder_mcp.Priority[message.priority] === undefined ? message.priority : $root.folder_mcp.Priority[message.priority] : message.priority;
            return object;
        };

        /**
         * Converts this RefreshDocRequest to JSON.
         * @function toJSON
         * @memberof folder_mcp.RefreshDocRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        RefreshDocRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for RefreshDocRequest
         * @function getTypeUrl
         * @memberof folder_mcp.RefreshDocRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        RefreshDocRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.RefreshDocRequest";
        };

        return RefreshDocRequest;
    })();

    folder_mcp.RefreshDocResponse = (function() {

        /**
         * Properties of a RefreshDocResponse.
         * @memberof folder_mcp
         * @interface IRefreshDocResponse
         * @property {string|null} [jobId] RefreshDocResponse jobId
         * @property {Array.<string>|null} [queuedDocumentIds] RefreshDocResponse queuedDocumentIds
         * @property {string|null} [estimatedCompletion] RefreshDocResponse estimatedCompletion
         */

        /**
         * Constructs a new RefreshDocResponse.
         * @memberof folder_mcp
         * @classdesc Represents a RefreshDocResponse.
         * @implements IRefreshDocResponse
         * @constructor
         * @param {folder_mcp.IRefreshDocResponse=} [properties] Properties to set
         */
        function RefreshDocResponse(properties) {
            this.queuedDocumentIds = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * RefreshDocResponse jobId.
         * @member {string} jobId
         * @memberof folder_mcp.RefreshDocResponse
         * @instance
         */
        RefreshDocResponse.prototype.jobId = "";

        /**
         * RefreshDocResponse queuedDocumentIds.
         * @member {Array.<string>} queuedDocumentIds
         * @memberof folder_mcp.RefreshDocResponse
         * @instance
         */
        RefreshDocResponse.prototype.queuedDocumentIds = $util.emptyArray;

        /**
         * RefreshDocResponse estimatedCompletion.
         * @member {string} estimatedCompletion
         * @memberof folder_mcp.RefreshDocResponse
         * @instance
         */
        RefreshDocResponse.prototype.estimatedCompletion = "";

        /**
         * Creates a new RefreshDocResponse instance using the specified properties.
         * @function create
         * @memberof folder_mcp.RefreshDocResponse
         * @static
         * @param {folder_mcp.IRefreshDocResponse=} [properties] Properties to set
         * @returns {folder_mcp.RefreshDocResponse} RefreshDocResponse instance
         */
        RefreshDocResponse.create = function create(properties) {
            return new RefreshDocResponse(properties);
        };

        /**
         * Encodes the specified RefreshDocResponse message. Does not implicitly {@link folder_mcp.RefreshDocResponse.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.RefreshDocResponse
         * @static
         * @param {folder_mcp.IRefreshDocResponse} message RefreshDocResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RefreshDocResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.jobId != null && Object.hasOwnProperty.call(message, "jobId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.jobId);
            if (message.queuedDocumentIds != null && message.queuedDocumentIds.length)
                for (let i = 0; i < message.queuedDocumentIds.length; ++i)
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.queuedDocumentIds[i]);
            if (message.estimatedCompletion != null && Object.hasOwnProperty.call(message, "estimatedCompletion"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.estimatedCompletion);
            return writer;
        };

        /**
         * Encodes the specified RefreshDocResponse message, length delimited. Does not implicitly {@link folder_mcp.RefreshDocResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.RefreshDocResponse
         * @static
         * @param {folder_mcp.IRefreshDocResponse} message RefreshDocResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RefreshDocResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a RefreshDocResponse message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.RefreshDocResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.RefreshDocResponse} RefreshDocResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RefreshDocResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.RefreshDocResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.jobId = reader.string();
                        break;
                    }
                case 2: {
                        if (!(message.queuedDocumentIds && message.queuedDocumentIds.length))
                            message.queuedDocumentIds = [];
                        message.queuedDocumentIds.push(reader.string());
                        break;
                    }
                case 3: {
                        message.estimatedCompletion = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a RefreshDocResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.RefreshDocResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.RefreshDocResponse} RefreshDocResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RefreshDocResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a RefreshDocResponse message.
         * @function verify
         * @memberof folder_mcp.RefreshDocResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        RefreshDocResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.jobId != null && message.hasOwnProperty("jobId"))
                if (!$util.isString(message.jobId))
                    return "jobId: string expected";
            if (message.queuedDocumentIds != null && message.hasOwnProperty("queuedDocumentIds")) {
                if (!Array.isArray(message.queuedDocumentIds))
                    return "queuedDocumentIds: array expected";
                for (let i = 0; i < message.queuedDocumentIds.length; ++i)
                    if (!$util.isString(message.queuedDocumentIds[i]))
                        return "queuedDocumentIds: string[] expected";
            }
            if (message.estimatedCompletion != null && message.hasOwnProperty("estimatedCompletion"))
                if (!$util.isString(message.estimatedCompletion))
                    return "estimatedCompletion: string expected";
            return null;
        };

        /**
         * Creates a RefreshDocResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.RefreshDocResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.RefreshDocResponse} RefreshDocResponse
         */
        RefreshDocResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.RefreshDocResponse)
                return object;
            let message = new $root.folder_mcp.RefreshDocResponse();
            if (object.jobId != null)
                message.jobId = String(object.jobId);
            if (object.queuedDocumentIds) {
                if (!Array.isArray(object.queuedDocumentIds))
                    throw TypeError(".folder_mcp.RefreshDocResponse.queuedDocumentIds: array expected");
                message.queuedDocumentIds = [];
                for (let i = 0; i < object.queuedDocumentIds.length; ++i)
                    message.queuedDocumentIds[i] = String(object.queuedDocumentIds[i]);
            }
            if (object.estimatedCompletion != null)
                message.estimatedCompletion = String(object.estimatedCompletion);
            return message;
        };

        /**
         * Creates a plain object from a RefreshDocResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.RefreshDocResponse
         * @static
         * @param {folder_mcp.RefreshDocResponse} message RefreshDocResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        RefreshDocResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.queuedDocumentIds = [];
            if (options.defaults) {
                object.jobId = "";
                object.estimatedCompletion = "";
            }
            if (message.jobId != null && message.hasOwnProperty("jobId"))
                object.jobId = message.jobId;
            if (message.queuedDocumentIds && message.queuedDocumentIds.length) {
                object.queuedDocumentIds = [];
                for (let j = 0; j < message.queuedDocumentIds.length; ++j)
                    object.queuedDocumentIds[j] = message.queuedDocumentIds[j];
            }
            if (message.estimatedCompletion != null && message.hasOwnProperty("estimatedCompletion"))
                object.estimatedCompletion = message.estimatedCompletion;
            return object;
        };

        /**
         * Converts this RefreshDocResponse to JSON.
         * @function toJSON
         * @memberof folder_mcp.RefreshDocResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        RefreshDocResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for RefreshDocResponse
         * @function getTypeUrl
         * @memberof folder_mcp.RefreshDocResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        RefreshDocResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.RefreshDocResponse";
        };

        return RefreshDocResponse;
    })();

    folder_mcp.GetEmbeddingRequest = (function() {

        /**
         * Properties of a GetEmbeddingRequest.
         * @memberof folder_mcp
         * @interface IGetEmbeddingRequest
         * @property {Array.<string>|null} [documentIds] GetEmbeddingRequest documentIds
         * @property {Array.<string>|null} [chunkIds] GetEmbeddingRequest chunkIds
         * @property {string|null} [format] GetEmbeddingRequest format
         */

        /**
         * Constructs a new GetEmbeddingRequest.
         * @memberof folder_mcp
         * @classdesc Represents a GetEmbeddingRequest.
         * @implements IGetEmbeddingRequest
         * @constructor
         * @param {folder_mcp.IGetEmbeddingRequest=} [properties] Properties to set
         */
        function GetEmbeddingRequest(properties) {
            this.documentIds = [];
            this.chunkIds = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetEmbeddingRequest documentIds.
         * @member {Array.<string>} documentIds
         * @memberof folder_mcp.GetEmbeddingRequest
         * @instance
         */
        GetEmbeddingRequest.prototype.documentIds = $util.emptyArray;

        /**
         * GetEmbeddingRequest chunkIds.
         * @member {Array.<string>} chunkIds
         * @memberof folder_mcp.GetEmbeddingRequest
         * @instance
         */
        GetEmbeddingRequest.prototype.chunkIds = $util.emptyArray;

        /**
         * GetEmbeddingRequest format.
         * @member {string} format
         * @memberof folder_mcp.GetEmbeddingRequest
         * @instance
         */
        GetEmbeddingRequest.prototype.format = "";

        /**
         * Creates a new GetEmbeddingRequest instance using the specified properties.
         * @function create
         * @memberof folder_mcp.GetEmbeddingRequest
         * @static
         * @param {folder_mcp.IGetEmbeddingRequest=} [properties] Properties to set
         * @returns {folder_mcp.GetEmbeddingRequest} GetEmbeddingRequest instance
         */
        GetEmbeddingRequest.create = function create(properties) {
            return new GetEmbeddingRequest(properties);
        };

        /**
         * Encodes the specified GetEmbeddingRequest message. Does not implicitly {@link folder_mcp.GetEmbeddingRequest.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.GetEmbeddingRequest
         * @static
         * @param {folder_mcp.IGetEmbeddingRequest} message GetEmbeddingRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetEmbeddingRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.documentIds != null && message.documentIds.length)
                for (let i = 0; i < message.documentIds.length; ++i)
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.documentIds[i]);
            if (message.chunkIds != null && message.chunkIds.length)
                for (let i = 0; i < message.chunkIds.length; ++i)
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.chunkIds[i]);
            if (message.format != null && Object.hasOwnProperty.call(message, "format"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.format);
            return writer;
        };

        /**
         * Encodes the specified GetEmbeddingRequest message, length delimited. Does not implicitly {@link folder_mcp.GetEmbeddingRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.GetEmbeddingRequest
         * @static
         * @param {folder_mcp.IGetEmbeddingRequest} message GetEmbeddingRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetEmbeddingRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetEmbeddingRequest message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.GetEmbeddingRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.GetEmbeddingRequest} GetEmbeddingRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetEmbeddingRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.GetEmbeddingRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.documentIds && message.documentIds.length))
                            message.documentIds = [];
                        message.documentIds.push(reader.string());
                        break;
                    }
                case 2: {
                        if (!(message.chunkIds && message.chunkIds.length))
                            message.chunkIds = [];
                        message.chunkIds.push(reader.string());
                        break;
                    }
                case 3: {
                        message.format = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetEmbeddingRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.GetEmbeddingRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.GetEmbeddingRequest} GetEmbeddingRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetEmbeddingRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetEmbeddingRequest message.
         * @function verify
         * @memberof folder_mcp.GetEmbeddingRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetEmbeddingRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.documentIds != null && message.hasOwnProperty("documentIds")) {
                if (!Array.isArray(message.documentIds))
                    return "documentIds: array expected";
                for (let i = 0; i < message.documentIds.length; ++i)
                    if (!$util.isString(message.documentIds[i]))
                        return "documentIds: string[] expected";
            }
            if (message.chunkIds != null && message.hasOwnProperty("chunkIds")) {
                if (!Array.isArray(message.chunkIds))
                    return "chunkIds: array expected";
                for (let i = 0; i < message.chunkIds.length; ++i)
                    if (!$util.isString(message.chunkIds[i]))
                        return "chunkIds: string[] expected";
            }
            if (message.format != null && message.hasOwnProperty("format"))
                if (!$util.isString(message.format))
                    return "format: string expected";
            return null;
        };

        /**
         * Creates a GetEmbeddingRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.GetEmbeddingRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.GetEmbeddingRequest} GetEmbeddingRequest
         */
        GetEmbeddingRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.GetEmbeddingRequest)
                return object;
            let message = new $root.folder_mcp.GetEmbeddingRequest();
            if (object.documentIds) {
                if (!Array.isArray(object.documentIds))
                    throw TypeError(".folder_mcp.GetEmbeddingRequest.documentIds: array expected");
                message.documentIds = [];
                for (let i = 0; i < object.documentIds.length; ++i)
                    message.documentIds[i] = String(object.documentIds[i]);
            }
            if (object.chunkIds) {
                if (!Array.isArray(object.chunkIds))
                    throw TypeError(".folder_mcp.GetEmbeddingRequest.chunkIds: array expected");
                message.chunkIds = [];
                for (let i = 0; i < object.chunkIds.length; ++i)
                    message.chunkIds[i] = String(object.chunkIds[i]);
            }
            if (object.format != null)
                message.format = String(object.format);
            return message;
        };

        /**
         * Creates a plain object from a GetEmbeddingRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.GetEmbeddingRequest
         * @static
         * @param {folder_mcp.GetEmbeddingRequest} message GetEmbeddingRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetEmbeddingRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults) {
                object.documentIds = [];
                object.chunkIds = [];
            }
            if (options.defaults)
                object.format = "";
            if (message.documentIds && message.documentIds.length) {
                object.documentIds = [];
                for (let j = 0; j < message.documentIds.length; ++j)
                    object.documentIds[j] = message.documentIds[j];
            }
            if (message.chunkIds && message.chunkIds.length) {
                object.chunkIds = [];
                for (let j = 0; j < message.chunkIds.length; ++j)
                    object.chunkIds[j] = message.chunkIds[j];
            }
            if (message.format != null && message.hasOwnProperty("format"))
                object.format = message.format;
            return object;
        };

        /**
         * Converts this GetEmbeddingRequest to JSON.
         * @function toJSON
         * @memberof folder_mcp.GetEmbeddingRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetEmbeddingRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetEmbeddingRequest
         * @function getTypeUrl
         * @memberof folder_mcp.GetEmbeddingRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetEmbeddingRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.GetEmbeddingRequest";
        };

        return GetEmbeddingRequest;
    })();

    folder_mcp.GetEmbeddingResponse = (function() {

        /**
         * Properties of a GetEmbeddingResponse.
         * @memberof folder_mcp
         * @interface IGetEmbeddingResponse
         * @property {Array.<folder_mcp.IEmbeddingVector>|null} [vectors] GetEmbeddingResponse vectors
         * @property {number|null} [vectorDimension] GetEmbeddingResponse vectorDimension
         * @property {string|null} [modelName] GetEmbeddingResponse modelName
         * @property {string|null} [modelVersion] GetEmbeddingResponse modelVersion
         * @property {folder_mcp.IResponseStatus|null} [status] GetEmbeddingResponse status
         */

        /**
         * Constructs a new GetEmbeddingResponse.
         * @memberof folder_mcp
         * @classdesc Represents a GetEmbeddingResponse.
         * @implements IGetEmbeddingResponse
         * @constructor
         * @param {folder_mcp.IGetEmbeddingResponse=} [properties] Properties to set
         */
        function GetEmbeddingResponse(properties) {
            this.vectors = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetEmbeddingResponse vectors.
         * @member {Array.<folder_mcp.IEmbeddingVector>} vectors
         * @memberof folder_mcp.GetEmbeddingResponse
         * @instance
         */
        GetEmbeddingResponse.prototype.vectors = $util.emptyArray;

        /**
         * GetEmbeddingResponse vectorDimension.
         * @member {number} vectorDimension
         * @memberof folder_mcp.GetEmbeddingResponse
         * @instance
         */
        GetEmbeddingResponse.prototype.vectorDimension = 0;

        /**
         * GetEmbeddingResponse modelName.
         * @member {string} modelName
         * @memberof folder_mcp.GetEmbeddingResponse
         * @instance
         */
        GetEmbeddingResponse.prototype.modelName = "";

        /**
         * GetEmbeddingResponse modelVersion.
         * @member {string} modelVersion
         * @memberof folder_mcp.GetEmbeddingResponse
         * @instance
         */
        GetEmbeddingResponse.prototype.modelVersion = "";

        /**
         * GetEmbeddingResponse status.
         * @member {folder_mcp.IResponseStatus|null|undefined} status
         * @memberof folder_mcp.GetEmbeddingResponse
         * @instance
         */
        GetEmbeddingResponse.prototype.status = null;

        /**
         * Creates a new GetEmbeddingResponse instance using the specified properties.
         * @function create
         * @memberof folder_mcp.GetEmbeddingResponse
         * @static
         * @param {folder_mcp.IGetEmbeddingResponse=} [properties] Properties to set
         * @returns {folder_mcp.GetEmbeddingResponse} GetEmbeddingResponse instance
         */
        GetEmbeddingResponse.create = function create(properties) {
            return new GetEmbeddingResponse(properties);
        };

        /**
         * Encodes the specified GetEmbeddingResponse message. Does not implicitly {@link folder_mcp.GetEmbeddingResponse.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.GetEmbeddingResponse
         * @static
         * @param {folder_mcp.IGetEmbeddingResponse} message GetEmbeddingResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetEmbeddingResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.vectors != null && message.vectors.length)
                for (let i = 0; i < message.vectors.length; ++i)
                    $root.folder_mcp.EmbeddingVector.encode(message.vectors[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.vectorDimension != null && Object.hasOwnProperty.call(message, "vectorDimension"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.vectorDimension);
            if (message.modelName != null && Object.hasOwnProperty.call(message, "modelName"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.modelName);
            if (message.modelVersion != null && Object.hasOwnProperty.call(message, "modelVersion"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.modelVersion);
            if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                $root.folder_mcp.ResponseStatus.encode(message.status, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetEmbeddingResponse message, length delimited. Does not implicitly {@link folder_mcp.GetEmbeddingResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.GetEmbeddingResponse
         * @static
         * @param {folder_mcp.IGetEmbeddingResponse} message GetEmbeddingResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetEmbeddingResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetEmbeddingResponse message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.GetEmbeddingResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.GetEmbeddingResponse} GetEmbeddingResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetEmbeddingResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.GetEmbeddingResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.vectors && message.vectors.length))
                            message.vectors = [];
                        message.vectors.push($root.folder_mcp.EmbeddingVector.decode(reader, reader.uint32()));
                        break;
                    }
                case 2: {
                        message.vectorDimension = reader.int32();
                        break;
                    }
                case 3: {
                        message.modelName = reader.string();
                        break;
                    }
                case 4: {
                        message.modelVersion = reader.string();
                        break;
                    }
                case 5: {
                        message.status = $root.folder_mcp.ResponseStatus.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetEmbeddingResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.GetEmbeddingResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.GetEmbeddingResponse} GetEmbeddingResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetEmbeddingResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetEmbeddingResponse message.
         * @function verify
         * @memberof folder_mcp.GetEmbeddingResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetEmbeddingResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.vectors != null && message.hasOwnProperty("vectors")) {
                if (!Array.isArray(message.vectors))
                    return "vectors: array expected";
                for (let i = 0; i < message.vectors.length; ++i) {
                    let error = $root.folder_mcp.EmbeddingVector.verify(message.vectors[i]);
                    if (error)
                        return "vectors." + error;
                }
            }
            if (message.vectorDimension != null && message.hasOwnProperty("vectorDimension"))
                if (!$util.isInteger(message.vectorDimension))
                    return "vectorDimension: integer expected";
            if (message.modelName != null && message.hasOwnProperty("modelName"))
                if (!$util.isString(message.modelName))
                    return "modelName: string expected";
            if (message.modelVersion != null && message.hasOwnProperty("modelVersion"))
                if (!$util.isString(message.modelVersion))
                    return "modelVersion: string expected";
            if (message.status != null && message.hasOwnProperty("status")) {
                let error = $root.folder_mcp.ResponseStatus.verify(message.status);
                if (error)
                    return "status." + error;
            }
            return null;
        };

        /**
         * Creates a GetEmbeddingResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.GetEmbeddingResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.GetEmbeddingResponse} GetEmbeddingResponse
         */
        GetEmbeddingResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.GetEmbeddingResponse)
                return object;
            let message = new $root.folder_mcp.GetEmbeddingResponse();
            if (object.vectors) {
                if (!Array.isArray(object.vectors))
                    throw TypeError(".folder_mcp.GetEmbeddingResponse.vectors: array expected");
                message.vectors = [];
                for (let i = 0; i < object.vectors.length; ++i) {
                    if (typeof object.vectors[i] !== "object")
                        throw TypeError(".folder_mcp.GetEmbeddingResponse.vectors: object expected");
                    message.vectors[i] = $root.folder_mcp.EmbeddingVector.fromObject(object.vectors[i]);
                }
            }
            if (object.vectorDimension != null)
                message.vectorDimension = object.vectorDimension | 0;
            if (object.modelName != null)
                message.modelName = String(object.modelName);
            if (object.modelVersion != null)
                message.modelVersion = String(object.modelVersion);
            if (object.status != null) {
                if (typeof object.status !== "object")
                    throw TypeError(".folder_mcp.GetEmbeddingResponse.status: object expected");
                message.status = $root.folder_mcp.ResponseStatus.fromObject(object.status);
            }
            return message;
        };

        /**
         * Creates a plain object from a GetEmbeddingResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.GetEmbeddingResponse
         * @static
         * @param {folder_mcp.GetEmbeddingResponse} message GetEmbeddingResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetEmbeddingResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.vectors = [];
            if (options.defaults) {
                object.vectorDimension = 0;
                object.modelName = "";
                object.modelVersion = "";
                object.status = null;
            }
            if (message.vectors && message.vectors.length) {
                object.vectors = [];
                for (let j = 0; j < message.vectors.length; ++j)
                    object.vectors[j] = $root.folder_mcp.EmbeddingVector.toObject(message.vectors[j], options);
            }
            if (message.vectorDimension != null && message.hasOwnProperty("vectorDimension"))
                object.vectorDimension = message.vectorDimension;
            if (message.modelName != null && message.hasOwnProperty("modelName"))
                object.modelName = message.modelName;
            if (message.modelVersion != null && message.hasOwnProperty("modelVersion"))
                object.modelVersion = message.modelVersion;
            if (message.status != null && message.hasOwnProperty("status"))
                object.status = $root.folder_mcp.ResponseStatus.toObject(message.status, options);
            return object;
        };

        /**
         * Converts this GetEmbeddingResponse to JSON.
         * @function toJSON
         * @memberof folder_mcp.GetEmbeddingResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetEmbeddingResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetEmbeddingResponse
         * @function getTypeUrl
         * @memberof folder_mcp.GetEmbeddingResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetEmbeddingResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.GetEmbeddingResponse";
        };

        return GetEmbeddingResponse;
    })();

    folder_mcp.EmbeddingVector = (function() {

        /**
         * Properties of an EmbeddingVector.
         * @memberof folder_mcp
         * @interface IEmbeddingVector
         * @property {string|null} [id] EmbeddingVector id
         * @property {folder_mcp.IEmbedding|null} [embedding] EmbeddingVector embedding
         * @property {string|null} [sourceType] EmbeddingVector sourceType
         */

        /**
         * Constructs a new EmbeddingVector.
         * @memberof folder_mcp
         * @classdesc Represents an EmbeddingVector.
         * @implements IEmbeddingVector
         * @constructor
         * @param {folder_mcp.IEmbeddingVector=} [properties] Properties to set
         */
        function EmbeddingVector(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * EmbeddingVector id.
         * @member {string} id
         * @memberof folder_mcp.EmbeddingVector
         * @instance
         */
        EmbeddingVector.prototype.id = "";

        /**
         * EmbeddingVector embedding.
         * @member {folder_mcp.IEmbedding|null|undefined} embedding
         * @memberof folder_mcp.EmbeddingVector
         * @instance
         */
        EmbeddingVector.prototype.embedding = null;

        /**
         * EmbeddingVector sourceType.
         * @member {string} sourceType
         * @memberof folder_mcp.EmbeddingVector
         * @instance
         */
        EmbeddingVector.prototype.sourceType = "";

        /**
         * Creates a new EmbeddingVector instance using the specified properties.
         * @function create
         * @memberof folder_mcp.EmbeddingVector
         * @static
         * @param {folder_mcp.IEmbeddingVector=} [properties] Properties to set
         * @returns {folder_mcp.EmbeddingVector} EmbeddingVector instance
         */
        EmbeddingVector.create = function create(properties) {
            return new EmbeddingVector(properties);
        };

        /**
         * Encodes the specified EmbeddingVector message. Does not implicitly {@link folder_mcp.EmbeddingVector.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.EmbeddingVector
         * @static
         * @param {folder_mcp.IEmbeddingVector} message EmbeddingVector message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EmbeddingVector.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
            if (message.embedding != null && Object.hasOwnProperty.call(message, "embedding"))
                $root.folder_mcp.Embedding.encode(message.embedding, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.sourceType != null && Object.hasOwnProperty.call(message, "sourceType"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.sourceType);
            return writer;
        };

        /**
         * Encodes the specified EmbeddingVector message, length delimited. Does not implicitly {@link folder_mcp.EmbeddingVector.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.EmbeddingVector
         * @static
         * @param {folder_mcp.IEmbeddingVector} message EmbeddingVector message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EmbeddingVector.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an EmbeddingVector message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.EmbeddingVector
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.EmbeddingVector} EmbeddingVector
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EmbeddingVector.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.EmbeddingVector();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.string();
                        break;
                    }
                case 2: {
                        message.embedding = $root.folder_mcp.Embedding.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.sourceType = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an EmbeddingVector message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.EmbeddingVector
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.EmbeddingVector} EmbeddingVector
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EmbeddingVector.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an EmbeddingVector message.
         * @function verify
         * @memberof folder_mcp.EmbeddingVector
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        EmbeddingVector.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            if (message.embedding != null && message.hasOwnProperty("embedding")) {
                let error = $root.folder_mcp.Embedding.verify(message.embedding);
                if (error)
                    return "embedding." + error;
            }
            if (message.sourceType != null && message.hasOwnProperty("sourceType"))
                if (!$util.isString(message.sourceType))
                    return "sourceType: string expected";
            return null;
        };

        /**
         * Creates an EmbeddingVector message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.EmbeddingVector
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.EmbeddingVector} EmbeddingVector
         */
        EmbeddingVector.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.EmbeddingVector)
                return object;
            let message = new $root.folder_mcp.EmbeddingVector();
            if (object.id != null)
                message.id = String(object.id);
            if (object.embedding != null) {
                if (typeof object.embedding !== "object")
                    throw TypeError(".folder_mcp.EmbeddingVector.embedding: object expected");
                message.embedding = $root.folder_mcp.Embedding.fromObject(object.embedding);
            }
            if (object.sourceType != null)
                message.sourceType = String(object.sourceType);
            return message;
        };

        /**
         * Creates a plain object from an EmbeddingVector message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.EmbeddingVector
         * @static
         * @param {folder_mcp.EmbeddingVector} message EmbeddingVector
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        EmbeddingVector.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.id = "";
                object.embedding = null;
                object.sourceType = "";
            }
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            if (message.embedding != null && message.hasOwnProperty("embedding"))
                object.embedding = $root.folder_mcp.Embedding.toObject(message.embedding, options);
            if (message.sourceType != null && message.hasOwnProperty("sourceType"))
                object.sourceType = message.sourceType;
            return object;
        };

        /**
         * Converts this EmbeddingVector to JSON.
         * @function toJSON
         * @memberof folder_mcp.EmbeddingVector
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        EmbeddingVector.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for EmbeddingVector
         * @function getTypeUrl
         * @memberof folder_mcp.EmbeddingVector
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        EmbeddingVector.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.EmbeddingVector";
        };

        return EmbeddingVector;
    })();

    folder_mcp.PaginationInfo = (function() {

        /**
         * Properties of a PaginationInfo.
         * @memberof folder_mcp
         * @interface IPaginationInfo
         * @property {number|null} [page] PaginationInfo page
         * @property {number|null} [perPage] PaginationInfo perPage
         * @property {number|null} [totalCount] PaginationInfo totalCount
         * @property {number|null} [totalPages] PaginationInfo totalPages
         * @property {boolean|null} [hasNext] PaginationInfo hasNext
         * @property {boolean|null} [hasPrevious] PaginationInfo hasPrevious
         */

        /**
         * Constructs a new PaginationInfo.
         * @memberof folder_mcp
         * @classdesc Represents a PaginationInfo.
         * @implements IPaginationInfo
         * @constructor
         * @param {folder_mcp.IPaginationInfo=} [properties] Properties to set
         */
        function PaginationInfo(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PaginationInfo page.
         * @member {number} page
         * @memberof folder_mcp.PaginationInfo
         * @instance
         */
        PaginationInfo.prototype.page = 0;

        /**
         * PaginationInfo perPage.
         * @member {number} perPage
         * @memberof folder_mcp.PaginationInfo
         * @instance
         */
        PaginationInfo.prototype.perPage = 0;

        /**
         * PaginationInfo totalCount.
         * @member {number} totalCount
         * @memberof folder_mcp.PaginationInfo
         * @instance
         */
        PaginationInfo.prototype.totalCount = 0;

        /**
         * PaginationInfo totalPages.
         * @member {number} totalPages
         * @memberof folder_mcp.PaginationInfo
         * @instance
         */
        PaginationInfo.prototype.totalPages = 0;

        /**
         * PaginationInfo hasNext.
         * @member {boolean} hasNext
         * @memberof folder_mcp.PaginationInfo
         * @instance
         */
        PaginationInfo.prototype.hasNext = false;

        /**
         * PaginationInfo hasPrevious.
         * @member {boolean} hasPrevious
         * @memberof folder_mcp.PaginationInfo
         * @instance
         */
        PaginationInfo.prototype.hasPrevious = false;

        /**
         * Creates a new PaginationInfo instance using the specified properties.
         * @function create
         * @memberof folder_mcp.PaginationInfo
         * @static
         * @param {folder_mcp.IPaginationInfo=} [properties] Properties to set
         * @returns {folder_mcp.PaginationInfo} PaginationInfo instance
         */
        PaginationInfo.create = function create(properties) {
            return new PaginationInfo(properties);
        };

        /**
         * Encodes the specified PaginationInfo message. Does not implicitly {@link folder_mcp.PaginationInfo.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.PaginationInfo
         * @static
         * @param {folder_mcp.IPaginationInfo} message PaginationInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PaginationInfo.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.page != null && Object.hasOwnProperty.call(message, "page"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.page);
            if (message.perPage != null && Object.hasOwnProperty.call(message, "perPage"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.perPage);
            if (message.totalCount != null && Object.hasOwnProperty.call(message, "totalCount"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.totalCount);
            if (message.totalPages != null && Object.hasOwnProperty.call(message, "totalPages"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.totalPages);
            if (message.hasNext != null && Object.hasOwnProperty.call(message, "hasNext"))
                writer.uint32(/* id 5, wireType 0 =*/40).bool(message.hasNext);
            if (message.hasPrevious != null && Object.hasOwnProperty.call(message, "hasPrevious"))
                writer.uint32(/* id 6, wireType 0 =*/48).bool(message.hasPrevious);
            return writer;
        };

        /**
         * Encodes the specified PaginationInfo message, length delimited. Does not implicitly {@link folder_mcp.PaginationInfo.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.PaginationInfo
         * @static
         * @param {folder_mcp.IPaginationInfo} message PaginationInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PaginationInfo.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PaginationInfo message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.PaginationInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.PaginationInfo} PaginationInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PaginationInfo.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.PaginationInfo();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.page = reader.int32();
                        break;
                    }
                case 2: {
                        message.perPage = reader.int32();
                        break;
                    }
                case 3: {
                        message.totalCount = reader.int32();
                        break;
                    }
                case 4: {
                        message.totalPages = reader.int32();
                        break;
                    }
                case 5: {
                        message.hasNext = reader.bool();
                        break;
                    }
                case 6: {
                        message.hasPrevious = reader.bool();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PaginationInfo message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.PaginationInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.PaginationInfo} PaginationInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PaginationInfo.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PaginationInfo message.
         * @function verify
         * @memberof folder_mcp.PaginationInfo
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PaginationInfo.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.page != null && message.hasOwnProperty("page"))
                if (!$util.isInteger(message.page))
                    return "page: integer expected";
            if (message.perPage != null && message.hasOwnProperty("perPage"))
                if (!$util.isInteger(message.perPage))
                    return "perPage: integer expected";
            if (message.totalCount != null && message.hasOwnProperty("totalCount"))
                if (!$util.isInteger(message.totalCount))
                    return "totalCount: integer expected";
            if (message.totalPages != null && message.hasOwnProperty("totalPages"))
                if (!$util.isInteger(message.totalPages))
                    return "totalPages: integer expected";
            if (message.hasNext != null && message.hasOwnProperty("hasNext"))
                if (typeof message.hasNext !== "boolean")
                    return "hasNext: boolean expected";
            if (message.hasPrevious != null && message.hasOwnProperty("hasPrevious"))
                if (typeof message.hasPrevious !== "boolean")
                    return "hasPrevious: boolean expected";
            return null;
        };

        /**
         * Creates a PaginationInfo message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.PaginationInfo
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.PaginationInfo} PaginationInfo
         */
        PaginationInfo.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.PaginationInfo)
                return object;
            let message = new $root.folder_mcp.PaginationInfo();
            if (object.page != null)
                message.page = object.page | 0;
            if (object.perPage != null)
                message.perPage = object.perPage | 0;
            if (object.totalCount != null)
                message.totalCount = object.totalCount | 0;
            if (object.totalPages != null)
                message.totalPages = object.totalPages | 0;
            if (object.hasNext != null)
                message.hasNext = Boolean(object.hasNext);
            if (object.hasPrevious != null)
                message.hasPrevious = Boolean(object.hasPrevious);
            return message;
        };

        /**
         * Creates a plain object from a PaginationInfo message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.PaginationInfo
         * @static
         * @param {folder_mcp.PaginationInfo} message PaginationInfo
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PaginationInfo.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.page = 0;
                object.perPage = 0;
                object.totalCount = 0;
                object.totalPages = 0;
                object.hasNext = false;
                object.hasPrevious = false;
            }
            if (message.page != null && message.hasOwnProperty("page"))
                object.page = message.page;
            if (message.perPage != null && message.hasOwnProperty("perPage"))
                object.perPage = message.perPage;
            if (message.totalCount != null && message.hasOwnProperty("totalCount"))
                object.totalCount = message.totalCount;
            if (message.totalPages != null && message.hasOwnProperty("totalPages"))
                object.totalPages = message.totalPages;
            if (message.hasNext != null && message.hasOwnProperty("hasNext"))
                object.hasNext = message.hasNext;
            if (message.hasPrevious != null && message.hasOwnProperty("hasPrevious"))
                object.hasPrevious = message.hasPrevious;
            return object;
        };

        /**
         * Converts this PaginationInfo to JSON.
         * @function toJSON
         * @memberof folder_mcp.PaginationInfo
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PaginationInfo.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PaginationInfo
         * @function getTypeUrl
         * @memberof folder_mcp.PaginationInfo
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PaginationInfo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.PaginationInfo";
        };

        return PaginationInfo;
    })();

    folder_mcp.Metadata = (function() {

        /**
         * Properties of a Metadata.
         * @memberof folder_mcp
         * @interface IMetadata
         * @property {Object.<string,string>|null} [stringValues] Metadata stringValues
         * @property {Object.<string,number|Long>|null} [intValues] Metadata intValues
         * @property {Object.<string,number>|null} [floatValues] Metadata floatValues
         * @property {Object.<string,boolean>|null} [boolValues] Metadata boolValues
         * @property {Object.<string,Uint8Array>|null} [binaryValues] Metadata binaryValues
         */

        /**
         * Constructs a new Metadata.
         * @memberof folder_mcp
         * @classdesc Represents a Metadata.
         * @implements IMetadata
         * @constructor
         * @param {folder_mcp.IMetadata=} [properties] Properties to set
         */
        function Metadata(properties) {
            this.stringValues = {};
            this.intValues = {};
            this.floatValues = {};
            this.boolValues = {};
            this.binaryValues = {};
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Metadata stringValues.
         * @member {Object.<string,string>} stringValues
         * @memberof folder_mcp.Metadata
         * @instance
         */
        Metadata.prototype.stringValues = $util.emptyObject;

        /**
         * Metadata intValues.
         * @member {Object.<string,number|Long>} intValues
         * @memberof folder_mcp.Metadata
         * @instance
         */
        Metadata.prototype.intValues = $util.emptyObject;

        /**
         * Metadata floatValues.
         * @member {Object.<string,number>} floatValues
         * @memberof folder_mcp.Metadata
         * @instance
         */
        Metadata.prototype.floatValues = $util.emptyObject;

        /**
         * Metadata boolValues.
         * @member {Object.<string,boolean>} boolValues
         * @memberof folder_mcp.Metadata
         * @instance
         */
        Metadata.prototype.boolValues = $util.emptyObject;

        /**
         * Metadata binaryValues.
         * @member {Object.<string,Uint8Array>} binaryValues
         * @memberof folder_mcp.Metadata
         * @instance
         */
        Metadata.prototype.binaryValues = $util.emptyObject;

        /**
         * Creates a new Metadata instance using the specified properties.
         * @function create
         * @memberof folder_mcp.Metadata
         * @static
         * @param {folder_mcp.IMetadata=} [properties] Properties to set
         * @returns {folder_mcp.Metadata} Metadata instance
         */
        Metadata.create = function create(properties) {
            return new Metadata(properties);
        };

        /**
         * Encodes the specified Metadata message. Does not implicitly {@link folder_mcp.Metadata.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.Metadata
         * @static
         * @param {folder_mcp.IMetadata} message Metadata message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Metadata.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.stringValues != null && Object.hasOwnProperty.call(message, "stringValues"))
                for (let keys = Object.keys(message.stringValues), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 1, wireType 2 =*/10).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 2 =*/18).string(message.stringValues[keys[i]]).ldelim();
            if (message.intValues != null && Object.hasOwnProperty.call(message, "intValues"))
                for (let keys = Object.keys(message.intValues), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 2, wireType 2 =*/18).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 0 =*/16).int64(message.intValues[keys[i]]).ldelim();
            if (message.floatValues != null && Object.hasOwnProperty.call(message, "floatValues"))
                for (let keys = Object.keys(message.floatValues), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 3, wireType 2 =*/26).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 1 =*/17).double(message.floatValues[keys[i]]).ldelim();
            if (message.boolValues != null && Object.hasOwnProperty.call(message, "boolValues"))
                for (let keys = Object.keys(message.boolValues), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 4, wireType 2 =*/34).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 0 =*/16).bool(message.boolValues[keys[i]]).ldelim();
            if (message.binaryValues != null && Object.hasOwnProperty.call(message, "binaryValues"))
                for (let keys = Object.keys(message.binaryValues), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 5, wireType 2 =*/42).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 2 =*/18).bytes(message.binaryValues[keys[i]]).ldelim();
            return writer;
        };

        /**
         * Encodes the specified Metadata message, length delimited. Does not implicitly {@link folder_mcp.Metadata.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.Metadata
         * @static
         * @param {folder_mcp.IMetadata} message Metadata message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Metadata.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Metadata message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.Metadata
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.Metadata} Metadata
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Metadata.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.Metadata(), key, value;
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (message.stringValues === $util.emptyObject)
                            message.stringValues = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = "";
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.string();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.stringValues[key] = value;
                        break;
                    }
                case 2: {
                        if (message.intValues === $util.emptyObject)
                            message.intValues = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = 0;
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.int64();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.intValues[key] = value;
                        break;
                    }
                case 3: {
                        if (message.floatValues === $util.emptyObject)
                            message.floatValues = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = 0;
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.double();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.floatValues[key] = value;
                        break;
                    }
                case 4: {
                        if (message.boolValues === $util.emptyObject)
                            message.boolValues = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = false;
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.bool();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.boolValues[key] = value;
                        break;
                    }
                case 5: {
                        if (message.binaryValues === $util.emptyObject)
                            message.binaryValues = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = [];
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.bytes();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.binaryValues[key] = value;
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Metadata message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.Metadata
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.Metadata} Metadata
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Metadata.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Metadata message.
         * @function verify
         * @memberof folder_mcp.Metadata
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Metadata.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.stringValues != null && message.hasOwnProperty("stringValues")) {
                if (!$util.isObject(message.stringValues))
                    return "stringValues: object expected";
                let key = Object.keys(message.stringValues);
                for (let i = 0; i < key.length; ++i)
                    if (!$util.isString(message.stringValues[key[i]]))
                        return "stringValues: string{k:string} expected";
            }
            if (message.intValues != null && message.hasOwnProperty("intValues")) {
                if (!$util.isObject(message.intValues))
                    return "intValues: object expected";
                let key = Object.keys(message.intValues);
                for (let i = 0; i < key.length; ++i)
                    if (!$util.isInteger(message.intValues[key[i]]) && !(message.intValues[key[i]] && $util.isInteger(message.intValues[key[i]].low) && $util.isInteger(message.intValues[key[i]].high)))
                        return "intValues: integer|Long{k:string} expected";
            }
            if (message.floatValues != null && message.hasOwnProperty("floatValues")) {
                if (!$util.isObject(message.floatValues))
                    return "floatValues: object expected";
                let key = Object.keys(message.floatValues);
                for (let i = 0; i < key.length; ++i)
                    if (typeof message.floatValues[key[i]] !== "number")
                        return "floatValues: number{k:string} expected";
            }
            if (message.boolValues != null && message.hasOwnProperty("boolValues")) {
                if (!$util.isObject(message.boolValues))
                    return "boolValues: object expected";
                let key = Object.keys(message.boolValues);
                for (let i = 0; i < key.length; ++i)
                    if (typeof message.boolValues[key[i]] !== "boolean")
                        return "boolValues: boolean{k:string} expected";
            }
            if (message.binaryValues != null && message.hasOwnProperty("binaryValues")) {
                if (!$util.isObject(message.binaryValues))
                    return "binaryValues: object expected";
                let key = Object.keys(message.binaryValues);
                for (let i = 0; i < key.length; ++i)
                    if (!(message.binaryValues[key[i]] && typeof message.binaryValues[key[i]].length === "number" || $util.isString(message.binaryValues[key[i]])))
                        return "binaryValues: buffer{k:string} expected";
            }
            return null;
        };

        /**
         * Creates a Metadata message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.Metadata
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.Metadata} Metadata
         */
        Metadata.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.Metadata)
                return object;
            let message = new $root.folder_mcp.Metadata();
            if (object.stringValues) {
                if (typeof object.stringValues !== "object")
                    throw TypeError(".folder_mcp.Metadata.stringValues: object expected");
                message.stringValues = {};
                for (let keys = Object.keys(object.stringValues), i = 0; i < keys.length; ++i)
                    message.stringValues[keys[i]] = String(object.stringValues[keys[i]]);
            }
            if (object.intValues) {
                if (typeof object.intValues !== "object")
                    throw TypeError(".folder_mcp.Metadata.intValues: object expected");
                message.intValues = {};
                for (let keys = Object.keys(object.intValues), i = 0; i < keys.length; ++i)
                    if ($util.Long)
                        (message.intValues[keys[i]] = $util.Long.fromValue(object.intValues[keys[i]])).unsigned = false;
                    else if (typeof object.intValues[keys[i]] === "string")
                        message.intValues[keys[i]] = parseInt(object.intValues[keys[i]], 10);
                    else if (typeof object.intValues[keys[i]] === "number")
                        message.intValues[keys[i]] = object.intValues[keys[i]];
                    else if (typeof object.intValues[keys[i]] === "object")
                        message.intValues[keys[i]] = new $util.LongBits(object.intValues[keys[i]].low >>> 0, object.intValues[keys[i]].high >>> 0).toNumber();
            }
            if (object.floatValues) {
                if (typeof object.floatValues !== "object")
                    throw TypeError(".folder_mcp.Metadata.floatValues: object expected");
                message.floatValues = {};
                for (let keys = Object.keys(object.floatValues), i = 0; i < keys.length; ++i)
                    message.floatValues[keys[i]] = Number(object.floatValues[keys[i]]);
            }
            if (object.boolValues) {
                if (typeof object.boolValues !== "object")
                    throw TypeError(".folder_mcp.Metadata.boolValues: object expected");
                message.boolValues = {};
                for (let keys = Object.keys(object.boolValues), i = 0; i < keys.length; ++i)
                    message.boolValues[keys[i]] = Boolean(object.boolValues[keys[i]]);
            }
            if (object.binaryValues) {
                if (typeof object.binaryValues !== "object")
                    throw TypeError(".folder_mcp.Metadata.binaryValues: object expected");
                message.binaryValues = {};
                for (let keys = Object.keys(object.binaryValues), i = 0; i < keys.length; ++i)
                    if (typeof object.binaryValues[keys[i]] === "string")
                        $util.base64.decode(object.binaryValues[keys[i]], message.binaryValues[keys[i]] = $util.newBuffer($util.base64.length(object.binaryValues[keys[i]])), 0);
                    else if (object.binaryValues[keys[i]].length >= 0)
                        message.binaryValues[keys[i]] = object.binaryValues[keys[i]];
            }
            return message;
        };

        /**
         * Creates a plain object from a Metadata message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.Metadata
         * @static
         * @param {folder_mcp.Metadata} message Metadata
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Metadata.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.objects || options.defaults) {
                object.stringValues = {};
                object.intValues = {};
                object.floatValues = {};
                object.boolValues = {};
                object.binaryValues = {};
            }
            let keys2;
            if (message.stringValues && (keys2 = Object.keys(message.stringValues)).length) {
                object.stringValues = {};
                for (let j = 0; j < keys2.length; ++j)
                    object.stringValues[keys2[j]] = message.stringValues[keys2[j]];
            }
            if (message.intValues && (keys2 = Object.keys(message.intValues)).length) {
                object.intValues = {};
                for (let j = 0; j < keys2.length; ++j)
                    if (typeof message.intValues[keys2[j]] === "number")
                        object.intValues[keys2[j]] = options.longs === String ? String(message.intValues[keys2[j]]) : message.intValues[keys2[j]];
                    else
                        object.intValues[keys2[j]] = options.longs === String ? $util.Long.prototype.toString.call(message.intValues[keys2[j]]) : options.longs === Number ? new $util.LongBits(message.intValues[keys2[j]].low >>> 0, message.intValues[keys2[j]].high >>> 0).toNumber() : message.intValues[keys2[j]];
            }
            if (message.floatValues && (keys2 = Object.keys(message.floatValues)).length) {
                object.floatValues = {};
                for (let j = 0; j < keys2.length; ++j)
                    object.floatValues[keys2[j]] = options.json && !isFinite(message.floatValues[keys2[j]]) ? String(message.floatValues[keys2[j]]) : message.floatValues[keys2[j]];
            }
            if (message.boolValues && (keys2 = Object.keys(message.boolValues)).length) {
                object.boolValues = {};
                for (let j = 0; j < keys2.length; ++j)
                    object.boolValues[keys2[j]] = message.boolValues[keys2[j]];
            }
            if (message.binaryValues && (keys2 = Object.keys(message.binaryValues)).length) {
                object.binaryValues = {};
                for (let j = 0; j < keys2.length; ++j)
                    object.binaryValues[keys2[j]] = options.bytes === String ? $util.base64.encode(message.binaryValues[keys2[j]], 0, message.binaryValues[keys2[j]].length) : options.bytes === Array ? Array.prototype.slice.call(message.binaryValues[keys2[j]]) : message.binaryValues[keys2[j]];
            }
            return object;
        };

        /**
         * Converts this Metadata to JSON.
         * @function toJSON
         * @memberof folder_mcp.Metadata
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Metadata.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Metadata
         * @function getTypeUrl
         * @memberof folder_mcp.Metadata
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Metadata.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.Metadata";
        };

        return Metadata;
    })();

    folder_mcp.Progress = (function() {

        /**
         * Properties of a Progress.
         * @memberof folder_mcp
         * @interface IProgress
         * @property {number|null} [completed] Progress completed
         * @property {number|null} [total] Progress total
         * @property {number|null} [percentage] Progress percentage
         * @property {string|null} [eta] Progress eta
         * @property {string|null} [currentItem] Progress currentItem
         */

        /**
         * Constructs a new Progress.
         * @memberof folder_mcp
         * @classdesc Represents a Progress.
         * @implements IProgress
         * @constructor
         * @param {folder_mcp.IProgress=} [properties] Properties to set
         */
        function Progress(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Progress completed.
         * @member {number} completed
         * @memberof folder_mcp.Progress
         * @instance
         */
        Progress.prototype.completed = 0;

        /**
         * Progress total.
         * @member {number} total
         * @memberof folder_mcp.Progress
         * @instance
         */
        Progress.prototype.total = 0;

        /**
         * Progress percentage.
         * @member {number} percentage
         * @memberof folder_mcp.Progress
         * @instance
         */
        Progress.prototype.percentage = 0;

        /**
         * Progress eta.
         * @member {string} eta
         * @memberof folder_mcp.Progress
         * @instance
         */
        Progress.prototype.eta = "";

        /**
         * Progress currentItem.
         * @member {string} currentItem
         * @memberof folder_mcp.Progress
         * @instance
         */
        Progress.prototype.currentItem = "";

        /**
         * Creates a new Progress instance using the specified properties.
         * @function create
         * @memberof folder_mcp.Progress
         * @static
         * @param {folder_mcp.IProgress=} [properties] Properties to set
         * @returns {folder_mcp.Progress} Progress instance
         */
        Progress.create = function create(properties) {
            return new Progress(properties);
        };

        /**
         * Encodes the specified Progress message. Does not implicitly {@link folder_mcp.Progress.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.Progress
         * @static
         * @param {folder_mcp.IProgress} message Progress message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Progress.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.completed != null && Object.hasOwnProperty.call(message, "completed"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.completed);
            if (message.total != null && Object.hasOwnProperty.call(message, "total"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.total);
            if (message.percentage != null && Object.hasOwnProperty.call(message, "percentage"))
                writer.uint32(/* id 3, wireType 5 =*/29).float(message.percentage);
            if (message.eta != null && Object.hasOwnProperty.call(message, "eta"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.eta);
            if (message.currentItem != null && Object.hasOwnProperty.call(message, "currentItem"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.currentItem);
            return writer;
        };

        /**
         * Encodes the specified Progress message, length delimited. Does not implicitly {@link folder_mcp.Progress.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.Progress
         * @static
         * @param {folder_mcp.IProgress} message Progress message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Progress.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Progress message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.Progress
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.Progress} Progress
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Progress.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.Progress();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.completed = reader.int32();
                        break;
                    }
                case 2: {
                        message.total = reader.int32();
                        break;
                    }
                case 3: {
                        message.percentage = reader.float();
                        break;
                    }
                case 4: {
                        message.eta = reader.string();
                        break;
                    }
                case 5: {
                        message.currentItem = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Progress message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.Progress
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.Progress} Progress
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Progress.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Progress message.
         * @function verify
         * @memberof folder_mcp.Progress
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Progress.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.completed != null && message.hasOwnProperty("completed"))
                if (!$util.isInteger(message.completed))
                    return "completed: integer expected";
            if (message.total != null && message.hasOwnProperty("total"))
                if (!$util.isInteger(message.total))
                    return "total: integer expected";
            if (message.percentage != null && message.hasOwnProperty("percentage"))
                if (typeof message.percentage !== "number")
                    return "percentage: number expected";
            if (message.eta != null && message.hasOwnProperty("eta"))
                if (!$util.isString(message.eta))
                    return "eta: string expected";
            if (message.currentItem != null && message.hasOwnProperty("currentItem"))
                if (!$util.isString(message.currentItem))
                    return "currentItem: string expected";
            return null;
        };

        /**
         * Creates a Progress message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.Progress
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.Progress} Progress
         */
        Progress.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.Progress)
                return object;
            let message = new $root.folder_mcp.Progress();
            if (object.completed != null)
                message.completed = object.completed | 0;
            if (object.total != null)
                message.total = object.total | 0;
            if (object.percentage != null)
                message.percentage = Number(object.percentage);
            if (object.eta != null)
                message.eta = String(object.eta);
            if (object.currentItem != null)
                message.currentItem = String(object.currentItem);
            return message;
        };

        /**
         * Creates a plain object from a Progress message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.Progress
         * @static
         * @param {folder_mcp.Progress} message Progress
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Progress.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.completed = 0;
                object.total = 0;
                object.percentage = 0;
                object.eta = "";
                object.currentItem = "";
            }
            if (message.completed != null && message.hasOwnProperty("completed"))
                object.completed = message.completed;
            if (message.total != null && message.hasOwnProperty("total"))
                object.total = message.total;
            if (message.percentage != null && message.hasOwnProperty("percentage"))
                object.percentage = options.json && !isFinite(message.percentage) ? String(message.percentage) : message.percentage;
            if (message.eta != null && message.hasOwnProperty("eta"))
                object.eta = message.eta;
            if (message.currentItem != null && message.hasOwnProperty("currentItem"))
                object.currentItem = message.currentItem;
            return object;
        };

        /**
         * Converts this Progress to JSON.
         * @function toJSON
         * @memberof folder_mcp.Progress
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Progress.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Progress
         * @function getTypeUrl
         * @memberof folder_mcp.Progress
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Progress.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.Progress";
        };

        return Progress;
    })();

    folder_mcp.SimilarityScore = (function() {

        /**
         * Properties of a SimilarityScore.
         * @memberof folder_mcp
         * @interface ISimilarityScore
         * @property {number|null} [score] SimilarityScore score
         * @property {number|null} [confidence] SimilarityScore confidence
         * @property {number|null} [rank] SimilarityScore rank
         * @property {string|null} [method] SimilarityScore method
         */

        /**
         * Constructs a new SimilarityScore.
         * @memberof folder_mcp
         * @classdesc Represents a SimilarityScore.
         * @implements ISimilarityScore
         * @constructor
         * @param {folder_mcp.ISimilarityScore=} [properties] Properties to set
         */
        function SimilarityScore(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SimilarityScore score.
         * @member {number} score
         * @memberof folder_mcp.SimilarityScore
         * @instance
         */
        SimilarityScore.prototype.score = 0;

        /**
         * SimilarityScore confidence.
         * @member {number} confidence
         * @memberof folder_mcp.SimilarityScore
         * @instance
         */
        SimilarityScore.prototype.confidence = 0;

        /**
         * SimilarityScore rank.
         * @member {number} rank
         * @memberof folder_mcp.SimilarityScore
         * @instance
         */
        SimilarityScore.prototype.rank = 0;

        /**
         * SimilarityScore method.
         * @member {string} method
         * @memberof folder_mcp.SimilarityScore
         * @instance
         */
        SimilarityScore.prototype.method = "";

        /**
         * Creates a new SimilarityScore instance using the specified properties.
         * @function create
         * @memberof folder_mcp.SimilarityScore
         * @static
         * @param {folder_mcp.ISimilarityScore=} [properties] Properties to set
         * @returns {folder_mcp.SimilarityScore} SimilarityScore instance
         */
        SimilarityScore.create = function create(properties) {
            return new SimilarityScore(properties);
        };

        /**
         * Encodes the specified SimilarityScore message. Does not implicitly {@link folder_mcp.SimilarityScore.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.SimilarityScore
         * @static
         * @param {folder_mcp.ISimilarityScore} message SimilarityScore message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SimilarityScore.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.score != null && Object.hasOwnProperty.call(message, "score"))
                writer.uint32(/* id 1, wireType 5 =*/13).float(message.score);
            if (message.confidence != null && Object.hasOwnProperty.call(message, "confidence"))
                writer.uint32(/* id 2, wireType 5 =*/21).float(message.confidence);
            if (message.rank != null && Object.hasOwnProperty.call(message, "rank"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.rank);
            if (message.method != null && Object.hasOwnProperty.call(message, "method"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.method);
            return writer;
        };

        /**
         * Encodes the specified SimilarityScore message, length delimited. Does not implicitly {@link folder_mcp.SimilarityScore.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.SimilarityScore
         * @static
         * @param {folder_mcp.ISimilarityScore} message SimilarityScore message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SimilarityScore.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SimilarityScore message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.SimilarityScore
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.SimilarityScore} SimilarityScore
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SimilarityScore.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.SimilarityScore();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.score = reader.float();
                        break;
                    }
                case 2: {
                        message.confidence = reader.float();
                        break;
                    }
                case 3: {
                        message.rank = reader.int32();
                        break;
                    }
                case 4: {
                        message.method = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SimilarityScore message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.SimilarityScore
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.SimilarityScore} SimilarityScore
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SimilarityScore.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SimilarityScore message.
         * @function verify
         * @memberof folder_mcp.SimilarityScore
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SimilarityScore.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.score != null && message.hasOwnProperty("score"))
                if (typeof message.score !== "number")
                    return "score: number expected";
            if (message.confidence != null && message.hasOwnProperty("confidence"))
                if (typeof message.confidence !== "number")
                    return "confidence: number expected";
            if (message.rank != null && message.hasOwnProperty("rank"))
                if (!$util.isInteger(message.rank))
                    return "rank: integer expected";
            if (message.method != null && message.hasOwnProperty("method"))
                if (!$util.isString(message.method))
                    return "method: string expected";
            return null;
        };

        /**
         * Creates a SimilarityScore message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.SimilarityScore
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.SimilarityScore} SimilarityScore
         */
        SimilarityScore.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.SimilarityScore)
                return object;
            let message = new $root.folder_mcp.SimilarityScore();
            if (object.score != null)
                message.score = Number(object.score);
            if (object.confidence != null)
                message.confidence = Number(object.confidence);
            if (object.rank != null)
                message.rank = object.rank | 0;
            if (object.method != null)
                message.method = String(object.method);
            return message;
        };

        /**
         * Creates a plain object from a SimilarityScore message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.SimilarityScore
         * @static
         * @param {folder_mcp.SimilarityScore} message SimilarityScore
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SimilarityScore.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.score = 0;
                object.confidence = 0;
                object.rank = 0;
                object.method = "";
            }
            if (message.score != null && message.hasOwnProperty("score"))
                object.score = options.json && !isFinite(message.score) ? String(message.score) : message.score;
            if (message.confidence != null && message.hasOwnProperty("confidence"))
                object.confidence = options.json && !isFinite(message.confidence) ? String(message.confidence) : message.confidence;
            if (message.rank != null && message.hasOwnProperty("rank"))
                object.rank = message.rank;
            if (message.method != null && message.hasOwnProperty("method"))
                object.method = message.method;
            return object;
        };

        /**
         * Converts this SimilarityScore to JSON.
         * @function toJSON
         * @memberof folder_mcp.SimilarityScore
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SimilarityScore.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SimilarityScore
         * @function getTypeUrl
         * @memberof folder_mcp.SimilarityScore
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SimilarityScore.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.SimilarityScore";
        };

        return SimilarityScore;
    })();

    folder_mcp.DateRange = (function() {

        /**
         * Properties of a DateRange.
         * @memberof folder_mcp
         * @interface IDateRange
         * @property {string|null} [from] DateRange from
         * @property {string|null} [to] DateRange to
         * @property {string|null} [timezone] DateRange timezone
         * @property {string|null} [precision] DateRange precision
         */

        /**
         * Constructs a new DateRange.
         * @memberof folder_mcp
         * @classdesc Represents a DateRange.
         * @implements IDateRange
         * @constructor
         * @param {folder_mcp.IDateRange=} [properties] Properties to set
         */
        function DateRange(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DateRange from.
         * @member {string} from
         * @memberof folder_mcp.DateRange
         * @instance
         */
        DateRange.prototype.from = "";

        /**
         * DateRange to.
         * @member {string} to
         * @memberof folder_mcp.DateRange
         * @instance
         */
        DateRange.prototype.to = "";

        /**
         * DateRange timezone.
         * @member {string} timezone
         * @memberof folder_mcp.DateRange
         * @instance
         */
        DateRange.prototype.timezone = "";

        /**
         * DateRange precision.
         * @member {string} precision
         * @memberof folder_mcp.DateRange
         * @instance
         */
        DateRange.prototype.precision = "";

        /**
         * Creates a new DateRange instance using the specified properties.
         * @function create
         * @memberof folder_mcp.DateRange
         * @static
         * @param {folder_mcp.IDateRange=} [properties] Properties to set
         * @returns {folder_mcp.DateRange} DateRange instance
         */
        DateRange.create = function create(properties) {
            return new DateRange(properties);
        };

        /**
         * Encodes the specified DateRange message. Does not implicitly {@link folder_mcp.DateRange.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.DateRange
         * @static
         * @param {folder_mcp.IDateRange} message DateRange message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DateRange.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.from != null && Object.hasOwnProperty.call(message, "from"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.from);
            if (message.to != null && Object.hasOwnProperty.call(message, "to"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.to);
            if (message.timezone != null && Object.hasOwnProperty.call(message, "timezone"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.timezone);
            if (message.precision != null && Object.hasOwnProperty.call(message, "precision"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.precision);
            return writer;
        };

        /**
         * Encodes the specified DateRange message, length delimited. Does not implicitly {@link folder_mcp.DateRange.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.DateRange
         * @static
         * @param {folder_mcp.IDateRange} message DateRange message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DateRange.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DateRange message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.DateRange
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.DateRange} DateRange
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DateRange.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.DateRange();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.from = reader.string();
                        break;
                    }
                case 2: {
                        message.to = reader.string();
                        break;
                    }
                case 3: {
                        message.timezone = reader.string();
                        break;
                    }
                case 4: {
                        message.precision = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a DateRange message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.DateRange
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.DateRange} DateRange
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DateRange.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a DateRange message.
         * @function verify
         * @memberof folder_mcp.DateRange
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        DateRange.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.from != null && message.hasOwnProperty("from"))
                if (!$util.isString(message.from))
                    return "from: string expected";
            if (message.to != null && message.hasOwnProperty("to"))
                if (!$util.isString(message.to))
                    return "to: string expected";
            if (message.timezone != null && message.hasOwnProperty("timezone"))
                if (!$util.isString(message.timezone))
                    return "timezone: string expected";
            if (message.precision != null && message.hasOwnProperty("precision"))
                if (!$util.isString(message.precision))
                    return "precision: string expected";
            return null;
        };

        /**
         * Creates a DateRange message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.DateRange
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.DateRange} DateRange
         */
        DateRange.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.DateRange)
                return object;
            let message = new $root.folder_mcp.DateRange();
            if (object.from != null)
                message.from = String(object.from);
            if (object.to != null)
                message.to = String(object.to);
            if (object.timezone != null)
                message.timezone = String(object.timezone);
            if (object.precision != null)
                message.precision = String(object.precision);
            return message;
        };

        /**
         * Creates a plain object from a DateRange message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.DateRange
         * @static
         * @param {folder_mcp.DateRange} message DateRange
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        DateRange.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.from = "";
                object.to = "";
                object.timezone = "";
                object.precision = "";
            }
            if (message.from != null && message.hasOwnProperty("from"))
                object.from = message.from;
            if (message.to != null && message.hasOwnProperty("to"))
                object.to = message.to;
            if (message.timezone != null && message.hasOwnProperty("timezone"))
                object.timezone = message.timezone;
            if (message.precision != null && message.hasOwnProperty("precision"))
                object.precision = message.precision;
            return object;
        };

        /**
         * Converts this DateRange to JSON.
         * @function toJSON
         * @memberof folder_mcp.DateRange
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        DateRange.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for DateRange
         * @function getTypeUrl
         * @memberof folder_mcp.DateRange
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        DateRange.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.DateRange";
        };

        return DateRange;
    })();

    folder_mcp.Author = (function() {

        /**
         * Properties of an Author.
         * @memberof folder_mcp
         * @interface IAuthor
         * @property {string|null} [name] Author name
         * @property {string|null} [email] Author email
         * @property {string|null} [role] Author role
         * @property {string|null} [lastModified] Author lastModified
         * @property {Object.<string,string>|null} [attributes] Author attributes
         */

        /**
         * Constructs a new Author.
         * @memberof folder_mcp
         * @classdesc Represents an Author.
         * @implements IAuthor
         * @constructor
         * @param {folder_mcp.IAuthor=} [properties] Properties to set
         */
        function Author(properties) {
            this.attributes = {};
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Author name.
         * @member {string} name
         * @memberof folder_mcp.Author
         * @instance
         */
        Author.prototype.name = "";

        /**
         * Author email.
         * @member {string} email
         * @memberof folder_mcp.Author
         * @instance
         */
        Author.prototype.email = "";

        /**
         * Author role.
         * @member {string} role
         * @memberof folder_mcp.Author
         * @instance
         */
        Author.prototype.role = "";

        /**
         * Author lastModified.
         * @member {string} lastModified
         * @memberof folder_mcp.Author
         * @instance
         */
        Author.prototype.lastModified = "";

        /**
         * Author attributes.
         * @member {Object.<string,string>} attributes
         * @memberof folder_mcp.Author
         * @instance
         */
        Author.prototype.attributes = $util.emptyObject;

        /**
         * Creates a new Author instance using the specified properties.
         * @function create
         * @memberof folder_mcp.Author
         * @static
         * @param {folder_mcp.IAuthor=} [properties] Properties to set
         * @returns {folder_mcp.Author} Author instance
         */
        Author.create = function create(properties) {
            return new Author(properties);
        };

        /**
         * Encodes the specified Author message. Does not implicitly {@link folder_mcp.Author.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.Author
         * @static
         * @param {folder_mcp.IAuthor} message Author message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Author.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
            if (message.email != null && Object.hasOwnProperty.call(message, "email"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.email);
            if (message.role != null && Object.hasOwnProperty.call(message, "role"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.role);
            if (message.lastModified != null && Object.hasOwnProperty.call(message, "lastModified"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.lastModified);
            if (message.attributes != null && Object.hasOwnProperty.call(message, "attributes"))
                for (let keys = Object.keys(message.attributes), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 5, wireType 2 =*/42).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 2 =*/18).string(message.attributes[keys[i]]).ldelim();
            return writer;
        };

        /**
         * Encodes the specified Author message, length delimited. Does not implicitly {@link folder_mcp.Author.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.Author
         * @static
         * @param {folder_mcp.IAuthor} message Author message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Author.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an Author message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.Author
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.Author} Author
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Author.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.Author(), key, value;
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.name = reader.string();
                        break;
                    }
                case 2: {
                        message.email = reader.string();
                        break;
                    }
                case 3: {
                        message.role = reader.string();
                        break;
                    }
                case 4: {
                        message.lastModified = reader.string();
                        break;
                    }
                case 5: {
                        if (message.attributes === $util.emptyObject)
                            message.attributes = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = "";
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.string();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.attributes[key] = value;
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an Author message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.Author
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.Author} Author
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Author.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an Author message.
         * @function verify
         * @memberof folder_mcp.Author
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Author.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.name != null && message.hasOwnProperty("name"))
                if (!$util.isString(message.name))
                    return "name: string expected";
            if (message.email != null && message.hasOwnProperty("email"))
                if (!$util.isString(message.email))
                    return "email: string expected";
            if (message.role != null && message.hasOwnProperty("role"))
                if (!$util.isString(message.role))
                    return "role: string expected";
            if (message.lastModified != null && message.hasOwnProperty("lastModified"))
                if (!$util.isString(message.lastModified))
                    return "lastModified: string expected";
            if (message.attributes != null && message.hasOwnProperty("attributes")) {
                if (!$util.isObject(message.attributes))
                    return "attributes: object expected";
                let key = Object.keys(message.attributes);
                for (let i = 0; i < key.length; ++i)
                    if (!$util.isString(message.attributes[key[i]]))
                        return "attributes: string{k:string} expected";
            }
            return null;
        };

        /**
         * Creates an Author message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.Author
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.Author} Author
         */
        Author.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.Author)
                return object;
            let message = new $root.folder_mcp.Author();
            if (object.name != null)
                message.name = String(object.name);
            if (object.email != null)
                message.email = String(object.email);
            if (object.role != null)
                message.role = String(object.role);
            if (object.lastModified != null)
                message.lastModified = String(object.lastModified);
            if (object.attributes) {
                if (typeof object.attributes !== "object")
                    throw TypeError(".folder_mcp.Author.attributes: object expected");
                message.attributes = {};
                for (let keys = Object.keys(object.attributes), i = 0; i < keys.length; ++i)
                    message.attributes[keys[i]] = String(object.attributes[keys[i]]);
            }
            return message;
        };

        /**
         * Creates a plain object from an Author message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.Author
         * @static
         * @param {folder_mcp.Author} message Author
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Author.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.objects || options.defaults)
                object.attributes = {};
            if (options.defaults) {
                object.name = "";
                object.email = "";
                object.role = "";
                object.lastModified = "";
            }
            if (message.name != null && message.hasOwnProperty("name"))
                object.name = message.name;
            if (message.email != null && message.hasOwnProperty("email"))
                object.email = message.email;
            if (message.role != null && message.hasOwnProperty("role"))
                object.role = message.role;
            if (message.lastModified != null && message.hasOwnProperty("lastModified"))
                object.lastModified = message.lastModified;
            let keys2;
            if (message.attributes && (keys2 = Object.keys(message.attributes)).length) {
                object.attributes = {};
                for (let j = 0; j < keys2.length; ++j)
                    object.attributes[keys2[j]] = message.attributes[keys2[j]];
            }
            return object;
        };

        /**
         * Converts this Author to JSON.
         * @function toJSON
         * @memberof folder_mcp.Author
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Author.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Author
         * @function getTypeUrl
         * @memberof folder_mcp.Author
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Author.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.Author";
        };

        return Author;
    })();

    folder_mcp.DocumentStructureEnhanced = (function() {

        /**
         * Properties of a DocumentStructureEnhanced.
         * @memberof folder_mcp
         * @interface IDocumentStructureEnhanced
         * @property {Array.<folder_mcp.ISheetInfo>|null} [sheets] DocumentStructureEnhanced sheets
         * @property {Array.<folder_mcp.ISlideInfo>|null} [slides] DocumentStructureEnhanced slides
         * @property {Array.<folder_mcp.IPageInfo>|null} [pages] DocumentStructureEnhanced pages
         * @property {Array.<folder_mcp.ISectionInfo>|null} [sections] DocumentStructureEnhanced sections
         * @property {Array.<folder_mcp.ITableOfContentsEntry>|null} [toc] DocumentStructureEnhanced toc
         * @property {Array.<string>|null} [tags] DocumentStructureEnhanced tags
         * @property {Object.<string,string>|null} [properties] DocumentStructureEnhanced properties
         */

        /**
         * Constructs a new DocumentStructureEnhanced.
         * @memberof folder_mcp
         * @classdesc Represents a DocumentStructureEnhanced.
         * @implements IDocumentStructureEnhanced
         * @constructor
         * @param {folder_mcp.IDocumentStructureEnhanced=} [properties] Properties to set
         */
        function DocumentStructureEnhanced(properties) {
            this.sheets = [];
            this.slides = [];
            this.pages = [];
            this.sections = [];
            this.toc = [];
            this.tags = [];
            this.properties = {};
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DocumentStructureEnhanced sheets.
         * @member {Array.<folder_mcp.ISheetInfo>} sheets
         * @memberof folder_mcp.DocumentStructureEnhanced
         * @instance
         */
        DocumentStructureEnhanced.prototype.sheets = $util.emptyArray;

        /**
         * DocumentStructureEnhanced slides.
         * @member {Array.<folder_mcp.ISlideInfo>} slides
         * @memberof folder_mcp.DocumentStructureEnhanced
         * @instance
         */
        DocumentStructureEnhanced.prototype.slides = $util.emptyArray;

        /**
         * DocumentStructureEnhanced pages.
         * @member {Array.<folder_mcp.IPageInfo>} pages
         * @memberof folder_mcp.DocumentStructureEnhanced
         * @instance
         */
        DocumentStructureEnhanced.prototype.pages = $util.emptyArray;

        /**
         * DocumentStructureEnhanced sections.
         * @member {Array.<folder_mcp.ISectionInfo>} sections
         * @memberof folder_mcp.DocumentStructureEnhanced
         * @instance
         */
        DocumentStructureEnhanced.prototype.sections = $util.emptyArray;

        /**
         * DocumentStructureEnhanced toc.
         * @member {Array.<folder_mcp.ITableOfContentsEntry>} toc
         * @memberof folder_mcp.DocumentStructureEnhanced
         * @instance
         */
        DocumentStructureEnhanced.prototype.toc = $util.emptyArray;

        /**
         * DocumentStructureEnhanced tags.
         * @member {Array.<string>} tags
         * @memberof folder_mcp.DocumentStructureEnhanced
         * @instance
         */
        DocumentStructureEnhanced.prototype.tags = $util.emptyArray;

        /**
         * DocumentStructureEnhanced properties.
         * @member {Object.<string,string>} properties
         * @memberof folder_mcp.DocumentStructureEnhanced
         * @instance
         */
        DocumentStructureEnhanced.prototype.properties = $util.emptyObject;

        /**
         * Creates a new DocumentStructureEnhanced instance using the specified properties.
         * @function create
         * @memberof folder_mcp.DocumentStructureEnhanced
         * @static
         * @param {folder_mcp.IDocumentStructureEnhanced=} [properties] Properties to set
         * @returns {folder_mcp.DocumentStructureEnhanced} DocumentStructureEnhanced instance
         */
        DocumentStructureEnhanced.create = function create(properties) {
            return new DocumentStructureEnhanced(properties);
        };

        /**
         * Encodes the specified DocumentStructureEnhanced message. Does not implicitly {@link folder_mcp.DocumentStructureEnhanced.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.DocumentStructureEnhanced
         * @static
         * @param {folder_mcp.IDocumentStructureEnhanced} message DocumentStructureEnhanced message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DocumentStructureEnhanced.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.sheets != null && message.sheets.length)
                for (let i = 0; i < message.sheets.length; ++i)
                    $root.folder_mcp.SheetInfo.encode(message.sheets[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.slides != null && message.slides.length)
                for (let i = 0; i < message.slides.length; ++i)
                    $root.folder_mcp.SlideInfo.encode(message.slides[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.pages != null && message.pages.length)
                for (let i = 0; i < message.pages.length; ++i)
                    $root.folder_mcp.PageInfo.encode(message.pages[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.sections != null && message.sections.length)
                for (let i = 0; i < message.sections.length; ++i)
                    $root.folder_mcp.SectionInfo.encode(message.sections[i], writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            if (message.toc != null && message.toc.length)
                for (let i = 0; i < message.toc.length; ++i)
                    $root.folder_mcp.TableOfContentsEntry.encode(message.toc[i], writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
            if (message.tags != null && message.tags.length)
                for (let i = 0; i < message.tags.length; ++i)
                    writer.uint32(/* id 6, wireType 2 =*/50).string(message.tags[i]);
            if (message.properties != null && Object.hasOwnProperty.call(message, "properties"))
                for (let keys = Object.keys(message.properties), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 7, wireType 2 =*/58).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 2 =*/18).string(message.properties[keys[i]]).ldelim();
            return writer;
        };

        /**
         * Encodes the specified DocumentStructureEnhanced message, length delimited. Does not implicitly {@link folder_mcp.DocumentStructureEnhanced.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.DocumentStructureEnhanced
         * @static
         * @param {folder_mcp.IDocumentStructureEnhanced} message DocumentStructureEnhanced message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DocumentStructureEnhanced.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DocumentStructureEnhanced message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.DocumentStructureEnhanced
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.DocumentStructureEnhanced} DocumentStructureEnhanced
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DocumentStructureEnhanced.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.DocumentStructureEnhanced(), key, value;
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.sheets && message.sheets.length))
                            message.sheets = [];
                        message.sheets.push($root.folder_mcp.SheetInfo.decode(reader, reader.uint32()));
                        break;
                    }
                case 2: {
                        if (!(message.slides && message.slides.length))
                            message.slides = [];
                        message.slides.push($root.folder_mcp.SlideInfo.decode(reader, reader.uint32()));
                        break;
                    }
                case 3: {
                        if (!(message.pages && message.pages.length))
                            message.pages = [];
                        message.pages.push($root.folder_mcp.PageInfo.decode(reader, reader.uint32()));
                        break;
                    }
                case 4: {
                        if (!(message.sections && message.sections.length))
                            message.sections = [];
                        message.sections.push($root.folder_mcp.SectionInfo.decode(reader, reader.uint32()));
                        break;
                    }
                case 5: {
                        if (!(message.toc && message.toc.length))
                            message.toc = [];
                        message.toc.push($root.folder_mcp.TableOfContentsEntry.decode(reader, reader.uint32()));
                        break;
                    }
                case 6: {
                        if (!(message.tags && message.tags.length))
                            message.tags = [];
                        message.tags.push(reader.string());
                        break;
                    }
                case 7: {
                        if (message.properties === $util.emptyObject)
                            message.properties = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = "";
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.string();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.properties[key] = value;
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a DocumentStructureEnhanced message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.DocumentStructureEnhanced
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.DocumentStructureEnhanced} DocumentStructureEnhanced
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DocumentStructureEnhanced.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a DocumentStructureEnhanced message.
         * @function verify
         * @memberof folder_mcp.DocumentStructureEnhanced
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        DocumentStructureEnhanced.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.sheets != null && message.hasOwnProperty("sheets")) {
                if (!Array.isArray(message.sheets))
                    return "sheets: array expected";
                for (let i = 0; i < message.sheets.length; ++i) {
                    let error = $root.folder_mcp.SheetInfo.verify(message.sheets[i]);
                    if (error)
                        return "sheets." + error;
                }
            }
            if (message.slides != null && message.hasOwnProperty("slides")) {
                if (!Array.isArray(message.slides))
                    return "slides: array expected";
                for (let i = 0; i < message.slides.length; ++i) {
                    let error = $root.folder_mcp.SlideInfo.verify(message.slides[i]);
                    if (error)
                        return "slides." + error;
                }
            }
            if (message.pages != null && message.hasOwnProperty("pages")) {
                if (!Array.isArray(message.pages))
                    return "pages: array expected";
                for (let i = 0; i < message.pages.length; ++i) {
                    let error = $root.folder_mcp.PageInfo.verify(message.pages[i]);
                    if (error)
                        return "pages." + error;
                }
            }
            if (message.sections != null && message.hasOwnProperty("sections")) {
                if (!Array.isArray(message.sections))
                    return "sections: array expected";
                for (let i = 0; i < message.sections.length; ++i) {
                    let error = $root.folder_mcp.SectionInfo.verify(message.sections[i]);
                    if (error)
                        return "sections." + error;
                }
            }
            if (message.toc != null && message.hasOwnProperty("toc")) {
                if (!Array.isArray(message.toc))
                    return "toc: array expected";
                for (let i = 0; i < message.toc.length; ++i) {
                    let error = $root.folder_mcp.TableOfContentsEntry.verify(message.toc[i]);
                    if (error)
                        return "toc." + error;
                }
            }
            if (message.tags != null && message.hasOwnProperty("tags")) {
                if (!Array.isArray(message.tags))
                    return "tags: array expected";
                for (let i = 0; i < message.tags.length; ++i)
                    if (!$util.isString(message.tags[i]))
                        return "tags: string[] expected";
            }
            if (message.properties != null && message.hasOwnProperty("properties")) {
                if (!$util.isObject(message.properties))
                    return "properties: object expected";
                let key = Object.keys(message.properties);
                for (let i = 0; i < key.length; ++i)
                    if (!$util.isString(message.properties[key[i]]))
                        return "properties: string{k:string} expected";
            }
            return null;
        };

        /**
         * Creates a DocumentStructureEnhanced message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.DocumentStructureEnhanced
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.DocumentStructureEnhanced} DocumentStructureEnhanced
         */
        DocumentStructureEnhanced.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.DocumentStructureEnhanced)
                return object;
            let message = new $root.folder_mcp.DocumentStructureEnhanced();
            if (object.sheets) {
                if (!Array.isArray(object.sheets))
                    throw TypeError(".folder_mcp.DocumentStructureEnhanced.sheets: array expected");
                message.sheets = [];
                for (let i = 0; i < object.sheets.length; ++i) {
                    if (typeof object.sheets[i] !== "object")
                        throw TypeError(".folder_mcp.DocumentStructureEnhanced.sheets: object expected");
                    message.sheets[i] = $root.folder_mcp.SheetInfo.fromObject(object.sheets[i]);
                }
            }
            if (object.slides) {
                if (!Array.isArray(object.slides))
                    throw TypeError(".folder_mcp.DocumentStructureEnhanced.slides: array expected");
                message.slides = [];
                for (let i = 0; i < object.slides.length; ++i) {
                    if (typeof object.slides[i] !== "object")
                        throw TypeError(".folder_mcp.DocumentStructureEnhanced.slides: object expected");
                    message.slides[i] = $root.folder_mcp.SlideInfo.fromObject(object.slides[i]);
                }
            }
            if (object.pages) {
                if (!Array.isArray(object.pages))
                    throw TypeError(".folder_mcp.DocumentStructureEnhanced.pages: array expected");
                message.pages = [];
                for (let i = 0; i < object.pages.length; ++i) {
                    if (typeof object.pages[i] !== "object")
                        throw TypeError(".folder_mcp.DocumentStructureEnhanced.pages: object expected");
                    message.pages[i] = $root.folder_mcp.PageInfo.fromObject(object.pages[i]);
                }
            }
            if (object.sections) {
                if (!Array.isArray(object.sections))
                    throw TypeError(".folder_mcp.DocumentStructureEnhanced.sections: array expected");
                message.sections = [];
                for (let i = 0; i < object.sections.length; ++i) {
                    if (typeof object.sections[i] !== "object")
                        throw TypeError(".folder_mcp.DocumentStructureEnhanced.sections: object expected");
                    message.sections[i] = $root.folder_mcp.SectionInfo.fromObject(object.sections[i]);
                }
            }
            if (object.toc) {
                if (!Array.isArray(object.toc))
                    throw TypeError(".folder_mcp.DocumentStructureEnhanced.toc: array expected");
                message.toc = [];
                for (let i = 0; i < object.toc.length; ++i) {
                    if (typeof object.toc[i] !== "object")
                        throw TypeError(".folder_mcp.DocumentStructureEnhanced.toc: object expected");
                    message.toc[i] = $root.folder_mcp.TableOfContentsEntry.fromObject(object.toc[i]);
                }
            }
            if (object.tags) {
                if (!Array.isArray(object.tags))
                    throw TypeError(".folder_mcp.DocumentStructureEnhanced.tags: array expected");
                message.tags = [];
                for (let i = 0; i < object.tags.length; ++i)
                    message.tags[i] = String(object.tags[i]);
            }
            if (object.properties) {
                if (typeof object.properties !== "object")
                    throw TypeError(".folder_mcp.DocumentStructureEnhanced.properties: object expected");
                message.properties = {};
                for (let keys = Object.keys(object.properties), i = 0; i < keys.length; ++i)
                    message.properties[keys[i]] = String(object.properties[keys[i]]);
            }
            return message;
        };

        /**
         * Creates a plain object from a DocumentStructureEnhanced message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.DocumentStructureEnhanced
         * @static
         * @param {folder_mcp.DocumentStructureEnhanced} message DocumentStructureEnhanced
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        DocumentStructureEnhanced.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults) {
                object.sheets = [];
                object.slides = [];
                object.pages = [];
                object.sections = [];
                object.toc = [];
                object.tags = [];
            }
            if (options.objects || options.defaults)
                object.properties = {};
            if (message.sheets && message.sheets.length) {
                object.sheets = [];
                for (let j = 0; j < message.sheets.length; ++j)
                    object.sheets[j] = $root.folder_mcp.SheetInfo.toObject(message.sheets[j], options);
            }
            if (message.slides && message.slides.length) {
                object.slides = [];
                for (let j = 0; j < message.slides.length; ++j)
                    object.slides[j] = $root.folder_mcp.SlideInfo.toObject(message.slides[j], options);
            }
            if (message.pages && message.pages.length) {
                object.pages = [];
                for (let j = 0; j < message.pages.length; ++j)
                    object.pages[j] = $root.folder_mcp.PageInfo.toObject(message.pages[j], options);
            }
            if (message.sections && message.sections.length) {
                object.sections = [];
                for (let j = 0; j < message.sections.length; ++j)
                    object.sections[j] = $root.folder_mcp.SectionInfo.toObject(message.sections[j], options);
            }
            if (message.toc && message.toc.length) {
                object.toc = [];
                for (let j = 0; j < message.toc.length; ++j)
                    object.toc[j] = $root.folder_mcp.TableOfContentsEntry.toObject(message.toc[j], options);
            }
            if (message.tags && message.tags.length) {
                object.tags = [];
                for (let j = 0; j < message.tags.length; ++j)
                    object.tags[j] = message.tags[j];
            }
            let keys2;
            if (message.properties && (keys2 = Object.keys(message.properties)).length) {
                object.properties = {};
                for (let j = 0; j < keys2.length; ++j)
                    object.properties[keys2[j]] = message.properties[keys2[j]];
            }
            return object;
        };

        /**
         * Converts this DocumentStructureEnhanced to JSON.
         * @function toJSON
         * @memberof folder_mcp.DocumentStructureEnhanced
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        DocumentStructureEnhanced.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for DocumentStructureEnhanced
         * @function getTypeUrl
         * @memberof folder_mcp.DocumentStructureEnhanced
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        DocumentStructureEnhanced.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.DocumentStructureEnhanced";
        };

        return DocumentStructureEnhanced;
    })();

    folder_mcp.TableOfContentsEntry = (function() {

        /**
         * Properties of a TableOfContentsEntry.
         * @memberof folder_mcp
         * @interface ITableOfContentsEntry
         * @property {string|null} [title] TableOfContentsEntry title
         * @property {number|null} [level] TableOfContentsEntry level
         * @property {number|null} [pageNumber] TableOfContentsEntry pageNumber
         * @property {string|null} [anchor] TableOfContentsEntry anchor
         */

        /**
         * Constructs a new TableOfContentsEntry.
         * @memberof folder_mcp
         * @classdesc Represents a TableOfContentsEntry.
         * @implements ITableOfContentsEntry
         * @constructor
         * @param {folder_mcp.ITableOfContentsEntry=} [properties] Properties to set
         */
        function TableOfContentsEntry(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TableOfContentsEntry title.
         * @member {string} title
         * @memberof folder_mcp.TableOfContentsEntry
         * @instance
         */
        TableOfContentsEntry.prototype.title = "";

        /**
         * TableOfContentsEntry level.
         * @member {number} level
         * @memberof folder_mcp.TableOfContentsEntry
         * @instance
         */
        TableOfContentsEntry.prototype.level = 0;

        /**
         * TableOfContentsEntry pageNumber.
         * @member {number} pageNumber
         * @memberof folder_mcp.TableOfContentsEntry
         * @instance
         */
        TableOfContentsEntry.prototype.pageNumber = 0;

        /**
         * TableOfContentsEntry anchor.
         * @member {string} anchor
         * @memberof folder_mcp.TableOfContentsEntry
         * @instance
         */
        TableOfContentsEntry.prototype.anchor = "";

        /**
         * Creates a new TableOfContentsEntry instance using the specified properties.
         * @function create
         * @memberof folder_mcp.TableOfContentsEntry
         * @static
         * @param {folder_mcp.ITableOfContentsEntry=} [properties] Properties to set
         * @returns {folder_mcp.TableOfContentsEntry} TableOfContentsEntry instance
         */
        TableOfContentsEntry.create = function create(properties) {
            return new TableOfContentsEntry(properties);
        };

        /**
         * Encodes the specified TableOfContentsEntry message. Does not implicitly {@link folder_mcp.TableOfContentsEntry.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.TableOfContentsEntry
         * @static
         * @param {folder_mcp.ITableOfContentsEntry} message TableOfContentsEntry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TableOfContentsEntry.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.title != null && Object.hasOwnProperty.call(message, "title"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.title);
            if (message.level != null && Object.hasOwnProperty.call(message, "level"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.level);
            if (message.pageNumber != null && Object.hasOwnProperty.call(message, "pageNumber"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.pageNumber);
            if (message.anchor != null && Object.hasOwnProperty.call(message, "anchor"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.anchor);
            return writer;
        };

        /**
         * Encodes the specified TableOfContentsEntry message, length delimited. Does not implicitly {@link folder_mcp.TableOfContentsEntry.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.TableOfContentsEntry
         * @static
         * @param {folder_mcp.ITableOfContentsEntry} message TableOfContentsEntry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TableOfContentsEntry.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TableOfContentsEntry message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.TableOfContentsEntry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.TableOfContentsEntry} TableOfContentsEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TableOfContentsEntry.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.TableOfContentsEntry();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.title = reader.string();
                        break;
                    }
                case 2: {
                        message.level = reader.int32();
                        break;
                    }
                case 3: {
                        message.pageNumber = reader.int32();
                        break;
                    }
                case 4: {
                        message.anchor = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TableOfContentsEntry message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.TableOfContentsEntry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.TableOfContentsEntry} TableOfContentsEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TableOfContentsEntry.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TableOfContentsEntry message.
         * @function verify
         * @memberof folder_mcp.TableOfContentsEntry
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TableOfContentsEntry.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.title != null && message.hasOwnProperty("title"))
                if (!$util.isString(message.title))
                    return "title: string expected";
            if (message.level != null && message.hasOwnProperty("level"))
                if (!$util.isInteger(message.level))
                    return "level: integer expected";
            if (message.pageNumber != null && message.hasOwnProperty("pageNumber"))
                if (!$util.isInteger(message.pageNumber))
                    return "pageNumber: integer expected";
            if (message.anchor != null && message.hasOwnProperty("anchor"))
                if (!$util.isString(message.anchor))
                    return "anchor: string expected";
            return null;
        };

        /**
         * Creates a TableOfContentsEntry message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.TableOfContentsEntry
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.TableOfContentsEntry} TableOfContentsEntry
         */
        TableOfContentsEntry.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.TableOfContentsEntry)
                return object;
            let message = new $root.folder_mcp.TableOfContentsEntry();
            if (object.title != null)
                message.title = String(object.title);
            if (object.level != null)
                message.level = object.level | 0;
            if (object.pageNumber != null)
                message.pageNumber = object.pageNumber | 0;
            if (object.anchor != null)
                message.anchor = String(object.anchor);
            return message;
        };

        /**
         * Creates a plain object from a TableOfContentsEntry message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.TableOfContentsEntry
         * @static
         * @param {folder_mcp.TableOfContentsEntry} message TableOfContentsEntry
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TableOfContentsEntry.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.title = "";
                object.level = 0;
                object.pageNumber = 0;
                object.anchor = "";
            }
            if (message.title != null && message.hasOwnProperty("title"))
                object.title = message.title;
            if (message.level != null && message.hasOwnProperty("level"))
                object.level = message.level;
            if (message.pageNumber != null && message.hasOwnProperty("pageNumber"))
                object.pageNumber = message.pageNumber;
            if (message.anchor != null && message.hasOwnProperty("anchor"))
                object.anchor = message.anchor;
            return object;
        };

        /**
         * Converts this TableOfContentsEntry to JSON.
         * @function toJSON
         * @memberof folder_mcp.TableOfContentsEntry
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TableOfContentsEntry.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TableOfContentsEntry
         * @function getTypeUrl
         * @memberof folder_mcp.TableOfContentsEntry
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TableOfContentsEntry.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.TableOfContentsEntry";
        };

        return TableOfContentsEntry;
    })();

    folder_mcp.Cell = (function() {

        /**
         * Properties of a Cell.
         * @memberof folder_mcp
         * @interface ICell
         * @property {number|null} [row] Cell row
         * @property {number|null} [column] Cell column
         * @property {string|null} [address] Cell address
         * @property {string|null} [value] Cell value
         * @property {string|null} [rawValue] Cell rawValue
         * @property {folder_mcp.CellDataType|null} [type] Cell type
         * @property {string|null} [formula] Cell formula
         * @property {Object.<string,string>|null} [formatting] Cell formatting
         */

        /**
         * Constructs a new Cell.
         * @memberof folder_mcp
         * @classdesc Represents a Cell.
         * @implements ICell
         * @constructor
         * @param {folder_mcp.ICell=} [properties] Properties to set
         */
        function Cell(properties) {
            this.formatting = {};
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Cell row.
         * @member {number} row
         * @memberof folder_mcp.Cell
         * @instance
         */
        Cell.prototype.row = 0;

        /**
         * Cell column.
         * @member {number} column
         * @memberof folder_mcp.Cell
         * @instance
         */
        Cell.prototype.column = 0;

        /**
         * Cell address.
         * @member {string} address
         * @memberof folder_mcp.Cell
         * @instance
         */
        Cell.prototype.address = "";

        /**
         * Cell value.
         * @member {string} value
         * @memberof folder_mcp.Cell
         * @instance
         */
        Cell.prototype.value = "";

        /**
         * Cell rawValue.
         * @member {string} rawValue
         * @memberof folder_mcp.Cell
         * @instance
         */
        Cell.prototype.rawValue = "";

        /**
         * Cell type.
         * @member {folder_mcp.CellDataType} type
         * @memberof folder_mcp.Cell
         * @instance
         */
        Cell.prototype.type = 0;

        /**
         * Cell formula.
         * @member {string} formula
         * @memberof folder_mcp.Cell
         * @instance
         */
        Cell.prototype.formula = "";

        /**
         * Cell formatting.
         * @member {Object.<string,string>} formatting
         * @memberof folder_mcp.Cell
         * @instance
         */
        Cell.prototype.formatting = $util.emptyObject;

        /**
         * Creates a new Cell instance using the specified properties.
         * @function create
         * @memberof folder_mcp.Cell
         * @static
         * @param {folder_mcp.ICell=} [properties] Properties to set
         * @returns {folder_mcp.Cell} Cell instance
         */
        Cell.create = function create(properties) {
            return new Cell(properties);
        };

        /**
         * Encodes the specified Cell message. Does not implicitly {@link folder_mcp.Cell.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.Cell
         * @static
         * @param {folder_mcp.ICell} message Cell message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Cell.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.row != null && Object.hasOwnProperty.call(message, "row"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.row);
            if (message.column != null && Object.hasOwnProperty.call(message, "column"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.column);
            if (message.address != null && Object.hasOwnProperty.call(message, "address"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.address);
            if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.value);
            if (message.rawValue != null && Object.hasOwnProperty.call(message, "rawValue"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.rawValue);
            if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                writer.uint32(/* id 6, wireType 0 =*/48).int32(message.type);
            if (message.formula != null && Object.hasOwnProperty.call(message, "formula"))
                writer.uint32(/* id 7, wireType 2 =*/58).string(message.formula);
            if (message.formatting != null && Object.hasOwnProperty.call(message, "formatting"))
                for (let keys = Object.keys(message.formatting), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 8, wireType 2 =*/66).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 2 =*/18).string(message.formatting[keys[i]]).ldelim();
            return writer;
        };

        /**
         * Encodes the specified Cell message, length delimited. Does not implicitly {@link folder_mcp.Cell.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.Cell
         * @static
         * @param {folder_mcp.ICell} message Cell message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Cell.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Cell message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.Cell
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.Cell} Cell
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Cell.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.Cell(), key, value;
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.row = reader.int32();
                        break;
                    }
                case 2: {
                        message.column = reader.int32();
                        break;
                    }
                case 3: {
                        message.address = reader.string();
                        break;
                    }
                case 4: {
                        message.value = reader.string();
                        break;
                    }
                case 5: {
                        message.rawValue = reader.string();
                        break;
                    }
                case 6: {
                        message.type = reader.int32();
                        break;
                    }
                case 7: {
                        message.formula = reader.string();
                        break;
                    }
                case 8: {
                        if (message.formatting === $util.emptyObject)
                            message.formatting = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = "";
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.string();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.formatting[key] = value;
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Cell message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.Cell
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.Cell} Cell
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Cell.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Cell message.
         * @function verify
         * @memberof folder_mcp.Cell
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Cell.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.row != null && message.hasOwnProperty("row"))
                if (!$util.isInteger(message.row))
                    return "row: integer expected";
            if (message.column != null && message.hasOwnProperty("column"))
                if (!$util.isInteger(message.column))
                    return "column: integer expected";
            if (message.address != null && message.hasOwnProperty("address"))
                if (!$util.isString(message.address))
                    return "address: string expected";
            if (message.value != null && message.hasOwnProperty("value"))
                if (!$util.isString(message.value))
                    return "value: string expected";
            if (message.rawValue != null && message.hasOwnProperty("rawValue"))
                if (!$util.isString(message.rawValue))
                    return "rawValue: string expected";
            if (message.type != null && message.hasOwnProperty("type"))
                switch (message.type) {
                default:
                    return "type: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                    break;
                }
            if (message.formula != null && message.hasOwnProperty("formula"))
                if (!$util.isString(message.formula))
                    return "formula: string expected";
            if (message.formatting != null && message.hasOwnProperty("formatting")) {
                if (!$util.isObject(message.formatting))
                    return "formatting: object expected";
                let key = Object.keys(message.formatting);
                for (let i = 0; i < key.length; ++i)
                    if (!$util.isString(message.formatting[key[i]]))
                        return "formatting: string{k:string} expected";
            }
            return null;
        };

        /**
         * Creates a Cell message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.Cell
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.Cell} Cell
         */
        Cell.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.Cell)
                return object;
            let message = new $root.folder_mcp.Cell();
            if (object.row != null)
                message.row = object.row | 0;
            if (object.column != null)
                message.column = object.column | 0;
            if (object.address != null)
                message.address = String(object.address);
            if (object.value != null)
                message.value = String(object.value);
            if (object.rawValue != null)
                message.rawValue = String(object.rawValue);
            switch (object.type) {
            default:
                if (typeof object.type === "number") {
                    message.type = object.type;
                    break;
                }
                break;
            case "CELL_DATA_TYPE_UNSPECIFIED":
            case 0:
                message.type = 0;
                break;
            case "CELL_DATA_TYPE_TEXT":
            case 1:
                message.type = 1;
                break;
            case "CELL_DATA_TYPE_NUMBER":
            case 2:
                message.type = 2;
                break;
            case "CELL_DATA_TYPE_DATE":
            case 3:
                message.type = 3;
                break;
            case "CELL_DATA_TYPE_BOOLEAN":
            case 4:
                message.type = 4;
                break;
            case "CELL_DATA_TYPE_FORMULA":
            case 5:
                message.type = 5;
                break;
            case "CELL_DATA_TYPE_ERROR":
            case 6:
                message.type = 6;
                break;
            }
            if (object.formula != null)
                message.formula = String(object.formula);
            if (object.formatting) {
                if (typeof object.formatting !== "object")
                    throw TypeError(".folder_mcp.Cell.formatting: object expected");
                message.formatting = {};
                for (let keys = Object.keys(object.formatting), i = 0; i < keys.length; ++i)
                    message.formatting[keys[i]] = String(object.formatting[keys[i]]);
            }
            return message;
        };

        /**
         * Creates a plain object from a Cell message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.Cell
         * @static
         * @param {folder_mcp.Cell} message Cell
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Cell.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.objects || options.defaults)
                object.formatting = {};
            if (options.defaults) {
                object.row = 0;
                object.column = 0;
                object.address = "";
                object.value = "";
                object.rawValue = "";
                object.type = options.enums === String ? "CELL_DATA_TYPE_UNSPECIFIED" : 0;
                object.formula = "";
            }
            if (message.row != null && message.hasOwnProperty("row"))
                object.row = message.row;
            if (message.column != null && message.hasOwnProperty("column"))
                object.column = message.column;
            if (message.address != null && message.hasOwnProperty("address"))
                object.address = message.address;
            if (message.value != null && message.hasOwnProperty("value"))
                object.value = message.value;
            if (message.rawValue != null && message.hasOwnProperty("rawValue"))
                object.rawValue = message.rawValue;
            if (message.type != null && message.hasOwnProperty("type"))
                object.type = options.enums === String ? $root.folder_mcp.CellDataType[message.type] === undefined ? message.type : $root.folder_mcp.CellDataType[message.type] : message.type;
            if (message.formula != null && message.hasOwnProperty("formula"))
                object.formula = message.formula;
            let keys2;
            if (message.formatting && (keys2 = Object.keys(message.formatting)).length) {
                object.formatting = {};
                for (let j = 0; j < keys2.length; ++j)
                    object.formatting[keys2[j]] = message.formatting[keys2[j]];
            }
            return object;
        };

        /**
         * Converts this Cell to JSON.
         * @function toJSON
         * @memberof folder_mcp.Cell
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Cell.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Cell
         * @function getTypeUrl
         * @memberof folder_mcp.Cell
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Cell.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.Cell";
        };

        return Cell;
    })();

    folder_mcp.Embedding = (function() {

        /**
         * Properties of an Embedding.
         * @memberof folder_mcp
         * @interface IEmbedding
         * @property {Array.<number>|null} [vector] Embedding vector
         * @property {number|null} [dimensions] Embedding dimensions
         * @property {string|null} [modelName] Embedding modelName
         * @property {string|null} [modelVersion] Embedding modelVersion
         * @property {number|null} [norm] Embedding norm
         * @property {Object.<string,string>|null} [metadata] Embedding metadata
         */

        /**
         * Constructs a new Embedding.
         * @memberof folder_mcp
         * @classdesc Represents an Embedding.
         * @implements IEmbedding
         * @constructor
         * @param {folder_mcp.IEmbedding=} [properties] Properties to set
         */
        function Embedding(properties) {
            this.vector = [];
            this.metadata = {};
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Embedding vector.
         * @member {Array.<number>} vector
         * @memberof folder_mcp.Embedding
         * @instance
         */
        Embedding.prototype.vector = $util.emptyArray;

        /**
         * Embedding dimensions.
         * @member {number} dimensions
         * @memberof folder_mcp.Embedding
         * @instance
         */
        Embedding.prototype.dimensions = 0;

        /**
         * Embedding modelName.
         * @member {string} modelName
         * @memberof folder_mcp.Embedding
         * @instance
         */
        Embedding.prototype.modelName = "";

        /**
         * Embedding modelVersion.
         * @member {string} modelVersion
         * @memberof folder_mcp.Embedding
         * @instance
         */
        Embedding.prototype.modelVersion = "";

        /**
         * Embedding norm.
         * @member {number} norm
         * @memberof folder_mcp.Embedding
         * @instance
         */
        Embedding.prototype.norm = 0;

        /**
         * Embedding metadata.
         * @member {Object.<string,string>} metadata
         * @memberof folder_mcp.Embedding
         * @instance
         */
        Embedding.prototype.metadata = $util.emptyObject;

        /**
         * Creates a new Embedding instance using the specified properties.
         * @function create
         * @memberof folder_mcp.Embedding
         * @static
         * @param {folder_mcp.IEmbedding=} [properties] Properties to set
         * @returns {folder_mcp.Embedding} Embedding instance
         */
        Embedding.create = function create(properties) {
            return new Embedding(properties);
        };

        /**
         * Encodes the specified Embedding message. Does not implicitly {@link folder_mcp.Embedding.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.Embedding
         * @static
         * @param {folder_mcp.IEmbedding} message Embedding message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Embedding.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.vector != null && message.vector.length) {
                writer.uint32(/* id 1, wireType 2 =*/10).fork();
                for (let i = 0; i < message.vector.length; ++i)
                    writer.float(message.vector[i]);
                writer.ldelim();
            }
            if (message.dimensions != null && Object.hasOwnProperty.call(message, "dimensions"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.dimensions);
            if (message.modelName != null && Object.hasOwnProperty.call(message, "modelName"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.modelName);
            if (message.modelVersion != null && Object.hasOwnProperty.call(message, "modelVersion"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.modelVersion);
            if (message.norm != null && Object.hasOwnProperty.call(message, "norm"))
                writer.uint32(/* id 5, wireType 5 =*/45).float(message.norm);
            if (message.metadata != null && Object.hasOwnProperty.call(message, "metadata"))
                for (let keys = Object.keys(message.metadata), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 6, wireType 2 =*/50).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 2 =*/18).string(message.metadata[keys[i]]).ldelim();
            return writer;
        };

        /**
         * Encodes the specified Embedding message, length delimited. Does not implicitly {@link folder_mcp.Embedding.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.Embedding
         * @static
         * @param {folder_mcp.IEmbedding} message Embedding message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Embedding.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an Embedding message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.Embedding
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.Embedding} Embedding
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Embedding.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.Embedding(), key, value;
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.vector && message.vector.length))
                            message.vector = [];
                        if ((tag & 7) === 2) {
                            let end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.vector.push(reader.float());
                        } else
                            message.vector.push(reader.float());
                        break;
                    }
                case 2: {
                        message.dimensions = reader.int32();
                        break;
                    }
                case 3: {
                        message.modelName = reader.string();
                        break;
                    }
                case 4: {
                        message.modelVersion = reader.string();
                        break;
                    }
                case 5: {
                        message.norm = reader.float();
                        break;
                    }
                case 6: {
                        if (message.metadata === $util.emptyObject)
                            message.metadata = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = "";
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.string();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.metadata[key] = value;
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an Embedding message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.Embedding
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.Embedding} Embedding
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Embedding.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an Embedding message.
         * @function verify
         * @memberof folder_mcp.Embedding
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Embedding.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.vector != null && message.hasOwnProperty("vector")) {
                if (!Array.isArray(message.vector))
                    return "vector: array expected";
                for (let i = 0; i < message.vector.length; ++i)
                    if (typeof message.vector[i] !== "number")
                        return "vector: number[] expected";
            }
            if (message.dimensions != null && message.hasOwnProperty("dimensions"))
                if (!$util.isInteger(message.dimensions))
                    return "dimensions: integer expected";
            if (message.modelName != null && message.hasOwnProperty("modelName"))
                if (!$util.isString(message.modelName))
                    return "modelName: string expected";
            if (message.modelVersion != null && message.hasOwnProperty("modelVersion"))
                if (!$util.isString(message.modelVersion))
                    return "modelVersion: string expected";
            if (message.norm != null && message.hasOwnProperty("norm"))
                if (typeof message.norm !== "number")
                    return "norm: number expected";
            if (message.metadata != null && message.hasOwnProperty("metadata")) {
                if (!$util.isObject(message.metadata))
                    return "metadata: object expected";
                let key = Object.keys(message.metadata);
                for (let i = 0; i < key.length; ++i)
                    if (!$util.isString(message.metadata[key[i]]))
                        return "metadata: string{k:string} expected";
            }
            return null;
        };

        /**
         * Creates an Embedding message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.Embedding
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.Embedding} Embedding
         */
        Embedding.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.Embedding)
                return object;
            let message = new $root.folder_mcp.Embedding();
            if (object.vector) {
                if (!Array.isArray(object.vector))
                    throw TypeError(".folder_mcp.Embedding.vector: array expected");
                message.vector = [];
                for (let i = 0; i < object.vector.length; ++i)
                    message.vector[i] = Number(object.vector[i]);
            }
            if (object.dimensions != null)
                message.dimensions = object.dimensions | 0;
            if (object.modelName != null)
                message.modelName = String(object.modelName);
            if (object.modelVersion != null)
                message.modelVersion = String(object.modelVersion);
            if (object.norm != null)
                message.norm = Number(object.norm);
            if (object.metadata) {
                if (typeof object.metadata !== "object")
                    throw TypeError(".folder_mcp.Embedding.metadata: object expected");
                message.metadata = {};
                for (let keys = Object.keys(object.metadata), i = 0; i < keys.length; ++i)
                    message.metadata[keys[i]] = String(object.metadata[keys[i]]);
            }
            return message;
        };

        /**
         * Creates a plain object from an Embedding message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.Embedding
         * @static
         * @param {folder_mcp.Embedding} message Embedding
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Embedding.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.vector = [];
            if (options.objects || options.defaults)
                object.metadata = {};
            if (options.defaults) {
                object.dimensions = 0;
                object.modelName = "";
                object.modelVersion = "";
                object.norm = 0;
            }
            if (message.vector && message.vector.length) {
                object.vector = [];
                for (let j = 0; j < message.vector.length; ++j)
                    object.vector[j] = options.json && !isFinite(message.vector[j]) ? String(message.vector[j]) : message.vector[j];
            }
            if (message.dimensions != null && message.hasOwnProperty("dimensions"))
                object.dimensions = message.dimensions;
            if (message.modelName != null && message.hasOwnProperty("modelName"))
                object.modelName = message.modelName;
            if (message.modelVersion != null && message.hasOwnProperty("modelVersion"))
                object.modelVersion = message.modelVersion;
            if (message.norm != null && message.hasOwnProperty("norm"))
                object.norm = options.json && !isFinite(message.norm) ? String(message.norm) : message.norm;
            let keys2;
            if (message.metadata && (keys2 = Object.keys(message.metadata)).length) {
                object.metadata = {};
                for (let j = 0; j < keys2.length; ++j)
                    object.metadata[keys2[j]] = message.metadata[keys2[j]];
            }
            return object;
        };

        /**
         * Converts this Embedding to JSON.
         * @function toJSON
         * @memberof folder_mcp.Embedding
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Embedding.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Embedding
         * @function getTypeUrl
         * @memberof folder_mcp.Embedding
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Embedding.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.Embedding";
        };

        return Embedding;
    })();

    folder_mcp.ErrorDetail = (function() {

        /**
         * Properties of an ErrorDetail.
         * @memberof folder_mcp
         * @interface IErrorDetail
         * @property {folder_mcp.ErrorCode|null} [code] ErrorDetail code
         * @property {string|null} [message] ErrorDetail message
         * @property {string|null} [field] ErrorDetail field
         * @property {Array.<string>|null} [suggestions] ErrorDetail suggestions
         * @property {Object.<string,string>|null} [context] ErrorDetail context
         * @property {string|null} [documentationUrl] ErrorDetail documentationUrl
         */

        /**
         * Constructs a new ErrorDetail.
         * @memberof folder_mcp
         * @classdesc Represents an ErrorDetail.
         * @implements IErrorDetail
         * @constructor
         * @param {folder_mcp.IErrorDetail=} [properties] Properties to set
         */
        function ErrorDetail(properties) {
            this.suggestions = [];
            this.context = {};
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ErrorDetail code.
         * @member {folder_mcp.ErrorCode} code
         * @memberof folder_mcp.ErrorDetail
         * @instance
         */
        ErrorDetail.prototype.code = 0;

        /**
         * ErrorDetail message.
         * @member {string} message
         * @memberof folder_mcp.ErrorDetail
         * @instance
         */
        ErrorDetail.prototype.message = "";

        /**
         * ErrorDetail field.
         * @member {string} field
         * @memberof folder_mcp.ErrorDetail
         * @instance
         */
        ErrorDetail.prototype.field = "";

        /**
         * ErrorDetail suggestions.
         * @member {Array.<string>} suggestions
         * @memberof folder_mcp.ErrorDetail
         * @instance
         */
        ErrorDetail.prototype.suggestions = $util.emptyArray;

        /**
         * ErrorDetail context.
         * @member {Object.<string,string>} context
         * @memberof folder_mcp.ErrorDetail
         * @instance
         */
        ErrorDetail.prototype.context = $util.emptyObject;

        /**
         * ErrorDetail documentationUrl.
         * @member {string} documentationUrl
         * @memberof folder_mcp.ErrorDetail
         * @instance
         */
        ErrorDetail.prototype.documentationUrl = "";

        /**
         * Creates a new ErrorDetail instance using the specified properties.
         * @function create
         * @memberof folder_mcp.ErrorDetail
         * @static
         * @param {folder_mcp.IErrorDetail=} [properties] Properties to set
         * @returns {folder_mcp.ErrorDetail} ErrorDetail instance
         */
        ErrorDetail.create = function create(properties) {
            return new ErrorDetail(properties);
        };

        /**
         * Encodes the specified ErrorDetail message. Does not implicitly {@link folder_mcp.ErrorDetail.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.ErrorDetail
         * @static
         * @param {folder_mcp.IErrorDetail} message ErrorDetail message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ErrorDetail.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
            if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.message);
            if (message.field != null && Object.hasOwnProperty.call(message, "field"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.field);
            if (message.suggestions != null && message.suggestions.length)
                for (let i = 0; i < message.suggestions.length; ++i)
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.suggestions[i]);
            if (message.context != null && Object.hasOwnProperty.call(message, "context"))
                for (let keys = Object.keys(message.context), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 5, wireType 2 =*/42).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 2 =*/18).string(message.context[keys[i]]).ldelim();
            if (message.documentationUrl != null && Object.hasOwnProperty.call(message, "documentationUrl"))
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.documentationUrl);
            return writer;
        };

        /**
         * Encodes the specified ErrorDetail message, length delimited. Does not implicitly {@link folder_mcp.ErrorDetail.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.ErrorDetail
         * @static
         * @param {folder_mcp.IErrorDetail} message ErrorDetail message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ErrorDetail.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an ErrorDetail message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.ErrorDetail
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.ErrorDetail} ErrorDetail
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ErrorDetail.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.ErrorDetail(), key, value;
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.code = reader.int32();
                        break;
                    }
                case 2: {
                        message.message = reader.string();
                        break;
                    }
                case 3: {
                        message.field = reader.string();
                        break;
                    }
                case 4: {
                        if (!(message.suggestions && message.suggestions.length))
                            message.suggestions = [];
                        message.suggestions.push(reader.string());
                        break;
                    }
                case 5: {
                        if (message.context === $util.emptyObject)
                            message.context = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = "";
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.string();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.context[key] = value;
                        break;
                    }
                case 6: {
                        message.documentationUrl = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an ErrorDetail message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.ErrorDetail
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.ErrorDetail} ErrorDetail
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ErrorDetail.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an ErrorDetail message.
         * @function verify
         * @memberof folder_mcp.ErrorDetail
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ErrorDetail.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.code != null && message.hasOwnProperty("code"))
                switch (message.code) {
                default:
                    return "code: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                case 8:
                case 9:
                case 10:
                    break;
                }
            if (message.message != null && message.hasOwnProperty("message"))
                if (!$util.isString(message.message))
                    return "message: string expected";
            if (message.field != null && message.hasOwnProperty("field"))
                if (!$util.isString(message.field))
                    return "field: string expected";
            if (message.suggestions != null && message.hasOwnProperty("suggestions")) {
                if (!Array.isArray(message.suggestions))
                    return "suggestions: array expected";
                for (let i = 0; i < message.suggestions.length; ++i)
                    if (!$util.isString(message.suggestions[i]))
                        return "suggestions: string[] expected";
            }
            if (message.context != null && message.hasOwnProperty("context")) {
                if (!$util.isObject(message.context))
                    return "context: object expected";
                let key = Object.keys(message.context);
                for (let i = 0; i < key.length; ++i)
                    if (!$util.isString(message.context[key[i]]))
                        return "context: string{k:string} expected";
            }
            if (message.documentationUrl != null && message.hasOwnProperty("documentationUrl"))
                if (!$util.isString(message.documentationUrl))
                    return "documentationUrl: string expected";
            return null;
        };

        /**
         * Creates an ErrorDetail message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.ErrorDetail
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.ErrorDetail} ErrorDetail
         */
        ErrorDetail.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.ErrorDetail)
                return object;
            let message = new $root.folder_mcp.ErrorDetail();
            switch (object.code) {
            default:
                if (typeof object.code === "number") {
                    message.code = object.code;
                    break;
                }
                break;
            case "ERROR_CODE_UNSPECIFIED":
            case 0:
                message.code = 0;
                break;
            case "ERROR_CODE_NOT_FOUND":
            case 1:
                message.code = 1;
                break;
            case "ERROR_CODE_PERMISSION_DENIED":
            case 2:
                message.code = 2;
                break;
            case "ERROR_CODE_INVALID_REQUEST":
            case 3:
                message.code = 3;
                break;
            case "ERROR_CODE_RESOURCE_EXHAUSTED":
            case 4:
                message.code = 4;
                break;
            case "ERROR_CODE_INTERNAL_ERROR":
            case 5:
                message.code = 5;
                break;
            case "ERROR_CODE_UNAVAILABLE":
            case 6:
                message.code = 6;
                break;
            case "ERROR_CODE_TIMEOUT":
            case 7:
                message.code = 7;
                break;
            case "ERROR_CODE_ALREADY_EXISTS":
            case 8:
                message.code = 8;
                break;
            case "ERROR_CODE_PRECONDITION_FAILED":
            case 9:
                message.code = 9;
                break;
            case "ERROR_CODE_OUT_OF_RANGE":
            case 10:
                message.code = 10;
                break;
            }
            if (object.message != null)
                message.message = String(object.message);
            if (object.field != null)
                message.field = String(object.field);
            if (object.suggestions) {
                if (!Array.isArray(object.suggestions))
                    throw TypeError(".folder_mcp.ErrorDetail.suggestions: array expected");
                message.suggestions = [];
                for (let i = 0; i < object.suggestions.length; ++i)
                    message.suggestions[i] = String(object.suggestions[i]);
            }
            if (object.context) {
                if (typeof object.context !== "object")
                    throw TypeError(".folder_mcp.ErrorDetail.context: object expected");
                message.context = {};
                for (let keys = Object.keys(object.context), i = 0; i < keys.length; ++i)
                    message.context[keys[i]] = String(object.context[keys[i]]);
            }
            if (object.documentationUrl != null)
                message.documentationUrl = String(object.documentationUrl);
            return message;
        };

        /**
         * Creates a plain object from an ErrorDetail message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.ErrorDetail
         * @static
         * @param {folder_mcp.ErrorDetail} message ErrorDetail
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ErrorDetail.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.suggestions = [];
            if (options.objects || options.defaults)
                object.context = {};
            if (options.defaults) {
                object.code = options.enums === String ? "ERROR_CODE_UNSPECIFIED" : 0;
                object.message = "";
                object.field = "";
                object.documentationUrl = "";
            }
            if (message.code != null && message.hasOwnProperty("code"))
                object.code = options.enums === String ? $root.folder_mcp.ErrorCode[message.code] === undefined ? message.code : $root.folder_mcp.ErrorCode[message.code] : message.code;
            if (message.message != null && message.hasOwnProperty("message"))
                object.message = message.message;
            if (message.field != null && message.hasOwnProperty("field"))
                object.field = message.field;
            if (message.suggestions && message.suggestions.length) {
                object.suggestions = [];
                for (let j = 0; j < message.suggestions.length; ++j)
                    object.suggestions[j] = message.suggestions[j];
            }
            let keys2;
            if (message.context && (keys2 = Object.keys(message.context)).length) {
                object.context = {};
                for (let j = 0; j < keys2.length; ++j)
                    object.context[keys2[j]] = message.context[keys2[j]];
            }
            if (message.documentationUrl != null && message.hasOwnProperty("documentationUrl"))
                object.documentationUrl = message.documentationUrl;
            return object;
        };

        /**
         * Converts this ErrorDetail to JSON.
         * @function toJSON
         * @memberof folder_mcp.ErrorDetail
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ErrorDetail.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ErrorDetail
         * @function getTypeUrl
         * @memberof folder_mcp.ErrorDetail
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ErrorDetail.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.ErrorDetail";
        };

        return ErrorDetail;
    })();

    folder_mcp.ResponseStatus = (function() {

        /**
         * Properties of a ResponseStatus.
         * @memberof folder_mcp
         * @interface IResponseStatus
         * @property {boolean|null} [success] ResponseStatus success
         * @property {Array.<folder_mcp.IErrorDetail>|null} [errors] ResponseStatus errors
         * @property {Array.<string>|null} [warnings] ResponseStatus warnings
         * @property {string|null} [requestId] ResponseStatus requestId
         * @property {number|Long|null} [processingTimeMs] ResponseStatus processingTimeMs
         */

        /**
         * Constructs a new ResponseStatus.
         * @memberof folder_mcp
         * @classdesc Represents a ResponseStatus.
         * @implements IResponseStatus
         * @constructor
         * @param {folder_mcp.IResponseStatus=} [properties] Properties to set
         */
        function ResponseStatus(properties) {
            this.errors = [];
            this.warnings = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ResponseStatus success.
         * @member {boolean} success
         * @memberof folder_mcp.ResponseStatus
         * @instance
         */
        ResponseStatus.prototype.success = false;

        /**
         * ResponseStatus errors.
         * @member {Array.<folder_mcp.IErrorDetail>} errors
         * @memberof folder_mcp.ResponseStatus
         * @instance
         */
        ResponseStatus.prototype.errors = $util.emptyArray;

        /**
         * ResponseStatus warnings.
         * @member {Array.<string>} warnings
         * @memberof folder_mcp.ResponseStatus
         * @instance
         */
        ResponseStatus.prototype.warnings = $util.emptyArray;

        /**
         * ResponseStatus requestId.
         * @member {string} requestId
         * @memberof folder_mcp.ResponseStatus
         * @instance
         */
        ResponseStatus.prototype.requestId = "";

        /**
         * ResponseStatus processingTimeMs.
         * @member {number|Long} processingTimeMs
         * @memberof folder_mcp.ResponseStatus
         * @instance
         */
        ResponseStatus.prototype.processingTimeMs = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Creates a new ResponseStatus instance using the specified properties.
         * @function create
         * @memberof folder_mcp.ResponseStatus
         * @static
         * @param {folder_mcp.IResponseStatus=} [properties] Properties to set
         * @returns {folder_mcp.ResponseStatus} ResponseStatus instance
         */
        ResponseStatus.create = function create(properties) {
            return new ResponseStatus(properties);
        };

        /**
         * Encodes the specified ResponseStatus message. Does not implicitly {@link folder_mcp.ResponseStatus.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.ResponseStatus
         * @static
         * @param {folder_mcp.IResponseStatus} message ResponseStatus message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ResponseStatus.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.success != null && Object.hasOwnProperty.call(message, "success"))
                writer.uint32(/* id 1, wireType 0 =*/8).bool(message.success);
            if (message.errors != null && message.errors.length)
                for (let i = 0; i < message.errors.length; ++i)
                    $root.folder_mcp.ErrorDetail.encode(message.errors[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.warnings != null && message.warnings.length)
                for (let i = 0; i < message.warnings.length; ++i)
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.warnings[i]);
            if (message.requestId != null && Object.hasOwnProperty.call(message, "requestId"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.requestId);
            if (message.processingTimeMs != null && Object.hasOwnProperty.call(message, "processingTimeMs"))
                writer.uint32(/* id 5, wireType 0 =*/40).int64(message.processingTimeMs);
            return writer;
        };

        /**
         * Encodes the specified ResponseStatus message, length delimited. Does not implicitly {@link folder_mcp.ResponseStatus.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.ResponseStatus
         * @static
         * @param {folder_mcp.IResponseStatus} message ResponseStatus message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ResponseStatus.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ResponseStatus message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.ResponseStatus
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.ResponseStatus} ResponseStatus
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ResponseStatus.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.ResponseStatus();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.success = reader.bool();
                        break;
                    }
                case 2: {
                        if (!(message.errors && message.errors.length))
                            message.errors = [];
                        message.errors.push($root.folder_mcp.ErrorDetail.decode(reader, reader.uint32()));
                        break;
                    }
                case 3: {
                        if (!(message.warnings && message.warnings.length))
                            message.warnings = [];
                        message.warnings.push(reader.string());
                        break;
                    }
                case 4: {
                        message.requestId = reader.string();
                        break;
                    }
                case 5: {
                        message.processingTimeMs = reader.int64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ResponseStatus message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.ResponseStatus
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.ResponseStatus} ResponseStatus
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ResponseStatus.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ResponseStatus message.
         * @function verify
         * @memberof folder_mcp.ResponseStatus
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ResponseStatus.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.success != null && message.hasOwnProperty("success"))
                if (typeof message.success !== "boolean")
                    return "success: boolean expected";
            if (message.errors != null && message.hasOwnProperty("errors")) {
                if (!Array.isArray(message.errors))
                    return "errors: array expected";
                for (let i = 0; i < message.errors.length; ++i) {
                    let error = $root.folder_mcp.ErrorDetail.verify(message.errors[i]);
                    if (error)
                        return "errors." + error;
                }
            }
            if (message.warnings != null && message.hasOwnProperty("warnings")) {
                if (!Array.isArray(message.warnings))
                    return "warnings: array expected";
                for (let i = 0; i < message.warnings.length; ++i)
                    if (!$util.isString(message.warnings[i]))
                        return "warnings: string[] expected";
            }
            if (message.requestId != null && message.hasOwnProperty("requestId"))
                if (!$util.isString(message.requestId))
                    return "requestId: string expected";
            if (message.processingTimeMs != null && message.hasOwnProperty("processingTimeMs"))
                if (!$util.isInteger(message.processingTimeMs) && !(message.processingTimeMs && $util.isInteger(message.processingTimeMs.low) && $util.isInteger(message.processingTimeMs.high)))
                    return "processingTimeMs: integer|Long expected";
            return null;
        };

        /**
         * Creates a ResponseStatus message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.ResponseStatus
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.ResponseStatus} ResponseStatus
         */
        ResponseStatus.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.ResponseStatus)
                return object;
            let message = new $root.folder_mcp.ResponseStatus();
            if (object.success != null)
                message.success = Boolean(object.success);
            if (object.errors) {
                if (!Array.isArray(object.errors))
                    throw TypeError(".folder_mcp.ResponseStatus.errors: array expected");
                message.errors = [];
                for (let i = 0; i < object.errors.length; ++i) {
                    if (typeof object.errors[i] !== "object")
                        throw TypeError(".folder_mcp.ResponseStatus.errors: object expected");
                    message.errors[i] = $root.folder_mcp.ErrorDetail.fromObject(object.errors[i]);
                }
            }
            if (object.warnings) {
                if (!Array.isArray(object.warnings))
                    throw TypeError(".folder_mcp.ResponseStatus.warnings: array expected");
                message.warnings = [];
                for (let i = 0; i < object.warnings.length; ++i)
                    message.warnings[i] = String(object.warnings[i]);
            }
            if (object.requestId != null)
                message.requestId = String(object.requestId);
            if (object.processingTimeMs != null)
                if ($util.Long)
                    (message.processingTimeMs = $util.Long.fromValue(object.processingTimeMs)).unsigned = false;
                else if (typeof object.processingTimeMs === "string")
                    message.processingTimeMs = parseInt(object.processingTimeMs, 10);
                else if (typeof object.processingTimeMs === "number")
                    message.processingTimeMs = object.processingTimeMs;
                else if (typeof object.processingTimeMs === "object")
                    message.processingTimeMs = new $util.LongBits(object.processingTimeMs.low >>> 0, object.processingTimeMs.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from a ResponseStatus message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.ResponseStatus
         * @static
         * @param {folder_mcp.ResponseStatus} message ResponseStatus
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ResponseStatus.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults) {
                object.errors = [];
                object.warnings = [];
            }
            if (options.defaults) {
                object.success = false;
                object.requestId = "";
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.processingTimeMs = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.processingTimeMs = options.longs === String ? "0" : 0;
            }
            if (message.success != null && message.hasOwnProperty("success"))
                object.success = message.success;
            if (message.errors && message.errors.length) {
                object.errors = [];
                for (let j = 0; j < message.errors.length; ++j)
                    object.errors[j] = $root.folder_mcp.ErrorDetail.toObject(message.errors[j], options);
            }
            if (message.warnings && message.warnings.length) {
                object.warnings = [];
                for (let j = 0; j < message.warnings.length; ++j)
                    object.warnings[j] = message.warnings[j];
            }
            if (message.requestId != null && message.hasOwnProperty("requestId"))
                object.requestId = message.requestId;
            if (message.processingTimeMs != null && message.hasOwnProperty("processingTimeMs"))
                if (typeof message.processingTimeMs === "number")
                    object.processingTimeMs = options.longs === String ? String(message.processingTimeMs) : message.processingTimeMs;
                else
                    object.processingTimeMs = options.longs === String ? $util.Long.prototype.toString.call(message.processingTimeMs) : options.longs === Number ? new $util.LongBits(message.processingTimeMs.low >>> 0, message.processingTimeMs.high >>> 0).toNumber() : message.processingTimeMs;
            return object;
        };

        /**
         * Converts this ResponseStatus to JSON.
         * @function toJSON
         * @memberof folder_mcp.ResponseStatus
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ResponseStatus.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ResponseStatus
         * @function getTypeUrl
         * @memberof folder_mcp.ResponseStatus
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ResponseStatus.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.ResponseStatus";
        };

        return ResponseStatus;
    })();

    folder_mcp.StatusInfo = (function() {

        /**
         * Properties of a StatusInfo.
         * @memberof folder_mcp
         * @interface IStatusInfo
         * @property {boolean|null} [healthy] StatusInfo healthy
         * @property {string|null} [version] StatusInfo version
         * @property {number|Long|null} [uptimeSeconds] StatusInfo uptimeSeconds
         * @property {number|null} [activeConnections] StatusInfo activeConnections
         * @property {string|null} [buildInfo] StatusInfo buildInfo
         * @property {Object.<string,string>|null} [components] StatusInfo components
         * @property {Array.<string>|null} [capabilities] StatusInfo capabilities
         */

        /**
         * Constructs a new StatusInfo.
         * @memberof folder_mcp
         * @classdesc Represents a StatusInfo.
         * @implements IStatusInfo
         * @constructor
         * @param {folder_mcp.IStatusInfo=} [properties] Properties to set
         */
        function StatusInfo(properties) {
            this.components = {};
            this.capabilities = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * StatusInfo healthy.
         * @member {boolean} healthy
         * @memberof folder_mcp.StatusInfo
         * @instance
         */
        StatusInfo.prototype.healthy = false;

        /**
         * StatusInfo version.
         * @member {string} version
         * @memberof folder_mcp.StatusInfo
         * @instance
         */
        StatusInfo.prototype.version = "";

        /**
         * StatusInfo uptimeSeconds.
         * @member {number|Long} uptimeSeconds
         * @memberof folder_mcp.StatusInfo
         * @instance
         */
        StatusInfo.prototype.uptimeSeconds = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * StatusInfo activeConnections.
         * @member {number} activeConnections
         * @memberof folder_mcp.StatusInfo
         * @instance
         */
        StatusInfo.prototype.activeConnections = 0;

        /**
         * StatusInfo buildInfo.
         * @member {string} buildInfo
         * @memberof folder_mcp.StatusInfo
         * @instance
         */
        StatusInfo.prototype.buildInfo = "";

        /**
         * StatusInfo components.
         * @member {Object.<string,string>} components
         * @memberof folder_mcp.StatusInfo
         * @instance
         */
        StatusInfo.prototype.components = $util.emptyObject;

        /**
         * StatusInfo capabilities.
         * @member {Array.<string>} capabilities
         * @memberof folder_mcp.StatusInfo
         * @instance
         */
        StatusInfo.prototype.capabilities = $util.emptyArray;

        /**
         * Creates a new StatusInfo instance using the specified properties.
         * @function create
         * @memberof folder_mcp.StatusInfo
         * @static
         * @param {folder_mcp.IStatusInfo=} [properties] Properties to set
         * @returns {folder_mcp.StatusInfo} StatusInfo instance
         */
        StatusInfo.create = function create(properties) {
            return new StatusInfo(properties);
        };

        /**
         * Encodes the specified StatusInfo message. Does not implicitly {@link folder_mcp.StatusInfo.verify|verify} messages.
         * @function encode
         * @memberof folder_mcp.StatusInfo
         * @static
         * @param {folder_mcp.IStatusInfo} message StatusInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StatusInfo.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.healthy != null && Object.hasOwnProperty.call(message, "healthy"))
                writer.uint32(/* id 1, wireType 0 =*/8).bool(message.healthy);
            if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.version);
            if (message.uptimeSeconds != null && Object.hasOwnProperty.call(message, "uptimeSeconds"))
                writer.uint32(/* id 3, wireType 0 =*/24).int64(message.uptimeSeconds);
            if (message.activeConnections != null && Object.hasOwnProperty.call(message, "activeConnections"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.activeConnections);
            if (message.buildInfo != null && Object.hasOwnProperty.call(message, "buildInfo"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.buildInfo);
            if (message.components != null && Object.hasOwnProperty.call(message, "components"))
                for (let keys = Object.keys(message.components), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 6, wireType 2 =*/50).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 2 =*/18).string(message.components[keys[i]]).ldelim();
            if (message.capabilities != null && message.capabilities.length)
                for (let i = 0; i < message.capabilities.length; ++i)
                    writer.uint32(/* id 7, wireType 2 =*/58).string(message.capabilities[i]);
            return writer;
        };

        /**
         * Encodes the specified StatusInfo message, length delimited. Does not implicitly {@link folder_mcp.StatusInfo.verify|verify} messages.
         * @function encodeDelimited
         * @memberof folder_mcp.StatusInfo
         * @static
         * @param {folder_mcp.IStatusInfo} message StatusInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StatusInfo.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a StatusInfo message from the specified reader or buffer.
         * @function decode
         * @memberof folder_mcp.StatusInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {folder_mcp.StatusInfo} StatusInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StatusInfo.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.folder_mcp.StatusInfo(), key, value;
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.healthy = reader.bool();
                        break;
                    }
                case 2: {
                        message.version = reader.string();
                        break;
                    }
                case 3: {
                        message.uptimeSeconds = reader.int64();
                        break;
                    }
                case 4: {
                        message.activeConnections = reader.int32();
                        break;
                    }
                case 5: {
                        message.buildInfo = reader.string();
                        break;
                    }
                case 6: {
                        if (message.components === $util.emptyObject)
                            message.components = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = "";
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.string();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.components[key] = value;
                        break;
                    }
                case 7: {
                        if (!(message.capabilities && message.capabilities.length))
                            message.capabilities = [];
                        message.capabilities.push(reader.string());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a StatusInfo message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof folder_mcp.StatusInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {folder_mcp.StatusInfo} StatusInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StatusInfo.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a StatusInfo message.
         * @function verify
         * @memberof folder_mcp.StatusInfo
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        StatusInfo.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.healthy != null && message.hasOwnProperty("healthy"))
                if (typeof message.healthy !== "boolean")
                    return "healthy: boolean expected";
            if (message.version != null && message.hasOwnProperty("version"))
                if (!$util.isString(message.version))
                    return "version: string expected";
            if (message.uptimeSeconds != null && message.hasOwnProperty("uptimeSeconds"))
                if (!$util.isInteger(message.uptimeSeconds) && !(message.uptimeSeconds && $util.isInteger(message.uptimeSeconds.low) && $util.isInteger(message.uptimeSeconds.high)))
                    return "uptimeSeconds: integer|Long expected";
            if (message.activeConnections != null && message.hasOwnProperty("activeConnections"))
                if (!$util.isInteger(message.activeConnections))
                    return "activeConnections: integer expected";
            if (message.buildInfo != null && message.hasOwnProperty("buildInfo"))
                if (!$util.isString(message.buildInfo))
                    return "buildInfo: string expected";
            if (message.components != null && message.hasOwnProperty("components")) {
                if (!$util.isObject(message.components))
                    return "components: object expected";
                let key = Object.keys(message.components);
                for (let i = 0; i < key.length; ++i)
                    if (!$util.isString(message.components[key[i]]))
                        return "components: string{k:string} expected";
            }
            if (message.capabilities != null && message.hasOwnProperty("capabilities")) {
                if (!Array.isArray(message.capabilities))
                    return "capabilities: array expected";
                for (let i = 0; i < message.capabilities.length; ++i)
                    if (!$util.isString(message.capabilities[i]))
                        return "capabilities: string[] expected";
            }
            return null;
        };

        /**
         * Creates a StatusInfo message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof folder_mcp.StatusInfo
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {folder_mcp.StatusInfo} StatusInfo
         */
        StatusInfo.fromObject = function fromObject(object) {
            if (object instanceof $root.folder_mcp.StatusInfo)
                return object;
            let message = new $root.folder_mcp.StatusInfo();
            if (object.healthy != null)
                message.healthy = Boolean(object.healthy);
            if (object.version != null)
                message.version = String(object.version);
            if (object.uptimeSeconds != null)
                if ($util.Long)
                    (message.uptimeSeconds = $util.Long.fromValue(object.uptimeSeconds)).unsigned = false;
                else if (typeof object.uptimeSeconds === "string")
                    message.uptimeSeconds = parseInt(object.uptimeSeconds, 10);
                else if (typeof object.uptimeSeconds === "number")
                    message.uptimeSeconds = object.uptimeSeconds;
                else if (typeof object.uptimeSeconds === "object")
                    message.uptimeSeconds = new $util.LongBits(object.uptimeSeconds.low >>> 0, object.uptimeSeconds.high >>> 0).toNumber();
            if (object.activeConnections != null)
                message.activeConnections = object.activeConnections | 0;
            if (object.buildInfo != null)
                message.buildInfo = String(object.buildInfo);
            if (object.components) {
                if (typeof object.components !== "object")
                    throw TypeError(".folder_mcp.StatusInfo.components: object expected");
                message.components = {};
                for (let keys = Object.keys(object.components), i = 0; i < keys.length; ++i)
                    message.components[keys[i]] = String(object.components[keys[i]]);
            }
            if (object.capabilities) {
                if (!Array.isArray(object.capabilities))
                    throw TypeError(".folder_mcp.StatusInfo.capabilities: array expected");
                message.capabilities = [];
                for (let i = 0; i < object.capabilities.length; ++i)
                    message.capabilities[i] = String(object.capabilities[i]);
            }
            return message;
        };

        /**
         * Creates a plain object from a StatusInfo message. Also converts values to other types if specified.
         * @function toObject
         * @memberof folder_mcp.StatusInfo
         * @static
         * @param {folder_mcp.StatusInfo} message StatusInfo
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        StatusInfo.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.capabilities = [];
            if (options.objects || options.defaults)
                object.components = {};
            if (options.defaults) {
                object.healthy = false;
                object.version = "";
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.uptimeSeconds = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.uptimeSeconds = options.longs === String ? "0" : 0;
                object.activeConnections = 0;
                object.buildInfo = "";
            }
            if (message.healthy != null && message.hasOwnProperty("healthy"))
                object.healthy = message.healthy;
            if (message.version != null && message.hasOwnProperty("version"))
                object.version = message.version;
            if (message.uptimeSeconds != null && message.hasOwnProperty("uptimeSeconds"))
                if (typeof message.uptimeSeconds === "number")
                    object.uptimeSeconds = options.longs === String ? String(message.uptimeSeconds) : message.uptimeSeconds;
                else
                    object.uptimeSeconds = options.longs === String ? $util.Long.prototype.toString.call(message.uptimeSeconds) : options.longs === Number ? new $util.LongBits(message.uptimeSeconds.low >>> 0, message.uptimeSeconds.high >>> 0).toNumber() : message.uptimeSeconds;
            if (message.activeConnections != null && message.hasOwnProperty("activeConnections"))
                object.activeConnections = message.activeConnections;
            if (message.buildInfo != null && message.hasOwnProperty("buildInfo"))
                object.buildInfo = message.buildInfo;
            let keys2;
            if (message.components && (keys2 = Object.keys(message.components)).length) {
                object.components = {};
                for (let j = 0; j < keys2.length; ++j)
                    object.components[keys2[j]] = message.components[keys2[j]];
            }
            if (message.capabilities && message.capabilities.length) {
                object.capabilities = [];
                for (let j = 0; j < message.capabilities.length; ++j)
                    object.capabilities[j] = message.capabilities[j];
            }
            return object;
        };

        /**
         * Converts this StatusInfo to JSON.
         * @function toJSON
         * @memberof folder_mcp.StatusInfo
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        StatusInfo.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for StatusInfo
         * @function getTypeUrl
         * @memberof folder_mcp.StatusInfo
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        StatusInfo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/folder_mcp.StatusInfo";
        };

        return StatusInfo;
    })();

    return folder_mcp;
})();

export { $root as default };
