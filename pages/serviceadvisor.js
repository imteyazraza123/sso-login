import Head from 'next/head'
import Image from 'next/image'
import { signOut, useSession } from 'next-auth/react';
import styles from '../styles/Home.module.css'

export default function ServiceAdvisory() {
  const { status, data } = useSession();
  const isAuthenticated = status === 'authenticated';
  const accessTokenInfo = data;

  return (
    <div className={styles.container}>
      {isAuthenticated &&  localStorage?.getItem('accessToken') && (
        <div>Service Advisor page</div>
      )}
    </div>
  )
}
