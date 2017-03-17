<a name="0.2.0"></a>
# [0.2.0](https://github.com/opbeat/opbeat-js-core/compare/v0.1.0...v0.2.0) (2017-03-17)


### Bug Fixes

* Add tasks on invoke ([092f12a](https://github.com/opbeat/opbeat-js-core/commit/092f12a))
* Check `document` before getting current script for serverside rendering. ([a33ca02](https://github.com/opbeat/opbeat-js-core/commit/a33ca02))
* ignore duplicate resources in traces ([680d33e](https://github.com/opbeat/opbeat-js-core/commit/680d33e))
* only send transaction if it has more than one traces ([aaa9e11](https://github.com/opbeat/opbeat-js-core/commit/aaa9e11))
* remove TransportMock from the public API. ([550c95c](https://github.com/opbeat/opbeat-js-core/commit/550c95c))
* **Transaction:** Only wait for tasks to finish a transaction ([6acfa6d](https://github.com/opbeat/opbeat-js-core/commit/6acfa6d))
* **ZoneService:** Handle promise tasks properly. ([b510679](https://github.com/opbeat/opbeat-js-core/commit/b510679))
* **ZoneService:** Ignore some mouse events for now. ([b2aed7c](https://github.com/opbeat/opbeat-js-core/commit/b2aed7c))
* **ZoneService:** Update initialization to work with SSR. ([0911b82](https://github.com/opbeat/opbeat-js-core/commit/0911b82))


### Features

* Add "truncated traces" feature. ([383f65b](https://github.com/opbeat/opbeat-js-core/commit/383f65b))
* Infrastructure needed to support interactions. ([20ed4de](https://github.com/opbeat/opbeat-js-core/commit/20ed4de))
* use filters for errors. ([2497c95](https://github.com/opbeat/opbeat-js-core/commit/2497c95))
* **transactionService:** Allow integrations to ignore transactions by name. ([5ea4b7d](https://github.com/opbeat/opbeat-js-core/commit/5ea4b7d))



<a name="0.1.0"></a>
# [0.1.0](https://github.com/opbeat/opbeat-js-core/compare/dfe9699...v0.1.0) (2017-03-14)


### Bug Fixes

* **angularInitializer:** try to register opbeat during initialization if possible ([7a155b3](https://github.com/opbeat/opbeat-js-core/commit/7a155b3)), closes [#69](https://github.com/opbeat/opbeat-js-core/issues/69)
* **captureHardNavigation:** filter out late traces ([e8e7010](https://github.com/opbeat/opbeat-js-core/commit/e8e7010))
* **Config:** consider empty objects ([e00dfed](https://github.com/opbeat/opbeat-js-core/commit/e00dfed))
* **frames:** consider empty userContext ([f98f368](https://github.com/opbeat/opbeat-js-core/commit/f98f368))
* **opbeat-angular:** initialize only if we support the platform ([4bb85a2](https://github.com/opbeat/opbeat-js-core/commit/4bb85a2))
* **OpbeatBackend:** send headers to transport ([6c4b632](https://github.com/opbeat/opbeat-js-core/commit/6c4b632))
* **OpbeatBackend:** warn if sending transaction fails ([a6800e7](https://github.com/opbeat/opbeat-js-core/commit/a6800e7))
* **transaction:** adjust rootTrace when all traces are finished ([63d76d2](https://github.com/opbeat/opbeat-js-core/commit/63d76d2))
* contextual data ([0963343](https://github.com/opbeat/opbeat-js-core/commit/0963343))
* **TransactionService:** check if the transaction is a hard navigation ([d5defa7](https://github.com/opbeat/opbeat-js-core/commit/d5defa7))
* **TransactionService:** only create transaction in opbeat zone ([4b445ac](https://github.com/opbeat/opbeat-js-core/commit/4b445ac))
* **TransactionService:** only redefine the transaction if it's a ZoneTransaction ([4a1f4c7](https://github.com/opbeat/opbeat-js-core/commit/4a1f4c7))
* **zoneService:** consider undefined timeout ([55b4b53](https://github.com/opbeat/opbeat-js-core/commit/55b4b53))
* **ZoneService:** remove requestAnimationFrame task ([abc924d](https://github.com/opbeat/opbeat-js-core/commit/abc924d))
* **ZoneService:** use XHR DONE constant on the target ([dfe9699](https://github.com/opbeat/opbeat-js-core/commit/dfe9699))
* add file_errors to errors extra.debug ([86ce824](https://github.com/opbeat/opbeat-js-core/commit/86ce824))
* add transaction_kind ([4eaaee2](https://github.com/opbeat/opbeat-js-core/commit/4eaaee2))
* capture location before ending transaction ([9b6cf81](https://github.com/opbeat/opbeat-js-core/commit/9b6cf81))
* end XHR in onInvokeTask as fall back ([a448c85](https://github.com/opbeat/opbeat-js-core/commit/a448c85))
* **ZoneServiceMock:** return value from run functions ([25639f9](https://github.com/opbeat/opbeat-js-core/commit/25639f9))
* exclude rootTrace when adjusting to the latest trace ([21e50a8](https://github.com/opbeat/opbeat-js-core/commit/21e50a8))
* only send file_errors if it's not empty ([f52a34f](https://github.com/opbeat/opbeat-js-core/commit/f52a34f))
* remove sourcemap detection ([647a7bc](https://github.com/opbeat/opbeat-js-core/commit/647a7bc))
* search for opbeat script for configuration ([eea8e96](https://github.com/opbeat/opbeat-js-core/commit/eea8e96))
* start transaction on first task ([ebe9812](https://github.com/opbeat/opbeat-js-core/commit/ebe9812))
* use _debug for transactions contextInfo ([e71a382](https://github.com/opbeat/opbeat-js-core/commit/e71a382))
* use fetchStart instead of navigationStart for the base time ([c5ae330](https://github.com/opbeat/opbeat-js-core/commit/c5ae330))


### Features

* **captureHardNavigation:** add navigation timings to metrics ([7c3de34](https://github.com/opbeat/opbeat-js-core/commit/7c3de34))
* **interactions:** capture ngClick and ngSubmit interactions ([311b0cd](https://github.com/opbeat/opbeat-js-core/commit/311b0cd))
* **ngOpbeat:** add angular version and platform to config ([a0a79b9](https://github.com/opbeat/opbeat-js-core/commit/a0a79b9))
* **opbeat-angular:** load opbeat-angular before or after angular ([d1a9698](https://github.com/opbeat/opbeat-js-core/commit/d1a9698))
* **OpbeatBackend:** parse browser.location ([ec37a23](https://github.com/opbeat/opbeat-js-core/commit/ec37a23))
* **OpbeatBackend:** send contextInfo ([00e999f](https://github.com/opbeat/opbeat-js-core/commit/00e999f))
* **Transaction:** add contextInfo ([75c3cdb](https://github.com/opbeat/opbeat-js-core/commit/75c3cdb))
* **Transaction:** add metrics ([266515b](https://github.com/opbeat/opbeat-js-core/commit/266515b))
* **Transaction:** add sendVerboseDebugInfo to transactions ([441f4eb](https://github.com/opbeat/opbeat-js-core/commit/441f4eb))
* **transactionService:** detectFinish onInvokeEnd ([c3335ae](https://github.com/opbeat/opbeat-js-core/commit/c3335ae))
* **TransactionService:** add sendPageLoadMetrics ([992bae9](https://github.com/opbeat/opbeat-js-core/commit/992bae9))
* **TransactionService:** manually set initial page load name ([7bc5f46](https://github.com/opbeat/opbeat-js-core/commit/7bc5f46))
* expose Subscription ([f320bb2](https://github.com/opbeat/opbeat-js-core/commit/f320bb2))
* **TransactionService:** parse XHR url ([83ab65c](https://github.com/opbeat/opbeat-js-core/commit/83ab65c))
* **utils:** add parseUrl ([32bc7f2](https://github.com/opbeat/opbeat-js-core/commit/32bc7f2))
* expose public APIs ([c631d57](https://github.com/opbeat/opbeat-js-core/commit/c631d57))
* **zoneService:** add onInvokeStart and onInvokeEnd events ([a06b0fc](https://github.com/opbeat/opbeat-js-core/commit/a06b0fc))
* accept options.extra as error contextual data ([923e13f](https://github.com/opbeat/opbeat-js-core/commit/923e13f))
* add includeXHRQueryString to config ([9c753f3](https://github.com/opbeat/opbeat-js-core/commit/9c753f3))
* add protocol to utils.parseUrl ([3377bb6](https://github.com/opbeat/opbeat-js-core/commit/3377bb6))
* capture page load metrics ([52448e6](https://github.com/opbeat/opbeat-js-core/commit/52448e6))
* consder zoneTransaction before sending initial page load metrics ([6c7e915](https://github.com/opbeat/opbeat-js-core/commit/6c7e915))
* enable capturing page load metrics by default ([6bebf96](https://github.com/opbeat/opbeat-js-core/commit/6bebf96))
* store debug data on frames ([28361c1](https://github.com/opbeat/opbeat-js-core/commit/28361c1))
* use extra context on error ([dc78bc9](https://github.com/opbeat/opbeat-js-core/commit/dc78bc9))
* **ZoneService:** add isOpbeatZone ([27396e9](https://github.com/opbeat/opbeat-js-core/commit/27396e9))



