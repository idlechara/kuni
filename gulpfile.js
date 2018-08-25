var   gulp                         = require('gulp');
var   fs                           = require('fs');
var   sass                         = require('gulp-sass');
var   replace                      = require('gulp-replace');
var   rename                       = require('gulp-rename');
var   showdown                     = require('showdown');
var   converter                    = new showdown.Converter();
var   server                       = require('gulp-server-livereload');
var   registered_top_pages         = [];
var   registered_watchers          = [];
var   registered_link_replacements = [];
const entriesFolder                = 'entries/';
const buildFolder                  = 'build';
const fsExtra                      = require('fs-extra');

fsExtra.removeSync(buildFolder);
showdown.setOption('strikethrough', true);
showdown.setOption('tables', true);

var scan_directory = function (folder, root) {
    let files = fs.readdirSync(folder);
    files.forEach(file => {
        let fullPath         = `${folder}`;
        let relativePath     = `${fullPath}`.replace(`${root}`, '');
        let filename         = `${file}`;
        let fileAbsolutePath = `${folder}${file}`;
        if (fs.statSync(fileAbsolutePath).isDirectory()){
            scan_directory(`${fileAbsolutePath}/`, root);
        } else {
            let filenameTokens = fileAbsolutePath.split('.');
            let filenameLabel = filenameTokens[0];
            // ensure only markdown is parsed
            if ( filenameTokens.length >= 2 && filenameTokens[1] === 'md'){
                register_entry(filenameLabel, 'index', root, relativePath, filename);
            }
        }
    });
}

var create_blog_history = function(){

}

var register_entry = function(label, template, root, directory, filename){
    let inputFilePath          = `${root}${directory}${filename}`;
    let relativeOutputFilePath = `/${directory}${filename}`;
    let basename               = filename.split('.')[0];
    gulp.task(label, function() {
        let fileContent = fs.readFileSync(inputFilePath, "utf8");

        // Detect all files to be copied and mark them
        let linkedFilesRegex = /(\[[^(\]|\[)]*\]\()([^(\(|\))]*.[^(md)])(\))/g;
        let match = linkedFilesRegex.exec(fileContent);
        while (match != null) {
            let sourceFilePath      = `${root}${directory}${match[2]}`;
            let destinationFilePath = `${buildFolder}/${directory}${match[2]}`;
            try {
                console.log(`moving ${sourceFilePath} to ${destinationFilePath}`);
                fsExtra.copySync(sourceFilePath, destinationFilePath);
                console.log(' success!');
            } catch (err) {
                console.error(err);
            }
            match = linkedFilesRegex.exec(fileContent);
        }

        // replace markdown links
        let markdownLinkRegex = /(\[[^(\]|\[)]*\]\([^(\(|\))]*.)(md)(\))/g;
        fileContent = fileContent.replace(markdownLinkRegex, "$1html$3");

        
        return gulp.src(`templates/${template}.html`)
        .pipe(replace('<contents/>', converter.makeHtml(fileContent)))
        .pipe(rename({
            dirname : directory,
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
        trigger   : [label]
    });
    registered_link_replacements.push(relativeOutputFilePath);
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
        livereload : true
        // open: true
    }));
});


gulp.task('default', ['sass', ...registered_top_pages, 'webserver'], function() {
    gulp.watch('*.scss', ['sass']);
    registered_watchers.forEach(watched => {
        gulp.watch(watched.input_file, watched.trigger);    
    });
});