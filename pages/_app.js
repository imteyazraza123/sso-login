import '../styles/globals.css'
import React, { FC, ReactNode, useEffect } from 'react';
import Head from 'next/head'
import { SessionProvider, useSession } from 'next-auth/react';
//import { AppProps } from 'next/app';
import { useRouter } from 'next/router';



const publicRoutes = [
  '/404',
  '/500',
  '/auth/signin'
]

const AuthGuard = ({ children }) => {
  const { data, status } = useSession();
  const router = useRouter();
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '/';

  useEffect(() => {
    console.log(data, "status>>>>>", status)
    //console.log("router>>>>", router)
    const handleRedirect = async () => {
      if (status === 'unauthenticated' && !publicRoutes.includes(router.pathname)) {
        await router.push(`/auth/signin?callbackUrl=${currentUrl}`);
      }
    };

    handleRedirect();
  }, [status, router]);

  if (status === 'loading') {
    return <div>Lodding.....</div>;
  }

  return <>{children}</>;
}

function MyApp({ Component, pageProps }) {
  console.log(Component, "pageProps>>>>", pageProps)
  return (
    <>
      <Head>
        <title>Body and Paint</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>
      <SessionProvider session={pageProps.session}>
        <AuthGuard>
          <div>
            <Component {...pageProps} />
          </div>
        </AuthGuard>
      </SessionProvider>
    </>
  );
}


// function MyApp({ Component, pageProps }) {
//   return <Component {...pageProps} />
// }

export default MyApp
