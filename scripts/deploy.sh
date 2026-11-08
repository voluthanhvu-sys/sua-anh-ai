#!/bin/sh
# Publish web/ to GitHub Pages (branch gh-pages). Run from anywhere: sh scripts/deploy.sh
# Bump VERSION in web/sw.js first so installed phones refresh.
R="$(cd "$(dirname "$0")/.." && pwd)"
git -C "$R" push -q origin main && git -C "$R" push -q -f origin "$(git -C "$R" subtree split --prefix web main)":refs/heads/gh-pages && echo "deployed: https://voluthanhvu-sys.github.io/sua-anh-ai/"
