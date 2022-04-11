import "./App.css";
import React, { useState, useRef } from "react";
import logo from "./icons/logo.jpg";
import ReactPlayer from "react-player";
import { UploadOutlined } from "@ant-design/icons";

const App = () => {
  const hiddenFileInput = useRef(null);
  const [video, setVideo] = useState(null);

  const onClick = () => {
    hiddenFileInput.current.click();
  };

  const handleChange = (event) => {
    // TODO: if we feel brave check its mp4
    const fileUploaded = event.target.files[0];
    setVideo(URL.createObjectURL(fileUploaded));
  };

  if (video) {
    return (
      <div className="video-container">
        <div className="video-header">
          <img src={logo} alt="logo" className="video-logo" />
          <div className="video-titles">
            <div className="main-title">SLTT</div>
            <div className="sub-title">You do the sign, we do the text</div>
          </div>
        </div>
        <div>Video</div>
        <div className="player-wraper">
          <ReactPlayer url={video} width="600px" height="400px" controls />
        </div>
        <div className="player-translation">We think we said: TBD</div>
        <div>
          <button className="press-btn" onClick={onClick}>
            <UploadOutlined />
            Try Another
          </button>
          <input type="file" style={{ display: "none" }} ref={hiddenFileInput} onChange={handleChange} accept="video/mp4" />
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <div>
        <div className="main-title">Welcome to SLTT</div>
        <div className="second-title">You do the sign, we do the text</div>
      </div>
      <img src={logo} alt="logo" className="logo-center" />
      <div>
        <button className="press-btn" onClick={onClick}>
          Press Start
        </button>
        <input type="file" style={{ display: "none" }} ref={hiddenFileInput} onChange={handleChange} accept="video/mp4" />
      </div>
    </div>
  );
};

export default App;
