import { useEffect } from 'react';
import { GetServerSidePropsContext } from 'next';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { getServerSession } from 'next-auth';
import { nextauthOptions } from '../../config/nextauthConfig';
 
const SignIn = () => {
    const router = useRouter();
    let callbackUrl = router.query.callbackUrl as string | undefined || '/';
    useEffect(() => {
        // Automatically redirect to Azure AD sign-in page
        signIn('azure-ad', { callbackUrl }, { prompt: "select_account" });
    }, [callbackUrl]);
 
    return null; // Optionally, you can render a loading spinner here
};
 
export default SignIn;
 
export async function getServerSideProps(context: GetServerSidePropsContext) {
    const { req, res } = context;
    const session = await getServerSession(req, res, nextauthOptions)
 
    if (session) {
        return { redirect: { destination: "/" } }
    }
 
    return {
        props: {},
    }
}