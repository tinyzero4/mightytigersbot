#!/bin/sh
set -e

npm run-script package

docker build -t "gcr.io/ses-voting/ses-voting:latest" .

docker push "gcr.io/ses-voting/ses-voting:latest"

COMMIT_ID=$(git rev-parse HEAD)

sed -i '' -e "s/COMMITID/${COMMIT_ID}/g" deployment/k8s-deployment.yml

kubectl apply -f deployment/k8s-deployment.yml

sed -i '' -e "s/${COMMIT_ID}/COMMITID/g" deployment/k8s-deployment.yml