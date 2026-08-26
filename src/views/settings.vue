<template>
  <div class="settings-page" @click="clickOutside">
    <div class="container">
      <div v-if="showUserInfo" class="user">
        <div class="left">
          <img
            class="avatar"
            :class="{ 'avatar-clicked': avatarClicking }"
            :src="data.user.avatarUrl"
            loading="lazy"
            @click.stop="handleSettingsAvatarClick"
          />
          <div class="info">
            <div class="nickname">
              <span>{{ data.user.nickname }}</span>
              <span
                v-if="hasListeningRightsRemaining"
                class="listening-rights-remaining"
              >
                {{ listeningRightsRemainingText }}
              </span>
            </div>
            <div class="extra-info">
              <span v-if="data.user.vipType !== 0" class="vip"
                ><img
                  class="cvip"
                  src="data:image/png;base64,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"
                  loading="lazy"
                />
                <span class="text">黑胶VIP</span>
              </span>
              <span v-else class="text">{{ data.user.signature }}</span>
            </div>
          </div>
        </div>
        <div class="right">
          <button @click="logout">
            <svg-icon icon-class="logout" />
            {{ $t('settings.logout') }}
          </button>
        </div>
      </div>

      <div class="item">
        <div class="left">
          <div class="title"> {{ $t('settings.language') }} </div>
        </div>
        <div class="right">
          <select v-model="lang">
            <option value="en">🇬🇧 English</option>
            <option value="tr">🇹🇷 Türkçe</option>
            <option value="zh-CN">🇨🇳 简体中文</option>
            <option value="zh-TW">繁體中文</option>
          </select>
        </div>
      </div>
      <div class="item">
        <div class="left">
          <div class="title"> {{ $t('settings.appearance.text') }} </div>
        </div>
        <div class="right">
          <select v-model="appearance">
            <option value="auto">{{ $t('settings.appearance.auto') }}</option>
            <option value="light"
              >🌞 {{ $t('settings.appearance.light') }}</option
            >
            <option value="dark"
              >🌚 {{ $t('settings.appearance.dark') }}</option
            >
          </select>
        </div>
      </div>
      <div v-if="isElectron" class="item">
        <div class="left">
          <div class="title"> {{ $t('settings.trayIcon.text') }} </div>
        </div>
        <div class="right">
          <select v-model="trayIconTheme">
            <option value="auto">{{ $t('settings.trayIcon.auto') }}</option>
            <option value="light">{{ $t('settings.trayIcon.light') }}</option>
            <option value="dark">{{ $t('settings.trayIcon.dark') }}</option>
          </select>
        </div>
      </div>
      <div class="item">
        <div class="left">
          <div class="title">
            {{ $t('settings.MusicGenrePreference.text') }}
          </div>
        </div>
        <div class="right">
          <select v-model="musicLanguage">
            <option value="all">{{
              $t('settings.MusicGenrePreference.none')
            }}</option>
            <option value="zh">{{
              $t('settings.MusicGenrePreference.mandarin')
            }}</option>
            <option value="ea">{{
              $t('settings.MusicGenrePreference.western')
            }}</option>
            <option value="jp">{{
              $t('settings.MusicGenrePreference.japanese')
            }}</option>
            <option value="kr">{{
              $t('settings.MusicGenrePreference.korean')
            }}</option>
          </select>
        </div>
      </div>

      <!-- <h3>音质</h3> -->
      <div class="item">
        <div class="left">
          <div class="title"> {{ $t('settings.musicQuality.text') }} </div>
        </div>
        <div class="right">
          <select v-model="musicQuality">
            <option value="128000">
              {{ $t('settings.musicQuality.low') }} - 128Kbps
            </option>
            <option value="192000">
              {{ $t('settings.musicQuality.medium') }} - 192Kbps
            </option>
            <option value="320000">
              {{ $t('settings.musicQuality.high') }} - 320Kbps
            </option>
            <option value="flac">
              {{ $t('settings.musicQuality.lossless') }} - FLAC
            </option>
            <option value="999000">Hi-Res</option>
          </select>
        </div>
      </div>
      <div class="item">
        <div class="left">
          <div class="title">
            {{ $t('settings.enableThirdPartySource.title') }}
          </div>
          <div class="description">
            {{ $t('settings.enableThirdPartySource.desc') }}
          </div>
        </div>
        <div class="right">
          <div class="toggle">
            <input
              id="enable-third-party-source"
              v-model="enableThirdPartySource"
              type="checkbox"
              name="enable-third-party-source"
            />
            <label for="enable-third-party-source"></label>
          </div>
        </div>
      </div>
      <div v-if="isElectron" class="item">
        <div class="left">
          <div class="title"> {{ $t('settings.deviceSelector') }} </div>
        </div>
        <div class="right">
          <select v-model="outputDevice">
            <option
              v-for="device in allOutputDevices"
              :key="device.deviceId"
              :value="device.deviceId"
              :selected="device.deviceId == outputDevice"
            >
              {{ $t(device.label) }}
            </option>
          </select>
        </div>
      </div>

      <h3 v-if="isElectron">缓存</h3>
      <div v-if="isElectron" class="item">
        <div class="left">
          <div class="title">
            {{ $t('settings.automaticallyCacheSongs') }}
          </div>
        </div>
        <div class="right">
          <div class="toggle">
            <input
              id="automatically-cache-songs"
              v-model="automaticallyCacheSongs"
              type="checkbox"
              name="automatically-cache-songs"
            />
            <label for="automatically-cache-songs"></label>
          </div>
        </div>
      </div>
      <div v-if="isElectron" class="item">
        <div class="left">
          <div class="title"> {{ $t('settings.cacheLimit.text') }} </div>
        </div>
        <div class="right">
          <select v-model="cacheLimit">
            <option :value="false">
              {{ $t('settings.cacheLimit.none') }}
            </option>
            <option :value="512"> 500MB </option>
            <option :value="1024"> 1GB </option>
            <option :value="2048"> 2GB </option>
            <option :value="4096"> 4GB </option>
            <option :value="8192"> 8GB </option>
          </select>
        </div>
      </div>
      <div v-if="isElectron" class="item">
        <div class="left">
          <div class="title">
            {{
              $t('settings.cacheCount', {
                song: tracksCache.length,
                size: tracksCache.size,
              })
            }}</div
          >
        </div>
        <div class="right">
          <button @click="clearCache()">
            {{ $t('settings.clearSongsCache') }}
          </button>
        </div>
      </div>

      <h3>{{ $t('settings.lyric') }}</h3>
      <div class="item">
        <div class="left">
          <div class="title">{{ $t('settings.showLyricsTranslation') }}</div>
        </div>
        <div class="right">
          <div class="toggle">
            <input
              id="show-lyrics-translation"
              v-model="showLyricsTranslation"
              type="checkbox"
              name="show-lyrics-translation"
            />
            <label for="show-lyrics-translation"></label>
          </div>
        </div>
      </div>
      <div class="item">
        <div class="left">
          <div class="title">{{ $t('settings.lyricsBackground.text') }}</div>
        </div>
        <div class="right">
          <select v-model="lyricsBackground">
            <option :value="false">
              {{ $t('settings.lyricsBackground.off') }}
            </option>
            <option :value="true">
              {{ $t('settings.lyricsBackground.on') }}
            </option>
            <option value="blur"> 模糊封面 </option>
            <option value="dynamic">
              {{ $t('settings.lyricsBackground.dynamic') }}
            </option>
          </select>
        </div>
      </div>
      <div class="item">
        <div class="left">
          <div class="title"> {{ $t('settings.showLyricsTime') }} </div>
        </div>
        <div class="right">
          <div class="toggle">
            <input
              id="show-lyrics-time"
              v-model="showLyricsTime"
              type="checkbox"
              name="show-lyrics-time"
            />
            <label for="show-lyrics-time"></label>
          </div>
        </div>
      </div>
      <div class="item">
        <div class="left">
          <div class="title"> {{ $t('settings.lyricFontSize.text') }} </div>
        </div>
        <div class="right">
          <select v-model="lyricFontSize">
            <option value="16">
              {{ $t('settings.lyricFontSize.small') }} - 16px
            </option>
            <option value="22">
              {{ $t('settings.lyricFontSize.medium') }} - 22px
            </option>
            <option value="28">
              {{ $t('settings.lyricFontSize.large') }} - 28px
            </option>
            <option value="36">
              {{ $t('settings.lyricFontSize.xlarge') }} - 36px
            </option>
          </select>
        </div>
      </div>
      <div v-if="isElectron && isLinux" class="item">
        <div class="left">
          <div class="title">
            <a target="_blank" href="https://github.com/osdlyrics/osdlyrics"
              >OSDLyrics</a
            >
            {{ $t('settings.enableOsdlyricsSupport.title') }}
          </div>
          <div class="description">
            {{ $t('settings.enableOsdlyricsSupport.desc1') }}
            <br />
            {{ $t('settings.enableOsdlyricsSupport.desc2') }}
          </div>
        </div>
        <div class="right">
          <div class="toggle">
            <input
              id="enable-osdlyrics-support"
              v-model="enableOsdlyricsSupport"
              type="checkbox"
              name="enable-osdlyrics-support"
            />
            <label for="enable-osdlyrics-support"></label>
          </div>
        </div>
      </div>

      <h3>{{ $t('settings.customization') }}</h3>
      <div class="item">
        <div class="left">
          <div class="title">
            {{
              isLastfmConnected
                ? `已连接到 Last.fm (${lastfm.name})`
                : '连接 Last.fm '
            }}</div
          >
        </div>
        <div class="right">
          <button v-if="isLastfmConnected" @click="lastfmDisconnect()"
            >断开连接
          </button>
          <button v-else @click="lastfmConnect()"> 授权连接 </button>
        </div>
      </div>
      <div v-if="isElectron" class="item">
        <div class="left">
          <div class="title">
            {{ $t('settings.enableDiscordRichPresence') }}</div
          >
        </div>
        <div class="right">
          <div class="toggle">
            <input
              id="enable-discord-rich-presence"
              v-model="enableDiscordRichPresence"
              type="checkbox"
              name="enable-discord-rich-presence"
            />
            <label for="enable-discord-rich-presence"></label>
          </div>
        </div>
      </div>

      <h3>{{ $t('settings.others') }}</h3>
      <div class="item">
        <div class="left">
          <div class="title">播放页唱片模式</div>
        </div>
        <div class="right">
          <div class="toggle">
            <input
              id="use-record-cover"
              v-model="useRecordCover"
              type="checkbox"
              name="use-record-cover"
            />
            <label for="use-record-cover"></label>
          </div>
        </div>
      </div>
      <div v-if="isElectron && !isMac" class="item">
        <div class="left">
          <div class="title"> {{ $t('settings.closeAppOption.text') }} </div>
        </div>
        <div class="right">
          <select v-model="closeAppOption">
            <option value="ask">
              {{ $t('settings.closeAppOption.ask') }}
            </option>
            <option value="exit">
              {{ $t('settings.closeAppOption.exit') }}
            </option>
            <option value="minimizeToTray">
              {{ $t('settings.closeAppOption.minimizeToTray') }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="isElectron && isLinux" class="item">
        <div class="left">
          <div class="title"> {{ $t('settings.enableCustomTitlebar') }} </div>
        </div>
        <div class="right">
          <div class="toggle">
            <input
              id="enable-custom-titlebar"
              v-model="enableCustomTitlebar"
              type="checkbox"
              name="enable-custom-titlebar"
            />
            <label for="enable-custom-titlebar"></label>
          </div>
        </div>
      </div>

      <div v-if="isElectron" class="item">
        <div class="left">
          <div class="title"> {{ $t('settings.showLibraryDefault') }}</div>
        </div>
        <div class="right">
          <div class="toggle">
            <input
              id="show-library-default"
              v-model="showLibraryDefault"
              type="checkbox"
              name="show-library-default"
            />
            <label for="show-library-default"></label>
          </div>
        </div>
      </div>

      <div class="item">
        <div class="left">
          <div class="title">{{ $t('settings.subTitleDefault') }}</div>
        </div>
        <div class="right">
          <div class="toggle">
            <input
              id="sub-title-default"
              v-model="subTitleDefault"
              type="checkbox"
              name="sub-title-default"
            />
            <label for="sub-title-default"></label>
          </div>
        </div>
      </div>
      <div class="item">
        <div class="left">
          <div class="title" style="transform: scaleX(-1)">🐈️ 🏳️‍🌈</div>
        </div>
        <div class="right">
          <div class="toggle">
            <input
              id="nyancat-style"
              v-model="nyancatStyle"
              type="checkbox"
              name="nyancat-style"
            />
            <label for="nyancat-style"></label>
          </div>
        </div>
      </div>

      <div v-if="isElectron">
        <h3>代理</h3>
        <div class="item">
          <div class="left">
            <div class="title"> 代理协议 </div>
          </div>
          <div class="right">
            <select v-model="proxyProtocol">
              <option value="noProxy"> 关闭代理 </option>
              <option value="HTTP"> HTTP 代理 </option>
              <option value="HTTPS"> HTTPS 代理 </option>
              <!-- <option value="SOCKS"> SOCKS 代理 </option> -->
            </select>
          </div>
        </div>
        <div id="proxy-form" :class="{ disabled: proxyProtocol === 'noProxy' }">
          <input
            v-model="proxyServer"
            class="text-input"
            placeholder="服务器地址"
            :disabled="proxyProtocol === 'noProxy'"
          /><input
            v-model="proxyPort"
            class="text-input"
            placeholder="端口"
            type="number"
            min="1"
            max="65535"
            :disabled="proxyProtocol === 'noProxy'"
          />
          <button @click="sendProxyConfig">更新代理</button>
        </div>
      </div>
      <div v-if="isElectron">
        <h3>Real IP</h3>
        <div class="item">
          <div class="left">
            <div class="title"> Real IP </div>
          </div>
          <div class="right">
            <div class="toggle">
              <input
                id="enable-real-ip"
                v-model="enableRealIP"
                type="checkbox"
                name="enable-real-ip"
              />
              <label for="enable-real-ip"></label>
            </div>
          </div>
        </div>
        <div id="real-ip" :class="{ disabled: !enableRealIP }">
          <input
            v-model="realIP"
            class="text-input"
            placeholder="IP地址"
            :disabled="!enableRealIP"
          />
        </div>
      </div>

      <div v-if="isElectron">
        <h3>快捷键</h3>
        <div class="item">
          <div class="left">
            <div class="title"> {{ $t('settings.enableGlobalShortcut') }}</div>
          </div>
          <div class="right">
            <div class="toggle">
              <input
                id="enable-enable-global-shortcut"
                v-model="enableGlobalShortcut"
                type="checkbox"
                name="enable-enable-global-shortcut"
              />
              <label for="enable-enable-global-shortcut"></label>
            </div>
          </div>
        </div>
        <div
          id="shortcut-table"
          :class="{ 'global-disabled': !enableGlobalShortcut }"
          tabindex="0"
          @keydown="handleShortcutKeydown"
        >
          <div class="row row-head">
            <div class="col">功能</div>
            <div class="col">快捷键</div>
            <div class="col">全局快捷键</div>
          </div>
          <div
            v-for="shortcut in settings.shortcuts"
            :key="shortcut.id"
            class="row"
          >
            <div class="col">{{ shortcut.name }}</div>
            <div class="col">
              <div
                class="keyboard-input"
                :class="{
                  active:
                    shortcutInput.id === shortcut.id &&
                    shortcutInput.type === 'shortcut',
                }"
                @click.stop="readyToRecordShortcut(shortcut.id, 'shortcut')"
              >
                {{
                  shortcutInput.id === shortcut.id &&
                  shortcutInput.type === 'shortcut' &&
                  recordedShortcutComputed !== ''
                    ? formatShortcut(recordedShortcutComputed)
                    : formatShortcut(shortcut.shortcut)
                }}
              </div>
            </div>
            <div class="col">
              <div
                class="keyboard-input"
                :class="{
                  active:
                    shortcutInput.id === shortcut.id &&
                    shortcutInput.type === 'globalShortcut' &&
                    enableGlobalShortcut,
                }"
                @click.stop="
                  readyToRecordShortcut(shortcut.id, 'globalShortcut')
                "
                >{{
                  shortcutInput.id === shortcut.id &&
                  shortcutInput.type === 'globalShortcut' &&
                  recordedShortcutComputed !== ''
                    ? formatShortcut(recordedShortcutComputed)
                    : formatShortcut(shortcut.globalShortcut)
                }}</div
              >
            </div>
          </div>
          <button
            class="restore-default-shortcut"
            @click="restoreDefaultShortcuts"
            >恢复默认快捷键</button
          >
        </div>
      </div>

      <div class="footer">
        <p class="author"
          >MADE BY
          <a href="http://github.com/LINKKDON" target="_blank">LINS</a></p
        >
        <p class="version">v{{ version }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import { isAccountLoggedIn, isLooseLoggedIn, doLogout } from '@/utils/auth';
import { auth as lastfmAuth } from '@/api/lastfm';
import {
  claimListeningRights as requestListeningRights,
  getListeningRights,
} from '@/api/others';
import { changeAppearance, bytesToSize } from '@/utils/common';
import { countDBSize, clearDB } from '@/utils/db';
import pkg from '../../package.json';

const ipcRenderer =
  process.env.IS_ELECTRON === true ? window.electronAPI : null;

const validShortcutCodes = ['=', '-', '~', '[', ']', ';', "'", ',', '.', '/'];

export default {
  name: 'Settings',
  data() {
    return {
      tracksCache: {
        size: '0KB',
        length: 0,
      },
      allOutputDevices: [
        {
          deviceId: 'default',
          label: 'settings.permissionRequired',
        },
      ],
      shortcutInput: {
        id: '',
        type: '',
        recording: false,
      },
      recordedShortcut: [],
      listeningRights: {
        loading: false,
        supported: null,
        remainingTime: 0,
        fetchedAt: 0,
        status: '',
        coverToday: false,
        upperLimit: false,
      },
      listeningRightsNow: Date.now(),
      listeningRightsTimer: null,
      settingsAvatarClickCount: 0,
      settingsAvatarClickTimer: null,
      claimingListeningRights: false,
      lastListeningRightsClaimAt: 0,
      avatarClicking: false,
      avatarClickFeedbackTimer: null,
    };
  },
  computed: {
    ...mapState(['player', 'settings', 'data', 'lastfm']),
    hasListeningRightsRemaining() {
      if (this.listeningRights.supported !== true) return false;
      const elapsed = Math.max(
        0,
        this.listeningRightsNow - this.listeningRights.fetchedAt
      );
      return this.listeningRights.remainingTime - elapsed > 0;
    },
    listeningRightsRemainingText() {
      if (!this.hasListeningRightsRemaining) return '';

      const elapsed = Math.max(
        0,
        this.listeningRightsNow - this.listeningRights.fetchedAt
      );
      const remaining = Math.max(
        0,
        this.listeningRights.remainingTime - elapsed
      );
      const totalSeconds = Math.floor(remaining / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const clock = [hours, minutes, seconds]
        .map(value => String(value).padStart(2, '0'))
        .join(':');
      return days > 0 ? `${days} 天 ${clock}` : clock;
    },
    isElectron() {
      return process.env.IS_ELECTRON;
    },
    isMac() {
      return /macintosh|mac os x/i.test(navigator.userAgent);
    },
    isLinux() {
      return process.platform === 'linux';
    },
    version() {
      return pkg.version;
    },
    showUserInfo() {
      return isLooseLoggedIn() && this.data.user.nickname;
    },
    recordedShortcutComputed() {
      let shortcut = [];
      this.recordedShortcut.map(e => {
        if (e.keyCode >= 65 && e.keyCode <= 90) {
          // A-Z
          shortcut.push(e.code.replace('Key', ''));
        } else if (e.key === 'Meta') {
          // ⌘ Command on macOS
          shortcut.push('Command');
        } else if (['Alt', 'Control', 'Shift'].includes(e.key)) {
          shortcut.push(e.key);
        } else if (e.keyCode >= 48 && e.keyCode <= 57) {
          // 0-9
          shortcut.push(e.code.replace('Digit', ''));
        } else if (e.keyCode >= 112 && e.keyCode <= 123) {
          // F1-F12
          shortcut.push(e.code);
        } else if (
          ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)
        ) {
          // Arrows
          shortcut.push(e.code.replace('Arrow', ''));
        } else if (validShortcutCodes.includes(e.key)) {
          shortcut.push(e.key);
        }
      });
      const sortTable = {
        Control: 1,
        Shift: 2,
        Alt: 3,
        Command: 4,
      };
      shortcut = shortcut.sort((a, b) => {
        if (!sortTable[a] || !sortTable[b]) return 0;
        if (sortTable[a] - sortTable[b] <= -1) {
          return -1;
        } else if (sortTable[a] - sortTable[b] >= 1) {
          return 1;
        } else {
          return 0;
        }
      });
      shortcut = shortcut.join('+');
      return shortcut;
    },

    lang: {
      get() {
        return this.settings.lang;
      },
      set(lang) {
        this.$i18n.locale = lang;
        this.$store.commit('changeLang', lang);
      },
    },
    musicLanguage: {
      get() {
        return this.settings.musicLanguage ?? 'all';
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'musicLanguage',
          value,
        });
      },
    },
    appearance: {
      get() {
        if (this.settings.appearance === undefined) return 'auto';
        return this.settings.appearance;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'appearance',
          value,
        });
        changeAppearance(value);
      },
    },
    trayIconTheme: {
      get() {
        if (this.settings.trayIconTheme === undefined) return 'auto';
        return this.settings.trayIconTheme;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'trayIconTheme',
          value,
        });
        if (this.isElectron) {
          ipcRenderer.send('updateTrayIcon', value);
        }
      },
    },
    musicQuality: {
      get() {
        return this.settings.musicQuality ?? 320000;
      },
      set(value) {
        if (value === this.settings.musicQuality) return;
        this.$store.commit('changeMusicQuality', value);
        this.clearCache();
      },
    },
    lyricFontSize: {
      get() {
        if (this.settings.lyricFontSize === undefined) return 28;
        return this.settings.lyricFontSize;
      },
      set(value) {
        this.$store.commit('changeLyricFontSize', value);
      },
    },
    outputDevice: {
      get() {
        const isValidDevice = this.allOutputDevices.find(
          device => device.deviceId === this.settings.outputDevice
        );
        if (
          this.settings.outputDevice === undefined ||
          isValidDevice === undefined
        )
          return 'default'; // Default deviceId
        return this.settings.outputDevice;
      },
      set(deviceId) {
        if (deviceId === this.settings.outputDevice || deviceId === undefined)
          return;
        this.$store.commit('changeOutputDevice', deviceId);
        this.player.setOutputDevice();
      },
    },
    enableThirdPartySource: {
      get() {
        const value = this.settings.enableThirdPartySource;
        return value !== undefined ? value : false;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'enableThirdPartySource',
          value,
        });
      },
    },
    nyancatStyle: {
      get() {
        if (this.settings.nyancatStyle === undefined) return false;
        return this.settings.nyancatStyle;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'nyancatStyle',
          value,
        });
      },
    },
    automaticallyCacheSongs: {
      get() {
        if (this.settings.automaticallyCacheSongs === undefined) return false;
        return this.settings.automaticallyCacheSongs;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'automaticallyCacheSongs',
          value,
        });
        if (value === false) {
          this.clearCache();
        }
      },
    },
    showLyricsTranslation: {
      get() {
        return this.settings.showLyricsTranslation;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'showLyricsTranslation',
          value,
        });
      },
    },
    lyricsBackground: {
      get() {
        return this.settings.lyricsBackground || false;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'lyricsBackground',
          value,
        });
      },
    },
    showLyricsTime: {
      get() {
        return this.settings.showLyricsTime;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'showLyricsTime',
          value,
        });
      },
    },
    enableOsdlyricsSupport: {
      get() {
        return this.settings.enableOsdlyricsSupport;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'enableOsdlyricsSupport',
          value,
        });
      },
    },
    useRecordCover: {
      get() {
        return this.settings.useRecordCover || false;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'useRecordCover',
          value,
        });
      },
    },
    closeAppOption: {
      get() {
        return this.settings.closeAppOption;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'closeAppOption',
          value,
        });
      },
    },
    enableDiscordRichPresence: {
      get() {
        return this.settings.enableDiscordRichPresence;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'enableDiscordRichPresence',
          value,
        });
      },
    },
    subTitleDefault: {
      get() {
        return this.settings.subTitleDefault;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'subTitleDefault',
          value,
        });
      },
    },
    enableGlobalShortcut: {
      get() {
        return this.settings.enableGlobalShortcut;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'enableGlobalShortcut',
          value,
        });
      },
    },
    showLibraryDefault: {
      get() {
        return this.settings.showLibraryDefault || false;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'showLibraryDefault',
          value,
        });
      },
    },
    cacheLimit: {
      get() {
        return this.settings.cacheLimit || false;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'cacheLimit',
          value,
        });
      },
    },
    proxyProtocol: {
      get() {
        return this.settings.proxyConfig?.protocol || 'noProxy';
      },
      set(value) {
        let config = this.settings.proxyConfig || {};
        config.protocol = value;
        if (value === 'noProxy') {
          ipcRenderer.send('removeProxy');
          this.showToast('已关闭代理');
        }
        this.$store.commit('updateSettings', {
          key: 'proxyConfig',
          value: config,
        });
      },
    },
    proxyServer: {
      get() {
        return this.settings.proxyConfig?.server || '';
      },
      set(value) {
        let config = this.settings.proxyConfig || {};
        config.server = value;
        this.$store.commit('updateSettings', {
          key: 'proxyConfig',
          value: config,
        });
      },
    },
    enableRealIP: {
      get() {
        return this.settings.enableRealIP || false;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'enableRealIP',
          value: value,
        });
      },
    },
    realIP: {
      get() {
        return this.settings.realIP || '';
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'realIP',
          value: value,
        });
      },
    },
    proxyPort: {
      get() {
        return this.settings.proxyConfig?.port || '';
      },
      set(value) {
        let config = this.settings.proxyConfig || {};
        config.port = value;
        this.$store.commit('updateSettings', {
          key: 'proxyConfig',
          value: config,
        });
      },
    },
    enableCustomTitlebar: {
      get() {
        return this.settings.linuxEnableCustomTitlebar;
      },
      set(value) {
        this.$store.commit('updateSettings', {
          key: 'linuxEnableCustomTitlebar',
          value,
        });
      },
    },
    isLastfmConnected() {
      return this.lastfm.key !== undefined;
    },
  },
  created() {
    this.countDBSize('tracks');
    if (process.env.IS_ELECTRON) this.getAllOutputDevices();
    if (isAccountLoggedIn()) this.refreshListeningRights();
    this.listeningRightsTimer = setInterval(() => {
      this.listeningRightsNow = Date.now();
    }, 1000);
    window.addEventListener(
      'listening-rights-updated',
      this.handleListeningRightsUpdated
    );
  },
  beforeDestroy() {
    clearInterval(this.listeningRightsTimer);
    clearTimeout(this.settingsAvatarClickTimer);
    clearTimeout(this.avatarClickFeedbackTimer);
    window.removeEventListener(
      'listening-rights-updated',
      this.handleListeningRightsUpdated
    );
  },
  activated() {
    this.countDBSize('tracks');
    if (process.env.IS_ELECTRON) this.getAllOutputDevices();
    if (isAccountLoggedIn()) this.refreshListeningRights();
  },
  methods: {
    ...mapActions(['showToast']),
    handleSettingsAvatarClick() {
      this.avatarClicking = false;
      this.$nextTick(() => {
        this.avatarClicking = true;
        clearTimeout(this.avatarClickFeedbackTimer);
        this.avatarClickFeedbackTimer = setTimeout(() => {
          this.avatarClicking = false;
          this.avatarClickFeedbackTimer = null;
        }, 180);
      });

      this.settingsAvatarClickCount += 1;
      clearTimeout(this.settingsAvatarClickTimer);
      if (this.settingsAvatarClickCount >= 3) {
        this.settingsAvatarClickCount = 0;
        this.settingsAvatarClickTimer = null;
        this.claimListeningRights();
        return;
      }
      this.settingsAvatarClickTimer = setTimeout(() => {
        this.settingsAvatarClickCount = 0;
        this.settingsAvatarClickTimer = null;
      }, 600);
    },
    isListeningRightsGainFailure(result) {
      const data = this.getListeningRightsPayload(result);
      if (!data || typeof data !== 'object') return false;
      if (Number(data.code) && Number(data.code) !== 200) return true;
      if (data.success === false || data.qualified === false) return true;
      return [0, '0', false, 'false'].includes(data.gainFlag);
    },
    getListeningRightsGainError(result) {
      const data = this.getListeningRightsPayload(result);
      return (
        data.message ||
        data.msg ||
        data.errorMsg ||
        data.errorMessage ||
        result?.message ||
        result?.msg ||
        '权益领取未生效'
      );
    },
    async claimListeningRights() {
      if (this.claimingListeningRights) {
        this.showToast('权益领取正在处理中，请稍候');
        return;
      }
      if (!isAccountLoggedIn()) {
        this.showToast('领取权益需要登录网易云账号');
        return;
      }

      // Lock before any asynchronous preflight request. This prevents a second
      // triple-click from starting another gain request while the first one is
      // still refreshing the account state.
      this.claimingListeningRights = true;
      try {
        await this.refreshListeningRights({ silent: true });
        if (this.listeningRights.supported === false) {
          this.showToast('当前 API 上游暂不支持免费听权益');
          return;
        }
        if (this.hasListeningRightsRemaining) {
          this.showToast('当前免费听权益仍有剩余时长');
          return;
        }
        if (
          this.listeningRights.coverToday ||
          this.listeningRights.upperLimit
        ) {
          this.showToast(
            this.listeningRights.upperLimit
              ? '免费听权益已达到领取上限'
              : '今日免费听权益已领取'
          );
          return;
        }

        const claimCooldown = 30 * 1000;
        if (Date.now() - this.lastListeningRightsClaimAt < claimCooldown) {
          this.showToast('权益状态正在同步，请稍后再试');
          return;
        }
        this.lastListeningRightsClaimAt = Date.now();
        const previousRemainingTime = this.listeningRights.remainingTime;
        const result = await requestListeningRights();
        if (result?.code !== 200 || this.isListeningRightsGainFailure(result)) {
          throw new Error(this.getListeningRightsGainError(result));
        }

        // The gain endpoint can return code 200 while the upstream body reports
        // that the user's daily quota is already consumed. Do not call this a
        // success unless either the body or the rights status confirms it.
        const directRights = this.getListeningRightsPayload(result);
        if (
          Number(directRights.rightsRemainingTime) > previousRemainingTime ||
          Number(directRights.remainingTime) > previousRemainingTime
        ) {
          this.applyListeningRights(result);
        }

        let refreshed = false;
        for (let attempt = 0; attempt < 10; attempt += 1) {
          await new Promise(resolve =>
            setTimeout(resolve, attempt === 0 ? 300 : 900)
          );
          await this.refreshListeningRights({ silent: true });
          if (
            this.listeningRights.remainingTime > previousRemainingTime ||
            this.listeningRights.coverToday ||
            this.listeningRights.upperLimit
          ) {
            refreshed = true;
            break;
          }
        }

        if (
          refreshed &&
          this.listeningRights.remainingTime > previousRemainingTime
        ) {
          this.showToast('免费听权益领取成功');
        } else if (this.listeningRights.coverToday) {
          this.showToast('今日免费听权益已领取');
        } else if (this.listeningRights.upperLimit) {
          this.showToast('免费听权益已达到领取上限');
        } else {
          this.showToast('权益领取未确认生效，请稍后再试');
        }
      } catch (error) {
        this.showToast(
          this.getListeningRightsErrorMessage(error, '权益领取失败')
        );
      } finally {
        this.claimingListeningRights = false;
      }
    },
    handleListeningRightsUpdated() {
      this.refreshListeningRights({ silent: true });
    },
    isUnsupportedListeningRightsError(error) {
      return (
        error?.response?.status === 404 ||
        error?.response?.data?.code === 404 ||
        error?.code === 404
      );
    },
    getListeningRightsErrorMessage(error, fallback) {
      return (
        error?.response?.data?.message ||
        error?.response?.data?.msg ||
        error?.message ||
        fallback
      );
    },
    getListeningRightsPayload(payload) {
      let current = payload?.data || payload || {};
      // Some deployments wrap the upstream body one more time as data.data.
      while (
        current?.data &&
        typeof current.data === 'object' &&
        !Array.isArray(current.data) &&
        !(
          'rightsRemainingTime' in current ||
          'remainingTime' in current ||
          'rightsEndTime' in current ||
          'rightsCoverToday' in current
        )
      ) {
        current = current.data;
      }
      return current || {};
    },
    toBoolean(value) {
      return [true, 1, '1', 'true', 'TRUE'].includes(value);
    },
    applyListeningRights(payload) {
      const rights = this.getListeningRightsPayload(payload);
      const rawRemainingTime = Number(
        rights.rightsRemainingTime ??
          rights.remainingTime ??
          rights.duration ??
          0
      );
      const endTime = Date.parse(rights.rightsEndTime || '');
      const remainingFromEnd = Number.isNaN(endTime)
        ? 0
        : Math.max(0, endTime - Date.now());
      // The demo/API normally returns milliseconds. Support second-based
      // responses as well, which are used by some older deployments.
      const remainingTime =
        rawRemainingTime > 0 && rawRemainingTime < 86400
          ? rawRemainingTime * 1000
          : rawRemainingTime || remainingFromEnd;

      this.listeningRights.supported = true;
      this.listeningRights.remainingTime = Math.max(0, remainingTime);
      this.listeningRights.fetchedAt = Date.now();
      this.listeningRights.status = rights.status || '';
      this.listeningRights.coverToday = this.toBoolean(rights.rightsCoverToday);
      this.listeningRights.upperLimit = this.toBoolean(rights.rightsUpperLimit);
    },
    async refreshListeningRights({ silent = false } = {}) {
      if (!isAccountLoggedIn()) return;
      this.listeningRights.loading = true;
      try {
        const result = await getListeningRights();
        if (result?.code !== 200 || !result?.data) {
          if (result?.code === 404) {
            this.listeningRights.supported = false;
            return;
          }
          throw new Error(result?.message || result?.msg || '权益状态查询失败');
        }
        this.applyListeningRights(result);
      } catch (error) {
        if (this.isUnsupportedListeningRightsError(error)) {
          this.listeningRights.supported = false;
        } else if (!silent) {
          this.showToast(
            this.getListeningRightsErrorMessage(error, '权益状态查询失败')
          );
        }
      } finally {
        this.listeningRights.loading = false;
      }
    },
    getAllOutputDevices() {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        this.allOutputDevices = devices.filter(device => {
          return device.kind == 'audiooutput';
        });
        if (
          this.allOutputDevices.length > 0 &&
          this.allOutputDevices[0].label !== ''
        ) {
          this.withoutAudioPriviledge = false;
        } else {
          this.allOutputDevices = [
            {
              deviceId: 'default',
              label: 'settings.permissionRequired',
            },
          ];
        }
      });
    },
    logout() {
      doLogout();
      this.$router.push({ name: 'home' });
    },
    countDBSize() {
      countDBSize().then(data => {
        if (data === undefined) {
          this.tracksCache = {
            size: '0KB',
            length: 0,
          };
          return;
        }
        this.tracksCache.size = bytesToSize(data.bytes);
        this.tracksCache.length = data.length;
      });
    },
    clearCache() {
      clearDB().then(() => {
        this.countDBSize();
      });
    },
    lastfmConnect() {
      lastfmAuth();
      let lastfmChecker = setInterval(() => {
        const session = localStorage.getItem('lastfm');
        if (session) {
          this.$store.commit('updateLastfm', JSON.parse(session));
          clearInterval(lastfmChecker);
        }
      }, 1000);
    },
    lastfmDisconnect() {
      localStorage.removeItem('lastfm');
      this.$store.commit('updateLastfm', {});
    },
    sendProxyConfig() {
      if (this.proxyProtocol === 'noProxy') return;
      const config = this.settings.proxyConfig;
      if (
        config.server === '' ||
        !config.port ||
        config.protocol === 'noProxy'
      ) {
        ipcRenderer.send('removeProxy');
      } else {
        ipcRenderer.send('setProxy', config);
      }
      this.showToast('已更新代理设置');
    },
    clickOutside() {
      this.exitRecordShortcut();
    },
    formatShortcut(shortcut) {
      shortcut = shortcut
        .replaceAll('+', ' + ')
        .replace('Up', '↑')
        .replace('Down', '↓')
        .replace('Right', '→')
        .replace('Left', '←');
      if (this.settings.lang === 'zh-CN') {
        shortcut = shortcut.replace('Space', '空格');
      } else if (this.settings.lang === 'zh-TW') {
        shortcut = shortcut.replace('Space', '空白鍵');
      }
      if (process.platform === 'darwin') {
        return shortcut
          .replace('CommandOrControl', '⌘')
          .replace('Command', '⌘')
          .replace('Alt', '⌥')
          .replace('Control', '⌃')
          .replace('Shift', '⇧');
      }
      return shortcut.replace('CommandOrControl', 'Ctrl');
    },
    readyToRecordShortcut(id, type) {
      if (type === 'globalShortcut' && this.enableGlobalShortcut === false) {
        return;
      }
      this.shortcutInput = { id, type, recording: true };
      this.recordedShortcut = [];
      ipcRenderer.send('switchGlobalShortcutStatusTemporary', 'disable');
    },
    handleShortcutKeydown(e) {
      if (this.shortcutInput.recording === false) return;
      e.preventDefault();
      if (this.recordedShortcut.find(s => s.keyCode === e.keyCode)) return;
      this.recordedShortcut.push(e);
      if (
        (e.keyCode >= 65 && e.keyCode <= 90) || // A-Z
        (e.keyCode >= 48 && e.keyCode <= 57) || // 0-9
        (e.keyCode >= 112 && e.keyCode <= 123) || // F1-F12
        ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key) || // Arrows
        validShortcutCodes.includes(e.key)
      ) {
        this.saveShortcut();
      }
    },
    handleShortcutKeyup(e) {
      if (this.recordedShortcut.find(s => s.keyCode === e.keyCode)) {
        this.recordedShortcut = this.recordedShortcut.filter(
          s => s.keyCode !== e.keyCode
        );
      }
    },
    saveShortcut() {
      const { id, type } = this.shortcutInput;
      const payload = {
        id,
        type,
        shortcut: this.recordedShortcutComputed,
      };
      this.$store.commit('updateShortcut', payload);
      ipcRenderer.send('updateShortcut', payload);
      this.showToast('快捷键已保存');
      this.recordedShortcut = [];
    },
    exitRecordShortcut() {
      if (this.shortcutInput.recording === false) return;
      this.shortcutInput = { id: '', type: '', recording: false };
      this.recordedShortcut = [];
      ipcRenderer.send('switchGlobalShortcutStatusTemporary', 'enable');
    },
    restoreDefaultShortcuts() {
      this.$store.commit('restoreDefaultShortcuts');
      ipcRenderer.send('restoreDefaultShortcuts');
    },
  },
};
</script>

<style lang="scss" scoped>
.settings-page {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}
.container {
  margin-top: 24px;
  width: 720px;
}
h2 {
  margin-top: 48px;
  font-size: 36px;
  color: var(--color-text);
}

h3 {
  margin-top: 48px;
  padding-bottom: 12px;
  font-size: 26px;
  color: var(--color-text);
  border-bottom: 1px solid rgba(128, 128, 128, 0.18);
}

.user {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-secondary-bg);
  color: var(--color-text);
  padding: 16px 20px;
  border-radius: 16px;
  margin-bottom: 48px;
  img.avatar {
    border-radius: 50%;
    height: 64px;
    width: 64px;
    cursor: pointer;
    transition: transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease;
    &:hover {
      filter: brightness(0.96);
    }
    &.avatar-clicked {
      transform: scale(0.94) translateY(1px);
      filter: brightness(0.9);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
    }
  }
  img.cvip {
    height: 13px;
    margin-right: 4px;
  }
  .left {
    display: flex;
    align-items: center;
    .info {
      margin-left: 24px;
    }
    .nickname {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .listening-rights-remaining {
      margin-left: 10px;
      font-size: 13px;
      font-weight: 500;
      opacity: 0.68;
      white-space: nowrap;
    }
    .extra-info {
      font-size: 13px;
      .text {
        opacity: 0.68;
      }
      .vip {
        display: flex;
        align-items: center;
      }
    }
  }
  .right {
    .svg-icon {
      height: 18px;
      width: 18px;
      margin-right: 4px;
    }
    button {
      display: flex;
      align-items: center;
      font-size: 18px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 10px;
      padding: 8px 12px;
      opacity: 0.68;
      color: var(--color-text);
      transition: 0.2s;
      margin: {
        right: 12px;
        left: 12px;
      }
      &:hover {
        opacity: 1;
        background: #eaeffd;
        color: #335eea;
      }
      &:active {
        opacity: 1;
        transform: scale(0.92);
        transition: 0.2s;
      }
    }
  }
}

.item {
  margin: 24px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--color-text);

  .title {
    font-size: 16px;
    font-weight: 500;
    opacity: 0.78;
  }

  .description {
    font-size: 14px;
    margin-top: 0.5em;
    opacity: 0.7;
  }
}

select {
  min-width: 192px;
  max-width: 600px;
  font-weight: 600;
  border: none;
  padding: 8px 12px 8px 12px;
  border-radius: 8px;
  color: var(--color-text);
  background: var(--color-secondary-bg);
  appearance: none;
  &:focus {
    outline: none;
    color: var(--color-primary);
    background: var(--color-primary-bg);
  }
}

button {
  color: var(--color-text);
  background: var(--color-secondary-bg);
  padding: 8px 12px 8px 12px;
  font-weight: 600;
  border-radius: 8px;
  transition: 0.2s;
  &:hover {
    transform: scale(1.06);
  }
  &:active {
    transform: scale(0.94);
  }
}

input.text-input.margin-right-0 {
  margin-right: 0;
}
input.text-input {
  background: var(--color-secondary-bg);
  border: none;
  margin-right: 22px;
  padding: 8px 12px 8px 12px;
  border-radius: 8px;
  color: var(--color-text);
  font-weight: 600;
  font-size: 16px;
}
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}
input[type='number'] {
  -moz-appearance: textfield;
}

#proxy-form,
#real-ip {
  display: flex;
  align-items: center;
}
#proxy-form.disabled,
#real-ip.disabled {
  opacity: 0.47;
  button:hover {
    transform: unset;
  }
}

#shortcut-table {
  font-size: 14px;
  /* border: 1px solid black; */
  user-select: none;
  color: var(--color-text);
  .row {
    display: flex;
  }
  .row.row-head {
    opacity: 0.58;
    font-size: 13px;
    font-weight: 500;
  }
  .col {
    min-width: 192px;
    padding: 8px;
    display: flex;
    align-items: center;
    /* border: 1px solid red; */
    &:first-of-type {
      padding-left: 0;
      min-width: 128px;
    }
  }
  .keyboard-input {
    font-weight: 600;
    background-color: var(--color-secondary-bg);
    padding: 8px 12px 8px 12px;
    border-radius: 0.5rem;
    min-width: 146px;
    min-height: 34px;
    box-sizing: border-box;
    &.active {
      color: var(--color-primary);
      background-color: var(--color-primary-bg);
    }
  }
  .restore-default-shortcut {
    margin-top: 12px;
  }
  &.global-disabled {
    .row .col:last-child {
      opacity: 0.48;
    }
    .row.row-head .col:last-child {
      opacity: 1;
    }
  }
  &:focus {
    outline: none;
  }
}

.footer {
  text-align: center;
  margin-top: 6rem;
  color: var(--color-text);
  font-weight: 600;
  .author {
    font-size: 0.9rem;
  }
  .version {
    font-size: 0.88rem;
    opacity: 0.58;
    margin-top: -10px;
  }
}

.beforeAnimation {
  -webkit-transition: 0.2s cubic-bezier(0.24, 0, 0.5, 1);
  transition: 0.2s cubic-bezier(0.24, 0, 0.5, 1);
}
.afterAnimation {
  box-shadow: 0 0 0 1px hsla(0, 0%, 0%, 0.1), 0 4px 0px 0 hsla(0, 0%, 0%, 0.04),
    0 4px 9px hsla(0, 0%, 0%, 0.13), 0 3px 3px hsla(0, 0%, 0%, 0.05);
  -webkit-transition: 0.35s cubic-bezier(0.54, 1.6, 0.5, 1);
  transition: 0.35s cubic-bezier(0.54, 1.6, 0.5, 1);
}
.toggle {
  margin: auto;
}
.toggle input {
  opacity: 0;
  position: absolute;
}
.toggle input + label {
  position: relative;
  display: inline-block;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-transition: 0.4s ease;
  transition: 0.4s ease;
  height: 32px;
  width: 52px;
  background: var(--color-secondary-bg);
  border-radius: 8px;
}
.toggle input + label:before {
  content: '';
  position: absolute;
  display: block;
  -webkit-transition: 0.2s cubic-bezier(0.24, 0, 0.5, 1);
  transition: 0.2s cubic-bezier(0.24, 0, 0.5, 1);
  height: 32px;
  width: 52px;
  top: 0;
  left: 0;
  border-radius: 8px;
}
.toggle input + label:after {
  content: '';
  position: absolute;
  display: block;
  box-shadow: 0 0 0 1px hsla(0, 0%, 0%, 0.02), 0 4px 0px 0 hsla(0, 0%, 0%, 0.01),
    0 4px 9px hsla(0, 0%, 0%, 0.08), 0 3px 3px hsla(0, 0%, 0%, 0.03);
  -webkit-transition: 0.35s cubic-bezier(0.54, 1.6, 0.5, 1);
  transition: 0.35s cubic-bezier(0.54, 1.6, 0.5, 1);
  background: #fff;
  height: 20px;
  width: 20px;
  top: 6px;
  left: 6px;
  border-radius: 6px;
}
.toggle input:checked + label:before {
  background: var(--color-primary);
  -webkit-transition: width 0.2s cubic-bezier(0, 0, 0, 0.1);
  transition: width 0.2s cubic-bezier(0, 0, 0, 0.1);
}
.toggle input:checked + label:after {
  left: 26px;
}
</style>
