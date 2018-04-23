import Telegraf from "telegraf"

const parseMode = Telegraf.Extra.markdown()

export class ChatService {

    sendTeamGreeting(reply) {
        reply(`*Lets Play!*`, parseMode)
    }

    sendOperationFailed(reply) {
        reply("*Ooooops*, I'm sorry, something went wrong. Try again later.", parseMode)
    }
 
    sendTeamNotRegistered(reply) {
        reply("*Please register team!*", parseMode)
    }

    sendMatchVoteMessage() {

    }

}