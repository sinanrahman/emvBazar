#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
# Download the chromium browser for puppeteer
npx puppeteer install
