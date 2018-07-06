#!/bin/sh

printf "Deploy latest docker version"

ansible-playbook --vault-id @prompt ansible/deploy.yml