var socket = io();

const my_peer = new Peer(undefined, {
    config: {
        'iceServers': [
            { url: 'stun:stun1.l.google.com:19302' },
            { url: 'turn:numb.viagenie.ca', credential: '6ZqrEudntxi8UJw', username: 'ramandwivedi20@protonmail.com' }
        ]
    }
});

my_peer.on('open', (id) => {
    socket.emit('join room', ROOM_ID, id);
})

let my_video = document.querySelector(".my_vid");
let incoming_video = document.querySelector('.incomming_vid');
let run = document.querySelector("#run_code");
let lang_select = document.querySelector("#lang");
let output = document.querySelector(".output");
let editor = document.querySelector(".editor");
let loading_gif = document.querySelector("#loading");

let audio_off = document.querySelector('#audio-off');
let leave = document.querySelector('#leave');
let video_off = document.querySelector('#video-off');


editor.addEventListener("keyup", (evt) => {
    const text = editor.value
    socket.emit("new message", text, ROOM_ID);
})

editor.addEventListener('keydown', function (e) {
    if (e.key == 'Tab') {
        e.preventDefault();
        var start = this.selectionStart;
        var end = this.selectionEnd;

        // set textarea value to: text before caret + tab + text after caret
        this.value = this.value.substring(0, start) + "\t" + this.value.substring(end);

        // put caret at right position again
        this.selectionStart = this.selectionEnd = start + 1;
    }
});

incoming_video.addEventListener('loadedmetadata', () => {
    incoming_video.play()
})

my_video.addEventListener('loadedmetadata', () => {
    my_video.play();
});

run.onclick = () => {
    if (lang_select.value == "" || editor.value == "") {
        alert("ERROR !!! -> \n> Please select a language \n> OR Please write some code");
    }
    else {
        loading_gif.removeAttribute('hidden');
        //loading_gif.setAttribute('src', 'loading.gif')
        socket.emit("code run", ROOM_ID, editor.value, lang_select[lang_select.selectedIndex].id, lang_select.value);
    }
}

leave.onclick = () => {
    socket.emit('leave-meeting', ROOM_ID);
    window.location = "https://" + window.location.host + '/end';
}

socket.on("loading", (e) => {
    //loading_gif.setAttribute('src', 'loading.gif');
    loading_gif.removeAttribute('hidden');
})

socket.on("code response", function (codeResp) {
    //loading_gif.removeAttribute("src");
    loading_gif.setAttribute('hidden', '');
    output.value = `\nOutput -> ${codeResp["output"]} \n\nmemory -> ${codeResp["memory"]} \ntime taken -> ${codeResp["cpuTime"]}`;
})

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then((stream) => {

    my_video.srcObject = stream;

    my_peer.on("call", (call) => {
        call.answer(stream);
        call.on('stream', (incomingStream) => {
            incoming_video.srcObject = incomingStream;
        })
    })


    socket.on('user connected', (userId) => {
        const call = my_peer.call(userId, stream);
        call.on('stream', (answerStream) => {
            incoming_video.srcObject = answerStream;
        })
    })

    audio_off.onclick = () => {
        stream.getAudioTracks()[0].enabled = !(stream.getAudioTracks()[0].enabled);
    }

    video_off.onclick = () => {
        stream.getVideoTracks()[0].enabled = !(stream.getVideoTracks()[0].enabled);
    }

    socket.on('left', () => {
        incoming_video.srcObject = undefined;
    })
})


socket.on('message', (data) => {
    editor.value = data
})
