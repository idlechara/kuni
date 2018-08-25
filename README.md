# Welcome to Kuni, a minimal microblogging framework

Kuni (国) means country in Japanese, and this project called so because I'm fan of a certain visual novel and helps me to remind about it's existence.

You can explore this framework by installing it and deploying on your machine. To keep thinks simple, Kuni will take a certain markdown structure in the `entries` folder, and it will render it as a static page. This is ideal if you don't have a hosting or you want to save some bucks by using some public repos (cof cof) to host your blog.

## Prerequisites
* Node (latest version)
* A working computer

To run the code you'll need to do the following:

```bash
npm install
npm install --global gulp
gulp default
```

Then, your blog will be available at `localhost:8000`. If you want to change the configuration of this blog, then referer to the `gulpfile.js` file and edit the settings of the `webserver` task.

## Some cool things
* Live reload (to check your blog while you edit it).
* Markdown.
* Minimal structure (for customization).
* While editing, all your files will be available at `build` folder.
* Styles are on the `main.scss` file.
* If it doesn't track your files, just restart Kuni.

--------

I hope that you like this little thing that I made for own purposes. Actually, this is what powers [my website](https://mimashita.moe) at this moment. Enjoy! <3