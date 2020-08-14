export interface BotiumHeader {
    name: string;
}

export namespace Botium {

    export interface Convo {
        header: Header;
        conversation: ConvoStep[];
    }

    export interface Header {
        name: string;
        description?: string;
    }

    export interface ConvoStep {
        sender: string;
        messageText?: string;
        asserters?: Asserter[]
    }

    export interface Asserter {
        name: string;
        args: string[];
    }
}
