#!/bin/sh

DIST_DIR=./dist
S3_DEPLOYMENT_PATH="s3://mightytigers/v1.0/bot.zip"
API_ID="h2vjhzj01c"
STAGE=prod

aws s3 cp "${DIST_DIR}/bot.zip" ${S3_DEPLOYMENT_PATH}

aws apigateway create-deployment --rest-api-id ${API_ID} --stage-name ${STAGE} --description 'New version'
