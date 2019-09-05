SRC=./
DIST=./dist

echo "> Compiling server"
babel $SRC --only "env.js,server/*,lib/utils.js" --out-dir $DIST || exit 1

echo "> Copying lang"
cp -R $SRC/lang $DIST

echo "> Copying static"
shx mkdir -p $DIST/static
cp -R $SRC/static/fonts $DIST/static
cp -R $SRC/static/icons $DIST/static
cp -R $SRC/static/images $DIST/static
cp -R $SRC/static/styles $DIST/static
cp -R $SRC/static/scripts $DIST/static
