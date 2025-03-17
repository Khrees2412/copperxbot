import Pusher from "pusher-js";
import axios from "axios";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const PUSHER_KEY = process.env.PUSHER_KEY;
const PUSHER_CLUSTER = process.env.PUSHER_CLUSTER;
const API_BASE_URL = process.env.COPPERX_API_BASE_URL;

export async function setupPusher(
    bot: TelegramBot,
    chatId: number,
    token: string,
    organizationId: string
): Promise<void> {
    if (!PUSHER_KEY || !PUSHER_CLUSTER) {
        console.error("Pusher keys not configured.");
        return;
    }

    const pusherClient = new Pusher(PUSHER_KEY, {
        cluster: PUSHER_CLUSTER,
        authEndpoint: `${API_BASE_URL}/notifications/auth`,
        auth: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });

    const channel = pusherClient.subscribe(`private-org-${organizationId}`);

    channel.bind("pusher:subscription_succeeded", () => {
        console.log("Successfully subscribed to private channel");
    });

    channel.bind("pusher:subscription_error", (error: any) => {
        console.error("Subscription error:", error);
    });

    channel.bind("deposit", (data: any) => {
        bot.sendMessage(
            chatId,
            `💰 *New Deposit Received*\n\n` +
                `${data.amount} USDC deposited on ${data.network}`
        );
    });
}
