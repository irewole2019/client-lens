import { Octokit } from '@octokit/rest'

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

import * as fs from 'fs';
import * as path from 'path';

// Helper function to get all files in a directory recursively
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      // Skip certain directories
      if (!['node_modules', '.git', 'dist', 'build', '.next', '.replit'].includes(file)) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

// Helper function to convert file path to blob content
function createBlobContent(filePath: string): { path: string; content: string; encoding: 'base64' | 'utf-8' } {
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  
  // Binary files should be base64 encoded
  const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz'];
  const isBinary = binaryExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
  
  const content = fs.readFileSync(filePath, isBinary ? 'base64' : 'utf8');
  
  return {
    path: relativePath,
    content: content,
    encoding: isBinary ? 'base64' : 'utf-8'
  };
}

export async function pushToGitHub() {
  try {
    const octokit = await getUncachableGitHubClient();
    
    // Get user information
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`Connected to GitHub as: ${user.login}`);
    
    // Create a new repository
    const repoName = 'client-lens';
    let repoExists = false;
    let repo: any;
    
    try {
      const { data: newRepo } = await octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        description: 'Client Lens - Project file management application',
        private: false,
        auto_init: false,
      });
      
      repo = newRepo;
      console.log(`Created repository: ${repo.html_url}`);
    } catch (error: any) {
      if (error.status === 422) {
        // Repository already exists
        const { data: existingRepo } = await octokit.rest.repos.get({
          owner: user.login,
          repo: repoName,
        });
        
        repo = existingRepo;
        repoExists = true;
        console.log(`Repository already exists: ${repo.html_url}`);
      } else {
        throw error;
      }
    }

    // Get all files from the current directory
    const allFiles = getAllFiles(process.cwd());
    console.log(`Found ${allFiles.length} files to upload`);

    // Create blobs for all files
    const blobs = [];
    for (const filePath of allFiles) {
      try {
        const { path: relativePath, content, encoding } = createBlobContent(filePath);
        
        const { data: blob } = await octokit.rest.git.createBlob({
          owner: user.login,
          repo: repoName,
          content: content,
          encoding: encoding
        });
        
        blobs.push({
          path: relativePath,
          sha: blob.sha,
          mode: '100644' as const,
          type: 'blob' as const
        });
        
        console.log(`Created blob for: ${relativePath}`);
      } catch (error) {
        console.warn(`Skipped file ${filePath}:`, error);
      }
    }

    // Get the current commit SHA (if repository has commits)
    let parentSha: string | undefined;
    try {
      const { data: ref } = await octokit.rest.git.getRef({
        owner: user.login,
        repo: repoName,
        ref: 'heads/main'
      });
      parentSha = ref.object.sha;
    } catch (error) {
      // No commits yet, this will be the first commit
      console.log('No existing commits found, creating initial commit');
    }

    // Create a tree with all the blobs
    const { data: tree } = await octokit.rest.git.createTree({
      owner: user.login,
      repo: repoName,
      tree: blobs,
      base_tree: parentSha
    });

    // Create a commit
    const { data: commit } = await octokit.rest.git.createCommit({
      owner: user.login,
      repo: repoName,
      message: repoExists ? 'Update Client Lens project files' : 'Initial commit: Client Lens project',
      tree: tree.sha,
      parents: parentSha ? [parentSha] : []
    });

    // Update the main branch to point to the new commit
    try {
      await octokit.rest.git.updateRef({
        owner: user.login,
        repo: repoName,
        ref: 'heads/main',
        sha: commit.sha
      });
    } catch (error) {
      // If main branch doesn't exist, create it
      await octokit.rest.git.createRef({
        owner: user.login,
        repo: repoName,
        ref: 'refs/heads/main',
        sha: commit.sha
      });
    }

    console.log(`Successfully pushed ${blobs.length} files to ${repo.html_url}`);
    
    return {
      success: true,
      repoUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      sshUrl: repo.ssh_url,
      existing: repoExists,
      filesUploaded: blobs.length
    };
  } catch (error) {
    console.error('Error pushing to GitHub:', error);
    throw error;
  }
}