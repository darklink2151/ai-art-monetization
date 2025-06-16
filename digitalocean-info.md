# DigitalOcean Deployment Information

## Server Details
- IP Address: 137.184.53.98
- Droplet Name: commerce-dashboard
- Size: s-1vcpu-1gb-amd ($7/month)
- Region: nyc1
- OS: Ubuntu 22.04 LTS
- SSH Key ID: 48339334

## Access Commands
```bash
# SSH to server
ssh -i ~/.ssh/id_ed25519_github root@137.184.53.98

# Check application status
ssh -i ~/.ssh/id_ed25519_github root@137.184.53.98 "pm2 status"

# View logs
ssh -i ~/.ssh/id_ed25519_github root@137.184.53.98 "pm2 logs commerce-dashboard"
```

## Deployment Scripts
- `setup-server.sh` - Copies all files to server and sets up the application
- `deploy.sh` - Installs dependencies and configures the server
- `update.sh` - Updates the application after changes

## URLs
- Store: http://137.184.53.98/
- Dashboard: http://137.184.53.98/dashboard

## Update Methods
1. **Direct copy method**:
   ```bash
   ./setup-server.sh
   ```

2. **Git-based method**:
   - Push changes to GitHub
   - Run:
   ```bash
   ssh -i ~/.ssh/id_ed25519_github root@137.184.53.98 "cd /var/www/commerce-dashboard && ./update.sh"
   ```

## DigitalOcean CLI Commands
```bash
# List droplets
doctl compute droplet list

# List regions
doctl compute region list

# Create snapshot before destroying
doctl compute droplet-action snapshot DROPLET_ID --snapshot-name commerce-dashboard-snapshot

# Recreate from snapshot
doctl compute droplet create commerce-dashboard-restored --size s-1vcpu-1gb-amd --image commerce-dashboard-snapshot --region nyc1 --ssh-keys 48339334
```

## Notes
- Using Ubuntu 22.04 LTS for long-term stability
- Node.js 18.x is installed
- PM2 manages the Node.js application
- Nginx serves as reverse proxy
- Stripe integration requires proper API keys in .env file 