var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    notify = require('gulp-notify'),
    cache = require('gulp-cache'),
    livereload = require('gulp-livereload'),
    del = require('del');
var vinylPaths = require('vinyl-paths');
var _ = require("lodash-node");
var moment = require("moment");
var shell = require('gulp-shell');
var usemin = require('gulp-usemin');
var rev = require('gulp-rev');
var minifyHtml = require('gulp-minify-html');
var minifyCss = require('gulp-minify-css');
var   gulpSequence = require('gulp-sequence');
var preprocess = require('gulp-preprocess');

var now = moment().format("YYYYMMDDHHmmss");

gulp.task('save-data', shell.task("firebase data:get / > svg/svg_data_"+ now+".json"));

gulp.task('git', shell.task("git add . * && git commit -m \"Commit "+ now + "\""));

gulp.task('backup-files', shell.task(["cp css/todo.css D:\\svg_projects\\",
"cp index.html /cygdrive/d/svg_Aidememoire/",
"cp gulpfile.js /cygdrive/d/svg_Aidememoire/",
"cp js/controllers/todoCtrl.js /cygdrive/d/svg_Aidememoire/",
"cp firebase.json /cygdrive/d/svg_Aidememoire/",
"cp memoperso.txt /cygdrive/d/svg_Aidememoire/",
"cp package.json /cygdrive/d/svg_Aidememoire/",
"cp readme.md /cygdrive/d/svg_Aidememoire/",
"cp todo.md /cygdrive/d/svg_Aidememoire/",
"cp svg/svg_data_*.json /cygdrive/d/svg_Aidememoire/"]));

var paths = {
  scripts:"./js/**/*.js",
  html:"*.html",
  css:"css/**/*.css"
};

gulp.task("cleandev", shell.task("rm -Rf ./index-*.html"));

gulp.task("clean", shell.task("cd build && rm -Rf * && mkdir mobile"));

gulp.task('deploy', shell.task("cd build && firebase deploy"));

gulp.task('fonts', shell.task("cd build && rm -Rf fonts && mkdir fonts && cp ../node_modules/font-awesome/fonts/* fonts/"));

gulp.task('icons', shell.task("cd build && rm -Rf icons && mkdir icons && cp ../icons/* icons/"));

gulp.task('firebase.json', shell.task("cd build && rm -Rf firebase.json && cp ../firebase.json ."));

gulp.task('dirty', shell.task("cd build && echo true > isdirty"));

gulp.task('run', shell.task("firebase serve"));

gulp.task('build-dev-mobile', function() {
  return gulp.src('index.html')
    .pipe(preprocess({context: { MOBILE: true}})) //To set environment variables in-line
    .pipe(rename('index-mobile.html'))
    .pipe(gulp.dest('.'));
});

gulp.task('build-dev-web', function() {
  return gulp.src('index.html')
    .pipe(preprocess({context: { }})) //To set environment variables in-line
    .pipe(rename('index-web.html'))
    .pipe(gulp.dest('.'));
});

gulp.task('build-usemin-mobile', function() {
  return gulp.src('index.html')
    .pipe(preprocess({context: { MOBILE: true}})) //To set environment variables in-line
    .pipe(usemin({
      css: [ rev() ],
      extjs: [ uglify(), rev() ],
      myjs: [ rev()]
    }))
    .pipe(gulp.dest('build/mobile/'));
});

gulp.task('build-usemin-web', function() {
  return gulp.src('index.html')
    .pipe(preprocess({context: { }})) //To set environment variables in-line
    .pipe(usemin({
      css: [ rev() ],
      extjs: [ uglify(), rev() ],
      myjs: [ rev() ]
    }))
    .pipe(gulp.dest('build/'));
});


var logchange = function(message) {
  return function() {
    console.log(message);
  };
}
// Rerun the task when a file changes
gulp.task('watch', function() {
  gulp.watch(paths.scripts, ['build-dev-web','build-dev-mobile']);
  gulp.watch(paths.html, ['build-dev-web','build-dev-mobile']);
  gulp.watch(paths.css, ['build-dev-web','build-dev-mobile']);
});


gulp.task("builddev", ["build-dev-web", 'build-dev-mobile']);

gulp.task("build", ["build-usemin-web", 'build-usemin-mobile', "fonts", "icons", "firebase.json"]);

gulp.task("backup", ["save-data", "git","backup-files"]);

gulp.task("rebuildall", gulpSequence("clean", "build"));

gulp.task("goprod", gulpSequence("clean", "backup", "build","deploy"));

gulp.task("allbutprod", gulpSequence("clean", "backup", "build","dirty"));

gulp.task("runandwatch",["run", "watch"]);

gulp.task("dev",gulpSequence( "cleandev", "builddev", "runandwatch"));

gulp.task("help", function(){
  console.log("--------------------------------------")
  console.log("gulp build indications for tasko");
  console.log("--------------------------------------")
  console.log("default       : build for dev and launch app for dev with watch files");
  console.log("goprod        : complete sequence for cleaning, building, commit and deploy");
  console.log("save-data     : backup the data in a local file");
  console.log("help          : print  this help message");
  console.log("allbutprod    : clean commit and backup, but don't deploy");
  console.log("dev           : run dev server");
  console.log("<default>     : run help command")
  console.log("--------------------------------------")
})

gulp.task("default", ["help"]);
