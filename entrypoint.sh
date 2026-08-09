#!/bin/sh
set -e

# Start the tailscale daemon
/usr/sbin/tailscaled --state=/var/lib/tailscale/tailscaled.state &

# Wait until tailscaled is up and the control socket exists
for i in $(seq 1 30); do
    if /usr/bin/tailscale status >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Connect to your tailnet using the auth key from .env
if [ -n "$TS_AUTHKEY" ]; then
    /usr/bin/tailscale up \
        --authkey="$TS_AUTHKEY" \
        --hostname="${TS_HOSTNAME:-ubuntu-node}" \
        ${TS_EXTRA_ARGS}
fi

# Start the ticket bridge (Telegram + Discord). Runs as PID 1 so the container
# stops on crash and Docker's restart policy brings it back up.
cd /app
exec node src/index.js
