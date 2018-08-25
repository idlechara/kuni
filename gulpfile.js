var   gulp                 = require('gulp');
var   fs                   = require('fs');
var   sass                 = require('gulp-sass');
var   replace              = require('gulp-replace');
var   rename               = require('gulp-rename');
var   showdown             = require('showdown');
var   converter            = new showdown.Converter();
var   server               = require('gulp-server-livereload');
var   registered_top_pages = [];
var   registered_watchers  = [];
const entriesFolder        = 'entries/';
const buildFolder          = 'build';


var scan_directory = function (folder, root) {
    let files = fs.readdirSync(folder);
    files.forEach(file => {
        let fullPath     = `${folder}`;
        let relativePath = `${fullPath}`.replace(`${root}`, '');
        let filename     = `${file}`;
        let fileAbsolutePath     = `${folder}${file}`;
        if (fs.statSync(fileAbsolutePath).isDirectory()){
            scan_directory(`${fileAbsolutePath}/`, root);
        } else {
            let filenameLabel = fileAbsolutePath.split('.')[0];
            register_entry(filenameLabel, 'index', root, relativePath, filename);
        }
        console.log("NEXT!");
    });
}

var register_entry = function(label, template, root, directory, filename){
    let inputFilePath = `${root}${directory}${filename}`;
    let basename = filename.split('.')[0];
    gulp.task(label, function() {
        let fileContent = fs.readFileSync(inputFilePath, "utf8");
        console.log(inputFilePath);
        return gulp.src(`templates/${template}.html`)
        .pipe(replace('<contents/>', converter.makeHtml(fileContent)))
        .pipe(rename({
            dirname: directory,
            basename: basename,
            // prefix: "bonjour-",
            // suffix: "-hola",
            extname: ".html"
        }))
        .pipe(gulp.dest(buildFolder));

    });
    registered_top_pages.push(label);
    registered_watchers.push({
        input_file: inputFilePath,
        trigger: [label]
    });
}

// this scans entries by default
scan_directory(entriesFolder, entriesFolder);

gulp.task('sass', function() {
    gulp.src('*.scss')
        .pipe(sass())
        .pipe(gulp.dest(function(f) {
            return `${f.base}build`;
        }));
});

gulp.task('webserver', function() {
    gulp.src('./build')
    .pipe(server({
        defaultFile: 'index.html',
        livereload: true
        // open: true
    }));
});


gulp.task('default', ['sass', 'webserver', ...registered_top_pages], function() {
    gulp.watch('*.scss', ['sass']);
    registered_watchers.forEach(watched => {
        gulp.watch(watched.input_file, watched.trigger);    
    });
});