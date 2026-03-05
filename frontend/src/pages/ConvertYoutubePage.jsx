// frontend/src/components/ConvertYoutubePage.js

import React, { useContext, useState } from 'react';
import Navbar from '@/components/navbar';
import Loader from '@/components/Loader';
import ThemeContext from '@/constants/themes/ThemeContext';
import "../app/globals.css";
import "../css/convert.css";
import getYoutubeTitle from 'get-youtube-title';
import Footer from '@/components/Footer';

// Cần cài đặt thư viện get-soundcloud-title hoặc viết hàm tương tự nếu chưa có
// import getSoundCloudTitle from 'get-soundcloud-title';

const BASE_URL = 'http://localhost:3100'; // Bạn có thể chuyển thành biến môi trường nếu cần

export default function ConvertYoutubePage() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [showNavbar, setShowNavbar] = useState(true);
  const [links, setLinks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [embedHtml, setEmbedHtml] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [mediaType, setMediaType] = useState(''); // 'youtube' hoặc 'soundcloud'
  const [downloadLink, setDownloadLink] = useState('');
  const [isSearch, setIsSearch] = useState(false);

  const handleLinksChange = (e) => {
    setLinks(e.target.value);
  };

  const handleSearch = async (e) => {
    e.preventDefault(); // Prevent form submission
    setLoading(true);
    setError(null);
    setEmbedHtml('');
    setVideoTitle('');
    setMediaType('');

    const { type, id } = extractMediaId(links);

    if (type === 'youtube') {
      setMediaType('youtube');
      setEmbedHtml(
        `<iframe width="520" height="320" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`
      );
    } else if (type === 'soundcloud') {
      setMediaType('soundcloud');
      setEmbedHtml(
        `<iframe width="520" height="200" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(links)}" frameborder="0" allowfullscreen></iframe>`
      );

      // Giả sử bạn có hàm getSoundCloudTitle để lấy tiêu đề SoundCloud
      // Nếu không, bạn có thể sử dụng API của SoundCloud hoặc để trống
      // getSoundCloudTitle(links, function(err, title) {
      //   if (err) {
      //     setVideoTitle('Không thể lấy tiêu đề bài hát.');
      //   } else {
      //     setVideoTitle(title);
      //   }
      // });
      setVideoTitle(''); // Nếu không lấy được tiêu đề, để trống
    } else {
      setEmbedHtml('URL không hợp lệ. Vui lòng nhập một liên kết YouTube hoặc SoundCloud hợp lệ.');
      setVideoTitle('');
    }

    setIsSearch(true);
    setLoading(false);
  };

  const extractMediaId = (url) => {
    // Kiểm tra YouTube
    const youtubeMatch = url.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:.*v=|.*\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (youtubeMatch) {
      return { type: 'youtube', id: youtubeMatch[1] };
    }
    // Handle playlists if needed
    const playlistMatch = url.match(/[&?]list=([a-zA-Z0-9_-]+)/);
    if (playlistMatch) {
      return {type: 'youtube', id: `videoseries?list=${playlistMatch[1]}`}; // Return the playlist format
    }

    // Kiểm tra SoundCloud
    const soundcloudMatch = url.match(
      /(?:https?:\/\/)?(?:www\.)?soundcloud\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/
    );
    if (soundcloudMatch) {
      return { type: 'soundcloud', id: `${soundcloudMatch[1]}/${soundcloudMatch[2]}` };
    }

    return { type: null, id: null };
  };

  // Tạo một hàm chung để xử lý tải xuống
  const handleDownloadGeneric = async (endpoint) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: links }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Lỗi không xác định');
      }

      const data = await res.json();
      setDownloadLink(data.download_link);

      // Tạo URL tải xuống
      const downloadUrl = `${BASE_URL}/${endpoint}/${data.download_link}`;
      
      // Tạo và kích hoạt thẻ <a> để tải xuống
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = data.download_link; // Đặt tên tệp nếu cần
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to download media');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMP3 = (e) => {
    e.preventDefault();
    handleDownloadGeneric('download'); // Endpoint cho MP3
  };

  const handleDownloadMP4 = (e) => {
    e.preventDefault();
    handleDownloadGeneric('download-youtube-mp4'); // Endpoint cho MP4
  };

  const handleDownloadSoundCloud = (e) => {
    e.preventDefault();
    handleDownloadGeneric('download-soundcloud'); // Endpoint cho SoundCloud
  }

  return (
    <div>
      <title>MultiTools | Công cụ tải mp3/mp4 từ Youtube/SoundCloud</title>
      {loading && <Loader />}
      <div className={`head ${showNavbar ? "show" : "hide"}`}>
        <Navbar toggleTheme={toggleTheme} theme={theme} />
      </div>
      <div className="convert__body">
        <div className="convert__box">
          <h1 className="convert__box-title">Tải MP3/MP4 từ YouTube, SoundCloud về máy nhanh nhất</h1>
          <form onSubmit={handleSearch} className="convert__box-link">
            <input
              value={links}
              onChange={handleLinksChange}
              type="text"
              placeholder="URL Youtube hoặc Soundcloud..."
              className="convert__box-input"
            />
            <button type="submit" className="convert__box-submit" disabled={loading}>
              Tìm kiếm
            </button>
          </form>
          {error && <p className="error-message">{error}</p>}
        </div>
        <div className="convert__box-col">
          <div className="convert__box-media">
            <div dangerouslySetInnerHTML={{ __html: embedHtml }} />
            {videoTitle && <h3 style={{ marginTop: '10px' }}>{videoTitle}</h3>}
          </div>
          {mediaType && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Button tải xuống MP3 */}
              {mediaType === 'youtube' && (
                <>
                  <button
                    className="convert__box-button"
                    onClick={handleDownloadMP3}
                    disabled={loading}
                  >
                    Tải xuống MP3
                  </button>

                  <button
                    className="convert__box-button"
                    onClick={handleDownloadMP4}
                    disabled={loading}
                  >
                    Tải xuống MP4
                  </button>
                </>
              )}
              {/* Nếu SoundCloud, có thể chỉ hỗ trợ MP3 */}
              {mediaType === 'soundcloud' && (
                <button
                  className="convert__box-button"
                  onClick={handleDownloadSoundCloud}
                  disabled={loading}
                >
                  Tải xuống MP3
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
