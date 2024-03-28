module.exports = {
  apps : [{
    name   : "job",
    script : "./src/job/job.js"
  },{
    name   : "server",
    script : "./src/server/server.js"
  }],
  // Deployment Configuration
  deploy : {
    production : {
       "user" : "andre",
       "host" : ["raspberrypi.local"],
       "ref"  : "origin/main",
       "repo" : "git@github.com:AndreSantos/product_catalog.git",
       "path" : "/home/andre/project",
       "post-deploy" : "pm2 reload ecosystem.config.cjs"
    }
  }
}
