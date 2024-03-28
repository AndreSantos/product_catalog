import TelegramBot from 'node-telegram-bot-api';
import { readFileSync } from 'node:fs';

let tokenAndChatId;
function getBotTokenAndChatId() {
    if (tokenAndChatId) {
        return;
    }
    const fileContents = readFileSync('src/secret/telegram_bot_token_and_chat_id.txt', 'utf8');
    tokenAndChatId = {
        token: fileContents.split("/")[0],
        chatId: fileContents.split("/")[1],
    };
    return tokenAndChatId;
}

export function sendTelegram(message) {
    const tokenAndChatId = getBotTokenAndChatId();
    const bot = new TelegramBot(tokenAndChatId.token, {polling: true});
    
    bot.sendMessage(tokenAndChatId.chatId, message);
}

sendTelegram("abc");