import { google } from 'googleapis';

/**
 * Google Drive Service
 * 
 * Handles interactions with the Google Drive API using a Service Account.
 * Requires GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.
 */

export class GoogleDriveService {
  private static instance: GoogleDriveService;
  private drive: any;

  private constructor() {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'); // Handle newlines in env var

    if (clientEmail && privateKey) {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
      this.drive = google.drive({ version: 'v3', auth });
    } else {
      console.warn('[GoogleDriveService] Missing credentials. Running in mock mode.');
    }
  }

  public static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  /**
   * Copies a template file for a team.
   * @param templateId The ID of the master template file.
   * @param teamName The name of the team to include in the new file name.
   * @returns A promise that resolves to the new file ID and webViewLink.
   */
  async createTeamCopy(templateId: string, teamName: string): Promise<{ fileId: string; webViewLink: string; name: string }> {
    if (!this.drive) {
      return this.mockCreateTeamCopy(templateId, teamName);
    }

    try {
      console.log(`[GoogleDrive] Copying template ${templateId} for team ${teamName}...`);
      
      const newFileName = `${teamName} - Assignment Workspace`;
      
      const response = await this.drive.files.copy({
        fileId: templateId,
        requestBody: {
          name: newFileName,
        },
        fields: 'id, name, webViewLink',
      });

      const { id, name, webViewLink } = response.data;
      console.log(`[GoogleDrive] Created file: ${name} (${id})`);

      // Make it editable by anyone with the link (or restrict to domain if needed)
      // For simplicity in this MVP, we'll make it "anyone with link can edit" 
      // or we could rely on the folder permissions if we put it in a folder.
      // Let's add "anyone with link" permission for now to ensure access.
      await this.drive.permissions.create({
        fileId: id,
        requestBody: {
          role: 'writer',
          type: 'anyone',
        },
      });

      return {
        fileId: id,
        webViewLink,
        name
      };
    } catch (error: any) {
      console.error('[GoogleDrive] Error creating copy:', error);
      throw new Error(`Failed to provision Google Doc: ${error.message}`);
    }
  }

  /**
   * Fallback mock implementation
   */
  private async mockCreateTeamCopy(templateId: string, teamName: string): Promise<{ fileId: string; webViewLink: string; name: string }> {
    console.log(`[Mock GoogleDrive] Copying template ${templateId} for team ${teamName}...`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return the template itself as a fallback so links work
    const webViewLink = `https://docs.google.com/document/d/${templateId}/edit?usp=sharing`;
    const newFileName = `${teamName} - Assignment Workspace (Mock)`;

    return {
      fileId: templateId, // Use template ID to avoid 404s
      webViewLink,
      name: newFileName
    };
  }

  /**
   * Creates a new Google Doc with the specified content.
   * @param title The title of the document.
   * @param content The text content to insert into the document.
   * @param teamName The name of the team (for file naming).
   */
  async createDocWithContent(title: string, content: string, teamName: string): Promise<{ fileId: string; webViewLink: string; name: string }> {
    if (!this.drive) {
      return this.mockCreateDocWithContent(title, content, teamName);
    }

    try {
      console.log(`[GoogleDrive] Creating doc "${title}" for team ${teamName}...`);
      
      const newFileName = `${teamName} - ${title}`;
      
      // 1. Create a blank document
      const parentFolderId = process.env.GOOGLE_PARENT_FOLDER_ID;
      
      const fileMetadata: any = {
        name: newFileName,
        mimeType: 'application/vnd.google-apps.document',
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }
      
      const createResponse = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, webViewLink',
      });

      const { id, name, webViewLink } = createResponse.data;
      console.log(`[GoogleDrive] Created blank file: ${name} (${id})`);

      // 2. Insert content using the Docs API
      // We need a separate client for the Docs API
      // Re-use the auth from the drive client
      const docs = google.docs({ version: 'v1', auth: this.drive.context._options.auth });

      if (content) {
        await docs.documents.batchUpdate({
          documentId: id,
          requestBody: {
            requests: [
              {
                insertText: {
                  location: { index: 1 },
                  text: content + '\n\n',
                },
              },
              {
                insertText: {
                  location: { index: 1 },
                  text: title + '\n',
                },
              },
              // Make title bold and large
              {
                updateTextStyle: {
                  range: { startIndex: 1, endIndex: 1 + title.length },
                  textStyle: {
                    bold: true,
                    fontSize: { magnitude: 18, unit: 'PT' },
                  },
                  fields: 'bold,fontSize',
                },
              }
            ],
          },
        });
      }

      // 3. Set permissions
      await this.drive.permissions.create({
        fileId: id,
        requestBody: {
          role: 'writer',
          type: 'anyone',
        },
      });

      return {
        fileId: id,
        webViewLink,
        name
      };
    } catch (error: any) {
      console.error('[GoogleDrive] Error creating doc:', error);
      throw new Error(`Failed to create Google Doc: ${error.message}`);
    }
  }

  private async mockCreateDocWithContent(title: string, content: string, teamName: string): Promise<{ fileId: string; webViewLink: string; name: string }> {
    console.log(`[Mock GoogleDrive] Creating doc "${title}" for team ${teamName}...`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // For mock, we can't create a real doc with content.
    // We'll just return a link to a generic "Blank" Google Doc or the user's template if we had one (but we don't here).
    // Let's return a link to a new blank doc.
    const webViewLink = `https://docs.google.com/document/create`; 
    const newFileName = `${teamName} - ${title} (Mock)`;

    return {
      fileId: 'mock_auto_doc_' + Date.now(),
      webViewLink,
      name: newFileName
    };
  }

  /**
   * Helper to extract file ID from a Google Doc URL.
   */
  extractFileIdFromUrl(url: string): string | null {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }
}

export const googleDriveService = GoogleDriveService.getInstance();
