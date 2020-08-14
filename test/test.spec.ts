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
const TEST_DIR = 'resources'

describe('dynamic', () => {
    fs.readdirSync(path.join(__dirname, TEST_DIR))
        .filter((file: string) => file.endsWith(INPUT_POSTFIX))
        .map((file: string) => file.substring(0, file.length - INPUT_POSTFIX.length))
        .forEach((suiteName: string) => {
            it(suiteName, async () => {

                const input = YAML.parse(fs.readFileSync(path.join(__dirname, TEST_DIR, suiteName + INPUT_POSTFIX)).toString())
                const expectedOutput = YAML.parse(fs.readFileSync(path.join(__dirname, TEST_DIR, suiteName + OUTPUT_POSTFIX)).toString())
                const botiumBotmockExporter = new BotiumBotmockExporter({token: ''})

                const output = botiumBotmockExporter.txtTransformation(input)
                fs.writeFileSync(`delme/${suiteName}.json`, JSON.stringify(output));

                assert.deepEqual(output, expectedOutput)

                // for (const key of Object.keys(output)) {
                //     // JSON.parse + JSON.stringify: we are not able to store undefined in a json file.
                //     // So we are removing from output too
                //     // fs.writeFileSync('delme\\' + key + '.json', JSON.stringify(output[key]), 'utf8')
                //     assert.deepEqual(JSON.parse(JSON.stringify(output[key])), expectedOutput[key], `The field ${key} does not match`)
                // }
            })
        })
})
