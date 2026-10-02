#!/usr/bin/env bash

# agent-teams-playbook Installation Script
# Version: V4.8.0
# Description: Installs the agent-teams-playbook Skill for Claude Code, Codex, OpenClaw, or Cursor
# Note: "swarm/蜂群" is generic; Claude Code's official concept is "Agent Teams"

set -e

# Same-filesystem stage -> backup -> rename, following semgrep-skill/install.py.
# Backups preserve the entire previous install, including user additions.
TX_STAGE=""
TX_BACKUP=""
TX_TARGET=""
TX_LOCK=""
TX_OLD_MOVED=0
TX_PROMOTED=0
TX_COMMITTED=0

VERSION="V4.8.0"
SKILL_NAME="agent-teams-playbook"
GITHUB_REPO="KimYx0207/Kim_Service"
GITHUB_BRANCH="main"
GITHUB_COMPONENT_PATH="skills/agent-teams-playbook"
INSTALL_TARGET="claude"
INSTALL_SOURCE="local"

CLAUDE_SKILLS_DIR="${CLAUDE_SKILLS_DIR:-${HOME}/.claude/skills}"
CODEX_SKILLS_DIR="${CODEX_SKILLS_DIR:-${HOME}/.codex/skills}"
OPENCLAW_SKILLS_DIR="${OPENCLAW_SKILLS_DIR:-${HOME}/.agents/skills}"
CURSOR_SKILLS_DIR="${CURSOR_SKILLS_DIR:-${HOME}/.cursor/skills}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

show_help() {
    cat << EOF
agent-teams-playbook Installation Script ${VERSION}

USAGE:
    ./install.sh [OPTIONS]

OPTIONS:
    -h, --help              Show this help message
    -v, --version           Show version information
    -t, --target TARGET     Install target: claude, codex, openclaw, cursor, all
    --from-github           Download the target runtime skill package from GitHub main.
                            Default: copy from the local checkout.

DESCRIPTION:
    Installs the agent-teams-playbook Skill by:
    1. Detecting your operating system
    2. Validating the destination and creating a sibling staging directory
    3. Copying the target runtime skill package from the local checkout
       or downloading them from GitHub with --from-github
    4. Verifying all staged files before replacing the installation
    5. Optionally enabling Claude Code fork mode before promotion
       Existing installs require confirmation and are retained in a sibling backup.
       Each --target all destination is an independent transaction.

EXAMPLES:
    ./install.sh                         # Install for Claude Code
    ./install.sh --target codex          # Install for Codex
    ./install.sh --target openclaw       # Install for OpenClaw
    ./install.sh --target cursor         # Install for Cursor
    ./install.sh --target all            # Install for all supported targets
    ./install.sh --target all --from-github
    CODEX_SKILLS_DIR=/path/to/skills ./install.sh --target codex

EOF
}

show_version() {
    echo "agent-teams-playbook Installation Script ${VERSION}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--version)
            show_version
            exit 0
            ;;
        -t|--target)
            if [[ -z "${2:-}" ]]; then
                print_error "--target requires a value"
                exit 1
            fi
            INSTALL_TARGET="$2"
            shift
            ;;
        --target=*)
            INSTALL_TARGET="${1#*=}"
            ;;
        --from-github)
            INSTALL_SOURCE="github"
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
    shift
done

target_dir() {
    case "$1" in
        claude) echo "${CLAUDE_SKILLS_DIR%/}/${SKILL_NAME}" ;;
        codex) echo "${CODEX_SKILLS_DIR%/}/${SKILL_NAME}" ;;
        openclaw) echo "${OPENCLAW_SKILLS_DIR%/}/${SKILL_NAME}" ;;
        cursor) echo "${CURSOR_SKILLS_DIR%/}/${SKILL_NAME}" ;;
        *)
            print_error "Unsupported target: $1" >&2
            print_error "Supported targets: claude, codex, openclaw, cursor, all" >&2
            return 1
            ;;
    esac
}

# Feature 1: OS Detection
detect_os() {
    print_header "Step 1: Detecting Operating System"

    local os_type=""
    local os_name=""

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        os_type="Linux"
        os_name=$(uname -s)
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        os_type="macOS"
        os_name="macOS $(sw_vers -productVersion 2>/dev/null || echo 'Unknown')"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        os_type="Windows (Git Bash/MSYS)"
        os_name="Windows"
    elif grep -qi microsoft /proc/version 2>/dev/null; then
        os_type="Windows (WSL)"
        os_name="WSL $(uname -r)"
    else
        os_type="Unknown"
        os_name="$OSTYPE"
    fi

    print_info "Detected OS: ${os_type}"
    print_info "System: ${os_name}"
    echo
}

# Do not follow symlinks or accept ambiguous/over-broad destination paths.
validate_target() {
    local install_dir="$1"
    local cursor="$install_dir"
    case "$install_dir" in
        /*) ;;
        *) print_error "Skills root must be an absolute path"; return 1 ;;
    esac
    case "$install_dir" in
        *'/../'*|*'/./'*|*'//'*|*$'\n'*|*$'\r'*)
            print_error "Unsafe destination path: $install_dir"; return 1 ;;
    esac
    if [ "${install_dir%/*}" = "" ] || [ "${install_dir%/*}" = "/" ]; then
        print_error "Refusing to install directly at the filesystem root"; return 1
    fi
    while [ -n "$cursor" ] && [ "$cursor" != "/" ]; do
        if [ -L "$cursor" ]; then
            print_error "Destination must not contain a symlink: $cursor"; return 1
        fi
        if [ -e "$cursor" ] && [ ! -d "$cursor" ]; then
            print_error "Destination component is not a directory: $cursor"; return 1
        fi
        cursor="${cursor%/*}"
    done
}

cleanup_transaction() {
    local status=$?
    trap - EXIT HUP INT TERM
    if [ "$status" -ne 0 ] && [ "$TX_COMMITTED" = 0 ]; then
        # Move a failed promotion back to the private stage, never delete a live
        # destination. If recovery fails, retain every directory for inspection.
        if [ "$TX_PROMOTED" = 1 ] && [ -e "$TX_TARGET" ] && [ ! -e "$TX_STAGE" ]; then
            if mv "$TX_TARGET" "$TX_STAGE"; then
                TX_PROMOTED=0
            else
                print_error "Recovery blocked; preserve target $TX_TARGET and backup $TX_BACKUP" >&2
                TX_STAGE=""
            fi
        fi
        if [ "$TX_OLD_MOVED" = 1 ] && [ ! -e "$TX_TARGET" ] && [ ! -L "$TX_TARGET" ]; then
            if mv "$TX_BACKUP/previous" "$TX_TARGET"; then
                print_warning "Previous installation restored after failure" >&2
                TX_OLD_MOVED=0
            else
                print_error "Restore failed; previous installation is safe at $TX_BACKUP/previous" >&2
            fi
        fi
    fi
    if [ -n "$TX_STAGE" ] && [ -d "$TX_STAGE" ]; then
        rm -rf "$TX_STAGE"
    fi
    if [ -n "$TX_BACKUP" ]; then
        rmdir "$TX_BACKUP" 2>/dev/null || true
    fi
    if [ -n "$TX_LOCK" ]; then
        rmdir "$TX_LOCK" 2>/dev/null || true
    fi
    exit "$status"
}

begin_transaction() {
    local install_dir="$1"
    validate_target "$install_dir"
    local parent="${install_dir%/*}"
    mkdir -p "$parent"
    # mkdir is also a portable, per-destination concurrent-installer lock.
    local lock="$parent/.${SKILL_NAME}.install-lock"
    if ! mkdir "$lock"; then
        print_error "Another install or interrupted transaction holds $lock"; return 1
    fi
    TX_LOCK="$lock"
    TX_TARGET="$install_dir"
    TX_COMMITTED=0
    trap cleanup_transaction EXIT
    trap 'exit 129' HUP
    trap 'exit 130' INT
    trap 'exit 143' TERM
    TX_STAGE=$(mktemp -d "$parent/.${SKILL_NAME}.stage.XXXXXX")
    print_info "Preparing complete package in $TX_STAGE"
}

promote_transaction() {
    validate_target "$TX_TARGET"
    if [ -d "$TX_TARGET" ]; then
        print_warning "Existing user changes/additions will be kept only in the backup, not merged into the new active install."
        local reply=""
        read -r -p "Replace it and keep a backup? (y/N): " reply || true
        echo
        if [[ ! $reply =~ ^[Yy]$ ]]; then
            print_error "Installation aborted; existing files are unchanged"; return 1
        fi
        TX_BACKUP=$(mktemp -d "${TX_TARGET%/*}/.${SKILL_NAME}.backup.XXXXXX")
        # Arm recovery before rename so a signal immediately after mv is safe.
        TX_OLD_MOVED=1
        mv "$TX_TARGET" "$TX_BACKUP/previous"
    fi
    TX_PROMOTED=1
    mv "$TX_STAGE" "$TX_TARGET"
    verify_installation "$TX_TARGET"
    # One state assignment commits the verified target, including signal handling.
    TX_COMMITTED=1
    if [ -n "$TX_BACKUP" ]; then
        print_info "Previous installation (including user changes): $TX_BACKUP/previous"
    fi
    # Commit only after the final verification. No backup is removed on success.
    TX_OLD_MOVED=0
    TX_PROMOTED=0
    TX_STAGE=""
    TX_BACKUP=""
    TX_TARGET=""
    rmdir "$TX_LOCK"
    TX_LOCK=""
    trap - EXIT HUP INT TERM
}

package_subdir_for_target() {
    echo ""
}

# Feature 3: File Download
copy_local_files() {
    local install_dir="$1"
    local target="$2"
    print_header "Step 3: Copying Files from Local Checkout"

    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local repo_dir
    repo_dir="$(cd "${script_dir}/.." && pwd)"
    local package_subdir
    package_subdir="$(package_subdir_for_target "${target}")"
    local source_dir="${repo_dir}"
    if [ -n "${package_subdir}" ] && [ -d "${repo_dir}/${package_subdir}" ]; then
        source_dir="${repo_dir}/${package_subdir}"
    fi
    local files=("SKILL.md" "README.md")

    for file in "${files[@]}"; do
        local source="${source_dir}/${file}"
        local output="${install_dir}/${file}"

        print_info "Copying ${file}..."

        if [ ! -f "${source}" ] || [ -L "${source}" ]; then
            print_error "Local source file not found: ${source}"
            exit 1
        fi

        cp "${source}" "${output}"
        print_success "${file} copied successfully"
    done

    echo
}

download_files() {
    local install_dir="$1"
    local target="$2"
    print_header "Step 3: Downloading Files from GitHub"

    local package_subdir
    package_subdir="$(package_subdir_for_target "${target}")"
    local base_url="https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${GITHUB_COMPONENT_PATH}"
    if [ -n "${package_subdir}" ]; then
        base_url="${base_url}/${package_subdir}"
    fi
    local files=("SKILL.md" "README.md")
    local download_cmd=""

    # Determine download command (curl with fallback to wget)
    if command -v curl &> /dev/null; then
        download_cmd="curl"
        print_info "Using curl for downloads"
    elif command -v wget &> /dev/null; then
        download_cmd="wget"
        print_info "Using wget for downloads"
    else
        print_error "Neither curl nor wget found. Please install one of them."
        exit 1
    fi

    echo

    for file in "${files[@]}"; do
        local url="${base_url}/${file}"
        local output="${install_dir}/${file}"

        print_info "Downloading ${file}..."

        if [ "$download_cmd" = "curl" ]; then
            if curl -fsSL -o "${output}" "${url}"; then
                print_success "${file} downloaded successfully"
            else
                print_error "Failed to download ${file}"
                print_error "URL: ${url}"
                exit 1
            fi
        else
            if wget -q -O "${output}" "${url}"; then
                print_success "${file} downloaded successfully"
            else
                print_error "Failed to download ${file}"
                print_error "URL: ${url}"
                exit 1
            fi
        fi
    done

    echo
}

# Feature 4: Installation Verification
verify_installation() {
    local install_dir="$1"
    print_header "Step 4: Verifying Installation"

    local files=("SKILL.md" "README.md")
    local all_valid=true

    for file in "${files[@]}"; do
        local filepath="${install_dir}/${file}"

        if [ ! -f "${filepath}" ] || [ -L "${filepath}" ]; then
            print_error "${file} does not exist"
            all_valid=false
        elif [ ! -s "${filepath}" ]; then
            print_error "${file} is empty"
            all_valid=false
        else
            local filesize=$(wc -c < "${filepath}" | tr -d ' ')
            local filesize_kb=$((filesize / 1024))
            print_success "${file} verified (${filesize} bytes / ${filesize_kb} KB)"
        fi
    done

    echo

    if [ -f "${install_dir}/SKILL.md" ] &&
       { [ "$(head -n 1 "${install_dir}/SKILL.md")" != "---" ] ||
         ! grep -q '^name: agent-teams-playbook$' "${install_dir}/SKILL.md"; }; then
        print_error "SKILL.md is not an agent-teams-playbook package"
        all_valid=false
    fi

    if [ "$all_valid" = true ]; then
        print_success "All files verified successfully!"
        return 0
    else
        print_error "Installation verification failed"
        return 1
    fi
}

# Feature 5: Fork Mode Prompt
configure_fork_mode() {
    local install_dir="$1"
    local target="$2"

    if [ "${target}" != "claude" ]; then
        print_header "Step 5: Fork Mode Configuration"
        print_info "Fork mode is a Claude Code-specific frontmatter option; skipping for ${target}."
        echo
        return 0
    fi

    print_header "Step 5: Fork Mode Configuration"

    print_info "Fork mode runs the skill in an isolated context."
    print_info "This prevents context pollution but increases token usage."
    echo

    REPLY=""
    read -p "Do you want to enable fork mode? (y/N): " -r || true
    echo
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        local skill_file="${install_dir}/SKILL.md"

        # Check if context: fork already exists
        if grep -q "^context:" "${skill_file}"; then
            print_warning "Fork mode configuration already exists in SKILL.md"
            print_info "Updating existing configuration..."

            # Use sed to replace existing context line
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS sed requires empty string after -i
                sed -i '' 's/^context:.*$/context: fork/' "${skill_file}"
            else
                sed -i 's/^context:.*$/context: fork/' "${skill_file}"
            fi
        else
            # Add context: fork on line 2 (right after opening ---)
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' '1a\
context: fork
' "${skill_file}"
            else
                sed -i '1a context: fork' "${skill_file}"
            fi
        fi

        print_success "Fork mode enabled"
    else
        print_info "Fork mode disabled (default)"
    fi

    echo
}

# Main installation flow
main() {
    echo
    print_header "agent-teams-playbook Installation ${VERSION}"
    echo

    detect_os

    local targets=()
    case "${INSTALL_TARGET}" in
        all)
            targets=("claude" "codex" "openclaw" "cursor")
            ;;
        claude|codex|openclaw|cursor)
            targets=("${INSTALL_TARGET}")
            ;;
        *)
            print_error "Unsupported target: ${INSTALL_TARGET}"
            print_error "Supported targets: claude, codex, openclaw, cursor, all"
            exit 1
            ;;
    esac

    local installed_locations=()

    for target in "${targets[@]}"; do
        local install_dir
        install_dir=$(target_dir "${target}") || exit 1

        print_header "Installing for ${target}"
        begin_transaction "${install_dir}"
        if [ "${INSTALL_SOURCE}" = "github" ]; then
            download_files "$TX_STAGE" "${target}"
        else
            copy_local_files "$TX_STAGE" "${target}"
        fi
        verify_installation "$TX_STAGE"
        configure_fork_mode "$TX_STAGE" "${target}"
        verify_installation "$TX_STAGE"
        promote_transaction
        installed_locations+=("${target}: ${install_dir}")
    done

    print_header "Installation Complete!"
    print_success "agent-teams-playbook skill installed successfully"
    echo
    print_info "Installation locations:"
    for location in "${installed_locations[@]}"; do
        print_info "  - ${location}"
    done
    echo
}

# Run main installation
main
