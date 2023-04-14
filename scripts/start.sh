#!/usr/bin/env bash

NAME="blictionary-bot"
DATE=$(date -u +"%Y-%m-%dT%H-%M-%SZ")

[ ! -d ~/.log/$NAME ] && mkdir -p ~/.log/$NAME

npm install
npm run start &> ~/.log/$NAME/$DATE.txt &

echo -e "\n\033[0;36mlog\033[0m" ~/.log/$NAME/$DATE.txt "\n"
