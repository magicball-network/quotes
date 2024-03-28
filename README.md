# LBA Game Quotes

This repository contains the text from the Little Big Adventure games.
The quotes are stored in separate YAML files which are bundles into two JSON files during the build.

To enrich the quotes with information about the speaker and more exactly location please
use the quote website and press the ✏ to find the appropriate file to edit.

# Development

Development makes use of NodeJS.

## Building

Various NPM scripts are defined:

-   clean -- remove generated content
-   validate -- validate input files
-   build -- build the result
-   test -- test the results

The start command will execute: validate, build, test
