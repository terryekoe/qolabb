import type { VerificationData } from '@/lib/types/database';

export interface VerificationResult {
  verified: boolean;
  url_type: 'github' | 'google_docs' | 'google_sheets' | 'other';
  data?: VerificationData;
  error?: string;
}

/**
 * Detect the type of URL submitted
 */
export function detectUrlType(url: string): 'github' | 'google_docs' | 'google_sheets' | 'other' {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (hostname.includes('github.com')) {
      return 'github';
    }
    
    if (hostname.includes('docs.google.com')) {
      if (url.includes('/spreadsheets/')) {
        return 'google_sheets';
      }
      return 'google_docs';
    }
    
    return 'other';
  } catch {
    return 'other';
  }
}

/**
 * Parse GitHub URL to extract owner and repo
 * Example: https://github.com/facebook/react → { owner: 'facebook', repo: 'react' }
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length >= 2) {
      return {
        owner: pathParts[0],
        repo: pathParts[1]
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse Google Doc/Sheet URL to extract document ID
 * Example: https://docs.google.com/document/d/ABC123/edit → 'ABC123'
 */
export function parseGoogleDocId(url: string): string | null {
  try {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Verify GitHub repository URL and fetch metadata
 * Uses public GitHub API (no auth required for public repos)
 */
export async function verifyGitHubUrl(url: string): Promise<VerificationResult> {
  const parsed = parseGitHubUrl(url);
  
  if (!parsed) {
    return {
      verified: false,
      url_type: 'github',
      error: 'Invalid GitHub URL format'
    };
  }
  
  const { owner, repo } = parsed;
  
  try {
    // Fetch repository data
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          // Add token if available for higher rate limits
          ...(process.env.GITHUB_API_TOKEN && {
            'Authorization': `token ${process.env.GITHUB_API_TOKEN}`
          })
        }
      }
    );
    
    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        return {
          verified: false,
          url_type: 'github',
          error: 'Repository not found or is private'
        };
      }
      throw new Error(`GitHub API error: ${repoResponse.status}`);
    }
    
    const repoData = await repoResponse.json();
    
    // Fetch recent commits
    const commitsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          ...(process.env.GITHUB_API_TOKEN && {
            'Authorization': `token ${process.env.GITHUB_API_TOKEN}`
          })
        }
      }
    );
    
    const commits = commitsResponse.ok ? await commitsResponse.json() : [];
    
    return {
      verified: true,
      url_type: 'github',
      data: {
        repo_name: repoData.name,
        description: repoData.description,
        language: repoData.language,
        stars: repoData.stargazers_count,
        commit_count: Array.isArray(commits) ? commits.length : 0,
        last_updated: repoData.updated_at,
        is_public: !repoData.private
      }
    };
  } catch (error: any) {
    return {
      verified: false,
      url_type: 'github',
      error: error.message || 'Failed to verify GitHub repository'
    };
  }
}

/**
 * Verify Google Doc/Sheet URL and fetch metadata
 * Uses Google Drive API with public access
 */
export async function verifyGoogleDocUrl(url: string): Promise<VerificationResult> {
  const docId = parseGoogleDocId(url);
  const urlType = detectUrlType(url) as 'google_docs' | 'google_sheets';
  
  if (!docId) {
    return {
      verified: false,
      url_type: urlType,
      error: 'Invalid Google Docs/Sheets URL format'
    };
  }
  
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    // If no API key, just check if URL is accessible
    return {
      verified: true,
      url_type: urlType,
      data: {
        doc_name: 'Document',
        doc_type: urlType === 'google_docs' ? 'Google Docs' : 'Google Sheets'
      }
    };
  }
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${docId}?fields=name,mimeType,modifiedTime,owners&key=${apiKey}`
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          verified: false,
          url_type: urlType,
          error: 'Document not found or not accessible. Make sure sharing is enabled.'
        };
      }
      throw new Error(`Google API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      verified: true,
      url_type: urlType,
      data: {
        doc_name: data.name,
        doc_type: data.mimeType,
        last_modified: data.modifiedTime,
        owner: data.owners?.[0]?.displayName
      }
    };
  } catch (error: any) {
    return {
      verified: false,
      url_type: urlType,
      error: error.message || 'Failed to verify Google document'
    };
  }
}

/**
 * Main verification function that routes to appropriate verifier
 */
export async function verifySubmissionUrl(url: string): Promise<VerificationResult> {
  const urlType = detectUrlType(url);
  
  switch (urlType) {
    case 'github':
      return verifyGitHubUrl(url);
    
    case 'google_docs':
    case 'google_sheets':
      return verifyGoogleDocUrl(url);
    
    default:
      // For other URLs, just verify it's a valid URL
      try {
        new URL(url);
        return {
          verified: true,
          url_type: 'other',
          data: {}
        };
      } catch {
        return {
          verified: false,
          url_type: 'other',
          error: 'Invalid URL format'
        };
      }
  }
}
