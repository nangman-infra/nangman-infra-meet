#!/bin/sh
set -eu

required_vars="EC_HOMESERVER_URL EC_SERVER_NAME"

for var_name in $required_vars; do
  eval "var_value=\${$var_name:-}"
  if [ -z "$var_value" ]; then
    echo "Missing required env var: $var_name" >&2
    exit 1
  fi
done

cat > /usr/share/nginx/html/config.json <<EOF
{
  "default_server_config": {
    "m.homeserver": {
      "base_url": "${EC_HOMESERVER_URL}",
      "server_name": "${EC_SERVER_NAME}"
    }
  },
  "features": {
    "feature_use_device_session_member_events": ${EC_FEATURE_USE_DEVICE_SESSION_MEMBER_EVENTS:-true}
  },
  "ssla": "${EC_SSLA:-https://static.element.io/legal/element-software-and-services-license-agreement-uk-1.pdf}",
  "matrix_rtc_session": {
    "wait_for_key_rotation_ms": ${EC_WAIT_FOR_KEY_ROTATION_MS:-3000},
    "membership_event_expiry_ms": ${EC_MEMBERSHIP_EVENT_EXPIRY_MS:-180000000},
    "delayed_leave_event_delay_ms": ${EC_DELAYED_LEAVE_EVENT_DELAY_MS:-18000},
    "delayed_leave_event_restart_ms": ${EC_DELAYED_LEAVE_EVENT_RESTART_MS:-4000},
    "network_error_retry_ms": ${EC_NETWORK_ERROR_RETRY_MS:-100}
  }
}
EOF
