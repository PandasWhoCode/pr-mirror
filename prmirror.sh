# Create PR method will create a PR in the specified github organization & repo
# against the base branch specified when the prmirror.sh script was called. The
# PR will be titled "chore: PR-[PR-NUMBER]. The PR will automatically be assigned
# to the user currently authenticated with the Github CLI Tool (gh).
createpr() {
    gitbranch=$(git rev-parse --abbrev-ref HEAD)
    gh pr create -a ${GITHUB_UNAME} -B ${BASE} --fill-verbose -H ${gitbranch} -R "${ORG}/${REPO}" -t "chore:Mirror PR-${NUMBER}"
}

# The Sync method will synchronize the local repository with the remote
sync() {
    # Clean up mirror-repo directory if it exists
    if [[ -d "mirror-repo" ]]; then
        rm -rf mirror-repo
    fi

    # clone the repo and navigate into it.
    git clone "git@github.com:${ORG}/${REPO}" mirror-repo && cd mirror-repo

    # Fetch the latest PR head into a temp branch
    git fetch origin pull/"${NUMBER}"/head:pr-temp

    # Checkout the mirror branch
    git checkout "mirror/pr-${NUMBER}"

    # Hard reset the mirror branch to match the PR head
    git reset --hard pr-temp

    # Add the sync commit
    git commit --allow-empty -sS -m "chore: mirror pr-${NUMBER} (sync)"

    # Force-push the updated mirror branch
    git push -f origin "mirror/pr-${NUMBER}"
}

# The Mirror method performs the mirroring functionality necessary to set up a new branch
# within the github repository with all changes from the originating PR.
mirror() {
    # Clean up mirror-repo directory if it exists
    if [[ -d "mirror-repo" ]]; then
        rm -rf mirror-repo
    fi

    # clone the repo and navigate into it.
    git clone "git@github.com:${ORG}/${REPO}" mirror-repo && cd mirror-repo

    # fetch the pull request and add to a temporary branch
    git fetch origin pull/"${NUMBER}"/head:pr-temp

    # checkout the mirror branch
    git checkout pr-temp
    git checkout -b "mirror/pr-${NUMBER}"

    # push an empty commit for traceability 
    git commit --allow-empty -sS -m "chore: mirror pr-${NUMBER}"
    git push -u origin "mirror/pr-${NUMBER}"
}

# This is the main method of this file. It does argument parsing and gathers
# necessary information for mirroring a PR. It also will ensure environment
# variables are properly configured.
prmirror() {
    NUMBER=0
    SYNC=0
    while getopts "b:n:o:r:s" opt; do
        case $opt in
            (b) BASE="${OPTARG}" ;;
            (n) NUMBER="${OPTARG}" ;;
            (o) ORG="${OPTARG}" ;;
            (r) REPO="${OPTARG}" ;;
            (s) SYNC=1 ;;
            (*) echo "Usage $0 -n NUMBER -b BASE -o ORG -r REPO [-s]" >&2
                return 1 ;;
        esac
    done

    if [[ -z "${BASE}" ]]; then
        echo "BASE branch is required."
        return 1
    fi

    if [[ ${NUMBER} -le 0 ]]; then
        echo "PR Number is required."
        return 1
    fi

    if which gh | grep -q "No such file or directory"; then
        echo "The github cli tool 'gh' must be installed."
        return 1
    fi

    if [[ -z "${ORG}" ]]; then
        echo "Organization is required."
        return 1
    fi

    if [[ -z "${REPO}" ]]; then
        echo "Repository is required."
        return 1
    fi
    
    # The GITHUB_TOKEN and GITHUB_UNAME environment variables
    # are used when creating the PR.
    export GITHUB_TOKEN=$(gh auth token)
    export GITHUB_UNAME=$(gh api user --jq .login)

    if [[ ${SYNC} -eq 1 ]]; then
        sync
    else
        # Call the mirror method
        mirror

        # Call the create PR method
        createpr
    fi

    # Navigate back to the project root.
    cd ..
}

# Call the prmirror main method with all arguments passed to the script
prmirror $@
