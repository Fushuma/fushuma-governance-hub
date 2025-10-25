# Fushuma Governance Hub: Comprehensive Production Deployment Guide

**Author:** Manus AI
**Date:** October 25, 2025

## Introduction

This document provides a complete, step-by-step guide for deploying the Fushuma Governance Hub and its associated smart contracts to a production environment on an Ubuntu server. This guide also includes instructions for setting up a GitHub repository for your project.

This guide is structured to take you from the initial server setup to a fully operational, secure, and production-ready deployment. It covers both the on-chain (smart contracts) and off-chain (web application) components.

### Deployment Options

This guide provides two primary deployment strategies for the web application:

1.  **Docker-based Deployment (Recommended)**: Utilizes Docker and Docker Compose to containerize the application, providing a consistent and isolated environment. This is the recommended approach for most production setups.
2.  **PM2-based Deployment**: Uses PM2, a process manager for Node.js, to run the application directly on the host machine. This is a viable alternative for those who prefer not to use Docker.

We will also cover the deployment of the Solidity smart contracts using Foundry.

---



## Part 1: GitHub Repository Setup

Before deploying, it's crucial to have your project under version control. This section will guide you through creating a new GitHub repository and pushing your project to it.

### 1.1. Create a New Repository on GitHub

1.  Go to [GitHub](https://github.com) and log in to your account.
2.  Click the **+** icon in the top-right corner and select **New repository**.
3.  Fill in the repository details:
    *   **Repository name**: `fushuma-governance` (or your preferred name)
    *   **Description**: `Fushuma Governance Hub and Smart Contracts`
    *   Choose **Private** for now. You can make it public later if you wish.
    *   Do **not** initialize with a README, .gitignore, or license, as we have already created these.
4.  Click **Create repository**.

### 1.2. Initialize Git and Push Your Project

Now, from your local project directory (in this case, `/home/ubuntu/`), you will initialize a new Git repository and push your code to GitHub.

```bash
# Navigate to your project directory
cd /home/ubuntu/

# Initialize a new Git repository
git init

# Add all files to the staging area
git add .

# Commit the files
git commit -m "Initial commit of Fushuma Governance Hub and Smart Contracts"

# Add the remote repository
git remote add origin https://github.com/YOUR_USERNAME/fushuma-governance.git

# Push the code to GitHub
git push -u origin main
```

**Note:** Replace `YOUR_USERNAME` with your actual GitHub username.

---



## Part 2: Server Setup & Prerequisites

This section details the necessary steps to prepare your Ubuntu server for deployment.

### 2.1. Initial Server Update

First, connect to your server via SSH and update the package lists:

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2. Install Essential Tools

Install some essential packages that will be used throughout the deployment process:

```bash
sudo apt install -y git curl wget unzip nginx
```

### 2.3. Install Docker and Docker Compose

This is required for the recommended Docker-based deployment.

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Add your user to the docker group to run docker commands without sudo
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt install -y docker-compose-plugin
```

### 2.4. Install Node.js and pnpm

This is required for the PM2-based deployment and for running local scripts.

```bash
# Install Node.js v22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
sudo npm install -g pnpm
```

### 2.5. Install Foundry

This is required for deploying the smart contracts.

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash

# Source your shell configuration to make foundry available
source /home/ubuntu/.bashrc

# Run foundryup to install the latest version
foundryup
```

---



## Part 3: Smart Contract Deployment (On-Chain)

This section covers the deployment of the Fushuma governance smart contracts to the Fushuma Network.

### 3.1. Clone the Repository

Clone the repository you created in Part 1 to your server:

```bash
cd /home/ubuntu
git clone https://github.com/YOUR_USERNAME/fushuma-governance.git
cd fushuma-governance/governance-contracts
```

### 3.2. Install Dependencies

Install the necessary Foundry libraries:

```bash
forge install
```

### 3.3. Configure Environment Variables

Create a `.env` file from the example and fill in the required values:

```bash
cp .env.example .env
nano .env
```

You will need to provide:

*   `PRIVATE_KEY`: The private key of the wallet you will use for deployment.
*   `DAO_ADDRESS`: The address of your Aragon DAO or multisig.
*   `ESCROW_ADDRESS`: The address of the deployed `VotingEscrowIncreasing` contract.
*   `CLOCK_ADDRESS`: The address of the deployed `Clock` contract.
*   `ETHERSCAN_API_KEY`: Your Fumascan API key for contract verification.

### 3.4. Deploy the Contracts

Run the deployment script using Foundry:

```bash
# Load environment variables
source .env

# Deploy the contracts
forge script script/DeployGovernance.s.sol:DeployGovernance \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

After a successful deployment, the contract addresses will be saved in `deployments/governance.json`. You will need the `governor` address for the web application configuration.

### 3.5. Post-Deployment Configuration

After deployment, you must grant the necessary roles to the appropriate addresses. This is a critical security step.

*   **Grant Council Member Roles:** Grant the `COUNCIL_MEMBER_ROLE` to your council members via your DAO.
*   **Configure Executor Role:** Grant the `EXECUTOR_ROLE` to the addresses that are allowed to execute proposals.
*   **Transfer Admin to DAO:** Transfer the `DEFAULT_ADMIN_ROLE` to your DAO for decentralized control.

These actions are performed by interacting with the deployed `FushumaGovernor` and `GovernanceCouncil` contracts.

---



## Part 4: Web Application Deployment (Off-Chain)

This section provides instructions for deploying the Fushuma Governance Hub web application.

### 4.1. Clone the Repository

If you haven't already, clone the repository you created in Part 1:

```bash
cd /home/ubuntu
git clone https://github.com/YOUR_USERNAME/fushuma-governance.git
cd fushuma-governance
```

### 4.2. Configure Environment Variables

Create a `.env` file for the web application:

```bash
cp .env.example .env
nano .env
```

Ensure you fill in all the required variables, including:

*   `DATABASE_URL`: The connection string for your MySQL/TiDB database.
*   `JWT_SECRET`: A long, random string for signing JWTs.
*   `VITE_GOVERNOR_CONTRACT_ADDRESS`: The address of the `FushumaGovernor` contract you deployed in Part 3.
*   And all other variables as described in the `.env.example` file.

### 4.3. Deployment with Docker (Recommended)

1.  **Build and Start the Containers:**

    ```bash
    docker-compose up -d --build
    ```

2.  **Initialize the Database:**

    ```bash
    docker-compose exec app pnpm db:push
    ```

3.  **Configure Nginx:**

    The provided `nginx.conf` is production-ready. You will need to:

    *   Obtain an SSL certificate (e.g., using Let's Encrypt).
    *   Update the `server_name` to your domain.
    *   Place the Nginx configuration in `/etc/nginx/sites-available/` and create a symlink in `/etc/nginx/sites-enabled/`.

### 4.4. Deployment with PM2

1.  **Install Dependencies:**

    ```bash
    pnpm install --frozen-lockfile
    ```

2.  **Build the Application:**

    ```bash
    pnpm build
    ```

3.  **Start the Application with PM2:**

    ```bash
    pnpm start:all
    ```

4.  **Configure PM2 to Start on Boot:**

    ```bash
    pm2 startup
    pm2 save
    ```

---



## Part 5: Post-Deployment & Maintenance

After successfully deploying the application, it's important to perform some final checks and establish a maintenance routine.

### 5.1. Health Checks

Verify that the application is running correctly:

```bash
# Check the application health endpoint
curl http://localhost:3000/api/health

# Check the status of your Docker containers
docker-compose ps

# Or, check the status of your PM2 processes
pm2 status
```

### 5.2. Automated Backups

The provided `DEPLOYMENT.md` file contains a script for automated database backups. It is highly recommended to implement this to prevent data loss.

### 5.3. Monitoring

The `DEPLOYMENT.md` also provides a basic setup for monitoring with Prometheus and Grafana. For a production environment, robust monitoring and alerting are essential for identifying and responding to issues proactively.

### 5.4. Application Updates

To update the application, you will typically follow these steps:

1.  Pull the latest code from your GitHub repository.
2.  Install any new dependencies.
3.  Rebuild the application.
4.  Restart the application (using `docker-compose` or `pm2 reload`).

### 5.5. Security Best Practices

*   **Firewall:** Ensure you have a firewall (like UFW) configured to only allow traffic on necessary ports (22, 80, 443).
*   **Regular Updates:** Keep your server and all its packages up to date with the latest security patches.
*   **SSH Keys:** Use SSH keys for authentication instead of passwords.

---

This guide provides a comprehensive overview of the deployment process. Remember to adapt the configurations to your specific needs and security requirements.

