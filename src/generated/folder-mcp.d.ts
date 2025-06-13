import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace folder_mcp. */
export namespace folder_mcp {

    /** DocumentType enum. */
    enum DocumentType {
        DOCUMENT_TYPE_UNSPECIFIED = 0,
        DOCUMENT_TYPE_PDF = 1,
        DOCUMENT_TYPE_DOCX = 2,
        DOCUMENT_TYPE_DOC = 3,
        DOCUMENT_TYPE_XLSX = 4,
        DOCUMENT_TYPE_XLS = 5,
        DOCUMENT_TYPE_PPTX = 6,
        DOCUMENT_TYPE_PPT = 7,
        DOCUMENT_TYPE_TXT = 8,
        DOCUMENT_TYPE_MD = 9,
        DOCUMENT_TYPE_CSV = 10,
        DOCUMENT_TYPE_RTF = 11,
        DOCUMENT_TYPE_ODT = 12,
        DOCUMENT_TYPE_ODS = 13,
        DOCUMENT_TYPE_ODP = 14,
        DOCUMENT_TYPE_HTML = 15,
        DOCUMENT_TYPE_XML = 16
    }

    /** SummaryMode enum. */
    enum SummaryMode {
        SUMMARY_MODE_UNSPECIFIED = 0,
        SUMMARY_MODE_BRIEF = 1,
        SUMMARY_MODE_DETAILED = 2,
        SUMMARY_MODE_EXECUTIVE = 3,
        SUMMARY_MODE_TECHNICAL = 4
    }

    /** IngestStatus enum. */
    enum IngestStatus {
        INGEST_STATUS_UNSPECIFIED = 0,
        INGEST_STATUS_PENDING = 1,
        INGEST_STATUS_PROCESSING = 2,
        INGEST_STATUS_COMPLETED = 3,
        INGEST_STATUS_FAILED = 4,
        INGEST_STATUS_CANCELLED = 5,
        INGEST_STATUS_RETRY = 6
    }

    /** Priority enum. */
    enum Priority {
        PRIORITY_UNSPECIFIED = 0,
        PRIORITY_LOW = 1,
        PRIORITY_NORMAL = 2,
        PRIORITY_HIGH = 3,
        PRIORITY_URGENT = 4
    }

    /** ErrorCode enum. */
    enum ErrorCode {
        ERROR_CODE_UNSPECIFIED = 0,
        ERROR_CODE_NOT_FOUND = 1,
        ERROR_CODE_PERMISSION_DENIED = 2,
        ERROR_CODE_INVALID_REQUEST = 3,
        ERROR_CODE_RESOURCE_EXHAUSTED = 4,
        ERROR_CODE_INTERNAL_ERROR = 5,
        ERROR_CODE_UNAVAILABLE = 6,
        ERROR_CODE_TIMEOUT = 7,
        ERROR_CODE_ALREADY_EXISTS = 8,
        ERROR_CODE_PRECONDITION_FAILED = 9,
        ERROR_CODE_OUT_OF_RANGE = 10
    }

    /** CellDataType enum. */
    enum CellDataType {
        CELL_DATA_TYPE_UNSPECIFIED = 0,
        CELL_DATA_TYPE_TEXT = 1,
        CELL_DATA_TYPE_NUMBER = 2,
        CELL_DATA_TYPE_DATE = 3,
        CELL_DATA_TYPE_BOOLEAN = 4,
        CELL_DATA_TYPE_FORMULA = 5,
        CELL_DATA_TYPE_ERROR = 6
    }

    /** Represents a FolderMCP */
    class FolderMCP extends $protobuf.rpc.Service {

        /**
         * Constructs a new FolderMCP service.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         */
        constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);

        /**
         * Creates new FolderMCP service using the specified rpc implementation.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         * @returns RPC service. Useful where requests and/or responses are streamed.
         */
        public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): FolderMCP;

        /**
         * Calls SearchDocs.
         * @param request SearchDocsRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and SearchDocsResponse
         */
        public searchDocs(request: folder_mcp.ISearchDocsRequest, callback: folder_mcp.FolderMCP.SearchDocsCallback): void;

        /**
         * Calls SearchDocs.
         * @param request SearchDocsRequest message or plain object
         * @returns Promise
         */
        public searchDocs(request: folder_mcp.ISearchDocsRequest): Promise<folder_mcp.SearchDocsResponse>;

        /**
         * Calls SearchChunks.
         * @param request SearchChunksRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and SearchChunksResponse
         */
        public searchChunks(request: folder_mcp.ISearchChunksRequest, callback: folder_mcp.FolderMCP.SearchChunksCallback): void;

        /**
         * Calls SearchChunks.
         * @param request SearchChunksRequest message or plain object
         * @returns Promise
         */
        public searchChunks(request: folder_mcp.ISearchChunksRequest): Promise<folder_mcp.SearchChunksResponse>;

        /**
         * Calls ListFolders.
         * @param request ListFoldersRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and ListFoldersResponse
         */
        public listFolders(request: folder_mcp.IListFoldersRequest, callback: folder_mcp.FolderMCP.ListFoldersCallback): void;

        /**
         * Calls ListFolders.
         * @param request ListFoldersRequest message or plain object
         * @returns Promise
         */
        public listFolders(request: folder_mcp.IListFoldersRequest): Promise<folder_mcp.ListFoldersResponse>;

        /**
         * Calls ListDocumentsInFolder.
         * @param request ListDocumentsInFolderRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and ListDocumentsInFolderResponse
         */
        public listDocumentsInFolder(request: folder_mcp.IListDocumentsInFolderRequest, callback: folder_mcp.FolderMCP.ListDocumentsInFolderCallback): void;

        /**
         * Calls ListDocumentsInFolder.
         * @param request ListDocumentsInFolderRequest message or plain object
         * @returns Promise
         */
        public listDocumentsInFolder(request: folder_mcp.IListDocumentsInFolderRequest): Promise<folder_mcp.ListDocumentsInFolderResponse>;

        /**
         * Calls GetDocMetadata.
         * @param request GetDocMetadataRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and GetDocMetadataResponse
         */
        public getDocMetadata(request: folder_mcp.IGetDocMetadataRequest, callback: folder_mcp.FolderMCP.GetDocMetadataCallback): void;

        /**
         * Calls GetDocMetadata.
         * @param request GetDocMetadataRequest message or plain object
         * @returns Promise
         */
        public getDocMetadata(request: folder_mcp.IGetDocMetadataRequest): Promise<folder_mcp.GetDocMetadataResponse>;

        /**
         * Calls DownloadDoc.
         * @param request DownloadDocRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and DownloadDocResponse
         */
        public downloadDoc(request: folder_mcp.IDownloadDocRequest, callback: folder_mcp.FolderMCP.DownloadDocCallback): void;

        /**
         * Calls DownloadDoc.
         * @param request DownloadDocRequest message or plain object
         * @returns Promise
         */
        public downloadDoc(request: folder_mcp.IDownloadDocRequest): Promise<folder_mcp.DownloadDocResponse>;

        /**
         * Calls GetChunks.
         * @param request GetChunksRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and GetChunksResponse
         */
        public getChunks(request: folder_mcp.IGetChunksRequest, callback: folder_mcp.FolderMCP.GetChunksCallback): void;

        /**
         * Calls GetChunks.
         * @param request GetChunksRequest message or plain object
         * @returns Promise
         */
        public getChunks(request: folder_mcp.IGetChunksRequest): Promise<folder_mcp.GetChunksResponse>;

        /**
         * Calls GetDocSummary.
         * @param request GetDocSummaryRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and GetDocSummaryResponse
         */
        public getDocSummary(request: folder_mcp.IGetDocSummaryRequest, callback: folder_mcp.FolderMCP.GetDocSummaryCallback): void;

        /**
         * Calls GetDocSummary.
         * @param request GetDocSummaryRequest message or plain object
         * @returns Promise
         */
        public getDocSummary(request: folder_mcp.IGetDocSummaryRequest): Promise<folder_mcp.GetDocSummaryResponse>;

        /**
         * Calls BatchDocSummary.
         * @param request BatchDocSummaryRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and BatchDocSummaryResponse
         */
        public batchDocSummary(request: folder_mcp.IBatchDocSummaryRequest, callback: folder_mcp.FolderMCP.BatchDocSummaryCallback): void;

        /**
         * Calls BatchDocSummary.
         * @param request BatchDocSummaryRequest message or plain object
         * @returns Promise
         */
        public batchDocSummary(request: folder_mcp.IBatchDocSummaryRequest): Promise<folder_mcp.BatchDocSummaryResponse>;

        /**
         * Calls TableQuery.
         * @param request TableQueryRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and TableQueryResponse
         */
        public tableQuery(request: folder_mcp.ITableQueryRequest, callback: folder_mcp.FolderMCP.TableQueryCallback): void;

        /**
         * Calls TableQuery.
         * @param request TableQueryRequest message or plain object
         * @returns Promise
         */
        public tableQuery(request: folder_mcp.ITableQueryRequest): Promise<folder_mcp.TableQueryResponse>;

        /**
         * Calls IngestStatus.
         * @param request IngestStatusRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and IngestStatusResponse
         */
        public ingestStatus(request: folder_mcp.IIngestStatusRequest, callback: folder_mcp.FolderMCP.IngestStatusCallback): void;

        /**
         * Calls IngestStatus.
         * @param request IngestStatusRequest message or plain object
         * @returns Promise
         */
        public ingestStatus(request: folder_mcp.IIngestStatusRequest): Promise<folder_mcp.IngestStatusResponse>;

        /**
         * Calls RefreshDoc.
         * @param request RefreshDocRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and RefreshDocResponse
         */
        public refreshDoc(request: folder_mcp.IRefreshDocRequest, callback: folder_mcp.FolderMCP.RefreshDocCallback): void;

        /**
         * Calls RefreshDoc.
         * @param request RefreshDocRequest message or plain object
         * @returns Promise
         */
        public refreshDoc(request: folder_mcp.IRefreshDocRequest): Promise<folder_mcp.RefreshDocResponse>;

        /**
         * Calls GetEmbedding.
         * @param request GetEmbeddingRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and GetEmbeddingResponse
         */
        public getEmbedding(request: folder_mcp.IGetEmbeddingRequest, callback: folder_mcp.FolderMCP.GetEmbeddingCallback): void;

        /**
         * Calls GetEmbedding.
         * @param request GetEmbeddingRequest message or plain object
         * @returns Promise
         */
        public getEmbedding(request: folder_mcp.IGetEmbeddingRequest): Promise<folder_mcp.GetEmbeddingResponse>;
    }

    namespace FolderMCP {

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#searchDocs}.
         * @param error Error, if any
         * @param [response] SearchDocsResponse
         */
        type SearchDocsCallback = (error: (Error|null), response?: folder_mcp.SearchDocsResponse) => void;

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#searchChunks}.
         * @param error Error, if any
         * @param [response] SearchChunksResponse
         */
        type SearchChunksCallback = (error: (Error|null), response?: folder_mcp.SearchChunksResponse) => void;

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#listFolders}.
         * @param error Error, if any
         * @param [response] ListFoldersResponse
         */
        type ListFoldersCallback = (error: (Error|null), response?: folder_mcp.ListFoldersResponse) => void;

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#listDocumentsInFolder}.
         * @param error Error, if any
         * @param [response] ListDocumentsInFolderResponse
         */
        type ListDocumentsInFolderCallback = (error: (Error|null), response?: folder_mcp.ListDocumentsInFolderResponse) => void;

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#getDocMetadata}.
         * @param error Error, if any
         * @param [response] GetDocMetadataResponse
         */
        type GetDocMetadataCallback = (error: (Error|null), response?: folder_mcp.GetDocMetadataResponse) => void;

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#downloadDoc}.
         * @param error Error, if any
         * @param [response] DownloadDocResponse
         */
        type DownloadDocCallback = (error: (Error|null), response?: folder_mcp.DownloadDocResponse) => void;

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#getChunks}.
         * @param error Error, if any
         * @param [response] GetChunksResponse
         */
        type GetChunksCallback = (error: (Error|null), response?: folder_mcp.GetChunksResponse) => void;

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#getDocSummary}.
         * @param error Error, if any
         * @param [response] GetDocSummaryResponse
         */
        type GetDocSummaryCallback = (error: (Error|null), response?: folder_mcp.GetDocSummaryResponse) => void;

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#batchDocSummary}.
         * @param error Error, if any
         * @param [response] BatchDocSummaryResponse
         */
        type BatchDocSummaryCallback = (error: (Error|null), response?: folder_mcp.BatchDocSummaryResponse) => void;

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#tableQuery}.
         * @param error Error, if any
         * @param [response] TableQueryResponse
         */
        type TableQueryCallback = (error: (Error|null), response?: folder_mcp.TableQueryResponse) => void;

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#ingestStatus}.
         * @param error Error, if any
         * @param [response] IngestStatusResponse
         */
        type IngestStatusCallback = (error: (Error|null), response?: folder_mcp.IngestStatusResponse) => void;

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#refreshDoc}.
         * @param error Error, if any
         * @param [response] RefreshDocResponse
         */
        type RefreshDocCallback = (error: (Error|null), response?: folder_mcp.RefreshDocResponse) => void;

        /**
         * Callback as used by {@link folder_mcp.FolderMCP#getEmbedding}.
         * @param error Error, if any
         * @param [response] GetEmbeddingResponse
         */
        type GetEmbeddingCallback = (error: (Error|null), response?: folder_mcp.GetEmbeddingResponse) => void;
    }

    /** Properties of a SearchDocsRequest. */
    interface ISearchDocsRequest {

        /** SearchDocsRequest query */
        query?: (string|null);

        /** SearchDocsRequest topK */
        topK?: (number|null);

        /** SearchDocsRequest documentTypes */
        documentTypes?: (folder_mcp.DocumentType[]|null);

        /** SearchDocsRequest dateFrom */
        dateFrom?: (string|null);

        /** SearchDocsRequest dateTo */
        dateTo?: (string|null);

        /** SearchDocsRequest authors */
        authors?: (string[]|null);

        /** SearchDocsRequest metadataFilters */
        metadataFilters?: ({ [k: string]: string }|null);
    }

    /** Represents a SearchDocsRequest. */
    class SearchDocsRequest implements ISearchDocsRequest {

        /**
         * Constructs a new SearchDocsRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.ISearchDocsRequest);

        /** SearchDocsRequest query. */
        public query: string;

        /** SearchDocsRequest topK. */
        public topK: number;

        /** SearchDocsRequest documentTypes. */
        public documentTypes: folder_mcp.DocumentType[];

        /** SearchDocsRequest dateFrom. */
        public dateFrom: string;

        /** SearchDocsRequest dateTo. */
        public dateTo: string;

        /** SearchDocsRequest authors. */
        public authors: string[];

        /** SearchDocsRequest metadataFilters. */
        public metadataFilters: { [k: string]: string };

        /**
         * Creates a new SearchDocsRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SearchDocsRequest instance
         */
        public static create(properties?: folder_mcp.ISearchDocsRequest): folder_mcp.SearchDocsRequest;

        /**
         * Encodes the specified SearchDocsRequest message. Does not implicitly {@link folder_mcp.SearchDocsRequest.verify|verify} messages.
         * @param message SearchDocsRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.ISearchDocsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SearchDocsRequest message, length delimited. Does not implicitly {@link folder_mcp.SearchDocsRequest.verify|verify} messages.
         * @param message SearchDocsRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.ISearchDocsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SearchDocsRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SearchDocsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.SearchDocsRequest;

        /**
         * Decodes a SearchDocsRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SearchDocsRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.SearchDocsRequest;

        /**
         * Verifies a SearchDocsRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SearchDocsRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SearchDocsRequest
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.SearchDocsRequest;

        /**
         * Creates a plain object from a SearchDocsRequest message. Also converts values to other types if specified.
         * @param message SearchDocsRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.SearchDocsRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SearchDocsRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SearchDocsRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SearchDocsResponse. */
    interface ISearchDocsResponse {

        /** SearchDocsResponse documents */
        documents?: (folder_mcp.IDocumentResult[]|null);

        /** SearchDocsResponse totalFound */
        totalFound?: (number|null);

        /** SearchDocsResponse maxScore */
        maxScore?: (folder_mcp.ISimilarityScore|null);

        /** SearchDocsResponse queryId */
        queryId?: (string|null);

        /** SearchDocsResponse status */
        status?: (folder_mcp.IResponseStatus|null);

        /** SearchDocsResponse pagination */
        pagination?: (folder_mcp.IPaginationInfo|null);
    }

    /** Represents a SearchDocsResponse. */
    class SearchDocsResponse implements ISearchDocsResponse {

        /**
         * Constructs a new SearchDocsResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.ISearchDocsResponse);

        /** SearchDocsResponse documents. */
        public documents: folder_mcp.IDocumentResult[];

        /** SearchDocsResponse totalFound. */
        public totalFound: number;

        /** SearchDocsResponse maxScore. */
        public maxScore?: (folder_mcp.ISimilarityScore|null);

        /** SearchDocsResponse queryId. */
        public queryId: string;

        /** SearchDocsResponse status. */
        public status?: (folder_mcp.IResponseStatus|null);

        /** SearchDocsResponse pagination. */
        public pagination?: (folder_mcp.IPaginationInfo|null);

        /**
         * Creates a new SearchDocsResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SearchDocsResponse instance
         */
        public static create(properties?: folder_mcp.ISearchDocsResponse): folder_mcp.SearchDocsResponse;

        /**
         * Encodes the specified SearchDocsResponse message. Does not implicitly {@link folder_mcp.SearchDocsResponse.verify|verify} messages.
         * @param message SearchDocsResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.ISearchDocsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SearchDocsResponse message, length delimited. Does not implicitly {@link folder_mcp.SearchDocsResponse.verify|verify} messages.
         * @param message SearchDocsResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.ISearchDocsResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SearchDocsResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SearchDocsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.SearchDocsResponse;

        /**
         * Decodes a SearchDocsResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SearchDocsResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.SearchDocsResponse;

        /**
         * Verifies a SearchDocsResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SearchDocsResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SearchDocsResponse
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.SearchDocsResponse;

        /**
         * Creates a plain object from a SearchDocsResponse message. Also converts values to other types if specified.
         * @param message SearchDocsResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.SearchDocsResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SearchDocsResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SearchDocsResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a DocumentResult. */
    interface IDocumentResult {

        /** DocumentResult documentId */
        documentId?: (string|null);

        /** DocumentResult filePath */
        filePath?: (string|null);

        /** DocumentResult title */
        title?: (string|null);

        /** DocumentResult similarity */
        similarity?: (folder_mcp.ISimilarityScore|null);

        /** DocumentResult documentType */
        documentType?: (folder_mcp.DocumentType|null);

        /** DocumentResult fileSize */
        fileSize?: (number|Long|null);

        /** DocumentResult modifiedDate */
        modifiedDate?: (string|null);

        /** DocumentResult authors */
        authors?: (folder_mcp.IAuthor[]|null);

        /** DocumentResult snippet */
        snippet?: (string|null);

        /** DocumentResult metadata */
        metadata?: (folder_mcp.IMetadata|null);
    }

    /** Represents a DocumentResult. */
    class DocumentResult implements IDocumentResult {

        /**
         * Constructs a new DocumentResult.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IDocumentResult);

        /** DocumentResult documentId. */
        public documentId: string;

        /** DocumentResult filePath. */
        public filePath: string;

        /** DocumentResult title. */
        public title: string;

        /** DocumentResult similarity. */
        public similarity?: (folder_mcp.ISimilarityScore|null);

        /** DocumentResult documentType. */
        public documentType: folder_mcp.DocumentType;

        /** DocumentResult fileSize. */
        public fileSize: (number|Long);

        /** DocumentResult modifiedDate. */
        public modifiedDate: string;

        /** DocumentResult authors. */
        public authors: folder_mcp.IAuthor[];

        /** DocumentResult snippet. */
        public snippet: string;

        /** DocumentResult metadata. */
        public metadata?: (folder_mcp.IMetadata|null);

        /**
         * Creates a new DocumentResult instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DocumentResult instance
         */
        public static create(properties?: folder_mcp.IDocumentResult): folder_mcp.DocumentResult;

        /**
         * Encodes the specified DocumentResult message. Does not implicitly {@link folder_mcp.DocumentResult.verify|verify} messages.
         * @param message DocumentResult message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IDocumentResult, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified DocumentResult message, length delimited. Does not implicitly {@link folder_mcp.DocumentResult.verify|verify} messages.
         * @param message DocumentResult message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IDocumentResult, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DocumentResult message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DocumentResult
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.DocumentResult;

        /**
         * Decodes a DocumentResult message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns DocumentResult
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.DocumentResult;

        /**
         * Verifies a DocumentResult message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a DocumentResult message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns DocumentResult
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.DocumentResult;

        /**
         * Creates a plain object from a DocumentResult message. Also converts values to other types if specified.
         * @param message DocumentResult
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.DocumentResult, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this DocumentResult to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for DocumentResult
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SearchChunksRequest. */
    interface ISearchChunksRequest {

        /** SearchChunksRequest query */
        query?: (string|null);

        /** SearchChunksRequest topK */
        topK?: (number|null);

        /** SearchChunksRequest documentIds */
        documentIds?: (string[]|null);

        /** SearchChunksRequest maxPreviewTokens */
        maxPreviewTokens?: (number|null);

        /** SearchChunksRequest includeContext */
        includeContext?: (boolean|null);
    }

    /** Represents a SearchChunksRequest. */
    class SearchChunksRequest implements ISearchChunksRequest {

        /**
         * Constructs a new SearchChunksRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.ISearchChunksRequest);

        /** SearchChunksRequest query. */
        public query: string;

        /** SearchChunksRequest topK. */
        public topK: number;

        /** SearchChunksRequest documentIds. */
        public documentIds: string[];

        /** SearchChunksRequest maxPreviewTokens. */
        public maxPreviewTokens: number;

        /** SearchChunksRequest includeContext. */
        public includeContext: boolean;

        /**
         * Creates a new SearchChunksRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SearchChunksRequest instance
         */
        public static create(properties?: folder_mcp.ISearchChunksRequest): folder_mcp.SearchChunksRequest;

        /**
         * Encodes the specified SearchChunksRequest message. Does not implicitly {@link folder_mcp.SearchChunksRequest.verify|verify} messages.
         * @param message SearchChunksRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.ISearchChunksRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SearchChunksRequest message, length delimited. Does not implicitly {@link folder_mcp.SearchChunksRequest.verify|verify} messages.
         * @param message SearchChunksRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.ISearchChunksRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SearchChunksRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SearchChunksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.SearchChunksRequest;

        /**
         * Decodes a SearchChunksRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SearchChunksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.SearchChunksRequest;

        /**
         * Verifies a SearchChunksRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SearchChunksRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SearchChunksRequest
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.SearchChunksRequest;

        /**
         * Creates a plain object from a SearchChunksRequest message. Also converts values to other types if specified.
         * @param message SearchChunksRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.SearchChunksRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SearchChunksRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SearchChunksRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SearchChunksResponse. */
    interface ISearchChunksResponse {

        /** SearchChunksResponse chunks */
        chunks?: (folder_mcp.IChunkResult[]|null);

        /** SearchChunksResponse totalFound */
        totalFound?: (number|null);

        /** SearchChunksResponse maxScore */
        maxScore?: (folder_mcp.ISimilarityScore|null);

        /** SearchChunksResponse queryId */
        queryId?: (string|null);

        /** SearchChunksResponse status */
        status?: (folder_mcp.IResponseStatus|null);

        /** SearchChunksResponse pagination */
        pagination?: (folder_mcp.IPaginationInfo|null);
    }

    /** Represents a SearchChunksResponse. */
    class SearchChunksResponse implements ISearchChunksResponse {

        /**
         * Constructs a new SearchChunksResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.ISearchChunksResponse);

        /** SearchChunksResponse chunks. */
        public chunks: folder_mcp.IChunkResult[];

        /** SearchChunksResponse totalFound. */
        public totalFound: number;

        /** SearchChunksResponse maxScore. */
        public maxScore?: (folder_mcp.ISimilarityScore|null);

        /** SearchChunksResponse queryId. */
        public queryId: string;

        /** SearchChunksResponse status. */
        public status?: (folder_mcp.IResponseStatus|null);

        /** SearchChunksResponse pagination. */
        public pagination?: (folder_mcp.IPaginationInfo|null);

        /**
         * Creates a new SearchChunksResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SearchChunksResponse instance
         */
        public static create(properties?: folder_mcp.ISearchChunksResponse): folder_mcp.SearchChunksResponse;

        /**
         * Encodes the specified SearchChunksResponse message. Does not implicitly {@link folder_mcp.SearchChunksResponse.verify|verify} messages.
         * @param message SearchChunksResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.ISearchChunksResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SearchChunksResponse message, length delimited. Does not implicitly {@link folder_mcp.SearchChunksResponse.verify|verify} messages.
         * @param message SearchChunksResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.ISearchChunksResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SearchChunksResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SearchChunksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.SearchChunksResponse;

        /**
         * Decodes a SearchChunksResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SearchChunksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.SearchChunksResponse;

        /**
         * Verifies a SearchChunksResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SearchChunksResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SearchChunksResponse
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.SearchChunksResponse;

        /**
         * Creates a plain object from a SearchChunksResponse message. Also converts values to other types if specified.
         * @param message SearchChunksResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.SearchChunksResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SearchChunksResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SearchChunksResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ChunkResult. */
    interface IChunkResult {

        /** ChunkResult chunkId */
        chunkId?: (string|null);

        /** ChunkResult documentId */
        documentId?: (string|null);

        /** ChunkResult filePath */
        filePath?: (string|null);

        /** ChunkResult similarity */
        similarity?: (folder_mcp.ISimilarityScore|null);

        /** ChunkResult contentPreview */
        contentPreview?: (string|null);

        /** ChunkResult chunkIndex */
        chunkIndex?: (number|null);

        /** ChunkResult startOffset */
        startOffset?: (number|null);

        /** ChunkResult endOffset */
        endOffset?: (number|null);

        /** ChunkResult contextChunks */
        contextChunks?: (folder_mcp.IChunkResult[]|null);

        /** ChunkResult metadata */
        metadata?: (folder_mcp.IMetadata|null);
    }

    /** Represents a ChunkResult. */
    class ChunkResult implements IChunkResult {

        /**
         * Constructs a new ChunkResult.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IChunkResult);

        /** ChunkResult chunkId. */
        public chunkId: string;

        /** ChunkResult documentId. */
        public documentId: string;

        /** ChunkResult filePath. */
        public filePath: string;

        /** ChunkResult similarity. */
        public similarity?: (folder_mcp.ISimilarityScore|null);

        /** ChunkResult contentPreview. */
        public contentPreview: string;

        /** ChunkResult chunkIndex. */
        public chunkIndex: number;

        /** ChunkResult startOffset. */
        public startOffset: number;

        /** ChunkResult endOffset. */
        public endOffset: number;

        /** ChunkResult contextChunks. */
        public contextChunks: folder_mcp.IChunkResult[];

        /** ChunkResult metadata. */
        public metadata?: (folder_mcp.IMetadata|null);

        /**
         * Creates a new ChunkResult instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ChunkResult instance
         */
        public static create(properties?: folder_mcp.IChunkResult): folder_mcp.ChunkResult;

        /**
         * Encodes the specified ChunkResult message. Does not implicitly {@link folder_mcp.ChunkResult.verify|verify} messages.
         * @param message ChunkResult message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IChunkResult, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ChunkResult message, length delimited. Does not implicitly {@link folder_mcp.ChunkResult.verify|verify} messages.
         * @param message ChunkResult message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IChunkResult, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ChunkResult message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ChunkResult
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.ChunkResult;

        /**
         * Decodes a ChunkResult message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ChunkResult
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.ChunkResult;

        /**
         * Verifies a ChunkResult message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ChunkResult message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ChunkResult
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.ChunkResult;

        /**
         * Creates a plain object from a ChunkResult message. Also converts values to other types if specified.
         * @param message ChunkResult
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.ChunkResult, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ChunkResult to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ChunkResult
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ListFoldersRequest. */
    interface IListFoldersRequest {

        /** ListFoldersRequest basePath */
        basePath?: (string|null);

        /** ListFoldersRequest maxDepth */
        maxDepth?: (number|null);

        /** ListFoldersRequest includeDocumentCounts */
        includeDocumentCounts?: (boolean|null);
    }

    /** Represents a ListFoldersRequest. */
    class ListFoldersRequest implements IListFoldersRequest {

        /**
         * Constructs a new ListFoldersRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IListFoldersRequest);

        /** ListFoldersRequest basePath. */
        public basePath: string;

        /** ListFoldersRequest maxDepth. */
        public maxDepth: number;

        /** ListFoldersRequest includeDocumentCounts. */
        public includeDocumentCounts: boolean;

        /**
         * Creates a new ListFoldersRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListFoldersRequest instance
         */
        public static create(properties?: folder_mcp.IListFoldersRequest): folder_mcp.ListFoldersRequest;

        /**
         * Encodes the specified ListFoldersRequest message. Does not implicitly {@link folder_mcp.ListFoldersRequest.verify|verify} messages.
         * @param message ListFoldersRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IListFoldersRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ListFoldersRequest message, length delimited. Does not implicitly {@link folder_mcp.ListFoldersRequest.verify|verify} messages.
         * @param message ListFoldersRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IListFoldersRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListFoldersRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ListFoldersRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.ListFoldersRequest;

        /**
         * Decodes a ListFoldersRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ListFoldersRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.ListFoldersRequest;

        /**
         * Verifies a ListFoldersRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ListFoldersRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ListFoldersRequest
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.ListFoldersRequest;

        /**
         * Creates a plain object from a ListFoldersRequest message. Also converts values to other types if specified.
         * @param message ListFoldersRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.ListFoldersRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ListFoldersRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ListFoldersRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ListFoldersResponse. */
    interface IListFoldersResponse {

        /** ListFoldersResponse folders */
        folders?: (folder_mcp.IFolderInfo[]|null);

        /** ListFoldersResponse totalFolders */
        totalFolders?: (number|null);

        /** ListFoldersResponse status */
        status?: (folder_mcp.IResponseStatus|null);

        /** ListFoldersResponse pagination */
        pagination?: (folder_mcp.IPaginationInfo|null);
    }

    /** Represents a ListFoldersResponse. */
    class ListFoldersResponse implements IListFoldersResponse {

        /**
         * Constructs a new ListFoldersResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IListFoldersResponse);

        /** ListFoldersResponse folders. */
        public folders: folder_mcp.IFolderInfo[];

        /** ListFoldersResponse totalFolders. */
        public totalFolders: number;

        /** ListFoldersResponse status. */
        public status?: (folder_mcp.IResponseStatus|null);

        /** ListFoldersResponse pagination. */
        public pagination?: (folder_mcp.IPaginationInfo|null);

        /**
         * Creates a new ListFoldersResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListFoldersResponse instance
         */
        public static create(properties?: folder_mcp.IListFoldersResponse): folder_mcp.ListFoldersResponse;

        /**
         * Encodes the specified ListFoldersResponse message. Does not implicitly {@link folder_mcp.ListFoldersResponse.verify|verify} messages.
         * @param message ListFoldersResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IListFoldersResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ListFoldersResponse message, length delimited. Does not implicitly {@link folder_mcp.ListFoldersResponse.verify|verify} messages.
         * @param message ListFoldersResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IListFoldersResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListFoldersResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ListFoldersResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.ListFoldersResponse;

        /**
         * Decodes a ListFoldersResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ListFoldersResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.ListFoldersResponse;

        /**
         * Verifies a ListFoldersResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ListFoldersResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ListFoldersResponse
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.ListFoldersResponse;

        /**
         * Creates a plain object from a ListFoldersResponse message. Also converts values to other types if specified.
         * @param message ListFoldersResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.ListFoldersResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ListFoldersResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ListFoldersResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a FolderInfo. */
    interface IFolderInfo {

        /** FolderInfo folderPath */
        folderPath?: (string|null);

        /** FolderInfo folderName */
        folderName?: (string|null);

        /** FolderInfo documentCount */
        documentCount?: (number|null);

        /** FolderInfo totalSize */
        totalSize?: (number|Long|null);

        /** FolderInfo lastModified */
        lastModified?: (string|null);

        /** FolderInfo subfolders */
        subfolders?: (folder_mcp.IFolderInfo[]|null);
    }

    /** Represents a FolderInfo. */
    class FolderInfo implements IFolderInfo {

        /**
         * Constructs a new FolderInfo.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IFolderInfo);

        /** FolderInfo folderPath. */
        public folderPath: string;

        /** FolderInfo folderName. */
        public folderName: string;

        /** FolderInfo documentCount. */
        public documentCount: number;

        /** FolderInfo totalSize. */
        public totalSize: (number|Long);

        /** FolderInfo lastModified. */
        public lastModified: string;

        /** FolderInfo subfolders. */
        public subfolders: folder_mcp.IFolderInfo[];

        /**
         * Creates a new FolderInfo instance using the specified properties.
         * @param [properties] Properties to set
         * @returns FolderInfo instance
         */
        public static create(properties?: folder_mcp.IFolderInfo): folder_mcp.FolderInfo;

        /**
         * Encodes the specified FolderInfo message. Does not implicitly {@link folder_mcp.FolderInfo.verify|verify} messages.
         * @param message FolderInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IFolderInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified FolderInfo message, length delimited. Does not implicitly {@link folder_mcp.FolderInfo.verify|verify} messages.
         * @param message FolderInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IFolderInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a FolderInfo message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns FolderInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.FolderInfo;

        /**
         * Decodes a FolderInfo message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns FolderInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.FolderInfo;

        /**
         * Verifies a FolderInfo message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a FolderInfo message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns FolderInfo
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.FolderInfo;

        /**
         * Creates a plain object from a FolderInfo message. Also converts values to other types if specified.
         * @param message FolderInfo
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.FolderInfo, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this FolderInfo to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for FolderInfo
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ListDocumentsInFolderRequest. */
    interface IListDocumentsInFolderRequest {

        /** ListDocumentsInFolderRequest folderPath */
        folderPath?: (string|null);

        /** ListDocumentsInFolderRequest page */
        page?: (number|null);

        /** ListDocumentsInFolderRequest perPage */
        perPage?: (number|null);

        /** ListDocumentsInFolderRequest sortBy */
        sortBy?: (string|null);

        /** ListDocumentsInFolderRequest sortOrder */
        sortOrder?: (string|null);

        /** ListDocumentsInFolderRequest typeFilter */
        typeFilter?: (folder_mcp.DocumentType[]|null);

        /** ListDocumentsInFolderRequest modifiedAfter */
        modifiedAfter?: (string|null);

        /** ListDocumentsInFolderRequest modifiedBefore */
        modifiedBefore?: (string|null);
    }

    /** Represents a ListDocumentsInFolderRequest. */
    class ListDocumentsInFolderRequest implements IListDocumentsInFolderRequest {

        /**
         * Constructs a new ListDocumentsInFolderRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IListDocumentsInFolderRequest);

        /** ListDocumentsInFolderRequest folderPath. */
        public folderPath: string;

        /** ListDocumentsInFolderRequest page. */
        public page: number;

        /** ListDocumentsInFolderRequest perPage. */
        public perPage: number;

        /** ListDocumentsInFolderRequest sortBy. */
        public sortBy: string;

        /** ListDocumentsInFolderRequest sortOrder. */
        public sortOrder: string;

        /** ListDocumentsInFolderRequest typeFilter. */
        public typeFilter: folder_mcp.DocumentType[];

        /** ListDocumentsInFolderRequest modifiedAfter. */
        public modifiedAfter: string;

        /** ListDocumentsInFolderRequest modifiedBefore. */
        public modifiedBefore: string;

        /**
         * Creates a new ListDocumentsInFolderRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListDocumentsInFolderRequest instance
         */
        public static create(properties?: folder_mcp.IListDocumentsInFolderRequest): folder_mcp.ListDocumentsInFolderRequest;

        /**
         * Encodes the specified ListDocumentsInFolderRequest message. Does not implicitly {@link folder_mcp.ListDocumentsInFolderRequest.verify|verify} messages.
         * @param message ListDocumentsInFolderRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IListDocumentsInFolderRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ListDocumentsInFolderRequest message, length delimited. Does not implicitly {@link folder_mcp.ListDocumentsInFolderRequest.verify|verify} messages.
         * @param message ListDocumentsInFolderRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IListDocumentsInFolderRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListDocumentsInFolderRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ListDocumentsInFolderRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.ListDocumentsInFolderRequest;

        /**
         * Decodes a ListDocumentsInFolderRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ListDocumentsInFolderRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.ListDocumentsInFolderRequest;

        /**
         * Verifies a ListDocumentsInFolderRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ListDocumentsInFolderRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ListDocumentsInFolderRequest
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.ListDocumentsInFolderRequest;

        /**
         * Creates a plain object from a ListDocumentsInFolderRequest message. Also converts values to other types if specified.
         * @param message ListDocumentsInFolderRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.ListDocumentsInFolderRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ListDocumentsInFolderRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ListDocumentsInFolderRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ListDocumentsInFolderResponse. */
    interface IListDocumentsInFolderResponse {

        /** ListDocumentsInFolderResponse documents */
        documents?: (folder_mcp.IDocumentInfo[]|null);

        /** ListDocumentsInFolderResponse totalDocuments */
        totalDocuments?: (number|null);

        /** ListDocumentsInFolderResponse status */
        status?: (folder_mcp.IResponseStatus|null);

        /** ListDocumentsInFolderResponse pagination */
        pagination?: (folder_mcp.IPaginationInfo|null);
    }

    /** Represents a ListDocumentsInFolderResponse. */
    class ListDocumentsInFolderResponse implements IListDocumentsInFolderResponse {

        /**
         * Constructs a new ListDocumentsInFolderResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IListDocumentsInFolderResponse);

        /** ListDocumentsInFolderResponse documents. */
        public documents: folder_mcp.IDocumentInfo[];

        /** ListDocumentsInFolderResponse totalDocuments. */
        public totalDocuments: number;

        /** ListDocumentsInFolderResponse status. */
        public status?: (folder_mcp.IResponseStatus|null);

        /** ListDocumentsInFolderResponse pagination. */
        public pagination?: (folder_mcp.IPaginationInfo|null);

        /**
         * Creates a new ListDocumentsInFolderResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ListDocumentsInFolderResponse instance
         */
        public static create(properties?: folder_mcp.IListDocumentsInFolderResponse): folder_mcp.ListDocumentsInFolderResponse;

        /**
         * Encodes the specified ListDocumentsInFolderResponse message. Does not implicitly {@link folder_mcp.ListDocumentsInFolderResponse.verify|verify} messages.
         * @param message ListDocumentsInFolderResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IListDocumentsInFolderResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ListDocumentsInFolderResponse message, length delimited. Does not implicitly {@link folder_mcp.ListDocumentsInFolderResponse.verify|verify} messages.
         * @param message ListDocumentsInFolderResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IListDocumentsInFolderResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ListDocumentsInFolderResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ListDocumentsInFolderResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.ListDocumentsInFolderResponse;

        /**
         * Decodes a ListDocumentsInFolderResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ListDocumentsInFolderResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.ListDocumentsInFolderResponse;

        /**
         * Verifies a ListDocumentsInFolderResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ListDocumentsInFolderResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ListDocumentsInFolderResponse
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.ListDocumentsInFolderResponse;

        /**
         * Creates a plain object from a ListDocumentsInFolderResponse message. Also converts values to other types if specified.
         * @param message ListDocumentsInFolderResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.ListDocumentsInFolderResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ListDocumentsInFolderResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ListDocumentsInFolderResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a DocumentInfo. */
    interface IDocumentInfo {

        /** DocumentInfo documentId */
        documentId?: (string|null);

        /** DocumentInfo filePath */
        filePath?: (string|null);

        /** DocumentInfo filename */
        filename?: (string|null);

        /** DocumentInfo documentType */
        documentType?: (folder_mcp.DocumentType|null);

        /** DocumentInfo fileSize */
        fileSize?: (number|Long|null);

        /** DocumentInfo createdDate */
        createdDate?: (string|null);

        /** DocumentInfo modifiedDate */
        modifiedDate?: (string|null);

        /** DocumentInfo authors */
        authors?: (folder_mcp.IAuthor[]|null);

        /** DocumentInfo title */
        title?: (string|null);

        /** DocumentInfo pageCount */
        pageCount?: (number|null);

        /** DocumentInfo metadata */
        metadata?: (folder_mcp.IMetadata|null);
    }

    /** Represents a DocumentInfo. */
    class DocumentInfo implements IDocumentInfo {

        /**
         * Constructs a new DocumentInfo.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IDocumentInfo);

        /** DocumentInfo documentId. */
        public documentId: string;

        /** DocumentInfo filePath. */
        public filePath: string;

        /** DocumentInfo filename. */
        public filename: string;

        /** DocumentInfo documentType. */
        public documentType: folder_mcp.DocumentType;

        /** DocumentInfo fileSize. */
        public fileSize: (number|Long);

        /** DocumentInfo createdDate. */
        public createdDate: string;

        /** DocumentInfo modifiedDate. */
        public modifiedDate: string;

        /** DocumentInfo authors. */
        public authors: folder_mcp.IAuthor[];

        /** DocumentInfo title. */
        public title: string;

        /** DocumentInfo pageCount. */
        public pageCount: number;

        /** DocumentInfo metadata. */
        public metadata?: (folder_mcp.IMetadata|null);

        /**
         * Creates a new DocumentInfo instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DocumentInfo instance
         */
        public static create(properties?: folder_mcp.IDocumentInfo): folder_mcp.DocumentInfo;

        /**
         * Encodes the specified DocumentInfo message. Does not implicitly {@link folder_mcp.DocumentInfo.verify|verify} messages.
         * @param message DocumentInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IDocumentInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified DocumentInfo message, length delimited. Does not implicitly {@link folder_mcp.DocumentInfo.verify|verify} messages.
         * @param message DocumentInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IDocumentInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DocumentInfo message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DocumentInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.DocumentInfo;

        /**
         * Decodes a DocumentInfo message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns DocumentInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.DocumentInfo;

        /**
         * Verifies a DocumentInfo message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a DocumentInfo message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns DocumentInfo
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.DocumentInfo;

        /**
         * Creates a plain object from a DocumentInfo message. Also converts values to other types if specified.
         * @param message DocumentInfo
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.DocumentInfo, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this DocumentInfo to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for DocumentInfo
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetDocMetadataRequest. */
    interface IGetDocMetadataRequest {

        /** GetDocMetadataRequest documentId */
        documentId?: (string|null);

        /** GetDocMetadataRequest includeStructure */
        includeStructure?: (boolean|null);
    }

    /** Represents a GetDocMetadataRequest. */
    class GetDocMetadataRequest implements IGetDocMetadataRequest {

        /**
         * Constructs a new GetDocMetadataRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IGetDocMetadataRequest);

        /** GetDocMetadataRequest documentId. */
        public documentId: string;

        /** GetDocMetadataRequest includeStructure. */
        public includeStructure: boolean;

        /**
         * Creates a new GetDocMetadataRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetDocMetadataRequest instance
         */
        public static create(properties?: folder_mcp.IGetDocMetadataRequest): folder_mcp.GetDocMetadataRequest;

        /**
         * Encodes the specified GetDocMetadataRequest message. Does not implicitly {@link folder_mcp.GetDocMetadataRequest.verify|verify} messages.
         * @param message GetDocMetadataRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IGetDocMetadataRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetDocMetadataRequest message, length delimited. Does not implicitly {@link folder_mcp.GetDocMetadataRequest.verify|verify} messages.
         * @param message GetDocMetadataRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IGetDocMetadataRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetDocMetadataRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetDocMetadataRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.GetDocMetadataRequest;

        /**
         * Decodes a GetDocMetadataRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetDocMetadataRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.GetDocMetadataRequest;

        /**
         * Verifies a GetDocMetadataRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetDocMetadataRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetDocMetadataRequest
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.GetDocMetadataRequest;

        /**
         * Creates a plain object from a GetDocMetadataRequest message. Also converts values to other types if specified.
         * @param message GetDocMetadataRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.GetDocMetadataRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetDocMetadataRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetDocMetadataRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetDocMetadataResponse. */
    interface IGetDocMetadataResponse {

        /** GetDocMetadataResponse documentInfo */
        documentInfo?: (folder_mcp.IDocumentInfo|null);

        /** GetDocMetadataResponse structure */
        structure?: (folder_mcp.IDocumentStructureEnhanced|null);

        /** GetDocMetadataResponse status */
        status?: (folder_mcp.IResponseStatus|null);
    }

    /** Represents a GetDocMetadataResponse. */
    class GetDocMetadataResponse implements IGetDocMetadataResponse {

        /**
         * Constructs a new GetDocMetadataResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IGetDocMetadataResponse);

        /** GetDocMetadataResponse documentInfo. */
        public documentInfo?: (folder_mcp.IDocumentInfo|null);

        /** GetDocMetadataResponse structure. */
        public structure?: (folder_mcp.IDocumentStructureEnhanced|null);

        /** GetDocMetadataResponse status. */
        public status?: (folder_mcp.IResponseStatus|null);

        /**
         * Creates a new GetDocMetadataResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetDocMetadataResponse instance
         */
        public static create(properties?: folder_mcp.IGetDocMetadataResponse): folder_mcp.GetDocMetadataResponse;

        /**
         * Encodes the specified GetDocMetadataResponse message. Does not implicitly {@link folder_mcp.GetDocMetadataResponse.verify|verify} messages.
         * @param message GetDocMetadataResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IGetDocMetadataResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetDocMetadataResponse message, length delimited. Does not implicitly {@link folder_mcp.GetDocMetadataResponse.verify|verify} messages.
         * @param message GetDocMetadataResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IGetDocMetadataResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetDocMetadataResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetDocMetadataResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.GetDocMetadataResponse;

        /**
         * Decodes a GetDocMetadataResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetDocMetadataResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.GetDocMetadataResponse;

        /**
         * Verifies a GetDocMetadataResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetDocMetadataResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetDocMetadataResponse
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.GetDocMetadataResponse;

        /**
         * Creates a plain object from a GetDocMetadataResponse message. Also converts values to other types if specified.
         * @param message GetDocMetadataResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.GetDocMetadataResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetDocMetadataResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetDocMetadataResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a DocumentStructure. */
    interface IDocumentStructure {

        /** DocumentStructure sheets */
        sheets?: (folder_mcp.ISheetInfo[]|null);

        /** DocumentStructure slides */
        slides?: (folder_mcp.ISlideInfo[]|null);

        /** DocumentStructure pages */
        pages?: (folder_mcp.IPageInfo[]|null);

        /** DocumentStructure sections */
        sections?: (folder_mcp.ISectionInfo[]|null);
    }

    /** Represents a DocumentStructure. */
    class DocumentStructure implements IDocumentStructure {

        /**
         * Constructs a new DocumentStructure.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IDocumentStructure);

        /** DocumentStructure sheets. */
        public sheets: folder_mcp.ISheetInfo[];

        /** DocumentStructure slides. */
        public slides: folder_mcp.ISlideInfo[];

        /** DocumentStructure pages. */
        public pages: folder_mcp.IPageInfo[];

        /** DocumentStructure sections. */
        public sections: folder_mcp.ISectionInfo[];

        /**
         * Creates a new DocumentStructure instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DocumentStructure instance
         */
        public static create(properties?: folder_mcp.IDocumentStructure): folder_mcp.DocumentStructure;

        /**
         * Encodes the specified DocumentStructure message. Does not implicitly {@link folder_mcp.DocumentStructure.verify|verify} messages.
         * @param message DocumentStructure message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IDocumentStructure, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified DocumentStructure message, length delimited. Does not implicitly {@link folder_mcp.DocumentStructure.verify|verify} messages.
         * @param message DocumentStructure message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IDocumentStructure, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DocumentStructure message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DocumentStructure
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.DocumentStructure;

        /**
         * Decodes a DocumentStructure message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns DocumentStructure
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.DocumentStructure;

        /**
         * Verifies a DocumentStructure message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a DocumentStructure message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns DocumentStructure
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.DocumentStructure;

        /**
         * Creates a plain object from a DocumentStructure message. Also converts values to other types if specified.
         * @param message DocumentStructure
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.DocumentStructure, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this DocumentStructure to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for DocumentStructure
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SheetInfo. */
    interface ISheetInfo {

        /** SheetInfo sheetName */
        sheetName?: (string|null);

        /** SheetInfo rowCount */
        rowCount?: (number|null);

        /** SheetInfo columnCount */
        columnCount?: (number|null);

        /** SheetInfo columnHeaders */
        columnHeaders?: (string[]|null);
    }

    /** Represents a SheetInfo. */
    class SheetInfo implements ISheetInfo {

        /**
         * Constructs a new SheetInfo.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.ISheetInfo);

        /** SheetInfo sheetName. */
        public sheetName: string;

        /** SheetInfo rowCount. */
        public rowCount: number;

        /** SheetInfo columnCount. */
        public columnCount: number;

        /** SheetInfo columnHeaders. */
        public columnHeaders: string[];

        /**
         * Creates a new SheetInfo instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SheetInfo instance
         */
        public static create(properties?: folder_mcp.ISheetInfo): folder_mcp.SheetInfo;

        /**
         * Encodes the specified SheetInfo message. Does not implicitly {@link folder_mcp.SheetInfo.verify|verify} messages.
         * @param message SheetInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.ISheetInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SheetInfo message, length delimited. Does not implicitly {@link folder_mcp.SheetInfo.verify|verify} messages.
         * @param message SheetInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.ISheetInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SheetInfo message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SheetInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.SheetInfo;

        /**
         * Decodes a SheetInfo message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SheetInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.SheetInfo;

        /**
         * Verifies a SheetInfo message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SheetInfo message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SheetInfo
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.SheetInfo;

        /**
         * Creates a plain object from a SheetInfo message. Also converts values to other types if specified.
         * @param message SheetInfo
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.SheetInfo, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SheetInfo to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SheetInfo
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SlideInfo. */
    interface ISlideInfo {

        /** SlideInfo slideNumber */
        slideNumber?: (number|null);

        /** SlideInfo title */
        title?: (string|null);

        /** SlideInfo layout */
        layout?: (string|null);

        /** SlideInfo textLength */
        textLength?: (number|null);
    }

    /** Represents a SlideInfo. */
    class SlideInfo implements ISlideInfo {

        /**
         * Constructs a new SlideInfo.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.ISlideInfo);

        /** SlideInfo slideNumber. */
        public slideNumber: number;

        /** SlideInfo title. */
        public title: string;

        /** SlideInfo layout. */
        public layout: string;

        /** SlideInfo textLength. */
        public textLength: number;

        /**
         * Creates a new SlideInfo instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SlideInfo instance
         */
        public static create(properties?: folder_mcp.ISlideInfo): folder_mcp.SlideInfo;

        /**
         * Encodes the specified SlideInfo message. Does not implicitly {@link folder_mcp.SlideInfo.verify|verify} messages.
         * @param message SlideInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.ISlideInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SlideInfo message, length delimited. Does not implicitly {@link folder_mcp.SlideInfo.verify|verify} messages.
         * @param message SlideInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.ISlideInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SlideInfo message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SlideInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.SlideInfo;

        /**
         * Decodes a SlideInfo message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SlideInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.SlideInfo;

        /**
         * Verifies a SlideInfo message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SlideInfo message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SlideInfo
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.SlideInfo;

        /**
         * Creates a plain object from a SlideInfo message. Also converts values to other types if specified.
         * @param message SlideInfo
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.SlideInfo, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SlideInfo to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SlideInfo
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PageInfo. */
    interface IPageInfo {

        /** PageInfo pageNumber */
        pageNumber?: (number|null);

        /** PageInfo textLength */
        textLength?: (number|null);

        /** PageInfo hasImages */
        hasImages?: (boolean|null);

        /** PageInfo hasTables */
        hasTables?: (boolean|null);
    }

    /** Represents a PageInfo. */
    class PageInfo implements IPageInfo {

        /**
         * Constructs a new PageInfo.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IPageInfo);

        /** PageInfo pageNumber. */
        public pageNumber: number;

        /** PageInfo textLength. */
        public textLength: number;

        /** PageInfo hasImages. */
        public hasImages: boolean;

        /** PageInfo hasTables. */
        public hasTables: boolean;

        /**
         * Creates a new PageInfo instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PageInfo instance
         */
        public static create(properties?: folder_mcp.IPageInfo): folder_mcp.PageInfo;

        /**
         * Encodes the specified PageInfo message. Does not implicitly {@link folder_mcp.PageInfo.verify|verify} messages.
         * @param message PageInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IPageInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PageInfo message, length delimited. Does not implicitly {@link folder_mcp.PageInfo.verify|verify} messages.
         * @param message PageInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IPageInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PageInfo message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PageInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.PageInfo;

        /**
         * Decodes a PageInfo message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PageInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.PageInfo;

        /**
         * Verifies a PageInfo message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PageInfo message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PageInfo
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.PageInfo;

        /**
         * Creates a plain object from a PageInfo message. Also converts values to other types if specified.
         * @param message PageInfo
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.PageInfo, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PageInfo to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PageInfo
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SectionInfo. */
    interface ISectionInfo {

        /** SectionInfo sectionTitle */
        sectionTitle?: (string|null);

        /** SectionInfo level */
        level?: (number|null);

        /** SectionInfo startOffset */
        startOffset?: (number|null);

        /** SectionInfo endOffset */
        endOffset?: (number|null);
    }

    /** Represents a SectionInfo. */
    class SectionInfo implements ISectionInfo {

        /**
         * Constructs a new SectionInfo.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.ISectionInfo);

        /** SectionInfo sectionTitle. */
        public sectionTitle: string;

        /** SectionInfo level. */
        public level: number;

        /** SectionInfo startOffset. */
        public startOffset: number;

        /** SectionInfo endOffset. */
        public endOffset: number;

        /**
         * Creates a new SectionInfo instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SectionInfo instance
         */
        public static create(properties?: folder_mcp.ISectionInfo): folder_mcp.SectionInfo;

        /**
         * Encodes the specified SectionInfo message. Does not implicitly {@link folder_mcp.SectionInfo.verify|verify} messages.
         * @param message SectionInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.ISectionInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SectionInfo message, length delimited. Does not implicitly {@link folder_mcp.SectionInfo.verify|verify} messages.
         * @param message SectionInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.ISectionInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SectionInfo message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SectionInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.SectionInfo;

        /**
         * Decodes a SectionInfo message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SectionInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.SectionInfo;

        /**
         * Verifies a SectionInfo message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SectionInfo message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SectionInfo
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.SectionInfo;

        /**
         * Creates a plain object from a SectionInfo message. Also converts values to other types if specified.
         * @param message SectionInfo
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.SectionInfo, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SectionInfo to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SectionInfo
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a DownloadDocRequest. */
    interface IDownloadDocRequest {

        /** DownloadDocRequest documentId */
        documentId?: (string|null);

        /** DownloadDocRequest format */
        format?: (string|null);
    }

    /** Represents a DownloadDocRequest. */
    class DownloadDocRequest implements IDownloadDocRequest {

        /**
         * Constructs a new DownloadDocRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IDownloadDocRequest);

        /** DownloadDocRequest documentId. */
        public documentId: string;

        /** DownloadDocRequest format. */
        public format: string;

        /**
         * Creates a new DownloadDocRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DownloadDocRequest instance
         */
        public static create(properties?: folder_mcp.IDownloadDocRequest): folder_mcp.DownloadDocRequest;

        /**
         * Encodes the specified DownloadDocRequest message. Does not implicitly {@link folder_mcp.DownloadDocRequest.verify|verify} messages.
         * @param message DownloadDocRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IDownloadDocRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified DownloadDocRequest message, length delimited. Does not implicitly {@link folder_mcp.DownloadDocRequest.verify|verify} messages.
         * @param message DownloadDocRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IDownloadDocRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DownloadDocRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DownloadDocRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.DownloadDocRequest;

        /**
         * Decodes a DownloadDocRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns DownloadDocRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.DownloadDocRequest;

        /**
         * Verifies a DownloadDocRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a DownloadDocRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns DownloadDocRequest
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.DownloadDocRequest;

        /**
         * Creates a plain object from a DownloadDocRequest message. Also converts values to other types if specified.
         * @param message DownloadDocRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.DownloadDocRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this DownloadDocRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for DownloadDocRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a DownloadDocResponse. */
    interface IDownloadDocResponse {

        /** DownloadDocResponse chunkData */
        chunkData?: (Uint8Array|null);

        /** DownloadDocResponse contentType */
        contentType?: (string|null);

        /** DownloadDocResponse totalSize */
        totalSize?: (number|Long|null);

        /** DownloadDocResponse filename */
        filename?: (string|null);
    }

    /** Represents a DownloadDocResponse. */
    class DownloadDocResponse implements IDownloadDocResponse {

        /**
         * Constructs a new DownloadDocResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IDownloadDocResponse);

        /** DownloadDocResponse chunkData. */
        public chunkData: Uint8Array;

        /** DownloadDocResponse contentType. */
        public contentType: string;

        /** DownloadDocResponse totalSize. */
        public totalSize: (number|Long);

        /** DownloadDocResponse filename. */
        public filename: string;

        /**
         * Creates a new DownloadDocResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DownloadDocResponse instance
         */
        public static create(properties?: folder_mcp.IDownloadDocResponse): folder_mcp.DownloadDocResponse;

        /**
         * Encodes the specified DownloadDocResponse message. Does not implicitly {@link folder_mcp.DownloadDocResponse.verify|verify} messages.
         * @param message DownloadDocResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IDownloadDocResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified DownloadDocResponse message, length delimited. Does not implicitly {@link folder_mcp.DownloadDocResponse.verify|verify} messages.
         * @param message DownloadDocResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IDownloadDocResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DownloadDocResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DownloadDocResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.DownloadDocResponse;

        /**
         * Decodes a DownloadDocResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns DownloadDocResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.DownloadDocResponse;

        /**
         * Verifies a DownloadDocResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a DownloadDocResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns DownloadDocResponse
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.DownloadDocResponse;

        /**
         * Creates a plain object from a DownloadDocResponse message. Also converts values to other types if specified.
         * @param message DownloadDocResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.DownloadDocResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this DownloadDocResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for DownloadDocResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetChunksRequest. */
    interface IGetChunksRequest {

        /** GetChunksRequest documentId */
        documentId?: (string|null);

        /** GetChunksRequest chunkIndices */
        chunkIndices?: (number[]|null);

        /** GetChunksRequest includeMetadata */
        includeMetadata?: (boolean|null);

        /** GetChunksRequest maxTokensPerChunk */
        maxTokensPerChunk?: (number|null);
    }

    /** Represents a GetChunksRequest. */
    class GetChunksRequest implements IGetChunksRequest {

        /**
         * Constructs a new GetChunksRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IGetChunksRequest);

        /** GetChunksRequest documentId. */
        public documentId: string;

        /** GetChunksRequest chunkIndices. */
        public chunkIndices: number[];

        /** GetChunksRequest includeMetadata. */
        public includeMetadata: boolean;

        /** GetChunksRequest maxTokensPerChunk. */
        public maxTokensPerChunk: number;

        /**
         * Creates a new GetChunksRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetChunksRequest instance
         */
        public static create(properties?: folder_mcp.IGetChunksRequest): folder_mcp.GetChunksRequest;

        /**
         * Encodes the specified GetChunksRequest message. Does not implicitly {@link folder_mcp.GetChunksRequest.verify|verify} messages.
         * @param message GetChunksRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IGetChunksRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetChunksRequest message, length delimited. Does not implicitly {@link folder_mcp.GetChunksRequest.verify|verify} messages.
         * @param message GetChunksRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IGetChunksRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetChunksRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetChunksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.GetChunksRequest;

        /**
         * Decodes a GetChunksRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetChunksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.GetChunksRequest;

        /**
         * Verifies a GetChunksRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetChunksRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetChunksRequest
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.GetChunksRequest;

        /**
         * Creates a plain object from a GetChunksRequest message. Also converts values to other types if specified.
         * @param message GetChunksRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.GetChunksRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetChunksRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetChunksRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetChunksResponse. */
    interface IGetChunksResponse {

        /** GetChunksResponse chunks */
        chunks?: (folder_mcp.IChunkData[]|null);

        /** GetChunksResponse documentId */
        documentId?: (string|null);

        /** GetChunksResponse status */
        status?: (folder_mcp.IResponseStatus|null);

        /** GetChunksResponse totalTokenCount */
        totalTokenCount?: (number|null);
    }

    /** Represents a GetChunksResponse. */
    class GetChunksResponse implements IGetChunksResponse {

        /**
         * Constructs a new GetChunksResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IGetChunksResponse);

        /** GetChunksResponse chunks. */
        public chunks: folder_mcp.IChunkData[];

        /** GetChunksResponse documentId. */
        public documentId: string;

        /** GetChunksResponse status. */
        public status?: (folder_mcp.IResponseStatus|null);

        /** GetChunksResponse totalTokenCount. */
        public totalTokenCount: number;

        /**
         * Creates a new GetChunksResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetChunksResponse instance
         */
        public static create(properties?: folder_mcp.IGetChunksResponse): folder_mcp.GetChunksResponse;

        /**
         * Encodes the specified GetChunksResponse message. Does not implicitly {@link folder_mcp.GetChunksResponse.verify|verify} messages.
         * @param message GetChunksResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IGetChunksResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetChunksResponse message, length delimited. Does not implicitly {@link folder_mcp.GetChunksResponse.verify|verify} messages.
         * @param message GetChunksResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IGetChunksResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetChunksResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetChunksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.GetChunksResponse;

        /**
         * Decodes a GetChunksResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetChunksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.GetChunksResponse;

        /**
         * Verifies a GetChunksResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetChunksResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetChunksResponse
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.GetChunksResponse;

        /**
         * Creates a plain object from a GetChunksResponse message. Also converts values to other types if specified.
         * @param message GetChunksResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.GetChunksResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetChunksResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetChunksResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ChunkData. */
    interface IChunkData {

        /** ChunkData chunkId */
        chunkId?: (string|null);

        /** ChunkData chunkIndex */
        chunkIndex?: (number|null);

        /** ChunkData content */
        content?: (string|null);

        /** ChunkData startOffset */
        startOffset?: (number|null);

        /** ChunkData endOffset */
        endOffset?: (number|null);

        /** ChunkData tokenCount */
        tokenCount?: (number|null);

        /** ChunkData metadata */
        metadata?: (folder_mcp.IMetadata|null);
    }

    /** Represents a ChunkData. */
    class ChunkData implements IChunkData {

        /**
         * Constructs a new ChunkData.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IChunkData);

        /** ChunkData chunkId. */
        public chunkId: string;

        /** ChunkData chunkIndex. */
        public chunkIndex: number;

        /** ChunkData content. */
        public content: string;

        /** ChunkData startOffset. */
        public startOffset: number;

        /** ChunkData endOffset. */
        public endOffset: number;

        /** ChunkData tokenCount. */
        public tokenCount: number;

        /** ChunkData metadata. */
        public metadata?: (folder_mcp.IMetadata|null);

        /**
         * Creates a new ChunkData instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ChunkData instance
         */
        public static create(properties?: folder_mcp.IChunkData): folder_mcp.ChunkData;

        /**
         * Encodes the specified ChunkData message. Does not implicitly {@link folder_mcp.ChunkData.verify|verify} messages.
         * @param message ChunkData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IChunkData, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ChunkData message, length delimited. Does not implicitly {@link folder_mcp.ChunkData.verify|verify} messages.
         * @param message ChunkData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IChunkData, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ChunkData message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ChunkData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.ChunkData;

        /**
         * Decodes a ChunkData message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ChunkData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.ChunkData;

        /**
         * Verifies a ChunkData message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ChunkData message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ChunkData
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.ChunkData;

        /**
         * Creates a plain object from a ChunkData message. Also converts values to other types if specified.
         * @param message ChunkData
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.ChunkData, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ChunkData to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ChunkData
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetDocSummaryRequest. */
    interface IGetDocSummaryRequest {

        /** GetDocSummaryRequest documentId */
        documentId?: (string|null);

        /** GetDocSummaryRequest mode */
        mode?: (folder_mcp.SummaryMode|null);

        /** GetDocSummaryRequest focusAreas */
        focusAreas?: (string[]|null);

        /** GetDocSummaryRequest maxTokens */
        maxTokens?: (number|null);
    }

    /** Represents a GetDocSummaryRequest. */
    class GetDocSummaryRequest implements IGetDocSummaryRequest {

        /**
         * Constructs a new GetDocSummaryRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IGetDocSummaryRequest);

        /** GetDocSummaryRequest documentId. */
        public documentId: string;

        /** GetDocSummaryRequest mode. */
        public mode: folder_mcp.SummaryMode;

        /** GetDocSummaryRequest focusAreas. */
        public focusAreas: string[];

        /** GetDocSummaryRequest maxTokens. */
        public maxTokens: number;

        /**
         * Creates a new GetDocSummaryRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetDocSummaryRequest instance
         */
        public static create(properties?: folder_mcp.IGetDocSummaryRequest): folder_mcp.GetDocSummaryRequest;

        /**
         * Encodes the specified GetDocSummaryRequest message. Does not implicitly {@link folder_mcp.GetDocSummaryRequest.verify|verify} messages.
         * @param message GetDocSummaryRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IGetDocSummaryRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetDocSummaryRequest message, length delimited. Does not implicitly {@link folder_mcp.GetDocSummaryRequest.verify|verify} messages.
         * @param message GetDocSummaryRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IGetDocSummaryRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetDocSummaryRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetDocSummaryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.GetDocSummaryRequest;

        /**
         * Decodes a GetDocSummaryRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetDocSummaryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.GetDocSummaryRequest;

        /**
         * Verifies a GetDocSummaryRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetDocSummaryRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetDocSummaryRequest
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.GetDocSummaryRequest;

        /**
         * Creates a plain object from a GetDocSummaryRequest message. Also converts values to other types if specified.
         * @param message GetDocSummaryRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.GetDocSummaryRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetDocSummaryRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetDocSummaryRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetDocSummaryResponse. */
    interface IGetDocSummaryResponse {

        /** GetDocSummaryResponse summary */
        summary?: (string|null);

        /** GetDocSummaryResponse sourceRanges */
        sourceRanges?: (folder_mcp.ISourceRange[]|null);

        /** GetDocSummaryResponse mode */
        mode?: (folder_mcp.SummaryMode|null);

        /** GetDocSummaryResponse tokenCount */
        tokenCount?: (number|null);

        /** GetDocSummaryResponse confidenceScore */
        confidenceScore?: (number|null);

        /** GetDocSummaryResponse status */
        status?: (folder_mcp.IResponseStatus|null);
    }

    /** Represents a GetDocSummaryResponse. */
    class GetDocSummaryResponse implements IGetDocSummaryResponse {

        /**
         * Constructs a new GetDocSummaryResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IGetDocSummaryResponse);

        /** GetDocSummaryResponse summary. */
        public summary: string;

        /** GetDocSummaryResponse sourceRanges. */
        public sourceRanges: folder_mcp.ISourceRange[];

        /** GetDocSummaryResponse mode. */
        public mode: folder_mcp.SummaryMode;

        /** GetDocSummaryResponse tokenCount. */
        public tokenCount: number;

        /** GetDocSummaryResponse confidenceScore. */
        public confidenceScore: number;

        /** GetDocSummaryResponse status. */
        public status?: (folder_mcp.IResponseStatus|null);

        /**
         * Creates a new GetDocSummaryResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetDocSummaryResponse instance
         */
        public static create(properties?: folder_mcp.IGetDocSummaryResponse): folder_mcp.GetDocSummaryResponse;

        /**
         * Encodes the specified GetDocSummaryResponse message. Does not implicitly {@link folder_mcp.GetDocSummaryResponse.verify|verify} messages.
         * @param message GetDocSummaryResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IGetDocSummaryResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetDocSummaryResponse message, length delimited. Does not implicitly {@link folder_mcp.GetDocSummaryResponse.verify|verify} messages.
         * @param message GetDocSummaryResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IGetDocSummaryResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetDocSummaryResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetDocSummaryResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.GetDocSummaryResponse;

        /**
         * Decodes a GetDocSummaryResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetDocSummaryResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.GetDocSummaryResponse;

        /**
         * Verifies a GetDocSummaryResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetDocSummaryResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetDocSummaryResponse
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.GetDocSummaryResponse;

        /**
         * Creates a plain object from a GetDocSummaryResponse message. Also converts values to other types if specified.
         * @param message GetDocSummaryResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.GetDocSummaryResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetDocSummaryResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetDocSummaryResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SourceRange. */
    interface ISourceRange {

        /** SourceRange startOffset */
        startOffset?: (number|null);

        /** SourceRange endOffset */
        endOffset?: (number|null);

        /** SourceRange sourceText */
        sourceText?: (string|null);

        /** SourceRange pageNumber */
        pageNumber?: (number|null);

        /** SourceRange sectionTitle */
        sectionTitle?: (string|null);
    }

    /** Represents a SourceRange. */
    class SourceRange implements ISourceRange {

        /**
         * Constructs a new SourceRange.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.ISourceRange);

        /** SourceRange startOffset. */
        public startOffset: number;

        /** SourceRange endOffset. */
        public endOffset: number;

        /** SourceRange sourceText. */
        public sourceText: string;

        /** SourceRange pageNumber. */
        public pageNumber: number;

        /** SourceRange sectionTitle. */
        public sectionTitle: string;

        /**
         * Creates a new SourceRange instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SourceRange instance
         */
        public static create(properties?: folder_mcp.ISourceRange): folder_mcp.SourceRange;

        /**
         * Encodes the specified SourceRange message. Does not implicitly {@link folder_mcp.SourceRange.verify|verify} messages.
         * @param message SourceRange message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.ISourceRange, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SourceRange message, length delimited. Does not implicitly {@link folder_mcp.SourceRange.verify|verify} messages.
         * @param message SourceRange message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.ISourceRange, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SourceRange message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SourceRange
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.SourceRange;

        /**
         * Decodes a SourceRange message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SourceRange
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.SourceRange;

        /**
         * Verifies a SourceRange message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SourceRange message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SourceRange
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.SourceRange;

        /**
         * Creates a plain object from a SourceRange message. Also converts values to other types if specified.
         * @param message SourceRange
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.SourceRange, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SourceRange to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SourceRange
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a BatchDocSummaryRequest. */
    interface IBatchDocSummaryRequest {

        /** BatchDocSummaryRequest documentIds */
        documentIds?: (string[]|null);

        /** BatchDocSummaryRequest mode */
        mode?: (folder_mcp.SummaryMode|null);

        /** BatchDocSummaryRequest maxTotalTokens */
        maxTotalTokens?: (number|null);

        /** BatchDocSummaryRequest includeCrossReferences */
        includeCrossReferences?: (boolean|null);
    }

    /** Represents a BatchDocSummaryRequest. */
    class BatchDocSummaryRequest implements IBatchDocSummaryRequest {

        /**
         * Constructs a new BatchDocSummaryRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IBatchDocSummaryRequest);

        /** BatchDocSummaryRequest documentIds. */
        public documentIds: string[];

        /** BatchDocSummaryRequest mode. */
        public mode: folder_mcp.SummaryMode;

        /** BatchDocSummaryRequest maxTotalTokens. */
        public maxTotalTokens: number;

        /** BatchDocSummaryRequest includeCrossReferences. */
        public includeCrossReferences: boolean;

        /**
         * Creates a new BatchDocSummaryRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns BatchDocSummaryRequest instance
         */
        public static create(properties?: folder_mcp.IBatchDocSummaryRequest): folder_mcp.BatchDocSummaryRequest;

        /**
         * Encodes the specified BatchDocSummaryRequest message. Does not implicitly {@link folder_mcp.BatchDocSummaryRequest.verify|verify} messages.
         * @param message BatchDocSummaryRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IBatchDocSummaryRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified BatchDocSummaryRequest message, length delimited. Does not implicitly {@link folder_mcp.BatchDocSummaryRequest.verify|verify} messages.
         * @param message BatchDocSummaryRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IBatchDocSummaryRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a BatchDocSummaryRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BatchDocSummaryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.BatchDocSummaryRequest;

        /**
         * Decodes a BatchDocSummaryRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns BatchDocSummaryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.BatchDocSummaryRequest;

        /**
         * Verifies a BatchDocSummaryRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a BatchDocSummaryRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns BatchDocSummaryRequest
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.BatchDocSummaryRequest;

        /**
         * Creates a plain object from a BatchDocSummaryRequest message. Also converts values to other types if specified.
         * @param message BatchDocSummaryRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.BatchDocSummaryRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this BatchDocSummaryRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for BatchDocSummaryRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a BatchDocSummaryResponse. */
    interface IBatchDocSummaryResponse {

        /** BatchDocSummaryResponse summaries */
        summaries?: (folder_mcp.IDocumentSummary[]|null);

        /** BatchDocSummaryResponse totalTokens */
        totalTokens?: (number|null);

        /** BatchDocSummaryResponse crossReferences */
        crossReferences?: (folder_mcp.ICrossReference[]|null);

        /** BatchDocSummaryResponse status */
        status?: (folder_mcp.IResponseStatus|null);

        /** BatchDocSummaryResponse processingStats */
        processingStats?: (folder_mcp.IProcessingStats|null);
    }

    /** Represents a BatchDocSummaryResponse. */
    class BatchDocSummaryResponse implements IBatchDocSummaryResponse {

        /**
         * Constructs a new BatchDocSummaryResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IBatchDocSummaryResponse);

        /** BatchDocSummaryResponse summaries. */
        public summaries: folder_mcp.IDocumentSummary[];

        /** BatchDocSummaryResponse totalTokens. */
        public totalTokens: number;

        /** BatchDocSummaryResponse crossReferences. */
        public crossReferences: folder_mcp.ICrossReference[];

        /** BatchDocSummaryResponse status. */
        public status?: (folder_mcp.IResponseStatus|null);

        /** BatchDocSummaryResponse processingStats. */
        public processingStats?: (folder_mcp.IProcessingStats|null);

        /**
         * Creates a new BatchDocSummaryResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns BatchDocSummaryResponse instance
         */
        public static create(properties?: folder_mcp.IBatchDocSummaryResponse): folder_mcp.BatchDocSummaryResponse;

        /**
         * Encodes the specified BatchDocSummaryResponse message. Does not implicitly {@link folder_mcp.BatchDocSummaryResponse.verify|verify} messages.
         * @param message BatchDocSummaryResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IBatchDocSummaryResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified BatchDocSummaryResponse message, length delimited. Does not implicitly {@link folder_mcp.BatchDocSummaryResponse.verify|verify} messages.
         * @param message BatchDocSummaryResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IBatchDocSummaryResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a BatchDocSummaryResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BatchDocSummaryResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.BatchDocSummaryResponse;

        /**
         * Decodes a BatchDocSummaryResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns BatchDocSummaryResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.BatchDocSummaryResponse;

        /**
         * Verifies a BatchDocSummaryResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a BatchDocSummaryResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns BatchDocSummaryResponse
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.BatchDocSummaryResponse;

        /**
         * Creates a plain object from a BatchDocSummaryResponse message. Also converts values to other types if specified.
         * @param message BatchDocSummaryResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.BatchDocSummaryResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this BatchDocSummaryResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for BatchDocSummaryResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a DocumentSummary. */
    interface IDocumentSummary {

        /** DocumentSummary documentId */
        documentId?: (string|null);

        /** DocumentSummary summary */
        summary?: (string|null);

        /** DocumentSummary tokenCount */
        tokenCount?: (number|null);

        /** DocumentSummary sourceRanges */
        sourceRanges?: (folder_mcp.ISourceRange[]|null);
    }

    /** Represents a DocumentSummary. */
    class DocumentSummary implements IDocumentSummary {

        /**
         * Constructs a new DocumentSummary.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IDocumentSummary);

        /** DocumentSummary documentId. */
        public documentId: string;

        /** DocumentSummary summary. */
        public summary: string;

        /** DocumentSummary tokenCount. */
        public tokenCount: number;

        /** DocumentSummary sourceRanges. */
        public sourceRanges: folder_mcp.ISourceRange[];

        /**
         * Creates a new DocumentSummary instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DocumentSummary instance
         */
        public static create(properties?: folder_mcp.IDocumentSummary): folder_mcp.DocumentSummary;

        /**
         * Encodes the specified DocumentSummary message. Does not implicitly {@link folder_mcp.DocumentSummary.verify|verify} messages.
         * @param message DocumentSummary message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IDocumentSummary, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified DocumentSummary message, length delimited. Does not implicitly {@link folder_mcp.DocumentSummary.verify|verify} messages.
         * @param message DocumentSummary message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IDocumentSummary, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DocumentSummary message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DocumentSummary
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.DocumentSummary;

        /**
         * Decodes a DocumentSummary message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns DocumentSummary
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.DocumentSummary;

        /**
         * Verifies a DocumentSummary message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a DocumentSummary message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns DocumentSummary
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.DocumentSummary;

        /**
         * Creates a plain object from a DocumentSummary message. Also converts values to other types if specified.
         * @param message DocumentSummary
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.DocumentSummary, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this DocumentSummary to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for DocumentSummary
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a CrossReference. */
    interface ICrossReference {

        /** CrossReference sourceDocumentId */
        sourceDocumentId?: (string|null);

        /** CrossReference targetDocumentId */
        targetDocumentId?: (string|null);

        /** CrossReference relationship */
        relationship?: (string|null);

        /** CrossReference confidence */
        confidence?: (number|null);
    }

    /** Represents a CrossReference. */
    class CrossReference implements ICrossReference {

        /**
         * Constructs a new CrossReference.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.ICrossReference);

        /** CrossReference sourceDocumentId. */
        public sourceDocumentId: string;

        /** CrossReference targetDocumentId. */
        public targetDocumentId: string;

        /** CrossReference relationship. */
        public relationship: string;

        /** CrossReference confidence. */
        public confidence: number;

        /**
         * Creates a new CrossReference instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CrossReference instance
         */
        public static create(properties?: folder_mcp.ICrossReference): folder_mcp.CrossReference;

        /**
         * Encodes the specified CrossReference message. Does not implicitly {@link folder_mcp.CrossReference.verify|verify} messages.
         * @param message CrossReference message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.ICrossReference, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified CrossReference message, length delimited. Does not implicitly {@link folder_mcp.CrossReference.verify|verify} messages.
         * @param message CrossReference message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.ICrossReference, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CrossReference message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CrossReference
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.CrossReference;

        /**
         * Decodes a CrossReference message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns CrossReference
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.CrossReference;

        /**
         * Verifies a CrossReference message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a CrossReference message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CrossReference
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.CrossReference;

        /**
         * Creates a plain object from a CrossReference message. Also converts values to other types if specified.
         * @param message CrossReference
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.CrossReference, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CrossReference to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for CrossReference
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a TableQueryRequest. */
    interface ITableQueryRequest {

        /** TableQueryRequest query */
        query?: (string|null);

        /** TableQueryRequest documentIds */
        documentIds?: (string[]|null);

        /** TableQueryRequest sheetNames */
        sheetNames?: (string[]|null);

        /** TableQueryRequest cellRange */
        cellRange?: (string|null);

        /** TableQueryRequest maxResults */
        maxResults?: (number|null);
    }

    /** Represents a TableQueryRequest. */
    class TableQueryRequest implements ITableQueryRequest {

        /**
         * Constructs a new TableQueryRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.ITableQueryRequest);

        /** TableQueryRequest query. */
        public query: string;

        /** TableQueryRequest documentIds. */
        public documentIds: string[];

        /** TableQueryRequest sheetNames. */
        public sheetNames: string[];

        /** TableQueryRequest cellRange. */
        public cellRange: string;

        /** TableQueryRequest maxResults. */
        public maxResults: number;

        /**
         * Creates a new TableQueryRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TableQueryRequest instance
         */
        public static create(properties?: folder_mcp.ITableQueryRequest): folder_mcp.TableQueryRequest;

        /**
         * Encodes the specified TableQueryRequest message. Does not implicitly {@link folder_mcp.TableQueryRequest.verify|verify} messages.
         * @param message TableQueryRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.ITableQueryRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TableQueryRequest message, length delimited. Does not implicitly {@link folder_mcp.TableQueryRequest.verify|verify} messages.
         * @param message TableQueryRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.ITableQueryRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TableQueryRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TableQueryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.TableQueryRequest;

        /**
         * Decodes a TableQueryRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TableQueryRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.TableQueryRequest;

        /**
         * Verifies a TableQueryRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TableQueryRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TableQueryRequest
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.TableQueryRequest;

        /**
         * Creates a plain object from a TableQueryRequest message. Also converts values to other types if specified.
         * @param message TableQueryRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.TableQueryRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TableQueryRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TableQueryRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a TableQueryResponse. */
    interface ITableQueryResponse {

        /** TableQueryResponse matches */
        matches?: (folder_mcp.ICellMatch[]|null);

        /** TableQueryResponse tables */
        tables?: (folder_mcp.ITableStructure[]|null);

        /** TableQueryResponse queryInterpretation */
        queryInterpretation?: (string|null);

        /** TableQueryResponse status */
        status?: (folder_mcp.IResponseStatus|null);

        /** TableQueryResponse pagination */
        pagination?: (folder_mcp.IPaginationInfo|null);
    }

    /** Represents a TableQueryResponse. */
    class TableQueryResponse implements ITableQueryResponse {

        /**
         * Constructs a new TableQueryResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.ITableQueryResponse);

        /** TableQueryResponse matches. */
        public matches: folder_mcp.ICellMatch[];

        /** TableQueryResponse tables. */
        public tables: folder_mcp.ITableStructure[];

        /** TableQueryResponse queryInterpretation. */
        public queryInterpretation: string;

        /** TableQueryResponse status. */
        public status?: (folder_mcp.IResponseStatus|null);

        /** TableQueryResponse pagination. */
        public pagination?: (folder_mcp.IPaginationInfo|null);

        /**
         * Creates a new TableQueryResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TableQueryResponse instance
         */
        public static create(properties?: folder_mcp.ITableQueryResponse): folder_mcp.TableQueryResponse;

        /**
         * Encodes the specified TableQueryResponse message. Does not implicitly {@link folder_mcp.TableQueryResponse.verify|verify} messages.
         * @param message TableQueryResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.ITableQueryResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TableQueryResponse message, length delimited. Does not implicitly {@link folder_mcp.TableQueryResponse.verify|verify} messages.
         * @param message TableQueryResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.ITableQueryResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TableQueryResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TableQueryResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.TableQueryResponse;

        /**
         * Decodes a TableQueryResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TableQueryResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.TableQueryResponse;

        /**
         * Verifies a TableQueryResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TableQueryResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TableQueryResponse
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.TableQueryResponse;

        /**
         * Creates a plain object from a TableQueryResponse message. Also converts values to other types if specified.
         * @param message TableQueryResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.TableQueryResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TableQueryResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TableQueryResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a CellMatch. */
    interface ICellMatch {

        /** CellMatch documentId */
        documentId?: (string|null);

        /** CellMatch sheetName */
        sheetName?: (string|null);

        /** CellMatch cell */
        cell?: (folder_mcp.ICell|null);

        /** CellMatch relevanceScore */
        relevanceScore?: (number|null);

        /** CellMatch context */
        context?: (string|null);
    }

    /** Represents a CellMatch. */
    class CellMatch implements ICellMatch {

        /**
         * Constructs a new CellMatch.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.ICellMatch);

        /** CellMatch documentId. */
        public documentId: string;

        /** CellMatch sheetName. */
        public sheetName: string;

        /** CellMatch cell. */
        public cell?: (folder_mcp.ICell|null);

        /** CellMatch relevanceScore. */
        public relevanceScore: number;

        /** CellMatch context. */
        public context: string;

        /**
         * Creates a new CellMatch instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CellMatch instance
         */
        public static create(properties?: folder_mcp.ICellMatch): folder_mcp.CellMatch;

        /**
         * Encodes the specified CellMatch message. Does not implicitly {@link folder_mcp.CellMatch.verify|verify} messages.
         * @param message CellMatch message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.ICellMatch, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified CellMatch message, length delimited. Does not implicitly {@link folder_mcp.CellMatch.verify|verify} messages.
         * @param message CellMatch message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.ICellMatch, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CellMatch message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CellMatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.CellMatch;

        /**
         * Decodes a CellMatch message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns CellMatch
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.CellMatch;

        /**
         * Verifies a CellMatch message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a CellMatch message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CellMatch
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.CellMatch;

        /**
         * Creates a plain object from a CellMatch message. Also converts values to other types if specified.
         * @param message CellMatch
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.CellMatch, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CellMatch to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for CellMatch
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a TableStructure. */
    interface ITableStructure {

        /** TableStructure documentId */
        documentId?: (string|null);

        /** TableStructure sheetName */
        sheetName?: (string|null);

        /** TableStructure headers */
        headers?: (string[]|null);

        /** TableStructure rowCount */
        rowCount?: (number|null);

        /** TableStructure columnCount */
        columnCount?: (number|null);
    }

    /** Represents a TableStructure. */
    class TableStructure implements ITableStructure {

        /**
         * Constructs a new TableStructure.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.ITableStructure);

        /** TableStructure documentId. */
        public documentId: string;

        /** TableStructure sheetName. */
        public sheetName: string;

        /** TableStructure headers. */
        public headers: string[];

        /** TableStructure rowCount. */
        public rowCount: number;

        /** TableStructure columnCount. */
        public columnCount: number;

        /**
         * Creates a new TableStructure instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TableStructure instance
         */
        public static create(properties?: folder_mcp.ITableStructure): folder_mcp.TableStructure;

        /**
         * Encodes the specified TableStructure message. Does not implicitly {@link folder_mcp.TableStructure.verify|verify} messages.
         * @param message TableStructure message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.ITableStructure, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TableStructure message, length delimited. Does not implicitly {@link folder_mcp.TableStructure.verify|verify} messages.
         * @param message TableStructure message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.ITableStructure, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TableStructure message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TableStructure
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.TableStructure;

        /**
         * Decodes a TableStructure message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TableStructure
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.TableStructure;

        /**
         * Verifies a TableStructure message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TableStructure message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TableStructure
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.TableStructure;

        /**
         * Creates a plain object from a TableStructure message. Also converts values to other types if specified.
         * @param message TableStructure
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.TableStructure, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TableStructure to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TableStructure
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an IngestStatusRequest. */
    interface IIngestStatusRequest {

        /** IngestStatusRequest documentIds */
        documentIds?: (string[]|null);

        /** IngestStatusRequest includeErrorDetails */
        includeErrorDetails?: (boolean|null);
    }

    /** Represents an IngestStatusRequest. */
    class IngestStatusRequest implements IIngestStatusRequest {

        /**
         * Constructs a new IngestStatusRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IIngestStatusRequest);

        /** IngestStatusRequest documentIds. */
        public documentIds: string[];

        /** IngestStatusRequest includeErrorDetails. */
        public includeErrorDetails: boolean;

        /**
         * Creates a new IngestStatusRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns IngestStatusRequest instance
         */
        public static create(properties?: folder_mcp.IIngestStatusRequest): folder_mcp.IngestStatusRequest;

        /**
         * Encodes the specified IngestStatusRequest message. Does not implicitly {@link folder_mcp.IngestStatusRequest.verify|verify} messages.
         * @param message IngestStatusRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IIngestStatusRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified IngestStatusRequest message, length delimited. Does not implicitly {@link folder_mcp.IngestStatusRequest.verify|verify} messages.
         * @param message IngestStatusRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IIngestStatusRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an IngestStatusRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns IngestStatusRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.IngestStatusRequest;

        /**
         * Decodes an IngestStatusRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns IngestStatusRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.IngestStatusRequest;

        /**
         * Verifies an IngestStatusRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an IngestStatusRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns IngestStatusRequest
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.IngestStatusRequest;

        /**
         * Creates a plain object from an IngestStatusRequest message. Also converts values to other types if specified.
         * @param message IngestStatusRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.IngestStatusRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this IngestStatusRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for IngestStatusRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an IngestStatusResponse. */
    interface IIngestStatusResponse {

        /** IngestStatusResponse documents */
        documents?: (folder_mcp.IDocumentStatus[]|null);

        /** IngestStatusResponse overall */
        overall?: (folder_mcp.IOverallStatus|null);

        /** IngestStatusResponse status */
        status?: (folder_mcp.IResponseStatus|null);
    }

    /** Represents an IngestStatusResponse. */
    class IngestStatusResponse implements IIngestStatusResponse {

        /**
         * Constructs a new IngestStatusResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IIngestStatusResponse);

        /** IngestStatusResponse documents. */
        public documents: folder_mcp.IDocumentStatus[];

        /** IngestStatusResponse overall. */
        public overall?: (folder_mcp.IOverallStatus|null);

        /** IngestStatusResponse status. */
        public status?: (folder_mcp.IResponseStatus|null);

        /**
         * Creates a new IngestStatusResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns IngestStatusResponse instance
         */
        public static create(properties?: folder_mcp.IIngestStatusResponse): folder_mcp.IngestStatusResponse;

        /**
         * Encodes the specified IngestStatusResponse message. Does not implicitly {@link folder_mcp.IngestStatusResponse.verify|verify} messages.
         * @param message IngestStatusResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IIngestStatusResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified IngestStatusResponse message, length delimited. Does not implicitly {@link folder_mcp.IngestStatusResponse.verify|verify} messages.
         * @param message IngestStatusResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IIngestStatusResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an IngestStatusResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns IngestStatusResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.IngestStatusResponse;

        /**
         * Decodes an IngestStatusResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns IngestStatusResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.IngestStatusResponse;

        /**
         * Verifies an IngestStatusResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an IngestStatusResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns IngestStatusResponse
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.IngestStatusResponse;

        /**
         * Creates a plain object from an IngestStatusResponse message. Also converts values to other types if specified.
         * @param message IngestStatusResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.IngestStatusResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this IngestStatusResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for IngestStatusResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a DocumentStatus. */
    interface IDocumentStatus {

        /** DocumentStatus documentId */
        documentId?: (string|null);

        /** DocumentStatus filePath */
        filePath?: (string|null);

        /** DocumentStatus status */
        status?: (folder_mcp.IngestStatus|null);

        /** DocumentStatus progress */
        progress?: (folder_mcp.IProgress|null);

        /** DocumentStatus lastUpdated */
        lastUpdated?: (string|null);

        /** DocumentStatus errors */
        errors?: (folder_mcp.IErrorDetail[]|null);

        /** DocumentStatus stats */
        stats?: (folder_mcp.IProcessingStats|null);
    }

    /** Represents a DocumentStatus. */
    class DocumentStatus implements IDocumentStatus {

        /**
         * Constructs a new DocumentStatus.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IDocumentStatus);

        /** DocumentStatus documentId. */
        public documentId: string;

        /** DocumentStatus filePath. */
        public filePath: string;

        /** DocumentStatus status. */
        public status: folder_mcp.IngestStatus;

        /** DocumentStatus progress. */
        public progress?: (folder_mcp.IProgress|null);

        /** DocumentStatus lastUpdated. */
        public lastUpdated: string;

        /** DocumentStatus errors. */
        public errors: folder_mcp.IErrorDetail[];

        /** DocumentStatus stats. */
        public stats?: (folder_mcp.IProcessingStats|null);

        /**
         * Creates a new DocumentStatus instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DocumentStatus instance
         */
        public static create(properties?: folder_mcp.IDocumentStatus): folder_mcp.DocumentStatus;

        /**
         * Encodes the specified DocumentStatus message. Does not implicitly {@link folder_mcp.DocumentStatus.verify|verify} messages.
         * @param message DocumentStatus message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IDocumentStatus, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified DocumentStatus message, length delimited. Does not implicitly {@link folder_mcp.DocumentStatus.verify|verify} messages.
         * @param message DocumentStatus message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IDocumentStatus, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DocumentStatus message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DocumentStatus
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.DocumentStatus;

        /**
         * Decodes a DocumentStatus message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns DocumentStatus
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.DocumentStatus;

        /**
         * Verifies a DocumentStatus message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a DocumentStatus message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns DocumentStatus
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.DocumentStatus;

        /**
         * Creates a plain object from a DocumentStatus message. Also converts values to other types if specified.
         * @param message DocumentStatus
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.DocumentStatus, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this DocumentStatus to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for DocumentStatus
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ProcessingStats. */
    interface IProcessingStats {

        /** ProcessingStats chunksCreated */
        chunksCreated?: (number|null);

        /** ProcessingStats embeddingsGenerated */
        embeddingsGenerated?: (number|null);

        /** ProcessingStats processingTimeMs */
        processingTimeMs?: (number|Long|null);
    }

    /** Represents a ProcessingStats. */
    class ProcessingStats implements IProcessingStats {

        /**
         * Constructs a new ProcessingStats.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IProcessingStats);

        /** ProcessingStats chunksCreated. */
        public chunksCreated: number;

        /** ProcessingStats embeddingsGenerated. */
        public embeddingsGenerated: number;

        /** ProcessingStats processingTimeMs. */
        public processingTimeMs: (number|Long);

        /**
         * Creates a new ProcessingStats instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ProcessingStats instance
         */
        public static create(properties?: folder_mcp.IProcessingStats): folder_mcp.ProcessingStats;

        /**
         * Encodes the specified ProcessingStats message. Does not implicitly {@link folder_mcp.ProcessingStats.verify|verify} messages.
         * @param message ProcessingStats message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IProcessingStats, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ProcessingStats message, length delimited. Does not implicitly {@link folder_mcp.ProcessingStats.verify|verify} messages.
         * @param message ProcessingStats message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IProcessingStats, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ProcessingStats message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ProcessingStats
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.ProcessingStats;

        /**
         * Decodes a ProcessingStats message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ProcessingStats
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.ProcessingStats;

        /**
         * Verifies a ProcessingStats message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ProcessingStats message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ProcessingStats
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.ProcessingStats;

        /**
         * Creates a plain object from a ProcessingStats message. Also converts values to other types if specified.
         * @param message ProcessingStats
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.ProcessingStats, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ProcessingStats to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ProcessingStats
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an OverallStatus. */
    interface IOverallStatus {

        /** OverallStatus totalDocuments */
        totalDocuments?: (number|null);

        /** OverallStatus completedDocuments */
        completedDocuments?: (number|null);

        /** OverallStatus pendingDocuments */
        pendingDocuments?: (number|null);

        /** OverallStatus errorDocuments */
        errorDocuments?: (number|null);

        /** OverallStatus overallProgress */
        overallProgress?: (number|null);
    }

    /** Represents an OverallStatus. */
    class OverallStatus implements IOverallStatus {

        /**
         * Constructs a new OverallStatus.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IOverallStatus);

        /** OverallStatus totalDocuments. */
        public totalDocuments: number;

        /** OverallStatus completedDocuments. */
        public completedDocuments: number;

        /** OverallStatus pendingDocuments. */
        public pendingDocuments: number;

        /** OverallStatus errorDocuments. */
        public errorDocuments: number;

        /** OverallStatus overallProgress. */
        public overallProgress: number;

        /**
         * Creates a new OverallStatus instance using the specified properties.
         * @param [properties] Properties to set
         * @returns OverallStatus instance
         */
        public static create(properties?: folder_mcp.IOverallStatus): folder_mcp.OverallStatus;

        /**
         * Encodes the specified OverallStatus message. Does not implicitly {@link folder_mcp.OverallStatus.verify|verify} messages.
         * @param message OverallStatus message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IOverallStatus, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified OverallStatus message, length delimited. Does not implicitly {@link folder_mcp.OverallStatus.verify|verify} messages.
         * @param message OverallStatus message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IOverallStatus, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an OverallStatus message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns OverallStatus
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.OverallStatus;

        /**
         * Decodes an OverallStatus message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns OverallStatus
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.OverallStatus;

        /**
         * Verifies an OverallStatus message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an OverallStatus message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns OverallStatus
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.OverallStatus;

        /**
         * Creates a plain object from an OverallStatus message. Also converts values to other types if specified.
         * @param message OverallStatus
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.OverallStatus, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this OverallStatus to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for OverallStatus
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a RefreshDocRequest. */
    interface IRefreshDocRequest {

        /** RefreshDocRequest documentIds */
        documentIds?: (string[]|null);

        /** RefreshDocRequest forceReprocess */
        forceReprocess?: (boolean|null);

        /** RefreshDocRequest priority */
        priority?: (folder_mcp.Priority|null);
    }

    /** Represents a RefreshDocRequest. */
    class RefreshDocRequest implements IRefreshDocRequest {

        /**
         * Constructs a new RefreshDocRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IRefreshDocRequest);

        /** RefreshDocRequest documentIds. */
        public documentIds: string[];

        /** RefreshDocRequest forceReprocess. */
        public forceReprocess: boolean;

        /** RefreshDocRequest priority. */
        public priority: folder_mcp.Priority;

        /**
         * Creates a new RefreshDocRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RefreshDocRequest instance
         */
        public static create(properties?: folder_mcp.IRefreshDocRequest): folder_mcp.RefreshDocRequest;

        /**
         * Encodes the specified RefreshDocRequest message. Does not implicitly {@link folder_mcp.RefreshDocRequest.verify|verify} messages.
         * @param message RefreshDocRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IRefreshDocRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified RefreshDocRequest message, length delimited. Does not implicitly {@link folder_mcp.RefreshDocRequest.verify|verify} messages.
         * @param message RefreshDocRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IRefreshDocRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a RefreshDocRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RefreshDocRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.RefreshDocRequest;

        /**
         * Decodes a RefreshDocRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns RefreshDocRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.RefreshDocRequest;

        /**
         * Verifies a RefreshDocRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a RefreshDocRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns RefreshDocRequest
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.RefreshDocRequest;

        /**
         * Creates a plain object from a RefreshDocRequest message. Also converts values to other types if specified.
         * @param message RefreshDocRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.RefreshDocRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this RefreshDocRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for RefreshDocRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a RefreshDocResponse. */
    interface IRefreshDocResponse {

        /** RefreshDocResponse jobId */
        jobId?: (string|null);

        /** RefreshDocResponse queuedDocumentIds */
        queuedDocumentIds?: (string[]|null);

        /** RefreshDocResponse estimatedCompletion */
        estimatedCompletion?: (string|null);
    }

    /** Represents a RefreshDocResponse. */
    class RefreshDocResponse implements IRefreshDocResponse {

        /**
         * Constructs a new RefreshDocResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IRefreshDocResponse);

        /** RefreshDocResponse jobId. */
        public jobId: string;

        /** RefreshDocResponse queuedDocumentIds. */
        public queuedDocumentIds: string[];

        /** RefreshDocResponse estimatedCompletion. */
        public estimatedCompletion: string;

        /**
         * Creates a new RefreshDocResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RefreshDocResponse instance
         */
        public static create(properties?: folder_mcp.IRefreshDocResponse): folder_mcp.RefreshDocResponse;

        /**
         * Encodes the specified RefreshDocResponse message. Does not implicitly {@link folder_mcp.RefreshDocResponse.verify|verify} messages.
         * @param message RefreshDocResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IRefreshDocResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified RefreshDocResponse message, length delimited. Does not implicitly {@link folder_mcp.RefreshDocResponse.verify|verify} messages.
         * @param message RefreshDocResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IRefreshDocResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a RefreshDocResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RefreshDocResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.RefreshDocResponse;

        /**
         * Decodes a RefreshDocResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns RefreshDocResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.RefreshDocResponse;

        /**
         * Verifies a RefreshDocResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a RefreshDocResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns RefreshDocResponse
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.RefreshDocResponse;

        /**
         * Creates a plain object from a RefreshDocResponse message. Also converts values to other types if specified.
         * @param message RefreshDocResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.RefreshDocResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this RefreshDocResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for RefreshDocResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetEmbeddingRequest. */
    interface IGetEmbeddingRequest {

        /** GetEmbeddingRequest documentIds */
        documentIds?: (string[]|null);

        /** GetEmbeddingRequest chunkIds */
        chunkIds?: (string[]|null);

        /** GetEmbeddingRequest format */
        format?: (string|null);
    }

    /** Represents a GetEmbeddingRequest. */
    class GetEmbeddingRequest implements IGetEmbeddingRequest {

        /**
         * Constructs a new GetEmbeddingRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IGetEmbeddingRequest);

        /** GetEmbeddingRequest documentIds. */
        public documentIds: string[];

        /** GetEmbeddingRequest chunkIds. */
        public chunkIds: string[];

        /** GetEmbeddingRequest format. */
        public format: string;

        /**
         * Creates a new GetEmbeddingRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetEmbeddingRequest instance
         */
        public static create(properties?: folder_mcp.IGetEmbeddingRequest): folder_mcp.GetEmbeddingRequest;

        /**
         * Encodes the specified GetEmbeddingRequest message. Does not implicitly {@link folder_mcp.GetEmbeddingRequest.verify|verify} messages.
         * @param message GetEmbeddingRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IGetEmbeddingRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetEmbeddingRequest message, length delimited. Does not implicitly {@link folder_mcp.GetEmbeddingRequest.verify|verify} messages.
         * @param message GetEmbeddingRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IGetEmbeddingRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetEmbeddingRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetEmbeddingRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.GetEmbeddingRequest;

        /**
         * Decodes a GetEmbeddingRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetEmbeddingRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.GetEmbeddingRequest;

        /**
         * Verifies a GetEmbeddingRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetEmbeddingRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetEmbeddingRequest
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.GetEmbeddingRequest;

        /**
         * Creates a plain object from a GetEmbeddingRequest message. Also converts values to other types if specified.
         * @param message GetEmbeddingRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.GetEmbeddingRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetEmbeddingRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetEmbeddingRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetEmbeddingResponse. */
    interface IGetEmbeddingResponse {

        /** GetEmbeddingResponse vectors */
        vectors?: (folder_mcp.IEmbeddingVector[]|null);

        /** GetEmbeddingResponse vectorDimension */
        vectorDimension?: (number|null);

        /** GetEmbeddingResponse modelName */
        modelName?: (string|null);

        /** GetEmbeddingResponse modelVersion */
        modelVersion?: (string|null);

        /** GetEmbeddingResponse status */
        status?: (folder_mcp.IResponseStatus|null);
    }

    /** Represents a GetEmbeddingResponse. */
    class GetEmbeddingResponse implements IGetEmbeddingResponse {

        /**
         * Constructs a new GetEmbeddingResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IGetEmbeddingResponse);

        /** GetEmbeddingResponse vectors. */
        public vectors: folder_mcp.IEmbeddingVector[];

        /** GetEmbeddingResponse vectorDimension. */
        public vectorDimension: number;

        /** GetEmbeddingResponse modelName. */
        public modelName: string;

        /** GetEmbeddingResponse modelVersion. */
        public modelVersion: string;

        /** GetEmbeddingResponse status. */
        public status?: (folder_mcp.IResponseStatus|null);

        /**
         * Creates a new GetEmbeddingResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetEmbeddingResponse instance
         */
        public static create(properties?: folder_mcp.IGetEmbeddingResponse): folder_mcp.GetEmbeddingResponse;

        /**
         * Encodes the specified GetEmbeddingResponse message. Does not implicitly {@link folder_mcp.GetEmbeddingResponse.verify|verify} messages.
         * @param message GetEmbeddingResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IGetEmbeddingResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetEmbeddingResponse message, length delimited. Does not implicitly {@link folder_mcp.GetEmbeddingResponse.verify|verify} messages.
         * @param message GetEmbeddingResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IGetEmbeddingResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetEmbeddingResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetEmbeddingResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.GetEmbeddingResponse;

        /**
         * Decodes a GetEmbeddingResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetEmbeddingResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.GetEmbeddingResponse;

        /**
         * Verifies a GetEmbeddingResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetEmbeddingResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetEmbeddingResponse
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.GetEmbeddingResponse;

        /**
         * Creates a plain object from a GetEmbeddingResponse message. Also converts values to other types if specified.
         * @param message GetEmbeddingResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.GetEmbeddingResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetEmbeddingResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetEmbeddingResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an EmbeddingVector. */
    interface IEmbeddingVector {

        /** EmbeddingVector id */
        id?: (string|null);

        /** EmbeddingVector embedding */
        embedding?: (folder_mcp.IEmbedding|null);

        /** EmbeddingVector sourceType */
        sourceType?: (string|null);
    }

    /** Represents an EmbeddingVector. */
    class EmbeddingVector implements IEmbeddingVector {

        /**
         * Constructs a new EmbeddingVector.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IEmbeddingVector);

        /** EmbeddingVector id. */
        public id: string;

        /** EmbeddingVector embedding. */
        public embedding?: (folder_mcp.IEmbedding|null);

        /** EmbeddingVector sourceType. */
        public sourceType: string;

        /**
         * Creates a new EmbeddingVector instance using the specified properties.
         * @param [properties] Properties to set
         * @returns EmbeddingVector instance
         */
        public static create(properties?: folder_mcp.IEmbeddingVector): folder_mcp.EmbeddingVector;

        /**
         * Encodes the specified EmbeddingVector message. Does not implicitly {@link folder_mcp.EmbeddingVector.verify|verify} messages.
         * @param message EmbeddingVector message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IEmbeddingVector, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified EmbeddingVector message, length delimited. Does not implicitly {@link folder_mcp.EmbeddingVector.verify|verify} messages.
         * @param message EmbeddingVector message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IEmbeddingVector, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an EmbeddingVector message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns EmbeddingVector
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.EmbeddingVector;

        /**
         * Decodes an EmbeddingVector message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns EmbeddingVector
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.EmbeddingVector;

        /**
         * Verifies an EmbeddingVector message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an EmbeddingVector message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns EmbeddingVector
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.EmbeddingVector;

        /**
         * Creates a plain object from an EmbeddingVector message. Also converts values to other types if specified.
         * @param message EmbeddingVector
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.EmbeddingVector, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this EmbeddingVector to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for EmbeddingVector
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PaginationInfo. */
    interface IPaginationInfo {

        /** PaginationInfo page */
        page?: (number|null);

        /** PaginationInfo perPage */
        perPage?: (number|null);

        /** PaginationInfo totalCount */
        totalCount?: (number|null);

        /** PaginationInfo totalPages */
        totalPages?: (number|null);

        /** PaginationInfo hasNext */
        hasNext?: (boolean|null);

        /** PaginationInfo hasPrevious */
        hasPrevious?: (boolean|null);
    }

    /** Represents a PaginationInfo. */
    class PaginationInfo implements IPaginationInfo {

        /**
         * Constructs a new PaginationInfo.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IPaginationInfo);

        /** PaginationInfo page. */
        public page: number;

        /** PaginationInfo perPage. */
        public perPage: number;

        /** PaginationInfo totalCount. */
        public totalCount: number;

        /** PaginationInfo totalPages. */
        public totalPages: number;

        /** PaginationInfo hasNext. */
        public hasNext: boolean;

        /** PaginationInfo hasPrevious. */
        public hasPrevious: boolean;

        /**
         * Creates a new PaginationInfo instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PaginationInfo instance
         */
        public static create(properties?: folder_mcp.IPaginationInfo): folder_mcp.PaginationInfo;

        /**
         * Encodes the specified PaginationInfo message. Does not implicitly {@link folder_mcp.PaginationInfo.verify|verify} messages.
         * @param message PaginationInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IPaginationInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PaginationInfo message, length delimited. Does not implicitly {@link folder_mcp.PaginationInfo.verify|verify} messages.
         * @param message PaginationInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IPaginationInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PaginationInfo message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PaginationInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.PaginationInfo;

        /**
         * Decodes a PaginationInfo message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PaginationInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.PaginationInfo;

        /**
         * Verifies a PaginationInfo message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PaginationInfo message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PaginationInfo
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.PaginationInfo;

        /**
         * Creates a plain object from a PaginationInfo message. Also converts values to other types if specified.
         * @param message PaginationInfo
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.PaginationInfo, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PaginationInfo to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PaginationInfo
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Metadata. */
    interface IMetadata {

        /** Metadata stringValues */
        stringValues?: ({ [k: string]: string }|null);

        /** Metadata intValues */
        intValues?: ({ [k: string]: (number|Long) }|null);

        /** Metadata floatValues */
        floatValues?: ({ [k: string]: number }|null);

        /** Metadata boolValues */
        boolValues?: ({ [k: string]: boolean }|null);

        /** Metadata binaryValues */
        binaryValues?: ({ [k: string]: Uint8Array }|null);
    }

    /** Represents a Metadata. */
    class Metadata implements IMetadata {

        /**
         * Constructs a new Metadata.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IMetadata);

        /** Metadata stringValues. */
        public stringValues: { [k: string]: string };

        /** Metadata intValues. */
        public intValues: { [k: string]: (number|Long) };

        /** Metadata floatValues. */
        public floatValues: { [k: string]: number };

        /** Metadata boolValues. */
        public boolValues: { [k: string]: boolean };

        /** Metadata binaryValues. */
        public binaryValues: { [k: string]: Uint8Array };

        /**
         * Creates a new Metadata instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Metadata instance
         */
        public static create(properties?: folder_mcp.IMetadata): folder_mcp.Metadata;

        /**
         * Encodes the specified Metadata message. Does not implicitly {@link folder_mcp.Metadata.verify|verify} messages.
         * @param message Metadata message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IMetadata, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Metadata message, length delimited. Does not implicitly {@link folder_mcp.Metadata.verify|verify} messages.
         * @param message Metadata message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IMetadata, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Metadata message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Metadata
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.Metadata;

        /**
         * Decodes a Metadata message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Metadata
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.Metadata;

        /**
         * Verifies a Metadata message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Metadata message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Metadata
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.Metadata;

        /**
         * Creates a plain object from a Metadata message. Also converts values to other types if specified.
         * @param message Metadata
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.Metadata, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Metadata to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Metadata
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Progress. */
    interface IProgress {

        /** Progress completed */
        completed?: (number|null);

        /** Progress total */
        total?: (number|null);

        /** Progress percentage */
        percentage?: (number|null);

        /** Progress eta */
        eta?: (string|null);

        /** Progress currentItem */
        currentItem?: (string|null);
    }

    /** Represents a Progress. */
    class Progress implements IProgress {

        /**
         * Constructs a new Progress.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IProgress);

        /** Progress completed. */
        public completed: number;

        /** Progress total. */
        public total: number;

        /** Progress percentage. */
        public percentage: number;

        /** Progress eta. */
        public eta: string;

        /** Progress currentItem. */
        public currentItem: string;

        /**
         * Creates a new Progress instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Progress instance
         */
        public static create(properties?: folder_mcp.IProgress): folder_mcp.Progress;

        /**
         * Encodes the specified Progress message. Does not implicitly {@link folder_mcp.Progress.verify|verify} messages.
         * @param message Progress message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IProgress, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Progress message, length delimited. Does not implicitly {@link folder_mcp.Progress.verify|verify} messages.
         * @param message Progress message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IProgress, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Progress message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Progress
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.Progress;

        /**
         * Decodes a Progress message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Progress
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.Progress;

        /**
         * Verifies a Progress message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Progress message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Progress
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.Progress;

        /**
         * Creates a plain object from a Progress message. Also converts values to other types if specified.
         * @param message Progress
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.Progress, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Progress to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Progress
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SimilarityScore. */
    interface ISimilarityScore {

        /** SimilarityScore score */
        score?: (number|null);

        /** SimilarityScore confidence */
        confidence?: (number|null);

        /** SimilarityScore rank */
        rank?: (number|null);

        /** SimilarityScore method */
        method?: (string|null);
    }

    /** Represents a SimilarityScore. */
    class SimilarityScore implements ISimilarityScore {

        /**
         * Constructs a new SimilarityScore.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.ISimilarityScore);

        /** SimilarityScore score. */
        public score: number;

        /** SimilarityScore confidence. */
        public confidence: number;

        /** SimilarityScore rank. */
        public rank: number;

        /** SimilarityScore method. */
        public method: string;

        /**
         * Creates a new SimilarityScore instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SimilarityScore instance
         */
        public static create(properties?: folder_mcp.ISimilarityScore): folder_mcp.SimilarityScore;

        /**
         * Encodes the specified SimilarityScore message. Does not implicitly {@link folder_mcp.SimilarityScore.verify|verify} messages.
         * @param message SimilarityScore message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.ISimilarityScore, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SimilarityScore message, length delimited. Does not implicitly {@link folder_mcp.SimilarityScore.verify|verify} messages.
         * @param message SimilarityScore message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.ISimilarityScore, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SimilarityScore message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SimilarityScore
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.SimilarityScore;

        /**
         * Decodes a SimilarityScore message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SimilarityScore
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.SimilarityScore;

        /**
         * Verifies a SimilarityScore message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SimilarityScore message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SimilarityScore
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.SimilarityScore;

        /**
         * Creates a plain object from a SimilarityScore message. Also converts values to other types if specified.
         * @param message SimilarityScore
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.SimilarityScore, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SimilarityScore to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SimilarityScore
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a DateRange. */
    interface IDateRange {

        /** DateRange from */
        from?: (string|null);

        /** DateRange to */
        to?: (string|null);

        /** DateRange timezone */
        timezone?: (string|null);

        /** DateRange precision */
        precision?: (string|null);
    }

    /** Represents a DateRange. */
    class DateRange implements IDateRange {

        /**
         * Constructs a new DateRange.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IDateRange);

        /** DateRange from. */
        public from: string;

        /** DateRange to. */
        public to: string;

        /** DateRange timezone. */
        public timezone: string;

        /** DateRange precision. */
        public precision: string;

        /**
         * Creates a new DateRange instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DateRange instance
         */
        public static create(properties?: folder_mcp.IDateRange): folder_mcp.DateRange;

        /**
         * Encodes the specified DateRange message. Does not implicitly {@link folder_mcp.DateRange.verify|verify} messages.
         * @param message DateRange message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IDateRange, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified DateRange message, length delimited. Does not implicitly {@link folder_mcp.DateRange.verify|verify} messages.
         * @param message DateRange message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IDateRange, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DateRange message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DateRange
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.DateRange;

        /**
         * Decodes a DateRange message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns DateRange
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.DateRange;

        /**
         * Verifies a DateRange message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a DateRange message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns DateRange
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.DateRange;

        /**
         * Creates a plain object from a DateRange message. Also converts values to other types if specified.
         * @param message DateRange
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.DateRange, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this DateRange to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for DateRange
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an Author. */
    interface IAuthor {

        /** Author name */
        name?: (string|null);

        /** Author email */
        email?: (string|null);

        /** Author role */
        role?: (string|null);

        /** Author lastModified */
        lastModified?: (string|null);

        /** Author attributes */
        attributes?: ({ [k: string]: string }|null);
    }

    /** Represents an Author. */
    class Author implements IAuthor {

        /**
         * Constructs a new Author.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IAuthor);

        /** Author name. */
        public name: string;

        /** Author email. */
        public email: string;

        /** Author role. */
        public role: string;

        /** Author lastModified. */
        public lastModified: string;

        /** Author attributes. */
        public attributes: { [k: string]: string };

        /**
         * Creates a new Author instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Author instance
         */
        public static create(properties?: folder_mcp.IAuthor): folder_mcp.Author;

        /**
         * Encodes the specified Author message. Does not implicitly {@link folder_mcp.Author.verify|verify} messages.
         * @param message Author message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IAuthor, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Author message, length delimited. Does not implicitly {@link folder_mcp.Author.verify|verify} messages.
         * @param message Author message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IAuthor, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an Author message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Author
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.Author;

        /**
         * Decodes an Author message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Author
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.Author;

        /**
         * Verifies an Author message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an Author message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Author
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.Author;

        /**
         * Creates a plain object from an Author message. Also converts values to other types if specified.
         * @param message Author
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.Author, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Author to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Author
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a DocumentStructureEnhanced. */
    interface IDocumentStructureEnhanced {

        /** DocumentStructureEnhanced sheets */
        sheets?: (folder_mcp.ISheetInfo[]|null);

        /** DocumentStructureEnhanced slides */
        slides?: (folder_mcp.ISlideInfo[]|null);

        /** DocumentStructureEnhanced pages */
        pages?: (folder_mcp.IPageInfo[]|null);

        /** DocumentStructureEnhanced sections */
        sections?: (folder_mcp.ISectionInfo[]|null);

        /** DocumentStructureEnhanced toc */
        toc?: (folder_mcp.ITableOfContentsEntry[]|null);

        /** DocumentStructureEnhanced tags */
        tags?: (string[]|null);

        /** DocumentStructureEnhanced properties */
        properties?: ({ [k: string]: string }|null);
    }

    /** Represents a DocumentStructureEnhanced. */
    class DocumentStructureEnhanced implements IDocumentStructureEnhanced {

        /**
         * Constructs a new DocumentStructureEnhanced.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IDocumentStructureEnhanced);

        /** DocumentStructureEnhanced sheets. */
        public sheets: folder_mcp.ISheetInfo[];

        /** DocumentStructureEnhanced slides. */
        public slides: folder_mcp.ISlideInfo[];

        /** DocumentStructureEnhanced pages. */
        public pages: folder_mcp.IPageInfo[];

        /** DocumentStructureEnhanced sections. */
        public sections: folder_mcp.ISectionInfo[];

        /** DocumentStructureEnhanced toc. */
        public toc: folder_mcp.ITableOfContentsEntry[];

        /** DocumentStructureEnhanced tags. */
        public tags: string[];

        /** DocumentStructureEnhanced properties. */
        public properties: { [k: string]: string };

        /**
         * Creates a new DocumentStructureEnhanced instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DocumentStructureEnhanced instance
         */
        public static create(properties?: folder_mcp.IDocumentStructureEnhanced): folder_mcp.DocumentStructureEnhanced;

        /**
         * Encodes the specified DocumentStructureEnhanced message. Does not implicitly {@link folder_mcp.DocumentStructureEnhanced.verify|verify} messages.
         * @param message DocumentStructureEnhanced message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IDocumentStructureEnhanced, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified DocumentStructureEnhanced message, length delimited. Does not implicitly {@link folder_mcp.DocumentStructureEnhanced.verify|verify} messages.
         * @param message DocumentStructureEnhanced message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IDocumentStructureEnhanced, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DocumentStructureEnhanced message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DocumentStructureEnhanced
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.DocumentStructureEnhanced;

        /**
         * Decodes a DocumentStructureEnhanced message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns DocumentStructureEnhanced
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.DocumentStructureEnhanced;

        /**
         * Verifies a DocumentStructureEnhanced message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a DocumentStructureEnhanced message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns DocumentStructureEnhanced
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.DocumentStructureEnhanced;

        /**
         * Creates a plain object from a DocumentStructureEnhanced message. Also converts values to other types if specified.
         * @param message DocumentStructureEnhanced
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.DocumentStructureEnhanced, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this DocumentStructureEnhanced to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for DocumentStructureEnhanced
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a TableOfContentsEntry. */
    interface ITableOfContentsEntry {

        /** TableOfContentsEntry title */
        title?: (string|null);

        /** TableOfContentsEntry level */
        level?: (number|null);

        /** TableOfContentsEntry pageNumber */
        pageNumber?: (number|null);

        /** TableOfContentsEntry anchor */
        anchor?: (string|null);
    }

    /** Represents a TableOfContentsEntry. */
    class TableOfContentsEntry implements ITableOfContentsEntry {

        /**
         * Constructs a new TableOfContentsEntry.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.ITableOfContentsEntry);

        /** TableOfContentsEntry title. */
        public title: string;

        /** TableOfContentsEntry level. */
        public level: number;

        /** TableOfContentsEntry pageNumber. */
        public pageNumber: number;

        /** TableOfContentsEntry anchor. */
        public anchor: string;

        /**
         * Creates a new TableOfContentsEntry instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TableOfContentsEntry instance
         */
        public static create(properties?: folder_mcp.ITableOfContentsEntry): folder_mcp.TableOfContentsEntry;

        /**
         * Encodes the specified TableOfContentsEntry message. Does not implicitly {@link folder_mcp.TableOfContentsEntry.verify|verify} messages.
         * @param message TableOfContentsEntry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.ITableOfContentsEntry, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TableOfContentsEntry message, length delimited. Does not implicitly {@link folder_mcp.TableOfContentsEntry.verify|verify} messages.
         * @param message TableOfContentsEntry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.ITableOfContentsEntry, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TableOfContentsEntry message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TableOfContentsEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.TableOfContentsEntry;

        /**
         * Decodes a TableOfContentsEntry message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TableOfContentsEntry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.TableOfContentsEntry;

        /**
         * Verifies a TableOfContentsEntry message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TableOfContentsEntry message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TableOfContentsEntry
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.TableOfContentsEntry;

        /**
         * Creates a plain object from a TableOfContentsEntry message. Also converts values to other types if specified.
         * @param message TableOfContentsEntry
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.TableOfContentsEntry, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TableOfContentsEntry to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TableOfContentsEntry
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Cell. */
    interface ICell {

        /** Cell row */
        row?: (number|null);

        /** Cell column */
        column?: (number|null);

        /** Cell address */
        address?: (string|null);

        /** Cell value */
        value?: (string|null);

        /** Cell rawValue */
        rawValue?: (string|null);

        /** Cell type */
        type?: (folder_mcp.CellDataType|null);

        /** Cell formula */
        formula?: (string|null);

        /** Cell formatting */
        formatting?: ({ [k: string]: string }|null);
    }

    /** Represents a Cell. */
    class Cell implements ICell {

        /**
         * Constructs a new Cell.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.ICell);

        /** Cell row. */
        public row: number;

        /** Cell column. */
        public column: number;

        /** Cell address. */
        public address: string;

        /** Cell value. */
        public value: string;

        /** Cell rawValue. */
        public rawValue: string;

        /** Cell type. */
        public type: folder_mcp.CellDataType;

        /** Cell formula. */
        public formula: string;

        /** Cell formatting. */
        public formatting: { [k: string]: string };

        /**
         * Creates a new Cell instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Cell instance
         */
        public static create(properties?: folder_mcp.ICell): folder_mcp.Cell;

        /**
         * Encodes the specified Cell message. Does not implicitly {@link folder_mcp.Cell.verify|verify} messages.
         * @param message Cell message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.ICell, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Cell message, length delimited. Does not implicitly {@link folder_mcp.Cell.verify|verify} messages.
         * @param message Cell message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.ICell, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Cell message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Cell
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.Cell;

        /**
         * Decodes a Cell message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Cell
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.Cell;

        /**
         * Verifies a Cell message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Cell message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Cell
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.Cell;

        /**
         * Creates a plain object from a Cell message. Also converts values to other types if specified.
         * @param message Cell
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.Cell, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Cell to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Cell
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an Embedding. */
    interface IEmbedding {

        /** Embedding vector */
        vector?: (number[]|null);

        /** Embedding dimensions */
        dimensions?: (number|null);

        /** Embedding modelName */
        modelName?: (string|null);

        /** Embedding modelVersion */
        modelVersion?: (string|null);

        /** Embedding norm */
        norm?: (number|null);

        /** Embedding metadata */
        metadata?: ({ [k: string]: string }|null);
    }

    /** Represents an Embedding. */
    class Embedding implements IEmbedding {

        /**
         * Constructs a new Embedding.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IEmbedding);

        /** Embedding vector. */
        public vector: number[];

        /** Embedding dimensions. */
        public dimensions: number;

        /** Embedding modelName. */
        public modelName: string;

        /** Embedding modelVersion. */
        public modelVersion: string;

        /** Embedding norm. */
        public norm: number;

        /** Embedding metadata. */
        public metadata: { [k: string]: string };

        /**
         * Creates a new Embedding instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Embedding instance
         */
        public static create(properties?: folder_mcp.IEmbedding): folder_mcp.Embedding;

        /**
         * Encodes the specified Embedding message. Does not implicitly {@link folder_mcp.Embedding.verify|verify} messages.
         * @param message Embedding message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IEmbedding, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Embedding message, length delimited. Does not implicitly {@link folder_mcp.Embedding.verify|verify} messages.
         * @param message Embedding message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IEmbedding, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an Embedding message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Embedding
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.Embedding;

        /**
         * Decodes an Embedding message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Embedding
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.Embedding;

        /**
         * Verifies an Embedding message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an Embedding message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Embedding
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.Embedding;

        /**
         * Creates a plain object from an Embedding message. Also converts values to other types if specified.
         * @param message Embedding
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.Embedding, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Embedding to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Embedding
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an ErrorDetail. */
    interface IErrorDetail {

        /** ErrorDetail code */
        code?: (folder_mcp.ErrorCode|null);

        /** ErrorDetail message */
        message?: (string|null);

        /** ErrorDetail field */
        field?: (string|null);

        /** ErrorDetail suggestions */
        suggestions?: (string[]|null);

        /** ErrorDetail context */
        context?: ({ [k: string]: string }|null);

        /** ErrorDetail documentationUrl */
        documentationUrl?: (string|null);
    }

    /** Represents an ErrorDetail. */
    class ErrorDetail implements IErrorDetail {

        /**
         * Constructs a new ErrorDetail.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IErrorDetail);

        /** ErrorDetail code. */
        public code: folder_mcp.ErrorCode;

        /** ErrorDetail message. */
        public message: string;

        /** ErrorDetail field. */
        public field: string;

        /** ErrorDetail suggestions. */
        public suggestions: string[];

        /** ErrorDetail context. */
        public context: { [k: string]: string };

        /** ErrorDetail documentationUrl. */
        public documentationUrl: string;

        /**
         * Creates a new ErrorDetail instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ErrorDetail instance
         */
        public static create(properties?: folder_mcp.IErrorDetail): folder_mcp.ErrorDetail;

        /**
         * Encodes the specified ErrorDetail message. Does not implicitly {@link folder_mcp.ErrorDetail.verify|verify} messages.
         * @param message ErrorDetail message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IErrorDetail, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ErrorDetail message, length delimited. Does not implicitly {@link folder_mcp.ErrorDetail.verify|verify} messages.
         * @param message ErrorDetail message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IErrorDetail, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an ErrorDetail message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ErrorDetail
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.ErrorDetail;

        /**
         * Decodes an ErrorDetail message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ErrorDetail
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.ErrorDetail;

        /**
         * Verifies an ErrorDetail message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an ErrorDetail message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ErrorDetail
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.ErrorDetail;

        /**
         * Creates a plain object from an ErrorDetail message. Also converts values to other types if specified.
         * @param message ErrorDetail
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.ErrorDetail, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ErrorDetail to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ErrorDetail
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ResponseStatus. */
    interface IResponseStatus {

        /** ResponseStatus success */
        success?: (boolean|null);

        /** ResponseStatus errors */
        errors?: (folder_mcp.IErrorDetail[]|null);

        /** ResponseStatus warnings */
        warnings?: (string[]|null);

        /** ResponseStatus requestId */
        requestId?: (string|null);

        /** ResponseStatus processingTimeMs */
        processingTimeMs?: (number|Long|null);
    }

    /** Represents a ResponseStatus. */
    class ResponseStatus implements IResponseStatus {

        /**
         * Constructs a new ResponseStatus.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IResponseStatus);

        /** ResponseStatus success. */
        public success: boolean;

        /** ResponseStatus errors. */
        public errors: folder_mcp.IErrorDetail[];

        /** ResponseStatus warnings. */
        public warnings: string[];

        /** ResponseStatus requestId. */
        public requestId: string;

        /** ResponseStatus processingTimeMs. */
        public processingTimeMs: (number|Long);

        /**
         * Creates a new ResponseStatus instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ResponseStatus instance
         */
        public static create(properties?: folder_mcp.IResponseStatus): folder_mcp.ResponseStatus;

        /**
         * Encodes the specified ResponseStatus message. Does not implicitly {@link folder_mcp.ResponseStatus.verify|verify} messages.
         * @param message ResponseStatus message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IResponseStatus, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ResponseStatus message, length delimited. Does not implicitly {@link folder_mcp.ResponseStatus.verify|verify} messages.
         * @param message ResponseStatus message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IResponseStatus, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ResponseStatus message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ResponseStatus
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.ResponseStatus;

        /**
         * Decodes a ResponseStatus message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ResponseStatus
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.ResponseStatus;

        /**
         * Verifies a ResponseStatus message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ResponseStatus message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ResponseStatus
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.ResponseStatus;

        /**
         * Creates a plain object from a ResponseStatus message. Also converts values to other types if specified.
         * @param message ResponseStatus
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.ResponseStatus, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ResponseStatus to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ResponseStatus
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a StatusInfo. */
    interface IStatusInfo {

        /** StatusInfo healthy */
        healthy?: (boolean|null);

        /** StatusInfo version */
        version?: (string|null);

        /** StatusInfo uptimeSeconds */
        uptimeSeconds?: (number|Long|null);

        /** StatusInfo activeConnections */
        activeConnections?: (number|null);

        /** StatusInfo buildInfo */
        buildInfo?: (string|null);

        /** StatusInfo components */
        components?: ({ [k: string]: string }|null);

        /** StatusInfo capabilities */
        capabilities?: (string[]|null);
    }

    /** Represents a StatusInfo. */
    class StatusInfo implements IStatusInfo {

        /**
         * Constructs a new StatusInfo.
         * @param [properties] Properties to set
         */
        constructor(properties?: folder_mcp.IStatusInfo);

        /** StatusInfo healthy. */
        public healthy: boolean;

        /** StatusInfo version. */
        public version: string;

        /** StatusInfo uptimeSeconds. */
        public uptimeSeconds: (number|Long);

        /** StatusInfo activeConnections. */
        public activeConnections: number;

        /** StatusInfo buildInfo. */
        public buildInfo: string;

        /** StatusInfo components. */
        public components: { [k: string]: string };

        /** StatusInfo capabilities. */
        public capabilities: string[];

        /**
         * Creates a new StatusInfo instance using the specified properties.
         * @param [properties] Properties to set
         * @returns StatusInfo instance
         */
        public static create(properties?: folder_mcp.IStatusInfo): folder_mcp.StatusInfo;

        /**
         * Encodes the specified StatusInfo message. Does not implicitly {@link folder_mcp.StatusInfo.verify|verify} messages.
         * @param message StatusInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: folder_mcp.IStatusInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified StatusInfo message, length delimited. Does not implicitly {@link folder_mcp.StatusInfo.verify|verify} messages.
         * @param message StatusInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: folder_mcp.IStatusInfo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a StatusInfo message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns StatusInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): folder_mcp.StatusInfo;

        /**
         * Decodes a StatusInfo message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns StatusInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): folder_mcp.StatusInfo;

        /**
         * Verifies a StatusInfo message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a StatusInfo message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns StatusInfo
         */
        public static fromObject(object: { [k: string]: any }): folder_mcp.StatusInfo;

        /**
         * Creates a plain object from a StatusInfo message. Also converts values to other types if specified.
         * @param message StatusInfo
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: folder_mcp.StatusInfo, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this StatusInfo to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for StatusInfo
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}
