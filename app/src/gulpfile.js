/*jshint node:true*/
'use strict';
var gulp = require('gulp');
var sass = require('gulp-sass');
var rename = require('gulp-rename');
var revAll = require('gulp-rev-all');
var vulcanize = require('gulp-vulcanize');
var del = require('del');
var runSequence = require('run-sequence');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var merge = require('merge-stream');
var stylemod = require('gulp-style-modules');

gulp.task('clean', function() {
  return del( ['./app/dist','./app/build'] );
});

gulp.task('browserify', function() {
  return browserify('./app/src/js/entry.js')
    .bundle()
    .pipe( source('app.js') )
    .pipe( gulp.dest('./app/dist/js') );
});
 
gulp.task('sass', function () {
  return gulp.src('./app/src/scss/entry.scss')
    .pipe( sass().on('error', sass.logError ) )
    .pipe( rename('app.css') )
    .pipe( gulp.dest('./app/dist/css') );
});

gulp.task('polymer-prep', function () {
  var copy = gulp.src('./app/src/elements/**/*.html')
    .pipe( gulp.dest('./app/build/elements') );

  var css = gulp.src('./app/src/elements/**/*.scss' )
    .pipe( sass().on('error', sass.logError ) )
    .pipe( stylemod() )
    .pipe( gulp.dest('./app/build/elements/') );

  return merge( copy, css );
});

gulp.task('polymer', ['polymer-prep'], function () {
  return gulp.src('./app/build/elements/entry.html')
    .pipe( vulcanize( {
      abspath: '',
      excludes: [],
      inlineCss: true,
      inlineScripts: true,
      stripExcludes: false,
      stripComments: true
    } ) )
    .pipe( rename('app.html') )
    .pipe( gulp.dest('./app/dist/elements') );
});

gulp.task('copy', function() {
  return gulp.src( [
      './app/src/index.html',
      './app/src/images/*'
      ], { base: './app/src/'} )
    .pipe( gulp.dest('./app/dist') );
});

gulp.task('rev', function() {
  var RevAll = new revAll( { dontRenameFile: [ /^\/index.html/g ] } );
  return gulp.src('./app/dist/**')
    .pipe( RevAll.revision() )
    .pipe( gulp.dest('./app/dist') );

});

gulp.task('browserify-rev', function() {
  runSequence('browserify','copy-rev');
});

gulp.task('sass-rev', function() {
  runSequence('sass','copy-rev');
});

gulp.task('polymer-rev', function() {
  runSequence('polymer','copy-rev');
});

gulp.task('copy-rev', function() {
  runSequence('copy','rev');
});

/*
  This is needed by platinum-push-messaging, but it doesn't vulcanize well.
  platinum-push-messaging assumes that service-worker.js will be in the same
  directory as the platinum-push-messaging element (or the vulcanized file it
  lives in). So we'll just copy it over.
*/
gulp.task('copy-service-worker', function() {
  return gulp.src('./bower_components/platinum-push-messaging/service-worker.js')
    .pipe( gulp.dest('./app/dist/elements') );
});

gulp.task('watch', ['default'], function() {
  gulp.watch('app/src/**/*', ['default'] );
});

gulp.task('default', function( callback ) {
  runSequence('clean',
              ['browserify', 'sass', 'polymer', 'copy', 'copy-service-worker'],
              'rev',
              callback);
});
