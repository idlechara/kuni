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
var   registered_blog_entries      = {};
var     Mutex = require('async-mutex').Mutex;
const entriesFolder                = 'entries/';
const buildFolder                  = 'build';
const fsExtra                      = require('fs-extra');
const blogMutex = new Mutex();

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

var create_blog_history = function(root, buildPath, template){

    let content = "";
    let entryTemplate = fs.readFileSync(`templates/blog-entry.html`, "utf8");
    let entryArray = [];
    for (let key in registered_blog_entries) {
        if (!registered_blog_entries.hasOwnProperty(key)) continue;
        entryArray.push(registered_blog_entries[key]);
    }
    entryArray.sort((a, b) => {
        if (a.timestamp > b.timestamp) {
            return -1;
        }
        if (a.timestamp < b.timestamp) {
            return 1;
        }
        return 0;
    });
    entryArray.forEach(entry => {
        let modifiedContent = entryTemplate.replace("<timestamp/>", entry.timestampLabel);
            modifiedContent = modifiedContent.replace("<contents/>", converter.makeHtml(entry.content));
            modifiedContent = modifiedContent.replace("<link/>", entry.href);
        content += modifiedContent;
        content += `<br> <hr> <br>`;
    });
    
    gulp.src(`templates/${template}.html`)
    .pipe(replace('<contents/>', content))
    .pipe(rename({
        dirname : "",
        basename: 'blog',
        extname: ".html"
    }))
    .pipe(gulp.dest(buildFolder));
}

var register_entry = function(label, template, root, directory, filename){
    let inputFilePath          = `${root}${directory}${filename}`;
    let relativeOutputFilePath = `/${directory}${filename}`;
    let basename               = filename.split('.')[0];
    gulp.task(label, function() {
        let fileContent = fs.readFileSync(inputFilePath, "utf8");

        // Detect all files to be copied and mark them
        let linkedFilesRegex = /(\[[^(\]|\[)]*\]\()([^(:|(\(|\)))]*.[^(md)])(\))/g;
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

        // change relative to absolute routes
        let documentLinkRegex = /(\[[^(\]|\[)]*\]\()([^((:)|((\(|\)))]*.[^(md)]\))/g;
        fileContent = fileContent.replace(documentLinkRegex, `$1/${directory}$2`);

        // if it is a blog entry, add it to the blog page
        if(/^\/blog\//g.test(relativeOutputFilePath)){
            let lines = fileContent.split("\n");
            let entryContent = "";
            // If you put a date comment anywhere, then it will be used as a date for the post.
            let timestamp = /\[\/\/\]: # \((\w+ \w+ \d+ \d+:\d+:\d+ .\d+ \d+)\)/g.exec(fileContent);
            let timestampLabel = "No Date";
            if(timestamp !== null){
                timestampLabel = timestamp[1];
                timestamp = Date.parse(timestamp[1]);
            } else {
                timestamp = "0";
            }

            // concat all lines to generate the entry
            entryContent = lines.slice(0, 4).join("\n");
            console.log(entryContent);

            registered_blog_entries[label] = {
                timestamp: timestamp,
                timestampLabel: timestampLabel,
                content: entryContent,
                href: `/${directory}${basename}.html`
            };

            blogMutex.acquire()
            .then(function(release) {
                create_blog_history(root, `${buildFolder}/`, template);
                release();
            });

        }
        
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