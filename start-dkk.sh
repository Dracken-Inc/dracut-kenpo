#!/bin/bash
set -a
source "$(dirname "$0")/.env"
set +a
cd /home/henlafon/projects/dracut-kenpo
node dkk-intake-3333.js
