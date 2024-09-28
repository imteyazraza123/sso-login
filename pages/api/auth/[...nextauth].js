import NextAuth from "next-auth";
import { nextauthOptions } from "../../../config/nextauthConfig";

export default NextAuth(nextauthOptions);