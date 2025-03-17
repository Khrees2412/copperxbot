import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_BASE_URL = process.env.COPPERX_API_BASE_URL;

export async function requestEmailOTP(email: string): Promise<string> {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/auth/email-otp/request`,
            { email }
        );
        return response.data.sid; // Capture the sid
    } catch (error: any) {
        console.error(
            "Error requesting OTP:",
            error.response?.data || error.message
        );
        throw new Error(
            "Failed to request OTP. Please check your email address and try again."
        );
    }
}
// src/auth.ts
export async function authenticateEmailOTP(
    email: string,
    otp: string,
    sid: string
): Promise<string> {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/auth/email-otp/authenticate`,
            { email, otp, sid }
        );
        console.log("Authenticate API response:", response.data);
        return response.data.accessToken; // Corrected line
    } catch (error: any) {
        console.error(
            "Error authenticating OTP:",
            error.response?.data || error.message
        );
        throw new Error("Invalid OTP. Please check your OTP and try again.");
    }
}

export async function getProfile(token: string): Promise<any> {
    try {
        const response = await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error: any) {
        console.error(
            "Error getting profile:",
            error.response?.data || error.message
        );
        throw new Error(
            "Failed to get your profile. Please try logging in again."
        );
    }
}

export async function getKycStatus(token: string): Promise<any> {
    try {
        const response = await axios.get(`${API_BASE_URL}/kycs`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data.status;
    } catch (error: any) {
        console.error(
            "Error getting KYC status:",
            error.response?.data || error.message
        );
        throw new Error(
            "Failed to get your KYC status. Please try logging in again."
        );
    }
}

export async function getOrganizationId(token: string): Promise<string> {
    try {
        const profile = await getProfile(token);
        return profile.organizationId;
    } catch (error) {
        throw new Error("Could not retrieve organization ID");
    }
}
