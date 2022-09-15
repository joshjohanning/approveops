# ApproveOps Action

Approvals in IssueOps

See the following guide on this action: https://josh-ops.com/posts/github-approveops/

## Usage

```yml
- name: ApproveOps - Approvals in IssueOps
  uses: joshjohanning/approveops@v1
  id: check-approval
  with:
    app-id: 170284 # The GitHub App ID; ie: 170284
    app-private-key: ${{ secrets.PRIVATE_KEY }} # Private key for the GitHub App that is installed on the repo; e.g.: ${{ secrets.PRIVATE_KEY }}
    team-name: approver-team # The name of the team in GitHub to check for the approval command; e.g.: approver-team
    fail-if-approval-not-found: false # Fail the action (show the action run as red) if the command is not found in the comments from someone in the approver team"
    post-successful-approval-comment: true # Boolean whether to post successful approval comment
    successful-approval-comment: ':tada:  You were able to run the workflow because someone left an approval in the comments!! :tada:' # Comment to post if there is an approval is found
```

## Prerequisites

1. Create a GitHub team and add at least one member
1. You will need a Github App with the following permissions:
   - **read-only** on `Organization / Members` to list the members of the team
   - **read & write** on `Repository / Issues` to create the comment
1. Generate a `PRIVATE_KEY` for the GitHub app and store it as a repo or organizational secret
1. Capture the `APP ID` to use as an input for this action

See the following guide on creating a GitHub app: https://josh-ops.com/posts/github-apps/

Notes: 
- A Personal Access Token (PAT) is not used since we want the comment to show as from a bot
- The `github.token` is not used since the token can't provide hyperlinks for @ mentions since it doesn't have the scope for org teams, only repository data

## Screenshots

![approveops](https://user-images.githubusercontent.com/19912012/154545687-8d64a775-eec2-4ec7-90dc-901b2d6d39a5.png)

![workflow](https://user-images.githubusercontent.com/19912012/154543171-33551f48-3026-4737-b8b7-7c427a7a8cd8.png)
