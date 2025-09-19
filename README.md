# ApproveOps Action

Approvals in IssueOps

See the following guide on this action: https://josh-ops.com/posts/github-approveops/

## Usage

```yml
name: ApproveOps
on:
  issue_comment:
    types: [created]

jobs:
  approveops:
    runs-on: ubuntu-latest
    if: contains(github.event.comment.body, '/do-stuff')

    steps:
      - uses: actions/create-github-app-token@v1
        id: app-token
        with:
          app-id: ${{ vars.APP_ID }}
          private-key: ${{ secrets.PRIVATE_KEY }}

      - name: ApproveOps - Approvals in IssueOps
        uses: joshjohanning/approveops@v2
        id: check-approval
        with:
          token: ${{ steps.app-token.outputs.token }}
          approve-command: "/approve"
          team-name: "approver-team"
          fail-if-approval-not-found: true
          post-successful-approval-comment: false
```

### Inputs

| Name                               | Description                                                                                                                                                                     | Required | Default                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `token`                            | GitHub App installation token or PAT that has access to read+write comments and list the team's membership                                                                      | `true`   | `''`                                                                                             |
| `approve-command`                  | The approval command to look for in the comments                                                                                                                                | `true`   | `/approve`                                                                                       |
| `team-name`                        | The name of the team in GitHub to check for the approval command, e.g. `approver-team`. **Note:** Team must exist in the same organization as the repository running the action | `true`   | `''`                                                                                             |
| `fail-if-approval-not-found`       | Fail the action (show the action run as red) if the command is not found in the comments from someone in the approver team                                                      | `true`   | `true`                                                                                           |
| `post-successful-approval-comment` | Whether to post successful approval comment                                                                                                                                     | `true`   | `true`                                                                                           |
| `successful-approval-comment`      | Comment to post if an approval is found                                                                                                                                         | `true`   | `':tada:  You were able to run the workflow because someone left an approval in the comments!!'` |

## Prerequisites

### Team and Authentication

1. Create a GitHub team and add at least one member
2. Authentication options:

- GitHub App
  - If you are using a GitHub Github App, it will need following permissions:
    - **read & write** on `Repository / Issues` to create the comment
    - **read-only** on `Organization / Members` to list the members of the team
  - Generate a `PRIVATE_KEY` for the GitHub app and store it as a repo or organizational secret
  - Note the `APP ID` to use as an input for an action like `actions/create-github-app-token@v1`
- Classic PAT
  - If you are using a classic PAT, it will need the following scopes:
  - `repo` - to create the comment
  - `read:org` - to list the members of the team
- Fine-grained PAT
  - If you are using a fine-grained PAT, it will need following permissions (same as GitHub App):
    - **read & write** on `Repository / Issues` to create the comment
    - **read-only** on `Organization / Members` to list the members of the team

See the following guide on creating a GitHub app: https://josh-ops.com/posts/github-apps/

Notes:

- A Personal Access Token (PAT) is not used since we want the comment to show as from a bot
- The `github.token` is not used since the token can't provide hyperlinks for @ mentions since it doesn't have the scope for org teams, only repository data

### Runner Software Requirements

No additional software requirements! `v3` of this action now runs natively using Node.js and the GitHub REST API.

## Breaking Changes

### v1 to v2

Extracting the logic for generating a GitHub App's installation token so that you can either use an alternative action or method to retrieve the token or to be able use a GitHub PAT instead.

Added/removed the following inputs:

| Input             | Action  | Required | Note                                                                                                                                                                  |
| ----------------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `token`           | Added   | Yes      | GitHub App installation token or PAT that has access to read+write comments and list the team's membership, e.g.: `${{ steps.get_installation_token.outputs.token }}` |
| `approve-command` | Added   | No       | Optional, defaults to `/approve`, the command to look for in the comments                                                                                             |
| `app-id`          | Removed | Yes      | The app ID for a GitHub App, e.g.: `170284`                                                                                                                           |
| `app-private-key` | Removed | Yes      | The private key for a GitHub App, e.g.: `${{ secrets.APP_PRIVATE_KEY }}`                                                                                              |

Removed the following dependency:

- `tibdex/github-app-token@v1`

## Screenshots

![approveops](https://user-images.githubusercontent.com/19912012/154545687-8d64a775-eec2-4ec7-90dc-901b2d6d39a5.png)

![workflow](https://user-images.githubusercontent.com/19912012/154543171-33551f48-3026-4737-b8b7-7c427a7a8cd8.png)
