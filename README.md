# PR Mirror

prmirror.sh is a shell script to mirror an existing pull request from a public GitHub repository by:

1. Cloning the repo (via SSH),
2. Fetching the pull request as a local branch,
3. Creating a new branch based on it with an empty signed commit (to distinguish the mirror),
4. Pushing the branch to the same repo,
5. Opening a new pull request (via the GitHub CLI) from the mirrored branch into a specified base branch.

This is useful in scenarios like:

- Creating a filtered or internal mirror of external PRs
- Testing PRs against a different base branch (e.g., staging instead of main)

## Prerequisites

git (must be in PATH)

GitHub CLI (gh) installed and authenticated (via gh auth login)

SSH access to GitHub (git@github.com must be reachable)

## Usage

```bash
./prmirror.sh -n <pr-number> -b <base-branch> -o <org> -r <repo> [-s]
```

### Arguments

| Flag | Description                                                   |
| ---- |---------------------------------------------------------------|
| -n   | (Required) Pull request number to mirror                      |
| -b   | (Required) Base branch to target for the new PR               |
| -o   | (Required) GitHub organization (e.g. PandasWhoCode)           |
| -r   | (Required) GitHub repository name (e.g. pr-mirror)            |
| -s   | (Optional) Sync the mirror-pr branch and update the mirror PR |

## Example (Create new mirror)

```bash
./prmirror.sh -n 42 -b main -o PandasWhoCode -r pr-mirror
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
./prmirror.sh -n 42 -b main -o PandasWhoCode -r pr-mirror -s
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
chore:Mirror PR-42 (sync)
```

And will include all commits from the original PR, along with an empty commit to mark it as mirrored.

## Notes

The script exports `GITHUB_TOKEN` and `GITHUB_UNAME` using the GitHub CLI so that `gh pr create` can assign the author correctly.

The mirror-repo directory is created in the current working directory and not deleted automatically — you can remove it manually after use.

## License

Apache 2.0

