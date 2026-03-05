import React from "react";
import Head from "next/head";
import "../app/globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { VideoProvider } from "../context/VideoContext";
import MenuVideoEditor from "../components/MenuVideoEditor";
import FooterVideoEditor from "../components/FooterVideoEditor";
import VideoDisplay from "../components/VideoDisplay";
import VideoUpload from "../components/VideoUpload";
import styles from "../css/VideoEditorPage.module.css";

export default function VideoEditorPage() {
  return (
    <VideoProvider>
      <Head>
        <title>MultiTools | Video Editor</title>
      </Head>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <MenuVideoEditor />
        </aside>

        <main className={styles.mainPanel}>
          <VideoDisplay />
        </main>

        <footer className={styles.footer}>
          <VideoUpload />
          <FooterVideoEditor />
        </footer>
      </div>
    </VideoProvider>
  );
}
