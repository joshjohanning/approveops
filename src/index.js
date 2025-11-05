import * as core from '@actions/core';
import * as github from '@actions/github';

/**
 * Normalize command text by removing all whitespace
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeCommand(text) {
  return text.replace(/\s/g, '');
}

/**
 * Get all comments for an issue with pagination
 * @param {object} octokit - Octokit instance
 * @param {object} context - GitHub context
 * @returns {Promise<Array>} All comments
 */
async function getAllComments(octokit, context) {
  return octokit.paginate(octokit.rest.issues.listComments, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    per_page: 100
  });
}

/**
 * Get all team members with pagination
 * @param {object} octokit - Octokit instance
 * @param {string} org - Organization name
 * @param {string} teamSlug - Team slug/name
 * @returns {Promise<Array>} All team member logins
 */
async function getTeamMembers(octokit, org, teamSlug) {
  try {
    const members = await octokit.paginate(octokit.rest.teams.listMembersInOrg, {
      org: org,
      team_slug: teamSlug,
      per_page: 100
    });

    return members.map(member => member.login);
  } catch (error) {
    if (error.status === 404) {
      throw new Error(`Team '${teamSlug}' doesn't exist or the token doesn't have access to it`);
    }
    throw error;
  }
}

/**
 * Post a comment to the issue
 * @param {object} octokit - Octokit instance
 * @param {object} context - GitHub context
 * @param {string} body - Comment body
 */
async function postComment(octokit, context, body) {
  await octokit.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    body: body
  });
}

/**
 * Main function
 */
async function run() {
  try {
    // Get inputs
    const token = core.getInput('token', { required: true });
    const approveCommand = core.getInput('approve-command', { required: true });
    const teamName = core.getInput('team-name', { required: true });
    const failIfApprovalNotFound = core.getInput('fail-if-approval-not-found', { required: true }) === 'true';
    const postSuccessfulApprovalComment =
      core.getInput('post-successful-approval-comment', { required: true }) === 'true';
    const successfulApprovalComment = core.getInput('successful-approval-comment', { required: true });

    // Initialize Octokit
    const octokit = github.getOctokit(token);
    const context = github.context;

    core.info(`Checking for '${approveCommand}' command in comments from someone in the '${teamName}' team`);

    // Get team membership
    core.info(`Getting team membership for: @${context.repo.owner}/${teamName}...`);
    const teamMemberLogins = await getTeamMembers(octokit, context.repo.owner, teamName);
    const teamMembers = new Set(teamMemberLogins);
    core.info(`Found ${teamMemberLogins.length} team members`);

    // Get all comments
    const comments = await getAllComments(octokit, context);
    core.info(`Found ${comments.length} comments to check`);

    // Check for approval command from team members
    let authorized = false;

    for (const comment of comments) {
      const normalizedBody = normalizeCommand(comment.body);
      const actor = comment.user.login;
      const commentId = comment.id;

      core.debug(`Checking comment id ${commentId} from ${actor}`);

      if (normalizedBody === normalizeCommand(approveCommand)) {
        core.debug(`Approval command found in comment id ${commentId}`);
        if (teamMembers.has(actor)) {
          core.info(`Approval authorized by ${actor} in comment id ${commentId}`);
          authorized = true;
          break;
        } else {
          core.debug(`User ${actor} is not in team: ${teamName}`);
        }
      }
    }

    // Log completion
    if (!authorized) {
      core.info('No authorized approval found in comments');
    }

    // Set output
    core.setOutput('approved', authorized.toString());

    if (authorized) {
      // Post successful approval comment if requested
      if (postSuccessfulApprovalComment) {
        const commentBody = `Hey, @${context.payload.comment.user.login}!\n${successfulApprovalComment}`;
        await postComment(octokit, context, commentBody);
      }
    } else {
      // Post rejection comment
      const isFailure = failIfApprovalNotFound;
      const statusLine = isFailure
        ? `_:no_entry_sign: :no_entry: Marking the [workflow run](${context.payload.repository.html_url}/actions/runs/${context.runId}) as failed_`
        : `_:warning: :pause_button: See [workflow run](${context.payload.repository.html_url}/actions/runs/${context.runId}) for reference_`;

      const commentBody = `Hey, @${context.payload.comment.user.login}!
:cry: No one approved your run yet! Have someone from the @${context.repo.owner}/${teamName} team ${isFailure ? 'comment' : 'run'} \`${approveCommand}\` and then try your command again

${statusLine}`;

      await postComment(octokit, context, commentBody);

      // Set notice or fail
      if (!failIfApprovalNotFound) {
        core.notice(
          `There is no ${approveCommand} command in the comments from someone in the @${context.repo.owner}/${teamName} team`
        );
      } else {
        core.setFailed(
          `There is no ${approveCommand} command in the comments from someone in the @${context.repo.owner}/${teamName} team`
        );
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

// Export functions for testing
export { normalizeCommand, getAllComments, getTeamMembers, postComment, run };

run();
