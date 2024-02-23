<template>
  <div class="wrapper">
    <div class="content">
      <!--画面div-->
      <div class="main-window" ref="large"></div>
      <div class="sub-window-wrapper">
        <!--小画面div-->
        <template v-if="userList.length">
          <div
            v-for="item in userList"
            :key="item"
            class="sub-window"
            ref="small"
            :data-uid="item"
            @click="clickItem(item)"
          ></div>
        </template>
        <div v-else class="sub-window" ref="small">
          <span class="loading-text">等待对方加入…</span>
        </div>
      </div>
    </div>

    <!--底层栏-->
    <ul class="tab-bar">
      <li
        :class="{ silence: true, isSilence }"
        @click="handleAudioEnabled"
      ></li>
      <li class="over" @click="handleOver"></li>
      <li :class="{ stop: true, isStop }" @click="handleVideoEnabled"></li>
      <li class="set-wrapper" @click="toggleShareScreen">
        <a href="javascript:;" class="set">{{
          isSharing ? "停止共享" : "开始共享"
        }}</a>
      </li>
    </ul>
  </div>
</template>
<script>
import { message } from "../../components/message";
import NERTC from "nertc-web-sdk";
import config from "../../../config";
import { getToken } from "../../common";
import WebRtcImpl from "../../utils/rtc/webRtc";

export default {
  name: "multiple",
  data() {
    return {
      isSilence: false,
      isStop: false,
      client: null,
      localUid: Math.ceil(Math.random() * 1e5),
      localStream: null,
      remoteStreams: [],
      userList: [],
      max: 20,
      isSharing: false,
      rtc: null,
    };
  },
  mounted() {
    this.rtc = new WebRtcImpl({
      appkey: config.appkey,
      appSecret: config.appSecret,
      channelName: this.$route.query.channelName,
      uid: this.localUid,
      onLocalStreamUpdate: () => {
        this.playLocalVideo();
      },
      onRemoteStreamSubscribed: (userId) => {
        this.playRemoteVideo(userId);
      },
      onRemoteStreamUpdate: (userList) => {
        this.userList = userList;
      },
    });

    this.getToken()
      .then((token) => {
        this.rtc.join(token);
      })
      .catch((e) => {
        message(e);
        console.error(e);
      });
  },
  async destroyed() {},
  methods: {
    getToken() {
      return getToken({
        uid: this.localUid,
        appkey: config.appkey,
        appSecret: config.appSecret,
        channelName: this.$route.query.channelName,
      }).then(
        (token) => {
          return token;
        },
        (e) => {
          throw e;
        }
      );
    },
    playLocalVideo() {
      const div = this.$refs.large;
      div &&
        this.rtc
          .setupLocalView(div)
          .then(() => {
            console.log("播放成功");
          })
          .catch((err) => {
            console.error("播放失败：", err);
          });
    },
    playRemoteVideo(userId) {
      const div = [...this.$refs.small].find((item) => {
        return Number(item.dataset.uid) === Number(userId);
      });
      div && this.rtc.setupRemoteView(userId, div);
    },
    // 设置是否静音
    handleAudioEnabled() {
      this.rtc
        .enableLocalAudio(this.isSilence)
        .then(() => {
          this.isSilence = !this.isSilence;
        })
        .catch((err) => {
          console.error(err);
        });
    },
    // 设置视频开启关闭
    handleVideoEnabled() {
      this.rtc
        .enableLocalVideo(this.isStop)
        .then(() => {
          console.log("this.isStop", this.isStop);
          if (this.isStop) {
            this.playLocalVideo();
          }
          this.isStop = !this.isStop;
        })
        .catch((err) => {
          console.error(err);
        });
    },
    handleOver() {},

    setOrRelieveSilence() {},

    toggleShareScreen() {},
  },
};
</script>

<style scoped lang="less">
.wrapper {
  height: 100vh;
  background-image: linear-gradient(179deg, #141417 0%, #181824 100%);
  display: flex;
  flex-direction: column;

  .content {
    flex: 1;
    display: flex;
    position: relative;

    .main-window {
      height: 100%;
      width: 67vh;
      //width: 37vw;
      //width: 427px;
      margin: 0 auto;
      background: #25252d;
    }

    .sub-window-wrapper {
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 9;
      width: 165px;
    }

    .sub-window {
      background: #25252d;
      border: 1px solid #ffffff;
      margin-bottom: 20px;
      width: 165px;
      height: 92px;
      text-align: center;
      .loading-text {
        display: block;
        width: 100%;
        text-align: center;
        line-height: 90px;
        font-size: 12px;
        color: #fff;
        font-weight: 400;
      }
    }
  }

  .tab-bar {
    height: 54px;
    background-image: linear-gradient(180deg, #292933 7%, #212129 100%);
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.3);
    list-style: none;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #fff;

    li {
      height: 54px;
      width: 125px;
      cursor: pointer;
      //静音
      &.silence {
        background: url("../../assets/img/icon/silence.png") no-repeat center;
        background-size: 60px 54px;

        &:hover {
          background: url("../../assets/img/icon/silence-hover.png") no-repeat
            center;
          background-size: 60px 54px;
        }

        &:active {
          background: url("../../assets/img/icon/silence-click.png") no-repeat
            center;
          background-size: 60px 54px;
        }

        &.isSilence {
          //已经开启静音
          background: url("../../assets/img/icon/relieve-silence.png") no-repeat
            center;
          background-size: 60px 54px;

          &:hover {
            background: url("../../assets/img/icon/relieve-silence-hover.png")
              no-repeat center;
            background-size: 60px 54px;
          }

          &:active {
            background: url("../../assets/img/icon/relieve-silence-click.png")
              no-repeat center;
            background-size: 60px 54px;
          }
        }
      }

      //结束按钮
      &.over {
        background: url("../../assets/img/icon/over.png") no-repeat center;
        background-size: 68px 36px;

        &:hover {
          background: url("../../assets/img/icon/over-hover.png") no-repeat
            center;
          background-size: 68px 36px;
        }

        &:active {
          background: url("../../assets/img/icon/over-click.png") no-repeat
            center;
          background-size: 68px 36px;
        }
      }

      // 停止按钮
      &.stop {
        background: url("../../assets/img/icon/stop.png") no-repeat center;
        background-size: 60px 54px;

        &:hover {
          background: url("../../assets/img/icon/stop-hover.png") no-repeat
            center;
          background-size: 60px 54px;
        }

        &:active {
          background: url("../../assets/img/icon/stop-click.png") no-repeat
            center;
          background-size: 60px 54px;
        }

        //已经是停止状态
        &.isStop {
          background: url("../../assets/img/icon/open.png") no-repeat center;
          background-size: 60px 54px;

          &:hover {
            background: url("../../assets/img/icon/open-hover.png") no-repeat
              center;
            background-size: 60px 54px;
          }

          &:active {
            background: url("../../assets/img/icon/open-click.png") no-repeat
              center;
            background-size: 60px 54px;
          }
        }
      }
    }
  }
}
</style>
