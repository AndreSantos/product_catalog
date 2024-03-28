module.exports = {
  apps : [{
    name   : "telegram",
    script : "./src/telegram.js"
  }],
  // Deployment Configuration
  deploy : {
    production : {
       "user" : "andre",
       "host" : ["raspberrypi.local"],
       "ref"  : "origin/master",
       "repo" : "git@github.com:AndreSantos/product_catalog.git",
       "path" : "/home/andre/project",
       "post-deploy" : "npm install"
    }
  }
}
