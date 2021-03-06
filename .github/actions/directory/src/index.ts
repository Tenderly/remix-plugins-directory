import { setFailed, getInput, warning } from '@actions/core';
import { context, GitHub } from '@actions/github';
import { ReposGetContentsResponseItem } from '@octokit/rest';

async function createFile() {
  try {
    const token = getInput('GITHUB_TOKEN');
  
    if (!token) {
      warning(`Github env with value ${token} is not provided`);
      throw new Error('Cannot find token');
    } else {
      const { repos } = new GitHub(token);
      const { data: plugins } = await repos.getContents({ ...context.repo, path: 'plugins' });
      const requests = (plugins as Array<ReposGetContentsResponseItem>).map(async plugin => {
        const path = `${plugin.path}/profile.json`;
        const { data: profile } = await repos.getContents({ ...context.repo, path });
        const buff = Buffer.from(profile['content'], 'base64');
        return JSON.parse(buff.toString());
      });
      const profiles = await Promise.all(requests);
      const buff = Buffer.from(JSON.stringify(profiles), 'utf8');
      const content = buff.toString('base64');
  
      const path = 'build/profile.json';
      const file = await repos.getContents({ ...context.repo, path });
      await repos.createOrUpdateFile({
        ...context.repo,
        message: '[Action] build plugin list',
        sha: file.data['sha'],
        content,
        path,
      });
    }
  } catch(err) {
    setFailed(err);
  }
}

createFile();