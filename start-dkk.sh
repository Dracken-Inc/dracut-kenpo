#!/bin/bash
cd /home/henlafon/projects/dracut-kenpo
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  export "$key"="$value"
done < .env
node dkk-intake-3333.js
