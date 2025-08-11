/**
 * PDF Parser Wrapper
 * 
 * This wrapper fixes the issue with pdf-parse running debug code
 * when imported in ES modules context.
 */

import { createRequire } from 'module';

// Use CommonJS require to avoid the ES module import issue
const require = createRequire(import.meta.url);

let pdfParseLib: any = null;

export async function parsePdf(buffer: Buffer): Promise<{ text: string; numpages: number; info: any; metadata: any }> {
  if (!pdfParseLib) {
    // Use require instead of import to avoid the debug mode issue
    pdfParseLib = require('pdf-parse');
  }
  
  return await pdfParseLib(buffer);
}
