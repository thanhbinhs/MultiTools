'use client'; // Đảm bảo rằng component này chạy trên client side

import '@fortawesome/fontawesome-free/css/all.min.css';
import { useEffect, useState } from 'react';
import '../css/sign.css';

const Sign = ({ isSignin, closeModal }) => {
  const [isLogin, setIsLogin] = useState(isSignin); 
  const [username, setUsername] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [email, setEmail] = useState(""); 

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
                <input type="submit" value="Đăng nhập" />
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
                <input type="submit" value="Đăng ký" />
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