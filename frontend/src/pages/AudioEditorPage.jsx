// pages/AudioEditorPage.jsx
import React, { useState } from 'react';
import "../app/globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { AudioProvider } from '@/context/AudioContext';
import MenuAudioEditor from '@/components/MenuAudioEditor';
import AudioDisplay from '@/components/AudioDisplay';
import AudioUpload from '@/components/AudioUpload';
import FooterAudioEditor from '@/components/FooterAudioEditor';
import Head from 'next/head';

export default function AudioEditorPage() {
  const [mode, setMode] = useState('');

  return (
    <AudioProvider>
      <Head>
        <title>AudioStudio · MultiTools</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#0d0d0f',
        overflow: 'hidden',
      }}>
        {/* Top bar */}
        <div style={{
          height: '40px',
          background: '#0a0a0c',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '8px',
          flexShrink: 0,
        }}>
          {/* Traffic light dots */}
          {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
            <div key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: c, opacity: 0.85 }} />
          ))}
          <div style={{
            marginLeft: '12px',
            fontFamily: "'Syne', sans-serif",
            fontSize: '12px',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.3px',
          }}>
            AudioStudio — Editor Pro
          </div>
        </div>

        {/* Main workspace */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <div style={{
            flexShrink: 0,
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}>
            <MenuAudioEditor onMode={setMode} />
          </div>

          {/* Canvas */}
          <div style={{
            flex: 1,
            overflow: 'hidden',
            background: '#161618',
            position: 'relative',
          }}>
            <AudioDisplay mode={mode} />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          height: '50px',
          background: '#0a0a0c',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '0 8px',
          gap: '12px',
          flexShrink: 0,
        }}>
          <AudioUpload />
          <div style={{
            width: '1px',
            height: '24px',
            background: 'rgba(255,255,255,0.08)',
          }} />
          <FooterAudioEditor />
        </div>
      </div>
    </AudioProvider>
  );
}

export async function getStaticProps() {
  return { props: {} };
}