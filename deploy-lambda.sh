#!/bin/sh

DIST_DIR=./dist
S3_BUCKET="mightytigers"
S3_OBJECT_KEY="v1.0/bot.zip"
S3_LINK="s3://${S3_BUCKET}/${S3_OBJECT_KEY}"
API_ID="h2vjhzj01c"
LAMBDA_NAME="arn:aws:lambda:us-east-1:637454286206:function:mightytigers"
STAGE=prod

aws s3 cp "${DIST_DIR}/bot.zip" "${S3_LINK}"
aws lambda update-function-code --function-name "${LAMBDA_NAME}" --s3-bucket "${S3_BUCKET}" --s3-key "${S3_OBJECT_KEY}"
aws apigateway create-deployment --rest-api-id "${API_ID}" --stage-name "${STAGE}" --description 'New version'
