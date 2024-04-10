module.exports = {
  apps : [{
    name   : "job",
    script : "./src/job/index.js",
    // Enable or disable auto restart after process failure
    autorestart: true
  },{
    name   : "server",
    script : "./src/server/server.js",
    // Enable or disable auto restart after process failure
    autorestart: true
  }],
  // Deployment Configuration
  deploy : {
    production : {
       "user" : "andre",
       "host" : ["raspberrypi.local"],
       "ref"  : "origin/main",
       "repo" : "git@github.com:AndreSantos/product_catalog.git",
       "path" : "/home/andre/project"
    }
  }
}
