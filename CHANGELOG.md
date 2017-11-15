# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.1] - 2017-11-15
### Fixed
- Check for error before handling stats (#5)

## [1.4.0] - 2017-10-06
### Changed
- No longer reoutput file when webpack does not reemit that file (#4)
- Shorter output with watch

## [1.3.1] - 2017-09-30
### Fixed
- No longer crash on empty entrypoint (#3)

## [1.3.0] - 2017-09-28
### Changed
- memoryFsStream is now [memory-fs-stream](https://github.com/whs/memory-fs-stream).

### Fixed
- No longer produce error on error in watch mode.

## [1.2.0] - 2017-08-10
### Fixed
- Added Windows support for memoryFsStream

## [1.1.0] - 2017-07-08
### Added
- `additionalEntries` support

[Unreleased]: https://github.com/whs/piped-webpack/compare/v1.4.1...HEAD
[1.4.1]: https://github.com/whs/piped-webpack/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/whs/piped-webpack/compare/v1.3.1...v1.4.0
[1.3.1]: https://github.com/whs/piped-webpack/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/whs/piped-webpack/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/whs/piped-webpack/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/whs/piped-webpack/compare/v1.0.0...v1.1.0
