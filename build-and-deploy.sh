#!/bin/sh
set -e

# Rebuild project 
npm run-script package

# Build and publish docker image
./build-docker.sh

# Deploy latest docker version to prod
cd infrastructure && ./deploy.sh

cd -