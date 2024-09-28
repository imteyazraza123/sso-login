import NextAuth from "next-auth";
import jwt from 'jsonwebtoken';
import AzureADProvider from 'next-auth/providers/azure-ad';
import axios from 'axios';
import https from 'https';
import { ENV } from "@config/envConfig";

let refreshTokenTimeout;

export default NextAuth({
    providers: [
        AzureADProvider({
            clientId: ENV.AZURE_AD_CLIENT_ID || "",
            clientSecret: ENV.AZURE_AD_CLIENT_SECRET || "",
            tenantId: ENV.AZURE_AD_TENANT_ID,
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === "azure-ad" && account?.access_token && profile?.oid) {
                try {
                    const accessToken = account.access_token;
                    const oid = profile?.oid;

                    const bodyShopToken = await generateBodyShopToken(accessToken, oid);
                    if (bodyShopToken) {
                        user.employeeDetails = bodyShopToken;
                        return true;
                    }
                } catch (error) {
                    console.error("Error in signIn:", error);
                }
            }
            return false;
        },
        async jwt({ token, account, user }) {
            if (user?.employeeDetails) {
                token.employeeDetails = user.employeeDetails;
            }

            if (account) {
                token.accessToken = account.access_token;
            }

            if (token.employeeDetails?.employeeToken?.accessToken) {
                const employeeAccessToken = token.employeeDetails.employeeToken.accessToken;
                const decodedToken = jwt.decode(employeeAccessToken);
                const timeLeft = decodedToken.exp * 1000 - Date.now();

                if (decodedToken.exp * 1000 < Date.now() || timeLeft < 1 * 60 * 1000) {
                    try {
                        const refreshedToken = await refreshEmployeeToken(employeeAccessToken);
                        if (refreshedToken) {
                            token.accessToken = refreshedToken.accessToken;
                            token.employeeDetails = refreshedToken.employeeDetails;
                        } else {
                            throw new Error("Failed to refresh access token");
                        }
                    } catch (error) {
                        console.error("Error refreshing token:", error);
                        token.accessToken = null;
                        token.employeeDetails = null;
                    }
                } else {
                    if (refreshTokenTimeout) clearTimeout(refreshTokenTimeout);
                    refreshTokenTimeout = setTimeout(async () => {
                        try {
                            const refreshedToken = await refreshEmployeeToken(employeeAccessToken);
                            if (refreshedToken) {
                                token.accessToken = refreshedToken.accessToken;
                                token.employeeDetails = refreshedToken.employeeDetails;
                            } else {
                                console.error("Failed to refresh access token");
                            }
                        } catch (error) {
                            console.error("Error refreshing token (scheduled):", error);
                        }
                    }, timeLeft - 1 * 60 * 1000);
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (!token.accessToken || !token.employeeDetails) {
                return null; // This will redirect to the sign-in page
            }

            if (token.employeeDetails) {
                const userProfile = await getUserProfile(token.employeeDetails.employeeToken.accessToken);
                token.employeeDetails.userProfile = userProfile;
                session.employeeDetails = token.employeeDetails;
            }
 
            session.accessToken = token.accessToken;
 
            return session;
        }
    },
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60,
    },
    pages: {
        signIn: '/auth/signin',
    },
    events: {
        signIn: async ({ token }) => {
            const employeeAccessToken = token.employeeDetails?.employeeToken?.accessToken;
            if (employeeAccessToken) {
                const decodedToken = jwt.decode(employeeAccessToken);
                const timeLeft = decodedToken.exp * 1000 - Date.now();
                if (refreshTokenTimeout) clearTimeout(refreshTokenTimeout);
                refreshTokenTimeout = setTimeout(async () => {
                    try {
                        const refreshedToken = await refreshEmployeeToken(employeeAccessToken);
                        if (refreshedToken) {
                            token.accessToken = refreshedToken.accessToken;
                            token.employeeDetails = refreshedToken.employeeDetails;
                        } else {
                            console.error("Failed to refresh access token");
                        }
                    } catch (error) {
                        console.error("Error refreshing token (signIn event):", error);
                    }
                }, timeLeft - 1 * 60 * 1000); // Set to refresh 5 minutes before expiration
            }
        },
        signOut: async () => {
            if (refreshTokenTimeout) clearTimeout(refreshTokenTimeout);
        },
    },
});

const generateBodyShopToken = async (accessToken, oid) => {
    const url = `${ENV.BFF_BASE_URL}/automotive/body-paint/v1/user/logon/employee/token?oid=${oid}`;
    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await axios.get(url, {
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        httpsAgent: agent
    });

    if (response.status === 200 && response.data.success) {
        const employeeToken = response.data.data;
        const userProfile = await getUserProfile(employeeToken.accessToken);
        if (userProfile) {
            return { userProfile, employeeToken };
        }
    }
    return null;
}

const getUserProfile = async (accessToken) => {
    const agent = new https.Agent({ rejectUnauthorized: false });

    try {
        const decoded: any = jwt.decode(accessToken);
        if (decoded && decoded.empId) {
            const userProfileUrl = `${ENV.BFF_BASE_URL}/automotive/body-paint/v1/user/user-profile/${decoded.empId}`;
            const userProfileResponse = await axios.get(userProfileUrl, {
                headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                httpsAgent: agent
            });

            if (userProfileResponse.status === 200 && userProfileResponse.data.success) {
                return userProfileResponse.data.data || {};
            }
        }
    } catch (error) {
        console.error("Error decoding token:", error);
    }

    return null;
}

const refreshEmployeeToken = async (accessToken) => {
    const url = `${ENV.BFF_BASE_URL}/automotive/body-paint/v1/user/logon/employee/refresh-token`;
    const agent = new https.Agent({ rejectUnauthorized: false });
    try {
        const response = await axios.post(url, {}, {
            headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${accessToken}` },
            httpsAgent: agent
        });
        if (response.status === 200 && response.data.success) {
            const employeeToken = response.data.data;
            const userProfile = await getUserProfile(employeeToken.accessToken);
            if (userProfile) {
                return { accessToken: employeeToken.accessToken, employeeDetails: userProfile };
            }
        } else {
            throw new Error(`Failed to refresh access token: ${response.data.message || "Unknown error"}`);
        }
    } catch (error) {
        console.error("Error in refreshEmployeeToken:", error);
    }

    return null;
}
