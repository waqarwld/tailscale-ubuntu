FROM node:26.7.0-slim

# Install tailscale from the official repo (Debian variant; node:slim is Debian-based)
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl ca-certificates gnupg \
    && . /etc/os-release \
    && curl -fsSL "https://pkgs.tailscale.com/stable/debian/${VERSION_CODENAME}.noarmor.gpg" \
        | gpg --dearmor -o /usr/share/keyrings/tailscale-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/tailscale-archive-keyring.gpg] https://pkgs.tailscale.com/stable/debian ${VERSION_CODENAME} main" \
        > /etc/apt/sources.list.d/tailscale.list \
    && apt-get update && apt-get install -y --no-install-recommends tailscale \
    && rm -rf /var/lib/apt/lists/*

# Telegram <-> Discord ticket bridge
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
# Ticket counter persists via a named volume mounted at /app/runtime
RUN mkdir -p /app/runtime

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
