import "dotenv/config";
import {BaseExporter, Botmock, DataTransformation, Resources} from "@botmock/export";
import {BotDriver} from "botium-core"
import {sanitize} from "sanitize-filename-ts";

const SCRIPTING_FORMAT_TXT = 'SCRIPTING_FORMAT_TXT'
const SCRIPTING_TYPE_CONVO = 'SCRIPTING_TYPE_CONVO'
// const SCRIPTING_TYPE_UTTERANCES = 'SCRIPTING_TYPE_UTTERANCES'

import {Botium} from "./types";

interface Log {
    // node or connection
    type: string,

    connectionBranchingReason?: Botmock.Message['next_message_ids'][0],
    connectionBranchCount?: number,
    connectionBranchIndex?: number,
    // the connection itself is extracted
    connectionTerminatedReason?: string

    // just for node type
    nodeName?: string,
    nodeMessageId?: string,
    nodeMessageType?: string,
    // the node itself is extracted
    nodeTerminatedReason?: string
}

interface ResultEntry {
    botiumConvoSteps: Botium.ConvoStep[],
    processedMessageId: string[],
    logs: Log[],
}

interface Utterance {
    name: string,
    utterances: string[]
}

export class BotiumBotmockExporter extends BaseExporter {
    #CONVO_POSTFIX = ".convo.txt";
    #UTTERANCES_POSTFIX = ".utterances.txt";

    #getFallbackSafe = (obj: any, key: string) => {
        if (!obj) {
            return null;
        }

        if (obj[key]) {
            return (obj[key]);
        }

        const keys = obj.keys();
        if (keys.length) {
            return null;
        }

        return obj[key[0]];
    };

    #getBlocks = (message: Botmock.Message, componentType: string): Botmock.Block[] => {
        const allBlock = (this.#getFallbackSafe(this.#getFallbackSafe(message.payload, 'en'), 'generic')?.blocks || []).filter((block: Botmock.Block) => block.component_type === componentType) as Botmock.Block[]

        // A node can contain the text messages of subnodes. Its better to filter them out.
        return allBlock.filter(block => block.id === message.message_id)
    }

    #intentToUtteranceRef = (intent: string): string => {
        return `UTT_${intent.split(' ').join('_').toUpperCase()}`
    }

    /**
     * Replaces botmock variables in text with botium variables,
     * if there are no variable definitions
     * @param text Text in block
     */
    #replaceVariableCharacterInTextNoVars = (text: string): string => {
        const alphanumericRegexp = new RegExp(/\%([a-zA-Z0-9_]+)\%/g);
        const matches = text.match(alphanumericRegexp);
        if (Object.is(matches, null)) {
            return text;
        }
        let replacedText = text;
        for (const match of matches as string[]) {
            const variableNameInsideMatch = match.substr(1, match.length - 2);
            replacedText = replacedText.replace(match, `$${variableNameInsideMatch}`);
        }
        return replacedText;
    };

    /**
     * Replaces botmock variables in text with botium variables
     * @param text Text in block
     */
    #replaceVariableCharacterInText = (text: string, variables: string[]): string => {
        let replacedText = text;
        for (const match of variables) {
            const variableNameInsideMatch = match.substr(1, match.length - 2);
            replacedText = replacedText.replace(match, `$${variableNameInsideMatch}`);
        }
        return replacedText;
    };

    #getConversationsRecursive = (
        messageID: string,
        messages: Map<string, Botmock.Message>,
        results: ResultEntry[],
        intent: string = '',
        botiumConvoSteps: Botium.ConvoStep[] = [],
        processedMessageId: string[] = [],
        logs: Log[] = []
    ) => {
        const currentMessage = messages.get(messageID);

        if (!currentMessage) {
            throw new Error(`Message ${messageID} not found`)
        }
        const log: Log = {
            type: 'node',
            nodeMessageId: currentMessage.message_id,
            nodeMessageType: currentMessage.message_type,
            nodeName: currentMessage.node_name || ''
        };
        logs.push(log);
        let messageTypeSupported = true;

        if (!currentMessage.is_root) {
            const botiumConvoStepBot = {
                sender: 'bot'
            } as Botium.ConvoStep
            const addAsserter = (step: Botium.ConvoStep, asserter: Botium.Asserter ) => {
                if (step.asserters) {
                    step.asserters.push(asserter)
                } else {
                    step.asserters = [asserter]
                }
                return step
            }
            if (intent) {
                addAsserter(botiumConvoStepBot,{
                    name: 'INTENT',
                    args: [intent]
                })
            }
            switch (currentMessage.message_type) {
                case 'image': {
                    const media = this.#getBlocks(currentMessage, 'image').filter((block) => block.image_url).map(block => (block.image_url)) as string[];

                    if (media.length) {
                        botiumConvoSteps.push(addAsserter(botiumConvoStepBot, {
                            name: 'MEDIA',
                            args: media
                        }))
                    }
                    break;
                }
                case 'button': {
                    const buttons: string[] = [];

                    for (const block of this.#getBlocks(currentMessage, 'button')) {
                        (block.buttons || []).filter((button: any) => button.title).forEach((button: any) => {
                            buttons.push(button.title)
                        })
                    }

                    if (buttons.length) {
                        botiumConvoSteps.push(addAsserter(botiumConvoStepBot, {
                            name: 'BUTTONS',
                            args: buttons
                        }))
                    }
                    break;
                }
                case 'generic': {
                    const cards: string[] = [];
                    const buttons: string[] = [];
                    const media: string[] = [];
                    for (const block of this.#getBlocks(currentMessage, 'generic')) {
                        for (const e of (block.elements || [])) {
                            cards.push(e.title || e.subtitle);
                            if (e.image_url) {
                                media.push(e.image_url);
                            }
                            if (e.buttons && e.buttons.length) {
                                e.buttons.forEach(b => buttons.push(b.title))
                            }
                        }
                    }

                    if (cards.length) {
                        addAsserter(botiumConvoStepBot, {
                            name: 'CARDS',
                            args: cards
                        })
                    }
                    if (media.length) {
                        addAsserter(botiumConvoStepBot, {
                            name: 'MEDIA',
                            args: media
                        })
                    }
                    if (buttons.length) {
                        addAsserter(botiumConvoStepBot, {
                            name: 'BUTTONS',
                            args: buttons
                        })
                    }
                    botiumConvoSteps.push(botiumConvoStepBot)
                    break;
                }
                case 'user_reply': {
                    const messages = [];
                    for (const block of this.#getBlocks(currentMessage, 'user_reply').filter(block => block.text)) {
                        messages.push(block.text);
                    }

                    if (messages.length) {
                        botiumConvoSteps.push({
                            sender: 'me',
                            messageText: messages.join('/n')
                        })
                    }
                    break;
                }
                case 'text': {
                    const botMessages: string[] = [];
                    for (const block of this.#getBlocks(currentMessage, 'text').filter(block => block.text)) {
                        botMessages.push(block.text as string);
                    }

                    if (botMessages.length) {
                        // TODO maybe we could variable definitions here, using the other replaceXXX function
                        botiumConvoStepBot.messageText = botMessages.map(m => this.#replaceVariableCharacterInTextNoVars(m)).join('/n')
                        botiumConvoSteps.push(botiumConvoStepBot)
                    }
                    break;
                }
                default:
                    if (intent) {
                        botiumConvoSteps.push(botiumConvoStepBot)
                    }
                    messageTypeSupported = false;

            }
        }

        if (!messageTypeSupported) {
            log.nodeTerminatedReason = `Message type "${currentMessage.message_type}" not supported`;
            results.push({
                botiumConvoSteps,
                processedMessageId,
                logs
            });
            return results
        }

        if (processedMessageId.includes(currentMessage.message_id)) {
            log.nodeTerminatedReason = `circular structure, message "${currentMessage.message_id}" is already extracted`
            results.push({
                botiumConvoSteps,
                processedMessageId,
                logs
            });
            return results
        } else {
            processedMessageId.push(currentMessage.message_id);
        }

        if (!currentMessage.next_message_ids || !currentMessage.next_message_ids.length) {
            log.nodeTerminatedReason = 'No more messages';
            results.push({
                botiumConvoSteps,
                processedMessageId,
                logs
            });
            return results
        }

        currentMessage.next_message_ids.forEach((nextMessage, nextMessageIndex) => {
            const log: Log = {
                type: 'connection',
                connectionBranchingReason: nextMessage,
                connectionBranchCount: currentMessage.next_message_ids.length,
                connectionBranchIndex: nextMessageIndex
            };
            let botiumConvoStepsCloned = [...botiumConvoSteps];
            let processedMessageIdCloned = [...processedMessageId];
            let logsCloned = [...logs, log];

            let intent = nextMessage.intent && nextMessage.intent.label
            if (intent) {
                botiumConvoStepsCloned.push({
                    sender: 'me',
                    messageText: this.#intentToUtteranceRef(intent)
                })
            }
            this.#getConversationsRecursive(
                nextMessage.message_id,
                messages,
                results,
                intent,
                botiumConvoStepsCloned,
                processedMessageIdCloned,
                logsCloned
            )
        });

        return results
    };

    #txtConvoTransformation = (
        resources: Resources,
        messages: Map<string, Botmock.Message>,
        rootMessages: string[]
    ) => {
        const extractedConversations: ResultEntry[] = [];
        for (const rootMessageId of rootMessages) {
            this.#getConversationsRecursive(rootMessageId, messages, extractedConversations);
        }

        const driver = new BotDriver();
        const compiler = driver.BuildCompiler()

        return extractedConversations.map(entry => {
            const {
                botiumConvoSteps,
                logs
            } = entry

            const decisions = logs.filter(log => log.connectionBranchCount && log.connectionBranchCount > 1).map(log => (log.connectionBranchIndex || 0) + 1)

            const convoGeneratedName = sanitize(resources.project.name) + (decisions.length ? `_${decisions.join('_')}` : '')
            const convoGeneratedDescription = this.config.debug ? logs.flatMap(log => {
                const result = []
                if (log.type === 'node') {
                    result.push(`Node "${log.nodeMessageId}": ${log.nodeName} (${log.nodeMessageType})`)
                    if (log.nodeTerminatedReason) {
                        result.push(log.nodeTerminatedReason)
                    }
                    return result
                } else {
                    result.push(`Connection "${(log.connectionBranchIndex || 0) + 1}/${(log.connectionBranchCount || 0)}":${' '.repeat(28) + JSON.stringify({
                        intent: log.connectionBranchingReason?.intent,
                        conditional: log.connectionBranchingReason?.conditional
                    })}`)
                    if (log.connectionTerminatedReason) {
                        result.push(log.connectionTerminatedReason)
                    }

                    return result
                }
            }).join('\n') : undefined
            const convo: Botium.Convo = {
                header: {
                    name: convoGeneratedName,
                    description: convoGeneratedDescription
                },
                conversation: botiumConvoSteps
            }

            const data = compiler.Decompile([convo], SCRIPTING_FORMAT_TXT, SCRIPTING_TYPE_CONVO)

            return {
                filename: convoGeneratedName + this.#CONVO_POSTFIX,
                data
            }
        });
    };

    #txtUtteranceTransformation = (
        intents: Map<string, Botmock.Intent>
    ) => {
        const resultUtteranceStructList : Utterance[] = []

        intents.forEach((intentStruct: Botmock.Intent) => {
            const botmockUtterances: Botmock.Utterance[] =
                (intentStruct.utterances['en'] && intentStruct.utterances['en'].length) ?
                    intentStruct.utterances['en'] :
                    []
            resultUtteranceStructList.push({
                name: this.#intentToUtteranceRef(intentStruct.name),
                utterances: botmockUtterances.map((u: Botmock.Utterance) => this.#replaceVariableCharacterInText(u.text, u.variables.map(v => v.name)))
            })
        });

        return resultUtteranceStructList.map((entry) => {
            const {
                name,
                utterances
            } = entry

            const data =  [name, ...utterances].join('\n')

            return {
                filename: sanitize(name) + this.#UTTERANCES_POSTFIX,
                data
            }
        });
    };

    txtTransformation = (resources: Resources): DataTransformation<string> => {
        const intents = (resources.intents || []).reduce(
            (accumulator: Map<string, Botmock.Intent>, currentValue: Botmock.Intent) => {
                accumulator.set(currentValue.id, currentValue);
                return accumulator;
            },
            new Map<string, Botmock.Intent>()
        );

        const messages = (resources.board?.board?.messages || []).reduce(
            (accumulator: Map<string, Botmock.Message>, currentValue: Botmock.Message) => {
                accumulator.set(currentValue.message_id, currentValue);
                return accumulator;
            },
            new Map<string, Botmock.Message>()
        );

        const rootMessages = (resources.board?.board?.root_messages || []) as string[];

        return [
            ...this.#txtConvoTransformation(resources, messages, rootMessages),
            ...this.#txtUtteranceTransformation(intents)
        ];
    };

    dataTransformations = new Map([["./txt/", this.txtTransformation]
    ]);
}
