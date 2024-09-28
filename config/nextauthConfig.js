//import { NextAuthOptions } from "next-auth";
// import jwt from 'jsonwebtoken';
// import AzureADProvider from 'next-auth/providers/azure-ad';
// import axios from 'axios';
// import https from 'https';
// import { ENV } from "@config/envConfig";

import NextAuth from "next-auth";
import jwt from 'jsonwebtoken';
import AzureADProvider from 'next-auth/providers/azure-ad';
//import axios from 'axios';
//import https from 'https';
import { ENV} from "./envConfig"


export const nextauthOptions = {
    providers: [
        AzureADProvider({
            clientId: ENV.AZURE_AD_CLIENT_ID || "",
            clientSecret: ENV.AZURE_AD_CLIENT_SECRET || "",
            tenantId: ENV.AZURE_AD_TENANT_ID,
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === "azure-ad"
                && account?.access_token
                && profile?.oid
            ) {
                try {
                    const accessToken = account.access_token;
                    const oid = profile?.oid;
                    if (accessToken) {
                        return  account
                    }
                } catch (error) {
                    console.log(error);
                }
            }
 
            return false;
        },
        async jwt({ token, account, user }) {
            if (account) {
                token.accessToken = account.access_token;
            }
            return token;
        },
        async session({ session, token }) {
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
    }
};
