ECHO "[COMPILING]"
cd ..
ECHO "....... index.js"
uglifyjs index.js -o minify/fulltext/index.js

cp readme.md minify/fulltext/readme.md
cp package.json minify/fulltext/package.json
cp license.txt minify/fulltext/license.txt

cd minify
node minify.js