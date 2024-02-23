import NERTC from "nertc-web-sdk";
class WebRtcImpl {
  appkey = "";
  appSecret = "";
  channelName = "";
  client = null;
  uid = "";
  localStream = null;
  remoteStreams = [];
  max = 20;
  userList = [];
  onLocalStreamUpdate = () => {};
  onRemoteStreamSubscribed = () => {};
  onRemoteStreamUpdate = () => {};
  constructor(options) {
    for (const key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
    this.client = NERTC.createClient({
      appkey: this.appkey,
      debug: true,
    });
    this.addRtcListener();
  }
  addRtcListener() {
    this.client.on("peer-online", (evt) => {
      this.userList.push(evt.uid);
      this.onRemoteStreamUpdate(this.userList);
      console.warn(`${evt.uid} 加入房间`);
    });

    this.client.on("peer-leave", (evt) => {
      console.warn(`${evt.uid} 离开房间`);
      this.remoteStreams = this.remoteStreams.filter(
        (item) => !!item.getId() && item.getId() !== evt.uid
      );
    });

    this.client.on("stream-added", async (evt) => {
      //收到房间中其他成员发布自己的媒体的通知，对端同一个人同时开启了麦克风、摄像头、屏幕贡献，这里会通知多次
      const stream = evt.stream;
      const userId = stream.getId();
      console.warn(`收到 ${userId} 的发布 ${evt.mediaType} 的通知`); // mediaType为：'audio' | 'video' | 'screen'
      if (this.remoteStreams.some((item) => item.getId() === userId)) {
        console.warn("收到已订阅的远端发布，需要更新", stream);
        this.remoteStreams = this.remoteStreams.map((item) =>
          item.getId() === userId ? stream : item
        );
        //订阅其发布的媒体，可以渲染播放
        await this.subscribe(stream);
      } else if (this.remoteStreams.length < this.max - 1) {
        console.warn("收到新的远端发布消息", stream);
        this.remoteStreams = this.remoteStreams.concat(stream);
        //订阅其发布的媒体，可以渲染播放
        await this.subscribe(stream);
      } else {
        console.warn("房间人数已满");
      }
    });

    this.client.on("stream-removed", (evt) => {
      const stream = evt.stream;
      const userId = stream.getId();
      console.warn(`收到 ${userId} 的停止发布 ${evt.mediaType} 的通知`); // mediaType为：'audio' | 'video' | 'screen'
      stream.stop(evt.mediaType);
      this.remoteStreams = this.remoteStreams.map((item) =>
        item.getId() === userId ? stream : item
      );
      console.warn("远端流停止订阅，需要更新", userId, stream);
    });
    // 设置小画面
    this.client.on("stream-subscribed", (evt) => {
      const userId = evt.stream.getId();
      console.warn(`收到订阅 ${userId} 的 ${evt.mediaType} 成功的通知`); // mediaType为：'audio' | 'video' | 'screen'
      // 回调播放远端视频
      this.onRemoteStreamSubscribed(userId);
      // //这里监听一下音频自动播放会被浏览器限制的问题（https://doc.yunxin.163.com/nertc/docs/jM3NDE0NTI?platform=web）
      // remoteStream.on("notAllowedError", (err) => {
      //   const errorCode = err.getCode();
      //   const id = remoteStream.getId();
      //   console.log("remoteStream notAllowedError: ", id);
      //   if (errorCode === 41030) {
      //     //页面弹筐加一个按钮，通过交互完成浏览器自动播放策略限制的接触
      //     const userGestureUI = document.createElement("div");
      //     if (userGestureUI && userGestureUI.style) {
      //       userGestureUI.style.fontSize = "20px";
      //       userGestureUI.style.position = "fixed";
      //       userGestureUI.style.background = "yellow";
      //       userGestureUI.style.margin = "auto";
      //       userGestureUI.style.width = "100%";
      //       userGestureUI.style.zIndex = "9999";
      //       userGestureUI.style.top = "0";
      //       userGestureUI.onclick = () => {
      //         if (userGestureUI && userGestureUI.parentNode) {
      //           userGestureUI.parentNode.removeChild(userGestureUI);
      //         }
      //         remoteStream.resume();
      //       };
      //       userGestureUI.style.display = "block";
      //       userGestureUI.innerHTML =
      //         "自动播放受到浏览器限制，需手势触发。<br/>点击此处手动播放";
      //       document.body.appendChild(userGestureUI);
      //     }
      //   }
      // });
    });

    this.client.on("uid-duplicate", () => {
      console.warn("==== uid重复，你被踢出");
    });

    this.client.on("error", (type) => {
      console.error("===== 发生错误事件：", type);
      if (type === "SOCKET_ERROR") {
        console.warn("==== 网络异常，已经退出房间");
      }
    });

    this.client.on("accessDenied", (type) => {
      console.warn(`==== ${type}设备开启的权限被禁止`);
    });

    this.client.on("connection-state-change", (evt) => {
      console.warn(
        `网络状态变更: ${evt.prevState} => ${evt.curState}, 当前是否在重连：${evt.reconnect}`
      );
    });
  }
  subscribe(remoteStream) {
    console.log("1");
    //这里可以控制是否订阅某一类媒体，这里设置的是用户主观意愿
    //比如这里都是设置为true，如果stream-added事件中通知了是audio发布了，则本次调用会订阅音频，如果video、screen之前已经有stream-added通知，则也会同时订阅video、screen，反之会忽略
    remoteStream.setSubscribeConfig({
      audio: true,
      video: true,
      screen: true,
    });
    this.client
      .subscribe(remoteStream)
      .then(() => {
        console.warn("本地 subscribe 成功");
      })
      .catch((err) => {
        console.warn("本地 subscribe 失败: ", err);
        message("订阅对方的流失败");
      });
  }
  // 加入房间
  join(token) {
    if (!this.client) {
      message("内部错误，请重新加入房间");
      return;
    }
    console.info("开始加入房间: ", this.channelName);
    this.client
      .join({
        channelName: this.channelName,
        uid: this.uid,
        token,
      })
      .then((data) => {
        console.info("加入房间成功，开始初始化本地音视频流");
        this.userList.push(this.uid);
        this.onRemoteStreamUpdate(this.userList);
        this.initLocalStream();
      })
      .catch((error) => {
        console.error("加入房间失败：", error);
        message(`${error}: 请检查appkey或者token是否正确`);
      });
  }

  initLocalStream() {
    //初始化本地的Stream实例，用于管理本端的音视频流
    this.localStream = NERTC.createStream({
      uid: this.uid,
      audio: true, //是否启动mic
      video: true, //是否启动camera
      screen: false, //是否启动屏幕共享
    });

    //设置本地视频质量
    this.localStream.setVideoProfile({
      resolution: NERTC.VIDEO_QUALITY_720p, //设置视频分辨率
      frameRate: NERTC.CHAT_VIDEO_FRAME_RATE_15, //设置视频帧率
    });
    //设置本地音频质量
    this.localStream.setAudioProfile("speech_low_quality");
    //启动媒体，打开实例对象中设置的媒体设备
    this.localStream
      .init()
      .then(async () => {
        // init 成功后出发回调,播放视频
        this.onLocalStreamUpdate();
        this.remoteStreams = this.remoteStreams.concat(this.localStream);
        // 发布视频供远端调阅
        await this.client.publish(this.localStream);
      })
      .catch((err) => {
        console.warn("音视频初始化失败: ", err);
        message("音视频初始化失败");
        this.localStream = null;
      });
  }
  // 播放本地播放视频
  async setupLocalView(view) {
    if (!this.localStream) {
      return Promise.reject("内部错误：localStream is null");
    }
    try {
      // 执行play方法播放视频
      await this.localStream.play(view);
      this.setLocalVideoSize(view);
    } catch (error) {
      return Promise.reject("播放本地视频失败：" + error);
    }
  }
  // 设置本地视频播放尺寸
  setLocalVideoSize(view) {
    if (!this.localStream) {
      throw "内部错误：localStream is null";
    }
    this.localStream.setLocalRenderMode({
      // 设置视频窗口大小
      width: view.clientWidth,
      height: view.clientHeight,
      cut: false, // 是否裁剪
    });
  }
  async setupRemoteView(userId, view) {
    console.log("2");
    const remoteStream = this.remoteStreams.find(
      (item) => item.getId() === userId
    );
    if (!remoteStream) {
      return Promise.reject("内部错误：remoteStream is null");
    }
    try {
      await remoteStream.play?.(view);
      this.setRemoteVideoSize(userId, view);
    } catch (error) {
      return Promise.reject("播放远端视频失败：" + error);
    }
  }
  setRemoteVideoSize(userId, view) {
    console.log("3");
    const remoteStream = this.remoteStreams.find(
      (item) => item.getId() === userId
    );
    if (!remoteStream) {
      throw "内部错误：remoteStream is null";
    }
    remoteStream.setRemoteRenderMode?.({
      // 设置视频窗口大小
      width: view.clientWidth,
      height: view.clientHeight,
      cut: false, // 是否裁剪
    });
  }

  async enableLocalAudio(enabled) {
    try {
      await this.localStream[enabled ? "open" : "close"]({
        type: "audio",
      });
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async enableLocalVideo(enabled) {
    try {
      await this.localStream[enabled ? "open" : "close"]({
        type: "video",
      });
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

export default WebRtcImpl;
