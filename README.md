# PR Mirror

PR Mirror is a CLI tool to mirror an existing pull request from a public GitHub repository by:

1. Cloning the repo (via SSH),
2. Fetching the pull request as a local branch,
3. Creating a new branch based on it with an empty signed commit (to distinguish the mirror),
4. Pushing the branch to the same repo,
5. Opening a new pull request (via the GitHub CLI) from the mirrored branch into a specified base branch.

This is useful in scenarios like:

- Creating a filtered or internal mirror of external PRs
- Testing PRs against a different base branch (e.g., staging instead of main)

## Prerequisites

Node.js (see package engines)

git (must be in PATH)

GitHub CLI (gh) installed and authenticated (via gh auth login)

Git commit signing configured (required). This tool uses `git commit -S` for the tracking commits.

SSH access to GitHub (git@github.com must be reachable)

## Usage

```bash
prmirror [-b <base-branch>] -n <pr-number> -o <org> -r <repo> [-d] [-s] [-v]

# Clean up mirror-repo directory and exit
prmirror -c
```

## Installation

```bash
npm install -g @pandaswhocode/pr-mirror
```

Or run without installing:

```bash
npx @pandaswhocode/pr-mirror -n <pr-number> -b <base-branch> -o <org> -r <repo>
```

### Arguments

| Flag                    | Description                                                                 |
| ----------------------- | --------------------------------------------------------------------------- |
| -b, --base              | Base branch to target for the new PR (defaults to DEFAULT_BASE or `main`)   |
| -c, --clean             | Delete the `mirror-repo` directory and exit (no other arguments are needed) |
| -o, --org               | GitHub organization (can use DEFAULT_ORG env var)                           |
| -r, --repo              | GitHub repository name (can use DEFAULT_REPO env var)                       |
| -s, --sync              | Sync the mirror-pr branch and update the mirror PR                          |
| -d, --deleteAfterAction | Delete the `mirror-repo` directory after a successful create/sync run       |
| -h, --help              | Show help                                                                   |
| -n, --number            | (Required) Pull request number to mirror                                    |
| -v, --verify            | Show resolved inputs and ask for confirmation before proceeding             |

### Environment variables

You can set defaults in a `.env` file in your working directory:

- **DEFAULT_ORG**
- **DEFAULT_REPO**
- **DEFAULT_BASE**
- **DEBUG** (set to `true` for verbose logging)

Note: if `DEFAULT_BASE` is not set and `--base` is not provided, the base branch defaults to `main`.

## Example (Create new mirror)

```bash
prmirror -n 42 -b main -o PandasWhoCode -r pr-mirror
```

To verify the resolved inputs before making any changes:

```bash
prmirror -n 42 -b main -o PandasWhoCode -r pr-mirror -v
```

This will:

- Clone `git@github.com:PandasWhoCode/pr-mirror.git` into a temporary mirror-repo directory
- Fetch pull request #42 into a temporary branch
- Create a new branch mirror/pr-42 from it
- Add an empty signed commit for traceability
- Push mirror/pr-42 to origin
- Open a new pull request targeting main, authored by your GitHub CLI user

### Output

The new PR will be titled:

```text
chore:Mirror PR-42
```

And will include all commits from the original PR, along with an empty commit to mark it as mirrored.

## Example (Sync existing mirror)

```bash
prmirror -n 42 -b main -o PandasWhoCode -r pr-mirror -s
```

This will:

- Clone `git@github.com:PandasWhoCode/pr-mirror.git` into a temporary mirror-repo directory
- Fetch pull request #42 into a temporary branch
- Sync the branch mirror/pr-42 from with the temporary branch
- Add an empty signed commit for traceability
- Push mirror/pr-42 to origin

### Output

The existing mirror PR will be titled:

```text
chore: Mirror PR-42 (sync)
```

The PR will include all commits from the original PR, along with an empty commit to mark it as mirrored.

## Example (Delete mirror-repo after success)

```bash
prmirror -n 42 -b main -o PandasWhoCode -r pr-mirror -d
```

## Example (Clean mode)

This deletes the local `mirror-repo` directory and exits without doing any other work:

```bash
prmirror -c
```

## Notes

The tool exports `GITHUB_TOKEN` and `GITHUB_UNAME` using the GitHub CLI so that `gh pr create` can assign the author correctly.

The mirror-repo directory is created in the current working directory.

## License

Apache 2.0
