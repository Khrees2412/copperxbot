import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import {
    requestEmailOTP,
    authenticateEmailOTP,
    getProfile,
    getKycStatus,
    getOrganizationId,
} from "./auth";
import { setupPusher } from "./pusher";
import { getBalances, getWallets } from "./wallet";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not defined in .env");
}

const bot = new TelegramBot(token, { polling: true });

let userSessions: {
    [chatId: number]: {
        email?: string;
        token?: string;
        organizationId?: string;
        sid?: string;
    };
} = {};

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
        chatId,
        "Welcome to the Copperx Telegram Bot! Please provide your email to login."
    );
    userSessions[chatId] = {};
});

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (msg.text && msg.text.startsWith("/")) return; // ignore commands

    if (!userSessions[chatId]?.email) {
        userSessions[chatId] = userSessions[chatId] || {};
        userSessions[chatId].email = text!.trim();
        try {
            const sid = await requestEmailOTP(userSessions[chatId].email!);
            userSessions[chatId].sid = sid;
            bot.sendMessage(
                chatId,
                "An OTP has been sent to your email. Please enter it now."
            );
        } catch (error: any) {
            bot.sendMessage(chatId, error.message);
        }
    } else if (!userSessions[chatId].token) {
        try {
            const token = await authenticateEmailOTP(
                userSessions[chatId].email!,
                text!,
                userSessions[chatId].sid!
            );
            userSessions[chatId].token = token;
            console.log(
                `Token stored for ${userSessions[chatId].email}: ${token}`
            );
            console.log("userSession object after auth", userSessions);
            const profile = await getProfile(token);
            const kyc = await getKycStatus(token);
            let kycStatusMessage = "KYC status: Not available.";
            if (kyc && kyc.length > 0) {
                if (kyc[0].status === "approved") {
                    kycStatusMessage = `KYC status: ${kyc[0].status}`;
                } else {
                    kycStatusMessage = `KYC status: ${kyc[0].status}. Please complete KYC here: [KYC Link Placeholder]`; // Replace with actual KYC link
                }
            } else {
                kycStatusMessage =
                    "Please complete KYC here: [KYC Link Placeholder]"; // Replace with actual KYC link
            }
            const orgId = await getOrganizationId(token);
            userSessions[chatId].organizationId = orgId;
            bot.sendMessage(
                chatId,
                `Authentication successful! Welcome, ${profile.firstName} ${profile.lastName}. ${kycStatusMessage}`,
                { parse_mode: "Markdown" }
            );
            setupPusher(bot, chatId, token, orgId);
        } catch (error: any) {
            bot.sendMessage(chatId, error.message);
        }
    }
});

async function checkTokenAndAuthenticate(
    chatId: number,
    bot: TelegramBot
): Promise<boolean> {
    if (!userSessions[chatId]?.token) {
        bot.sendMessage(chatId, "Please log in first using /start.");
        console.log("token is undefined");
        return false;
    }
    try {
        console.log(`Checking token: ${userSessions[chatId].token}`);
        await getProfile(userSessions[chatId].token!);
        return true;
    } catch (error: any) {
        if (error.response && error.response.status === 401) {
            bot.sendMessage(
                chatId,
                "Your session has expired. Please log in again using /start."
            );
            userSessions[chatId] = {};
            return false;
        }
        bot.sendMessage(
            chatId,
            "An unexpected error occurred. Please try again later."
        );
        console.error("Unexpected error:", error);
        return false;
    }
}

bot.onText(/\/balance/, async (msg) => {
    const chatId = msg.chat.id;
    if (!(await checkTokenAndAuthenticate(chatId, bot))) return;
    try {
        const balances = await getBalances(userSessions[chatId].token!);
        let balanceMessage = "💰 *Wallet Balances*\n\n";
        if (balances.length === 0) {
            balanceMessage = "You have no balances.";
        } else {
            balances.forEach((balance: any) => {
                balanceMessage += `${balance.balance} ${balance.currency} on ${balance.network}\n`;
            });
        }
        bot.sendMessage(chatId, balanceMessage, { parse_mode: "Markdown" });
    } catch (error: any) {
        bot.sendMessage(chatId, error.message);
    }
});

bot.onText(/\/wallets/, async (msg) => {
    const chatId = msg.chat.id;
    if (!(await checkTokenAndAuthenticate(chatId, bot))) return;
    try {
        const wallets = await getWallets(userSessions[chatId].token!);
        let walletMessage = "💼 *Your Wallets*\n\n";
        if (wallets.length === 0) {
            walletMessage = "You have no wallets.";
        } else {
            wallets.forEach((wallet: any) => {
                walletMessage += `Wallet ID: ${wallet.id}, Network: ${wallet.network}, Currency: ${wallet.currency}\n`;
            });
        }
        bot.sendMessage(chatId, walletMessage, { parse_mode: "Markdown" });
    } catch (error: any) {
        bot.sendMessage(chatId, error.message);
    }
});

console.log("Bot is running...");
