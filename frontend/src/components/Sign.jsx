'use client'; // Đảm bảo rằng component này chạy trên client side

import '@fortawesome/fontawesome-free/css/all.min.css';
import { useEffect, useState } from 'react';
import '../css/sign.css';
import images from "@/constants/images"; 



const Sign = ({ isSignin, closeModal, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(isSignin); 
  const [username, setUsername] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [email, setEmail] = useState(""); 

  const defaultAvatars = [
    images.dog, images.fox, images.lion, images.gorrila, 
    images.koala, images.rabbit, images.tiger, images.otter];

  
  // reset input fields
  const resetInputs = () => {
    setUsername("");
    setPassword("");
    setEmail("");
  };

  const toggleToSignup = () => {
    resetInputs(); // reset input
    setIsLogin(false); // move to signup
  };

  const toggleToSignin = () => {
    resetInputs(); // reset input
    setIsLogin(true); // move to signin
  };

  //Random Avt 
  const getRandomAvatar = () => {
    const randomIndex = Math.floor(Math.random() * defaultAvatars.length);
    return defaultAvatars[randomIndex];
  };

  // Logic đăng nhập
  const handleSignin = async () => {

    try {
      const response = await fetch('http://localhost:4000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok) {
        // Lưu token và username vào localStorage 
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', username);
        localStorage.setItem( 'avatar', data.avatar);
        alert('Đăng nhập thành công!');
        onLoginSuccess(); 
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Đã xảy ra lỗi khi đăng nhập:', error);
    }
  };

  // Logic đăng ký
  const handleSignup = async () => {
    console.log("Đã gọi hàm handleSignup");
    const randomAvatar = getRandomAvatar();
    try {
      const response = await fetch('http://localhost:4000/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, avatar: randomAvatar.src }),
      });

      const data = await response.json();
      if (response.ok) {
        alert('Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.');
        toggleToSignin(); // Chuyển sang trang đăng nhập
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Đã xảy ra lỗi khi đăng ký:', error);
    }
  };

  useEffect(() => {
    const closeSigninBtn = document.getElementById("close-signin-btn");
    const closeSignupBtn = document.getElementById("close-signup-btn");

    if (closeSigninBtn) {
      closeSigninBtn.addEventListener("click", () => {
        closeModal(); 
      });
    }

    if (closeSignupBtn) {
      closeSignupBtn.addEventListener("click", () => {
        closeModal(); 
      });
    }

    // Cleanup event listeners on component unmount
    return () => {
      if (closeSigninBtn) closeSigninBtn.removeEventListener("click", () => {});
      if (closeSignupBtn) closeSignupBtn.removeEventListener("click", () => {});
    };
  }, [closeModal]);

  return (
    <>
      {isLogin ? (
        <div id="signin-modal" className="signin-modal active">
          <div className="large-signin-box">
            <button id="close-signin-btn" className="close-btn">X</button>
            <div className="signin">
              <div className="signinBox">
                <h2>
                  <i className="fa-solid fa-right-to-bracket"></i>
                  Đăng nhập
                  <i className="fa-solid fa-heart"></i>
                </h2>
                <input
                  type="text"
                  placeholder="Tên đăng nhập/Email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)} // update input value
                />
                <input
                  type="password"
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} // update input value
                />
                <input type="submit" value="Đăng nhập" onClick={handleSignin} />
                <div className="signin-group">
                  <a href="#" id="forgot-pass-link">Quên mật khẩu</a>
                  <a href="#" id="signup-link" onClick={toggleToSignup}>Đăng ký</a>
                </div>
                <div className="separator">
                  <span>Hoặc</span>
                </div>
                <div className="social-signin">
                  <button className="google-signin">
                    <i className="fab fa-google"></i> Đăng nhập với Google
                  </button>
                  <button className="facebook-signin">
                    <i className="fab fa-facebook"></i> Đăng nhập với Facebook
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div id="signup-modal" className="signup-modal active">
          <div className="large-signup-box">
            <button id="close-signup-btn" className="close-btn">X</button>
            <div className="signup">
              <div className="signupBox">
                <h2>
                  <i className="fa-solid fa-right-to-bracket"></i>
                  Đăng ký
                  <i className="fa-solid fa-heart"></i>
                </h2>
                <input
                  type="text"
                  placeholder="Tên đăng nhập"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)} // update input value
                />
                <input
                  type="password"
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} // update input value
                />
                <input
                  type="text"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)} // update input value
                />
                <input type="submit" value="Đăng ký" onClick={handleSignup} />
                <div className="signup-group">
                  <p>
                    <span>Đã có tài khoản? </span>
                    <a href="#" id="signin-link" onClick={toggleToSignin}> Đăng nhập</a>
                  </p>
                </div>
                <div className="separator">
                  <span>Hoặc</span>
                </div>
                <div className="social-signup">
                  <button className="google-signup">
                    <i className="fab fa-google"></i> Đăng ký với Google
                  </button>
                  <button className="facebook-signup">
                    <i className="fab fa-facebook"></i> Đăng ký với Facebook
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sign;
