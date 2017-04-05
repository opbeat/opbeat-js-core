# Opbeat for JavaScript core (for development)

[![Build status](https://travis-ci.org/opbeat/opbeat-js-core.svg?branch=master)](https://travis-ci.org/opbeat/opbeat-js-core)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)
<a href="https://opbeat.com" title="Opbeat"><img src="http://opbeat-brand-assets.s3-website-us-east-1.amazonaws.com/svg/logo/logo.svg" align="right" height="25px"></a>


This is the core JavaScript module for [Opbeat](https://opbeat.com). 

**Only use this repo if you want to implement an integration for a framework Opbeat does not support yet.**

The module contains the APIs used by other JavaScript integrations like [Opbeat for AngularJS](https://github.com/opbeat/opbeat-angular) and [Opbeat for plain JavaScript](https://github.com/opbeat/opbeat-plain-js/).

If you want error logging or performance monitoring in your frontend app, you probably want to use one of our [supported frontend modules](https://opbeat.com/docs/topics/javascript/). If you are looking for a module for your Node.js applications, please see [Opbeat for Node.js](https://github.com/opbeat/opbeat-node) on GitHub.

## Development

Use `npm run karma` to continuously run unit tests during development.

Use `npm test` to run both unit tests and e2e tests.

## Making a release

Use `npm run prepare-patch` or `npm run prepare-minor` to prepare and publish a release.
Note that you should NOT make a new commit for the release it will be done in the preparation process.

## License
MIT

<br>Made with ♥️ and ☕️ by Opbeat and our community.
