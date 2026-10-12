#!/bin/bash
# Salesdam Insurance Workspace - Systemd Installation Script
# Run as root: sudo ./install-systemd.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="/etc/systemd/system"
SALESDAM_USER="salesdam"
SALESDAM_GROUP="salesdam"
SALESDAM_HOME="/opt/salesdam"

echo "=== Salesdam Insurance Workspace - Systemd Installation ==="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)" 1>&2
   exit 1
fi

# Create salesdam user if not exists
if ! id "$SALESDAM_USER" &>/dev/null; then
    echo "Creating user: $SALESDAM_USER"
    useradd -r -s /bin/bash -d "$SALESDAM_HOME" -m "$SALESDAM_USER"
else
    echo "User $SALESDAM_USER already exists"
fi

# Create application directory
mkdir -p "$SALESDAM_HOME/backend"
mkdir -p "$SALESDAM_HOME/logs"
mkdir -p "$SALESDAM_HOME/uploads"
mkdir -p /etc/salesdam

# Copy service files
echo "Installing systemd service files..."
cp "$SCRIPT_DIR"/systemd/*.service "$SERVICE_DIR/"
cp "$SCRIPT_DIR"/systemd/*.timer "$SERVICE_DIR/"

# Copy environment template
if [[ ! -f /etc/salesdam/environment ]]; then
    echo "Creating environment file from template..."
    cp "$SCRIPT_DIR"/environment.example /etc/salesdam/environment
    echo "IMPORTANT: Edit /etc/salesdam/environment with your production values!"
else
    echo "Environment file already exists at /etc/salesdam/environment"
fi

# Set ownership
chown -R "$SALESDAM_USER:$SALESDAM_GROUP" "$SALESDAM_HOME"
chown -R "$SALESDAM_USER:$SALESDAM_GROUP" /etc/salesdam
chmod 600 /etc/salesdam/environment

# Reload systemd
echo "Reloading systemd..."
systemctl daemon-reload

# Enable and start timers
echo "Enabling and starting timers..."
systemctl enable salesdam-insurance-scheduler.timer
systemctl enable salesdam-billing-cycle.timer
systemctl enable salesdam-communication-dispatcher.timer
systemctl enable salesdam-auto-lapse.timer

systemctl start salesdam-insurance-scheduler.timer
systemctl start salesdam-billing-cycle.timer
systemctl start salesdam-communication-dispatcher.timer
systemctl start salesdam-auto-lapse.timer

# Show status
echo ""
echo "=== Installation Complete ==="
echo ""
echo "Timer status:"
systemctl status salesdam-insurance-scheduler.timer --no-pager
systemctl status salesdam-billing-cycle.timer --no-pager
systemctl status salesdam-communication-dispatcher.timer --no-pager
systemctl status salesdam-auto-lapse.timer --no-pager

echo ""
echo "Next steps:"
echo "1. Edit /etc/salesdam/environment with your production values"
echo "2. Deploy application code to /opt/salesdam/backend"
echo "3. Run: npm ci --production (in /opt/salesdam/backend)"
echo "4. Run: npm run db:up (to start MongoDB replica set)"
echo "5. Restart timers: systemctl restart salesdam-*.timer"
echo ""
echo "To view logs: journalctl -u salesdam-insurance-scheduler -f"
echo "To run manually: systemctl start salesdam-insurance-scheduler"