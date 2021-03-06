/**
 * gulp工作流
 *TODO: 1)解决sass,cssmin全部文件编译压缩的问题2)watch gulpfilejs自动重启;2)include执行后不能立即刷新问题
 */
var projectName = '', // projectName = '',
    publicPath = 'dist/',  // publicPath = '',
    gulp = require( 'gulp' ),
    watch = require( 'gulp-watch' ),
    sass = require( 'gulp-sass' ),
    cssmin = require( 'gulp-cssmin' ),
    imagemin = require('gulp-imagemin'),
    rename = require('gulp-rename'),
    clean = require('gulp-clean'),
    usemin = require('gulp-usemin'),
    htmlmin = require('gulp-htmlmin'),
    rev = require('gulp-rev'),
    uglify = require('gulp-uglify'),
    base64 = require('gulp-base64'),
    spritesmith = require("gulp-spritesmith"),
    gulpif = require("gulp-if"),
    fileinclude = require('gulp-file-include'),
    browserSync = require( 'browser-sync' ).create(),
    reload = browserSync.reload;

// scss编译后的css将注入到浏览器里实现更新
gulp.task( 'sass', function() {
    return gulp.src([ projectName + "src/sass/**/*.scss", '!'+projectName+"src/sass/mixin.scss", '!'+projectName+"src/sass/sprite.scss" ])
        .pipe( sass({ outputStyle: 'expanded' }).on( 'error', function( err ){ console.log( err ); this.emit('end'); } ) ) // nested/expanded/compact/compressed
        .pipe( gulp.dest(projectName + "src/css") )
        //.pipe( reload({stream: true}) );
});
gulp.task('sass:watch', function () {
  gulp.watch([ "src/sass/**/*.scss", "src/sass/mobile/*.scss" ], ['sass']);
});

// html 整合
gulp.task('include', function () {
    return gulp.src([projectName + 'src/templates/**/*.html','!'+projectName + "src/templates/inc/*.html"])
    .pipe(fileinclude({
      prefix: '@@',
      basepath: '@file'
    }))
    .pipe(gulp.dest(projectName + 'src'));
});

// css sprite
gulp.task('sprite', function () {
    return  gulp.src(projectName + 'src/images/sprite/*.png')
        .pipe(spritesmith({
            imgName: 'sprite.png',
            styleName: 'sprite.scss',
            imgPath: '../images/sprite.png',
            // cssFormat: 'css',
            // Prefix all sprite names with `sprite-` (e.g. `home` -> `sprite-home`)
            cssVarMap: function (sprite) {
              sprite.name = 'sprite' + sprite.name;
            }
        }))
        .pipe(gulpif('*.png', gulp.dest(projectName + 'src/images/')))
        .pipe(gulpif('*.scss', gulp.dest(projectName + 'src/sass/')));
});

// css压缩
gulp.task( 'cssmin', ['sass'], function() {
    return gulp.src( [projectName + "src/css/**/*.css", "!"+projectName + "src/css/**/*.min.css"] )
        .pipe(cssmin()) // nested/expanded/compact/compressed
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest(projectName + 'src/css/'))
        //.pipe(reload({stream: true}));
});

// 图片压缩
gulp.task( 'imagemin', [ 'clean' ], function() {
    return gulp.src(projectName + "src/images/**/*")
        .pipe(imagemin())
        .pipe(gulp.dest(projectName + publicPath + 'images/'))
});

// 清除dist
gulp.task( 'clean', function () {
   return gulp.src([ projectName + 'dist/' ], {read: false})
        .pipe(clean());
});

// copy
gulp.task( 'copy', [ 'clean' ], function () {
    return gulp.src([ projectName + 'src/plugins/**/*' ])
        .pipe(gulp.dest(projectName + publicPath + 'plugins/'));
});

// 生产环境usemin
gulp.task('usemin', ['copy','imagemin'], function() {
    return gulp.src([ projectName + 'src/**/*.html',"!"+projectName + "src/templates/**/*.html"])
    .pipe(usemin({
        html: [
            function () {
                return htmlmin({ 
                    removeComments: true,  //清除HTML注释
                    //collapseWhitespace: true,  //压缩HTML
                    collapseBooleanAttributes: true,  //省略布尔属性的值 <input checked="true"/> ==> <input />
                    //removeAttributeQuotes: true,  //尽可能地删除html属性的引号
                    removeRedundantAttributes: true,  //当属性值是默认值时删除该属性
                    useShortDoctype: true,  //doctype使用简短形式(h5)
                    //removeOptionalTags: true,  //尽量移除不需要的闭合标签
                    removeEmptyAttributes: true,  //删除所有空格作属性值 <input id="" /> ==> <input />
                    removeScriptTypeAttributes: true,  //删除<script>的type="text/javascript"
                    removeStyleLinkTypeAttributes: true,  //删除<style>和<link>的type="text/css"
                    minifyJS: true,  //压缩页面JS
                    minifyCSS: true  //压缩页面CSS
                })
            }
        ],
        css: [ function () { return cssmin() }, function () { return base64() }, function () { return rev() } ],
        css1: [ function () { return cssmin() }, function () { return rev() } ],
        js: [ function () { return uglify() }, function () { return rev() } ],
        js1: [ function () { return uglify() }, function () { return rev() } ]
    }))
    .pipe(gulp.dest(projectName + publicPath));
});

// usemin后执行base64进行优化
gulp.task('base64', ['usemin'], function () {
    return gulp.src( projectName + publicPath + "css/**/*.css" )
        .pipe(base64({
            //baseDir: 'public',
            //extensions: ['svg', 'png', /\.jpg#datauri$/i], 
            //exclude:    [/\.server\.(com|net)\/dynamic\//, '--live.jpg'],
            maxImageSize: 3*1024, // bytes 
            //debug: true
        }))
        .pipe(gulp.dest(projectName + publicPath + "css"));
});

// 正常开发环境
gulp.task('dev', ['sass','include'], function() {
    browserSync.init({
        server: {
            baseDir: "./" + projectName + "src",
        },
        index: 'index.html'
    });
    // 监听 html 自动include
    gulp.watch(projectName + 'src/templates/**/*.html', ['include']);
    gulp.watch( projectName + "src/images/sprite/*.png", ['sprite'] ); // 监听sprite,自动生成雪碧图
    gulp.watch( projectName + "src/sass/**/*.scss", ['sass'] ); // 监听SASS
    gulp.watch( [ projectName + "src/**/*.html", "!"+projectName + "src/templates/**/*.html", projectName + "src/css/**/*.css", projectName + "src/js/**/*.js", projectName + "src/images/**/*.(png|jpg|jpeg|gif)"], reload ); // 监听html/css/js
});

// 打包
gulp.task('build', ['base64'], function() {
    browserSync.init({
        server: {
            baseDir: "./"+projectName + publicPath
        },
        startPath: "index.html"
    });
    //gulp.watch( [projectName + publicPath + "**/*.html", projectName + publicPath + "css/**/*.css", projectName + publicPath + "js/**/*.js"], reload ); // 监听html/css/js
});