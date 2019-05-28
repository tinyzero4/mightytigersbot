#!/bin/sh

docker build -t gcr.io/ses-voting/ses-voting:latest .

docker push gcr.io/ses-voting/ses-voting:latest