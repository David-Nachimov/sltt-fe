import './App.css';
import React, {Component} from 'react';
import logo from './icons/logo.jpg'

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            moveToVideoPage: false
        }
    }

    onStartClick = () => {
        this.setState({
            ...this.state,
            moveToVideoPage: true
        })
    };

    render() {
        const {moveToVideoPage} = this.state;

        return (
            <div className="main-container">
                <div className="main-page-titles">
                <div className="main-title">Welcome to SLTT</div>
                <div className="second-title">You do the sign, we do the text</div>
                </div>
                <img src={logo} alt="logo" className={moveToVideoPage ? "logo-center" : "logo-center"}/>
                <button className="press-btn" onClick={this.onStartClick}>Press Start</button>
            </div>
        );
    }

}

export default App;
