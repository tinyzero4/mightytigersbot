#!/bin/sh

printf "Deploy latest docker version\n"

ansible-playbook --vault-id @prompt ansible/deploy.yml