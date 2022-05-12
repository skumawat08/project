import React from 'react';
import Peer from 'peerjs';
import { io } from 'socket.io-client';
import './App.css';


function getRoomID() {
  let temp = window.location.href.split('/');
  return temp[temp.length - 1];
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      socket: io()
    };
  }

  render() {
    return (
      <div className="main">
        <LeftSection socket={this.state.socket} />
        <RightSection socket={this.state.socket} />
      </div>
    );
  }
}

class LeftSection extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      LangId: "null",
      LangVal: "",
      EditorVal: "",
    }

    this.setLangMeta = this.setLangMeta.bind(this);
    this.setEditorVal = this.setEditorVal.bind(this);
  }

  setLangMeta(langId, langVal) {
    this.setState({
      LangId: langId,
      LangVal: langVal
    })
  }

  setEditorVal(data) {
    this.setState({
      EditorVal: data
    })
  }

  componentDidMount() {

    this.props.socket.on('message', (data) => {
      this.setEditorVal(data);
    })

  }

  render() {
    return (
      <div className="left-section">
        <div className="left-top">
          <Langs setLangMeta={this.setLangMeta} />
          <u><b style={{ 'fontSize': '0.8em' }}>Share Room Id - {getRoomID()}</b></u>
        </div>
        <Editor setEditorVal={this.setEditorVal} val={this.state.EditorVal} socket={this.props.socket} />
        <Output socket={this.props.socket} />
        <CodeControl socket={this.props.socket} code={this.state.EditorVal} langMeta={{ langId: this.state.LangId, langVal: this.state.LangVal }} />
      </div>
    );
  }
}

class Langs extends React.Component {

  handleChange = (e) => {
    let index = e.target.selectedIndex;
    let langId = e.target.childNodes[index].getAttribute('id');
    let langVal = e.target.value;
    this.props.setLangMeta(langId, langVal);
  }

  render() {
    return (
      <select id="lang" onChange={this.handleChange}>
        <option id="null" value="">select lang.</option>
        <option id="c" value="4">C</option>
        <option id="cpp14" value="2">C++</option>
        <option id="java" value="3">Java JDK 14</option>
        <option id="python3" value="3">Python 3</option>
      </select>
    );
  }
}

class Editor extends React.Component {
  constructor(props) {
    super(props);
    this.editorRef = React.createRef();
  }

  handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      var start = e.target.selectionStart;
      var end = e.target.selectionEnd;

      // set textarea value to: text before caret + tab + text after caret
      e.target.value = e.target.value.substring(0, start) + "\t" + e.target.value.substring(end);

      // put caret at right position again
      e.target.selectionStart = e.target.selectionEnd = start + 1;
    }

    this.props.setEditorVal(e.target.value);
    this.props.socket.emit("new message", e.target.value, getRoomID());
  }

  componentDidMount() {
    this.props.socket.on('message', (data) => {
      this.editorRef.current.value = data;
    })
  }
  render() {
    return (
      <textarea className="editor" placeholder="write your code here" onKeyDown={this.handleKeyDown} ref={this.editorRef}></textarea>
    );
  }
}

class Output extends React.Component {
  constructor(props) {
    super(props);
    this.outputRef = React.createRef();
  }
  componentDidMount() {
    this.props.socket.on('code response', (codeResp) => {

      this.outputRef.current.value = `
Output -> ${codeResp["output"]} 
      
memory -> ${codeResp["memory"]} 
time -> ${codeResp["cpuTime"]}
      `

    });
  }
  render() {
    return (
      <textarea className="output" value={this.props.CodeOutput} placeholder="output" ref={this.outputRef} disabled></textarea>
    );
  }
}

class CodeControl extends React.Component {
  constructor(props) {
    super(props);
    this.buttonRef = React.createRef();
    this.imgRef = React.createRef();
  }

  componentDidMount() {
    this.buttonRef.current.onclick = () => {
      if (this.props.langMeta.langVal === "" || this.props.code === "") {
        alert("ERROR !!! -> \n> Please select a language \n> OR Please write some code");
      }
      else {
        this.imgRef.current.removeAttribute('hidden');
        this.props.socket.emit('code run', getRoomID(), this.props.code, this.props.langMeta.langId, this.props.langMeta.langVal);
      }
    }

    this.props.socket.on('code response', () => {
      this.imgRef.current.setAttribute('hidden', '');
    })

    this.props.socket.on('loading', () => {
      this.imgRef.current.removeAttribute('hidden');
    })

  }

  render() {
    return (
      <div className="code-control">
        <button id="run_code" ref={this.buttonRef}>Run Code</button>
        <img id="loading" src="/assets/loading.gif" alt="loading indicator" ref={this.imgRef} hidden />
      </div>
    );
  }
}




class RightSection extends React.Component {
  render() {
    return (
      <div className="right-section">
        <VideoSection socket={this.props.socket} />
      </div>
    );
  }
}

class VideoSection extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      peer: new Peer(undefined, {
        config: {
          'iceServers': [
            { url: 'stun:stun1.l.google.com:19302' },
            { url: 'turn:numb.viagenie.ca', credential: '6ZqrEudntxi8UJw', username: 'ramandwivedi20@protonmail.com' }
          ]
        }
      }),
      localStream: null,
      incommingStream: null
    };

    this.myVidRef = React.createRef();
    this.incommingVidRef = React.createRef();

    this.setIncommingStream = this.setIncommingStream.bind(this);
    this.setLocalStream = this.setLocalStream.bind(this);


  }

  setIncommingStream(stream) {
    this.setState({
      incommingStream: stream
    });
  }
  setLocalStream(stream) {
    this.setState({
      localStream: stream
    });
  }

  componentDidMount() {
    this.state.peer.on('open', (id) => {
      this.props.socket.emit('join room', getRoomID(), id);
    });

    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    }).then((stream) => {

      this.state.peer.on('call', (call) => {
        call.answer(this.state.localStream);
        call.on('stream', (incommingStream) => {
          this.setIncommingStream(incommingStream);
        });
      });

      this.props.socket.on('user connected', (userId) => {
        let call = this.state.peer.call(userId, this.state.localStream);
        call.on('stream', (ansStream) => {
          this.setIncommingStream(ansStream);
        });
      });

      this.setLocalStream(stream);
    });
  }

  componentDidUpdate() {
    this.myVidRef.current.srcObject = this.state.localStream;
    this.myVidRef.current.play();

    this.incommingVidRef.current.srcObject = this.state.incommingStream;
    this.incommingVidRef.current.play();
  }

  render() {
    return (
      <div className="video-section">
        <video className="my_vid" poster="/assets/dp.jpeg" ref={this.myVidRef} muted></video>
        <video className="incomming_vid" poster="/assets/dp.jpeg" ref={this.incommingVidRef} ></video>
        <CallControls socket={this.props.socket} stream={this.state.localStream} />
      </div>
    );
  }
}


class CallControls extends React.Component {
  constructor(props) {
    super(props);
    this.bg1 = null;
    this.bg2 = null;
    this.micToggleRef = React.createRef();
    this.camToggleRef = React.createRef();
  }
  componentDidMount() {
    this.micToggleRef.current.onclick = () => {
      if (this.bg1 === null) {
        this.bg1 = 'red';
      }
      else {
        this.bg1 = null;
      }

      this.micToggleRef.current.style.backgroundColor = this.bg1;
    }

    this.camToggleRef.current.onclick = () => {
      if (this.bg2 === null) {
        this.bg2 = 'red';
      }
      else {
        this.bg2 = null;
      }

      this.camToggleRef.current.style.backgroundColor = this.bg2;
    }

  }
  render() {
    let stream = this.props.stream;

    let micToggle = () => {
      stream.getAudioTracks()[0].enabled = !(stream.getAudioTracks()[0].enabled);
    }

    let vidToggle = () => {
      stream.getVideoTracks()[0].enabled = !(stream.getVideoTracks()[0].enabled);
    }

    let leaveCall = () => {
      this.props.socket.emit('leave-meeting', getRoomID());
      window.location = "http://" + window.location.host + '/end';
    }
    return (
      <div className="controls">
        <button title="mute/unmute" id="audio-off" onClick={micToggle} ref={this.micToggleRef}><img src='/assets/icons/mic_on.png' alt='mic-on' /></button>
        <button title="leave call" id="leave" onClick={leaveCall}><img src='/assets/icons/call_end.png' alt='call-end' /></button>
        <button title="mute/unmute" id="video-off" onClick={vidToggle} ref={this.camToggleRef}><img src='/assets/icons/videocam_on.png' alt='vid-on' /></button>
      </div>
    );
  }
}

export default App;