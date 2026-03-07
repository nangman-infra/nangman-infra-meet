#!/usr/bin/env bash
set -euo pipefail

# Copy this file to scripts/deploy-to-remote.sh and adjust the values below.
readonly HOST="example.com"
readonly SSH_PORT="22"
readonly USERNAME="deploy"
readonly REMOTE_DIR="nangman-infra-meet"
readonly USE_SUDO_FOR_DOCKER=false

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    log_error "'$1' command is required."
    exit 1
  }
}

require_cmd ssh
require_cmd rsync
require_cmd yarn

CONTROL_PATH="${HOME}/.ssh/element-call-ctrl-%r@%h:%p"
mkdir -p "$(dirname "$CONTROL_PATH")"
SSH_OPTS=(
  -p "${SSH_PORT}"
  -o "ControlMaster=auto"
  -o "ControlPath=${CONTROL_PATH}"
  -o "ControlPersist=10m"
)

log_info "Building frontend"
yarn build
log_success "Build complete"

SSH_TARGET="${USERNAME}@${HOST}"
SSH="ssh ${SSH_OPTS[*]}"
RSYNC_SSH="ssh ${SSH_OPTS[*]}"

log_info "Creating remote directory: ~/${REMOTE_DIR}"
$SSH "$SSH_TARGET" "mkdir -p '${REMOTE_DIR}/dist'"

log_info "Uploading dist and config"
rsync -av --delete -e "$RSYNC_SSH" dist/ "$SSH_TARGET:${REMOTE_DIR}/dist/"
rsync -av -e "$RSYNC_SSH" docker-compose.yml nginx.conf "$SSH_TARGET:${REMOTE_DIR}/"

log_info "Restarting containers"
COMPOSE_CMD="docker compose"

run_compose() {
  local action="$1"
  local cmd

  if [ "${USE_SUDO_FOR_DOCKER}" = true ]; then
    SUDO_PASSWORD="${SUDO_PASSWORD:-}"
    if [ -z "${SUDO_PASSWORD}" ]; then
      read -rsp "Enter sudo password for ${USERNAME}@${HOST}: " SUDO_PASSWORD
      echo
    fi
    cmd="cd '${REMOTE_DIR}' && sudo -S ${COMPOSE_CMD} ${action}"
    $SSH -tt "$SSH_TARGET" "${cmd}" <<<"${SUDO_PASSWORD}"
  else
    cmd="cd '${REMOTE_DIR}' && ${COMPOSE_CMD} ${action}"
    $SSH "$SSH_TARGET" "${cmd}"
  fi
}

run_compose "down"
run_compose "up -d --remove-orphans"

log_success "Deployment complete"
log_warn "Handle SSH keys and credentials outside this script."
