# Botmock Dialogflow Export

Node.js project for importing [Botmock](https://botmock.com) projects in [Botium](https://botium.atlassian.net/wiki/spaces/BOTIUM/overview)

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

The output of this exporter are [text files supported by Botium](https://botium.atlassian.net/wiki/spaces/BOTIUM/overview) (*.convo.txt, *.utterances.txt).

> **Note**: If you are using Botium Box, then it is easier to compress the result to zip, and import it as one file.

### Usage

> **Note**: prerequisites
> - [Node.js LTS version](https://nodejs.org/en/)

Running the following commands should allow you to generate restorable content from your Botmock project.

- `git clone git@github.com:Botmock/botium-botmock-export.git`
- `cd botium-botmock-export`
- `npm install`
- `mv ./sample.env ./.env` and edit `.env` to contain your token and project ids
- `npm start`
