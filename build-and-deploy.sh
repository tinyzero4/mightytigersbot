#!/bin/sh
set -e

# Rebuild project 
npm run-script package

# Build and publish docker image
./build-docker.sh

# Deploy latest docker version to prod
# TODO 

cd -