import { jest } from '@jest/globals';

// Mock the @actions/core module
const mockCore = {
  getInput: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  info: jest.fn(),
  notice: jest.fn(),
  debug: jest.fn()
};

// Mock the @actions/github module
const mockGithub = {
  getOctokit: jest.fn(),
  context: {
    repo: { owner: 'test-owner', repo: 'test-repo' },
    issue: { number: 1 },
    runId: '12345',
    payload: {
      comment: { user: { login: 'test-user' } },
      repository: { html_url: 'https://github.com/test-owner/test-repo' }
    }
  }
};

// Mock octokit instance
const mockOctokit = {
  rest: {
    issues: {
      listComments: jest.fn(),
      createComment: jest.fn()
    },
    teams: {
      listMembersInOrg: jest.fn()
    }
  },
  paginate: jest.fn()
};

// Mock the modules before importing the main module
jest.unstable_mockModule('@actions/core', () => mockCore);
jest.unstable_mockModule('@actions/github', () => mockGithub);

const { getAllComments, getTeamMembers, run } = await import('./index.js');

describe('ApproveOps Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGithub.getOctokit.mockReturnValue(mockOctokit);

    // Set default inputs
    mockCore.getInput.mockImplementation(name => {
      const inputs = {
        token: 'test-token',
        'approve-command': '/approve',
        'team-name': 'approver-team',
        'fail-if-approval-not-found': 'true',
        'post-successful-approval-comment': 'true',
        'successful-approval-comment': ':tada: Approved!'
      };
      return inputs[name] || '';
    });
  });

  describe('getAllComments', () => {
    test('should get all comments with pagination', async () => {
      const context = {
        repo: { owner: 'test-owner', repo: 'test-repo' },
        issue: { number: 1 }
      };

      const allComments = [
        ...Array(100)
          .fill()
          .map((_, i) => ({ id: i + 1, body: 'comment' })),
        { id: 101, body: 'last comment' }
      ];

      mockOctokit.paginate.mockResolvedValue(allComments);

      const comments = await getAllComments(mockOctokit, context);

      expect(comments).toHaveLength(101);
      expect(mockOctokit.paginate).toHaveBeenCalledWith(
        mockOctokit.rest.issues.listComments,
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          issue_number: 1
        })
      );
    });
  });

  describe('getTeamMembers', () => {
    test('should get team members with pagination', async () => {
      const allMembers = [
        ...Array(100)
          .fill()
          .map((_, i) => ({ login: `user${i}` })),
        { login: 'lastuser' }
      ];

      mockOctokit.paginate.mockResolvedValue(allMembers);

      const members = await getTeamMembers(mockOctokit, 'test-org', 'test-team');

      expect(members).toHaveLength(101);
      expect(members[0]).toBe('user0');
      expect(members[100]).toBe('lastuser');
      expect(mockOctokit.paginate).toHaveBeenCalledWith(
        mockOctokit.rest.teams.listMembersInOrg,
        expect.objectContaining({
          org: 'test-org',
          team_slug: 'test-team'
        })
      );
    });

    test('should throw error when team not found', async () => {
      mockOctokit.paginate.mockRejectedValue({
        status: 404
      });

      await expect(getTeamMembers(mockOctokit, 'test-org', 'nonexistent-team')).rejects.toThrow(
        `Team 'nonexistent-team' not found in 'test-org' or token doesn't have permission to access it`
      );
    });
  });

  describe('run - integration', () => {
    test('should approve when team member comments with approval command', async () => {
      // Mock team members
      mockOctokit.paginate.mockResolvedValueOnce([{ login: 'team-member' }]);

      // Mock comments with approval
      mockOctokit.paginate.mockResolvedValueOnce([
        {
          id: 1,
          body: '/approve',
          user: { login: 'team-member' }
        }
      ]);

      mockOctokit.rest.issues.createComment.mockResolvedValue({});

      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('approved', 'true');
      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled();
    });

    test('should not approve when non-team member comments with approval command', async () => {
      // Mock team members
      mockOctokit.paginate.mockResolvedValueOnce([{ login: 'team-member' }]);

      // Mock comments with approval from non-team member
      mockOctokit.paginate.mockResolvedValueOnce([
        {
          id: 1,
          body: '/approve',
          user: { login: 'non-team-member' }
        }
      ]);

      mockOctokit.rest.issues.createComment.mockResolvedValue({});

      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('approved', 'false');
      expect(mockCore.setFailed).toHaveBeenCalled();
    });

    test('should handle approval command with leading whitespace', async () => {
      // Mock team members
      mockOctokit.paginate.mockResolvedValueOnce([{ login: 'team-member' }]);

      // Mock comments with approval command surrounded by whitespace
      mockOctokit.paginate.mockResolvedValueOnce([
        {
          id: 1,
          body: ' /approve \n',
          user: { login: 'team-member' }
        }
      ]);

      mockOctokit.rest.issues.createComment.mockResolvedValue({});

      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('approved', 'true');
    });

    test('should handle approval command with trailing whitespace and newlines', async () => {
      mockOctokit.paginate.mockResolvedValueOnce([{ login: 'team-member' }]);

      mockOctokit.paginate.mockResolvedValueOnce([
        {
          id: 1,
          body: '/approve\r\n\r\n',
          user: { login: 'team-member' }
        }
      ]);

      mockOctokit.rest.issues.createComment.mockResolvedValue({});

      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('approved', 'true');
    });

    test('should handle approval command with tabs and mixed whitespace', async () => {
      mockOctokit.paginate.mockResolvedValueOnce([{ login: 'team-member' }]);

      mockOctokit.paginate.mockResolvedValueOnce([
        {
          id: 1,
          body: '\t /approve \t\n',
          user: { login: 'team-member' }
        }
      ]);

      mockOctokit.rest.issues.createComment.mockResolvedValue({});

      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('approved', 'true');
    });

    test('should handle custom approval command with special characters', async () => {
      mockCore.getInput.mockImplementation(name => {
        const inputs = {
          token: 'test-token',
          'approve-command': '✅ LGTM!',
          'team-name': 'approver-team',
          'fail-if-approval-not-found': 'true',
          'post-successful-approval-comment': 'true',
          'successful-approval-comment': ':tada: Approved!'
        };
        return inputs[name] || '';
      });

      mockOctokit.paginate.mockResolvedValueOnce([{ login: 'team-member' }]);

      mockOctokit.paginate.mockResolvedValueOnce([
        {
          id: 1,
          body: '✅ LGTM!',
          user: { login: 'team-member' }
        }
      ]);

      mockOctokit.rest.issues.createComment.mockResolvedValue({});

      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('approved', 'true');
    });

    test('should find approval in issue with 100+ comments (pagination)', async () => {
      mockOctokit.paginate.mockResolvedValueOnce([{ login: 'team-member' }]);

      // Create 150 comments, with approval in comment #142
      const manyComments = [
        ...Array(141)
          .fill()
          .map((_, i) => ({
            id: i + 1,
            body: `Just a regular comment ${i}`,
            user: { login: 'other-user' }
          })),
        {
          id: 142,
          body: '/approve',
          user: { login: 'team-member' }
        },
        ...Array(8)
          .fill()
          .map((_, i) => ({
            id: 143 + i,
            body: `Another comment ${i}`,
            user: { login: 'other-user' }
          }))
      ];

      mockOctokit.paginate.mockResolvedValueOnce(manyComments);

      mockOctokit.rest.issues.createComment.mockResolvedValue({});

      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('approved', 'true');
      expect(mockCore.info).toHaveBeenCalledWith(expect.stringContaining('comment id 142'));
    });

    test('should not approve when approval command is part of larger text', async () => {
      mockOctokit.paginate.mockResolvedValueOnce([{ login: 'team-member' }]);

      mockOctokit.paginate.mockResolvedValueOnce([
        {
          id: 1,
          body: 'I do not /approve this PR',
          user: { login: 'team-member' }
        }
      ]);

      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('approved', 'false');
      expect(mockCore.setFailed).toHaveBeenCalled();
    });

    test('should not approve when approval command is in code block', async () => {
      mockOctokit.paginate.mockResolvedValueOnce([{ login: 'team-member' }]);

      mockOctokit.paginate.mockResolvedValueOnce([
        {
          id: 1,
          body: 'To approve, run:\n```\n/approve\n```',
          user: { login: 'team-member' }
        }
      ]);

      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('approved', 'false');
      expect(mockCore.setFailed).toHaveBeenCalled();
    });

    test('should handle multiple team members with same approval command', async () => {
      mockOctokit.paginate.mockResolvedValueOnce([{ login: 'team-member-1' }, { login: 'team-member-2' }]);

      mockOctokit.paginate.mockResolvedValueOnce([
        {
          id: 1,
          body: '/approve',
          user: { login: 'team-member-1' }
        },
        {
          id: 2,
          body: '/approve',
          user: { login: 'team-member-2' }
        }
      ]);

      mockOctokit.rest.issues.createComment.mockResolvedValue({});

      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('approved', 'true');
      // Should find the first approval
      expect(mockCore.info).toHaveBeenCalledWith(expect.stringContaining('comment id 1'));
    });

    test('should handle case-sensitive approval command', async () => {
      mockOctokit.paginate.mockResolvedValueOnce([{ login: 'team-member' }]);

      mockOctokit.paginate.mockResolvedValueOnce([
        {
          id: 1,
          body: '/APPROVE',
          user: { login: 'team-member' }
        }
      ]);

      await run();

      // Should not approve - case sensitive
      expect(mockCore.setOutput).toHaveBeenCalledWith('approved', 'false');
      expect(mockCore.setFailed).toHaveBeenCalled();
    });

    test('should not post comment when post-successful-approval-comment is false', async () => {
      mockCore.getInput.mockImplementation(name => {
        const inputs = {
          token: 'test-token',
          'approve-command': '/approve',
          'team-name': 'approver-team',
          'fail-if-approval-not-found': 'true',
          'post-successful-approval-comment': 'false',
          'successful-approval-comment': ':tada: Approved!'
        };
        return inputs[name] || '';
      });

      mockOctokit.paginate.mockResolvedValueOnce([{ login: 'team-member' }]);

      mockOctokit.paginate.mockResolvedValueOnce([
        {
          id: 1,
          body: '/approve',
          user: { login: 'team-member' }
        }
      ]);

      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('approved', 'true');
      expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
    });

    test('should handle empty comments list', async () => {
      mockOctokit.paginate.mockResolvedValueOnce([{ login: 'team-member' }]);

      mockOctokit.paginate.mockResolvedValueOnce([]);

      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('approved', 'false');
      expect(mockCore.setFailed).toHaveBeenCalled();
    });

    test('should handle unicode and emoji in approval command', async () => {
      mockCore.getInput.mockImplementation(name => {
        const inputs = {
          token: 'test-token',
          'approve-command': '👍 承認',
          'team-name': 'approver-team',
          'fail-if-approval-not-found': 'true',
          'post-successful-approval-comment': 'true',
          'successful-approval-comment': ':tada: Approved!'
        };
        return inputs[name] || '';
      });

      mockOctokit.paginate.mockResolvedValueOnce([{ login: 'team-member' }]);

      mockOctokit.paginate.mockResolvedValueOnce([
        {
          id: 1,
          body: '👍 承認',
          user: { login: 'team-member' }
        }
      ]);

      mockOctokit.rest.issues.createComment.mockResolvedValue({});

      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('approved', 'true');
    });
  });
});
