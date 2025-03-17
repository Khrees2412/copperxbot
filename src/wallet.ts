import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_BASE_URL = process.env.COPPERX_API_BASE_URL;

export async function getBalances(token: string): Promise<any> {
    try {
        const response = await axios.get(`${API_BASE_URL}/wallets/balances`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error: any) {
        console.error(
            "Error getting balances:",
            error.response?.data || error.message
        );
        throw new Error(
            "Failed to get wallet balances. Please try again later."
        );
    }
}

export async function getWallets(token: string): Promise<any> {
    try {
        const response = await axios.get(`${API_BASE_URL}/wallets`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error: any) {
        console.error(
            "Error getting wallets:",
            error.response?.data || error.message
        );
        throw new Error("Failed to get wallets. Please try again later.");
    }
}
