#!/bin/bash
cd /home/henlafon/projects/dracut-kenpo
export $(grep -v '^#' .env | xargs)
node dkk-intake-3333.js
