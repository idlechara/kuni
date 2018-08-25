var gulp      = require('gulp');
var fs        = require('fs');
var sass      = require('gulp-sass');
var replace   = require('gulp-replace');
var showdown  = require('showdown');
var converter = new showdown.Converter();
var server    = require('gulp-server-livereload');

gulp.task('sass', function() {
    gulp.src('*.scss')
        .pipe(sass())
        .pipe(gulp.dest(function(f) {
            return `${f.base}build`;
        }));
});

gulp.task('change_home', function() {
    var fileContent = fs.readFileSync("entries/home.md", "utf8");
    gulp.src('index.html')
    .pipe(replace('contents', converter.makeHtml(fileContent)))
    .pipe(gulp.dest('build'));
});

gulp.task('webserver', function() {
    gulp.src('build')
    .pipe(server({
        livereload: true,
        directoryListing: true,
        open: true
    }));
});

gulp.task('default', ['sass', 'webserver','change_home'], function() {
    gulp.watch('*.scss', ['sass']);
    gulp.watch('entries/home.md', ['change_home']);
})