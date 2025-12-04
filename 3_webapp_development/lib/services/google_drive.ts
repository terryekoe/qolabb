/**
 * Mock Google Drive Service
 * 
 * This service simulates interactions with the Google Drive API.
 * In a real implementation, this would use the 'googleapis' library and a service account.
 */

export class GoogleDriveService {
  private static instance: GoogleDriveService;

  private constructor() {}

  public static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  /**
   * Simulates copying a file (template) for a team.
   * @param templateId The ID of the master template file.
   * @param teamName The name of the team to include in the new file name.
   * @returns A promise that resolves to the new file ID and webViewLink.
   */
  async createTeamCopy(templateId: string, teamName: string): Promise<{ fileId: string; webViewLink: string; name: string }> {
    console.log(`[Mock GoogleDrive] Copying template ${templateId} for team ${teamName}...`);
    
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newFileId = `mock_file_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const newFileName = `${teamName} - Assignment Workspace`;
    
    // Generate a mock Google Doc URL
    // Use the templateId so the link actually works (pointing to the template)
    // instead of a fake ID that returns 404
    const webViewLink = `https://docs.google.com/document/d/${templateId}/edit?usp=sharing`;

    console.log(`[Mock GoogleDrive] Created file: ${newFileName} (${newFileId})`);

    return {
      fileId: newFileId,
      webViewLink,
      name: newFileName
    };
  }

  /**
   * Simulates granting permissions to a file.
   * @param fileId The ID of the file to share.
   * @param emails List of email addresses to grant access to.
   */
  async grantPermissions(fileId: string, emails: string[]): Promise<void> {
    console.log(`[Mock GoogleDrive] Granting permissions on ${fileId} to:`, emails);
    
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 800));
    
    console.log(`[Mock GoogleDrive] Permissions granted.`);
  }

  /**
   * Helper to extract file ID from a Google Doc URL.
   * Handles standard URLs.
   */
  extractFileIdFromUrl(url: string): string | null {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }
}

export const googleDriveService = GoogleDriveService.getInstance();
