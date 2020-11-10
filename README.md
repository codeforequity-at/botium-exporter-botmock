# Botmock Botium Export

[Botmock](https://botmock.com) Exporter to [Botium Text Format](https://botium-docs.readthedocs.io/en/latest/05_botiumscript/index.html#composing-in-text-files)

> **Note**: This exporter is experimental, not all features of Botmock, and Botium are supported.

## Table of Contents

* [Overview](#overview)
  * [Limitation](#limitation)
  * [Usage](#usage)

## Overview

### Limitation

Botmock features not yet supported:
- More languages (english is supported and tested)
- More platforms (generic platform is supported and tested)
- Audio
- Ssml
- Message delay
- Root intents (Conversations are starting always from root messages)
- Connector conditions (It is possible that this exporter creates an invalid conversation. Where a condition is false)
- Alternative bot replies
- Full support for variables. (now in bot messages Botmock variables are replaced by Botium variables.)

### Usage

> **Note**: prerequisites
> - [Node.js LTS version](https://nodejs.org/en/)

Running the following commands should allow you to generate restorable content from your Botmock project.

- `git clone git@github.com:Botmock/botium-botmock-export.git`
- `cd botium-botmock-export`
- `npm install`
- `mv ./sample.env ./.env` and edit `.env` to contain your token and project ids
- `npm start`

The exported Botium Text Format can be used with all Botium Stack components:
  * [Botium CLI](https://github.com/codeforequity-at/botium-cli/)
  * [Botium Bindings](https://github.com/codeforequity-at/botium-bindings/)
  * [Botium Box](https://www.botium.at)
