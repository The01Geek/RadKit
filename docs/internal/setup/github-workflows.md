# GitHub Actions Workflows

RadKit uses two Claude-powered GitHub Actions workflows for PR assistance and automated code review.

## Claude PR Assistant (`claude.yml`)

A read-only assistant that responds when `@claude` is mentioned in issues, PR comments, or PR reviews.

### Triggers

| Event | Condition |
|-------|-----------|
| `issue_comment` | Comment body contains `@claude` |
| `pull_request_review_comment` | Comment body contains `@claude` |
| `pull_request_review` | Review body contains `@claude` |
| `issues` (opened, assigned) | Issue body or title contains `@claude` |

### Permissions

All permissions are **read-only**:
- `contents: read`
- `pull-requests: read`
- `issues: read`
- `id-token: write` (required for Claude Code OAuth)
- `actions: read` (allows Claude to read CI results)

### Configuration

- Uses `anthropics/claude-code-action@v1`
- Authenticates via the `CLAUDE_CODE_OAUTH_TOKEN` repository secret
- No plugins, tool allowlists, or write permissions are configured — the workflow operates in a read-only advisory capacity

## Claude Code Review (`claude-code-review.yml`)

Automated code review that runs on every pull request update.

### Triggers

| Event | Types |
|-------|-------|
| `pull_request` | `opened`, `synchronize`, `ready_for_review`, `reopened` |

### Permissions

- `contents: read`
- `pull-requests: read`
- `issues: read`
- `id-token: write`

### Configuration

- Uses `anthropics/claude-code-action@v1` with the `code-review` plugin from the `anthropics/claude-code.git` marketplace
- Authenticates via the `CLAUDE_CODE_OAUTH_TOKEN` repository secret
- Runs the `/code-review:code-review` skill against the PR

## Required Secrets

| Secret | Purpose |
|--------|---------|
| `CLAUDE_CODE_OAUTH_TOKEN` | OAuth token for Claude Code Action authentication (used by both workflows) |
