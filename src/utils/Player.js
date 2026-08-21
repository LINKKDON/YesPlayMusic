import { getAlbum } from '@/api/album';
import { getArtist } from '@/api/artist';
import { trackScrobble, trackUpdateNowPlaying } from '@/api/lastfm';
import { fmTrash, personalFM } from '@/api/others';
import { getPlaylistDetail, intelligencePlaylist } from '@/api/playlist';
import { getLyric, getMP3, getTrackDetail, scrobble } from '@/api/track';
import store from '@/store';
import { isAccountLoggedIn } from '@/utils/auth';
import { cacheTrackSource, getTrackSource } from '@/utils/db';
import { isCreateMpris, isCreateTray } from '@/utils/platform';
import { Howl } from 'howler';
import shuffle from 'lodash/shuffle';

const PLAY_PAUSE_FADE_DURATION = 200;

const INDEX_IN_PLAY_NEXT = -1;

// 第三方音乐源 API 配置
// 文档: https://music-api.gdstudio.xyz/api.php
// 说明: 该接口返回 JSON { url, br, size }，url 为可直接播放的音频直链。
//       已确认响应带 `Access-Control-Allow-Origin: *`，Web 模式下可跨域 fetch。
//       频率限制: 5 分钟内不超过 50 次请求。
const UNOFFICIAL_MUSIC_API = {
  name: 'gdstudio', // 用于缓存来源标识
  url: 'https://music-api.gdstudio.xyz/api.php',
  // 行为模式: 'redirect' (302直链, 直接作为 audio src) 或 'json' (解析响应 JSON)
  // gdstudio 返回 JSON 而非 302，故使用 'json'
  behavior: 'json',
  // 参数配置 (键值对中: key==='id'|'br' 的值作为动态参数名; 其余 key 的值作为固定参数值)
  params: {
    types: 'url', // 接口动作 (注意是复数 types), 取播放地址
    source: 'netease', // 音乐源
    id: 'id', // 歌曲 ID 参数名
    br: 'br', // 音质参数名
  },
  // 音质值映射 (gdstudio 接受 128/192/320/740/999, 其中 740=16bit无损, 999=24bit无损)
  qualityMap: {
    standard: '128', // 128k
    higher: '192', // 192k
    exhigh: '320', // 320k
    lossless: '740', // 无损 (16bit)
    hires: '999', // Hi-Res (24bit)
  },
};

// gdstudio 客户端节流（滑动窗口计数：窗口 5 分钟、上限 50 次）
const GDSTUDIO_RATE_LIMIT = {
  max: 50,
  windowMs: 5 * 60 * 1000,
  timestamps: [],
};
function gdstudioThrottled() {
  const now = Date.now();
  GDSTUDIO_RATE_LIMIT.timestamps = GDSTUDIO_RATE_LIMIT.timestamps.filter(
    t => now - t < GDSTUDIO_RATE_LIMIT.windowMs
  );
  if (GDSTUDIO_RATE_LIMIT.timestamps.length >= GDSTUDIO_RATE_LIMIT.max) {
    return false;
  }
  GDSTUDIO_RATE_LIMIT.timestamps.push(now);
  return true;
}

// 🔥 性能优化：开发模式开关，生产环境关闭所有调试日志
const DEBUG_MODE = process.env.NODE_ENV === 'development';

/**
 * @readonly
 * @enum {string}
 */
const UNPLAYABLE_CONDITION = {
  PLAY_NEXT_TRACK: 'playNextTrack',
  PLAY_PREV_TRACK: 'playPrevTrack',
  DO_NOTHING: 'doNothing',
};

const ipcRenderer =
  process.env.IS_ELECTRON === true ? window.electronAPI : null;
const delay = ms =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve('');
    }, ms);
  });
const excludeSaveKeys = [
  '_playing',
  '_personalFMLoading',
  '_personalFMNextLoading',
  // 运行期标记，绝不能持久化：否则下次启动会被还原为 true，导致监听不再注册
  '_storeWatchersInited',
];

function setTitle(track) {
  document.title = track
    ? `${track.name} · ${track.ar[0].name} - MyMusic`
    : 'MyMusic';
  if (isCreateTray) {
    ipcRenderer?.send('updateTrayTooltip', document.title);
  }
  store.commit('updateTitle', document.title);
}

function setTrayLikeState(isLiked) {
  if (isCreateTray) {
    ipcRenderer?.send('updateTrayLikeState', isLiked);
  }
}

export default class {
  constructor() {
    // 播放器状态
    this._playing = false; // 是否正在播放中
    this._progress = 0; // 当前播放歌曲的进度
    this._enabled = false; // 是否启用Player
    this._repeatMode = 'off'; // off | on | one
    this._shuffle = false; // true | false
    this._volume = 1; // 0 to 1
    this._volumeBeforeMuted = 1; // 用于保存静音前的音量
    this._personalFMLoading = false; // 是否正在私人FM中加载新的track
    this._personalFMNextLoading = false; // 是否正在缓存私人FM的下一首歌曲
    this._progressInterval = null; // 播放进度同步定时器
    this._lastSavedProgress = 0; // 上次保存的进度，用于减少不必要的写入

    // 播放信息
    this._list = []; // 播放列表
    this._current = 0; // 当前播放歌曲在播放列表里的index
    this._shuffledList = []; // 被随机打乱的播放列表，随机播放模式下会使用此播放列表
    this._shuffledCurrent = 0; // 当前播放歌曲在随机列表里面的index
    this._playlistSource = { type: 'album', id: 123 }; // 当前播放列表的信息
    this._currentTrack = { id: 86827685 }; // 当前播放歌曲的详细信息
    this._playNextList = []; // 当这个list不为空时，会优先播放这个list的歌
    this._isPersonalFM = false; // 是否是私人FM模式
    this._personalFMTrack = { id: 0 }; // 私人FM当前歌曲
    this._personalFMNextTrack = {
      id: 0,
    }; // 私人FM下一首歌曲信息（为了快速加载下一首）

    /**
     * The blob records for cleanup.
     *
     * @private
     * @type {string[]}
     */
    this.createdBlobRecords = [];

    // howler (https://github.com/goldfire/howler.js)
    this._howler = null;
    Object.defineProperty(this, '_howler', {
      enumerable: false,
    });

    // init
    this._init();

    window.mymusic = {};
    window.mymusic.player = this;
  }

  get repeatMode() {
    return this._repeatMode;
  }
  set repeatMode(mode) {
    if (this._isPersonalFM) return;
    if (!['off', 'on', 'one'].includes(mode)) {
      console.warn("repeatMode: invalid args, must be 'on' | 'off' | 'one'");
      return;
    }
    this._repeatMode = mode;
  }
  get shuffle() {
    return this._shuffle;
  }
  set shuffle(shuffle) {
    if (this._isPersonalFM) return;
    if (shuffle !== true && shuffle !== false) {
      console.warn('shuffle: invalid args, must be Boolean');
      return;
    }
    this._shuffle = shuffle;
    if (shuffle) {
      this._shuffleTheList();
    }
    // 同步当前歌曲在列表中的下标
    this.current = this.list.indexOf(this.currentTrackID);
  }
  get volume() {
    return this._volume;
  }
  set volume(volume) {
    this._volume = volume;
    this._howler?.volume(volume);
  }
  get list() {
    return this.shuffle ? this._shuffledList : this._list;
  }
  set list(list) {
    this._list = list;
  }
  get current() {
    return this.shuffle ? this._shuffledCurrent : this._current;
  }
  set current(current) {
    if (this.shuffle) {
      this._shuffledCurrent = current;
    } else {
      this._current = current;
    }
  }
  get enabled() {
    return this._enabled;
  }
  get playing() {
    return this._playing;
  }
  get currentTrack() {
    return this._currentTrack;
  }
  get currentTrackID() {
    return this._currentTrack?.id ?? 0;
  }
  get playlistSource() {
    return this._playlistSource;
  }
  get playNextList() {
    return this._playNextList;
  }
  get isPersonalFM() {
    return this._isPersonalFM;
  }
  get personalFMTrack() {
    return this._personalFMTrack;
  }
  get currentTrackDuration() {
    const trackDuration = this._currentTrack.dt || 1000;
    let duration = ~~(trackDuration / 1000);
    return duration > 1 ? duration - 1 : duration;
  }
  get progress() {
    return this._progress;
  }
  set progress(value) {
    if (this._howler) {
      this._howler.seek(value);
      if (isCreateMpris) {
        ipcRenderer?.send('seeked', this._howler.seek());
      }
    }
  }
  get isCurrentTrackLiked() {
    return store.state.liked.songs.includes(this.currentTrack.id);
  }

  _init() {
    this._loadSelfFromLocalStorage();
    this._howler?.volume(this.volume);

    if (this._enabled) {
      // 恢复当前播放歌曲
      this._replaceCurrentTrack(this.currentTrackID, false).then(() => {
        this._howler?.seek(
          Number(localStorage.getItem('playerCurrentTrackTime')) || 0
        );
      }); // update audio source and init howler
      this._initMediaSession();
    }

    this._setIntervals();

    // 注意：不要在此处访问 store。Player 由 store/index.js 在模块求值期 new 出来，
    // 而 Player.js 又 import store，构成循环依赖 —— 此刻 store 尚为 undefined。
    // 依赖 store 的监听统一放在 initStoreWatchers()，由 main.js 在 store 就绪后调用。

    // 初始化私人FM
    if (
      this._personalFMTrack.id === 0 ||
      this._personalFMNextTrack.id === 0 ||
      this._personalFMTrack.id === this._personalFMNextTrack.id
    ) {
      personalFM().then(result => {
        this._personalFMTrack = result.data[0];
        this._personalFMNextTrack = result.data[1];
        return this._personalFMTrack;
      });
    }
  }
  _setPlaying(isPlaying) {
    this._playing = isPlaying;
    if (isCreateTray) {
      ipcRenderer?.send('updateTrayPlayState', this._playing);
    }
  }
  _setIntervals() {
    // 清除旧的定时器
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
    }

    // 同步播放进度，优化localStorage写入频率
    this._progressInterval = setInterval(() => {
      if (this._howler === null) return;
      this._progress = this._howler.seek();

      // 只有当进度变化超过3秒时才写入localStorage，减少写入频率
      if (Math.abs(this._progress - this._lastSavedProgress) >= 3) {
        localStorage.setItem('playerCurrentTrackTime', this._progress);
        this._lastSavedProgress = this._progress;
      }

      if (isCreateMpris) {
        ipcRenderer?.send('playerCurrentTrackTime', this._progress);
      }
    }, 1000);
  }

  // 添加销毁方法清理资源
  destroy() {
    console.debug('[Player.js] Destroying player instance');

    // 清理定时器
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
    }

    // 停止并卸载音频
    if (this._howler) {
      this._howler.stop();
      this._howler.unload();
      this._howler = null;
    }

    // 清理 Blob URLs
    for (const url of this.createdBlobRecords) {
      URL.revokeObjectURL(url);
    }
    this.createdBlobRecords = [];

    // 保存状态到 localStorage
    this.saveSelfToLocalStorage();
  }
  _getNextTrack() {
    const next = this.current + 1;

    if (this._playNextList.length > 0) {
      let trackID = this._playNextList[0];
      return [trackID, INDEX_IN_PLAY_NEXT];
    }

    // 循环模式开启，当前歌曲是最后一首，则重新播放第一首
    if (this.repeatMode === 'on' && this.list.length === this.current + 1) {
      return [this.list[0], 0];
    }

    // 返回 [trackID, index]
    return [this.list[next], next];
  }
  _getPrevTrack() {
    let next = this.current - 1;

    // 循环模式开启，当前歌曲是第一首，则重新播放列表最后一首
    if (this.repeatMode === 'on' && this.current === 0) {
      return [this.list[this.list.length - 1], this.list.length - 1];
    }

    // 返回 [trackID, index]
    return [this.list[next], next];
  }
  async _shuffleTheList(firstTrackID = this.currentTrackID) {
    let list = this._list.filter(tid => tid !== firstTrackID);
    if (firstTrackID === 'first') list = this._list;
    this._shuffledList = shuffle(list);
    if (firstTrackID !== 'first') this._shuffledList.unshift(firstTrackID);
  }
  async _scrobble(track, time, completed = false) {
    if (DEBUG_MODE) {
      console.debug(
        `[debug][Player.js] scrobble track 👉 ${track.name} by ${track.ar[0].name} 👉 time:${time} completed: ${completed}`
      );
    }
    const trackDuration = ~~(track.dt / 1000);
    time = completed ? trackDuration : ~~time;
    scrobble({
      id: track.id,
      sourceid: this.playlistSource.id,
      time,
    });
    if (
      store.state.lastfm.key !== undefined &&
      (time >= trackDuration / 2 || time >= 240)
    ) {
      const timestamp = ~~(new Date().getTime() / 1000) - time;
      trackScrobble({
        artist: track.ar[0].name,
        track: track.name,
        timestamp,
        album: track.al.name,
        trackNumber: track.no,
        duration: trackDuration,
      });
    }
  }
  _playAudioSource(source, autoplay = true) {
    // 先清理旧的 Howler 实例，避免音频池耗尽
    if (this._howler) {
      try {
        this._howler.unload();
      } catch (e) {
        if (DEBUG_MODE) console.debug('[Player.js] Error unloading howler:', e);
      }
      this._howler = null;
    }

    this._howler = new Howl({
      src: [source],
      html5: true,
      preload: true,
      format: ['mp3', 'flac'],
      pool: 1, // 🔥 限制音频池大小为1，防止耗尽
      onend: () => {
        this._nextTrackCallback();
      },
    });
    this._howler.on('loaderror', (_, errCode) => {
      // https://developer.mozilla.org/en-US/docs/Web/API/MediaError/code
      // code 3: MEDIA_ERR_DECODE
      if (errCode === 3) {
        this._playNextTrack(this._isPersonalFM);
      } else if (errCode === 4) {
        // code 4: MEDIA_ERR_SRC_NOT_SUPPORTED
        store.dispatch('showToast', `无法播放: 不支持的音频格式`);
        this._playNextTrack(this._isPersonalFM);
      } else {
        const t = this.progress;
        this._replaceCurrentTrackAudio(this.currentTrack, false, false).then(
          replaced => {
            // 如果 replaced 为 false，代表当前的 track 已经不是这里想要替换的track
            // 此时则不修改当前的歌曲进度
            if (replaced) {
              this._howler?.seek(t);
              this.play();
            }
          }
        );
      }
    });
    this._howler.on('playerror', (id, error) => {
      if (DEBUG_MODE) {
        console.debug(`[Player.js] playerror: ${error}`);
      }
      this._howler.once('unlock', () => {
        this._howler.play();
      });
    });
    if (autoplay) {
      this.play();
      if (this._currentTrack.name) {
        setTitle(this._currentTrack);
      }
      setTrayLikeState(store.state.liked.songs.includes(this.currentTrack.id));
    }
    this.setOutputDevice();
  }
  _getAudioSourceBlobURL(data) {
    // 创建新的 Blob URL
    const source = URL.createObjectURL(new Blob([data]));
    this.createdBlobRecords.push(source);

    // 仅保留最近的 5 个 Blob URL，避免误删正在播放或预加载的音频
    while (this.createdBlobRecords.length > 5) {
      const url = this.createdBlobRecords.shift();
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        if (DEBUG_MODE) {
          console.debug('[Player.js] Failed to revoke blob URL:', e);
        }
      }
    }

    return source;
  }
  _getAudioSourceFromCache(id) {
    return getTrackSource(id).then(t => {
      if (!t) return null;
      return this._getAudioSourceBlobURL(t.source);
    });
  }
  _getAudioSourceFromNewAPI(track) {
    const config = UNOFFICIAL_MUSIC_API;

    // 客户端节流：尊重 gdstudio 50 次 / 5 分钟的限流，超限则跳过本次请求
    if (!gdstudioThrottled()) {
      if (DEBUG_MODE) {
        console.debug('[debug][Player.js] 新API触发限流，本次跳过');
      }
      return Promise.resolve(null);
    }

    const quality = store.state.settings?.musicQuality ?? '320000';
    const qualityMap = config.qualityMap;
    let br;

    // 音质映射
    if (quality === '999000') br = qualityMap.hires;
    else if (quality === 'flac') br = qualityMap.lossless;
    else if (quality === '320000') br = qualityMap.exhigh;
    else if (quality === '192000') br = qualityMap.higher;
    else if (quality === '128000') br = qualityMap.standard;
    else {
      // 兼容数字型设置的区间判断
      const qualityNum = parseInt(quality);
      if (qualityNum >= 999000) br = qualityMap.hires || qualityMap.lossless;
      else if (qualityNum >= 320000) br = qualityMap.exhigh;
      else if (qualityNum >= 192000) br = qualityMap.higher;
      else br = qualityMap.standard;
    }

    // 构造请求 URL
    let apiUrl;
    try {
      const urlObj = new URL(config.url);
      // 添加固定参数
      for (const [key, value] of Object.entries(config.params)) {
        if (key === 'id' || key === 'br') continue; // 跳过动态参数定义
        urlObj.searchParams.append(key, value);
      }
      // 添加动态参数
      urlObj.searchParams.append(config.params.id, track.id);
      urlObj.searchParams.append(config.params.br, br);
      apiUrl = urlObj.toString();
    } catch (e) {
      console.warn(`[Player.js] Invalid API URL: ${config.url}`);
      return Promise.resolve(null);
    }

    // 如果是 redirect 模式，直接返回 API URL，让播放器自己处理 302 跳转
    // 这样可以避免 fetch 遇到的 CORS 问题和额外的网络请求延迟
    if (config.behavior === 'redirect') {
      return Promise.resolve(apiUrl);
    }

    return fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
    })
      .then(response => {
        if (!response.ok) {
          if (DEBUG_MODE) {
            console.debug(
              `[debug][Player.js] 新API请求失败: HTTP ${response.status}`
            );
          }
          return null;
        }
        return response.json();
      })
      .then(data => {
        let url = null;
        let isValid = false;

        // json 模式：智能解析（兼容 data.url 和 data.data[0].url）
        if (data?.url) {
          url = data.url;
          isValid = true;
        } else if (data?.data?.[0]?.url) {
          const songObj = data.data[0];
          if (songObj.code === 200) {
            url = songObj.url;
            isValid = true;
          } else if (DEBUG_MODE) {
            console.debug(
              `[debug][Player.js] 新API返回错误码: ${songObj.code}，歌曲ID: ${track.id}`
            );
          }
        }

        if (!isValid || !url) {
          if (DEBUG_MODE) {
            console.debug(
              `[debug][Player.js] 新API返回数据无效或无播放地址，歌曲ID: ${track.id}`
            );
          }
          return null;
        }

        // 强制使用HTTPS协议
        const audioUrl = url.replace(/^http:/, 'https:');

        // 🔥 缓存逻辑
        if (store.state.settings.automaticallyCacheSongs) {
          // 尝试将 br 转换为数字用于存储 (如果是 '320k' 这种格式)
          let cacheBitrate = 0;
          if (typeof br === 'number') {
            // 如果 br > 1000，假设是 bps (如 320000)，否则是 kbps (如 320)
            cacheBitrate = br > 1000 ? br : br * 1000;
          } else if (typeof br === 'string') {
            if (br.includes('bit')) {
              cacheBitrate = 1400000; // flac24bit
            } else if (br === 'flac') {
              cacheBitrate = 999000;
            } else {
              cacheBitrate = parseInt(br) * 1000;
            }
          }

          cacheTrackSource(track, audioUrl, cacheBitrate || 0, config.name);
        }

        return audioUrl;
      })
      .catch(error => {
        if (DEBUG_MODE) {
          console.debug(
            `[debug][Player.js] 新API异常: ${error.message}，歌曲ID: ${track.id}`
          );
        }
        return null;
      });
  }
  _getAudioSourceFromNetease(track) {
    if (isAccountLoggedIn()) {
      return getMP3(track.id).then(result => {
        if (!result.data[0]) return null;
        if (!result.data[0].url) return null;
        if (result.data[0].code !== 200) return null; // 检查资源状态码
        if (result.data[0].freeTrialInfo !== null) return null; // 跳过只能试听的歌曲

        const source = result.data[0].url.replace(/^http:/, 'https:');
        if (store.state.settings.automaticallyCacheSongs) {
          cacheTrackSource(track, source, result.data[0].br);
        }
        return source;
      });
    } else {
      return new Promise(resolve => {
        resolve(`https://music.163.com/song/media/outer/url?id=${track.id}`);
      });
    }
  }
  /**
   * 分级音源选择策略
   *   ① 未登录用户：仅使用官方音源；官方不可用则不播放（不调用任何第三方音源）。
   *   ② 已登录非会员：官方音源优先；当官方因版权限制等无法播放时，自动回退到
   *      第三方音源（gdstudio，即 UNOFFICIAL_MUSIC_API），受 enableThirdPartySource 设置控制。
   *   ③ 已登录会员：仅使用官方音源；不调用第三方音源。
   *
   * 说明：
   *   - 「官方音源」由 _getAudioSourceFromNetease 提供：未登录返回公共外链直跳，
   *     已登录返回 /song/url/v1 的结果（含版权/试听校验）。
   *   - 「第三方音源」由 _getAudioSourceFromNewAPI 提供（UNOFFICIAL_MUSIC_API）。
   *   - 版权限制的判定依据是官方接口返回 null（无 url / code!=200 / 试听曲 freeTrialInfo）。
   *   - 缓存优先：命中缓存直接返回，不参与分级选择。
   */
  _getAudioSource(track) {
    return this._getAudioSourceFromCache(String(track.id)).then(
      async cached => {
        if (cached) return cached;

        const loggedIn = isAccountLoggedIn();
        const isVip = store.state.data?.user?.vipType > 0;

        if (loggedIn && !isVip) {
          // ② 已登录非会员：官方音源优先，版权限制时回退第三方音源
          if (DEBUG_MODE) {
            console.debug('[Player.js] 非会员：优先使用官方音源');
          }
          const official = await this._getAudioSourceFromNetease(track);
          if (official) return official;

          // 官方不可用（版权限制/试听曲等）-> 第三方音源回退（受设置开关控制）
          if (store.state.settings.enableThirdPartySource) {
            if (DEBUG_MODE) {
              console.debug(
                '[Player.js] 非会员：官方音源不可用（版权限制），回退第三方音源'
              );
            }
            const third = await this._getAudioSourceFromNewAPI(track);
            if (third) return third;
            // 第三方无可用地址，回退公共外链直跳（尽力一试）
            return `https://music.163.com/song/media/outer/url?id=${track.id}`;
          }
          return null; // 第三方音源已关闭，不播放
        }

        // ① 未登录 / ③ 已登录会员：仅使用官方音源，不调用第三方音源
        if (DEBUG_MODE) {
          console.debug(
            loggedIn
              ? '[Player.js] 会员：仅使用官方音源'
              : '[Player.js] 未登录：仅使用官方音源'
          );
        }
        return this._getAudioSourceFromNetease(track);
      }
    );
  }
  _replaceCurrentTrack(
    id,
    autoplay = true,
    ifUnplayableThen = UNPLAYABLE_CONDITION.PLAY_NEXT_TRACK
  ) {
    if (autoplay && this._currentTrack.name) {
      this._scrobble(this.currentTrack, this._howler?.seek());
    }
    return getTrackDetail(id).then(data => {
      const track = data.songs[0];
      this._currentTrack = track;
      this._updateMediaSessionMetaData(track);
      return this._replaceCurrentTrackAudio(
        track,
        autoplay,
        true,
        ifUnplayableThen
      );
    });
  }
  /**
   * @returns 是否成功加载音频，并使用加载完成的音频替换了howler实例
   */
  _replaceCurrentTrackAudio(
    track,
    autoplay,
    isCacheNextTrack,
    ifUnplayableThen = UNPLAYABLE_CONDITION.PLAY_NEXT_TRACK
  ) {
    return this._getAudioSource(track).then(source => {
      if (source) {
        let replaced = false;
        if (track.id === this.currentTrackID) {
          this._playAudioSource(source, autoplay);
          replaced = true;
        }
        if (isCacheNextTrack) {
          this._cacheNextTrack();
        }
        return replaced;
      } else {
        store.dispatch('showToast', `无法播放 ${track.name}`);
        switch (ifUnplayableThen) {
          case UNPLAYABLE_CONDITION.PLAY_NEXT_TRACK:
            this._playNextTrack(this.isPersonalFM);
            break;
          case UNPLAYABLE_CONDITION.PLAY_PREV_TRACK:
            this.playPrevTrack();
            break;
          case UNPLAYABLE_CONDITION.DO_NOTHING:
            // 保持现状（不跳歌），原 Howler 实例未被替换仍可继续播放
            break;
          default:
            store.dispatch(
              'showToast',
              `undefined Unplayable condition: ${ifUnplayableThen}`
            );
            break;
        }
        return false;
      }
    });
  }
  /**
   * 注册依赖 store 的响应式监听。
   * 必须在 store 模块求值完成后调用（见 main.js），不能放在构造函数/_init() 里：
   * store/index.js 在模块求值期 new Player()，而 Player.js import store，
   * 此时 store 的 default 导出尚未赋值，直接访问会得到 undefined。
   */
  initStoreWatchers() {
    if (this._storeWatchersInited) return; // 幂等，避免重复注册
    this._storeWatchersInited = true;

    // 音质设置变化时，立即以新音质重新加载当前曲目（无需重启应用）
    store.watch(
      state => state.settings.musicQuality,
      () => {
        this.reloadCurrentTrackAudio();
      }
    );
  }
  /**
   * 音质设置变更后，以当前设置重新拉取当前曲目的播放地址并保持播放进度与播放状态。
   * 官方（/song/url/v1 level）与第三方音源（gdstudio br）均在取址时读取最新 musicQuality。
   */
  reloadCurrentTrackAudio() {
    if (!this._currentTrack?.name) return; // 尚未有正在播放的曲目
    const currentProgress = this._howler?.seek() ?? this.progress;
    const wasPlaying = this._playing;
    this._replaceCurrentTrackAudio(
      this.currentTrack,
      false,
      false,
      UNPLAYABLE_CONDITION.DO_NOTHING
    ).then(replaced => {
      // replaced 为 false 时说明未替换成功（取址失败或曲目已切换），保持原播放不动
      if (replaced) {
        this._howler?.seek(currentProgress);
        if (wasPlaying) this.play();
      }
    });
  }
  _cacheNextTrack() {
    const nextTrackID = this._isPersonalFM
      ? this._personalFMNextTrack?.id || 0
      : this._getNextTrack()[0];
    if (!nextTrackID) return;
    if (this._personalFMTrack.id == nextTrackID) return;
    getTrackDetail(nextTrackID).then(data => {
      const track = data.songs[0];
      this._getAudioSource(track);
    });
  }
  _loadSelfFromLocalStorage() {
    const player = JSON.parse(localStorage.getItem('player'));
    if (!player) return;
    for (const [key, value] of Object.entries(player)) {
      this[key] = value;
    }
  }
  _initMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        this.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.playPrevTrack();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this._playNextTrack(this.isPersonalFM);
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        this.pause();
      });
      navigator.mediaSession.setActionHandler('seekto', event => {
        this.seek(event.seekTime);
        this._updateMediaSessionPositionState();
      });
      navigator.mediaSession.setActionHandler('seekbackward', event => {
        this.seek(this.seek() - (event.seekOffset || 10));
        this._updateMediaSessionPositionState();
      });
      navigator.mediaSession.setActionHandler('seekforward', event => {
        this.seek(this.seek() + (event.seekOffset || 10));
        this._updateMediaSessionPositionState();
      });
    }
  }
  _updateMediaSessionMetaData(track) {
    if ('mediaSession' in navigator === false) {
      return;
    }
    let artists = track.ar.map(a => a.name);
    const metadata = {
      title: track.name,
      artist: artists.join(','),
      album: track.al.name,
      artwork: [
        {
          src: track.al.picUrl + '?param=224y224',
          type: 'image/jpg',
          sizes: '224x224',
        },
        {
          src: track.al.picUrl + '?param=512y512',
          type: 'image/jpg',
          sizes: '512x512',
        },
      ],
      length: this.currentTrackDuration,
      trackId: this.current,
      url: '/trackid/' + track.id,
    };

    navigator.mediaSession.metadata = new window.MediaMetadata(metadata);
    if (isCreateMpris) {
      this._updateMprisState(track, metadata);
    }
  }
  // OSDLyrics 会检测 Mpris 状态并寻找对应歌词文件，所以要在更新 Mpris 状态之前保证歌词下载完成
  async _updateMprisState(track, metadata) {
    if (!store.state.settings.enableOsdlyricsSupport) {
      return ipcRenderer?.send('metadata', metadata);
    }

    let lyricContent = await getLyric(track.id);

    if (!lyricContent.lrc || !lyricContent.lrc.lyric) {
      return ipcRenderer?.send('metadata', metadata);
    }

    ipcRenderer.send('sendLyrics', {
      track,
      lyrics: lyricContent.lrc.lyric,
    });

    ipcRenderer.once('saveLyricFinished', () => {
      ipcRenderer?.send('metadata', metadata);
    });
  }
  _updateMediaSessionPositionState() {
    if ('mediaSession' in navigator === false) {
      return;
    }
    if ('setPositionState' in navigator.mediaSession) {
      navigator.mediaSession.setPositionState({
        duration: ~~(this.currentTrack.dt / 1000),
        playbackRate: 1.0,
        position: this.seek(),
      });
    }
  }
  _nextTrackCallback() {
    this._scrobble(this._currentTrack, 0, true);
    if (!this.isPersonalFM && this.repeatMode === 'one') {
      this._replaceCurrentTrack(this.currentTrackID);
    } else {
      this._playNextTrack(this.isPersonalFM);
    }
  }
  _loadPersonalFMNextTrack() {
    if (this._personalFMNextLoading) {
      return [false, undefined];
    }
    this._personalFMNextLoading = true;
    return personalFM()
      .then(result => {
        if (!result || !result.data) {
          this._personalFMNextTrack = undefined;
        } else {
          this._personalFMNextTrack = result.data[0];
          this._cacheNextTrack(); // cache next track
        }
        this._personalFMNextLoading = false;
        return [true, this._personalFMNextTrack];
      })
      .catch(() => {
        this._personalFMNextTrack = undefined;
        this._personalFMNextLoading = false;
        return [false, this._personalFMNextTrack];
      });
  }
  _playDiscordPresence(track, seekTime = 0) {
    if (
      process.env.IS_ELECTRON !== true ||
      store.state.settings.enableDiscordRichPresence === false
    ) {
      return null;
    }
    let copyTrack = { ...track };
    copyTrack.dt -= seekTime * 1000;
    ipcRenderer?.send('playDiscordPresence', copyTrack);
  }
  _pauseDiscordPresence(track) {
    if (
      process.env.IS_ELECTRON !== true ||
      store.state.settings.enableDiscordRichPresence === false
    ) {
      return null;
    }
    ipcRenderer?.send('pauseDiscordPresence', track);
  }
  _playNextTrack(isPersonal) {
    if (isPersonal) {
      this.playNextFMTrack();
    } else {
      this.playNextTrack();
    }
  }

  appendTrack(trackID) {
    this._list.push(trackID);
    if (this._shuffle) {
      this._shuffledList.push(trackID);
    }
  }
  playNextTrack() {
    // TODO: 切换歌曲时增加加载中的状态
    const [trackID, index] = this._getNextTrack();
    if (trackID === undefined) {
      this._howler?.stop();
      this._setPlaying(false);
      return false;
    }
    let next = index;
    if (index === INDEX_IN_PLAY_NEXT) {
      this._playNextList.shift();
      next = this.current;
    }
    this.current = next;
    this._replaceCurrentTrack(trackID);
    return true;
  }
  async playNextFMTrack() {
    if (this._personalFMLoading) {
      return false;
    }

    this._isPersonalFM = true;
    if (!this._personalFMNextTrack) {
      this._personalFMLoading = true;
      let result = null;
      let retryCount = 5;
      for (; retryCount >= 0; retryCount--) {
        result = await personalFM().catch(() => null);
        if (!result) {
          this._personalFMLoading = false;
          store.dispatch('showToast', 'personal fm timeout');
          return false;
        }
        if (result.data?.length > 0) {
          break;
        } else if (retryCount > 0) {
          await delay(1000);
        }
      }
      this._personalFMLoading = false;

      if (retryCount < 0) {
        let content = '获取私人FM数据时重试次数过多，请手动切换下一首';
        store.dispatch('showToast', content);
        console.log(content);
        return false;
      }
      // 这里只能拿到一条数据
      this._personalFMTrack = result.data[0];
    } else {
      if (this._personalFMNextTrack.id === this._personalFMTrack.id) {
        return false;
      }
      this._personalFMTrack = this._personalFMNextTrack;
    }
    if (this._isPersonalFM) {
      this._replaceCurrentTrack(this._personalFMTrack.id);
    }
    this._loadPersonalFMNextTrack();
    return true;
  }
  playPrevTrack() {
    const [trackID, index] = this._getPrevTrack();
    if (trackID === undefined) return false;
    this.current = index;
    this._replaceCurrentTrack(
      trackID,
      true,
      UNPLAYABLE_CONDITION.PLAY_PREV_TRACK
    );
    return true;
  }
  saveSelfToLocalStorage() {
    let player = {};
    for (let [key, value] of Object.entries(this)) {
      if (excludeSaveKeys.includes(key)) continue;
      player[key] = value;
    }

    localStorage.setItem('player', JSON.stringify(player));
  }

  pause() {
    this._howler?.fade(this.volume, 0, PLAY_PAUSE_FADE_DURATION);

    this._howler?.once('fade', () => {
      this._howler?.pause();
      this._setPlaying(false);
      setTitle(null);
      this._pauseDiscordPresence(this._currentTrack);
    });
  }
  play() {
    if (this._howler?.playing()) return;

    this._howler?.play();

    this._howler?.once('play', () => {
      this._howler?.fade(0, this.volume, PLAY_PAUSE_FADE_DURATION);

      // 播放时确保开启player.
      // 避免因"忘记设置"导致在播放时播放器不显示的Bug
      this._enabled = true;
      this._setPlaying(true);
      if (this._currentTrack.name) {
        setTitle(this._currentTrack);
      }
      this._playDiscordPresence(this._currentTrack, this.seek());
      if (store.state.lastfm.key !== undefined) {
        trackUpdateNowPlaying({
          artist: this.currentTrack.ar[0].name,
          track: this.currentTrack.name,
          album: this.currentTrack.al.name,
          trackNumber: this.currentTrack.no,
          duration: ~~(this.currentTrack.dt / 1000),
        });
      }
    });
  }
  playOrPause() {
    if (this._howler?.playing()) {
      this.pause();
    } else {
      this.play();
    }
  }
  seek(time = null, sendMpris = true) {
    if (isCreateMpris && sendMpris && time) {
      ipcRenderer?.send('seeked', time);
    }
    if (time !== null) {
      this._howler?.seek(time);
      if (this._playing)
        this._playDiscordPresence(this._currentTrack, this.seek(null, false));
    }
    return this._howler === null ? 0 : this._howler.seek();
  }
  mute() {
    if (this.volume === 0) {
      this.volume = this._volumeBeforeMuted;
    } else {
      this._volumeBeforeMuted = this.volume;
      this.volume = 0;
    }
  }
  setOutputDevice() {
    if (this._howler?._sounds.length <= 0 || !this._howler?._sounds[0]._node) {
      return;
    }
    try {
      this._howler?._sounds[0]._node
        .setSinkId(store.state.settings.outputDevice)
        .catch(err => {
          console.warn('[Player.js] Failed to set output device:', err);
        });
    } catch (e) {
      console.warn('[Player.js] Failed to set output device:', e);
    }
  }

  async replacePlaylist(
    trackIDs,
    playlistSourceID,
    playlistSourceType,
    autoPlayTrackID = 'first'
  ) {
    this._isPersonalFM = false;
    this.list = trackIDs;
    this.current = 0;
    this._playlistSource = {
      type: playlistSourceType,
      id: playlistSourceID,
    };
    if (this.shuffle) await this._shuffleTheList(autoPlayTrackID);
    if (autoPlayTrackID === 'first') {
      this._replaceCurrentTrack(this.list[0]);
    } else {
      this.current = this.list.indexOf(autoPlayTrackID);
      this._replaceCurrentTrack(autoPlayTrackID);
    }
  }
  playAlbumByID(id, trackID = 'first') {
    getAlbum(id).then(data => {
      let trackIDs = data.songs.map(t => t.id);
      this.replacePlaylist(trackIDs, id, 'album', trackID);
    });
  }
  playPlaylistByID(id, trackID = 'first', noCache = false) {
    if (DEBUG_MODE) {
      console.debug(
        `[debug][Player.js] playPlaylistByID 👉 id:${id} trackID:${trackID} noCache:${noCache}`
      );
    }
    getPlaylistDetail(id, noCache).then(data => {
      let trackIDs = data.playlist.trackIds.map(t => t.id);
      this.replacePlaylist(trackIDs, id, 'playlist', trackID);
    });
  }
  playArtistByID(id, trackID = 'first') {
    getArtist(id).then(data => {
      let trackIDs = data.hotSongs.map(t => t.id);
      this.replacePlaylist(trackIDs, id, 'artist', trackID);
    });
  }
  playTrackOnListByID(id, listName = 'default') {
    if (listName === 'default') {
      this._current = this._list.findIndex(t => t === id);
    }
    this._replaceCurrentTrack(id);
  }
  playIntelligenceListById(id, trackID = 'first', noCache = false) {
    getPlaylistDetail(id, noCache).then(data => {
      const randomId = Math.floor(
        Math.random() * (data.playlist.trackIds.length + 1)
      );
      const songId = data.playlist.trackIds[randomId].id;
      intelligencePlaylist({ id: songId, pid: id }).then(result => {
        let trackIDs = result.data.map(t => t.id);
        this.replacePlaylist(trackIDs, id, 'playlist', trackID);
      });
    });
  }
  addTrackToPlayNext(trackID, playNow = false) {
    this._playNextList.push(trackID);
    if (playNow) {
      this.playNextTrack();
    }
  }
  playPersonalFM() {
    this._isPersonalFM = true;
    if (this.currentTrackID !== this._personalFMTrack.id) {
      this._replaceCurrentTrack(this._personalFMTrack.id, true);
    } else {
      this.playOrPause();
    }
  }
  async moveToFMTrash() {
    this._isPersonalFM = true;
    let id = this._personalFMTrack.id;
    if (await this.playNextFMTrack()) {
      fmTrash(id);
    }
  }

  sendSelfToIpcMain() {
    if (process.env.IS_ELECTRON !== true) return false;
    let liked = store.state.liked.songs.includes(this.currentTrack.id);
    ipcRenderer?.send('player', {
      playing: this.playing,
      likedCurrentTrack: liked,
    });
    setTrayLikeState(liked);
  }

  switchRepeatMode() {
    if (this._repeatMode === 'on') {
      this.repeatMode = 'one';
    } else if (this._repeatMode === 'one') {
      this.repeatMode = 'off';
    } else {
      this.repeatMode = 'on';
    }
    if (isCreateMpris) {
      ipcRenderer?.send('switchRepeatMode', this.repeatMode);
    }
  }
  switchShuffle() {
    this.shuffle = !this.shuffle;
    if (isCreateMpris) {
      ipcRenderer?.send('switchShuffle', this.shuffle);
    }
  }
  clearPlayNextList() {
    this._playNextList = [];
  }
  removeTrackFromQueue(index) {
    this._playNextList.splice(index, 1);
  }
}
