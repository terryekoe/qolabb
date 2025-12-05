/**
 * Google Docs API Service
 * Handles fetching document data and tracking changes
 */

export interface GoogleDocument {
  documentId: string;
  title: string;
  revisionId: string;
  revisions: GoogleRevision[];
}

export interface GoogleRevision {
  id: string;
  modifiedTime: string;
  lastModifyingUser?: {
    displayName: string;
    emailAddress: string;
  };
}

export interface GoogleDocumentContent {
  body: {
    content: any[];
  };
}

/**
 * Get document metadata
 */
export async function getDocumentMetadata(
  accessToken: string,
  documentId: string
): Promise<GoogleDocument> {
  const response = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get document metadata: ${error}`);
  }

  const data = await response.json();
  return {
    documentId: data.documentId,
    title: data.title,
    revisionId: data.revisionId,
    revisions: [], // Will be fetched separately
  };
}

/**
 * Get document revisions
 */
export async function getDocumentRevisions(
  accessToken: string,
  documentId: string
): Promise<GoogleRevision[]> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${documentId}/revisions`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get document revisions: ${error}`);
  }

  const data = await response.json();
  return (data.revisions || []).map((rev: any) => ({
    id: rev.id,
    modifiedTime: rev.modifiedTime,
    lastModifyingUser: rev.lastModifyingUser,
  }));
}

/**
 * Get document content at a specific revision
 */
export async function getDocumentContent(
  accessToken: string,
  documentId: string,
  revisionId?: string
): Promise<GoogleDocumentContent> {
  const url = revisionId
    ? `https://docs.googleapis.com/v1/documents/${documentId}?revisionId=${revisionId}`
    : `https://docs.googleapis.com/v1/documents/${documentId}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get document content: ${error}`);
  }

  return await response.json();
}

/**
 * Calculate character changes between two document contents
 */
export function calculateCharacterChanges(
  oldContent: GoogleDocumentContent,
  newContent: GoogleDocumentContent
): { added: number; removed: number } {
  // Extract text from content recursively
  const extractText = (content: any[]): string => {
    let text = '';
    for (const element of content) {
      if (element.paragraph) {
        for (const elem of element.paragraph.elements || []) {
          if (elem.textRun) {
            text += elem.textRun.content || '';
          }
        }
      } else if (element.table) {
        for (const row of element.table.tableRows || []) {
          for (const cell of row.tableCells || []) {
            text += extractText(cell.content || []);
          }
        }
      } else if (element.sectionBreak || element.tableOfContents) {
        // Skip these elements
        continue;
      }
    }
    return text;
  };

  const oldText = extractText(oldContent.body?.content || []);
  const newText = extractText(newContent.body?.content || []);

  // Simple character difference calculation
  // More sophisticated diff algorithms could be used here
  const oldLength = oldText.length;
  const newLength = newText.length;

  if (newLength > oldLength) {
    return {
      added: newLength - oldLength,
      removed: 0,
    };
  } else if (oldLength > newLength) {
    return {
      added: 0,
      removed: oldLength - newLength,
    };
  }

  return { added: 0, removed: 0 };
}

/**
 * List user's Google Docs
 */
export async function listUserDocuments(
  accessToken: string,
  maxResults: number = 100
): Promise<Array<{ id: string; name: string; modifiedTime: string; webViewLink: string }>> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.document'&orderBy=modifiedTime desc&maxResults=${maxResults}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list documents: ${error}`);
  }

  const data = await response.json();
  return (data.files || []).map((file: any) => ({
    id: file.id,
    name: file.name,
    modifiedTime: file.modifiedTime,
    webViewLink: file.webViewLink,
  }));
}
