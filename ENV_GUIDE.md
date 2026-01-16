# Environment Variables Guide

This document explains how to use environment variables with PR Mirror to set default values and simplify your workflow.

## Quick Start

1. **Copy the example file:**

   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your defaults:**

   ```bash
   # Uncomment and set your common values
   DEFAULT_ORG=PandasWhoCode
   DEFAULT_REPO=pr-mirror
   DEFAULT_BASE=main
   ```

3. **Run with fewer arguments:**

   ```bash
   # Without .env - you need all flags
   prmirror -n 123 -b main -o PandasWhoCode -r pr-mirror

   # With .env defaults - just PR number needed!
   prmirror -n 123
   ```

## Available Environment Variables

### Default Configuration

| Variable       | Description                 | Example         |
| -------------- | --------------------------- | --------------- |
| `DEFAULT_ORG`  | Default GitHub organization | `PandasWhoCode` |
| `DEFAULT_REPO` | Default repository name     | `pr-mirror`     |
| `DEFAULT_BASE` | Default base branch for PRs | `main`          |

**Note:** Command-line arguments always take precedence over environment variables.

### GitHub Authentication

| Variable       | Description                 | Set By               |
| -------------- | --------------------------- | -------------------- |
| `GITHUB_TOKEN` | GitHub authentication token | Auto (from `gh` CLI) |
| `GITHUB_UNAME` | GitHub username             | Auto (from `gh` CLI) |

**Note:** These are automatically retrieved from GitHub CLI during runtime. You don't need to set them manually.

### Git Configuration (Optional)

| Variable              | Description                 | Example            |
| --------------------- | --------------------------- | ------------------ |
| `GIT_AUTHOR_NAME`     | Git author name for commits | `John Doe`         |
| `GIT_AUTHOR_EMAIL`    | Git author email            | `john@example.com` |
| `GIT_COMMITTER_NAME`  | Git committer name          | `John Doe`         |
| `GIT_COMMITTER_EMAIL` | Git committer email         | `john@example.com` |

### Debug Mode

| Variable | Description            | Values            |
| -------- | ---------------------- | ----------------- |
| `DEBUG`  | Enable verbose logging | `true` or `false` |

When enabled, shows detailed command execution logs.

## Usage Examples

### Example 1: Organization-Specific Defaults

If you always work with the same organization:

**.env:**

```bash
DEFAULT_ORG=MyCompany
DEFAULT_BASE=develop
```

**Usage:**

```bash
# Short form - only specify PR number and repo
prmirror -n 42 -r backend-api

# Instead of the full form:
prmirror -n 42 -b develop -o MyCompany -r backend-api
```

### Example 2: Repository-Specific Defaults

For a specific repository you mirror frequently:

**.env:**

```bash
DEFAULT_ORG=hashgraph
DEFAULT_REPO=hedera-services
DEFAULT_BASE=main
```

**Usage:**

```bash
# Minimal command - just the PR number!
prmirror -n 123

# Sync mode
prmirror -n 123 -s
```

### Example 3: Debug Mode

Troubleshooting or development:

**.env:**

```bash
DEFAULT_ORG=MyOrg
DEFAULT_REPO=myrepo
DEFAULT_BASE=main
DEBUG=true
```

**Output with DEBUG=true:**

```
[DEBUG] Executing: gh auth token
[DEBUG] Executing: gh api user --jq .login
Cloning repository MyOrg/myrepo...
[DEBUG] Executing: git clone "git@github.com:MyOrg/myrepo" mirror-repo
...
```

### Example 4: Custom Git Identity

Use different Git identity for mirror commits:

**.env:**

```bash
GIT_AUTHOR_NAME=PR Mirror Bot
GIT_AUTHOR_EMAIL=bot@example.com
GIT_COMMITTER_NAME=PR Mirror Bot
GIT_COMMITTER_EMAIL=bot@example.com
```

## Precedence Rules

When the same value is specified in multiple places:

**Priority (highest to lowest):**

1. 🥇 **Command-line arguments** (`-o`, `-r`, `-b`)
2. 🥈 **Environment variables** (`DEFAULT_ORG`, `DEFAULT_REPO`, `DEFAULT_BASE`)
3. 🥉 **Error** (if nothing is set, validation fails)

### Example:

**.env:**

```bash
DEFAULT_BASE=develop
```

**Command:**

```bash
prmirror -n 123 -b staging -o MyOrg -r myrepo
```

**Result:** Base branch will be `staging` (command-line wins)

## Security Best Practices

### ✅ DO:

- Keep `.env` in `.gitignore` (already configured)
- Use `.env.example` to document required variables
- Share `.env.example` in version control
- Use individual `.env` files per developer

### ❌ DON'T:

- Commit `.env` files with real values
- Share your `.env` file publicly
- Store sensitive tokens in `.env` (use `gh` CLI instead)

## Verification

Check if your environment variables are loaded:

```bash
# Set DEBUG mode
echo "DEBUG=true" >> .env

# Run the tool - you'll see [DEBUG] output
prmirror -h
```

## Template for Common Scenarios

### Scenario: Internal Team Repository

**.env:**

```bash
# Team defaults
DEFAULT_ORG=MyCompany
DEFAULT_REPO=main-app
DEFAULT_BASE=develop

# Optional: Debug during setup
# DEBUG=true
```

### Scenario: Open Source Contributor

**.env:**

```bash
# Project defaults
DEFAULT_ORG=hashgraph
DEFAULT_BASE=main

# Vary repo per command - don't set DEFAULT_REPO
```

### Scenario: Multiple Projects

Don't use `.env` for defaults. Instead, use command aliases or scripts:

**~/.zshrc or ~/.bashrc:**

```bash
alias mirror-project-a="prmirror -o MyOrg -r project-a -b main"
alias mirror-project-b="prmirror -o MyOrg -r project-b -b develop"
```

**Usage:**

```bash
mirror-project-a -n 42
mirror-project-b -n 123 -s
```

## Troubleshooting

### Environment variables not loading?

1. Check file name is exactly `.env` (not `.env.txt`)
2. Verify file is in the same directory as `package.json`
3. Enable debug mode to see what's happening:
   ```bash
   DEBUG=true prmirror -n 123
   ```

### Still need to specify all arguments?

1. Check variable names match exactly (case-sensitive)
2. Verify no extra spaces: `DEFAULT_ORG=value` not `DEFAULT_ORG = value`
3. Don't use quotes unless value contains spaces
4. Check file encoding is UTF-8

### Command-line args not overriding .env?

This should work automatically. If not, please file an issue!

## Files

- **`.env`** - Your local configuration (gitignored, not committed)
- **`.env.example`** - Template with documentation (committed to git)
- **`.gitignore`** - Ensures `.env` is never committed

---
