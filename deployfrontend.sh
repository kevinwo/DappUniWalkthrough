rsync -r src/ docs/
rsync build/contracts/* docs/
git add .
git commit -m "Compile assets for GitHub Pages"
git push -u origin master