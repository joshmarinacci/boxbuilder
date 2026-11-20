// pm2 deploy config for boxbuilder. The app is a static site, so no pm2 process runs; pm2 deploy
// checks out the repo on the server and builds it.
//
//   pm2 deploy ecosystem.config.cjs production setup   # first time: clone repo on the server
//   pm2 deploy ecosystem.config.cjs production         # every deploy after that
//
// A deploy checks out `ref` into <path>/source (reached through <path>/current), installs
// dependencies and runs the production build. Point the web server at <path>/current/dist,
// served under /boxbuilder/ (the base path is set in vite.config.ts). The server needs Node
// 20.19+ or 22.12+ (see "engines" in package.json).
// Override the defaults with the BOXBUILDER_DEPLOY_* variables.

module.exports = {
    apps: [],

    deploy: {
        production: {
            user: process.env.BOXBUILDER_DEPLOY_USER || 'deployman',
            host: [process.env.BOXBUILDER_DEPLOY_HOST || 'josh.earth'],
            key: process.env.BOXBUILDER_DEPLOY_KEY || '../deployman_private.key',
            ref: process.env.BOXBUILDER_DEPLOY_REF || 'origin/main',
            repo: 'https://github.com/joshmarinacci/boxbuilder.git',
            path: process.env.BOXBUILDER_DEPLOY_PATH || '/projects/boxbuilder',
            'post-deploy': 'npm ci && npm run build',
        },
    },
}
