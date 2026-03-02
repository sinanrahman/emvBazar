#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
# Download the chromium browser for puppeteer explicitly
npx puppeteer browsers install chrome
