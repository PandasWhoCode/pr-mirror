createpr() {
    gitbranch=$(git rev-parse --abbrev-ref HEAD)
    gh pr create -a ${GITHUB_UNAME} -B ${BASE} --fill-verbose -H ${gitbranch} -R "${ORG}/${REPO}" -t "chore:Mirror PR-${NUMBER}"
}

mirror() {
    git clone "git@github.com:${ORG}/${REPO}" mirror-repo && cd mirror-repo
    git fetch origin pull/"${NUMBER}"/head:pr-temp
    git checkout pr-temp
    git checkout -b "mirror/pr-${NUMBER}"
    git commit --allow-empty -sS -m "chore: mirror pr-${NUMBER}"
    git push -u origin "mirror/pr-${NUMBER}"
}

prmirror() {
    NUMBER=0
    while getopts "b:n:o:r:" opt; do
        case $opt in
            (b) BASE="${OPTARG}" ;;
            (n) NUMBER="${OPTARG}" ;;
            (o) ORG="${OPTARG}" ;;
            (r) REPO="${OPTARG}" ;;
            (*) echo "Usage $0 -n NUMBER" >&2
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

    if [[ "$(git rev-parse --is-inside-work-tree)" != "true" ]]; then
        echo "Must execute from within a git repository."
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
    
    export GITHUB_TOKEN=$(gh auth token)
    export GITHUB_UNAME=$(gh api user --jq .login)
    mirror
    createpr

    cd ..
}

prmirror $@
