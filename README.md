# ApproveOps

Approvals in IssueOps

![approveops](https://josh-ops.com/assets/screenshots/2022-02-08-github-approveops/approveops.png)

See the following guide on this action: https://josh-ops.com/posts/github-approveops/

## Usage

```yml
- name: ApproveOps - ApproveOps in IssueOps
  uses: joshjohanning/ApproveOps@v1.0.0
  id: check-approval
  with:
    app-id: 170284
    app-private-key: ${{ secrets.PRIVATE_KEY }}
    team-name: approver-team
    fail-if-approval-not-found: false
```

## Prerequisites

1. You will need a Github App with the following permissions:
   - **read-only** on `Organization / Members` to list the members of the team
   - **read & write** on `Repository / Issues` to create the comment
1. Generate a `PRIVATE_KEY` for the GitHub app and store it as a repo or organizational secret
1. Capture the `APP ID` to use as an input for this action

See the following guide on creating a GitHub app: https://josh-ops.com/posts/github-apps/
