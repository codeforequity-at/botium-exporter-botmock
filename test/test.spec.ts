// import {BaseExporter, Resources, FileWriter, Kind, ProjectReference} from "@botmock/export";
// import {Botmock} from "@botmock/export/src/types/index";
// import { BotDriver } from "botium-core"

import {assert} from 'chai'
import fs from 'fs'
import path from 'path'
import {BotiumBotmockExporter} from '../src/BotiumBotmockExporter'
import YAML from 'yaml'

const INPUT_POSTFIX = '.input.yml'
const OUTPUT_POSTFIX = '.expectedOutput.yml'
const OUTPUT_DEBUG_POSTFIX = '.expectedOutput.debug.yml'
const TEST_DIR = 'resources'

describe('dynamic', () => {
    fs.readdirSync(path.join(__dirname, TEST_DIR))
        .filter((file: string) => file.endsWith(INPUT_POSTFIX))
        .map((file: string) => file.substring(0, file.length - INPUT_POSTFIX.length))
        .forEach((suiteName: string) => {
            describe('dynamic', () => {
            it('no debug', async () => {
                const input = YAML.parse(fs.readFileSync(path.join(__dirname, TEST_DIR, suiteName + INPUT_POSTFIX)).toString())
                // output looks better with yaml format. JSON displays filecontent in one row with '\n'
                const expectedOutput = YAML.parse(fs.readFileSync(path.join(__dirname, TEST_DIR, suiteName + OUTPUT_POSTFIX)).toString())
                const botiumBotmockExporter = new BotiumBotmockExporter({token: ''})

                const output = botiumBotmockExporter.txtTransformation(input)

                assert.deepEqual(output, expectedOutput)
            })
            const pathDebug = path.join(__dirname, TEST_DIR, suiteName + OUTPUT_DEBUG_POSTFIX)
            if (fs.existsSync(pathDebug)) {
                it('debug', async () => {
                    const input = YAML.parse(fs.readFileSync(path.join(__dirname, TEST_DIR, suiteName + INPUT_POSTFIX)).toString())
                    // output looks better with yaml format. JSON displays filecontent in one row with '\n'
                    const expectedOutput = YAML.parse(fs.readFileSync(pathDebug).toString())
                    const botiumBotmockExporter = new BotiumBotmockExporter({token: '', debug: true})

                    const output = botiumBotmockExporter.txtTransformation(input)

                    assert.deepEqual(output, expectedOutput)
                })
            }
            })
        })
})
