import { describe, expect, it } from 'vitest';

import parseGitLabRemote from './parseGitLabRemote.ts';

describe('parseGitLabRemote', () => {
  it.each([
    'git@gitlab.com:vbti-products/part-inspection/adam-one/adam-one-app.git',
    'gitlab.com:vbti-products/part-inspection/adam-one/adam-one-app',
    'ssh://git@gitlab.com/vbti-products/part-inspection/adam-one/adam-one-app.git',
    'https://gitlab.com/vbti-products/part-inspection/adam-one/adam-one-app.git',
    'https://gitlab.com/vbti-products/part-inspection/adam-one/adam-one-app',
    'git://gitlab.com/vbti-products/part-inspection/adam-one/adam-one-app.git',
    'https://GitLab.com/vbti-products/part-inspection/adam-one/adam-one-app.GIT',
  ])('reads the project from %s', (remote) => {
    expect(parseGitLabRemote(remote)).toEqual({
      kind: 'path',
      path: 'vbti-products/part-inspection/adam-one/adam-one-app',
    });
  });

  it.each([
    'git@github.com:RubenFricke/hunk-glab.git',
    'https://gitlab.example.com/group/project.git',
    'ssh://git@altssh.gitlab.com:443/group/project.git',
    'https://gitlab.com:8443/group/project.git',
    'https://gitlab.com/group/project.git?ref=main',
    'https://gitlab.com/group/project.git#main',
    'http+ssh://gitlab.com/group/project',
    'git@gitlab.com:project.git',
    'https://gitlab.com/group/project/',
    'file:///srv/git/project.git',
    '../project',
    '',
  ])('finds no gitlab.com project in %j', (remote) => {
    expect(parseGitLabRemote(remote)).toBeNull();
  });

  it('finds no project in a remote whose path is only a number', () => {
    expect(parseGitLabRemote('git@gitlab.com:123.git')).toBeNull();
  });
});
